import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/providers.dart";
import "../../../core/theme/app_colors.dart";
import "../../dashboard/presentation/citizen_shell_screen.dart";
import "../../dashboard/presentation/worker_shell_screen.dart";
import "onboarding_screen.dart";
import "login_screen.dart";
import "auth_controller.dart";

class RootSwitcherScreen extends ConsumerStatefulWidget {
  const RootSwitcherScreen({super.key});

  @override
  ConsumerState<RootSwitcherScreen> createState() => _RootSwitcherScreenState();
}

class _RootSwitcherScreenState extends ConsumerState<RootSwitcherScreen> {
  bool _onboardingSeen = false;
  bool _onboardingLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadOnboardingState();
  }

  Future<void> _loadOnboardingState() async {
    final seen = await ref.read(sessionStorageProvider).readOnboardingSeen();
    if (!mounted) {
      return;
    }

    setState(() {
      _onboardingSeen = seen;
      _onboardingLoaded = true;
    });
  }

  Future<void> _completeOnboarding() async {
    await ref.read(sessionStorageProvider).writeOnboardingSeen(seen: true);
    if (!mounted) {
      return;
    }

    setState(() => _onboardingSeen = true);
  }

  Widget _buildPreparingScreen() {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.secondary,
              child: ClipOval(
                child: Image.asset(
                  "assets/images/logo-bluewaste.png",
                  width: 34,
                  height: 34,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(height: 12),
            const CircularProgressIndicator(),
            const SizedBox(height: 10),
            const Text("Preparing BlueWaste..."),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    if (authState.isLoading || !_onboardingLoaded) {
      return _buildPreparingScreen();
    }

    if (!authState.isAuthenticated) {
      if (!_onboardingSeen) {
        return OnboardingScreen(onGetStarted: _completeOnboarding);
      }
      return const LoginScreen();
    }

    if (authState.user?.isWorker ?? false) {
      return const WorkerShellScreen();
    }

    return const CitizenShellScreen();
  }
}
