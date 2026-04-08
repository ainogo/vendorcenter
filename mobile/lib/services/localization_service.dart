import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vendorcenter/i18n/translations.dart';

/// Lightweight localization service — supports EN / MR.
/// Stores preference in SharedPreferences under 'vc_language'.
class LocalizationService extends ChangeNotifier {
  static const _storageKey = 'vc_language';
  static const supportedLocales = ['en', 'mr'];
  static const localeLabels = {'en': 'English', 'mr': 'मराठी'};

  String _locale = 'en';
  String get locale => _locale;

  Locale get flutterLocale => Locale(_locale);

  LocalizationService() {
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_storageKey);
    if (saved != null && supportedLocales.contains(saved)) {
      _locale = saved;
      notifyListeners();
    }
  }

  Future<void> setLocale(String code) async {
    if (!supportedLocales.contains(code) || code == _locale) return;
    _locale = code;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, code);
  }

  /// Translate a key. Supports {{param}} interpolation.
  String t(String key, [Map<String, String>? params]) {
    final map = translations[_locale] ?? translations['en']!;
    var value = map[key] ?? translations['en']?[key] ?? key;
    if (params != null) {
      for (final entry in params.entries) {
        value = value.replaceAll('{{${entry.key}}}', entry.value);
      }
    }
    return value;
  }
}

/// Convenience extension on BuildContext for quick translations.
extension LocalizationExt on BuildContext {
  LocalizationService get l10n => watch<LocalizationService>();

  String tr(String key, [Map<String, String>? params]) => l10n.t(key, params);
}
