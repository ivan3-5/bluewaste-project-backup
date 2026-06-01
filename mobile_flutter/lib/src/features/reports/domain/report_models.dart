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

class ReporterInfo {
  const ReporterInfo({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;

  factory ReporterInfo.fromJson(Map<String, dynamic> json) {
    return ReporterInfo(
      id: (json["id"] ?? "").toString(),
      firstName: (json["firstName"] ?? "").toString(),
      lastName: (json["lastName"] ?? "").toString(),
      email: json["email"]?.toString(),
      phone: json["phone"]?.toString(),
    );
  }
}

class StatusHistoryEntry {
  const StatusHistoryEntry({
    required this.id,
    this.previousStatus,
    required this.newStatus,
    this.notes,
    this.changedByName,
    required this.createdAt,
  });

  final String id;
  final String? previousStatus;
  final String newStatus;
  final String? notes;
  final String? changedByName;
  final DateTime createdAt;

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> json) {
    final changedBy = json["changedBy"] as Map<String, dynamic>?;
    String? name;
    if (changedBy != null) {
      final first = (changedBy["firstName"] ?? "").toString();
      final last = (changedBy["lastName"] ?? "").toString();
      name = "$first $last".trim();
      if (name.isEmpty) name = null;
    }

    return StatusHistoryEntry(
      id: (json["id"] ?? "").toString(),
      previousStatus: json["previousStatus"]?.toString(),
      newStatus: (json["newStatus"] ?? "PENDING").toString(),
      notes: json["notes"]?.toString(),
      changedByName: name,
      createdAt: DateTime.tryParse(json["createdAt"]?.toString() ?? "") ?? DateTime.now(),
    );
  }
}

class AssignedWorkerInfo {
  const AssignedWorkerInfo({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.avatarUrl,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String role;
  final String? avatarUrl;

  String get fullName => "$firstName $lastName".trim();

  factory AssignedWorkerInfo.fromJson(Map<String, dynamic> json) {
    return AssignedWorkerInfo(
      id: (json["id"] ?? "").toString(),
      firstName: (json["firstName"] ?? "").toString(),
      lastName: (json["lastName"] ?? "").toString(),
      role: (json["role"] ?? "FIELD_WORKER").toString(),
      avatarUrl: json["avatarUrl"]?.toString(),
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
    required this.latitude,
    required this.longitude,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.images,
    this.address,
    this.priority,
    this.reporter,
    this.statusHistory,
    this.assignedToId,
    this.assignedTo,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final double latitude;
  final double longitude;
  final String? address;
  final bool isAnonymous;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<ReportImage> images;
  final String? priority;
  final ReporterInfo? reporter;
  final List<StatusHistoryEntry>? statusHistory;
  final String? assignedToId;
  final AssignedWorkerInfo? assignedTo;

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

    final historyList = (json["statusHistory"] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(StatusHistoryEntry.fromJson)
        .toList(growable: false);

    final reporterJson = json["reporter"] as Map<String, dynamic>?;
    final assignedToJson = json["assignedTo"] as Map<String, dynamic>?;

    return ReportRecord(
      id: (json["id"] ?? "").toString(),
      title: (json["title"] ?? "").toString(),
      description: (json["description"] ?? "").toString(),
      category: (json["category"] ?? "WITH_WASTE").toString(),
      status: (json["status"] ?? "PENDING").toString(),
      latitude: parseDouble(json["latitude"], 0),
      longitude: parseDouble(json["longitude"], 0),
      address: json["address"]?.toString(),
      isAnonymous: json["isAnonymous"] == true,
      createdAt: parseDate(json["createdAt"]),
      updatedAt: parseDate(json["updatedAt"]),
      images: imageList,
      priority: json["priority"]?.toString(),
      reporter: reporterJson != null ? ReporterInfo.fromJson(reporterJson) : null,
      statusHistory: historyList,
      assignedToId: json["assignedToId"]?.toString(),
      assignedTo: assignedToJson != null ? AssignedWorkerInfo.fromJson(assignedToJson) : null,
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
  "WITH_WASTE": "With Waste",
  "NO_WASTE": "No Waste",
};
