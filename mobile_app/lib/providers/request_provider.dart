import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/pharmacy_request.dart';
import '../services/request_service.dart';

final myRequestsProvider =
    StateNotifierProvider<MyRequestsNotifier, AsyncValue<List<PharmacyRequest>>>(
  (ref) {
    final service = ref.read(requestServiceProvider);
    return MyRequestsNotifier(service);
  },
);

class MyRequestsNotifier extends StateNotifier<AsyncValue<List<PharmacyRequest>>> {
  final RequestService _service;

  MyRequestsNotifier(this._service) : super(const AsyncValue.loading());

  Future<void> load() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _service.getMyRequests());
  }

  Future<void> submit({
    required String pharmacyId,
    required String drugName,
    int quantity = 1,
    String notes = '',
  }) async {
    await _service.submitRequest(
      pharmacyId: pharmacyId,
      drugName: drugName,
      quantity: quantity,
      notes: notes,
    );
    await load();
  }
}
