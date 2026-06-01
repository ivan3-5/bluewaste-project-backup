import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../reports/domain/report_models.dart";
import "../data/admin_service.dart";
import "admin_report_detail_screen.dart";

class AdminReportsScreen extends ConsumerStatefulWidget {
  const AdminReportsScreen({super.key});

  @override
  ConsumerState<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends ConsumerState<AdminReportsScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy");
  final _searchController = TextEditingController();

  List<ReportRecord> _reports = const [];
  bool _loading = true;
  String _statusFilter = "";

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadReports() async {
    setState(() => _loading = true);
    try {
      final data = await ref.read(adminServiceProvider).getReports(
            page: 1,
            limit: 100,
            status: _statusFilter.isEmpty ? null : _statusFilter,
          );
      if (mounted) {
        setState(() {
          _reports = data.data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredList = _reports.where((r) {
      final query = _searchController.text.trim().toLowerCase();
      if (query.isEmpty) return true;
      return r.title.toLowerCase().contains(query) ||
          r.description.toLowerCase().contains(query) ||
          (r.address ?? "").toLowerCase().contains(query);
    }).toList();

    final statuses = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: "", child: Text("All Statuses")),
      ...statusLabels.entries.map(
        (entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value)),
      ),
    ];

    return Column(
      children: [
        // Filter bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: "Search reports by title, description or address...",
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              DropdownButtonFormField<String>(
                value: _statusFilter,
                items: statuses,
                decoration: const InputDecoration(
                  labelText: "Filter Status",
                  prefixIcon: Icon(Icons.filter_list),
                ),
                onChanged: (value) {
                  setState(() {
                    _statusFilter = value ?? "";
                  });
                  _loadReports();
                },
              ),
            ],
          ),
        ),

        // List
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadReports,
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filteredList.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          AppEmptyState(
                            icon: Icons.search_off_outlined,
                            title: "No reports found",
                            subtitle: "Adjust your filter criteria and search query.",
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
                        itemCount: filteredList.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.xs),
                        itemBuilder: (context, index) {
                          final report = filteredList[index];
                          final statusColor = AppColors.statusColor(report.status);
                          final categoryColor = AppColors.categoryColor(report.category);

                          return Card(
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () {
                                Navigator.of(context)
                                    .push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => AdminReportDetailScreen(report: report),
                                      ),
                                    )
                                    .then((_) => _loadReports());
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      report.title,
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: AppSpacing.xs),
                                    Text(
                                      report.description,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                            color: AppColors.mutedForeground,
                                          ),
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Wrap(
                                      spacing: AppSpacing.xs,
                                      runSpacing: AppSpacing.xs,
                                      children: [
                                        AppStatusPill(
                                          label: statusLabels[report.status] ?? report.status,
                                          color: statusColor,
                                        ),
                                        AppStatusPill(
                                          label: wasteCategoryLabels[report.category] ?? report.category,
                                          color: categoryColor,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Text(
                                      "Submitted: ${_dateFormat.format(report.createdAt)}",
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                            color: AppColors.mutedForeground,
                                          ),
                                    ),
                                    if ((report.address ?? "").isNotEmpty) ...[
                                      const SizedBox(height: AppSpacing.xxs),
                                      Text(
                                        "Address: ${report.address}",
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              fontSize: 11,
                                            ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ),
      ],
    );
  }
}
