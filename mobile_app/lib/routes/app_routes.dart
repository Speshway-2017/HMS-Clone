import 'package:flutter/material.dart';
import '../features/authentication/screens/splash_screen.dart';
import '../features/authentication/screens/login_screen.dart';
import '../features/admin/screens/admin_dashboard.dart';
import '../features/doctor/screens/doctor_dashboard.dart';
import '../features/nurse/screens/nurse_dashboard.dart';
import '../features/patient/screens/patient_dashboard.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String adminDashboard = '/admin/dashboard';
  static const String doctorDashboard = '/doctor/dashboard';
  static const String nurseDashboard = '/nurse/dashboard';
  static const String patientDashboard = '/patient/dashboard';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const SplashScreen(),
          settings: settings,
        );
      case login:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case adminDashboard:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const AdminDashboard(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case doctorDashboard:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const DoctorDashboard(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case nurseDashboard:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const NurseDashboard(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case patientDashboard:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const PatientDashboard(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      default:
        return MaterialPageRoute(
          builder: (context) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
          settings: settings,
        );
    }
  }
}
