import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';

import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';
import 'package:vendorcenter/services/favorites_service.dart';
import 'package:vendorcenter/widgets/vendor_card.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final _api = ApiService();
  List<dynamic> _vendors = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    final favService = context.read<FavoritesService>();
    if (favService.ids.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    try {
      final allVendors = await _api.getApprovedVendors();
      final favIds = favService.ids;
      _vendors = allVendors.where((v) => favIds.contains(v['id']?.toString())).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    // Re-render when favorites change
    context.watch<FavoritesService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Saved Vendors')),
      body: _loading
          ? _buildShimmer()
          : _vendors.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: () async {
                    setState(() => _loading = true);
                    await _loadFavorites();
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _vendors.length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: VendorCard(vendor: _vendors[i]),
                    ),
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.error.withAlpha(20),
            ),
            child: Icon(Icons.favorite_border_rounded, size: 48, color: AppColors.error.withAlpha(120)),
          ),
          const SizedBox(height: 20),
          Text('No saved vendors', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Text(
            'Tap the heart icon on a vendor to save them here.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondaryOf(context)),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.go('/search'),
            icon: const Icon(Icons.search),
            label: const Text('Explore Vendors'),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    final isDark = AppColors.isDark(context);
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2A2A2A) : Colors.grey.shade200,
      highlightColor: isDark ? const Color(0xFF3A3A3A) : Colors.grey.shade50,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: List.generate(
          4,
          (_) => Container(
            height: 80,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: AppColors.surfaceOf(context), borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }
}
