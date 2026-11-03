import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _keyBaseUrl = 'backend_base_url';
  static const String defaultUrl = 'https://cms.speshway.site/api/v1';

  /// Fixed backend base URL for all mobile app API requests
  static const String baseUrl = defaultUrl;

  /// Initializes the base URL and ensures persistent storage is synced to the fixed URL
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyBaseUrl, defaultUrl);
    } catch (_) {
      // Fail silently in environments where storage is unavailable
    }
  }

  /// Kept for backward compatibility
  static Future<void> setBaseUrl(String url) async {
    // Backend URL is permanently fixed to defaultUrl
  }
}
