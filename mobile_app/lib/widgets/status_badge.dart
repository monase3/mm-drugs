import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg, String label) = switch (status) {
      'pending' => (const Color(0xFFFFF3E0), const Color(0xFFE65100), 'قيد الانتظار'),
      'accepted' => (const Color(0xFFE3F2FD), const Color(0xFF1565C0), 'تم القبول'),
      'rejected' => (const Color(0xFFFFEBEE), const Color(0xFFC62828), 'مرفوض'),
      'fulfilled' => (const Color(0xFFE8F5E9), const Color(0xFF2E7D32), 'مكتمل'),
      _ => (Colors.grey[100]!, Colors.grey[700]!, status),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
