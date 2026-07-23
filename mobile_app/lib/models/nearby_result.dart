class NearbyResult {
  final String pharmacyId;
  final String pharmacyName;
  final String city;
  final String? address;
  final String? phone;
  final double latitude;
  final double longitude;
  final String drugId;
  final String drugName;
  final String unit;
  final int quantity;
  final double price;
  final double distanceMeters;
  final double? rating;

  const NearbyResult({
    required this.pharmacyId,
    required this.pharmacyName,
    required this.city,
    this.address,
    this.phone,
    required this.latitude,
    required this.longitude,
    required this.drugId,
    required this.drugName,
    required this.unit,
    required this.quantity,
    required this.price,
    required this.distanceMeters,
    this.rating,
  });

  factory NearbyResult.fromJson(Map<String, dynamic> json) {
    return NearbyResult(
      pharmacyId: json['pharmacyId'] as String,
      pharmacyName: json['pharmacyName'] as String,
      city: json['city'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      drugId: json['drugId'] as String,
      drugName: json['drugName'] as String,
      unit: json['unit'] as String,
      quantity: (json['quantity'] as num).toInt(),
      price: (json['price'] as num).toDouble(),
      distanceMeters: (json['distanceMeters'] as num).toDouble(),
      rating: json['rating'] != null ? (json['rating'] as num).toDouble() : null,
    );
  }

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '${distanceMeters.toStringAsFixed(0)} م';
    }
    return '${(distanceMeters / 1000).toStringAsFixed(1)} كم';
  }

  String get formattedPrice {
    return '${price.toStringAsFixed(2)} ر.س';
  }

  String get formattedRating {
    if (rating == null) return '';
    return '★ ${rating!.toStringAsFixed(1)}';
  }
}

class NearbyResponse {
  final NearbyQuery query;
  final int count;
  final List<NearbyResult> results;

  const NearbyResponse({
    required this.query,
    required this.count,
    required this.results,
  });

  factory NearbyResponse.fromJson(Map<String, dynamic> json) {
    return NearbyResponse(
      query: NearbyQuery.fromJson(json['query'] as Map<String, dynamic>),
      count: json['count'] as int,
      results: (json['results'] as List<dynamic>)
          .map((e) => NearbyResult.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class NearbyQuery {
  final String drugName;
  final double lat;
  final double lng;
  final double radiusKm;

  const NearbyQuery({
    required this.drugName,
    required this.lat,
    required this.lng,
    required this.radiusKm,
  });

  factory NearbyQuery.fromJson(Map<String, dynamic> json) {
    return NearbyQuery(
      drugName: json['drugName'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      radiusKm: (json['radiusKm'] as num).toDouble(),
    );
  }
}
