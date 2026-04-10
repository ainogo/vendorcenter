import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';

import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/services/api_service.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _api = ApiService();
  final _mapController = MapController();
  final _searchCtrl = TextEditingController();

  LatLng _center = const LatLng(19.0760, 72.8777); // Mumbai default
  LatLng? _userLocation; // Actual GPS position
  double _radius = 10;
  final double _zoom = 13;
  List<dynamic> _vendors = [];
  List<dynamic> _categories = [];
  String? _selectedCategory;
  bool _loading = true;
  bool _showList = false;
  String? _selectedVendorId;
  List<Map<String, dynamic>> _addressSuggestions = [];
  bool _showSuggestions = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _mapController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    if (query.trim().length < 3) {
      setState(() { _addressSuggestions = []; _showSuggestions = false; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () => _fetchAddressSuggestions(query.trim()));
  }

  Future<void> _fetchAddressSuggestions(String query) async {
    try {
      final dio = Dio();
      final resp = await dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': query,
          'format': 'json',
          'limit': '5',
          'countrycodes': 'in',
          'addressdetails': '1',
        },
        options: Options(headers: {'User-Agent': 'VendorCenter-Mobile/1.0'}),
      );
      if (resp.statusCode == 200 && mounted) {
        final List<dynamic> results = resp.data is List ? resp.data : [];
        setState(() {
          _addressSuggestions = results.map<Map<String, dynamic>>((r) => {
            'display_name': r['display_name'] ?? '',
            'lat': double.tryParse(r['lat']?.toString() ?? '') ?? 0.0,
            'lon': double.tryParse(r['lon']?.toString() ?? '') ?? 0.0,
          }).toList();
          _showSuggestions = _addressSuggestions.isNotEmpty;
        });
      }
    } catch (_) {}
  }

  void _selectAddress(Map<String, dynamic> addr) {
    final lat = addr['lat'] as double;
    final lon = addr['lon'] as double;
    setState(() {
      _center = LatLng(lat, lon);
      _showSuggestions = false;
      _searchCtrl.text = (addr['display_name'] as String).split(',').take(3).join(',');
    });
    _mapController.move(_center, 14);
    _loadVendors();
  }

  Future<void> _initLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _loadVendors();
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 10),
          ),
        );
        setState(() {
          _center = LatLng(position.latitude, position.longitude);
          _userLocation = _center;
        });
        _mapController.move(_center, _zoom);
      }
    } catch (_) {}

    _loadVendors();
  }

  Future<void> _loadVendors() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getNearbyVendors(
          lat: _center.latitude,
          lng: _center.longitude,
          radius: _radius,
          category: _selectedCategory,
        ),
        _api.getCategories(
          lat: _center.latitude,
          lng: _center.longitude,
          radius: _radius,
        ),
      ]);
      if (mounted) {
        setState(() {
          _vendors = results[0];
          _categories = results[1];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];

    // User GPS location — blue dot
    if (_userLocation != null) {
      markers.add(
        Marker(
          point: _userLocation!,
          width: 20,
          height: 20,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(180),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(color: AppColors.primary.withAlpha(60), blurRadius: 8),
              ],
            ),
          ),
        ),
      );
    }

    // Selected search center — red pin
    markers.add(
      Marker(
        point: _center,
        width: 40,
        height: 40,
        child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
      ),
    );

    // Vendor markers
    for (final vendor in _vendors) {
      final lat = _parseDouble(vendor['latitude'] ?? vendor['lat']);
      final lng = _parseDouble(vendor['longitude'] ?? vendor['lng']);
      if (lat == null || lng == null) continue;

      final vName = vendor['businessName'] ?? vendor['business_name'] ?? vendor['name'] ?? 'Vendor';
      final vRating = _parseDouble(vendor['averageRating'] ?? vendor['avg_rating'] ?? vendor['rating']) ?? 0;
      final vId = vendor['vendorId']?.toString() ?? vendor['id']?.toString() ?? vendor['vendor_id']?.toString();
      final isSelected = _selectedVendorId == vId;

      markers.add(
        Marker(
          point: LatLng(lat, lng),
          width: isSelected ? 160 : 42,
          height: isSelected ? 60 : 42,
          child: GestureDetector(
            onTap: () {
              setState(() {
                _selectedVendorId = _selectedVendorId == vId ? null : vId;
              });
            },
            child: isSelected
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: () {
                          if (vId != null) context.push('/vendor/$vId');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceOf(context),
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withAlpha(40), blurRadius: 8, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(vName, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.star, size: 11, color: AppColors.warning),
                              Text(vRating.toStringAsFixed(1), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
                            ],
                          ),
                        ),
                      ),
                      const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.vendor),
                    ],
                  )
                : Container(
                    decoration: BoxDecoration(
                      color: AppColors.vendor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.vendor.withAlpha(80),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.storefront, color: Colors.white, size: 18),
                  ),
          ),
        ),
      );
    }

    return markers;
  }

  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  String? _formatDistance(dynamic value) {
    final d = _parseDouble(value);
    if (d == null) return null;
    return d.toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: _zoom,
              onTap: (tapPos, latLng) {
                setState(() => _center = latLng);
                _loadVendors();
              },
              onPositionChanged: (pos, hasGesture) {
                if (hasGesture) {
                  _center = pos.center;
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.vendorcenter.customer',
              ),
              MarkerLayer(markers: _buildMarkers()),
            ],
          ),

          // Top overlay — search + back
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search bar
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceOf(context),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(20),
                          blurRadius: 12,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: Icon(Icons.arrow_back,
                              color: AppColors.textOf(context)),
                          onPressed: () => context.pop(),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _searchCtrl,
                            decoration: InputDecoration(
                              hintText: 'Search location or address...',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              filled: false,
                              contentPadding: const EdgeInsets.symmetric(vertical: 14),
                              suffixIcon: _searchCtrl.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18),
                                      onPressed: () {
                                        _searchCtrl.clear();
                                        setState(() { _addressSuggestions = []; _showSuggestions = false; });
                                      },
                                    )
                                  : null,
                            ),
                            onChanged: _onSearchChanged,
                            onSubmitted: (_) {
                              setState(() => _showSuggestions = false);
                              _loadVendors();
                            },
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.tune, color: AppColors.primary),
                          onPressed: _showFilterSheet,
                        ),
                      ],
                    ),
                  ),

                  // Address suggestions overlay
                  if (_showSuggestions && _addressSuggestions.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceOf(context),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(20),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: _addressSuggestions.map((addr) {
                          final name = addr['display_name'] as String;
                          final parts = name.split(',');
                          final title = parts.take(2).join(',').trim();
                          final subtitle = parts.skip(2).take(3).join(',').trim();
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                            title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: subtitle.isNotEmpty ? Text(subtitle, style: TextStyle(fontSize: 12, color: AppColors.textSecondaryOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis) : null,
                            onTap: () => _selectAddress(addr),
                          );
                        }).toList(),
                      ),
                    ),

                  const SizedBox(height: 10),

                  // Category chips
                  if (_categories.isNotEmpty)
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length + 1,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          if (i == 0) {
                            return _buildChip('All', _selectedCategory == null, () {
                              setState(() => _selectedCategory = null);
                              _loadVendors();
                            });
                          }
                          final cat = _categories[i - 1];
                          final name = cat['cat'] ?? '';
                          return _buildChip(
                            name,
                            _selectedCategory == name,
                            () {
                              setState(() => _selectedCategory = name);
                              _loadVendors();
                            },
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Bottom panel — vendor count + list toggle
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomPanel(),
          ),

          // Loading indicator
          if (_loading)
            Positioned(
              top: 120,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceOf(context),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(15),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: _showList ? 320 : 100),
        child: FloatingActionButton.small(
          onPressed: () {
            _initLocation();
          },
          backgroundColor: AppColors.surfaceOf(context),
          child: Icon(Icons.my_location, color: AppColors.primary, size: 20),
        ),
      ),
    );
  }

  Widget _buildChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textOf(context),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomPanel() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      height: _showList ? 380 : 110,
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(25),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Handle
          GestureDetector(
            onTap: () => setState(() => _showList = !_showList),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.borderOf(context),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _loading
                              ? 'Searching...'
                              : '${_vendors.length} vendors nearby',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textOf(context),
                          ),
                        ),
                        Icon(
                          _showList
                              ? Icons.keyboard_arrow_down
                              : Icons.keyboard_arrow_up,
                          color: AppColors.textSecondaryOf(context),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Vendor list
          if (_showList)
            Expanded(
              child: _vendors.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.search_off,
                              size: 48,
                              color: AppColors.textMutedOf(context)),
                          const SizedBox(height: 8),
                          Text(
                            'No vendors found in this area',
                            style: TextStyle(
                              color: AppColors.textSecondaryOf(context),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                      itemCount: _vendors.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final v = _vendors[i];
                        return _VendorTile(
                          name: v['businessName'] ?? v['business_name'] ?? v['name'] ?? 'Vendor',
                          category: v['primary_category'] ??
                              (v['serviceCategories'] is List &&
                                      (v['serviceCategories'] as List).isNotEmpty
                                  ? v['serviceCategories'][0]
                                  : (v['categories'] is List &&
                                          (v['categories'] as List).isNotEmpty
                                      ? v['categories'][0]
                                      : '')),
                          rating: _parseDouble(v['averageRating'] ?? v['avg_rating'] ?? v['rating']) ?? 0,
                          distance: _formatDistance(v['distanceKm'] ?? v['distance']),
                          onTap: () {
                            final id = v['vendorId']?.toString() ??
                                v['id']?.toString() ??
                                v['vendor_id']?.toString();
                            if (id != null) context.push('/vendor/$id');
                          },
                        );
                      },
                    ),
            ),
        ],
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceOf(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Search Radius',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textOf(context),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_radius.toInt()} km',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondaryOf(context),
                ),
              ),
              Slider(
                value: _radius,
                min: 1,
                max: 50,
                divisions: 49,
                activeColor: AppColors.primary,
                label: '${_radius.toInt()} km',
                onChanged: (v) {
                  setSheetState(() => _radius = v);
                },
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {});
                    Navigator.pop(ctx);
                    _loadVendors();
                  },
                  child: const Text('Apply'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VendorTile extends StatelessWidget {
  final String name;
  final String category;
  final double rating;
  final String? distance;
  final VoidCallback onTap;

  const _VendorTile({
    required this.name,
    required this.category,
    required this.rating,
    this.distance,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      onTap: onTap,
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.vendor.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.storefront, color: AppColors.vendor, size: 22),
      ),
      title: Text(
        name,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        category,
        style: TextStyle(
          fontSize: 13,
          color: AppColors.textSecondaryOf(context),
        ),
      ),
      trailing: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.star, size: 14, color: AppColors.warning),
              const SizedBox(width: 2),
              Text(
                rating.toStringAsFixed(1),
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          if (distance != null)
            Text(
              '$distance km',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textMutedOf(context),
              ),
            ),
        ],
      ),
    );
  }
}
