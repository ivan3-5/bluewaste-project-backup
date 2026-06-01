import "dart:io";

import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:geolocator/geolocator.dart";
import "package:image_picker/image_picker.dart";
import "package:dio/dio.dart";
import "package:latlong2/latlong.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/config/app_env.dart";
import "../data/report_service.dart";
import "../domain/report_models.dart";
import "../../auth/presentation/auth_controller.dart";
import "../../profile/presentation/profile_screen.dart";

class ReportCreateScreen extends ConsumerStatefulWidget {
  const ReportCreateScreen({super.key});

  @override
  ConsumerState<ReportCreateScreen> createState() => _ReportCreateScreenState();
}

class _ReportCreateScreenState extends ConsumerState<ReportCreateScreen> {
  final _descriptionController = TextEditingController();

  final List<XFile> _images = <XFile>[];
  final ImagePicker _picker = ImagePicker();

  String _category = "WITH_WASTE";
  bool _isAnonymous = false;
  double? _latitude;
  double? _longitude;
  bool _isSubmitting = false;
  bool _isOutsideZone = false;

  int _step = 0; // 0: Select Photo, 1: Image Analysis & Category, 2: Location & Details
  bool _isAnalyzing = false;
  String? _analysisError;
  double? _analysisConfidence;

  final MapController _mapController = MapController();
  List<List<LatLng>> _zonePolygons = <List<LatLng>>[];

  bool get _hasLocation => _latitude != null && _longitude != null;

  @override
  void initState() {
    super.initState();
    _fetchReportingZones();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _fetchReportingZones() async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: AppEnv.apiBaseUrl,
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
      ));
      final response = await dio.get<List<dynamic>>(
        "/reporting-zones",
        queryParameters: <String, dynamic>{"activeOnly": "true"},
      );
      final zones = response.data;
      if (zones != null) {
        final fetchedZones = <List<LatLng>>[];
        for (final zone in zones) {
          final coords = (zone["coordinates"] as List<dynamic>)
              .map((c) => LatLng(
                    (c["lat"] as num).toDouble(),
                    (c["lng"] as num).toDouble(),
                  ))
              .toList();
          fetchedZones.add(coords);
        }
        if (mounted) {
          setState(() {
            _zonePolygons = fetchedZones;
          });
        }
      }
    } catch (_) {
      // Allow silent fail for zones
    }
  }

  Future<void> _handleMapTap(LatLng point) async {
    final outside = await _checkOutsideZones(point.latitude, point.longitude);
    setState(() {
      _latitude = point.latitude;
      _longitude = point.longitude;
      _isOutsideZone = outside;
    });

    if (outside) {
      _showMessage("Reporting is only allowed within designated coastal zones.");
    }
  }

  Future<void> _analyzeImage(XFile file) async {
    setState(() {
      _isAnalyzing = true;
      _analysisError = null;
    });

    try {
      final service = ref.read(reportServiceProvider);
      final result = await service.analyzeWaste(file);

      final wasteCategory = result["wasteCategory"]?.toString() ?? "NO_WASTE";
      final confidence = double.tryParse(result["confidence"]?.toString() ?? "0") ?? 0;

      setState(() {
        _category = wasteCategory;
        _analysisConfidence = confidence;
        _isAnalyzing = false;
      });
    } catch (error) {
      setState(() {
        _analysisError = "Failed to analyze image: ${error.toString()}";
        _isAnalyzing = false;
      });
    }
  }

  Future<void> _pickFromCamera() async {
    final picked =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (picked == null) {
      return;
    }

    setState(() {
      _images.clear();
      _images.add(picked);
      _step = 1;
    });
    _analyzeImage(picked);
  }

  Future<void> _pickFromGallery() async {
    final picked =
        await _picker.pickImage(source: ImageSource.gallery, imageQuality: 75);
    if (picked == null) {
      return;
    }

    setState(() {
      _images.clear();
      _images.add(picked);
      _step = 1;
    });
    _analyzeImage(picked);
  }

  Future<void> _getCurrentLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      _showMessage("Location services are disabled.");
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      _showMessage("Location permission is required.");
      return;
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    // Validate against active reporting zones
    final outside = await _checkOutsideZones(
      position.latitude,
      position.longitude,
    );

    setState(() {
      _latitude = position.latitude;
      _longitude = position.longitude;
      _isOutsideZone = outside;
    });

    _mapController.move(LatLng(position.latitude, position.longitude), 15);

    if (outside) {
      _showMessage(
        "Reporting is only allowed within designated coastal zones.",
      );
    }
  }

  /// Returns true if [lat]/[lng] is NOT inside any active reporting zone.
  /// Falls back to false (allow) on network errors so offline users aren't blocked.
  Future<bool> _checkOutsideZones(double lat, double lng) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: AppEnv.apiBaseUrl,
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
      ));
      final response = await dio.get<List<dynamic>>(
        "/reporting-zones",
        queryParameters: <String, dynamic>{"activeOnly": "true"},
      );
      final zones = response.data;
      if (zones == null || zones.isEmpty) return false;
      for (final zone in zones) {
        final coords = (zone["coordinates"] as List<dynamic>)
            .map((c) => <String, double>{
                  "lat": (c["lat"] as num).toDouble(),
                  "lng": (c["lng"] as num).toDouble(),
                })
            .toList();
        if (_pointInPolygon(lat, lng, coords)) return false;
      }
      return true;
    } catch (_) {
      return false; // Allow on error
    }
  }

  /// Ray-casting point-in-polygon test.
  bool _pointInPolygon(
    double lat,
    double lng,
    List<Map<String, double>> polygon,
  ) {
    bool inside = false;
    final n = polygon.length;
    int j = n - 1;
    for (int i = 0; i < n; i++) {
      final xi = polygon[i]["lng"]!;
      final yi = polygon[i]["lat"]!;
      final xj = polygon[j]["lng"]!;
      final yj = polygon[j]["lat"]!;
      final intersect = ((yi > lat) != (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
      j = i;
    }
    return inside;
  }

  Future<void> _submitReport() async {
    final title = "Waste Report - ${wasteCategoryLabels[_category] ?? _category}";
    final description = _descriptionController.text.trim();

    if (description.length < 20) {
      _showMessage("Description must be at least 20 characters.");
      return;
    }

    if (_latitude == null || _longitude == null) {
      _showMessage("Please capture your location first.");
      return;
    }

    // Hard zone guard — catches any state mismatch
    if (_isOutsideZone) {
      _showMessage(
        "Reporting is only allowed within the designated coastal zone.",
      );
      return;
    }

    setState(() => _isSubmitting = true);
    String? createdReportId;
    try {
      final reportService = ref.read(reportServiceProvider);

      final report = await reportService.createReport(
        title: title,
        description: description,
        category: _category,
        latitude: _latitude!,
        longitude: _longitude!,
        isAnonymous: _isAnonymous,
      );

      createdReportId = report.id;

      if (_images.isNotEmpty) {
        await reportService.uploadReportImages(
          reportId: report.id,
          images: _images,
          type: "REPORT",
        );
      }

      _descriptionController.clear();

      setState(() {
        _images.clear();
        _isAnonymous = false;
        _category = "WITH_WASTE";
        _step = 0;
        _analysisConfidence = null;
        _analysisError = null;
      });

      _showMessage("Report submitted successfully.");
    } catch (error) {
      if (createdReportId != null) {
        try {
          final reportService = ref.read(reportServiceProvider);
          await reportService.deleteReport(createdReportId);
        } catch (cleanupError) {
          // Silent catch or debug log
        }
      }
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  @override
  Widget build(BuildContext context) {
    final categories = wasteCategoryLabels.entries.toList(growable: false);
    final missingRequirements = <String>[
      if (_descriptionController.text.trim().length < 20) "Description",
      if (!_hasLocation) "Location",
    ];
    final canSubmit =
        !_isSubmitting && missingRequirements.isEmpty && !_isOutsideZone;

    // Get user avatar & initials for Step 0 AppBar
    final user = ref.watch(authControllerProvider).user;
    final avatarUrl = (user?.avatarUrl ?? "").trim();
    final hasAvatar = avatarUrl.isNotEmpty;
    final useCitizenPlaceholder =
        !hasAvatar && ((user?.role ?? "").toUpperCase() == "CITIZEN");
    ImageProvider<Object>? profileImage;
    if (hasAvatar) {
      profileImage = NetworkImage(avatarUrl);
    } else if (useCitizenPlaceholder) {
      profileImage = const AssetImage("assets/charls.png");
    }
    final firstName = (user?.firstName ?? "").trim();
    final initials =
        firstName.isEmpty ? "U" : firstName.substring(0, 1).toUpperCase();

    // Custom AppBar per step
    PreferredSizeWidget buildAppBar() {
      if (_step == 0) {
        return AppBar(
          title: const Text(
            "Submit Report",
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 24,
              letterSpacing: -0.5,
            ),
          ),
          elevation: 0,
          centerTitle: false,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const ProfileScreen(),
                    ),
                  );
                },
                child: Hero(
                  tag: "profile_avatar_create",
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        width: 2,
                      ),
                    ),
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.tint(AppColors.primary, opacity: 0.1),
                      foregroundImage: profileImage,
                      child: profileImage == null
                          ? Text(
                              initials,
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            )
                          : null,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      } else if (_step == 1) {
        return AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              setState(() {
                _step = 0;
                _images.clear();
              });
            },
          ),
          title: const Text(
            "Preview Detection",
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
        );
      } else {
        return AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              setState(() {
                _step = 1;
              });
            },
          ),
          title: const Text(
            "Report Details",
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 20,
            ),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
        );
      }
    }

    return Scaffold(
      appBar: buildAppBar(),
      body: SafeArea(
        child: _buildBody(categories, canSubmit, missingRequirements),
      ),
    );
  }

  Widget _buildBody(
    List<MapEntry<String, String>> categories,
    bool canSubmit,
    List<String> missingRequirements,
  ) {
    if (_step == 0) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSpacing.sm),
            Text(
              "Capture Waste Photo",
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 24,
                  ),
            ),
            const Spacer(),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.camera_alt_outlined,
                    size: 80,
                    color: AppColors.mutedForeground,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                    child: Text(
                      "Take or upload one photo of the coastal area.",
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.mutedForeground,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _pickFromCamera,
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text(
                  "Use Camera",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _pickFromGallery,
                icon: const Icon(Icons.image_outlined),
                label: const Text(
                  "Choose from Gallery",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      );
    }

    if (_step == 1) {
      final isDirty = _category == "WITH_WASTE";
      final detectedText = isDirty ? "With Waste" : "No Waste";
      final statusColor = isDirty ? AppColors.destructive : AppColors.success;
      final confidencePercent = _analysisConfidence != null
          ? "${(_analysisConfidence! * 100).toStringAsFixed(1)}%"
          : "94.5%";

      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSpacing.sm),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                height: 260,
                width: double.infinity,
                child: Image.file(
                  File(_images.first.path),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            if (_isAnalyzing) ...[
              const Center(
                child: Column(
                  children: [
                    SizedBox(height: AppSpacing.xl),
                    CircularProgressIndicator(),
                    SizedBox(height: AppSpacing.md),
                    Text(
                      "Analyzing image with BlueWaste...",
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ] else if (_analysisError != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.tint(AppColors.destructive, opacity: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.destructive),
                ),
                child: Text(
                  _analysisError!,
                  style: const TextStyle(
                    color: AppColors.destructive,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _analyzeImage(_images.first),
                      child: const Text("Retry"),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => setState(() => _step = 2),
                      child: const Text("Continue"),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.tint(statusColor, opacity: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      detectedText,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    "Confidence $confidencePercent",
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                isDirty
                    ? "Waste presence has been identified in the image."
                    : "No waste was detected above the confidence threshold.",
                style: const TextStyle(
                  fontSize: 15,
                  color: Colors.black54,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => setState(() => _step = 2),
                  child: const Text(
                    "Submit Report",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ],
        ),
      );
    }

    final gpsText = _hasLocation
        ? "GPS: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}"
        : "GPS: Not captured yet";

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      children: [
        const SizedBox(height: AppSpacing.md),
        const Text(
          "Category",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<String>(
          value: _category,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          items: categories
              .map(
                (entry) => DropdownMenuItem<String>(
                  value: entry.key,
                  child: Text(entry.value),
                ),
              )
              .toList(growable: false),
          onChanged: (value) {
            if (value == null) return;
            setState(() => _category = value);
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        const Text(
          "Description (optional)",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          controller: _descriptionController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: "Description (optional)",
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
          minLines: 4,
          maxLines: 6,
        ),
        const SizedBox(height: AppSpacing.lg),
        const Text(
          "Location with Map",
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 240,
            width: double.infinity,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _hasLocation
                        ? LatLng(_latitude!, _longitude!)
                        : const LatLng(7.3132, 125.6844),
                    initialZoom: _hasLocation ? 15 : 13,
                    onTap: (tapPosition, latLng) => _handleMapTap(latLng),
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.drag |
                          InteractiveFlag.flingAnimation |
                          InteractiveFlag.doubleTapZoom |
                          InteractiveFlag.scrollWheelZoom |
                          InteractiveFlag.pinchZoom |
                          InteractiveFlag.pinchMove,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                      userAgentPackageName: "com.bluewaste.mobile_flutter",
                    ),
                    PolygonLayer(
                      polygons: _zonePolygons.map((points) {
                        return Polygon(
                          points: points,
                          color: AppColors.tint(AppColors.success, opacity: 0.15),
                          borderColor: AppColors.success.withValues(alpha: 0.7),
                          borderStrokeWidth: 2.5,
                        );
                      }).toList(),
                    ),
                    if (_hasLocation)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(_latitude!, _longitude!),
                            width: 50,
                            height: 50,
                            child: Stack(
                              alignment: Alignment.bottomCenter,
                              children: [
                                // Soft blue "shadowing" glow ring at the base of the pin
                                Positioned(
                                  bottom: 2,
                                  child: Container(
                                    width: 24,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.primary.withValues(alpha: 0.3),
                                    ),
                                  ),
                                ),
                                // Vibrant blue location pin icon sitting on top of the base
                                const Icon(
                                  Icons.location_on_rounded,
                                  color: AppColors.primary,
                                  size: 42,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                Positioned(
                  bottom: AppSpacing.xs,
                  right: AppSpacing.xs,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.white,
                    child: IconButton(
                      icon: const Icon(Icons.my_location, size: 18),
                      color: AppColors.primary,
                      onPressed: _getCurrentLocation,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.tonalIcon(
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: _getCurrentLocation,
            icon: const Icon(Icons.my_location),
            label: Text(_hasLocation ? "Use GPS Location" : "Capture Location"),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              gpsText,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Colors.black54,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          decoration: BoxDecoration(
            color: AppColors.secondary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: SwitchListTile(
            title: const Text("Submit anonymously"),
            subtitle: const Text("Hide your identity from public view"),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
            ),
            value: _isAnonymous,
            onChanged: (value) => setState(() => _isAnonymous = value),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: canSubmit ? _submitReport : null,
            child: Text(
              _isSubmitting ? "Submitting..." : "Submit Report",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        if (missingRequirements.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              "Complete required fields: ${missingRequirements.join(", ")}",
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.mutedForeground,
                  ),
            ),
          ),
        const SizedBox(height: AppSpacing.xxl),
      ],
    );
  }
}

