import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/providers.dart";
import "../../../core/storage/session_storage.dart";
import "../data/auth_service.dart";
import "../domain/app_user.dart";

class AuthState {
  const AuthState({
    required this.isLoading,
    this.token,
    this.user,
    this.errorMessage,
  });

  final bool isLoading;
  final String? token;
  final AppUser? user;
  final String? errorMessage;

  bool get isAuthenticated => token != null && user != null;

  AuthState copyWith({
    bool? isLoading,
    String? token,
    AppUser? user,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      token: token ?? this.token,
      user: user ?? this.user,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  static const initial = AuthState(isLoading: true);
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._authService, this._storage) : super(AuthState.initial) {
    loadSession();
  }

  final AuthService _authService;
  final SessionStorage _storage;

  Future<void> loadSession() async {
    try {
      final token = await _storage.readToken();
      final userJson = await _storage.readUserJson();

      if (token != null && token.isNotEmpty && userJson != null) {
        state = AuthState(
          isLoading: false,
          token: token,
          user: AppUser.fromJson(userJson),
        );
        return;
      }

      state = const AuthState(isLoading: false);
    } catch (_) {
      await _storage.clearSession();
      state = const AuthState(isLoading: false);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final session =
          await _authService.login(email: email, password: password);
      await _storage.writeSession(
          token: session.token, user: session.user.toJson());

      state = AuthState(
        isLoading: false,
        token: session.token,
        user: session.user,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final session = await _authService.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
      );

      await _storage.writeSession(
          token: session.token, user: session.user.toJson());

      state = AuthState(
        isLoading: false,
        token: session.token,
        user: session.user,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      rethrow;
    }
  }

  Future<void> refreshProfile() async {
    if (!state.isAuthenticated) {
      return;
    }

    try {
      final profile = await _authService.getProfile();
      await _storage.writeSession(
        token: state.token!,
        user: profile.toJson(),
      );
      state = state.copyWith(user: profile, clearError: true);
    } catch (_) {
      // Keep previous local session if profile refresh fails.
    }
  }

  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? avatarUrl,
  }) async {
    if (!state.isAuthenticated) {
      return;
    }

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final updated = await _authService.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        avatarUrl: avatarUrl,
      );

      await _storage.writeSession(token: state.token!, user: updated.toJson());

      state = state.copyWith(
        isLoading: false,
        user: updated,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      rethrow;
    }
  }

  Future<void> uploadAvatar({required String filePath}) async {
    if (!state.isAuthenticated || state.user == null) {
      return;
    }

    final currentUser = state.user!;

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final avatarUrl = await _authService.uploadImage(filePath: filePath);
      final updated = await _authService.updateProfile(
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: currentUser.phone,
        avatarUrl: avatarUrl,
      );

      await _storage.writeSession(token: state.token!, user: updated.toJson());

      state = state.copyWith(
        isLoading: false,
        user: updated,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    await _storage.clearSession();
    state = const AuthState(isLoading: false);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref.watch(authServiceProvider),
    ref.watch(sessionStorageProvider),
  );
});
