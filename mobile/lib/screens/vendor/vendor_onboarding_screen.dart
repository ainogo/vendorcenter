import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class VendorOnboardingScreen extends StatefulWidget {
  const VendorOnboardingScreen({super.key});

  @override
  State<VendorOnboardingScreen> createState() => _VendorOnboardingScreenState();
}

class _VendorOnboardingScreenState extends State<VendorOnboardingScreen> {
  final _api = ApiService();
  int _step = 0;
  bool _submitting = false;
  bool _detectingLocation = false;

  // Step 0: Business Details
  final _businessNameCtrl = TextEditingController();
  final List<String> _selectedCategories = [];
  final _customCategoryCtrl = TextEditingController();

  // Step 1: Location
  final _zoneCtrl = TextEditingController();
  final _radiusCtrl = TextEditingController(text: '10');
  double? _lat;
  double? _lng;

  // Step 2: Working Hours & Submit
  final _hoursCtrl = TextEditingController(text: '9:00 AM - 6:00 PM');

  static const _categories = [
    'Cleaning', 'Plumbing', 'Electrical', 'Painting',
    'Carpentry', 'Pest Control', 'AC Repair', 'Salon',
    'Appliance Repair', 'Moving', 'Photography', 'Catering',
  ];

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _customCategoryCtrl.dispose();
    _zoneCtrl.dispose();
    _radiusCtrl.dispose();
    _hoursCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    switch (_step) {
      case 0:
        return _businessNameCtrl.text.trim().length >= 2 && _selectedCategories.isNotEmpty;
      case 1:
        return _zoneCtrl.text.trim().length >= 2 && _lat != null && _lng != null;
      case 2:
        return _hoursCtrl.text.trim().length >= 3;
      default:
        return false;
    }
  }

  Future<void> _detectLocation() async {
    setState(() => _detectingLocation = true);
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied'), backgroundColor: AppColors.error),
          );
        }
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (mounted) {
        setState(() {
          _lat = pos.latitude;
          _lng = pos.longitude;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Location detected: ${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to get location: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await _api.submitVendorOnboarding({
        'businessName': _businessNameCtrl.text.trim(),
        'serviceCategories': _selectedCategories,
        'latitude': _lat ?? 0.0,
        'longitude': _lng ?? 0.0,
        'zone': _zoneCtrl.text.trim(),
        'serviceRadiusKm': double.tryParse(_radiusCtrl.text.trim()) ?? 10,
        'workingHours': _hoursCtrl.text.trim(),
      });
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            icon: const Icon(Icons.check_circle, color: AppColors.success, size: 48),
            title: const Text('Profile Submitted!'),
            content: const Text('Your profile is under review. You will be notified once approved.'),
            actions: [
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/dashboard');
                },
                child: const Text('Go to Dashboard'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  InputDecoration _inputDeco(String label, IconData icon, {String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon, size: 20),
      filled: true,
      fillColor: AppColors.surfaceAltOf(context),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.vendor, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Setup'),
        leading: _step > 0
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _step--))
            : null,
      ),
      body: Column(
        children: [
          // Step indicator
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
            child: Row(
              children: List.generate(3, (i) {
                final active = i <= _step;
                return Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i < 2 ? 8 : 0),
                    decoration: BoxDecoration(
                      color: active ? AppColors.vendor : AppColors.borderOf(context),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: [_buildStep0, _buildStep1, _buildStep2][_step](),
            ),
          ),

          // Bottom action
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: (_canProceed && !_submitting)
                      ? () {
                          if (_step < 2) {
                            setState(() => _step++);
                          } else {
                            _submit();
                          }
                        }
                      : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.vendor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          _step < 2 ? 'Continue' : 'Submit for Review',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep0() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Business Details', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
        const SizedBox(height: 6),
        Text('Tell us about your business', style: TextStyle(color: AppColors.textSecondaryOf(context))),
        const SizedBox(height: 24),

        TextField(
          controller: _businessNameCtrl,
          textCapitalization: TextCapitalization.words,
          onChanged: (_) => setState(() {}),
          decoration: _inputDeco('Business Name', Icons.store_outlined, hint: 'e.g. Sharma Electricals'),
        ),
        const SizedBox(height: 20),

        Text('Select Categories', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _categories.map((cat) {
            final selected = _selectedCategories.contains(cat);
            return FilterChip(
              label: Text(cat),
              selected: selected,
              selectedColor: AppColors.vendor.withValues(alpha: 0.15),
              checkmarkColor: AppColors.vendor,
              onSelected: (v) {
                setState(() {
                  if (v) {
                    _selectedCategories.add(cat);
                  } else {
                    _selectedCategories.remove(cat);
                  }
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        // Custom category
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _customCategoryCtrl,
                decoration: _inputDeco('Other Category', Icons.add_circle_outline),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () {
                final val = _customCategoryCtrl.text.trim();
                if (val.length >= 2 && !_selectedCategories.contains(val)) {
                  setState(() {
                    _selectedCategories.add(val);
                    _customCategoryCtrl.clear();
                  });
                }
              },
              icon: const Icon(Icons.add, color: AppColors.vendor),
              style: IconButton.styleFrom(backgroundColor: AppColors.vendor.withValues(alpha: 0.1)),
            ),
          ],
        ),
        if (_selectedCategories.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: _selectedCategories.map((c) => Chip(
              label: Text(c, style: const TextStyle(fontSize: 12)),
              deleteIcon: const Icon(Icons.close, size: 14),
              onDeleted: () => setState(() => _selectedCategories.remove(c)),
              visualDensity: VisualDensity.compact,
            )).toList(),
          ),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Service Location', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
        const SizedBox(height: 6),
        Text('Where do you provide services?', style: TextStyle(color: AppColors.textSecondaryOf(context))),
        const SizedBox(height: 24),

        TextField(
          controller: _zoneCtrl,
          onChanged: (_) => setState(() {}),
          decoration: _inputDeco('Zone / Area', Icons.location_on_outlined, hint: 'e.g. Latur, Maharashtra'),
        ),
        const SizedBox(height: 16),

        // Detect location button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _detectingLocation ? null : _detectLocation,
            icon: _detectingLocation
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.my_location, size: 18),
            label: Text(_detectingLocation ? 'Detecting...' : 'Detect My Location'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.vendor,
              side: const BorderSide(color: AppColors.vendor),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        if (_lat != null && _lng != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Location: ${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}',
                  style: const TextStyle(fontSize: 13, color: AppColors.success),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),

        TextField(
          controller: _radiusCtrl,
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
          decoration: _inputDeco('Service Radius (km)', Icons.radar_outlined, hint: 'e.g. 10'),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Working Hours', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
        const SizedBox(height: 6),
        Text('When are you available?', style: TextStyle(color: AppColors.textSecondaryOf(context))),
        const SizedBox(height: 24),

        TextField(
          controller: _hoursCtrl,
          onChanged: (_) => setState(() {}),
          decoration: _inputDeco('Working Hours', Icons.access_time_outlined, hint: 'e.g. 9:00 AM - 6:00 PM'),
        ),
        const SizedBox(height: 24),

        // Summary card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceAltOf(context),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderOf(context)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Review Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
              const SizedBox(height: 12),
              _summaryRow('Business', _businessNameCtrl.text),
              _summaryRow('Categories', _selectedCategories.join(', ')),
              _summaryRow('Zone', _zoneCtrl.text),
              _summaryRow('Radius', '${_radiusCtrl.text} km'),
              _summaryRow('Hours', _hoursCtrl.text),
              if (_lat != null) _summaryRow('Location', '${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Your profile will be reviewed by our team before it goes live.',
          style: TextStyle(fontSize: 13, color: AppColors.textMutedOf(context)),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: TextStyle(fontSize: 13, color: AppColors.textSecondaryOf(context))),
          ),
          Expanded(child: Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textOf(context)))),
        ],
      ),
    );
  }
}
