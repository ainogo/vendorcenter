import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';
import 'package:vendorcenter/services/auth_service.dart';

class VendorReviewsScreen extends StatefulWidget {
  const VendorReviewsScreen({super.key});

  @override
  State<VendorReviewsScreen> createState() => _VendorReviewsScreenState();
}

class _VendorReviewsScreenState extends State<VendorReviewsScreen> {
  final _api = ApiService();
  List<dynamic> _reviews = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      _reviews = await _api.getPublicReviews(auth.userId, 100);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  double get _avgRating {
    if (_reviews.isEmpty) return 0;
    final sum = _reviews.fold<double>(0, (s, r) => s + (r['rating'] ?? 0).toDouble());
    return sum / _reviews.length;
  }

  Map<int, int> get _ratingDistribution {
    final dist = <int, int>{5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    for (final r in _reviews) {
      final rating = (num.tryParse(r['rating'].toString()) ?? 0).toInt();
      if (dist.containsKey(rating)) {
        dist[rating] = dist[rating]! + 1;
      }
    }
    return dist;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Reviews')),
      body: _loading
          ? _buildShimmer()
          : RefreshIndicator(
              onRefresh: _loadReviews,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Summary card
                  _buildSummary(),
                  const SizedBox(height: 20),

                  // Rating distribution
                  if (_reviews.isNotEmpty) ...[
                    _buildDistribution(),
                    const SizedBox(height: 20),
                  ],

                  // Reviews list
                  Text(
                    'All Reviews (${_reviews.length})',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textOf(context)),
                  ),
                  const SizedBox(height: 12),

                  if (_reviews.isEmpty) _buildEmpty() else ..._reviews.map(_reviewItem),
                ],
              ),
            ),
    );
  }

  Widget _buildSummary() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.gradientStart, AppColors.gradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Column(
            children: [
              Text(
                _avgRating.toStringAsFixed(1),
                style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white),
              ),
              RatingBarIndicator(
                rating: _avgRating,
                itemSize: 18,
                itemBuilder: (_, __) => const Icon(Icons.star_rounded, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                '${_reviews.length} reviews',
                style: const TextStyle(fontSize: 13, color: Colors.white70),
              ),
            ],
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ratingBar(5),
                _ratingBar(4),
                _ratingBar(3),
                _ratingBar(2),
                _ratingBar(1),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ratingBar(int stars) {
    final count = _ratingDistribution[stars] ?? 0;
    final percent = _reviews.isEmpty ? 0.0 : count / _reviews.length;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text('$stars', style: const TextStyle(fontSize: 12, color: Colors.white70)),
          const SizedBox(width: 6),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: percent,
                backgroundColor: Colors.white24,
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                minHeight: 6,
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 24,
            child: Text(
              '$count',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDistribution() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statItem('5★', _ratingDistribution[5] ?? 0, AppColors.success),
          _statItem('4★', _ratingDistribution[4] ?? 0, AppColors.success),
          _statItem('3★', _ratingDistribution[3] ?? 0, AppColors.warning),
          _statItem('2★', _ratingDistribution[2] ?? 0, AppColors.error),
          _statItem('1★', _ratingDistribution[1] ?? 0, AppColors.error),
        ],
      ),
    );
  }

  Widget _statItem(String label, int count, Color color) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: color)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
      ],
    );
  }

  Widget _reviewItem(dynamic r) {
    final name = r['customerName']?.toString() ?? r['customer_name']?.toString() ?? 'Customer';
    final rating = (r['rating'] ?? 0).toDouble();
    final comment = r['reviewText']?.toString() ?? r['comment']?.toString() ?? r['review_text']?.toString() ?? '';
    String dateStr = '';
    try {
      final date = DateTime.parse((r['createdAt'] ?? r['created_at'])?.toString() ?? '');
      dateStr = DateFormat('dd MMM yyyy').format(date);
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.accent.withValues(alpha: 0.1),
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.accent),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textOf(context))),
                    Text(dateStr, style: TextStyle(fontSize: 11, color: AppColors.textMutedOf(context))),
                  ],
                ),
              ),
              RatingBarIndicator(
                rating: rating,
                itemSize: 16,
                itemBuilder: (_, __) => const Icon(Icons.star_rounded, color: Colors.amber),
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(comment, style: TextStyle(fontSize: 14, color: AppColors.textSecondaryOf(context), height: 1.4)),
          ],
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.rate_review_outlined, size: 56, color: AppColors.textMutedOf(context)),
            const SizedBox(height: 12),
            Text('No reviews yet', style: TextStyle(color: AppColors.textSecondaryOf(context))),
            const SizedBox(height: 4),
            Text(
              'Reviews from customers will appear here',
              style: TextStyle(fontSize: 13, color: AppColors.textMutedOf(context)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    final isDark = AppColors.isDark(context);
    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.darkSurfaceAlt : Colors.grey.shade200,
      highlightColor: isDark ? AppColors.darkBorder : Colors.grey.shade50,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: List.generate(
          5,
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
