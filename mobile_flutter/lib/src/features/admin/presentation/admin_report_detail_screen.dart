import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";
import "package:latlong2/latlong.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../auth/domain/app_user.dart";
import "../../reports/data/report_service.dart";
import "../../reports/domain/report_models.dart";
import "../data/admin_service.dart";

class AdminReportDetailScreen extends ConsumerStatefulWidget {
  const AdminReportDetailScreen({super.key, required this.report});

  final ReportRecord report;

  @override
  ConsumerState<AdminReportDetailScreen> createState() => _AdminReportDetailScreenState();
}

class _AdminReportDetailScreenState extends ConsumerState<AdminReportDetailScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy h:mm a");
  final _responseController = TextEditingController();

  late ReportRecord _currentReport;
  List<AppUser> _workers = const [];
  String? _selectedWorkerId;

  bool _loading = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _currentReport = widget.report;
    _selectedWorkerId = _currentReport.assignedToId;
    _refreshReportDetails();
    _loadFieldWorkers();
  }

  @override
  void dispose() {
    _responseController.dispose();
    super.dispose();
  }

  Future<void> _refreshReportDetails() async {
    setState(() => _loading = true);
    try {
      final reportsData = await ref.read(adminServiceProvider).getReports(page: 1, limit: 100);
      final refreshed = reportsData.data.firstWhere((r) => r.id == _currentReport.id);
      if (mounted) {
        setState(() {
          _currentReport = refreshed;
          _selectedWorkerId = refreshed.assignedToId;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadFieldWorkers() async {
    try {
      final list = await ref.read(adminServiceProvider).getFieldWorkers();
      if (mounted) {
        setState(() {
          _workers = list;
        });
      }
    } catch (_) {
      // Allow silent fail for workers list
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _openLightbox(String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: Center(
            child: InteractiveViewer(
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reportImages = _currentReport.images.where((img) => img.type == "REPORT").toList();
    final cleanupImages = _currentReport.images.where((img) => img.type == "CLEANUP").toList();

    final statusColor = AppColors.statusColor(_currentReport.status);
    final categoryColor = AppColors.categoryColor(_currentReport.category);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Admin Actions Portal",
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshReportDetails,
          ),
        ],
      ),
      body: Stack(
        children: [
          if (_loading && _currentReport.images.isEmpty)
            const Center(child: CircularProgressIndicator())
          else
            ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                // Info Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _currentReport.title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.xs,
                          runSpacing: AppSpacing.xs,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.tint(statusColor, opacity: 0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                statusLabels[_currentReport.status] ?? _currentReport.status,
                                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.tint(categoryColor, opacity: 0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                wasteCategoryLabels[_currentReport.category] ?? _currentReport.category,
                                style: TextStyle(color: categoryColor, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          _currentReport.description,
                          style: const TextStyle(fontSize: 15, height: 1.4),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        const Divider(),
                        const SizedBox(height: AppSpacing.sm),
                        _DetailRow(
                          icon: Icons.map_outlined,
                          label: "Address",
                          value: _currentReport.address ?? "No address registered",
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _DetailRow(
                          icon: Icons.calendar_month_outlined,
                          label: "Reported Date",
                          value: _dateFormat.format(_currentReport.createdAt),
                        ),
                        if (!_currentReport.isAnonymous && _currentReport.reporter != null) ...[
                          const SizedBox(height: AppSpacing.sm),
                          _DetailRow(
                            icon: Icons.person_outline,
                            label: "Reporter",
                            value: "${_currentReport.reporter!.firstName} ${_currentReport.reporter!.lastName}",
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                // Map location
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.sm),
                        child: Text(
                          "GPS Location Guidance",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                      SizedBox(
                        height: 200,
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: LatLng(_currentReport.latitude, _currentReport.longitude),
                            initialZoom: 15,
                            interactionOptions: const InteractionOptions(
                              flags: InteractiveFlag.drag |
                                  InteractiveFlag.doubleTapZoom |
                                  InteractiveFlag.pinchZoom,
                            ),
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                              userAgentPackageName: "com.bluewaste.mobile_flutter",
                            ),
                            MarkerLayer(
                              markers: [
                                Marker(
                                  point: LatLng(_currentReport.latitude, _currentReport.longitude),
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
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                // Evidence Photos
                if (reportImages.isNotEmpty) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Evidence Photos (${reportImages.length})",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: AppSpacing.xs,
                              mainAxisSpacing: AppSpacing.xs,
                            ),
                            itemCount: reportImages.length,
                            itemBuilder: (context, index) {
                              final img = reportImages[index];
                              return GestureDetector(
                                onTap: () => _openLightbox(img.imageUrl),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    img.imageUrl,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],

                // Cleanup Photos
                if (cleanupImages.isNotEmpty) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Cleanup Proof Photos",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.success),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: AppSpacing.xs,
                              mainAxisSpacing: AppSpacing.xs,
                            ),
                            itemCount: cleanupImages.length,
                            itemBuilder: (context, index) {
                              final img = cleanupImages[index];
                              return GestureDetector(
                                onTap: () => _openLightbox(img.imageUrl),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    img.imageUrl,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],

                // Action form section
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "LGU Administrative Console",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // Delegate Field Worker Dropdown
                        const Text(
                          "Delegate Cleanup Field Worker",
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        DropdownButtonFormField<String>(
                          value: _selectedWorkerId,
                          decoration: const InputDecoration(
                            labelText: "Assign Field Worker",
                            prefixIcon: Icon(Icons.person_add_outlined),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text("Unassigned / No Worker"),
                            ),
                            ..._workers.map(
                              (w) => DropdownMenuItem(
                                value: w.id,
                                child: Text("${w.firstName} ${w.lastName}"),
                              ),
                            ),
                          ],
                          onChanged: (value) async {
                            setState(() {
                              _selectedWorkerId = value;
                              _submitting = true;
                            });
                            try {
                              if (value != null) {
                                await ref.read(adminServiceProvider).assignWorker(
                                      reportId: _currentReport.id,
                                      assignedToId: value,
                                    );
                                _showMessage("Field Worker assigned successfully.");
                                await _refreshReportDetails();
                              }
                            } catch (e) {
                              _showMessage(e.toString());
                            } finally {
                              setState(() => _submitting = false);
                            }
                          },
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // Notes/Official response
                        const Text(
                          "Official LGU Response Log Notes",
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        TextField(
                          controller: _responseController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: "Add official statement or directions for the cleanup site...",
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // Toggles for LGU Admin
                        const Text(
                          "Transition Report Status",
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.xs,
                          runSpacing: AppSpacing.xs,
                          children: [
                            _buildStatusAction("VERIFIED", Colors.blue),
                            _buildStatusAction("CLEANUP_SCHEDULED", Colors.orange),
                            _buildStatusAction("CLEANED", AppColors.success),
                            _buildStatusAction("REJECTED", AppColors.destructive),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                // History Timeline
                if (_currentReport.statusHistory != null && _currentReport.statusHistory!.isNotEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Activity Trail Logs",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _currentReport.statusHistory!.length,
                            itemBuilder: (context, idx) {
                              final entry = _currentReport.statusHistory![idx];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Padding(
                                      padding: EdgeInsets.only(top: 4.0, right: 8.0),
                                      child: Icon(Icons.radio_button_checked, size: 16, color: AppColors.primary),
                                    ),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.tint(AppColors.neutral, opacity: 0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  statusLabels[entry.newStatus] ?? entry.newStatus,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                                ),
                                              ),
                                              const SizedBox(width: AppSpacing.xs),
                                              Text(
                                                _dateFormat.format(entry.createdAt),
                                                style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                                              ),
                                            ],
                                          ),
                                          if (entry.notes != null && entry.notes!.isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 2.0),
                                              child: Text(
                                                entry.notes!,
                                                style: const TextStyle(fontSize: 13, color: Colors.black87),
                                              ),
                                            ),
                                          if (entry.changedByName != null)
                                            Text(
                                              "Action by: ${entry.changedByName}",
                                              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          if (_submitting)
            Container(
              color: Colors.black26,
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusAction(String status, Color color) {
    return ActionChip(
      label: Text(
        statusLabels[status] ?? status,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      backgroundColor: AppColors.tint(color, opacity: 0.1),
      labelStyle: TextStyle(color: color),
      onPressed: () async {
        setState(() => _submitting = true);
        try {
          final notes = _responseController.text.trim();
          await ref.read(reportServiceProvider).updateStatus(
                reportId: _currentReport.id,
                status: status,
                notes: notes.isNotEmpty ? notes : "Updated from Admin Portal",
              );
          _responseController.clear();
          _showMessage("Status transitioned successfully.");
          await _refreshReportDetails();
        } catch (e) {
          _showMessage(e.toString());
        } finally {
          setState(() => _submitting = false);
        }
      },
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
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
        Icon(icon, size: 18, color: AppColors.mutedForeground),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.black87),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
