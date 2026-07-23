class PharmacyRequest {
  final String id;
  final String drugName;
  final int quantity;
  final String? notes;
  final String status;
  final String createdAt;
  final String? updatedAt;
  final String? pharmacyId;
  final String? pharmacyName;
  final String? pharmacyCity;
  final String? pharmacyPhone;

  const PharmacyRequest({
    required this.id,
    required this.drugName,
    required this.quantity,
    this.notes,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.pharmacyId,
    this.pharmacyName,
    this.pharmacyCity,
    this.pharmacyPhone,
  });

  factory PharmacyRequest.fromJson(Map<String, dynamic> json) {
    return PharmacyRequest(
      id: json['id'] as String,
      drugName: (json['drug_name'] ?? json['drugName']) as String,
      quantity: (json['quantity'] as num).toInt(),
      notes: json['notes'] as String?,
      status: json['status'] as String,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String?,
      pharmacyId: json['pharmacy_id'] as String?,
      pharmacyName: json['pharmacy_name'] as String?,
      pharmacyCity: json['city'] as String?,
      pharmacyPhone: json['phone'] as String?,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'accepted':
        return 'تم القبول';
      case 'rejected':
        return 'مرفوض';
      case 'fulfilled':
        return 'مكتمل';
      default:
        return status;
    }
  }

  String get createdAtFormatted {
    try {
      final dt = DateTime.parse(createdAt);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return createdAt;
    }
  }
}
