import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:vendorcenter/config/theme.dart';

/// Glassmorphism card — frosted glass effect with backdrop blur.
/// Works in both light and dark mode.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final double blur;
  final double opacity;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius = 16,
    this.blur = 12,
    this.opacity = 0.08,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    return Container(
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withValues(alpha: opacity),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08),
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Shimmer that adapts to light/dark mode.
class AdaptiveShimmer extends StatelessWidget {
  final Widget child;
  const AdaptiveShimmer({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = AppColors.isDark(context);
    return ShimmerWrap(
      baseColor: isDark ? AppColors.darkSurfaceAlt : const Color(0xFFE0E0E0),
      highlightColor: isDark ? AppColors.darkBorder : const Color(0xFFF5F5F5),
      child: child,
    );
  }
}

/// Thin shimmer wrapper using the shimmer package.
class ShimmerWrap extends StatefulWidget {
  final Color baseColor;
  final Color highlightColor;
  final Widget child;
  const ShimmerWrap({super.key, required this.baseColor, required this.highlightColor, required this.child});

  @override
  State<ShimmerWrap> createState() => _ShimmerWrapState();
}

class _ShimmerWrapState extends State<ShimmerWrap> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => ShaderMask(
        shaderCallback: (bounds) {
          return LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [widget.baseColor, widget.highlightColor, widget.baseColor],
            stops: [
              (_ctrl.value - 0.3).clamp(0.0, 1.0),
              _ctrl.value,
              (_ctrl.value + 0.3).clamp(0.0, 1.0),
            ],
          ).createShader(bounds);
        },
        blendMode: BlendMode.srcATop,
        child: widget.child,
      ),
    );
  }
}
