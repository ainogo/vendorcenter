import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:geolocator/geolocator.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  final _api = ApiService();

  final List<_ChatMessage> _messages = [];
  List<String> _suggestions = [];
  String? _conversationId;
  bool _sending = false;
  double? _lat;
  double? _lng;

  String get _lang {
    final locale = ui.PlatformDispatcher.instance.locale.languageCode;
    return locale.isNotEmpty ? locale : 'en';
  }

  @override
  void initState() {
    super.initState();
    _loadSuggestions();
    _loadLocation();
    _addBotMessage(
      'Hi! I\'m your VendorCenter assistant. I can help you find services, '
      'book vendors, check your bookings, and answer questions.',
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      );
      _lat = pos.latitude;
      _lng = pos.longitude;
    } catch (_) {
      // Location optional — chatbot works without it
    }
  }

  Future<void> _loadSuggestions() async {
    try {
      final suggestions = await _api.getAiSuggestions(lang: _lang);
      if (mounted) setState(() => _suggestions = suggestions);
    } catch (_) {}
  }

  void _addBotMessage(String text, {List<dynamic>? vendors, String? action, String? provider, String? navigateTo}) {
    _messages.add(_ChatMessage(
      text: text,
      isUser: false,
      time: DateTime.now(),
      vendors: vendors,
      action: action,
      provider: provider,
      navigateTo: navigateTo,
    ));
  }

  Future<void> _send(String text) async {
    if (text.trim().isEmpty || _sending) return;

    final userMsg = text.trim();
    _controller.clear();
    setState(() {
      _messages.add(_ChatMessage(text: userMsg, isUser: true, time: DateTime.now()));
      _sending = true;
    });
    _scrollToBottom();

    try {
      final data = await _api.queryAiAssistant(
        message: userMsg,
        conversationId: _conversationId,
        lang: _lang,
        lat: _lat,
        lng: _lng,
        currentPage: '/chat',
      );

      _conversationId = data['conversationId']?.toString();
      final message = data['message']?.toString() ?? 'I couldn\'t process that. Please try again.';
      final vendors = data['vendors'] as List<dynamic>?;
      final action = data['action']?.toString();
      final provider = data['provider']?.toString();
      final navigateTo = data['navigateTo']?.toString();
      final followUp = data['followUp']?.toString();

      if (mounted) {
        setState(() {
          _addBotMessage(message, vendors: vendors, action: action, provider: provider, navigateTo: navigateTo);
          if (followUp != null && followUp.isNotEmpty) {
            _addBotMessage(followUp);
          }
          _sending = false;
        });
      }

      // Handle NAVIGATE action
      if (action == 'NAVIGATE' && navigateTo != null && navigateTo.isNotEmpty && mounted) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) context.push(navigateTo);
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _addBotMessage('Sorry, I\'m having trouble connecting. Please try again.');
          _sending = false;
        });
      }
    }
    _scrollToBottom();
  }

  void _clearChat() async {
    final oldId = _conversationId;
    setState(() {
      _messages.clear();
      _conversationId = null;
      _addBotMessage('Chat cleared. How can I help you?');
    });
    try { await _api.clearAiConversation(oldId); } catch (_) {}
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.primary, AppColors.accent]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.smart_toy_outlined, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('VendorCenter Assistant', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                Text(
                  'Always here to help',
                  style: TextStyle(fontSize: 10, color: AppColors.textMutedOf(context)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Clear chat',
            onPressed: _clearChat,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i == _messages.length && _sending) return _buildTypingIndicator();
                      return _buildMessageBubble(_messages[i], isDark);
                    },
                  ),
          ),

          // Suggestion chips — show when conversation is fresh
          if (_suggestions.isNotEmpty && _messages.length <= 2)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _suggestions.take(4).map((s) => ActionChip(
                  label: Text(s, style: const TextStyle(fontSize: 12)),
                  onPressed: () => _send(s),
                  backgroundColor: AppColors.primary.withAlpha(isDark ? 30 : 18),
                  side: BorderSide(color: AppColors.primary.withAlpha(isDark ? 60 : 40)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                )).toList(),
              ),
            ),

          // Input bar
          Container(
            padding: EdgeInsets.fromLTRB(12, 8, 8, MediaQuery.of(context).padding.bottom + 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceOf(context),
              border: Border(top: BorderSide(color: AppColors.borderOf(context))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    textInputAction: TextInputAction.send,
                    onSubmitted: _send,
                    maxLines: 3,
                    minLines: 1,
                    decoration: InputDecoration(
                      hintText: 'Ask me anything...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: AppColors.borderOf(context)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: AppColors.borderOf(context)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      filled: true,
                      fillColor: isDark ? AppColors.darkSurfaceAlt : AppColors.surfaceAlt,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: [AppColors.primary, AppColors.gradientEnd]),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: _sending
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    onPressed: _sending ? null : () => _send(_controller.text),
                  ),
                ),
              ],
            ),
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
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary.withAlpha(25), AppColors.accent.withAlpha(25)],
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.smart_toy_outlined, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text('VendorCenter AI', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Text('Ask about services, vendors, bookings...',
              style: TextStyle(color: AppColors.textSecondaryOf(context))),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(_ChatMessage msg, bool isDark) {
    return Column(
      crossAxisAlignment: msg.isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        // Text bubble
        Align(
          alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
            margin: EdgeInsets.only(
              bottom: (msg.vendors != null && msg.vendors!.isNotEmpty) ? 4 : 8,
              left: msg.isUser ? 48 : 0,
              right: msg.isUser ? 0 : 48,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: msg.isUser
                  ? AppColors.primary
                  : isDark ? AppColors.darkSurfaceAlt : AppColors.surfaceAlt,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: Radius.circular(msg.isUser ? 18 : 4),
                bottomRight: Radius.circular(msg.isUser ? 4 : 18),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(isDark ? 15 : 8),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              msg.text,
              style: TextStyle(
                color: msg.isUser ? Colors.white : AppColors.textOf(context),
                fontSize: 14,
                height: 1.45,
              ),
            ),
          ),
        ),

        // Vendor cards from AI response
        if (msg.vendors != null && msg.vendors!.isNotEmpty)
          Container(
            height: 130,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(right: 48),
              itemCount: msg.vendors!.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) => _buildVendorChip(msg.vendors![i], isDark),
            ),
          ),
      ],
    );
  }

  Widget _buildVendorChip(dynamic v, bool isDark) {
    final name = v['name']?.toString() ?? v['businessName']?.toString() ?? 'Vendor';
    final rating = v['rating']?.toString() ?? '';
    final categories = v['categories'] as List<dynamic>?;
    final category = (categories != null && categories.isNotEmpty) ? categories.first.toString() : '';
    final id = v['vendorId']?.toString() ?? v['id']?.toString();
    final priceRange = v['price_range']?.toString() ?? v['priceRange']?.toString() ?? '';
    final distance = v['distance']?.toString() ?? '';

    return GestureDetector(
      onTap: id != null ? () => context.push('/vendor/$id') : null,
      child: Container(
        width: 200,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderOf(context)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(20),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'V',
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                      if (category.isNotEmpty)
                        Text(category, style: TextStyle(fontSize: 10, color: AppColors.textMutedOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
            const Spacer(),
            if (distance.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 12, color: AppColors.textMutedOf(context)),
                    const SizedBox(width: 2),
                    Text(distance, style: TextStyle(fontSize: 11, color: AppColors.textSecondaryOf(context))),
                  ],
                ),
              ),
            Row(
              children: [
                if (rating.isNotEmpty) ...[
                  const Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                  const SizedBox(width: 3),
                  Expanded(child: Text(rating, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis)),
                ],
                if (priceRange.isNotEmpty) ...[
                  const Spacer(),
                  Text(priceRange, style: TextStyle(fontSize: 11, color: AppColors.textSecondaryOf(context))),
                ],
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              height: 28,
              child: FilledButton(
                onPressed: id != null ? () => context.push('/vendor/$id') : null,
                style: FilledButton.styleFrom(
                  padding: EdgeInsets.zero,
                  textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                ),
                child: const Text('View'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8, right: 48),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.isDark(context) ? AppColors.darkSurfaceAlt : AppColors.surfaceAlt,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
            bottomLeft: Radius.circular(4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) => Container(
            width: 8, height: 8,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            decoration: BoxDecoration(
              color: AppColors.textMutedOf(context),
              shape: BoxShape.circle,
            ),
          )),
        ),
      ),
    );
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  final DateTime time;
  final List<dynamic>? vendors;
  final String? action;
  final String? provider;
  final String? navigateTo;

  _ChatMessage({
    required this.text,
    required this.isUser,
    required this.time,
    this.vendors,
    this.action,
    this.provider,
    this.navigateTo,
  });
}
