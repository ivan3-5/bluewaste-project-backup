import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../reports/data/report_service.dart";
import "../../reports/domain/report_models.dart";
import "worker_task_detail_screen.dart";

class WorkerTasksScreen extends ConsumerStatefulWidget {
  const WorkerTasksScreen({super.key});

  @override
  ConsumerState<WorkerTasksScreen> createState() => _WorkerTasksScreenState();
}

class _WorkerTasksScreenState extends ConsumerState<WorkerTasksScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy h:mm a");

  List<ReportRecord> _tasks = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadTasks();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _loadTasks());
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
            SizedBox(height: 140),
            AppEmptyState(
              icon: Icons.assignment_outlined,
              title: "No assigned tasks",
              subtitle: "New assignments will appear here.",
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTasks,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.md,
        ),
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          final statusColor = AppColors.statusColor(task.status);
          final categoryColor = AppColors.categoryColor(task.category);

          return Card(
            margin: const EdgeInsets.only(bottom: AppSpacing.xs),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => WorkerTaskDetailScreen(report: task),
                  ),
                ).then((_) => _loadTasks());
              },
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(task.description,
                        maxLines: 3, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: [
                        AppStatusPill(
                          label: statusLabels[task.status] ?? task.status,
                          color: statusColor,
                        ),
                        AppStatusPill(
                          label:
                              wasteCategoryLabels[task.category] ?? task.category,
                          color: categoryColor,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      "Created: ${_dateFormat.format(task.createdAt)}",
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                    ),
                    if ((task.address ?? "").isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        "Address: ${task.address}",
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
