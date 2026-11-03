import '../features/onboarding/screens/onboarding_screen.dart';
import 'package:flutter/material.dart';
import '../features/authentication/screens/splash_screen.dart';
import '../features/authentication/screens/login_screen.dart';
import '../features/admin/screens/admin_dashboard.dart';
import '../features/admin/screens/admin_profile_screen.dart';
import '../features/doctor/screens/doctor_dashboard.dart';
import '../features/doctor/screens/doctor_profile_screen.dart';
import '../features/nurse/screens/nurse_dashboard.dart';
import '../features/nurse/screens/assign_task_screen.dart';
import '../features/nurse/screens/shift_handover_screen.dart';
import '../features/nurse/screens/nursing_notes_screen.dart';
import '../features/nurse/screens/patient_profile_screen.dart' as nurse_profile;
import '../features/nurse/screens/patient_vitals_screen.dart';
import '../features/patient/screens/patient_dashboard.dart';
import '../features/patient/screens/patient_profile_screen.dart' as patient_profile;
import '../features/patient/screens/report_detail_screen.dart';
import '../features/legal/screens/privacy_policy_screen.dart';
import '../features/legal/screens/terms_conditions_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String adminDashboard = '/admin/dashboard';
  static const String adminProfile = '/admin/profile';
  static const String doctorDashboard = '/doctor/dashboard';
  static const String doctorProfile = '/doctor/profile';
  static const String nurseDashboard = '/nurse/dashboard';
  static const String nurseAssignTask = '/nurse/assign-task';
  static const String nurseShiftHandover = '/nurse/shift-handover';
  static const String nurseNursingNotes = '/nurse/nursing-notes';
  static const String nursePatientProfile = '/nurse/patient-profile';
  static const String nursePatientVitals = '/nurse/patient-vitals';
  static const String patientDashboard = '/patient/dashboard';
  static const String patientProfile = '/patient/profile';
  static const String patientReportDetail = '/patient/report-detail';
  static const String privacyPolicy = '/legal/privacy-policy';
  static const String termsConditions = '/legal/terms-conditions';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const SplashScreen(),
          settings: settings,
        );
      case onboarding:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const OnboardingScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 400),
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
      case adminProfile:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const AdminProfileScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
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
      case doctorProfile:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const DoctorProfileScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
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
      case nurseAssignTask:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const AssignTaskScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case nurseShiftHandover:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const ShiftHandoverScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case nurseNursingNotes:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const NursingNotesScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case nursePatientProfile:
        final args = settings.arguments as Map<String, dynamic>;
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => nurse_profile.PatientProfileScreen(patientData: args),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 500),
        );
      case nursePatientVitals:
        final args = settings.arguments as Map<String, dynamic>;
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => PatientVitalsScreen(patientData: args),
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
      case patientProfile:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const patient_profile.PatientProfileScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
        );
      case patientReportDetail:
        final args = settings.arguments as Map<String, dynamic>;
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => ReportDetailScreen(reportData: args),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
        );
      case privacyPolicy:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const PrivacyPolicyScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
        );
      case termsConditions:
        return PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => const TermsConditionsScreen(),
          settings: settings,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 300),
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
