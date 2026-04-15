import "package:flutter/material.dart";

import "features/auth/presentation/root_switcher_screen.dart";

class BlueWasteApp extends StatelessWidget {
  const BlueWasteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "BlueWaste",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1D4ED8)),
        useMaterial3: true,
      ),
      home: const RootSwitcherScreen(),
    );
  }
}
