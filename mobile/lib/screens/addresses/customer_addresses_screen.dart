import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';
import 'dart:convert';
import 'dart:io';

class CustomerAddressesScreen extends StatefulWidget {
  const CustomerAddressesScreen({super.key});

  @override
  State<CustomerAddressesScreen> createState() => _CustomerAddressesScreenState();
}

class _CustomerAddressesScreenState extends State<CustomerAddressesScreen> {
  final _api = ApiService();
  List<dynamic> _addresses = [];
  bool _loading = true;
  bool _showForm = false;

  // Form
  final _labelCtrl = TextEditingController(text: 'Home');
  final _addressCtrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  bool _saving = false;
  String? _serviceabilityMsg;
  bool? _serviceable;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    _addressCtrl.dispose();
    _pincodeCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    try {
      final list = await _api.getAddresses();
      if (mounted) setState(() { _addresses = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fallbackIndiaPostLookup(String pincode) async {
    try {
      final url = Uri.parse('https://api.postalpincode.in/pincode/$pincode');
      final client = HttpClient();
      final req = await client.getUrl(url);
      final resp = await req.close();
      if (resp.statusCode == 200) {
        final body = await resp.transform(utf8.decoder).join();
        final data = jsonDecode(body);
        if (data is List && data.isNotEmpty) {
          final postOffices = data[0]['PostOffice'];
          if (postOffices is List && postOffices.isNotEmpty) {
            final po = postOffices[0];
            if (mounted) {
              setState(() {
                if (_stateCtrl.text.isEmpty && po['State'] != null) _stateCtrl.text = po['State'];
                if (_cityCtrl.text.isEmpty) _cityCtrl.text = po['District'] ?? po['Division'] ?? '';
              });
            }
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _checkPincode(String val) async {
    if (val.length != 6) {
      setState(() { _serviceable = null; _serviceabilityMsg = null; });
      return;
    }
    try {
      final res = await _api.checkServiceability(val);
      if (mounted) {
        final isServiceable = res['serviceable'] == true;
        setState(() {
          _serviceable = isServiceable;
          _serviceabilityMsg = isServiceable
              ? 'This area is serviceable!'
              : 'Not yet serviceable. You can save, but services may not be available.';
          if (isServiceable) {
            final stateName = res['state'] is Map ? res['state']['name'] : res['state'];
            final zoneName = res['zone'] is Map ? res['zone']['name'] : res['zone'];
            if (_stateCtrl.text.isEmpty && stateName != null) _stateCtrl.text = stateName.toString();
            if (_cityCtrl.text.isEmpty && zoneName != null) _cityCtrl.text = zoneName.toString();
          } else {
            // Fallback: try India Post API
            _fallbackIndiaPostLookup(val);
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() { _serviceable = null; _serviceabilityMsg = null; });
      _fallbackIndiaPostLookup(val);
    }
  }

  Future<void> _detectLocation() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission denied')),
        );
      }
      return;
    }
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 10)),
      );
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?lat=${pos.latitude}&lon=${pos.longitude}&format=json&addressdetails=1',
      );
      final client = HttpClient();
      final req = await client.getUrl(url);
      req.headers.set('Accept-Language', 'en');
      final resp = await req.close();
      if (resp.statusCode == 200) {
        final body = await resp.transform(utf8.decoder).join();
        final data = jsonDecode(body);
        final a = data['address'] ?? {};
        final parts = [a['road'], a['suburb'] ?? a['neighbourhood'], a['city'] ?? a['town'] ?? a['village'], a['state']].where((e) => e != null).toList();
        if (mounted) {
          setState(() {
            _addressCtrl.text = parts.join(', ');
            if (a['postcode'] != null) _pincodeCtrl.text = a['postcode'];
            if (a['state'] != null) _stateCtrl.text = a['state'];
            if (a['city'] != null || a['town'] != null) _cityCtrl.text = a['city'] ?? a['town'] ?? '';
          });
          _checkPincode(_pincodeCtrl.text);
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not detect location')),
        );
      }
    }
  }

  Future<void> _saveAddress() async {
    final address = _addressCtrl.text.trim();
    final pincode = _pincodeCtrl.text.trim();
    if (address.isEmpty) { _showError('Enter full address'); return; }
    if (pincode.length != 6) { _showError('Enter valid 6-digit pincode'); return; }

    setState(() => _saving = true);
    try {
      await _api.createAddress({
        'label': _labelCtrl.text.trim().isNotEmpty ? _labelCtrl.text.trim() : 'Home',
        'fullAddress': address,
        'pincode': pincode,
        if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
        if (_stateCtrl.text.trim().isNotEmpty) 'state': _stateCtrl.text.trim(),
      });
      _resetForm();
      _loadAddresses();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Address added!'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      _showError('Failed to save: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteAddress(String id) async {
    try {
      await _api.deleteAddress(id);
      setState(() => _addresses.removeWhere((a) => a['id'] == id));
    } catch (_) {
      _showError('Failed to delete');
    }
  }

  Future<void> _setDefault(String id) async {
    try {
      await _api.setDefaultAddress(id);
      setState(() {
        for (var a in _addresses) {
          a['isDefault'] = a['id'] == id;
        }
      });
    } catch (_) {
      _showError('Failed to update');
    }
  }

  void _resetForm() {
    _labelCtrl.text = 'Home';
    _addressCtrl.clear();
    _pincodeCtrl.clear();
    _cityCtrl.clear();
    _stateCtrl.clear();
    _serviceable = null;
    _serviceabilityMsg = null;
    _showForm = false;
    setState(() {});
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Addresses')),
      floatingActionButton: !_showForm && _addresses.length < 10
          ? FloatingActionButton(
              onPressed: () => setState(() => _showForm = true),
              child: const Icon(Icons.add),
            )
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_showForm) _buildForm(),
                if (_addresses.isEmpty && !_showForm)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      child: Column(
                        children: [
                          Icon(Icons.location_off, size: 48, color: AppColors.textMuted),
                          const SizedBox(height: 12),
                          const Text('No saved addresses', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          const Text('Add an address for quick booking', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                ..._addresses.map(_buildAddressCard),
              ],
            ),
    );
  }

  Widget _buildForm() {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('New Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),

            // Label chips
            Row(
              children: ['Home', 'Work', 'Other'].map((l) {
                final selected = _labelCtrl.text == l;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(l),
                    selected: selected,
                    onSelected: (_) => setState(() => _labelCtrl.text = l),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),

            // Detect location
            OutlinedButton.icon(
              onPressed: _detectLocation,
              icon: const Icon(Icons.my_location, size: 16),
              label: const Text('Detect My Location'),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _addressCtrl,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Full Address *',
                hintText: 'House no, street, area, landmark...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _pincodeCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    onChanged: _checkPincode,
                    decoration: InputDecoration(
                      labelText: 'Pincode *',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _cityCtrl,
                    decoration: InputDecoration(
                      labelText: 'City',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _stateCtrl,
              decoration: InputDecoration(
                labelText: 'State',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),

            // Serviceability indicator
            if (_serviceabilityMsg != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _serviceable == true
                      ? AppColors.success.withValues(alpha: 0.08)
                      : AppColors.warning.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _serviceable == true
                        ? AppColors.success.withValues(alpha: 0.3)
                        : AppColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _serviceable == true ? Icons.check_circle : Icons.warning_amber,
                      size: 16,
                      color: _serviceable == true ? AppColors.success : AppColors.warning,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _serviceabilityMsg!,
                        style: TextStyle(
                          fontSize: 12,
                          color: _serviceable == true ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _saving ? null : _saveAddress,
                    child: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Address'),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(onPressed: _resetForm, child: const Text('Cancel')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressCard(dynamic addr) {
    final isDefault = addr['isDefault'] == true;
    final label = addr['label'] ?? 'Address';
    final iconData = label == 'Home' ? Icons.home : label == 'Work' ? Icons.work : Icons.location_on;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: isDefault ? const BorderSide(color: AppColors.primary, width: 1.5) : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: isDefault ? AppColors.primary.withValues(alpha: 0.1) : AppColors.surfaceAlt,
              child: Icon(iconData, size: 18, color: isDefault ? AppColors.primary : AppColors.textSecondary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(width: 6),
                      if (isDefault)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('Default', style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w500)),
                        ),
                      const SizedBox(width: 6),
                      Text(addr['pincode'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    addr['fullAddress'] ?? '',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (addr['city'] != null || addr['state'] != null)
                    Text(
                      [addr['city'], addr['state']].where((e) => e != null).join(', '),
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                ],
              ),
            ),
            Column(
              children: [
                if (!isDefault)
                  IconButton(
                    icon: const Icon(Icons.star_border, size: 20),
                    tooltip: 'Set as default',
                    onPressed: () => _setDefault(addr['id']),
                  ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.error),
                  tooltip: 'Delete',
                  onPressed: () => _deleteAddress(addr['id']),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
