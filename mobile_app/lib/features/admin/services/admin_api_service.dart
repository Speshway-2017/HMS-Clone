import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../../core/config/user_session.dart';

class AdminApiService {
  final http.Client _client;

  AdminApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Fetch hospital profile data (GET /hospitals/me)
  Future<Map<String, dynamic>?> fetchHospitalProfile() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/hospitals/me');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          return decoded['data']['hospital'] as Map<String, dynamic>? ?? decoded['data'] as Map<String, dynamic>?;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Update hospital profile data (PATCH /hospitals/me)
  Future<bool> updateHospitalProfile(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/hospitals/me');
    try {
      final response = await _client.patch(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch hospital branches (GET /branches)
  Future<List<Map<String, dynamic>>> fetchBranches() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/branches');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['branches'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create new branch (POST /branches)
  Future<bool> createBranch(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/branches');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch departments (GET /departments)
  Future<List<Map<String, dynamic>>> fetchDepartments() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/departments');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['departments'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create department (POST /departments)
  Future<bool> createDepartment(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/departments');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Toggle department status (PATCH /departments/:id/toggle-status)
  Future<bool> toggleDepartmentStatus(String id) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/departments/$id/toggle-status');
    try {
      final response = await _client.patch(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch doctors (GET /doctors)
  Future<List<Map<String, dynamic>>> fetchDoctors() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctors');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['doctors'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create doctor (POST /doctors)
  Future<bool> createDoctor(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctors');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch staff (GET /staff)
  Future<List<Map<String, dynamic>>> fetchStaff() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/staff');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['staff'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create staff member (POST /staff)
  Future<bool> createStaff(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/staff');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch roles (GET /roles)
  Future<List<Map<String, dynamic>>> fetchRoles() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/roles');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['roles'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create role (POST /roles)
  Future<bool> createRole(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/roles');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch hospital analytics (GET /analytics/hospital)
  Future<Map<String, dynamic>?> fetchHospitalAnalytics() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/analytics/hospital');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Fetch hospital enquiries (GET /hospitals/enquiries)
  Future<List<Map<String, dynamic>>> fetchEnquiries() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/hospitals/enquiries');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List items = decoded['data'] is List ? decoded['data'] : (decoded['data']?['enquiries'] ?? []);
        return items.map((i) => i as Map<String, dynamic>).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Update enquiry status (PATCH /hospitals/enquiries/:id)
  Future<bool> updateEnquiryStatus(String id, String status) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/hospitals/enquiries/$id');
    try {
      final response = await _client.patch(
        url,
        headers: UserSession.headers,
        body: jsonEncode({'status': status}),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
