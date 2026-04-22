import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/network/api_exception.dart";
import "../../../core/providers.dart";
import "../domain/app_user.dart";

class AuthSession {
  const AuthSession({required this.token, required this.user});

  final String token;
  final AppUser user;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      token: (json["token"] ?? "").toString(),
      user: AppUser.fromJson(
          (json["user"] ?? <String, dynamic>{}) as Map<String, dynamic>),
    );
  }
}

class AuthService {
  AuthService(this._dio);

  final Dio _dio;

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        "/auth/login",
        data: {
          "email": email,
          "password": password,
        },
      );

      return AuthSession.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<AuthSession> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        "/auth/register",
        data: {
          "email": email,
          "password": password,
          "firstName": firstName,
          "lastName": lastName,
          "phone": phone,
        },
      );

      return AuthSession.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<AppUser> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>("/auth/me");
      return AppUser.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<AppUser> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? avatarUrl,
  }) async {
    try {
      final payload = <String, dynamic>{
        "firstName": firstName,
        "lastName": lastName,
        "phone": phone,
      };
      if (avatarUrl != null) {
        payload["avatarUrl"] = avatarUrl;
      }

      final response = await _dio.put<Map<String, dynamic>>(
        "/auth/profile",
        data: payload,
      );
      return AppUser.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<String> uploadImage({required String filePath}) async {
    try {
      final formData = FormData.fromMap({
        "image": await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        "/upload",
        data: formData,
        options: Options(contentType: "multipart/form-data"),
      );

      final imageUrl = (response.data?["url"] ?? "").toString().trim();
      if (imageUrl.isEmpty) {
        throw ApiException("Upload failed. Please try again.");
      }

      return imageUrl;
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(dioProvider));
});
