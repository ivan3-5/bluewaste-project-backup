import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/network/api_exception.dart";
import "../../../core/providers.dart";
import "../../reports/domain/report_models.dart";
import "../domain/app_notification.dart";

class NotificationService {
  NotificationService(this._dio);

  final Dio _dio;

  Future<PaginatedData<AppNotification>> getNotifications({
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        "/notifications",
        queryParameters: {
          "page": page,
          "limit": limit,
        },
      );

      return parsePaginatedData<AppNotification>(
        response.data ?? <String, dynamic>{},
        AppNotification.fromJson,
      );
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _dio.put<void>("/notifications/$notificationId/read");
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _dio.put<void>("/notifications/read-all");
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(dioProvider));
});
