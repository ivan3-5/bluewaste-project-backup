import "dart:convert";

import "package:flutter_secure_storage/flutter_secure_storage.dart";

class SessionStorage {
  SessionStorage({FlutterSecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const String tokenKey = "bluewaste_token";
  static const String userKey = "bluewaste_user";

  final FlutterSecureStorage _secureStorage;

  Future<String?> readToken() {
    return _secureStorage.read(key: tokenKey);
  }

  Future<Map<String, dynamic>?> readUserJson() async {
    final userStr = await _secureStorage.read(key: userKey);
    if (userStr == null || userStr.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(userStr);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> writeSession({
    required String token,
    required Map<String, dynamic> user,
  }) async {
    await Future.wait([
      _secureStorage.write(key: tokenKey, value: token),
      _secureStorage.write(key: userKey, value: jsonEncode(user)),
    ]);
  }

  Future<void> clearSession() async {
    await Future.wait([
      _secureStorage.delete(key: tokenKey),
      _secureStorage.delete(key: userKey),
    ]);
  }
}
