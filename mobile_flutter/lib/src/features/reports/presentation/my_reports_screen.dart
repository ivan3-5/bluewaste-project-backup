import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../data/report_service.dart";
import "../domain/report_models.dart";

class MyReportsScreen extends ConsumerStatefulWidget {
  const MyReportsScreen({super.key});

  @override
  ConsumerState<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends ConsumerState<MyReportsScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy");

  List<ReportRecord> _reports = const [];
  bool _loading = true;
  String _statusFilter = "";
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadReports();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _loadReports());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadReports() async {
    try {
      final service = ref.read(reportServiceProvider);
      final result = await service.getMyReports(
        page: 1,
        limit: 20,
        status: _statusFilter.isEmpty ? null : _statusFilter,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _reports = result.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final statuses = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: "", child: Text("All statuses")),
      ...statusLabels.entries.map(
        (entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value)),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("My Reports"),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: AppSectionCard(
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _statusFilter,
                    items: statuses,
                    decoration: const InputDecoration(
                      labelText: "Filter by status",
                      prefixIcon: Icon(Icons.filter_list),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _statusFilter = value ?? "";
                        _loading = true;
                      });
                      _loadReports();
                    },
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "${_reports.length} report(s)",
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadReports,
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _reports.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 140),
                            AppEmptyState(
                              icon: Icons.assignment_outlined,
                              title: "No reports found",
                              subtitle:
                                  "Try changing your filter or create your first report.",
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.md,
                            0,
                            AppSpacing.md,
                            AppSpacing.md,
                          ),
                          itemCount: _reports.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: AppSpacing.xs),
                          itemBuilder: (context, index) {
                            final report = _reports[index];
                            final statusColor =
                                AppColors.statusColor(report.status);
                            final categoryColor =
                                AppColors.categoryColor(report.category);

                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      report.title,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: AppSpacing.xs),
                                    Text(
                                      report.description,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppColors.mutedForeground,
                                          ),
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
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
                                          label: wasteCategoryLabels[
                                                  report.category] ??
                                              report.category,
                                          color: categoryColor,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Text(
                                      "Created ${_dateFormat.format(report.createdAt)}",
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: AppColors.mutedForeground,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
