import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "config/app_env.dart";
import "storage/session_storage.dart";

final sessionStorageProvider = Provider<SessionStorage>((ref) {
  return SessionStorage();
});

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(sessionStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: AppEnv.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: const {"Content-Type": "application/json"},
    ),
  );

  dio.interceptors.add(
    QueuedInterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.readToken();
        if (token != null && token.isNotEmpty) {
          options.headers["Authorization"] = "Bearer $token";
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await storage.clearSession();
        }
        handler.next(error);
      },
    ),
  );

  return dio;
});
