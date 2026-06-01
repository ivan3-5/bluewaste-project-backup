import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../auth/presentation/auth_controller.dart";
import "../../profile/presentation/profile_screen.dart";
import "../../admin/presentation/admin_dashboard_screen.dart";
import "../../admin/presentation/admin_reports_screen.dart";
import "../../admin/presentation/admin_map_screen.dart";
import "../../admin/presentation/admin_console_screen.dart";

class AdminShellScreen extends ConsumerStatefulWidget {
  const AdminShellScreen({super.key});

  @override
  ConsumerState<AdminShellScreen> createState() => _AdminShellScreenState();
}

class _AdminShellScreenState extends ConsumerState<AdminShellScreen> {
  int _index = 0;

  void _setTab(int value) {
    setState(() {
      _index = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final avatarUrl = (user?.avatarUrl ?? "").trim();
    final hasAvatar = avatarUrl.isNotEmpty;
    ImageProvider<Object>? profileImage;
    if (hasAvatar) {
      profileImage = NetworkImage(avatarUrl);
    }
    final firstName = (user?.firstName ?? "").trim();
    final initials =
        firstName.isEmpty ? "A" : firstName.substring(0, 1).toUpperCase();

    final pages = <Widget>[
      const AdminDashboardScreen(),
      const AdminReportsScreen(),
      const AdminMapScreen(),
      const AdminConsoleScreen(),
    ];

    const titles = <String>[
      "Overview",
      "Reports Manager",
      "Map",
      "System Console",
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          titles[_index],
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 24,
            letterSpacing: -0.5,
          ),
        ),
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ProfileScreen(),
                  ),
                );
              },
              child: Hero(
                tag: "profile_avatar_admin",
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      width: 2,
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.tint(AppColors.primary, opacity: 0.1),
                    foregroundImage: profileImage,
                    child: profileImage == null
                        ? Text(
                            initials,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          )
                        : null,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.08),
                blurRadius: 24,
                spreadRadius: 2,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: NavigationBar(
              height: 70,
              elevation: 0,
              shadowColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              backgroundColor: Colors.transparent,
              indicatorColor: AppColors.tint(AppColors.primary, opacity: 0.12),
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              animationDuration: const Duration(milliseconds: 300),
              selectedIndex: _index,
              onDestinationSelected: _setTab,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.dashboard_outlined),
                  selectedIcon: Icon(Icons.dashboard),
                  label: "Overview",
                ),
                NavigationDestination(
                  icon: Icon(Icons.assessment_outlined),
                  selectedIcon: Icon(Icons.assessment),
                  label: "Reports",
                ),
                NavigationDestination(
                  icon: Icon(Icons.map_outlined),
                  selectedIcon: Icon(Icons.map),
                  label: "Map",
                ),
                NavigationDestination(
                  icon: Icon(Icons.admin_panel_settings_outlined),
                  selectedIcon: Icon(Icons.admin_panel_settings),
                  label: "Console",
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
