import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";

import "../../../core/network/api_exception.dart";
import "../../../core/providers.dart";
import "../domain/report_models.dart";

class ReportService {
  ReportService(this._dio);

  final Dio _dio;

  Future<ReportRecord> createReport({
    required String title,
    required String description,
    required String category,
    required double latitude,
    required double longitude,
    String? address,
    bool isAnonymous = false,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        "/reports",
        data: {
          "title": title,
          "description": description,
          "category": category,
          "latitude": latitude,
          "longitude": longitude,
          if (address != null) "address": address,
          "isAnonymous": isAnonymous,
        },
      );

      return ReportRecord.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> uploadReportImages({
    required String reportId,
    required List<XFile> images,
    String type = "REPORT",
  }) async {
    if (images.isEmpty) {
      return;
    }

    try {
      final parts = await Future.wait(
        images.map(
          (img) => MultipartFile.fromFile(
            img.path,
            filename: img.name,
          ),
        ),
      );

      final formData = FormData.fromMap({
        "images": parts,
        "type": type,
      });

      await _dio.post<void>(
        "/reports/$reportId/images",
        data: formData,
        options: Options(headers: {"Content-Type": "multipart/form-data"}),
      );
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<PaginatedData<ReportRecord>> getMyReports({
    int page = 1,
    int limit = 20,
    String? status,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        "/reports/my-reports",
        queryParameters: {
          "page": page,
          "limit": limit,
          if (status != null && status.isNotEmpty) "status": status,
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

  Future<PaginatedData<ReportRecord>> getAssignedReports({
    int page = 1,
    int limit = 20,
    String? status,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        "/reports/assigned",
        queryParameters: {
          "page": page,
          "limit": limit,
          if (status != null && status.isNotEmpty) "status": status,
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

  Future<List<ReportRecord>> getMapReports({
    int limit = 2000,
    String? status,
    String? category,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        "/reports/map",
        queryParameters: {
          "limit": limit,
          if (status != null && status.isNotEmpty) "status": status,
          if (category != null && category.isNotEmpty) "category": category,
        },
      );

      final rows = response.data ?? const [];
      return rows
          .whereType<Map<String, dynamic>>()
          .map(ReportRecord.fromJson)
          .toList(growable: false);
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<ReportRecord> updateStatus({
    required String reportId,
    required String status,
    String? notes,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        "/reports/$reportId/status",
        data: {
          "status": status,
          "notes": notes,
        },
      );

      return ReportRecord.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<Map<String, dynamic>> analyzeWaste(XFile image) async {
    try {
      final multipartFile = await MultipartFile.fromFile(
        image.path,
        filename: image.name,
      );

      final formData = FormData.fromMap({
        "image": multipartFile,
      });

      final response = await _dio.post<Map<String, dynamic>>(
        "/reports/analyze-waste",
        data: formData,
        options: Options(headers: {"Content-Type": "multipart/form-data"}),
      );

      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }

  Future<void> deleteReport(String reportId) async {
    try {
      await _dio.delete<void>("/reports/$reportId");
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }
}

final reportServiceProvider = Provider<ReportService>((ref) {
  return ReportService(ref.watch(dioProvider));
});
