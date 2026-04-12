import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static bool _requesting = false;

  static Future<void> requestStartupPermissions(BuildContext context) async {
    if (_requesting) return;
    _requesting = true;
    try {
      // Request notification permission (Android 13+)
      final notifStatus = await Permission.notification.status;
      if (notifStatus.isDenied) {
        await Permission.notification.request();
      }

      // Request location permission for nearby vendor search
      final locStatus = await Permission.locationWhenInUse.status;
      if (locStatus.isDenied) {
        await Permission.locationWhenInUse.request();
      }
    } finally {
      _requesting = false;
    }
  }

  static Future<bool> requestLocation(BuildContext context) async {
    var status = await Permission.locationWhenInUse.status;
    if (status.isGranted) return true;

    if (status.isDenied) {
      status = await Permission.locationWhenInUse.request();
      return status.isGranted;
    }

    if (status.isPermanentlyDenied && context.mounted) {
      _showSettingsDialog(context, 'Location',
          'Location access helps find vendors near you. Please enable it in Settings.');
    }
    return false;
  }

  static Future<bool> requestCamera(BuildContext context) async {
    var status = await Permission.camera.status;
    if (status.isGranted) return true;

    if (status.isDenied) {
      status = await Permission.camera.request();
      return status.isGranted;
    }

    if (status.isPermanentlyDenied && context.mounted) {
      _showSettingsDialog(context, 'Camera',
          'Camera access is needed for profile photos and uploads.');
    }
    return false;
  }

  static void _showSettingsDialog(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$title Permission'),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }
}
