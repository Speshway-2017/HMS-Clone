import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingItem> _pages = const [
    _OnboardingItem(
      tag: 'INSTANT CARE',
      title: 'Seamless Appointments\n& Live Queue',
      description:
          'Find expert medical specialists, book OPD consultations in real time, and avoid long hospital queues with live digital scheduling.',
      primaryIcon: Icons.calendar_month_rounded,
      secondaryIcon: Icons.medical_services_rounded,
      accentColor: AppColors.emerald400,
      gradientColors: [Color(0xFF047857), Color(0xFF10B981)],
    ),
    _OnboardingItem(
      tag: 'SMART HEALTH',
      title: 'Digital Health Records\n& Diagnostics',
      description:
          'Access lab reports, digital prescriptions, vaccination logs, and vital charts securely on demand with enterprise-grade encryption.',
      primaryIcon: Icons.folder_shared_rounded,
      secondaryIcon: Icons.shield_rounded,
      accentColor: Color(0xFF38BDF8),
      gradientColors: [Color(0xFF0369A1), Color(0xFF38BDF8)],
    ),
    _OnboardingItem(
      tag: 'CONNECTED ECOSYSTEM',
      title: 'Integrated Hospital Care\nFor Everyone',
      description:
          'A unified healthcare platform bridging patients, doctors, nurses, and pharmacy billing for transparent, fast, and compassionate care.',
      primaryIcon: Icons.local_hospital_rounded,
      secondaryIcon: Icons.favorite_rounded,
      accentColor: Color(0xFF818CF8),
      gradientColors: [Color(0xFF4338CA), Color(0xFF818CF8)],
    ),
  ];

  Future<void> _finishOnboarding() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('has_seen_onboarding', true);
    } catch (_) {}

    if (!mounted) return;
    Navigator.pushReplacementNamed(context, AppRoutes.login);
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _finishOnboarding();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);
    final isLastPage = _currentPage == _pages.length - 1;

    return Scaffold(
      backgroundColor: AppColors.navy950,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.navy900,
              AppColors.navy950,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar: Brand Identifier + Skip Button
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: responsive.scaleWidth(20.0),
                  vertical: responsive.scaleHeight(12.0),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Brand Badge
                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.navy700, AppColors.navy600],
                            ),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppColors.white.withOpacity(0.15),
                              width: 1,
                            ),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.local_hospital_rounded,
                              color: AppColors.emerald400,
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'HMS Enterprise',
                              style: TextStyle(
                                color: AppColors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: responsive.scaleText(15.0),
                                letterSpacing: -0.3,
                              ),
                            ),
                            Text(
                              'HEALTHCARE APP',
                              style: TextStyle(
                                color: AppColors.navy200.withOpacity(0.7),
                                fontWeight: FontWeight.w600,
                                fontSize: responsive.scaleText(9.0),
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    // Skip Button
                    TextButton(
                      onPressed: _finishOnboarding,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        backgroundColor: AppColors.white.withOpacity(0.06),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: AppColors.white.withOpacity(0.1),
                          ),
                        ),
                      ),
                      child: Text(
                        'Skip',
                        style: TextStyle(
                          color: AppColors.navy100,
                          fontSize: responsive.scaleText(13.0),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Page Content
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _pages.length,
                  onPageChanged: (index) {
                    setState(() {
                      _currentPage = index;
                    });
                  },
                  itemBuilder: (context, index) {
                    final item = _pages[index];
                    return _buildPageItem(context, responsive, item);
                  },
                ),
              ),

              // Bottom Navigation & Indicators
              Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: responsive.scaleWidth(24.0),
                  vertical: responsive.scaleHeight(20.0),
                ),
                child: Column(
                  children: [
                    // Smooth Page Indicators
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_pages.length, (index) {
                        final isSelected = index == _currentPage;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                          margin: const EdgeInsets.symmetric(horizontal: 4.0),
                          height: 8.0,
                          width: isSelected ? 28.0 : 8.0,
                          decoration: BoxDecoration(
                            gradient: isSelected
                                ? LinearGradient(colors: _pages[_currentPage].gradientColors)
                                : null,
                            color: isSelected ? null : AppColors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                        );
                      }),
                    ),
                    SizedBox(height: responsive.scaleHeight(24.0)),

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      height: responsive.scaleHeight(54.0),
                      child: ElevatedButton(
                        onPressed: _nextPage,
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          elevation: 6,
                          shadowColor: _pages[_currentPage].accentColor.withOpacity(0.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16.0),
                          ),
                        ),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: _pages[_currentPage].gradientColors,
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            borderRadius: BorderRadius.circular(16.0),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  isLastPage ? 'Get Started' : 'Continue',
                                  style: TextStyle(
                                    fontSize: responsive.scaleText(16.0),
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.white,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  isLastPage
                                      ? Icons.check_circle_rounded
                                      : Icons.arrow_forward_rounded,
                                  color: AppColors.white,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPageItem(
    BuildContext context,
    ResponsiveHelper responsive,
    _OnboardingItem item,
  ) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: responsive.scaleWidth(24.0)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Illustration / Icon Badge
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer subtle glowing aura
                Container(
                  width: responsive.scaleWidth(220.0),
                  height: responsive.scaleWidth(220.0),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: item.accentColor.withOpacity(0.08),
                  ),
                ),
                // Inner layered container
                Container(
                  width: responsive.scaleWidth(170.0),
                  height: responsive.scaleWidth(170.0),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.navy800,
                        AppColors.navy900,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: item.accentColor.withOpacity(0.35),
                      width: 2.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: item.accentColor.withOpacity(0.2),
                        blurRadius: 28,
                        spreadRadius: 2,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Icon(
                          item.primaryIcon,
                          size: responsive.scaleWidth(72.0),
                          color: AppColors.white,
                        ),
                        Positioned(
                          right: responsive.scaleWidth(24.0),
                          bottom: responsive.scaleWidth(24.0),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: item.accentColor,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: item.accentColor.withOpacity(0.5),
                                  blurRadius: 10,
                                ),
                              ],
                            ),
                            child: Icon(
                              item.secondaryIcon,
                              size: responsive.scaleWidth(18.0),
                              color: AppColors.navy950,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          SizedBox(height: responsive.scaleHeight(36.0)),

          // Tag Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 6.0),
            decoration: BoxDecoration(
              color: item.accentColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: item.accentColor.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Text(
              item.tag,
              style: TextStyle(
                color: item.accentColor,
                fontWeight: FontWeight.bold,
                fontSize: responsive.scaleText(11.0),
                letterSpacing: 1.2,
              ),
            ),
          ),

          SizedBox(height: responsive.scaleHeight(16.0)),

          // Headline
          Text(
            item.title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: responsive.scaleText(25.0),
              fontWeight: FontWeight.w800,
              color: AppColors.white,
              height: 1.25,
              letterSpacing: -0.5,
            ),
          ),

          SizedBox(height: responsive.scaleHeight(14.0)),

          // Description Paragraph
          Padding(
            padding: EdgeInsets.symmetric(horizontal: responsive.scaleWidth(12.0)),
            child: Text(
              item.description,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: responsive.scaleText(14.0),
                fontWeight: FontWeight.normal,
                color: AppColors.navy100.withOpacity(0.75),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingItem {
  final String tag;
  final String title;
  final String description;
  final IconData primaryIcon;
  final IconData secondaryIcon;
  final Color accentColor;
  final List<Color> gradientColors;

  const _OnboardingItem({
    required this.tag,
    required this.title,
    required this.description,
    required this.primaryIcon,
    required this.secondaryIcon,
    required this.accentColor,
    required this.gradientColors,
  });
}

