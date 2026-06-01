import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:latlong2/latlong.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../data/admin_service.dart";

class AdminZoneMapScreen extends ConsumerStatefulWidget {
  const AdminZoneMapScreen({super.key});

  @override
  ConsumerState<AdminZoneMapScreen> createState() => _AdminZoneMapScreenState();
}

class _AdminZoneMapScreenState extends ConsumerState<AdminZoneMapScreen> {
  static const LatLng _panaboCenter = LatLng(7.3132, 125.6844);
  static const double _defaultZoom = 13;

  final MapController _mapController = MapController();
  final _zoneNameController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  final List<LatLng> _drawingPoints = [];
  bool _loading = false;

  @override
  void dispose() {
    _mapController.dispose();
    _zoneNameController.dispose();
    super.dispose();
  }

  Future<void> _saveDrawingZone() async {
    if (_drawingPoints.length < 3) {
      _showMessage("You must tap at least 3 points to form a polygon.");
      return;
    }

    _zoneNameController.clear();
    final success = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Save Coastal Reporting Zone"),
        content: Form(
          key: _formKey,
          child: TextFormField(
            controller: _zoneNameController,
            decoration: const InputDecoration(
              labelText: "Zone Name",
              hintText: "e.g., Panabo Port Zone",
              prefixIcon: Icon(Icons.map_outlined),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return "Zone name is required.";
              }
              return null;
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () async {
              if (_formKey.currentState?.validate() ?? false) {
                Navigator.pop(context, true);
              }
            },
            child: const Text("Save Zone"),
          ),
        ],
      ),
    );

    if (success != true) return;

    setState(() => _loading = true);
    try {
      await ref.read(adminServiceProvider).createReportingZone(
            name: _zoneNameController.text.trim(),
            coordinates: _drawingPoints,
          );
      _showMessage("Coastal zone created successfully!");
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      _showMessage(e.toString());
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _showMessage(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final drawingMarkers = _drawingPoints.map((pt) {
      final idx = _drawingPoints.indexOf(pt) + 1;
      return Marker(
        point: pt,
        width: 30,
        height: 30,
        child: GestureDetector(
          onTap: () {
            setState(() {
              _drawingPoints.remove(pt);
            });
          },
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.blue,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
              ],
            ),
            child: Center(
              child: Text(
                "$idx",
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ),
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Zone Map",
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 24, letterSpacing: -0.5),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // Map viewport
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _panaboCenter,
              initialZoom: _defaultZoom,
              onTap: (tapPos, pt) {
                setState(() {
                  _drawingPoints.add(pt);
                });
              },
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
              // Drawing Zone Polygons
              if (_drawingPoints.length >= 2)
                PolygonLayer(
                  polygons: [
                    Polygon(
                      points: _drawingPoints,
                      color: Colors.blue.withValues(alpha: 0.22),
                      borderColor: Colors.blue.withValues(alpha: 0.75),
                      borderStrokeWidth: 2.5,
                    ),
                  ],
                ),
              // Active drawing pins
              MarkerLayer(markers: drawingMarkers),
            ],
          ),

          // Top floating instructions
          Positioned(
            left: AppSpacing.sm,
            right: AppSpacing.sm,
            top: AppSpacing.sm,
            child: Column(
              children: [
                Card(
                  elevation: 6,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: AppColors.tint(Colors.blue),
                          child: const Icon(
                            Icons.draw,
                            color: Colors.blue,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Coastal Zone Drawing",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              SizedBox(height: 2),
                              Text(
                                "Tap the map to add zone boundary points.",
                                style: TextStyle(color: AppColors.mutedForeground, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    "Tapping on the map places a boundary marker. You can tap on a marker to delete it.",
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),

          // Bottom action panel
          Positioned(
            left: AppSpacing.md,
            right: AppSpacing.md,
            bottom: AppSpacing.md,
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Points: ${_drawingPoints.length}",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              _drawingPoints.clear();
                            });
                          },
                          icon: const Icon(Icons.delete_outline),
                          label: const Text("Clear"),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.destructive,
                            side: const BorderSide(color: AppColors.destructive),
                            minimumSize: const Size(0, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        FilledButton.icon(
                          onPressed: _saveDrawingZone,
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text("Save Zone"),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Global loading spinner
          if (_loading)
            Positioned.fill(
              child: ColoredBox(
                color: Colors.black.withValues(alpha: 0.12),
                child: const Center(child: CircularProgressIndicator()),
              ),
            ),
        ],
      ),
    );
  }
}
