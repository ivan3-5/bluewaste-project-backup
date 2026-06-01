import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/network/api_exception.dart";
import "../../../core/providers.dart";
import "../../auth/domain/app_user.dart";
import "../../reports/domain/report_models.dart";
import "../domain/admin_models.dart";

class AdminService {
  AdminService(this._dio);

  final Dio _dio;

  Future<AdminDashboardOverview> getDashboardOverview({int days = 30}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        "/analytics/dashboard",
        queryParameters: {"days": days},
      );

      return AdminDashboardOverview.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<PaginatedData<ReportRecord>> getReports({
    int page = 1,
    int limit = 50,
    String? status,
    String? category,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        "/reports",
        queryParameters: {
          "page": page,
          "limit": limit,
          if (status != null && status.isNotEmpty) "status": status,
          if (category != null && category.isNotEmpty) "category": category,
        },
      );

      return parsePaginatedData<ReportRecord>(
        response.data ?? <String, dynamic>{},
        ReportRecord.fromJson,
      );
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<List<AppUser>> getFieldWorkers() async {
    try {
      final response = await _dio.get<List<dynamic>>("/users/field-workers");
      final data = response.data ?? const [];
      return data
          .whereType<Map<String, dynamic>>()
          .map(AppUser.fromJson)
          .toList(growable: false);
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<List<AppUser>> getAllUsers() async {
    try {
      final response = await _dio.get<List<dynamic>>("/users");
      final data = response.data ?? const [];
      return data
          .whereType<Map<String, dynamic>>()
          .map(AppUser.fromJson)
          .toList(growable: false);
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<AppUser> createUser({
    required String email,
    required String firstName,
    required String lastName,
    required String role,
    String? phone,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        "/users",
        data: {
          "email": email,
          "firstName": firstName,
          "lastName": lastName,
          "role": role,
          if (phone != null && phone.isNotEmpty) "phone": phone,
        },
      );

      return AppUser.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<AppUser> updateUser(
    String userId, {
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        "/users/$userId",
        data: {
          "firstName": firstName,
          "lastName": lastName,
          if (phone != null) "phone": phone,
        },
      );

      return AppUser.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> deleteUser(String userId) async {
    try {
      await _dio.delete<void>("/users/$userId");
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<ReportRecord> assignWorker({
    required String reportId,
    required String assignedToId,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        "/reports/$reportId/assign",
        data: {"assignedToId": assignedToId},
      );

      return ReportRecord.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> restoreSpam(String reportId) async {
    try {
      await _dio.put<void>("/reports/$reportId/restore-spam");
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }
}

final adminServiceProvider = Provider<AdminService>((ref) {
  return AdminService(ref.watch(dioProvider));
});
