import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.navy700,
      scaffoldBackgroundColor: AppColors.slate50,
      
      // Color Scheme
      colorScheme: const ColorScheme.light(
        primary: AppColors.navy700,
        secondary: AppColors.emerald500,
        surface: AppColors.white,
        error: AppColors.errorRed,
      ),

      // Text Theme
      fontFamily: 'Inter', // Falls back to system sans-serif if not found
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: AppColors.slate900,
          letterSpacing: -0.5,
        ),
        headlineLarge: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: AppColors.slate900,
          letterSpacing: -0.5,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: AppColors.slate900,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.slate900,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.slate800,
        ),
        bodyLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: AppColors.slate700,
        ),
        bodyMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.normal,
          color: AppColors.slate600,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: AppColors.navy700,
        ),
        labelMedium: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: AppColors.slate500,
          letterSpacing: 0.5,
        ),
      ),

      // Card Theme
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
          side: const BorderSide(
            color: AppColors.slate200,
            width: 1.0,
          ),
        ),
        shadowColor: AppColors.slate900.withOpacity(0.06),
      ),

      // Input Decoration Theme (Form Fields)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        hintStyle: const TextStyle(
          fontSize: 14.0,
          fontWeight: FontWeight.w400,
          color: AppColors.slate400,
        ),
        labelStyle: const TextStyle(
          fontSize: 14.0,
          fontWeight: FontWeight.w500,
          color: AppColors.slate600,
        ),
        errorStyle: const TextStyle(
          fontSize: 11.0,
          fontWeight: FontWeight.bold,
          color: AppColors.errorRed,
        ),
        
        // Border styles
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: const BorderSide(color: AppColors.slate300, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: const BorderSide(color: AppColors.slate300, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: const BorderSide(color: AppColors.navy500, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: const BorderSide(color: AppColors.errorRed, width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: const BorderSide(color: AppColors.errorRed, width: 1.5),
        ),
      ),

      // Button Themes
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.navy700,
          foregroundColor: AppColors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 24.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10.0),
          ),
          textStyle: const TextStyle(
            fontSize: 14.0,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.navy700,
          side: const BorderSide(color: AppColors.navy700, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 24.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10.0),
          ),
          textStyle: const TextStyle(
            fontSize: 14.0,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.navy700,
          padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 12.0),
          textStyle: const TextStyle(
            fontSize: 13.0,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
