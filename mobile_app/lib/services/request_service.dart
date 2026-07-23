import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/pharmacy_request.dart';
import 'api_service.dart';

final requestServiceProvider = Provider<RequestService>((ref) {
  final apiService = ref.read(apiServiceProvider);
  return RequestService(dio: apiService.dio);
});

class RequestService {
  final Dio _dio;

  RequestService({required Dio dio}) : _dio = dio;

  Future<List<PharmacyRequest>> getMyRequests() async {
    final response = await _dio.get('/requests');
    final body = response.data as Map<String, dynamic>;
    final list = body['requests'] as List<dynamic>;
    return list
        .map((e) => PharmacyRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> submitRequest({
    required String pharmacyId,
    required String drugName,
    int quantity = 1,
    String notes = '',
  }) async {
    await _dio.post('/requests', data: {
      'pharmacyId': pharmacyId,
      'drugName': drugName,
      'quantity': quantity,
      'notes': notes,
    });
  }
}
