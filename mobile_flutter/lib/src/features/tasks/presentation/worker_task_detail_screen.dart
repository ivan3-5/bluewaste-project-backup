import "dart:io";

import "package:flutter/material.dart";
import "package:flutter_map/flutter_map.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";
import "package:intl/intl.dart";
import "package:latlong2/latlong.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../reports/data/report_service.dart";
import "../../reports/domain/report_models.dart";

class WorkerTaskDetailScreen extends ConsumerStatefulWidget {
  const WorkerTaskDetailScreen({super.key, required this.report});

  final ReportRecord report;

  @override
  ConsumerState<WorkerTaskDetailScreen> createState() => _WorkerTaskDetailScreenState();
}

class _WorkerTaskDetailScreenState extends ConsumerState<WorkerTaskDetailScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy h:mm a");
  final ImagePicker _picker = ImagePicker();
  final _notesController = TextEditingController();

  late ReportRecord _currentReport;
  bool _loading = false;
  bool _updating = false;
  final List<XFile> _cleanupPhotos = <XFile>[];

  @override
  void initState() {
    super.initState();
    _currentReport = widget.report;
    _refreshReportDetails();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _refreshReportDetails() async {
    setState(() => _loading = true);
    try {
      final reportsData = await ref.read(reportServiceProvider).getAssignedReports(
            page: 1,
            limit: 50,
          );
      final refreshed = reportsData.data.firstWhere((r) => r.id == _currentReport.id);
      if (mounted) {
        setState(() {
          _currentReport = refreshed;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _updating = true);
    try {
      final reportService = ref.read(reportServiceProvider);

      // Upload cleanup photos if completing task
      if (status == "CLEANED" && _cleanupPhotos.isNotEmpty) {
        await reportService.uploadReportImages(
          reportId: _currentReport.id,
          images: _cleanupPhotos,
          type: "CLEANUP",
        );
      }

      final notes = _notesController.text.trim();
      await reportService.updateStatus(
        reportId: _currentReport.id,
        status: status,
        notes: notes.isNotEmpty ? notes : "Updated from mobile app",
      );

      _notesController.clear();
      _cleanupPhotos.clear();

      _showMessage("Task updated successfully.");
      await _refreshReportDetails();
    } catch (error) {
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _updating = false);
      }
    }
  }

  Future<void> _pickCleanupPhoto() async {
    if (_cleanupPhotos.length >= 5) {
      _showMessage("Maximum 5 cleanup photos allowed.");
      return;
    }

    final photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (photo == null) return;

    setState(() {
      _cleanupPhotos.add(photo);
    });
  }

  void _removeCleanupPhoto(int index) {
    setState(() {
      _cleanupPhotos.removeAt(index);
    });
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

    final showCleanupUpload = _currentReport.status == "IN_PROGRESS";
    final showActions = _currentReport.status != "CLEANED" && _currentReport.status != "REJECTED";

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Task Details",
          style: TextStyle(fontWeight: FontWeight.w700),
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
                            if (_currentReport.priority != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.tint(AppColors.primary, opacity: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _currentReport.priority!.toUpperCase(),
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
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
                          label: "Assigned Date",
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

                // Location Map Card
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.sm),
                        child: Text(
                          "Task Location Guidance",
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

                // Cleanup Photos Already Done
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
                if (showActions)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Update Cleanup Workflow",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Cleanup uploads for proof of work
                          if (showCleanupUpload) ...[
                            const Text(
                              "Attach Cleanup Photos (proof of work)",
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            if (_cleanupPhotos.length < 5)
                              GestureDetector(
                                onTap: _pickCleanupPhoto,
                                child: Container(
                                  height: 100,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                                  ),
                                  child: const Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.camera_alt_outlined, color: AppColors.mutedForeground, size: 28),
                                      SizedBox(height: AppSpacing.xxs),
                                      Text(
                                        "Tap to capture cleanup photo",
                                        style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            if (_cleanupPhotos.isNotEmpty) ...[
                              const SizedBox(height: AppSpacing.xs),
                              SizedBox(
                                height: 80,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _cleanupPhotos.length,
                                  itemBuilder: (context, i) {
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 8.0),
                                      child: Stack(
                                        children: [
                                          ClipRRect(
                                            borderRadius: BorderRadius.circular(8),
                                            child: Image.file(
                                              File(_cleanupPhotos[i].path),
                                              width: 80,
                                              height: 80,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                          Positioned(
                                            top: 2,
                                            right: 2,
                                            child: GestureDetector(
                                              onTap: () => _removeCleanupPhoto(i),
                                              child: const CircleAvatar(
                                                radius: 10,
                                                backgroundColor: Colors.red,
                                                child: Icon(Icons.close, size: 12, color: Colors.white),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.md),
                          ],

                          // Notes
                          const Text(
                            "Status Notes / Comments",
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          TextField(
                            controller: _notesController,
                            maxLines: 3,
                            decoration: InputDecoration(
                              hintText: "Add work notes or details about the site status...",
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // Transitions buttons
                          Row(
                            children: [
                              if (_currentReport.status == "VERIFIED" || _currentReport.status == "CLEANUP_SCHEDULED")
                                Expanded(
                                  child: FilledButton.icon(
                                    style: FilledButton.styleFrom(
                                      backgroundColor: Colors.orange,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                    ),
                                    onPressed: () => _updateStatus("IN_PROGRESS"),
                                    icon: const Icon(Icons.play_arrow),
                                    label: const Text("Start Cleanup Work", style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              if (_currentReport.status == "IN_PROGRESS")
                                Expanded(
                                  child: FilledButton.icon(
                                    style: FilledButton.styleFrom(
                                      backgroundColor: AppColors.success,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                    ),
                                    onPressed: () => _updateStatus("CLEANED"),
                                    icon: const Icon(Icons.check_circle_outline),
                                    label: const Text("Mark as Cleaned", style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: AppSpacing.md),

                // History stepper timeline
                if (_currentReport.statusHistory != null && _currentReport.statusHistory!.isNotEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Activity Log History",
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
                                              "By: ${entry.changedByName}",
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
          if (_updating)
            Container(
              color: Colors.black26,
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
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
