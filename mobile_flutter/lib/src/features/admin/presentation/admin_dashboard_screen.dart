import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../data/admin_service.dart";
import "../domain/admin_models.dart";

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  AdminDashboardOverview? _analytics;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _loading = true);
    try {
      final data = await ref.read(adminServiceProvider).getDashboardOverview();
      if (mounted) {
        setState(() {
          _analytics = data;
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
    if (_loading && _analytics == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final stats = _analytics?.overview;

    return RefreshIndicator(
      onRefresh: _loadAnalytics,
      child: ListView(
        padding: AppSpacing.screen,
        children: [
          // Stat Cards Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: AppSpacing.sm,
            mainAxisSpacing: AppSpacing.sm,
            childAspectRatio: 1.15,
            children: [
              _buildMetricCard(
                title: "Total Reports",
                value: stats?.total.toString() ?? "0",
                icon: Icons.assignment_outlined,
                color: Colors.blue,
              ),
              _buildMetricCard(
                title: "Pending Review",
                value: stats?.pending.toString() ?? "0",
                icon: Icons.hourglass_empty_outlined,
                color: AppColors.warning,
              ),
              _buildMetricCard(
                title: "In Progress",
                value: stats?.inProgress.toString() ?? "0",
                icon: Icons.play_circle_outline,
                color: Colors.purple,
              ),
              _buildMetricCard(
                title: "Successfully Cleaned",
                value: stats?.cleaned.toString() ?? "0",
                icon: Icons.check_circle_outline,
                color: AppColors.success,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // Classification Breakdown
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Waste Classification Breakdowns",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  "Deep learning YOLO detection breakdowns",
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: AppSpacing.md),
                _buildBreakdownRow(
                  label: "Coastal Area with Waste",
                  count: _getCategoryCount("WITH_WASTE"),
                  total: stats?.total ?? 1,
                  color: AppColors.destructive,
                ),
                const Divider(height: AppSpacing.lg),
                _buildBreakdownRow(
                  label: "Clean Coastal Area",
                  count: _getCategoryCount("NO_WASTE"),
                  total: stats?.total ?? 1,
                  color: AppColors.success,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Severity Distribution Mock/Simulation
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Incident Severity Weights",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  "Delegated cleanup urgency levels",
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
                const SizedBox(height: AppSpacing.md),
                _buildPriorityRow("Critical URGENT", stats?.pending ?? 0, stats?.total ?? 1, AppColors.destructive),
                const SizedBox(height: AppSpacing.sm),
                _buildPriorityRow("High Severity", stats?.inProgress ?? 0, stats?.total ?? 1, Colors.orange),
                const SizedBox(height: AppSpacing.sm),
                _buildPriorityRow("Medium Severity", stats?.verified ?? 0, stats?.total ?? 1, AppColors.warning),
                const SizedBox(height: AppSpacing.sm),
                _buildPriorityRow("Low Severity", stats?.cleanupScheduled ?? 0, stats?.total ?? 1, AppColors.info),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  int _getCategoryCount(String category) {
    if (_analytics == null) return 0;
    for (final entry in _analytics!.categories) {
      if (entry.category == category) {
        return entry.count;
      }
    }
    return 0;
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const NeverScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: color.withValues(alpha: 0.12),
                    child: Icon(icon, color: color, size: 18),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        value,
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1.0,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.mutedForeground,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBreakdownRow({
    required String label,
    required int count,
    required int total,
    required Color color,
  }) {
    final double percent = total > 0 ? count / total : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            Text(
              "$count (${(percent * 100).toStringAsFixed(1)}%)",
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percent,
            minHeight: 8,
            backgroundColor: AppColors.tint(color, opacity: 0.1),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildPriorityRow(String label, int count, int total, Color color) {
    final percent = total > 0 ? count / total : 0.0;
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: AppSpacing.sm),
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent,
              minHeight: 6,
              backgroundColor: AppColors.tint(color, opacity: 0.1),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          "$count",
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
