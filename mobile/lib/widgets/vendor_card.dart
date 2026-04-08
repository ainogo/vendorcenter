import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/favorites_service.dart';

class VendorCard extends StatelessWidget {
  final Map<String, dynamic> vendor;

  const VendorCard({super.key, required this.vendor});

  @override
  Widget build(BuildContext context) {
    final name = vendor['businessName'] ?? vendor['business_name'] ?? 'Vendor';
    final categories = vendor['serviceCategories'] as List<dynamic>?;
    final category = (categories != null && categories.isNotEmpty) ? categories.first.toString() : (vendor['category'] ?? '');
    final city = vendor['zone'] ?? vendor['city'] ?? '';
    final rating = (vendor['rating'] ?? vendor['avg_rating'] ?? 0).toDouble();
    final reviewCount = vendor['reviews'] ?? vendor['review_count'] ?? 0;
    final vendorId = vendor['vendorId']?.toString() ?? vendor['id']?.toString() ?? '';
    final isVerified = vendor['verificationStatus'] == 'approved' || vendor['is_verified'] == true;
    final distanceKm = vendor['distanceKm'];

    final favService = context.watch<FavoritesService>();
    final isFav = favService.isFavorite(vendorId);
    final isDark = AppColors.isDark(context);

    return GestureDetector(
      onTap: () {
        if (vendorId.isNotEmpty) context.push('/vendor/$vendorId');
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        clipBehavior: Clip.hardEdge,
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderOf(context)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.1 : 0.04), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        child: Row(
          children: [
            // Circular avatar with category icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary.withValues(alpha: 0.12), AppColors.accent.withValues(alpha: 0.1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  _categoryIcon(category),
                  size: 22,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textOf(context)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isVerified) ...[
                        const SizedBox(width: 5),
                        const Icon(Icons.verified, size: 16, color: Color(0xFF2874F0)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    category,
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context), fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (city.isNotEmpty) ...[
                        Icon(Icons.location_on_outlined, size: 12, color: AppColors.textMutedOf(context)),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(city, style: TextStyle(fontSize: 11, color: AppColors.textMutedOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ],
                      if (reviewCount > 0) ...[
                        const SizedBox(width: 6),
                        Text('$reviewCount Reviews', style: TextStyle(fontSize: 11, color: AppColors.textMutedOf(context))),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Rating + favorite
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (rating > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _ratingColor(rating).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star_rounded, size: 14, color: _ratingColor(rating)),
                        const SizedBox(width: 3),
                        Text(
                          rating.toStringAsFixed(1),
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _ratingColor(rating)),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () => favService.toggle(vendorId),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: Icon(
                      isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      key: ValueKey(isFav),
                      size: 22,
                      color: isFav ? AppColors.error : AppColors.textMutedOf(context),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _ratingColor(double r) {
    if (r >= 4.0) return const Color(0xFF16A34A);
    if (r >= 3.0) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }

  static IconData _categoryIcon(String category) {
    final lower = category.toLowerCase();
    if (lower.contains('appliance') || lower.contains('repair') || lower.contains('mechanic')) return Icons.home_repair_service_rounded;
    if (lower.contains('clean')) return Icons.cleaning_services_rounded;
    if (lower.contains('electric') || lower.contains('wiring')) return Icons.bolt_rounded;
    if (lower.contains('plumb') || lower.contains('pipe')) return Icons.plumbing_rounded;
    if (lower.contains('paint') || lower.contains('décor')) return Icons.format_paint_rounded;
    if (lower.contains('salon') || lower.contains('beauty') || lower.contains('hair')) return Icons.content_cut_rounded;
    if (lower.contains('moving') || lower.contains('reloc') || lower.contains('tow')) return Icons.local_shipping_rounded;
    if (lower.contains('auto') || lower.contains('vehicle')) return Icons.directions_car_rounded;
    if (lower.contains('garden') || lower.contains('lawn')) return Icons.yard_rounded;
    if (lower.contains('photo') || lower.contains('video')) return Icons.camera_alt_rounded;
    if (lower.contains('catering') || lower.contains('food')) return Icons.restaurant_rounded;
    if (lower.contains('ac') || lower.contains('hvac') || lower.contains('air')) return Icons.ac_unit_rounded;
    return Icons.storefront_rounded;
  }
}
