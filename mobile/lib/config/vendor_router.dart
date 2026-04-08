import 'package:go_router/go_router.dart';
import 'package:vendorcenter/services/auth_service.dart';
import 'package:vendorcenter/screens/vendor/vendor_login_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_register_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_shell_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_dashboard_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_bookings_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_services_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_profile_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_earnings_screen.dart';
import 'package:vendorcenter/screens/vendor/vendor_reviews_screen.dart';
import 'package:vendorcenter/screens/profile/edit_profile_screen.dart';

GoRouter createVendorRouter(AuthService auth) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isLoggedIn;
      final isPublic = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!loggedIn && !isPublic) return '/login';
      if (loggedIn && isPublic) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const VendorLoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (_, __) => const VendorRegisterScreen(),
      ),
      ShellRoute(
        builder: (_, state, child) => VendorShellScreen(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (_, __) => const NoTransitionPage(child: VendorDashboardScreen()),
          ),
          GoRoute(
            path: '/bookings',
            pageBuilder: (_, __) => const NoTransitionPage(child: VendorBookingsScreen()),
          ),
          GoRoute(
            path: '/services',
            pageBuilder: (_, __) => const NoTransitionPage(child: VendorServicesScreen()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (_, __) => const NoTransitionPage(child: VendorProfileScreen()),
          ),
        ],
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (_, __) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/earnings',
        builder: (_, __) => const VendorEarningsScreen(),
      ),
      GoRoute(
        path: '/reviews',
        builder: (_, __) => const VendorReviewsScreen(),
      ),
    ],
  );
}
