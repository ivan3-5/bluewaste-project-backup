import "package:latlong2/latlong.dart";

class AdminDashboardOverview {
  const AdminDashboardOverview({
    required this.overview,
    required this.trends,
    required this.categories,
    required this.trendChange,
    required this.periodDays,
  });

  final DashboardOverviewStats overview;
  final List<DashboardTrendEntry> trends;
  final List<DashboardCategoryEntry> categories;
  final double trendChange;
  final int periodDays;

  factory AdminDashboardOverview.fromJson(Map<String, dynamic> json) {
    final trendsList = (json["trends"] as List<dynamic>?) ?? const [];
    final categoriesList = (json["categories"] as List<dynamic>?) ?? const [];

    return AdminDashboardOverview(
      overview: DashboardOverviewStats.fromJson(
        json["overview"] as Map<String, dynamic>? ?? const {},
      ),
      trends: trendsList
          .map((item) => DashboardTrendEntry.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      categories: categoriesList
          .map((item) => DashboardCategoryEntry.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      trendChange: (json["trendChange"] as num? ?? 0.0).toDouble(),
      periodDays: json["periodDays"] as int? ?? 30,
    );
  }
}

class DashboardOverviewStats {
  const DashboardOverviewStats({
    required this.total,
    required this.pending,
    required this.verified,
    required this.cleanupScheduled,
    required this.inProgress,
    required this.cleaned,
    required this.rejected,
  });

  final int total;
  final int pending;
  final int verified;
  final int cleanupScheduled;
  final int inProgress;
  final int cleaned;
  final int rejected;

  factory DashboardOverviewStats.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewStats(
      total: json["total"] as int? ?? 0,
      pending: json["pending"] as int? ?? 0,
      verified: json["verified"] as int? ?? 0,
      cleanupScheduled: json["cleanupScheduled"] as int? ?? 0,
      inProgress: json["inProgress"] as int? ?? 0,
      cleaned: json["cleaned"] as int? ?? 0,
      rejected: json["rejected"] as int? ?? 0,
    );
  }
}

class DashboardTrendEntry {
  const DashboardTrendEntry({
    required this.date,
    required this.count,
  });

  final String date;
  final int count;

  factory DashboardTrendEntry.fromJson(Map<String, dynamic> json) {
    return DashboardTrendEntry(
      date: (json["date"] ?? "").toString(),
      count: json["count"] as int? ?? 0,
    );
  }
}

class DashboardCategoryEntry {
  const DashboardCategoryEntry({
    required this.category,
    required this.count,
  });

  final String category;
  final int count;

  factory DashboardCategoryEntry.fromJson(Map<String, dynamic> json) {
    return DashboardCategoryEntry(
      category: (json["category"] ?? "").toString(),
      count: json["count"] as int? ?? 0,
    );
  }
}

class ReportingZone {
  const ReportingZone({
    required this.id,
    required this.name,
    required this.coordinates,
    required this.isActive,
    required this.createdAt,
  });

  final String id;
  final String name;
  final List<LatLng> coordinates;
  final bool isActive;
  final DateTime createdAt;

  factory ReportingZone.fromJson(Map<String, dynamic> json) {
    final rawCoords = json["coordinates"] as List<dynamic>? ?? const [];
    final coordsList = rawCoords
        .map((c) => LatLng(
              (c["lat"] as num).toDouble(),
              (c["lng"] as num).toDouble(),
            ))
        .toList();

    return ReportingZone(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      coordinates: coordsList,
      isActive: json["isActive"] == true,
      createdAt: DateTime.tryParse(json["createdAt"]?.toString() ?? "") ?? DateTime.now(),
    );
  }
}
