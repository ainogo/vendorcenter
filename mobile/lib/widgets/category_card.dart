import 'package:flutter/material.dart';
import 'package:vendorcenter/config/theme.dart';

class CategoryCard extends StatelessWidget {
  final String name;
  final int count;
  final VoidCallback? onTap;

  const CategoryCard({super.key, required this.name, required this.count, this.onTap});

  static const _categoryStyles = <String, _CatStyle>{
    'electric': _CatStyle(Icons.electrical_services, [Color(0xFFFFF3E0), Color(0xFFFFE0B2)], Color(0xFFFF8F00)),
    'plumb': _CatStyle(Icons.plumbing, [Color(0xFFE3F2FD), Color(0xFFBBDEFB)], Color(0xFF1565C0)),
    'clean': _CatStyle(Icons.cleaning_services, [Color(0xFFE8F5E9), Color(0xFFC8E6C9)], Color(0xFF2E7D32)),
    'paint': _CatStyle(Icons.format_paint, [Color(0xFFFCE4EC), Color(0xFFF8BBD0)], Color(0xFFC62828)),
    'carpenter': _CatStyle(Icons.carpenter, [Color(0xFFEFEBE9), Color(0xFFD7CCC8)], Color(0xFF4E342E)),
    'salon': _CatStyle(Icons.content_cut, [Color(0xFFF3E5F5), Color(0xFFE1BEE7)], Color(0xFF7B1FA2)),
    'beauty': _CatStyle(Icons.content_cut, [Color(0xFFF3E5F5), Color(0xFFE1BEE7)], Color(0xFF7B1FA2)),
    'pest': _CatStyle(Icons.bug_report, [Color(0xFFFFF8E1), Color(0xFFFFECB3)], Color(0xFFF57F17)),
    'ac': _CatStyle(Icons.ac_unit, [Color(0xFFE0F7FA), Color(0xFFB2EBF2)], Color(0xFF00838F)),
    'hvac': _CatStyle(Icons.ac_unit, [Color(0xFFE0F7FA), Color(0xFFB2EBF2)], Color(0xFF00838F)),
    'shift': _CatStyle(Icons.local_shipping, [Color(0xFFEDE7F6), Color(0xFFD1C4E9)], Color(0xFF4527A0)),
    'pack': _CatStyle(Icons.local_shipping, [Color(0xFFEDE7F6), Color(0xFFD1C4E9)], Color(0xFF4527A0)),
    'garden': _CatStyle(Icons.grass, [Color(0xFFE8F5E9), Color(0xFFA5D6A7)], Color(0xFF1B5E20)),
    'photo': _CatStyle(Icons.camera_alt, [Color(0xFFE8EAF6), Color(0xFFC5CAE9)], Color(0xFF283593)),
    'catering': _CatStyle(Icons.restaurant, [Color(0xFFFBE9E7), Color(0xFFFFCCBC)], Color(0xFFBF360C)),
    'food': _CatStyle(Icons.restaurant, [Color(0xFFFBE9E7), Color(0xFFFFCCBC)], Color(0xFFBF360C)),
  };

  _CatStyle get _style {
    final lower = name.toLowerCase();
    for (final entry in _categoryStyles.entries) {
      if (lower.contains(entry.key)) return entry.value;
    }
    return const _CatStyle(Icons.home_repair_service, [Color(0xFFF5F5F5), Color(0xFFE0E0E0)], Color(0xFF616161));
  }

  @override
  Widget build(BuildContext context) {
    final style = _style;
    final isDark = AppColors.isDark(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          gradient: isDark
              ? null
              : LinearGradient(colors: style.bg, begin: Alignment.topLeft, end: Alignment.bottomRight),
          color: isDark ? AppColors.darkSurface : null,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.darkBorder : style.accent.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(color: style.accent.withValues(alpha: isDark ? 0.05 : 0.08), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: style.accent.withValues(alpha: isDark ? 0.2 : 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(style.icon, size: 24, color: style.accent),
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textOf(context)),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '$count vendor${count != 1 ? 's' : ''}',
              style: TextStyle(fontSize: 9, color: AppColors.textMutedOf(context), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatStyle {
  final IconData icon;
  final List<Color> bg;
  final Color accent;
  const _CatStyle(this.icon, this.bg, this.accent);
}
