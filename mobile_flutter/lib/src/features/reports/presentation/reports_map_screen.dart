import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:latlong2/latlong.dart";

import "../data/report_service.dart";
import "../domain/report_models.dart";

class ReportsMapScreen extends ConsumerStatefulWidget {
  const ReportsMapScreen({
    super.key,
    this.assignedOnly = false,
  });

  final bool assignedOnly;

  @override
  ConsumerState<ReportsMapScreen> createState() => _ReportsMapScreenState();
}

class _ReportsMapScreenState extends ConsumerState<ReportsMapScreen> {
  static const LatLng _panaboCenter = LatLng(7.3132, 125.6844);

  List<ReportRecord> _reports = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadReports();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _loadReports());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadReports() async {
    try {
      final service = ref.read(reportServiceProvider);
      final List<ReportRecord> reports;
      if (widget.assignedOnly) {
        final result = await service.getAssignedReports(page: 1, limit: 500);
        reports = result.data;
      } else {
        reports = await service.getMapReports(limit: 2000);
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _reports = reports;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _loading = false);
    }
  }

  Color _pinColor(String status) {
    switch (status) {
      case "CLEANED":
        return Colors.green;
      case "IN_PROGRESS":
        return Colors.orange;
      case "VERIFIED":
      case "CLEANUP_SCHEDULED":
        return Colors.blue;
      case "REJECTED":
        return Colors.red;
      default:
        return Colors.amber;
    }
  }

  void _showReportDetails(ReportRecord report) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                report.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text("Status: ${statusLabels[report.status] ?? report.status}"),
              Text(
                  "Category: ${wasteCategoryLabels[report.category] ?? report.category}"),
              if ((report.address ?? "").isNotEmpty)
                Text("Address: ${report.address}"),
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final markers = _reports
        .map(
          (report) => Marker(
            point: LatLng(report.latitude, report.longitude),
            width: 42,
            height: 42,
            child: GestureDetector(
              onTap: () => _showReportDetails(report),
              child: Icon(Icons.location_on,
                  color: _pinColor(report.status), size: 34),
            ),
          ),
        )
        .toList(growable: false);

    return Stack(
      children: [
        FlutterMap(
          options: const MapOptions(
            initialCenter: _panaboCenter,
            initialZoom: 13,
          ),
          children: [
            TileLayer(
              urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              userAgentPackageName: "com.bluewaste.mobile_flutter",
            ),
            MarkerLayer(markers: markers),
          ],
        ),
        Positioned(
          right: 12,
          top: 12,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Text("${_reports.length} reports"),
            ),
          ),
        ),
      ],
    );
  }
}
