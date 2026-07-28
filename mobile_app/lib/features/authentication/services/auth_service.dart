import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';

class AuthService {
  final http.Client _client;

  /// Holds the active user profile from registration or login
  static Map<String, dynamic>? currentUser;

  AuthService({http.Client? client}) : _client = client ?? http.Client();

  /// Authenticates credentials against the MERN database endpoint.
  /// Throws standard user-facing error messages on credentials failures or network outages.
  Future<String?> authenticate(String email, String password) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/login');
    
    try {
      final response = await _client.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          final user = decoded['data']['user'];
          if (user != null && user['role'] != null) {
            currentUser = Map<String, dynamic>.from(user);
            return user['role'].toString();
          }
        }
        throw Exception('Malformed login response payload.');
      } else {
        // Parse validation or credentials errors from backend AppError response
        final message = decoded['message'] ?? 'Authentication failed.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception(
        'Unable to connect to the server. Please check your internet connection '
        'and verify the configured server address is active and accessible.',
      );
    } on HttpException {
      throw Exception('Server returned an invalid HTTP response. Please try again.');
    } on FormatException {
      throw Exception('Failed to parse server response. Please verify the API server is active.');
    } on Future {
      // Timeout fallback
      throw Exception('Request timed out. Please verify your backend server connection.');
    } catch (e) {
      if (e.toString().contains('TimeoutException')) {
        throw Exception('Request timed out. Please verify your backend server connection.');
      }
      rethrow;
    }
  }

  /// Registers a new patient account against the MERN database endpoint.
  /// Throws standard user-facing error messages on validation failures or network outages.
  Future<String?> register(String name, String email, String password, String phone) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/register');
    
    try {
      final response = await _client.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
          'phone': phone.trim(),
        }),
      ).timeout(const Duration(seconds: 10));

      final decoded = jsonDecode(response.body);

      if (response.statusCode == 201) {
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          final user = decoded['data']['user'];
          if (user != null && user['role'] != null) {
            currentUser = Map<String, dynamic>.from(user);
            return user['role'].toString();
          }
        }
        // Fallback user object if server registered user format varies
        currentUser = {
          'name': name.trim(),
          'email': email.trim(),
          'phone': phone.trim(),
          'role': 'patient',
          'uhid': 'UHID-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}',
        };
        return 'patient';
      } else {
        final message = decoded['message'] ?? 'Registration failed.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception(
        'Unable to connect to the server. Please check your internet connection '
        'and verify the configured server address is active and accessible.',
      );
    } on HttpException {
      throw Exception('Server returned an invalid HTTP response. Please try again.');
    } on FormatException {
      throw Exception('Failed to parse server response. Please verify the API server is active.');
    } catch (e) {
      if (e.toString().contains('TimeoutException')) {
        throw Exception('Request timed out. Please verify your backend server connection.');
      }
      rethrow;
    }
  }

  /// Sets offline / locally registered session when testing without active backend server
  static void setRegisteredSession({
    required String name,
    required String email,
    required String phone,
    String role = 'patient',
  }) {
    final cleanName = name.trim();
    final cleanEmail = email.trim();
    final cleanPhone = phone.trim();
    
    // Generate deterministic clean UHID based on email/phone or timestamp
    final hashNum = cleanPhone.isNotEmpty ? cleanPhone.replaceAll(RegExp(r'\D'), '') : cleanEmail.hashCode.abs().toString();
    final uhidSuffix = hashNum.length >= 8 ? hashNum.substring(hashNum.length - 8) : hashNum.padLeft(8, '0');

    currentUser = {
      'name': cleanName.isNotEmpty ? cleanName : 'Registered Patient',
      'email': cleanEmail,
      'phone': cleanPhone,
      'role': role,
      'uhid': 'UHID-$uhidSuffix',
      'hospital': 'Sunrise General Hospital',
    };
  }
}
