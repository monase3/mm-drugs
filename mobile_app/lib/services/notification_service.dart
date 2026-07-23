import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_service.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final String? referenceId;
  final String? referenceType;
  bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.referenceId,
    this.referenceType,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      type: json['type'] as String? ?? '',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      referenceId: json['referenceId'] as String?,
      referenceType: json['referenceType'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class NotificationService {
  final ApiService _api;

  NotificationService(this._api);

  Future<List<AppNotification>> getNotifications({bool? unreadOnly}) async {
    final queryParams = <String, dynamic>{};
    if (unreadOnly == true) queryParams['unread'] = 'true';

    try {
      final response = await _api.dio.get(
        '/notifications',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final body = response.data as Map<String, dynamic>;
      if (body['ok'] == true) {
        final list = (body['notifications'] as List<dynamic>?) ?? [];
        return list.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
      }
    } on DioException {
      // Silently handle
    }
    return [];
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await _api.dio.get('/notifications');
      final body = response.data as Map<String, dynamic>;
      if (body['ok'] == true) {
        return (body['unreadCount'] as int?) ?? 0;
      }
    } on DioException {
      // Silently handle
    }
    return 0;
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final response = await _api.dio.patch(
        '/notifications',
        data: {'id': notificationId},
      );
      final body = response.data as Map<String, dynamic>;
      return body['ok'] == true;
    } on DioException {
      return false;
    }
  }

  Future<bool> markAllAsRead() async {
    try {
      final response = await _api.dio.patch(
        '/notifications',
        data: {'readAll': true},
      );
      final body = response.data as Map<String, dynamic>;
      return body['ok'] == true;
    } on DioException {
      return false;
    }
  }
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.read(apiServiceProvider));
});

final notificationsProvider = FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final service = ref.read(notificationServiceProvider);
  return service.getNotifications();
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final service = ref.read(notificationServiceProvider);
  return service.getUnreadCount();
});
