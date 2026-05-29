class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.phone,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? phone;
  final String? avatarUrl;

  String get fullName => "$firstName $lastName".trim();
  bool get isWorker => role == "FIELD_WORKER";

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json["id"] ?? "").toString(),
      email: (json["email"] ?? "").toString(),
      firstName: (json["firstName"] ?? "").toString(),
      lastName: (json["lastName"] ?? "").toString(),
      role: (json["role"] ?? "CITIZEN").toString(),
      phone: json["phone"]?.toString(),
      avatarUrl: json["avatarUrl"]?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "email": email,
      "firstName": firstName,
      "lastName": lastName,
      "role": role,
      "phone": phone,
      "avatarUrl": avatarUrl,
    };
  }

  AppUser copyWith({
    String? firstName,
    String? lastName,
    String? phone,
    String? avatarUrl,
  }) {
    return AppUser(
      id: id,
      email: email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}
