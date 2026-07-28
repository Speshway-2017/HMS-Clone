import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _keyBaseUrl = 'backend_base_url';
  static const String defaultUrl = 'http://10.0.2.2:5000/api/v1';

  static String _baseUrl = defaultUrl;

  /// Gets the current backend base URL
  static String get baseUrl => _baseUrl;

  /// Initializes the base URL from shared preferences
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _baseUrl = prefs.getString(_keyBaseUrl) ?? defaultUrl;
    } catch (_) {
      _baseUrl = defaultUrl;
    }
  }

  /// Updates and persists the backend base URL
  static Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyBaseUrl, _baseUrl);
    } catch (_) {
      // Fail silently in environments where storage is unavailable (e.g. tests)
    }
  }
}
