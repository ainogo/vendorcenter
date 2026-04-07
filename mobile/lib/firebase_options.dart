import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  /// On Android, prefer [Firebase.initializeApp()] without options —
  /// the google-services.json per product flavor is authoritative.
  /// This getter is used only for non-Android platforms.
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyCiE25EsjcsZaV4DsVgQXx7H2kXX84Y11I',
    appId: '1:570064694297:web:b6bf2985bc45582ebc8e88',
    messagingSenderId: '570064694297',
    projectId: 'vendorcenter-staging',
    authDomain: 'auth.vendorcenter.in',
    storageBucket: 'vendorcenter-staging.firebasestorage.app',
    measurementId: 'G-KXZBGM7CG7',
  );

  // Android fallback — customer app. Actual config comes from
  // google-services.json in src/customer/ or src/vendor/ per flavor.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAsEk1V6zms36vzkZ5xiA_GITCVlZF7hYI',
    appId: '1:570064694297:android:2c2ca6c2a18f4e99bc8e88',
    messagingSenderId: '570064694297',
    projectId: 'vendorcenter-staging',
    storageBucket: 'vendorcenter-staging.firebasestorage.app',
  );

  // iOS placeholder
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCiE25EsjcsZaV4DsVgQXx7H2kXX84Y11I',
    appId: '1:570064694297:ios:PLACEHOLDER',
    messagingSenderId: '570064694297',
    projectId: 'vendorcenter-staging',
    storageBucket: 'vendorcenter-staging.firebasestorage.app',
    iosBundleId: 'com.vendorcenter.customer',
  );
}
