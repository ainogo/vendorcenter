import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';
import 'package:vendorcenter/services/auth_service.dart';
import 'package:vendorcenter/services/localization_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = ApiService();
  List<dynamic> _notifications = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthService>();
    if (!auth.isLoggedIn) {
      if (mounted) setState(() { _loading = false; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getNotifications();
      if (mounted) setState(() { _notifications = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = 'Could not load notifications'; _loading = false; });
    }
  }

  IconData _iconFor(String? category) {
    switch (category) {
      case 'booking': return Icons.calendar_today_rounded;
      case 'payment': return Icons.payment_rounded;
      case 'review': return Icons.star_rounded;
      case 'system': return Icons.info_rounded;
      case 'promotion': return Icons.local_offer_rounded;
      default: return Icons.notifications_rounded;
    }
  }

  Color _colorFor(String? category) {
    switch (category) {
      case 'booking': return Colors.blue;
      case 'payment': return Colors.green;
      case 'review': return Colors.amber.shade700;
      case 'system': return Colors.grey;
      case 'promotion': return Colors.purple;
      default: return AppColors.primary;
    }
  }

  String _timeAgo(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return DateFormat('MMM d').format(dt);
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('notif.title'))),
      body: !auth.isLoggedIn
          ? _buildLoginPrompt()
          : _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? _buildErrorState()
                  : _notifications.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: _notifications.length,
                            separatorBuilder: (_, __) => Divider(height: 1, color: AppColors.borderOf(context)),
                            itemBuilder: (context, i) => _buildNotificationTile(_notifications[i], isDark, i),
                          ),
                        ),
    );
  }

  Widget _buildNotificationTile(dynamic n, bool isDark, int index) {
    final title = n['title']?.toString() ?? 'Notification';
    final message = n['message']?.toString() ?? '';
    final category = n['category']?.toString();
    final readAt = n['readAt'];
    final createdAt = n['createdAt']?.toString();
    final isUnread = readAt == null;
    final iconColor = _colorFor(category);

    return ListTile(
      leading: Container(
        width: 42, height: 42,
        decoration: BoxDecoration(
          color: iconColor.withAlpha(isDark ? 30 : 20),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(_iconFor(category), size: 22, color: iconColor),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isUnread ? FontWeight.w700 : FontWeight.w500,
          fontSize: 14,
          color: AppColors.textOf(context),
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (message.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                message,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondaryOf(context), height: 1.3),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _timeAgo(createdAt),
              style: TextStyle(fontSize: 11, color: AppColors.textMutedOf(context)),
            ),
          ),
        ],
      ),
      trailing: isUnread
          ? Container(
              width: 8, height: 8,
              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
            )
          : null,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    );
  }

  Widget _buildLoginPrompt() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withAlpha(20),
            ),
            child: Icon(Icons.lock_outline_rounded, size: 48, color: AppColors.primary.withAlpha(120)),
          ),
          const SizedBox(height: 20),
          Text('Login Required', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Sign in to view your notifications.',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondaryOf(context), height: 1.4),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => GoRouter.of(context).go('/login'),
            icon: const Icon(Icons.login_rounded, size: 18),
            label: const Text('Sign In'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withAlpha(20),
            ),
            child: Icon(Icons.notifications_none_rounded, size: 48, color: AppColors.primary.withAlpha(120)),
          ),
          const SizedBox(height: 20),
          Text(context.tr('notif.empty'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'We\'ll notify you about booking updates, offers, and important alerts.',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondaryOf(context), height: 1.4),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: AppColors.textMutedOf(context)),
          const SizedBox(height: 12),
          Text(_error ?? context.tr('common.error'), style: TextStyle(fontSize: 16, color: AppColors.textSecondaryOf(context))),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: Text(context.tr('common.retry')),
          ),
        ],
      ),
    );
  }
}
