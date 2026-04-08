import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vendorcenter/config/theme.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  static const supportEmail = 'support@vendorcenter.in';
  static const supportPhone = '+91-9898908989';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.gradientStart, AppColors.gradientEnd],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                const Icon(Icons.support_agent, size: 48, color: Colors.white),
                const SizedBox(height: 12),
                const Text('How can we help?',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 6),
                Text('We\'re here to assist you',
                    style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.85))),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Contact options
          _contactTile(
            context,
            icon: Icons.email_outlined,
            title: 'Email Support',
            subtitle: supportEmail,
            onTap: () => _launchEmail(),
            onLongPress: () => _copyToClipboard(context, supportEmail),
          ),
          _contactTile(
            context,
            icon: Icons.phone_outlined,
            title: 'Call Support',
            subtitle: supportPhone,
            onTap: () => _launchPhone(),
            onLongPress: () => _copyToClipboard(context, supportPhone),
          ),
          const SizedBox(height: 24),

          // FAQ section
          Text('Frequently Asked Questions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
          const SizedBox(height: 12),
          _faqItem(context, 'How do I book a service?',
              'Search for vendors by category or location, select a vendor, choose a service, and confirm your booking with a preferred date and time.'),
          _faqItem(context, 'How do I cancel a booking?',
              'Go to Bookings → select the booking → tap Cancel. Cancellation policies may vary by vendor.'),
          _faqItem(context, 'How do payments work?',
              'Payments are processed securely through our platform. You can pay after your booking is confirmed by the vendor.'),
          _faqItem(context, 'How do I leave a review?',
              'After a service is completed, go to Bookings → select the completed booking → tap "Write a Review".'),
          _faqItem(context, 'How do I become a vendor?',
              'Download the VendorCenter Vendor app, register with your business details, and once approved, you can start receiving bookings.'),
        ],
      ),
    );
  }

  Widget _contactTile(BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    VoidCallback? onLongPress,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(color: AppColors.textSecondaryOf(context), fontSize: 13)),
        trailing: Icon(Icons.chevron_right, color: AppColors.textMutedOf(context)),
        onTap: onTap,
        onLongPress: onLongPress,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Widget _faqItem(BuildContext context, String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: ExpansionTile(
        title: Text(question, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        children: [
          Text(answer, style: TextStyle(color: AppColors.textSecondaryOf(context), fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }

  Future<void> _launchEmail() async {
    final uri = Uri(scheme: 'mailto', path: supportEmail, queryParameters: {'subject': 'VendorCenter Support'});
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        throw Exception('Could not launch email');
      }
    } catch (_) {
      // Copy to clipboard as fallback
      Clipboard.setData(ClipboardData(text: supportEmail));
    }
  }

  Future<void> _launchPhone() async {
    final cleanPhone = supportPhone.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        throw Exception('Could not launch dialer');
      }
    } catch (_) {
      // Copy to clipboard as fallback
      Clipboard.setData(ClipboardData(text: supportPhone));
    }
  }

  void _copyToClipboard(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Copied: $text'), duration: const Duration(seconds: 2)),
    );
  }
}
