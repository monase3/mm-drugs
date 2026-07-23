import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/favorites_service.dart';
import '../../widgets/gradient_background.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesProvider);
    final theme = Theme.of(context);

    return GradientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('المفضلة'),
          centerTitle: true,
        ),
        body: favorites.isEmpty
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.favorite_border, size: 72, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      'لا توجد صيدليات مفضلة',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'أضف صيدليات من أيقونة القلب في نتائج البحث',
                      style: TextStyle(color: Colors.grey[500], fontSize: 13),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: favorites.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        '${favorites.length} صيدلية مفضلة',
                        style: theme.textTheme.titleMedium,
                      ),
                    );
                  }
                  final fav = favorites[index - 1];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.local_pharmacy,
                          color: theme.colorScheme.primary,
                          size: 24,
                        ),
                      ),
                      title: Text(
                        fav.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        fav.id,
                        style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 22),
                        onPressed: () {
                          ref.read(favoritesProvider.notifier).toggle(fav.id, fav.name);
                        },
                      ),
                    ),
                  ).animate().fadeIn(
                    duration: 300.ms,
                    delay: (index * 50).ms,
                  );
                },
              ),
      ),
    );
  }
}
