import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";
import "../../../core/ui/app_components.dart";
import "../../auth/presentation/auth_controller.dart";
import "../../reports/presentation/my_reports_screen.dart";

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _imagePicker = ImagePicker();

  bool _saving = false;
  bool _uploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).user;
    _firstNameController.text = user?.firstName ?? "";
    _lastNameController.text = user?.lastName ?? "";
    _phoneController.text = user?.phone ?? "";
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final phone = _phoneController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty) {
      _showMessage("First and last name are required.");
      return;
    }

    setState(() => _saving = true);
    try {
      await ref.read(authControllerProvider.notifier).updateProfile(
            firstName: firstName,
            lastName: lastName,
            phone: phone.isEmpty ? null : phone,
          );
      _showMessage("Profile updated.");
    } catch (error) {
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _logout() async {
    await ref.read(authControllerProvider.notifier).logout();
    if (!mounted) {
      return;
    }
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    if (_uploadingAvatar || _saving) {
      return;
    }

    final photo = await _imagePicker.pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 1200,
      maxHeight: 1200,
    );

    if (photo == null) {
      return;
    }

    setState(() => _uploadingAvatar = true);
    try {
      await ref
          .read(authControllerProvider.notifier)
          .uploadAvatar(filePath: photo.path);
      _showMessage("Profile picture updated.");
    } catch (error) {
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _uploadingAvatar = false);
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final avatarUrl = (user?.avatarUrl ?? "").trim();
    final hasAvatar = avatarUrl.isNotEmpty;
    final useCitizenPlaceholder =
        !hasAvatar && ((user?.role ?? "").toUpperCase() == "CITIZEN");
    ImageProvider<Object>? profileImage;
    if (hasAvatar) {
      profileImage = NetworkImage(avatarUrl);
    } else if (useCitizenPlaceholder) {
      profileImage = const AssetImage("assets/charls.png");
    }
    final initials = (user?.firstName.isNotEmpty ?? false)
        ? user!.firstName.substring(0, 1).toUpperCase()
        : "U";
    final isBusy = _saving || _uploadingAvatar;

    return Scaffold(
      appBar: AppBar(title: const Text("Profile")),
      body: ListView(
        padding: AppSpacing.screen,
        children: [
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.tint(AppColors.primary),
                      foregroundImage: profileImage,
                      child: profileImage == null
                          ? Text(
                              initials,
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700,
                                fontSize: 20,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "${user?.firstName ?? ""} ${user?.lastName ?? ""}"
                                .trim(),
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            user?.email ?? "",
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppColors.mutedForeground,
                                    ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: [
                    OutlinedButton.icon(
                      onPressed: isBusy
                          ? null
                          : () => _pickAndUploadAvatar(ImageSource.camera),
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: const Text("Camera"),
                    ),
                    OutlinedButton.icon(
                      onPressed: isBusy
                          ? null
                          : () => _pickAndUploadAvatar(ImageSource.gallery),
                      icon: const Icon(Icons.image_outlined),
                      label: const Text("Gallery"),
                    ),
                  ],
                ),
                if (_uploadingAvatar)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Text(
                      "Uploading profile picture...",
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                    ),
                  ),
              ],
            ),
          ),
          if ((user?.role ?? "").toUpperCase() == "CITIZEN") ...[
            const SizedBox(height: AppSpacing.sm),
            AppSectionCard(
              child: ListTile(
                leading: const Icon(Icons.list_alt_outlined, color: AppColors.primary),
                title: const Text(
                  "My Reports",
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: const Text("Track your submitted reports and their status"),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                contentPadding: EdgeInsets.zero,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const MyReportsScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          AppSectionCard(
            child: Column(
              children: [
                TextField(
                  controller: _firstNameController,
                  decoration: const InputDecoration(
                    labelText: "First Name",
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(
                    labelText: "Last Name",
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: "Phone",
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton(
            onPressed: isBusy ? null : _saveProfile,
            child: Text(_saving ? "Saving..." : "Save Changes"),
          ),
          const SizedBox(height: AppSpacing.xs),
          OutlinedButton(
            onPressed: isBusy ? null : _logout,
            child: const Text("Logout"),
          ),
        ],
      ),
    );
  }
}
