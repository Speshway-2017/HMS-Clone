import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class UserSession {
  static const String _keyToken = 'jwt_token';
  static const String _keyUser = 'user_json';
  static const String _keyPatient = 'patient_json';
  static const String _keySelectedBranch = 'selected_branch_id';

  static String? _token;
  static Map<String, dynamic>? _userData;
  static Map<String, dynamic>? _patientData;
  static String _selectedBranchId = 'all';

  static String? get token => _token;
  static Map<String, dynamic>? get user => _userData;
  static Map<String, dynamic>? get patient => _patientData;
  static String get selectedBranchId => _selectedBranchId;

  static set selectedBranchId(String branchId) {
    _selectedBranchId = branchId;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_keySelectedBranch, branchId);
    }).catchError((_) {});
  }

  static String get userName => _userData?['name'] ?? _patientData?['name'] ?? 'Patient';
  static String get userEmail => _userData?['email'] ?? _patientData?['email'] ?? '';
  static String get patientUhid => _patientData?['uhid'] ?? 'UHID-PENDING';
  static String? get patientId => _patientData?['_id'] ?? _patientData?['id'];
  static String? get hospitalId => _userData?['hospital'] ?? _patientData?['hospital'];

  /// Initializes session data from persistent storage
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString(_keyToken);
      _selectedBranchId = prefs.getString(_keySelectedBranch) ?? 'all';

      final userStr = prefs.getString(_keyUser);
      if (userStr != null && userStr.isNotEmpty) {
        _userData = jsonDecode(userStr);
      }

      final patStr = prefs.getString(_keyPatient);
      if (patStr != null && patStr.isNotEmpty) {
        _patientData = jsonDecode(patStr);
      }
    } catch (_) {
      // Storage initialization fallback
    }
  }

  /// Saves session token, user details, and patient profile
  static Future<void> saveSession({
    required String token,
    required Map<String, dynamic> user,
    Map<String, dynamic>? patient,
  }) async {
    _token = token;
    _userData = user;
    _patientData = patient;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyToken, token);
      await prefs.setString(_keyUser, jsonEncode(user));
      if (patient != null) {
        await prefs.setString(_keyPatient, jsonEncode(patient));
      } else {
        await prefs.remove(_keyPatient);
      }
    } catch (_) {
      // Storage save fallback
    }
  }

  /// Clears session storage on logout
  static Future<void> clear() async {
    _token = null;
    _userData = null;
    _patientData = null;
    _selectedBranchId = 'all';

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyToken);
      await prefs.remove(_keyUser);
      await prefs.remove(_keyPatient);
      await prefs.remove(_keySelectedBranch);
    } catch (_) {
      // Storage clear fallback
    }
  }

  /// Returns authorization headers for API HTTP requests (with branch filter header)
  static Map<String, String> get headers {
    final map = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-branch-id': _selectedBranchId,
    };
    if (_token != null && _token!.isNotEmpty) {
      map['Authorization'] = 'Bearer $_token';
    }
    return map;
  }
}
