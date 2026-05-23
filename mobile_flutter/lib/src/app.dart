import "package:flutter/material.dart";

import "core/theme/app_theme.dart";
import "features/auth/presentation/onboarding_screen.dart";

import "features/auth/presentation/login_screen.dart";

class BlueWasteApp extends StatelessWidget {
  const BlueWasteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "BlueWaste",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: Builder(
        builder: (context) => OnboardingScreen(
          onGetStarted: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => const LoginScreen(),
              ),
            );
          },
        ),
      ),
    );
  }
}
