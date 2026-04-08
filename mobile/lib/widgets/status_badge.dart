import 'package:flutter/material.dart';
import 'package:vendorcenter/config/theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final lower = status.toLowerCase();
    final (Color bg, Color fg, String label) = switch (lower) {
      'pending' => (Colors.orange.shade50, Colors.orange.shade700, 'Pending'),
      'confirmed' => (Colors.blue.shade50, Colors.blue.shade700, 'Confirmed'),
      'in_progress' => (AppColors.primary.withValues(alpha: 0.1), AppColors.primary, 'In Progress'),
      'completed' => (Colors.green.shade50, Colors.green.shade700, 'Completed'),
      'cancelled' => (Colors.red.shade50, Colors.red.shade700, 'Cancelled'),
      'rejected' => (Colors.red.shade50, Colors.red.shade700, 'Rejected'),
      'paid' => (Colors.green.shade50, Colors.green.shade700, 'Paid'),
      _ => (Colors.grey.shade100, Colors.grey.shade700, status),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}
