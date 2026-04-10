import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class VendorEarningsScreen extends StatefulWidget {
  const VendorEarningsScreen({super.key});

  @override
  State<VendorEarningsScreen> createState() => _VendorEarningsScreenState();
}

class _VendorEarningsScreenState extends State<VendorEarningsScreen> {
  final _api = ApiService();
  List<dynamic> _completedBookings = [];
  Map<String, dynamic> _dashboard = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getVendorBookings(),
        _api.getVendorDashboard(),
      ]);
      if (mounted) {
        final allBookings = results[0] as List;
        setState(() {
          _completedBookings = allBookings.where((b) => b['status'] == 'completed').toList();
          _dashboard = results[1] as Map<String, dynamic>;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  double get _totalEarnings {
    return _completedBookings.fold<double>(0, (sum, b) {
      final amount = (double.tryParse(b['finalAmount']?.toString() ?? b['final_amount']?.toString() ?? '0') ?? 0) / 100;
      return sum + amount;
    });
  }

  double get _thisMonthEarnings {
    final now = DateTime.now();
    return _completedBookings.fold<double>(0, (sum, b) {
      try {
        final date = DateTime.parse(b['created_at']?.toString() ?? '');
        if (date.year == now.year && date.month == now.month) {
          return sum + (double.tryParse(b['finalAmount']?.toString() ?? b['final_amount']?.toString() ?? '0') ?? 0) / 100;
        }
      } catch (_) {}
      return sum;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: _loading
          ? _buildShimmer()
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  // Summary cards
                  Row(
                    children: [
                      _summaryCard('Total Earned', '₹${_totalEarnings.toStringAsFixed(0)}', AppColors.success, Icons.account_balance_wallet),
                      const SizedBox(width: 12),
                      _summaryCard('This Month', '₹${_thisMonthEarnings.toStringAsFixed(0)}', AppColors.info, Icons.trending_up),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _summaryCard('Jobs Done', '${_completedBookings.length}', AppColors.primary, Icons.check_circle),
                      const SizedBox(width: 12),
                      _summaryCard(
                        'Avg Rating',
                        (() {
                          final ratings = _dashboard['ratings'];
                          if (ratings is Map) return (double.tryParse('${ratings['average']}') ?? 0.0).toStringAsFixed(1);
                          return '0.0';
                        })(),
                        AppColors.warning,
                        Icons.star_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Transaction history
                  Text('Recent Transactions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
                  const SizedBox(height: 12),

                  if (_completedBookings.isEmpty)
                    _buildEmpty()
                  else
                    ..._completedBookings.take(20).map(_transactionItem),
                ],
              ),
            ),
    );
  }

  Widget _summaryCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: color.withAlpha(15),
          border: Border.all(color: color.withAlpha(40)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 10),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
          ],
        ),
      ),
    );
  }

  Widget _transactionItem(dynamic b) {
    final amount = ((double.tryParse(b['finalAmount']?.toString() ?? b['final_amount']?.toString() ?? '0') ?? 0) / 100).round().toString();
    final service = b['serviceName'] ?? b['service_name'] ?? 'Service';
    final customer = b['customerName'] ?? b['customer_name'] ?? 'Customer';
    String dateStr = '';
    try {
      final date = DateTime.parse(b['createdAt']?.toString() ?? b['created_at']?.toString() ?? '');
      dateStr = DateFormat('dd MMM yyyy').format(date);
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: AppColors.success.withAlpha(20),
            ),
            child: const Icon(Icons.arrow_downward_rounded, color: AppColors.success, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(service, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textOf(context))),
                Text(customer, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('+₹$amount', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.success, fontSize: 15)),
              Text(dateStr, style: TextStyle(fontSize: 11, color: AppColors.textMutedOf(context))),
            ],
          ),
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
            Icon(Icons.account_balance_wallet_outlined, size: 48, color: AppColors.textMutedOf(context)),
            const SizedBox(height: 12),
            Text('No earnings yet', style: TextStyle(color: AppColors.textSecondaryOf(context))),
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
        children: List.generate(6, (_) => Container(
          height: 70,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: AppColors.surfaceOf(context), borderRadius: BorderRadius.circular(14)),
        )),
      ),
    );
  }
}
