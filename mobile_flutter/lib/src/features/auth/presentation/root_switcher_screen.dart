import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../dashboard/presentation/citizen_shell_screen.dart";
import "../../dashboard/presentation/worker_shell_screen.dart";
import "login_screen.dart";
import "auth_controller.dart";

class RootSwitcherScreen extends ConsumerWidget {
  const RootSwitcherScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    if (authState.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!authState.isAuthenticated) {
      return const LoginScreen();
    }

    if (authState.user?.isWorker ?? false) {
      return const WorkerShellScreen();
    }

    return const CitizenShellScreen();
  }
}
