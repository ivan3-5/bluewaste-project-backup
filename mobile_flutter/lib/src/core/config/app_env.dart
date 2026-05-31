import "package:flutter_dotenv/flutter_dotenv.dart";

class AppEnv {
  static String get apiBaseUrl {
    return dotenv.env["API_BASE_URL"] ??
        const String.fromEnvironment(
          "API_BASE_URL",
          defaultValue: "https://bluewaste-management-system.vercel.app/api",
        );
  }
}
