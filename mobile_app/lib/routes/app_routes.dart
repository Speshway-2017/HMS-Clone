import 'package:flutter/material.dart';
import '../features/authentication/screens/splash_screen.dart';
import '../features/authentication/screens/login_screen.dart';
import '../features/admin/screens/admin_dashboard.dart';
import '../features/doctor/screens/doctor_dashboard.dart';
import '../features/nurse/screens/nurse_dashboard.dart';
import '../features/nurse/screens/assign_task_screen.dart';
import '../features/nurse/screens/shift_handover_screen.dart';
import '../features/nurse/screens/nursing_notes_screen.dart';
import '../features/nurse/screens/patient_profile_screen.dart';
import '../features/nurse/screens/patient_vitals_screen.dart';
import '../features/patient/screens/patient_dashboard.dart';
import '../features/patient/screens/patient_profile_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String adminDashboard = '/admin/dashboard';
  static const String doctorDashboard = '/doctor/dashboard';
  static const String nurseDashboard = '/nurse/dashboard';
  static const String nurseAssignTask = '/nurse/assign-task';
  static const String nurseShiftHandover = '/nurse/shift-handover';
  static const String nurseNursingNotes = '/nurse/nursing-notes';
  static const String nursePatientProfile = '/nurse/patient-profile';
  static const String nursePatientVitals = '/nurse/patient-vitals';
  static const String patientDashboard = '/patient/dashboard';
  static const String patientProfile = '/patient/profile';

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
          pageBuilder: (context, animation, secondaryAnimation) => PatientProfileScreen(patientData: args),
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
          pageBuilder: (context, animation, secondaryAnimation) => const PatientProfileScreen(),
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
