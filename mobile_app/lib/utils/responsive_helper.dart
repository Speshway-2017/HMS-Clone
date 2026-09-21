import 'package:flutter/material.dart';

class ResponsiveHelper {
  final BuildContext context;

  ResponsiveHelper(this.context);

  static ResponsiveHelper of(BuildContext context) => ResponsiveHelper(context);

  double get width => MediaQuery.of(context).size.width;
  double get height => MediaQuery.of(context).size.height;
  double get paddingBottom => MediaQuery.of(context).padding.bottom;
  double get paddingTop => MediaQuery.of(context).padding.top;
  
  bool get isTablet => width >= 600;
  bool get isMobile => width < 600;

  // Horizontal scaling factor based on default design width of 375 (standard mobile screen)
  double scaleWidth(double size) {
    double designWidth = isTablet ? 768.0 : 375.0;
    return (width / designWidth) * size;
  }

  // Vertical scaling factor based on default design height of 812 (standard mobile screen)
  double scaleHeight(double size) {
    double designHeight = isTablet ? 1024.0 : 812.0;
    return (height / designHeight) * size;
  }

  // Scale text size safely based on width ratio and text scale factor
  double scaleText(double size) {
    double textScaleFactor = MediaQuery.of(context).textScaleFactor;
    double scale = scaleWidth(size);
    // Impose lower and upper bounds to avoid visual distortion
    double minScale = size * 0.85;
    double maxScale = size * 1.3;
    double boundedScale = scale.clamp(minScale, maxScale);
    return boundedScale * textScaleFactor;
  }
}
