import "package:flutter/material.dart";

import "core/theme/app_theme.dart";
import "features/auth/presentation/root_switcher_screen.dart";

class BlueWasteApp extends StatelessWidget {
  const BlueWasteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "BlueWaste",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const RootSwitcherScreen(),
    );
  }
}
