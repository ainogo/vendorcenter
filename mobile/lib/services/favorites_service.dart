import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FavoritesService extends ChangeNotifier {
  static const _key = 'favorite_vendors';
  final SharedPreferences _prefs;
  late Set<String> _ids;

  FavoritesService(this._prefs) {
    _ids = (_prefs.getStringList(_key) ?? []).toSet();
  }

  Set<String> get ids => Set.unmodifiable(_ids);
  int get count => _ids.length;

  bool isFavorite(String vendorId) => _ids.contains(vendorId);

  void toggle(String vendorId) {
    if (_ids.contains(vendorId)) {
      _ids.remove(vendorId);
    } else {
      _ids.add(vendorId);
    }
    _prefs.setStringList(_key, _ids.toList());
    notifyListeners();
  }
}
