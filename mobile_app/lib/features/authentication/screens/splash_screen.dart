import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../../../widgets/app_logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<double> _textOpacity;
  late Animation<Offset> _textOffset;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _logoScale = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
      ),
    );

    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.4, curve: Curves.easeIn),
      ),
    );

    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.4, 1.0, curve: Curves.easeIn),
      ),
    );

    _textOffset = Tween<Offset>(
      begin: const Offset(0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.4, 1.0, curve: Curves.easeOutCubic),
      ),
    );

    _controller.forward();
    _handleRouting();
  }

  Future<void> _handleRouting() async {
    // Wait minimum 2.2 seconds for splash animation presentation
    await Future.delayed(const Duration(milliseconds: 2200));

    if (!mounted) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final hasSeenOnboarding = prefs.getBool('has_seen_onboarding') ?? false;

      if (!hasSeenOnboarding) {
        Navigator.pushReplacementNamed(context, AppRoutes.onboarding);
        return;
      }

      // Check if user has an existing authenticated session
      final token = UserSession.token;
      if (token != null && token.isNotEmpty) {
        final role = UserSession.user?['role']?.toString().toLowerCase();

        if (role == 'admin' || role == 'hospital_admin') {
          Navigator.pushReplacementNamed(context, AppRoutes.adminDashboard);
          return;
        } else if (role == 'doctor') {
          Navigator.pushReplacementNamed(context, AppRoutes.doctorDashboard);
          return;
        } else if (role == 'nurse') {
          Navigator.pushReplacementNamed(context, AppRoutes.nurseDashboard);
          return;
        } else {
          // Default to patient dashboard
          Navigator.pushReplacementNamed(context, AppRoutes.patientDashboard);
          return;
        }
      }

      // No active session -> Login
      Navigator.pushReplacementNamed(context, AppRoutes.login);
    } catch (_) {
      Navigator.pushReplacementNamed(context, AppRoutes.login);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);
    final logoSize = responsive.scaleWidth(110.0);
    final spacing = responsive.scaleHeight(24.0);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.navy800,
              AppColors.navy950,
            ],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Ambient cyan/emerald glow behind the logo
            Positioned(
              top: responsive.height * 0.33,
              child: Container(
                width: responsive.scaleWidth(260.0),
                height: responsive.scaleWidth(260.0),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.emerald500.withOpacity(0.08),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.emerald500.withOpacity(0.12),
                      blurRadius: 110,
                      spreadRadius: 25,
                    ),
                  ],
                ),
              ),
            ),

            // Branding Logo & Text
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FadeTransition(
                  opacity: _logoOpacity,
                  child: ScaleTransition(
                    scale: _logoScale,
                    child: Container(
                      width: logoSize,
                      height: logoSize,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(logoSize * 0.24),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.navy950.withOpacity(0.6),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(logoSize * 0.24),
                        child: Image.asset(
                          'assets/icon/app_icon.png',
                          width: logoSize,
                          height: logoSize,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return AppLogo(size: logoSize);
                          },
                        ),
                      ),
                    ),
                  ),
                ),
                SizedBox(height: spacing),
                FadeTransition(
                  opacity: _textOpacity,
                  child: SlideTransition(
                    position: _textOffset,
                    child: Column(
                      children: [
                        Text(
                          'HMS Enterprise',
                          style: TextStyle(
                            fontSize: responsive.scaleText(28.0),
                            fontWeight: FontWeight.w800,
                            color: AppColors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'MANAGED CLINICAL NETWORK',
                          style: TextStyle(
                            fontSize: responsive.scaleText(11.0),
                            fontWeight: FontWeight.bold,
                            color: AppColors.emerald400,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Loading / Progress Indicator at the bottom
            Positioned(
              bottom: responsive.scaleHeight(55.0) + responsive.paddingBottom,
              child: FadeTransition(
                opacity: _textOpacity,
                child: SizedBox(
                  width: responsive.scaleWidth(140.0),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2.0),
                        child: const LinearProgressIndicator(
                          minHeight: 2.0,
                          backgroundColor: Colors.white10,
                          valueColor: AlwaysStoppedAnimation<Color>(AppColors.emerald400),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Securing connection...',
                        style: TextStyle(
                          fontSize: responsive.scaleText(10.0),
                          fontWeight: FontWeight.w500,
                          color: AppColors.navy200.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
