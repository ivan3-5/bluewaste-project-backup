import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";
import "package:intl/intl.dart";

import "../data/report_service.dart";
import "../domain/report_models.dart";

class WorkerTasksScreen extends ConsumerStatefulWidget {
  const WorkerTasksScreen({super.key});

  @override
  ConsumerState<WorkerTasksScreen> createState() => _WorkerTasksScreenState();
}

class _WorkerTasksScreenState extends ConsumerState<WorkerTasksScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy h:mm a");
  final ImagePicker _picker = ImagePicker();

  List<ReportRecord> _tasks = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadTasks();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _loadTasks());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadTasks() async {
    try {
      final result = await ref.read(reportServiceProvider).getAssignedReports(
            page: 1,
            limit: 50,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _tasks = result.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(ReportRecord report, String status) async {
    try {
      await ref.read(reportServiceProvider).updateStatus(
            reportId: report.id,
            status: status,
            notes: "Updated from Flutter mobile app",
          );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text("Status updated to ${statusLabels[status] ?? status}.")),
      );
      await _loadTasks();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _uploadCleanupPhoto(String reportId) async {
    final photo =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (photo == null) {
      return;
    }

    try {
      await ref.read(reportServiceProvider).uploadReportImages(
            reportId: reportId,
            images: [photo],
            type: "CLEANUP",
          );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Cleanup photo uploaded.")),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  List<_TaskAction> _actionsForStatus(String status) {
    switch (status) {
      case "VERIFIED":
      case "CLEANUP_SCHEDULED":
        return const [
          _TaskAction(label: "Start Work", nextStatus: "IN_PROGRESS"),
        ];
      case "IN_PROGRESS":
        return const [
          _TaskAction(label: "Mark Cleaned", nextStatus: "CLEANED"),
        ];
      default:
        return const [];
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_tasks.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadTasks,
        child: ListView(
          children: const [
            SizedBox(height: 180),
            Center(child: Text("No assigned tasks.")),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTasks,
      child: ListView.builder(
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          final actions = _actionsForStatus(task.status);

          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(task.description,
                      maxLines: 3, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 8),
                  Text(
                    "Status: ${statusLabels[task.status] ?? task.status}",
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    "Created: ${_dateFormat.format(task.createdAt)}",
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if ((task.address ?? "").isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text("Address: ${task.address}"),
                  ],
                  if (actions.isNotEmpty || task.status == "IN_PROGRESS")
                    const SizedBox(height: 12),
                  if (actions.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      children: actions
                          .map(
                            (action) => FilledButton.tonal(
                              onPressed: () =>
                                  _updateStatus(task, action.nextStatus),
                              child: Text(action.label),
                            ),
                          )
                          .toList(growable: false),
                    ),
                  if (task.status == "IN_PROGRESS") ...[
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () => _uploadCleanupPhoto(task.id),
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: const Text("Upload Cleanup Photo"),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TaskAction {
  const _TaskAction({required this.label, required this.nextStatus});

  final String label;
  final String nextStatus;
}
