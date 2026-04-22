import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../auth/presentation/auth_controller.dart";

class CitizenHomeScreen extends ConsumerWidget {
  const CitizenHomeScreen({
    super.key,
    required this.onSelectTab,
  });

  final ValueChanged<int> onSelectTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final firstName = (user?.firstName ?? "").trim();
    final displayName = firstName.isEmpty ? "Citizen" : firstName;

    return ListView(
      padding: AppSpacing.screen,
      children: [
        _WelcomeCard(
          name: displayName,
          onCreateReport: () => onSelectTab(1),
          onOpenMap: () => onSelectTab(3),
        ),
        const SizedBox(height: AppSpacing.lg),
        const _SectionHeader(
          title: "Quick Actions",
          subtitle: "Jump to the feature you need.",
        ),
        const SizedBox(height: AppSpacing.sm),
        GridView.builder(
          shrinkWrap: true,
          itemCount: _homeActions.length,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: AppSpacing.sm,
            mainAxisSpacing: AppSpacing.sm,
            childAspectRatio: 1.22,
          ),
          itemBuilder: (context, index) {
            final action = _homeActions[index];
            return _QuickActionCard(
              action: action,
              onTap: () => onSelectTab(action.tabIndex),
            );
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        const _TipCard(),
      ],
    );
  }
}

class _HomeAction {
  const _HomeAction({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.tabIndex,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final int tabIndex;
}

const List<_HomeAction> _homeActions = [
  _HomeAction(
    title: "Report",
    subtitle: "Create incident",
    icon: Icons.add_box_outlined,
    color: AppColors.primary,
    tabIndex: 1,
  ),
  _HomeAction(
    title: "My Reports",
    subtitle: "Track status",
    icon: Icons.assignment_turned_in_outlined,
    color: AppColors.success,
    tabIndex: 2,
  ),
  _HomeAction(
    title: "Map",
    subtitle: "View report pins",
    icon: Icons.map_outlined,
    color: AppColors.info,
    tabIndex: 3,
  ),
  _HomeAction(
    title: "Alerts",
    subtitle: "Read updates",
    icon: Icons.notifications_active_outlined,
    color: AppColors.warning,
    tabIndex: 4,
  ),
];

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({
    required this.name,
    required this.onCreateReport,
    required this.onOpenMap,
  });

  final String name;
  final VoidCallback onCreateReport;
  final VoidCallback onOpenMap;

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      padding: EdgeInsets.zero,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.card,
              AppColors.tint(AppColors.primary, opacity: 0.09),
            ],
          ),
        ),
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xs,
                vertical: AppSpacing.xxs,
              ),
              decoration: BoxDecoration(
                color: AppColors.tint(AppColors.primary),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                "Welcome",
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              "Hello, $name",
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              "Report waste issues quickly and help keep Panabo City clean.",
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.mutedForeground,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onCreateReport,
                icon: const Icon(Icons.add_circle_outline),
                label: const Text("Submit New Report"),
              ),
            ),
            const SizedBox(height: AppSpacing.xxs),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onOpenMap,
                icon: const Icon(Icons.map_outlined, size: 18),
                label: const Text("Open Map"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.mutedForeground,
              ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({required this.action, required this.onTap});

  final _HomeAction action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Ink(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.tint(action.color),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(action.icon, size: 18, color: action.color),
            ),
            const Spacer(),
            Text(
              action.title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Expanded(
                  child: Text(
                    action.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground,
                        ),
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 12,
                  color: AppColors.mutedForeground,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  const _TipCard();

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: AppColors.tint(AppColors.info),
            child: const Icon(Icons.lightbulb_outline, color: AppColors.info),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Community Tip",
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  "Use clear photos, include a nearby landmark, and keep the description short for faster validation.",
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
