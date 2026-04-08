import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:vendorcenter/config/theme.dart';
import 'package:vendorcenter/config/vendor_router.dart';
import 'package:vendorcenter/services/auth_service.dart';
import 'package:vendorcenter/services/theme_service.dart';

class VendorApp extends StatelessWidget {
  const VendorApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final themeService = context.watch<ThemeService>();

    return MaterialApp.router(
      title: 'VendorCenter — Vendor',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.vendor,
      darkTheme: AppTheme.vendorDark,
      themeMode: themeService.mode,
      routerConfig: createVendorRouter(auth),
    );
  }
}
