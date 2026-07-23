import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'theme/app_theme.dart';
import 'features/search/search_screen.dart';
import 'features/requests/my_requests_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/favorites/favorites_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/auth/login_screen.dart';
import 'providers/auth_provider.dart';
import 'services/request_service.dart';
import 'services/notification_service.dart';
import 'widgets/gradient_background.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: MmDrugsApp(),
    ),
  );
}

class MmDrugsApp extends StatelessWidget {
  const MmDrugsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MM Drugs',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar', 'SA'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ar', 'SA'),
      ],
      theme: AppTheme.light,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerStatefulWidget {
  const AuthGate({super.key});

  @override
  ConsumerState<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends ConsumerState<AuthGate> {
  bool _showSplash = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _showSplash = false);
    });
    Future.microtask(() {
      ref.read(authProvider.notifier).checkAuth();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (_showSplash) {
      return const _SplashScreen();
    }

    return switch (authState.status) {
      AuthStatus.unknown => const _SplashScreen(),
      AuthStatus.authenticated => const _MainShell(),
      AuthStatus.unauthenticated => const LoginScreen(),
    };
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return GradientBackground(
      colors: const [
        Color(0xFF1565C0),
        Color(0xFF0D47A1),
      ],
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.asset(
                  'assets/logo.png',
                  width: 100,
                  height: 100,
                  fit: BoxFit.cover,
                ),
              ).animate().scale(
                duration: 800.ms,
                curve: Curves.elasticOut,
              ),
              const SizedBox(height: 16),
              const Text(
                'MM Drugs',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ).animate().fadeIn(duration: 600.ms, delay: 400.ms),
              const SizedBox(height: 8),
              Text(
                'دليلك إلى أقرب صيدلية',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ).animate().fadeIn(duration: 600.ms, delay: 600.ms),
              const SizedBox(height: 48),
              const CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ).animate().fadeIn(duration: 400.ms, delay: 800.ms),
            ],
          ),
        ),
      ),
    );
  }
}

class _MainShell extends ConsumerStatefulWidget {
  const _MainShell();

  @override
  ConsumerState<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<_MainShell> {
  int _currentIndex = 0;
  int _unreadCount = 0;

  final _screens = const [
    SearchScreen(),
    MyRequestsScreen(),
    NotificationsScreen(),
    FavoritesScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    ref.read(requestServiceProvider);
    _loadUnreadCount();
  }

  void _loadUnreadCount() {
    Future.microtask(() async {
      final count = await ref.read(notificationServiceProvider).getUnreadCount();
      if (mounted) setState(() => _unreadCount = count);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) {
          setState(() => _currentIndex = i);
          if (i == 2) _loadUnreadCount();
        },
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.search),
            selectedIcon: Icon(Icons.search),
            label: 'بحث',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'طلباتي',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _unreadCount > 0,
              label: Text(_unreadCount > 99 ? '99+' : '$_unreadCount'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: _unreadCount > 0,
              label: Text(_unreadCount > 99 ? '99+' : '$_unreadCount'),
              child: const Icon(Icons.notifications),
            ),
            label: 'الإشعارات',
          ),
          NavigationDestination(
            icon: Icon(Icons.favorite_outline),
            selectedIcon: Icon(Icons.favorite),
            label: 'المفضلة',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'الملف',
          ),
        ],
      ),
    );
  }
}
