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

  final MapController _mapController = MapController();
  List<List<LatLng>> _zonePolygons = <List<LatLng>>[];

  bool get _hasLocation => _latitude != null && _longitude != null;

  int get _remainingImageSlots => 5 - _images.length;

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

  Future<void> _pickFromCamera() async {
    final picked =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (picked == null) {
      return;
    }

    if (_remainingImageSlots <= 0) {
      _showMessage("Maximum of 5 images allowed.");
      return;
    }

    setState(() {
      _images.add(picked);
    });
  }

  Future<void> _pickFromGallery() async {
    final remaining = _remainingImageSlots;
    if (remaining <= 0) {
      _showMessage("Maximum of 5 images allowed.");
      return;
    }

    final picked =
        await _picker.pickMultiImage(imageQuality: 75, limit: remaining);
    if (picked.isEmpty) {
      return;
    }

    setState(() {
      _images.addAll(picked.take(remaining));
    });
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
    final hasPhotoSlots = _remainingImageSlots > 0;

    return ListView(
      padding: AppSpacing.screen,
      children: [
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FormSectionHeader(
                icon: Icons.edit_note,
                title: "Submit Waste Report",
                subtitle:
                    "Provide clear details, location, and photos for faster validation.",
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: const [
                  _StepChip(number: "1", label: "Details"),
                  _StepChip(number: "2", label: "Location"),
                  _StepChip(number: "3", label: "Photos"),
                ],
              ),
            ],
          ),
        ),
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
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: const InputDecoration(
                  labelText: "Category",
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
                  if (value == null) {
                    return;
                  }
                  setState(() => _category = value);
                },
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
        const SizedBox(height: AppSpacing.sm),
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FormSectionHeader(
                icon: Icons.photo_library_outlined,
                title: "Photos",
                subtitle: "Attach up to 5 clear images.",
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  AppStatusPill(
                    label: "${_images.length}/5 selected",
                    color: _images.isEmpty
                        ? AppColors.mutedForeground
                        : AppColors.info,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    hasPhotoSlots
                        ? "$_remainingImageSlots slot(s) left"
                        : "Maximum reached",
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: hasPhotoSlots ? _pickFromCamera : null,
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: const Text("Camera"),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: hasPhotoSlots ? _pickFromGallery : null,
                      icon: const Icon(Icons.image_outlined),
                      label: const Text("Gallery"),
                    ),
                  ),
                ],
              ),
              if (_images.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: _images
                      .asMap()
                      .entries
                      .map(
                        (entry) => Stack(
                          clipBehavior: Clip.none,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(
                                File(entry.value.path),
                                width: 94,
                                height: 94,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: -8,
                              right: -8,
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _images.removeAt(entry.key);
                                  });
                                },
                                child: const CircleAvatar(
                                  radius: 12,
                                  backgroundColor: AppColors.destructive,
                                  child: Icon(
                                    Icons.close,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                      .toList(growable: false),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FilledButton.icon(
                onPressed: canSubmit ? _submitReport : null,
                icon: const Icon(Icons.send_outlined),
                label: Text(_isSubmitting ? "Submitting..." : "Submit Report"),
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
  const _StepChip({required this.number, required this.label});

  final String number;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: AppSpacing.xxs,
      ),
      decoration: BoxDecoration(
        color: AppColors.secondary,
        borderRadius: BorderRadius.circular(999),
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
              color: AppColors.tint(AppColors.primary),
            ),
            child: Text(
              number,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.secondaryForeground,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
