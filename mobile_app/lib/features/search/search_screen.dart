import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../models/nearby_result.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/favorites_service.dart';
import '../../widgets/gradient_background.dart';
import '../pharmacy/pharmacy_detail_screen.dart';
import '../favorites/favorites_screen.dart';

final searchResultsProvider =
    StateProvider<AsyncValue<List<NearbyResult>>?>((ref) => null);
final currentLocationProvider = StateProvider<Position?>((ref) => null);

class CityData {
  final String name;
  final double lat;
  final double lng;

  const CityData(this.name, this.lat, this.lng);
}

const List<CityData> availableCities = [
  CityData('عدن', 12.7860, 45.0190),
  CityData('الرياض', 24.7136, 46.6753),
  CityData('جدة', 21.5433, 39.1728),
  CityData('صنعاء', 15.3694, 44.1910),
  CityData('تعز', 13.5789, 44.0219),
];

class _SelectedPos {
  final double lat;
  final double lng;
  const _SelectedPos(this.lat, this.lng);
}

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _drugNameController = TextEditingController();
  double _radiusKm = 10;
  bool _locating = true;
  bool _searched = false;
  CityData? _selectedCity;

  @override
  void initState() {
    super.initState();
    _detectLocation();
  }

  @override
  void dispose() {
    _drugNameController.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      setState(() => _locating = false);
      return;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        setState(() => _locating = false);
        return;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      setState(() => _locating = false);
      return;
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    if (!mounted) return;
    ref.read(currentLocationProvider.notifier).state = position;
    setState(() => _locating = false);
  }

  Future<void> _search() async {
    final drugName = _drugNameController.text.trim();
    if (drugName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى إدخال اسم الدواء')),
      );
      return;
    }

    final position = ref.read(currentLocationProvider);
    final usePosition = _selectedCity != null
        ? _SelectedPos(_selectedCity!.lat, _selectedCity!.lng)
        : position != null
            ? _SelectedPos(position.latitude, position.longitude)
            : null;

    if (usePosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى تحديد الموقع أو اختيار مدينة')),
      );
      return;
    }

    setState(() => _searched = true);
    final apiService = ref.read(apiServiceProvider);
    ref.read(searchResultsProvider.notifier).state = const AsyncValue.loading();

    final state = await AsyncValue.guard(
      () => apiService.searchNearbyDrugs(
        drugName: drugName,
        lat: usePosition.lat,
        lng: usePosition.lng,
        radiusKm: _radiusKm,
      ),
    );
    if (!mounted) return;
    ref.read(searchResultsProvider.notifier).state = state;
  }

  void _openMap(List<NearbyResult> results) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => _MapView()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final resultsState = ref.watch(searchResultsProvider);
    final position = ref.watch(currentLocationProvider);
    final authState = ref.watch(authProvider);
    final theme = Theme.of(context);

    return GradientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset('assets/logo.png', width: 28, height: 28, fit: BoxFit.cover),
              ),
              const SizedBox(width: 8),
              const Text('MM Drugs'),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.favorite_outline),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const FavoritesScreen()),
              ),
            ),
            if (authState.user != null)
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'logout') ref.read(authProvider.notifier).logout();
                },
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'profile',
                    enabled: false,
                    child: Text(authState.user!.fullName),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'logout',
                    child: Row(
                      children: [
                        Icon(Icons.logout, size: 18),
                        SizedBox(width: 8),
                        Text('تسجيل الخروج'),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
        body: Column(
          children: [
            _buildSearchBar(position, theme),
            Expanded(child: _buildResults(resultsState, position, theme)),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar(Position? position, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(4),
            child: Column(
              children: [
                TextField(
                  controller: _drugNameController,
                  decoration: InputDecoration(
                    hintText: 'ابحث عن دواء...',
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF1565C0)),
                    suffixIcon: _drugNameController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _drugNameController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    filled: false,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _search(),
                  onChanged: (_) => setState(() {}),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          if (_locating)
                            const SizedBox(
                              width: 14, height: 14,
                              child: CircularProgressIndicator(strokeWidth: 1.5),
                            )
                          else if (position != null)
                            Chip(
                              avatar: const Icon(Icons.my_location, size: 14, color: Color(0xFF1565C0)),
                              label: Text(
                                '${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)}',
                                style: const TextStyle(fontSize: 11),
                              ),
                              visualDensity: VisualDensity.compact,
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              backgroundColor: const Color(0xFF1565C0).withValues(alpha: 0.08),
                            )
                          else
                            TextButton.icon(
                              onPressed: _detectLocation,
                              icon: const Icon(Icons.location_off, size: 14),
                              label: const Text('تحديد الموقع', style: TextStyle(fontSize: 12)),
                              style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                            ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: _selectedCity != null
                                  ? const Color(0xFF00BFA5).withValues(alpha: 0.1)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<CityData>(
                                value: _selectedCity,
                                hint: const Text('مدينة', style: TextStyle(fontSize: 12)),
                                isDense: true,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _selectedCity != null
                                      ? const Color(0xFF00BFA5)
                                      : Colors.grey[700],
                                ),
                                items: availableCities.map((c) => DropdownMenuItem(
                                  value: c,
                                  child: Text(c.name),
                                )).toList(),
                                onChanged: (v) => setState(() => _selectedCity = v),
                              ),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Text('نطاق', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                          Expanded(
                            child: Slider(
                              value: _radiusKm,
                              min: 1, max: 50, divisions: 49,
                              label: '${_radiusKm.round()} كم',
                              onChanged: (v) => setState(() => _radiusKm = v),
                            ),
                          ),
                          Text(
                            '${_radiusKm.round()} كم',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton.icon(
              onPressed: _search,
              icon: const Icon(Icons.search, size: 20),
              label: const Text('بحث'),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 10),
          if (_searched) Divider(height: 1, color: Colors.grey[200]),
          if (_searched) const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _buildResults(
    AsyncValue<List<NearbyResult>>? resultsState,
    Position? position,
    ThemeData theme,
  ) {
    if (resultsState == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.medication, size: 72, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'ابحث عن دواء',
              style: TextStyle(color: Colors.grey[500], fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'سيتم عرض الصيدليات القريبة هنا',
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
          ],
        ),
      );
    }

    return resultsState.when(
      loading: () => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('جاري البحث...', style: TextStyle(color: Colors.grey[600])),
          ],
        ),
      ),
      error: (err, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              const Text('حدث خطأ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text(
                '$err'.replaceFirst('Exception: ', ''),
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: _search,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      ),
      data: (results) {
        if (results.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.search_off, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'لا توجد نتائج',
                  style: TextStyle(color: Colors.grey[600], fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'جرّب البحث باسم آخر أو وسّع نطاق البحث',
                  style: TextStyle(color: Colors.grey[500], fontSize: 13),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Text(
                    '${results.length} نتائج',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _openMap(results),
                    icon: const Icon(Icons.map, size: 18),
                    label: const Text('عرض على الخريطة'),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: results.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final result = results[index];
                  return _ResultCard(
                    result: result,
                    isFavorite: ref.watch(favoritesProvider).any((f) => f.id == result.pharmacyId),
                    onToggleFavorite: () {
                      ref.read(favoritesProvider.notifier).toggle(
                        result.pharmacyId,
                        result.pharmacyName,
                      );
                    },
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => PharmacyDetailScreen(result: result),
                        ),
                      );
                    },
                  ).animate().fadeIn(
                    duration: 350.ms,
                    delay: (index * 60).ms,
                  ).slideY(begin: 0.05);
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ResultCard extends StatelessWidget {
  final NearbyResult result;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;

  const _ResultCard({
    required this.result,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.local_pharmacy, color: theme.colorScheme.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          result.pharmacyName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(Icons.location_on, size: 12, color: Colors.grey[500]),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                '${result.city}${result.address != null ? ' - ${result.address}' : ''}',
                                style: TextStyle(color: Colors.grey[600], fontSize: 11),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (result.rating != null) ...[
                              const SizedBox(width: 6),
                              Icon(Icons.star, size: 12, color: Colors.amber[600]),
                              const SizedBox(width: 2),
                              Text(
                                result.rating!.toStringAsFixed(1),
                                style: TextStyle(color: Colors.amber[700], fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: isFavorite ? Colors.red : Colors.grey,
                      size: 22,
                    ),
                    onPressed: onToggleFavorite,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.medication, size: 16, color: theme.colorScheme.primary),
                    const SizedBox(width: 6),
                    Text(result.drugName, style: const TextStyle(fontSize: 13)),
                    const Spacer(),
                    Text(
                      result.formattedPrice,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.near_me, size: 12, color: Colors.orange[700]),
                          const SizedBox(width: 2),
                          Text(
                            result.formattedDistance,
                            style: TextStyle(color: Colors.orange[700], fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (result.quantity <= 5)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber, size: 14, color: Colors.orange[700]),
                      const SizedBox(width: 4),
                      Text(
                        'الكمية محدودة: ${result.quantity} ${result.unit}',
                        style: TextStyle(color: Colors.orange[700], fontSize: 11),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MapView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsState = ref.watch(searchResultsProvider);
    final results = resultsState?.valueOrNull ?? <NearbyResult>[];

    if (results.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('الخريطة')),
        body: const Center(child: Text('لا توجد نتائج')),
      );
    }

    final avgLat =
        results.map((r) => r.latitude).reduce((a, b) => a + b) / results.length;
    final avgLng =
        results.map((r) => r.longitude).reduce((a, b) => a + b) / results.length;

    final markers = results.map((r) => Marker(
      markerId: MarkerId(r.pharmacyId),
      position: LatLng(r.latitude, r.longitude),
      infoWindow: InfoWindow(
        title: r.pharmacyName,
        snippet: '${r.drugName} - ${r.formattedPrice}',
      ),
    )).toSet();

    return Scaffold(
      appBar: AppBar(title: const Text('الخريطة')),
      body: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: LatLng(avgLat, avgLng),
          zoom: 12,
        ),
        markers: markers,
        myLocationEnabled: true,
        myLocationButtonEnabled: true,
        zoomControlsEnabled: true,
        mapType: MapType.normal,
      ),
    );
  }
}
