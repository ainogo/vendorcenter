import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SavedAddress {
  final String label;
  final String address;
  final double lat;
  final double lng;

  SavedAddress({required this.label, required this.address, required this.lat, required this.lng});

  Map<String, dynamic> toJson() => {'label': label, 'address': address, 'lat': lat, 'lng': lng};
  factory SavedAddress.fromJson(Map<String, dynamic> json) => SavedAddress(
    label: json['label'] ?? '',
    address: json['address'] ?? '',
    lat: (json['lat'] ?? 0).toDouble(),
    lng: (json['lng'] ?? 0).toDouble(),
  );
}

class LocationService extends ChangeNotifier {
  static const _locationKey = 'vc_saved_location';
  static const _addressesKey = 'vc_saved_addresses';

  double? _lat;
  double? _lng;
  String _locationLabel = 'Select Location';
  bool _loading = false;
  List<SavedAddress> _savedAddresses = [];

  double? get lat => _lat;
  double? get lng => _lng;
  String get locationLabel => _locationLabel;
  bool get loading => _loading;
  bool get hasLocation => _lat != null && _lng != null;
  List<SavedAddress> get savedAddresses => List.unmodifiable(_savedAddresses);

  LocationService() {
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final locJson = prefs.getString(_locationKey);
    if (locJson != null) {
      final data = jsonDecode(locJson);
      _lat = (data['lat'] as num?)?.toDouble();
      _lng = (data['lng'] as num?)?.toDouble();
      _locationLabel = data['label'] ?? 'Saved Location';
      notifyListeners();
    }
    final addrJson = prefs.getString(_addressesKey);
    if (addrJson != null) {
      final list = jsonDecode(addrJson) as List;
      _savedAddresses = list.map((e) => SavedAddress.fromJson(e)).toList();
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (_lat != null && _lng != null) {
      await prefs.setString(_locationKey, jsonEncode({'lat': _lat, 'lng': _lng, 'label': _locationLabel}));
    }
    await prefs.setString(_addressesKey, jsonEncode(_savedAddresses.map((a) => a.toJson()).toList()));
  }

  void setLocation(double lat, double lng, String label) {
    _lat = lat;
    _lng = lng;
    _locationLabel = label;
    _persist();
    notifyListeners();
  }

  Future<bool> useCurrentLocation() async {
    _loading = true;
    notifyListeners();
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        _loading = false;
        notifyListeners();
        return false;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 10)),
      );
      _lat = pos.latitude;
      _lng = pos.longitude;
      _locationLabel = 'Current Location';
      _loading = false;
      _persist();
      notifyListeners();
      return true;
    } catch (_) {
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  void addSavedAddress(SavedAddress address) {
    // Prevent duplicates
    _savedAddresses.removeWhere((a) => a.label == address.label);
    _savedAddresses.insert(0, address);
    if (_savedAddresses.length > 5) _savedAddresses = _savedAddresses.sublist(0, 5);
    _persist();
    notifyListeners();
  }

  void removeSavedAddress(int index) {
    if (index >= 0 && index < _savedAddresses.length) {
      _savedAddresses.removeAt(index);
      _persist();
      notifyListeners();
    }
  }

  void clearLocation() {
    _lat = null;
    _lng = null;
    _locationLabel = 'Select Location';
    _persist();
    notifyListeners();
  }
}
