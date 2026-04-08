import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/config/router.dart';
import 'package:vendorcenter/services/auth_service.dart';
import 'package:vendorcenter/services/theme_service.dart';
import 'package:vendorcenter/services/localization_service.dart';

class VendorCenterApp extends StatelessWidget {
  const VendorCenterApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final themeService = context.watch<ThemeService>();
    final l10n = context.watch<LocalizationService>();

    return MaterialApp.router(
      title: 'VendorCenter',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeService.mode,
      locale: l10n.flutterLocale,
      routerConfig: createRouter(auth),
    );
  }
}
