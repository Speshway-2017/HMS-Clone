import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../../core/config/user_session.dart';

class AdminApiService {
  final http.Client _client;

  AdminApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Fetch user profile (GET /auth/me) to sync profile photo and details from Web/Backend
  Future<Map<String, dynamic>?> fetchUserProfile() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/me');
    try {
      final response = await _client.get(url, headers: UserSession.headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final user = decoded['data']?['user'] as Map<String, dynamic>?;
        if (user != null) {
          final avatar = user['avatarUrl']?.toString();
          if (avatar != null && avatar.isNotEmpty) {
            await UserSession.setProfileImagePath(avatar);
          }
          return user;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Upload profile image to backend/Cloudinary (POST /uploads)
  Future<String?> uploadImage(File file) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/uploads');
    try {
      final request = http.MultipartRequest('POST', url);
      final headers = Map<String, String>.from(UserSession.headers);
      headers.remove('Content-Type');
      request.headers.addAll(headers);
      request.fields['folder'] = 'admin-avatars';
      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedResponse = await request.send().timeout(const Duration(seconds: 25));
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(response.body);
        return decoded['data']?['url']?.toString();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Update user profile in backend (PATCH /auth/profile)
  Future<bool> updateUserProfile({String? avatarUrl, String? name, String? phone}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/profile');
    try {
      final Map<String, dynamic> body = {};
      if (avatarUrl != null) body['avatarUrl'] = avatarUrl;
      if (name != null) body['name'] = name;
      if (phone != null) body['phone'] = phone;

      final response = await _client.patch(
        url,
        headers: UserSession.headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        if (avatarUrl != null) {
          await UserSession.setProfileImagePath(avatarUrl);
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Change user password (PATCH /auth/change-password)
  Future<bool> changePassword(String newPassword, String confirmPassword) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/change-password');
    try {
      final response = await _client.patch(
        url,
        headers: UserSession.headers,
        body: jsonEncode({
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

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
