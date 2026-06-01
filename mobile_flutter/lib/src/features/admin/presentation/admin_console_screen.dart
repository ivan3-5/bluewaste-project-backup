import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../auth/domain/app_user.dart";
import "../data/admin_service.dart";

class AdminConsoleScreen extends ConsumerStatefulWidget {
  const AdminConsoleScreen({super.key});

  @override
  ConsumerState<AdminConsoleScreen> createState() => _AdminConsoleScreenState();
}

class _AdminConsoleScreenState extends ConsumerState<AdminConsoleScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _emailController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();

  final _announcementTitleController = TextEditingController();
  final _announcementBodyController = TextEditingController();

  List<AppUser> _users = const [];
  bool _loadingUsers = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadUsers();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _announcementTitleController.dispose();
    _announcementBodyController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    setState(() => _loadingUsers = true);
    try {
      final list = await ref.read(adminServiceProvider).getAllUsers();
      if (mounted) {
        setState(() {
          _users = list;
          _loadingUsers = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loadingUsers = false);
      }
    }
  }

  Future<void> _createFieldWorker() async {
    final email = _emailController.text.trim();
    final first = _firstNameController.text.trim();
    final last = _lastNameController.text.trim();
    final phone = _phoneController.text.trim();

    if (email.isEmpty || first.isEmpty || last.isEmpty) {
      _showMessage("All fields except phone are required.");
      return;
    }

    setState(() => _submitting = true);
    try {
      await ref.read(adminServiceProvider).createUser(
            email: email,
            firstName: first,
            lastName: last,
            role: "FIELD_WORKER",
            phone: phone.isNotEmpty ? phone : null,
          );

      _emailController.clear();
      _firstNameController.clear();
      _lastNameController.clear();
      _phoneController.clear();

      _showMessage("Field Worker created successfully!");
      _loadUsers();
    } catch (e) {
      _showMessage(e.toString());
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _deleteUser(String userId) async {
    setState(() => _submitting = true);
    try {
      await ref.read(adminServiceProvider).deleteUser(userId);
      _showMessage("Account deleted successfully.");
      _loadUsers();
    } catch (e) {
      _showMessage(e.toString());
      setState(() => _submitting = false);
    }
  }

  Future<void> _dispatchAnnouncement() async {
    final title = _announcementTitleController.text.trim();
    final body = _announcementBodyController.text.trim();

    if (title.isEmpty || body.isEmpty) {
      _showMessage("Please write both title and details.");
      return;
    }

    setState(() => _submitting = true);
    // Simulate push alert dispatching
    await Future<void>.delayed(const Duration(seconds: 1));
    setState(() {
      _announcementTitleController.clear();
      _announcementBodyController.clear();
      _submitting = false;
    });
    _showMessage("Announcement broadcasted successfully to all devices.");
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.mutedForeground,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(Icons.people_outline), text: "User Directory"),
            Tab(icon: Icon(Icons.campaign_outlined), text: "Broadcast Alerts"),
          ],
        ),
        Expanded(
          child: Stack(
            children: [
              TabBarView(
                controller: _tabController,
                children: [
                  _buildUserDirectoryTab(),
                  _buildBroadcastTab(),
                ],
              ),
              if (_submitting)
                Container(
                  color: Colors.black26,
                  child: const Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildUserDirectoryTab() {
    if (_loadingUsers) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: AppSpacing.screen,
      children: [
        // Create Field Worker Form
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Invite / Add Field Worker Staff",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: AppSpacing.xs),
              const Text(
                "Create a dedicated FIELD_WORKER account for cleanup task assignments.",
                style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: "Email Address",
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(
                        labelText: "First Name",
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(
                        labelText: "Last Name",
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Phone (optional)",
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _createFieldWorker,
                  child: const Text("Create Field Worker Account"),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // Catalog header
        Text(
          "Registered Accounts (${_users.length})",
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.black87),
        ),
        const SizedBox(height: AppSpacing.sm),

        // List
        ..._users.map((u) {
          final isWorker = u.role == "FIELD_WORKER";
          final tagColor = isWorker ? Colors.teal : AppColors.primary;

          return Card(
            margin: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.tint(tagColor),
                child: Icon(
                  isWorker ? Icons.engineering_outlined : Icons.person_outline,
                  color: tagColor,
                ),
              ),
              title: Text("${u.firstName} ${u.lastName}"),
              subtitle: Text("${u.email}\nRole: ${u.role}"),
              isThreeLine: true,
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                onPressed: () {
                  showDialog<void>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text("Confirm Delete"),
                      content: Text("Are you sure you want to permanently delete the account of ${u.firstName}?"),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text("Cancel"),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            _deleteUser(u.id);
                          },
                          child: const Text("Delete", style: TextStyle(color: AppColors.destructive)),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildBroadcastTab() {
    return ListView(
      padding: AppSpacing.screen,
      children: [
        AppSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Global Alerts Dispatcher",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: AppSpacing.xs),
              const Text(
                "Broadcast a push announcement alert immediately to all active citizens and workers in Panabo City.",
                style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _announcementTitleController,
                decoration: const InputDecoration(
                  labelText: "Announcement Title",
                  prefixIcon: Icon(Icons.campaign_outlined),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: _announcementBodyController,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: "Notification Body Message",
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _dispatchAnnouncement,
                  icon: const Icon(Icons.send_outlined),
                  label: const Text("Broadcast Push Notification"),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
