import 'package:flutter/material.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/widgets/status_badge.dart';

class BookingCard extends StatelessWidget {
  final Map<String, dynamic> booking;
  final VoidCallback? onTap;

  const BookingCard({super.key, required this.booking, this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = (booking['status'] ?? 'pending').toString();
    final vendorName = booking['vendor_business_name'] ?? booking['vendor_name'] ?? 'Vendor';
    final serviceName = booking['service_name'] ?? 'Service';
    final amount = booking['total_amount']?.toString() ?? '0';
    final date = booking['preferred_date']?.toString() ?? '';
    final time = booking['preferred_time']?.toString() ?? '';

    String displayDate = date;
    try {
      if (date.isNotEmpty) {
        final d = DateTime.parse(date);
        displayDate = '${d.day}/${d.month}/${d.year}';
      }
    } catch (_) {}

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderOf(context)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(serviceName, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 6),
            Text(vendorName, style: TextStyle(fontSize: 13, color: AppColors.textSecondaryOf(context))),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 13, color: AppColors.textMutedOf(context)),
                const SizedBox(width: 4),
                Text(displayDate, style: TextStyle(fontSize: 12, color: AppColors.textMutedOf(context))),
                if (time.isNotEmpty) ...[
                  const SizedBox(width: 12),
                  Icon(Icons.access_time, size: 13, color: AppColors.textMutedOf(context)),
                  const SizedBox(width: 4),
                  Text(time, style: TextStyle(fontSize: 12, color: AppColors.textMutedOf(context))),
                ],
                const Spacer(),
                Text('₹$amount', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
