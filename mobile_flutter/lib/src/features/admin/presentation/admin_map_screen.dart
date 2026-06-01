import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";
import "package:latlong2/latlong.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../reports/data/report_service.dart";
import "../../reports/domain/report_models.dart";
import "../data/admin_service.dart";
import "../domain/admin_models.dart";
import "admin_zone_map_screen.dart";

class AdminMapScreen extends ConsumerStatefulWidget {
  const AdminMapScreen({super.key});

  @override
  ConsumerState<AdminMapScreen> createState() => _AdminMapScreenState();
}

class _AdminMapScreenState extends ConsumerState<AdminMapScreen>
    with SingleTickerProviderStateMixin {
  static const LatLng _panaboCenter = LatLng(7.3132, 125.6844);
  static const double _defaultZoom = 13;
  static const double _markerCanvasSize = 92;
  static const double _fixedMarkerDiameter = 23;
  static const double _fixedDotSize = 5;

  final MapController _mapController = MapController();
  late final AnimationController _markerPulseController;

  List<ReportRecord> _reports = const [];
  List<ReportingZone> _zones = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _markerPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();
    _loadData();
    _timer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _loadData(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _markerPulseController.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() => _loading = true);
    }
    try {
      final reports =
          await ref.read(reportServiceProvider).getMapReports(limit: 2000);
      final zones = await ref.read(adminServiceProvider).getReportingZones();
      if (!mounted) return;
      setState(() {
        _reports = reports;
        _zones = zones;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  // ── Marker animation ─────────────────────────────────────────────────────

  Color _pinColor(String status) => AppColors.statusColor(status);

  double _markerPhase({required bool intense}) {
    final basePhase = _markerPulseController.value;
    if (!intense) return basePhase;
    const speedMultiplier = 3 / 1.8;
    final fasterPhase = basePhase * speedMultiplier;
    return fasterPhase - fasterPhase.floorToDouble();
  }

  ({double scale, double opacity}) _pulseGlow({
    required double phase,
    required bool intense,
  }) {
    final edgeDistance = (phase - 0.5).abs() / 0.5;
    final minScale = intense ? 1.15 : 1.1;
    final maxScale = intense ? 2.6 : 2.2;
    final maxOpacity = intense ? 0.5 : 0.3;
    return (
      scale: maxScale - ((maxScale - minScale) * edgeDistance),
      opacity: maxOpacity * edgeDistance,
    );
  }

  Widget _buildReportMarker(ReportRecord report) {
    final isPending = report.status == "PENDING";
    final categoryColor = AppColors.categoryColor(report.category);
    final statusColor = _pinColor(report.status);
    final pulse = _pulseGlow(
      phase: _markerPhase(intense: isPending),
      intense: isPending,
    );

    return GestureDetector(
      onTap: () => _showReportDetails(report),
      child: RepaintBoundary(
        child: SizedBox(
          width: _markerCanvasSize,
          height: _markerCanvasSize,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              IgnorePointer(
                child: Transform.scale(
                  scale: pulse.scale,
                  child: Opacity(
                    opacity: pulse.opacity,
                    child: Container(
                      width: _fixedMarkerDiameter,
                      height: _fixedMarkerDiameter,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: categoryColor,
                      ),
                    ),
                  ),
                ),
              ),
              Container(
                width: _fixedMarkerDiameter,
                height: _fixedMarkerDiameter,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: categoryColor,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Center(
                  child: Container(
                    width: _fixedDotSize,
                    height: _fixedDotSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor,
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.82),
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Stats helpers ─────────────────────────────────────────────────────────

  int _countByStatus(String status) =>
      _reports.where((r) => r.status == status).length;

  void _recenterMap() => _mapController.move(_panaboCenter, _defaultZoom);

  String _formatDate(DateTime value) =>
      DateFormat("MMM d, y • h:mm a").format(value.toLocal());

  // ── Bottom sheet ──────────────────────────────────────────────────────────

  void _showReportDetails(ReportRecord report) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final statusColor = _pinColor(report.status);
        final categoryColor = AppColors.categoryColor(report.category);
        final mediaQuery = MediaQuery.of(ctx);

        return SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.sm,
              AppSpacing.sm,
              AppSpacing.sm,
              mediaQuery.viewInsets.bottom + AppSpacing.sm,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: mediaQuery.size.height * 0.78,
              ),
              child: Material(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(22),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(height: AppSpacing.sm),
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.fromLTRB(
                          AppSpacing.md,
                          AppSpacing.sm,
                          AppSpacing.md,
                          mediaQuery.padding.bottom + AppSpacing.md,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report.title,
                              style: Theme.of(ctx)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Wrap(
                              spacing: AppSpacing.xs,
                              runSpacing: AppSpacing.xs,
                              children: [
                                AppStatusPill(
                                  label: statusLabels[report.status] ??
                                      report.status,
                                  color: statusColor,
                                ),
                                AppStatusPill(
                                  label:
                                      wasteCategoryLabels[report.category] ??
                                          report.category,
                                  color: categoryColor,
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _InfoRow(
                              icon: Icons.location_searching_outlined,
                              label: "Coordinates",
                              value:
                                  "${report.latitude.toStringAsFixed(5)}, ${report.longitude.toStringAsFixed(5)}",
                            ),
                            if ((report.address ?? "").isNotEmpty)
                              Padding(
                                padding:
                                    const EdgeInsets.only(top: AppSpacing.xs),
                                child: _InfoRow(
                                  icon: Icons.place_outlined,
                                  label: "Address",
                                  value: report.address!,
                                ),
                              ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              "Description",
                              style: Theme.of(ctx)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: AppColors.secondary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                report.description.trim().isEmpty
                                    ? "No description provided."
                                    : report.description,
                                style: Theme.of(ctx).textTheme.bodyMedium,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            _InfoRow(
                              icon: Icons.photo_library_outlined,
                              label: "Attached Photos",
                              value: "${report.images.length}",
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            _InfoRow(
                              icon: Icons.schedule_outlined,
                              label: "Reported",
                              value: _formatDate(report.createdAt),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            _InfoRow(
                              icon: Icons.update,
                              label: "Last Updated",
                              value: _formatDate(report.updatedAt),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.tonal(
                                onPressed: () => Navigator.of(ctx).pop(),
                                child: const Text("Close"),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ── UI panels (copied from ReportsMapScreen) ──────────────────────────────

  Widget _buildTopPanel(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.tint(AppColors.primary),
                  child: const Icon(
                    Icons.map_outlined,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "City Reports Map",
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "Tap any marker to open complete report details.",
                        style:
                            Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.mutedForeground,
                                ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _loading ? null : () => _loadData(),
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                  ),
                  icon: const Icon(Icons.refresh),
                  tooltip: "Refresh reports",
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                AppStatusPill(
                  label: "${_reports.length} Total",
                  color: AppColors.primary,
                ),
                AppStatusPill(
                  label: "${_countByStatus("PENDING")} Pending",
                  color: AppColors.warning,
                ),
                AppStatusPill(
                  label: "${_countByStatus("IN_PROGRESS")} In Progress",
                  color: AppColors.orange,
                ),
                AppStatusPill(
                  label: "${_countByStatus("CLEANED")} Cleaned",
                  color: AppColors.success,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Legend",
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            _legendItem("Pending", AppColors.warning),
            _legendItem("In Progress", AppColors.orange),
            _legendItem("Cleaned", AppColors.success),
            _legendItem("Rejected", AppColors.destructive),
          ],
        ),
      ),
    );
  }

  Widget _buildMapActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: _recenterMap,
              icon: const Icon(Icons.my_location),
              tooltip: "Recenter map",
            ),
            IconButton(
              onPressed: _loading ? null : () => _loadData(),
              icon: const Icon(Icons.sync),
              tooltip: "Refresh markers",
            ),
          ],
        ),
      ),
    );
  }

  Widget _legendItem(String label, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              border: Border.all(color: AppColors.border),
            ),
            child: Center(
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(label),
        ],
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final markers = _reports
        .map(
          (report) => Marker(
            point: LatLng(report.latitude, report.longitude),
            width: _markerCanvasSize,
            height: _markerCanvasSize,
            child: AnimatedBuilder(
              animation: _markerPulseController,
              builder: (context, _) => _buildReportMarker(report),
            ),
          ),
        )
        .toList(growable: false);

    final zonePolygons = _zones
        .where((z) => z.isActive)
        .map(
          (z) => Polygon(
            points: z.coordinates,
            color: AppColors.tint(AppColors.primary, opacity: 0.12),
            borderColor: AppColors.primary.withValues(alpha: 0.65),
            borderStrokeWidth: 2,
          ),
        )
        .toList();

    return Stack(
      children: [
        // ── Map ──────────────────────────────────────────────────────────────
        FlutterMap(
          mapController: _mapController,
          options: const MapOptions(
            initialCenter: _panaboCenter,
            initialZoom: _defaultZoom,
            interactionOptions: InteractionOptions(
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
            if (zonePolygons.isNotEmpty) PolygonLayer(polygons: zonePolygons),
            MarkerLayer(markers: markers),
          ],
        ),

        // ── Gradient vignette ─────────────────────────────────────────────
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withValues(alpha: 0.18),
                    Colors.transparent,
                    Colors.transparent,
                    Colors.white.withValues(alpha: 0.08),
                  ],
                  stops: const [0, 0.14, 0.76, 1],
                ),
              ),
            ),
          ),
        ),

        // ── Top panel ─────────────────────────────────────────────────────
        Positioned(
          left: AppSpacing.sm,
          right: AppSpacing.sm,
          top: AppSpacing.sm,
          child: _buildTopPanel(context),
        ),

        // ── Legend (bottom-left) ──────────────────────────────────────────
        Positioned(
          left: AppSpacing.sm,
          bottom: AppSpacing.sm,
          child: _buildLegendCard(),
        ),

        // ── Map actions + pencil FAB (bottom-right) ───────────────────────
        Positioned(
          right: AppSpacing.sm,
          bottom: AppSpacing.sm,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Pencil FAB → Zone Map
              Material(
                color: AppColors.primary,
                shape: const CircleBorder(),
                elevation: 4,
                shadowColor: AppColors.primary.withValues(alpha: 0.4),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () {
                    Navigator.of(context)
                        .push(
                          MaterialPageRoute<void>(
                            builder: (_) => const AdminZoneMapScreen(),
                          ),
                        )
                        .then((_) => _loadData());
                  },
                  child: const Padding(
                    padding: EdgeInsets.all(14),
                    child: Icon(
                      Icons.edit_outlined,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              // Recenter + Refresh card
              _buildMapActions(),
            ],
          ),
        ),

        // ── Loading overlay ───────────────────────────────────────────────
        if (_loading)
          Positioned.fill(
            child: ColoredBox(
              color: Colors.black.withValues(alpha: 0.08),
              child: const Center(child: CircularProgressIndicator()),
            ),
          ),

        // ── Empty state ───────────────────────────────────────────────────
        if (!_loading && markers.isEmpty)
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: const AppEmptyState(
                icon: Icons.location_off_outlined,
                title: "No reports on map",
                subtitle:
                    "There are no reports with map coordinates right now.",
              ),
            ),
          ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(
            icon,
            size: 16,
            color: AppColors.mutedForeground,
          ),
        ),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.mutedForeground,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
