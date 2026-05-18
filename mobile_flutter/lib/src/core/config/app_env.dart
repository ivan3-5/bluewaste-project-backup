class AppEnv {
  static const String apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    // 10.0.2.2 is the alias for host loopback interface (localhost) on Android Emulators
    defaultValue: "http://10.0.2.2:5000/api",
  );
}
