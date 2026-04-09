import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';
import 'package:vendorcenter/services/auth_service.dart';
import 'package:shimmer/shimmer.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  final _api = ApiService();
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;
  bool _needsOnboarding = false;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getVendorDashboard();
      if (mounted) setState(() => _stats = data);
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not load dashboard. Pull to retry.');
    }
    // Check if vendor profile exists
    try {
      await _api.getVendorProfile();
      if (mounted) setState(() => _needsOnboarding = false);
    } catch (_) {
      if (mounted) setState(() => _needsOnboarding = true);
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // Greeting
            Text(
              'Welcome back, ${auth.userName}',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textOf(context),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage your business from here',
              style: TextStyle(color: AppColors.textSecondaryOf(context)),
            ),
            const SizedBox(height: 20),

            // Onboarding banner
            if (_needsOnboarding)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [AppColors.vendor.withValues(alpha: 0.1), AppColors.vendor.withValues(alpha: 0.05)]),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.vendor.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.rocket_launch_rounded, color: AppColors.vendor, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Complete Your Profile', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
                          const SizedBox(height: 2),
                          Text('Set up your business details to start receiving bookings', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () => context.push('/onboarding'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.vendor,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Setup', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),

            // Stats cards
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(_error!, style: const TextStyle(color: AppColors.error)),
              )
            else if (_loading)
              _buildLoadingCards()
            else
              _buildStatsGrid(),

            const SizedBox(height: 24),

            // Quick actions
            Text(
              'Quick Actions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.textOf(context),
              ),
            ),
            const SizedBox(height: 12),
            _buildQuickActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid() {
    final ratings = _stats['ratings'];
    final avgRating = ratings is Map ? (double.tryParse('${ratings['average']}') ?? 0.0) : 0.0;
    final reviewCount = ratings is Map ? (ratings['count'] ?? 0) : 0;

    final items = [
      _StatItem('Bookings', '${_stats['bookings'] ?? 0}', Icons.calendar_today, AppColors.vendor),
      _StatItem('Earnings', '₹${_stats['earningsEstimate'] ?? 0}', Icons.attach_money, AppColors.success),
      _StatItem('Rating', avgRating.toStringAsFixed(1), Icons.star_outline, AppColors.primary),
      _StatItem('Reviews', '$reviewCount', Icons.reviews_outlined, AppColors.warning),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: items.map((item) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(item.icon, color: item.color, size: 24),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.value,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: item.color,
                    ),
                  ),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondaryOf(context),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      )).toList(),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      children: [
        _actionTile(Icons.add_circle_outline, 'Add New Service', 'List a new service for customers', () => context.go('/services')),
        _actionTile(Icons.calendar_month, 'View Bookings', 'Manage pending and upcoming bookings', () => context.go('/bookings')),
        _actionTile(Icons.attach_money, 'Earnings', 'Track your revenue and payouts', () => context.push('/earnings')),
        _actionTile(Icons.reviews_outlined, 'Reviews', 'See what customers are saying', () => context.push('/reviews')),
        _actionTile(Icons.edit_outlined, 'Edit Profile', 'Update your business information', () => context.push('/profile/edit')),
      ],
    );
  }

  Widget _actionTile(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.vendor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.vendor),
        ),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
        trailing: Icon(Icons.chevron_right, color: AppColors.textMutedOf(context)),
        onTap: onTap,
      ),
    );
  }

  Widget _buildLoadingCards() {
    final isDark = AppColors.isDark(context);
    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.darkSurfaceAlt : Colors.grey.shade200,
      highlightColor: isDark ? AppColors.darkBorder : Colors.grey.shade50,
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.5,
        children: List.generate(4, (_) => Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceOf(context),
            borderRadius: BorderRadius.circular(14),
          ),
        )),
      ),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatItem(this.label, this.value, this.icon, this.color);
}
