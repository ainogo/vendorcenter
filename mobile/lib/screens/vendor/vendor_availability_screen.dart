import 'package:flutter/material.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class VendorAvailabilityScreen extends StatefulWidget {
  const VendorAvailabilityScreen({super.key});

  @override
  State<VendorAvailabilityScreen> createState() => _VendorAvailabilityScreenState();
}

class _VendorAvailabilityScreenState extends State<VendorAvailabilityScreen> {
  final _api = ApiService();
  bool _loading = true;
  bool _saving = false;

  // Weekly schedule: dayOfWeek (0=Sun..6=Sat) → {enabled, startTime, endTime}
  final List<_DaySchedule> _schedule = List.generate(7, (i) => _DaySchedule(dayOfWeek: i));
  final List<_BlockedDate> _blockedDates = [];

  static const _dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  @override
  void initState() {
    super.initState();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getVendorAvailability();
      final slots = data['slots'] as List? ?? [];
      final blocked = data['blockedDates'] as List? ?? [];

      // Reset all
      for (final d in _schedule) {
        d.enabled = false;
        d.startTime = const TimeOfDay(hour: 9, minute: 0);
        d.endTime = const TimeOfDay(hour: 18, minute: 0);
      }

      for (final s in slots) {
        final dow = s['dayOfWeek'] as int;
        if (dow >= 0 && dow < 7) {
          _schedule[dow].enabled = true;
          _schedule[dow].startTime = _parseTime(s['startTime'] ?? '09:00');
          _schedule[dow].endTime = _parseTime(s['endTime'] ?? '18:00');
        }
      }

      _blockedDates.clear();
      for (final b in blocked) {
        _blockedDates.add(_BlockedDate(
          date: DateTime.parse(b['blockedDate']),
          reason: b['reason'] ?? '',
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load availability: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  TimeOfDay _parseTime(String t) {
    final parts = t.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _formatTimeDisplay(TimeOfDay t) => t.format(context);

  Future<void> _saveSchedule() async {
    setState(() => _saving = true);
    try {
      final slots = <Map<String, dynamic>>[];
      for (final d in _schedule) {
        if (d.enabled) {
          slots.add({
            'dayOfWeek': d.dayOfWeek,
            'startTime': _formatTime(d.startTime),
            'endTime': _formatTime(d.endTime),
          });
        }
      }
      await _api.setVendorAvailability(slots);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Schedule saved'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e'), backgroundColor: AppColors.error),
        );
      }
    }
    if (mounted) setState(() => _saving = false);
  }

  Future<void> _pickTime(int dayIndex, bool isStart) async {
    final current = isStart ? _schedule[dayIndex].startTime : _schedule[dayIndex].endTime;
    final picked = await showTimePicker(context: context, initialTime: current);
    if (picked != null) {
      setState(() {
        if (isStart) {
          _schedule[dayIndex].startTime = picked;
        } else {
          _schedule[dayIndex].endTime = picked;
        }
      });
    }
  }

  Future<void> _addBlockedDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null) return;

    String? reason;
    if (mounted) {
      reason = await showDialog<String>(
        context: context,
        builder: (ctx) {
          final ctrl = TextEditingController();
          return AlertDialog(
            title: const Text('Block Date'),
            content: TextField(
              controller: ctrl,
              decoration: const InputDecoration(
                hintText: 'Reason (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, ctrl.text),
                child: const Text('Block'),
              ),
            ],
          );
        },
      );
      if (reason == null) return;
    }

    try {
      final dateStr = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      await _api.addBlockedDate(dateStr, reason: (reason != null && reason.isNotEmpty) ? reason : null);
      _blockedDates.add(_BlockedDate(date: picked, reason: reason ?? ''));
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _removeBlockedDate(int index) async {
    final bd = _blockedDates[index];
    final dateStr = '${bd.date.year}-${bd.date.month.toString().padLeft(2, '0')}-${bd.date.day.toString().padLeft(2, '0')}';
    try {
      await _api.removeBlockedDate(dateStr);
      setState(() => _blockedDates.removeAt(index));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        title: const Text('Availability'),
        actions: [
          if (!_loading)
            TextButton.icon(
              onPressed: _saving ? null : _saveSchedule,
              icon: _saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save_rounded),
              label: const Text('Save'),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Weekly Schedule Section
                Text('Weekly Schedule', style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600, color: AppColors.textOf(context),
                )),
                const SizedBox(height: 8),
                ...List.generate(7, (i) => _buildDayTile(i, isDark)),
                const SizedBox(height: 24),

                // Blocked Dates Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Blocked Dates', style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600, color: AppColors.textOf(context),
                    )),
                    IconButton.filledTonal(
                      onPressed: _addBlockedDate,
                      icon: const Icon(Icons.add_rounded, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_blockedDates.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceOf(context),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.border),
                    ),
                    child: Center(
                      child: Text(
                        'No blocked dates',
                        style: TextStyle(color: AppColors.textMutedOf(context)),
                      ),
                    ),
                  )
                else
                  ...List.generate(_blockedDates.length, (i) => _buildBlockedDateTile(i, isDark)),
              ],
            ),
    );
  }

  Widget _buildDayTile(int index, bool isDark) {
    final d = _schedule[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: d.enabled
              ? AppColors.primary.withValues(alpha: 0.3)
              : (isDark ? AppColors.darkBorder : AppColors.border),
        ),
      ),
      child: Row(
        children: [
          Switch.adaptive(
            value: d.enabled,
            activeTrackColor: AppColors.primary.withValues(alpha: 0.5),
            activeThumbColor: AppColors.primary,
            onChanged: (v) => setState(() => d.enabled = v),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 80,
            child: Text(
              _dayNames[index],
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: d.enabled ? AppColors.textOf(context) : AppColors.textMutedOf(context),
              ),
            ),
          ),
          if (d.enabled) ...[
            const Spacer(),
            InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => _pickTime(index, true),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceAltOf(context),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _formatTimeDisplay(d.startTime),
                  style: TextStyle(fontSize: 13, color: AppColors.textOf(context)),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text('–', style: TextStyle(color: AppColors.textMutedOf(context))),
            ),
            InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => _pickTime(index, false),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceAltOf(context),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _formatTimeDisplay(d.endTime),
                  style: TextStyle(fontSize: 13, color: AppColors.textOf(context)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBlockedDateTile(int index, bool isDark) {
    final bd = _blockedDates[index];
    final months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '${bd.date.day}',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.error),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${months[bd.date.month]} ${bd.date.day}, ${bd.date.year}',
                style: TextStyle(fontWeight: FontWeight.w500, color: AppColors.textOf(context)),
              ),
              if (bd.reason.isNotEmpty)
                Text(bd.reason, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context))),
            ],
          )),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.error),
            onPressed: () => _removeBlockedDate(index),
          ),
        ],
      ),
    );
  }
}

class _DaySchedule {
  final int dayOfWeek;
  bool enabled;
  TimeOfDay startTime;
  TimeOfDay endTime;

  _DaySchedule({
    required this.dayOfWeek,
    // ignore: unused_element_parameter
    this.enabled = false,
    // ignore: unused_element_parameter
    this.startTime = const TimeOfDay(hour: 9, minute: 0),
    // ignore: unused_element_parameter
    this.endTime = const TimeOfDay(hour: 18, minute: 0),
  });
}

class _BlockedDate {
  final DateTime date;
  final String reason;
  _BlockedDate({required this.date, this.reason = ''});
}
