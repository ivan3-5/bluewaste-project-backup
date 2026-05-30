class AppEnv {
  static const String apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    // Default to the production Vercel deployment. Override with
    // `--dart-define=API_BASE_URL=<url>` for local development/emulator.
    defaultValue: "https://bluewaste-management-system.vercel.app/api",
  );
}
