import "../../reports/domain/report_models.dart";

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.reportId,
    this.report,
  });

  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final String? reportId;
  final ReportRecord? report;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      if (value is String) {
        return DateTime.tryParse(value) ?? DateTime.now();
      }
      return DateTime.now();
    }

    return AppNotification(
      id: (json["id"] ?? "").toString(),
      title: (json["title"] ?? "").toString(),
      message: (json["message"] ?? "").toString(),
      type: (json["type"] ?? "SYSTEM").toString(),
      isRead: json["isRead"] == true,
      createdAt: parseDate(json["createdAt"]),
      reportId: json["reportId"]?.toString(),
      report: json["report"] is Map<String, dynamic>
          ? ReportRecord.fromJson(json["report"] as Map<String, dynamic>)
          : null,
    );
  }
}
