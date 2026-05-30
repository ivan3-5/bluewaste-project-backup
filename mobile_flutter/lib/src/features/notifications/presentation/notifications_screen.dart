import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../data/notification_service.dart";
import "../domain/app_notification.dart";

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<AppNotification> _notifications = const [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _timer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _loadNotifications(),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final result = await ref
          .read(notificationServiceProvider)
          .getNotifications(page: 1, limit: 50);

      if (!mounted) {
        return;
      }

      setState(() {
        _notifications = result.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead(AppNotification item) async {
    if (item.isRead) {
      return;
    }

    try {
      await ref.read(notificationServiceProvider).markAsRead(item.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _notifications = _notifications
            .map(
              (n) => n.id == item.id
                  ? AppNotification(
                      id: n.id,
                      title: n.title,
                      message: n.message,
                      type: n.type,
                      isRead: true,
                      createdAt: n.createdAt,
                      reportId: n.reportId,
                      report: n.report,
                    )
                  : n,
            )
            .toList(growable: false);
      });
    } catch (_) {
      // Ignore transient mark-read failure.
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await ref.read(notificationServiceProvider).markAllAsRead();
      await _loadNotifications();
    } catch (_) {
      // Ignore transient mark-all failure.
    }
  }

  String _timeAgo(DateTime date) {
    final seconds = DateTime.now().difference(date).inSeconds;
    if (seconds < 60) return "just now";
    final minutes = seconds ~/ 60;
    if (minutes < 60) return "${minutes}m ago";
    final hours = minutes ~/ 60;
    if (hours < 24) return "${hours}h ago";
    final days = hours ~/ 24;
    return "${days}d ago";
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        if (unreadCount > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppStatusPill(
                  label: "$unreadCount unread",
                  color: AppColors.primary,
                ),
                TextButton(
                  onPressed: _markAllAsRead,
                  child: const Text("Mark all read"),
                ),
              ],
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadNotifications,
            child: _notifications.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 140),
                      AppEmptyState(
                        icon: Icons.notifications_none,
                        title: "No notifications",
                        subtitle: "You are all caught up.",
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      0,
                      AppSpacing.md,
                      AppSpacing.md,
                    ),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final item = _notifications[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                        color: item.isRead
                            ? AppColors.card
                            : AppColors.tint(AppColors.primary, opacity: 0.1),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          onTap: () => _markAsRead(item),
                          leading: CircleAvatar(
                            backgroundColor: item.isRead
                                ? AppColors.secondary
                                : AppColors.tint(AppColors.primary),
                            child: Icon(
                              item.isRead
                                  ? Icons.notifications_none
                                  : Icons.notifications_active_outlined,
                              color: item.isRead
                                  ? AppColors.mutedForeground
                                  : AppColors.primary,
                            ),
                          ),
                          title: Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: item.isRead
                                  ? FontWeight.w500
                                  : FontWeight.w700,
                            ),
                          ),
                          subtitle: Text(item.message),
                          trailing: Text(
                            _timeAgo(item.createdAt),
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: AppColors.mutedForeground,
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
