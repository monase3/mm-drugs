import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class FavoritePharmacy {
  final String id;
  final String name;

  const FavoritePharmacy({required this.id, required this.name});

  Map<String, dynamic> toJson() => {'id': id, 'name': name};

  factory FavoritePharmacy.fromJson(Map<String, dynamic> json) {
    return FavoritePharmacy(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, List<FavoritePharmacy>>((ref) {
  return FavoritesNotifier();
});

class FavoritesNotifier extends StateNotifier<List<FavoritePharmacy>> {
  final FlutterSecureStorage _storage;
  static const _key = 'favorite_pharmacies';

  FavoritesNotifier({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(),
        super([]) {
    _load();
  }

  Future<void> _load() async {
    final raw = await _storage.read(key: _key);
    if (raw != null) {
      final list = (jsonDecode(raw) as List<dynamic>)
          .map((e) => FavoritePharmacy.fromJson(e as Map<String, dynamic>))
          .toList();
      state = list;
    }
  }

  Future<void> _persist() async {
    await _storage.write(
      key: _key,
      value: jsonEncode(state.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> toggle(String id, String name) async {
    final index = state.indexWhere((f) => f.id == id);
    if (index >= 0) {
      state = [...state]..removeAt(index);
    } else {
      state = [...state, FavoritePharmacy(id: id, name: name)];
    }
    await _persist();
  }

  bool isFavorite(String id) => state.any((f) => f.id == id);

  String? getName(String id) {
    final idx = state.indexWhere((f) => f.id == id);
    return idx >= 0 ? state[idx].name : null;
  }
}
