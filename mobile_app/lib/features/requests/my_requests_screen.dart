import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../providers/request_provider.dart';
import '../../services/rating_service.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/gradient_background.dart';

class MyRequestsScreen extends ConsumerStatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  ConsumerState<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends ConsumerState<MyRequestsScreen> {
  Timer? _pollTimer;
  final Map<String, String> _prevStatuses = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(myRequestsProvider.notifier).load());
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      ref.read(myRequestsProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final requestsAsync = ref.watch(myRequestsProvider);
    final theme = Theme.of(context);

    return GradientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('طلباتي'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.read(myRequestsProvider.notifier).load(),
            ),
          ],
        ),
        body: requestsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                const SizedBox(height: 12),
                Text('حدث خطأ', style: TextStyle(color: theme.colorScheme.error)),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => ref.read(myRequestsProvider.notifier).load(),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
          data: (requests) {
            if (requests.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.receipt_long, size: 72, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      'لا توجد طلبات',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 8),
                    Text('قم بطلب دواء من صيدلية', style: TextStyle(color: Colors.grey[500])),
                  ],
                ),
              );
            }

            final nowStatuses = <String, String>{};
            for (final r in requests) {
              nowStatuses[r.id] = r.status;
            }

            WidgetsBinding.instance.addPostFrameCallback((_) {
              _prevStatuses.clear();
              _prevStatuses.addAll(nowStatuses);
            });

            return RefreshIndicator(
              onRefresh: () => ref.read(myRequestsProvider.notifier).load(),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: requests.length,
                itemBuilder: (context, index) {
                  final req = requests[index];
                  final justChanged = _prevStatuses[req.id] != null && _prevStatuses[req.id] != req.status;
                  return _RequestCard(
                    request: req,
                    justChanged: justChanged,
                    onRate: (score) {
                      ref.read(ratingServiceProvider).ratePharmacy(
                        pharmacyId: req.pharmacyId ?? '',
                        requestId: req.id,
                        score: score,
                      );
                    },
                  ).animate().fadeIn(
                    duration: 300.ms,
                    delay: (index * 80).ms,
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final dynamic request;
  final bool justChanged;
  final void Function(int score)? onRate;

  const _RequestCard({required this.request, this.justChanged = false, this.onRate});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final screen = ScaffoldMessenger.maybeOf(context);
    if (justChanged && screen != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        screen.showSnackBar(SnackBar(
          content: Text('تم تحديث حالة طلب ${request.drugName}'),
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
        ));
      });
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: justChanged
            ? BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.5), width: 2),
              )
            : null,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.medication, color: theme.colorScheme.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(request.drugName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        if (request.pharmacyName != null) ...[
                          const SizedBox(height: 2),
                          Text(request.pharmacyName, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                        ],
                      ],
                    ),
                  ),
                  if (justChanged)
                    Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.amber[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text('جديد', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber[900])),
                    ),
                  StatusBadge(status: request.status),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _InfoChip(icon: Icons.inventory_2, label: 'الكمية: ${request.quantity}'),
                  const SizedBox(width: 12),
                  _InfoChip(icon: Icons.calendar_today, label: request.createdAtFormatted),
                ],
              ),
              if (request.notes != null && request.notes!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(10)),
                  child: Text(request.notes, style: TextStyle(color: Colors.grey[700], fontSize: 13)),
                ),
              ],
              if (request.status == 'fulfilled') ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showRatingDialog(context, request),
                    icon: const Icon(Icons.star, size: 18),
                    label: const Text('تقييم الصيدلية'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.amber[700],
                      side: BorderSide(color: Colors.amber[300]!),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showRatingDialog(BuildContext context, dynamic req) {
    int rating = 5;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDState) => AlertDialog(
          title: const Text('تقييم الصيدلية'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('قم بتقييم ${req.pharmacyName ?? "الصيدلية"}'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  return IconButton(
                    icon: Icon(
                      i < rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 36,
                    ),
                    onPressed: () => setDState(() => rating = i + 1),
                  );
                }),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                onRate?.call(rating);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('شكراً لتقييمك!'), behavior: SnackBarBehavior.floating),
                );
              },
              child: const Text('إرسال التقييم'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey[500]),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }
}
