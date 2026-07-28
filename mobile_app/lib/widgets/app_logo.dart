import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class AppLogo extends StatelessWidget {
  final double size;
  final bool showShadow;

  const AppLogo({
    super.key,
    this.size = 80.0,
    this.showShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.navy700,
            AppColors.navy900,
          ],
        ),
        borderRadius: BorderRadius.circular(size * 0.25),
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: AppColors.navy900.withOpacity(0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
        border: Border.all(
          color: AppColors.white.withOpacity(0.1),
          width: 1.5,
        ),
      ),
      child: Center(
        child: SizedBox(
          width: size * 0.7,
          height: size * 0.7,
          child: CustomPaint(
            painter: _LogoPainter(),
          ),
        ),
      ),
    );
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final double cx = w / 2;
    final double cy = h / 2;

    // 1. Draw Medical Cross (Soft white background shape)
    final Paint crossPaint = Paint()
      ..color = AppColors.white.withOpacity(0.85)
      ..style = PaintingStyle.fill;

    final double thickness = w * 0.24;
    final double len = w * 0.65;

    // Horizontal bar
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy), width: len, height: thickness),
        Radius.circular(thickness * 0.3),
      ),
      crossPaint,
    );

    // Vertical bar
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy), width: thickness, height: len),
        Radius.circular(thickness * 0.3),
      ),
      crossPaint,
    );

    // 2. Draw an ECG Pulse line overlay in vivid Emerald green
    final Paint pulsePaint = Paint()
      ..color = AppColors.emerald500
      ..strokeWidth = w * 0.07
      ..strokeCap = StrokeCap.round;

    final Paint pulseShadowPaint = Paint()
      ..color = AppColors.emerald400.withOpacity(0.4)
      ..strokeWidth = w * 0.12
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final Path path = Path();
    
    // Starting point
    path.moveTo(w * 0.05, cy);
    // Flat baseline
    path.lineTo(w * 0.3, cy);
    // Small dip down
    path.lineTo(w * 0.38, cy + h * 0.08);
    // Sharp peak up
    path.lineTo(w * 0.48, cy - h * 0.32);
    // Sharp drop down
    path.lineTo(w * 0.58, cy + h * 0.32);
    // Small bounce up
    path.lineTo(w * 0.66, cy - h * 0.06);
    // Back to baseline
    path.lineTo(w * 0.72, cy);
    // Flat outline
    path.lineTo(w * 0.95, cy);

    // Draw shadow/glow first
    canvas.drawPath(path, pulseShadowPaint);
    // Draw the solid line
    canvas.drawPath(path, pulsePaint..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
