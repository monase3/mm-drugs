import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/nearby_result.dart';
import 'auth_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

class ApiService {
  late final Dio _dio;
  late final AuthService authService;

  ApiService({String? baseUrl})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? ApiConfig.baseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    authService = AuthService(dio: _dio);
  }

  Dio get dio => _dio;

  Future<List<NearbyResult>> searchNearbyDrugs({
    required String drugName,
    required double lat,
    required double lng,
    double radiusKm = 10,
  }) async {
    final response = await _dio.get(
      '/drugs/nearby',
      queryParameters: {
        'drugName': drugName,
        'lat': lat.toString(),
        'lng': lng.toString(),
        'radiusKm': radiusKm.toString(),
      },
    );
    final body = response.data as Map<String, dynamic>;
    final nearbyResponse = NearbyResponse.fromJson(body);
    return nearbyResponse.results;
  }
}
