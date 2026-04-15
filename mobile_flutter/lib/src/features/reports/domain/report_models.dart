class PaginationMeta {
  const PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    int parseInt(dynamic value, int fallback) {
      if (value is int) return value;
      return int.tryParse(value?.toString() ?? "") ?? fallback;
    }

    return PaginationMeta(
      page: parseInt(json["page"], 1),
      limit: parseInt(json["limit"], 20),
      total: parseInt(json["total"], 0),
      totalPages: parseInt(json["totalPages"], 1),
    );
  }
}

class PaginatedData<T> {
  const PaginatedData({required this.data, required this.pagination});

  final List<T> data;
  final PaginationMeta pagination;
}

PaginatedData<T> parsePaginatedData<T>(
  Map<String, dynamic> json,
  T Function(Map<String, dynamic>) parser,
) {
  final rawData = json["data"] as List<dynamic>? ?? const [];
  final rawPagination =
      json["pagination"] as Map<String, dynamic>? ?? <String, dynamic>{};

  return PaginatedData<T>(
    data: rawData
        .whereType<Map<String, dynamic>>()
        .map(parser)
        .toList(growable: false),
    pagination: PaginationMeta.fromJson(rawPagination),
  );
}

class BarangayBrief {
  const BarangayBrief({required this.id, required this.name});

  final String id;
  final String name;

  factory BarangayBrief.fromJson(Map<String, dynamic> json) {
    return BarangayBrief(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
    );
  }
}

class ReportImage {
  const ReportImage({
    required this.id,
    required this.imageUrl,
    required this.type,
  });

  final String id;
  final String imageUrl;
  final String type;

  factory ReportImage.fromJson(Map<String, dynamic> json) {
    return ReportImage(
      id: (json["id"] ?? "").toString(),
      imageUrl: (json["imageUrl"] ?? "").toString(),
      type: (json["type"] ?? "REPORT").toString(),
    );
  }
}

class ReportRecord {
  const ReportRecord({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.priority,
    required this.latitude,
    required this.longitude,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.images,
    this.address,
    this.barangay,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final String priority;
  final double latitude;
  final double longitude;
  final String? address;
  final bool isAnonymous;
  final DateTime createdAt;
  final DateTime updatedAt;
  final BarangayBrief? barangay;
  final List<ReportImage> images;

  factory ReportRecord.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic value, double fallback) {
      if (value is num) return value.toDouble();
      return double.tryParse(value?.toString() ?? "") ?? fallback;
    }

    DateTime parseDate(dynamic value) {
      if (value is String) {
        return DateTime.tryParse(value) ?? DateTime.now();
      }
      return DateTime.now();
    }

    final imageList = (json["images"] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ReportImage.fromJson)
        .toList(growable: false);

    return ReportRecord(
      id: (json["id"] ?? "").toString(),
      title: (json["title"] ?? "").toString(),
      description: (json["description"] ?? "").toString(),
      category: (json["category"] ?? "OTHER").toString(),
      status: (json["status"] ?? "PENDING").toString(),
      priority: (json["priority"] ?? "MEDIUM").toString(),
      latitude: parseDouble(json["latitude"], 0),
      longitude: parseDouble(json["longitude"], 0),
      address: json["address"]?.toString(),
      isAnonymous: json["isAnonymous"] == true,
      createdAt: parseDate(json["createdAt"]),
      updatedAt: parseDate(json["updatedAt"]),
      barangay: json["barangay"] is Map<String, dynamic>
          ? BarangayBrief.fromJson(json["barangay"] as Map<String, dynamic>)
          : null,
      images: imageList,
    );
  }
}

const Map<String, String> statusLabels = {
  "PENDING": "Pending",
  "VERIFIED": "Verified",
  "CLEANUP_SCHEDULED": "Scheduled",
  "IN_PROGRESS": "In Progress",
  "CLEANED": "Cleaned",
  "REJECTED": "Rejected",
};

const Map<String, String> wasteCategoryLabels = {
  "SOLID_WASTE": "Solid Waste",
  "HAZARDOUS": "Hazardous",
  "LIQUID": "Liquid Waste",
  "RECYCLABLE": "Recyclable",
  "ORGANIC": "Organic",
  "ELECTRONIC": "Electronic",
  "OTHER": "Other",
};
