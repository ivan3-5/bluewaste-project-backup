import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_dotenv/flutter_dotenv.dart";

import "src/app.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: ".env");
  } catch (error) {
    debugPrint("Warning: Could not load .env file: $error");
  }
  runApp(const ProviderScope(child: BlueWasteApp()));
}
