import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vendorcenter/services/api_service.dart';

/// Checks backend /api/version and prompts user to update if a newer version exists.
/// Works with self-hosted APK distribution (no Play Store needed).
class UpdateService {
  static final UpdateService _instance = UpdateService._();
  factory UpdateService() => _instance;
  UpdateService._();

  final _api = ApiService();
  bool _hasChecked = false;

  /// Call once from the main app screen's initState. Shows dialog if update available.
  Future<void> checkForUpdate(BuildContext context, {bool isVendor = false}) async {
    if (_hasChecked) return;
    _hasChecked = true;

    try {
      final info = await PackageInfo.fromPlatform();
      final currentVersion = info.version; // e.g. "1.0.0"

      final res = await _api.dio.get('/version');
      final data = res.data['data'];
      if (data == null) return;

      final latestVersion = data['currentVersion'] as String? ?? currentVersion;
      final minVersion = data['minVersion'] as String? ?? '0.0.0';
      final forceUpdate = data['forceUpdate'] as bool? ?? false;
      final changelog = data['changelog'] as String? ?? 'Bug fixes and improvements';
      final apkUrl = isVendor
          ? (data['vendorApk'] as String? ?? '')
          : (data['customerApk'] as String? ?? '');

      final needsUpdate = _compareVersions(currentVersion, latestVersion) < 0;
      final mustUpdate = _compareVersions(currentVersion, minVersion) < 0 || forceUpdate;

      if (!needsUpdate) return;
      if (!context.mounted) return;

      showDialog(
        context: context,
        barrierDismissible: !mustUpdate,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Icon(Icons.system_update, color: mustUpdate ? Colors.red : Colors.blue),
              const SizedBox(width: 8),
              Text(mustUpdate ? 'Update Required' : 'Update Available'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Version $latestVersion is available (you have $currentVersion)'),
              const SizedBox(height: 12),
              Text(changelog, style: const TextStyle(fontSize: 13, color: Colors.grey)),
              if (mustUpdate) ...[
                const SizedBox(height: 12),
                const Text(
                  'This update is required to continue using the app.',
                  style: TextStyle(fontWeight: FontWeight.w600, color: Colors.red),
                ),
              ],
            ],
          ),
          actions: [
            if (!mustUpdate)
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Later'),
              ),
            FilledButton(
              onPressed: () {
                if (apkUrl.isNotEmpty) {
                  launchUrl(Uri.parse(apkUrl), mode: LaunchMode.externalApplication);
                }
                if (!mustUpdate) Navigator.of(ctx).pop();
              },
              child: const Text('Update Now'),
            ),
          ],
        ),
      );
    } catch (e) {
      debugPrint('[UpdateService] Check failed: $e');
    }
  }

  /// Compare semantic versions. Returns -1 if a < b, 0 if equal, 1 if a > b.
  int _compareVersions(String a, String b) {
    final aParts = a.split('.').map(int.tryParse).toList();
    final bParts = b.split('.').map(int.tryParse).toList();
    for (int i = 0; i < 3; i++) {
      final av = (i < aParts.length ? aParts[i] : 0) ?? 0;
      final bv = (i < bParts.length ? bParts[i] : 0) ?? 0;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  }
}
