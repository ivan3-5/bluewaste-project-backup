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
import "../../../core/ui/app_components.dart";
import "../../../core/config/app_env.dart";
import "../data/report_service.dart";
import "../domain/report_models.dart";

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

  int _step = 0; // 0: Select Photo, 1: AI analysis & Category, 2: Location & Details
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
  Widget build(BuildContext context) {
    final categories = wasteCategoryLabels.entries.toList(growable: false);
    final missingRequirements = <String>[
      if (_descriptionController.text.trim().length < 20) "Description",
      if (!_hasLocation) "Location",
    ];
    final canSubmit =
        !_isSubmitting && missingRequirements.isEmpty && !_isOutsideZone;

    Widget buildStepHeader(String subtitleText, String currentStepNumber) {
      return AppSectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _FormSectionHeader(
              icon: Icons.edit_note,
              title: "Submit Waste Report",
              subtitle: subtitleText,
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                _StepChip(number: "1", label: "Upload Photo", isActive: currentStepNumber == "1"),
                _StepChip(number: "2", label: "AI Classify", isActive: currentStepNumber == "2"),
                _StepChip(number: "3", label: "Details & Map", isActive: currentStepNumber == "3"),
              ],
            ),
          ],
        ),
      );
    }

    if (_step == 0) {
      return ListView(
        padding: AppSpacing.screen,
        children: [
          buildStepHeader("Select or capture a photo to initiate AI evaluation.", "1"),
          const SizedBox(height: AppSpacing.sm),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: AppSpacing.md),
                const CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.secondary,
                  child: Icon(
                    Icons.image_search_outlined,
                    size: 38,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  "Upload Waste Photo",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  "Let BlueWaste AI classify and categorise the waste automatically.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickFromCamera,
                        icon: const Icon(Icons.photo_camera_outlined),
                        label: const Text("Camera"),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickFromGallery,
                        icon: const Icon(Icons.image_outlined),
                        label: const Text("Gallery"),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
              ],
            ),
          ),
        ],
      );
    }

    if (_step == 1) {
      final isDirty = _category == "WITH_WASTE";
      final detectedText = isDirty ? "With Waste" : "No Waste";
      final statusColor = isDirty ? AppColors.destructive : AppColors.success;

      return ListView(
        padding: AppSpacing.screen,
        children: [
          buildStepHeader("AI is processing the photo. Confirm the category below.", "2"),
          const SizedBox(height: AppSpacing.sm),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "AI Detection Status",
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    height: 200,
                    width: double.infinity,
                    child: Image.file(
                      File(_images.first.path),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                if (_isAnalyzing) ...[
                  const Center(
                    child: Column(
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: AppSpacing.sm),
                        Text(
                          "Analyzing image with BlueWaste AI...",
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ] else if (_analysisError != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.sm),
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
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _analyzeImage(_images.first),
                          child: const Text("Retry Analysis"),
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
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.tint(statusColor, opacity: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: statusColor),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isDirty ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                          color: statusColor,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "AI Verdict: $detectedText",
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                              if (_analysisConfidence != null && _analysisConfidence! > 0)
                                Text(
                                  "Confidence: ${(_analysisConfidence! * 100).toStringAsFixed(1)}%",
                                  style: TextStyle(
                                    color: statusColor.withValues(alpha: 0.8),
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String>(
                    value: _category,
                    decoration: const InputDecoration(
                      labelText: "Confirm Category Selection",
                      prefixIcon: Icon(Icons.category_outlined),
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
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              _step = 0;
                              _images.clear();
                            });
                          },
                          icon: const Icon(Icons.arrow_back),
                          label: const Text("Retake"),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => setState(() => _step = 2),
                          icon: const Icon(Icons.arrow_forward),
                          label: const Text("Continue"),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: AppSpacing.screen,
      children: [
        buildStepHeader("Select coordinates on the map and add description.", "3"),
        const SizedBox(height: AppSpacing.sm),
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Report Details",
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                "Required: description (20+ characters).",
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.mutedForeground,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _descriptionController,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: "Description",
                  alignLabelWithHint: true,
                  prefixIcon: Icon(Icons.description_outlined),
                ),
                minLines: 4,
                maxLines: 6,
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
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FormSectionHeader(
                icon: Icons.my_location,
                title: "Location",
                subtitle: _hasLocation
                    ? "Location marked. You can tap the map to adjust it."
                    : "Tap the map or click Capture Location to set coordinates.",
              ),
              const SizedBox(height: AppSpacing.sm),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
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
                            urlTemplate:
                                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                            userAgentPackageName:
                                "com.bluewaste.mobile_flutter",
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
                                  width: 40,
                                  height: 40,
                                  child: const Icon(
                                    Icons.place,
                                    color: AppColors.destructive,
                                    size: 40,
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
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: _hasLocation
                      ? AppColors.tint(AppColors.success, opacity: 0.1)
                      : AppColors.secondary,
                  border: Border.all(
                    color: _hasLocation ? AppColors.success : AppColors.border,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _hasLocation
                          ? Icons.check_circle_outline
                          : Icons.location_off_outlined,
                      color: _hasLocation
                          ? AppColors.success
                          : AppColors.mutedForeground,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: Text(
                        _hasLocation
                            ? "${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}"
                            : "No location captured yet.",
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: _hasLocation
                                  ? AppColors.success
                                  : AppColors.mutedForeground,
                              fontWeight: _hasLocation
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              FilledButton.tonalIcon(
                onPressed: _getCurrentLocation,
                icon: const Icon(Icons.my_location),
                label:
                    Text(_hasLocation ? "Use GPS Location" : "Capture Location"),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _step = 1),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text("Back"),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: canSubmit ? _submitReport : null,
                      icon: const Icon(Icons.send_outlined),
                      label: Text(_isSubmitting ? "Submitting..." : "Submit Report"),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                missingRequirements.isEmpty
                    ? "Ready to submit. Please review details before sending."
                    : "Complete required fields: ${missingRequirements.join(", ")}",
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.mutedForeground,
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
      ],
    );
  }
}

class _FormSectionHeader extends StatelessWidget {
  const _FormSectionHeader({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 15,
          backgroundColor: AppColors.tint(AppColors.primary),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.mutedForeground,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({
    required this.number,
    required this.label,
    this.isActive = false,
  });

  final String number;
  final String label;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: isActive ? AppColors.tint(AppColors.primary, opacity: 0.1) : AppColors.secondary,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: isActive ? AppColors.primary.withValues(alpha: 0.3) : Colors.transparent,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 18,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? AppColors.primary : AppColors.tint(AppColors.primary, opacity: 0.2),
            ),
            child: Text(
              number,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: isActive ? AppColors.primaryForeground : AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: isActive ? AppColors.primary : AppColors.secondaryForeground,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
