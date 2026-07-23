import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_service.dart';

final ratingServiceProvider = Provider<RatingService>((ref) {
  final apiService = ref.read(apiServiceProvider);
  return RatingService(dio: apiService.dio);
});

class RatingService {
  final Dio _dio;

  RatingService({required Dio dio}) : _dio = dio;

  Future<void> ratePharmacy({
    required String pharmacyId,
    required String requestId,
    required int score,
    String? comment,
  }) async {
    await _dio.post('/pharmacy-ratings', data: {
      'pharmacyId': pharmacyId,
      'requestId': requestId,
      'score': score,
      'comment': comment,
    });
  }
}
