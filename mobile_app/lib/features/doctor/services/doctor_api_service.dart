import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../../core/config/user_session.dart';

class DoctorApiService {
  final http.Client _client;

  DoctorApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Gets authorization headers for API requests
  Map<String, String> get _headers => UserSession.headers;

  /// Fetches doctor dashboard metrics (appointments, queue, inpatients count) strictly from backend API
  Future<Map<String, dynamic>> fetchMetrics() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/metrics');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          return Map<String, dynamic>.from(decoded['data']);
        }
      }
    } catch (_) {}
    return {
      'todayAppointments': 0,
      'inQueue': 0,
      'completedToday': 0,
      'inpatientsCount': 0,
      'pendingLabOrders': 0,
    };
  }

  /// Fetches today's appointments list for the doctor strictly from backend API
  Future<List<Map<String, dynamic>>> fetchTodayAppointments() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/today');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['appointments'] is List) {
            items = decoded['data']['appointments'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Fetches live OP patient queue strictly from backend API
  Future<List<Map<String, dynamic>>> fetchQueue() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/queue');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['queue'] is List) {
            items = decoded['data']['queue'];
          } else if (decoded['data']['tokens'] is List) {
            items = decoded['data']['tokens'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Call patient token in queue
  Future<bool> callPatient(String queueId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/queue/$queueId/call');
    try {
      final response = await _client.post(url, headers: _headers).timeout(const Duration(seconds: 8));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Skip patient in queue
  Future<bool> skipPatient(String queueId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/queue/$queueId/skip');
    try {
      final response = await _client.post(url, headers: _headers).timeout(const Duration(seconds: 8));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Mark patient as no-show in queue
  Future<bool> markNoShow(String queueId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/queue/$queueId/noshow');
    try {
      final response = await _client.post(url, headers: _headers).timeout(const Duration(seconds: 8));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetches inpatients list assigned to this doctor strictly from backend API
  Future<List<Map<String, dynamic>>> fetchInpatients() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['inpatients'] is List) {
            items = decoded['data']['inpatients'];
          } else if (decoded['data']['admissions'] is List) {
            items = decoded['data']['admissions'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Fetches completed consultations history strictly from backend API
  Future<List<Map<String, dynamic>>> fetchCompletedConsultations() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/consultations/completed');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['consultations'] is List) {
            items = decoded['data']['consultations'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Fetches issued prescriptions list strictly from backend API
  Future<List<Map<String, dynamic>>> fetchPrescriptions() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/prescriptions');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['prescriptions'] is List) {
            items = decoded['data']['prescriptions'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Creates a new prescription in backend database
  Future<bool> createPrescription(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/prescriptions');
    try {
      final response = await _client.post(url, headers: _headers, body: jsonEncode(data)).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Fetches lab orders issued by doctor strictly from backend API
  Future<List<Map<String, dynamic>>> fetchLabOrders() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/my-lab-orders');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['orders'] is List) {
            items = decoded['data']['orders'];
          } else if (decoded['data']['labOrders'] is List) {
            items = decoded['data']['labOrders'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Creates a new lab order in backend database
  Future<bool> createLabOrder(Map<String, dynamic> data) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/laboratory');
    try {
      final response = await _client.post(url, headers: _headers, body: jsonEncode(data)).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Fetches radiology orders list strictly from backend API
  Future<List<Map<String, dynamic>>> fetchRadiologyOrders() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/radiology/list');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['radiologyOrders'] is List) {
            items = decoded['data']['radiologyOrders'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Fetches my patients list strictly from backend API
  Future<List<Map<String, dynamic>>> fetchMyPatients() async {
    final urls = [
      Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/my-patients'),
      Uri.parse('${ApiConfig.baseUrl}/doctors/dashboard/my-patients'),
    ];

    for (final url in urls) {
      try {
        final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded['data'] != null) {
            List items = [];
            if (decoded['data'] is List) {
              items = decoded['data'];
            } else if (decoded['data']['patients'] is List) {
              items = decoded['data']['patients'];
            }
            if (items.isNotEmpty) {
              return items.map((item) => Map<String, dynamic>.from(item)).toList();
            }
          }
        }
      } catch (_) {}
    }
    return [];
  }

  /// Fetches single patient record details and full history by ID
  Future<Map<String, dynamic>?> fetchMyPatientById(String patientId) async {
    final urls = [
      Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/my-patients/$patientId'),
      Uri.parse('${ApiConfig.baseUrl}/doctors/dashboard/my-patients/$patientId'),
    ];

    for (final url in urls) {
      try {
        final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 10));
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded['status'] == 'success' && decoded['data'] != null) {
            return Map<String, dynamic>.from(decoded['data']);
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Fetches logged-in doctor profile details from backend API
  Future<Map<String, dynamic>?> fetchMyProfile() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctors/me');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data']['doctor'] != null) {
          return Map<String, dynamic>.from(decoded['data']['doctor']);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Updates logged-in doctor profile, availability, OP expiry limit, photo, etc.
  Future<bool> updateMyProfile(Map<String, dynamic> payload) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctors/me');
    try {
      final response = await _client.patch(
        url,
        headers: _headers,
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Change password for logged-in doctor user
  Future<Map<String, dynamic>> changePassword({required String newPassword, required String confirmPassword}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/auth/change-password');
    try {
      final response = await _client.patch(
        url,
        headers: _headers,
        body: jsonEncode({
          'newPassword': newPassword,
          'confirmPassword': confirmPassword,
        }),
      ).timeout(const Duration(seconds: 8));
      
      final decoded = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': decoded['data']?['message'] ?? 'Password changed successfully.'};
      } else {
        return {'success': false, 'message': decoded['message'] ?? 'Failed to change password.'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error. Please try again.'};
    }
  }

  /// Fetches notifications targeted to doctor strictly from backend API
  Future<List<Map<String, dynamic>>> fetchNotifications() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/notifications');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['notifications'] is List) {
            items = decoded['data']['notifications'];
          }
          return items.map((item) => Map<String, dynamic>.from(item)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Complete consultation session for an appointment
  Future<bool> completeConsultation({
    required String appointmentId,
    required String diagnosis,
    required String clinicalNotes,
    List<Map<String, dynamic>> medicines = const [],
    List<String> labTests = const [],
    bool recommendIp = false,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/$appointmentId/complete');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'diagnosis': diagnosis,
          'notes': clinicalNotes,
          'medicines': medicines,
          'labTests': labTests,
          'recommendIp': recommendIp,
        }),
      ).timeout(const Duration(seconds: 12));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Recommend IP Admission for an appointment
  Future<bool> recommendAdmission({
    required String appointmentId,
    required String primaryDiagnosis,
    String priority = 'Routine',
    String preferredWard = 'General Ward',
    String clinicalNotes = '',
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/$appointmentId/admission');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'primaryDiagnosis': primaryDiagnosis,
          'priority': priority,
          'preferredWard': preferredWard,
          'clinicalNotes': clinicalNotes,
        }),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Save Inpatient Clinical Notes
  Future<bool> addInpatientNotes(String admissionId, String notes) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/notes');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({'notes': notes}),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Finalize IP Discharge
  Future<bool> finalizeDischarge(String admissionId, Map<String, dynamic> dischargeSummary) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/admissions/$admissionId/finalize-discharge');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode(dischargeSummary),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
