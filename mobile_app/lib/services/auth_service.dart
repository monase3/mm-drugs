import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthUser {
  final String id;
  final String fullName;
  final String email;
  final String role;

  const AuthUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
    );
  }
}

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  static const _tokenKey = 'auth_token';

  AuthService({required Dio dio, FlutterSecureStorage? storage})
      : _dio = dio,
        _storage = storage ?? const FlutterSecureStorage();

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> _saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  String? _extractError(dynamic error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        return (data['error'] as String?) ?? 'حدث خطأ غير متوقع';
      }
      return switch (error.response?.statusCode) {
        409 => 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً',
        422 => 'بيانات غير صالحة، تحقق من المدخلات',
        401 => 'بيانات الدخول غير صحيحة',
        _ => 'حدث خطأ في الاتصال بالخادم',
      };
    }
    return null;
  }

  Future<AuthUser> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final body = response.data as Map<String, dynamic>;
      if (body['ok'] != true) {
        throw Exception(body['error'] as String? ?? 'فشل تسجيل الدخول');
      }
      final token = body['token'] as String;
      await _saveToken(token);
      _dio.options.headers['Authorization'] = 'Bearer $token';
      return AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<AuthUser> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String role,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'role': role,
      });
      final body = response.data as Map<String, dynamic>;
      if (body['ok'] != true) {
        throw Exception(body['error'] as String? ?? 'فشل إنشاء الحساب');
      }
      final token = body['token'] as String;
      await _saveToken(token);
      _dio.options.headers['Authorization'] = 'Bearer $token';
      return AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {}
    _dio.options.headers.remove('Authorization');
    await clearToken();
  }

  Future<AuthUser?> tryAutoLogin() async {
    final token = await getToken();
    if (token == null) return null;
    _dio.options.headers['Authorization'] = 'Bearer $token';
    try {
      final response = await _dio.get('/auth/me');
      final body = response.data as Map<String, dynamic>;
      if (body['ok'] != true) {
        await clearToken();
        _dio.options.headers.remove('Authorization');
        return null;
      }
      return AuthUser.fromJson(body['user'] as Map<String, dynamic>);
    } catch (_) {
      await clearToken();
      _dio.options.headers.remove('Authorization');
      return null;
    }
  }
}
