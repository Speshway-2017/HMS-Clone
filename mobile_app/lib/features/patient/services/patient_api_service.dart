import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../../core/config/user_session.dart';

class PatientApiService {
  final http.Client _client;

  PatientApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Fetches logged-in patient profile & medical history from MERN backend
  Future<Map<String, dynamic>?> fetchPatientProfile() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/patients/me');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          return decoded['data']['patient'] as Map<String, dynamic>?;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Fetches real appointments for this patient from MERN backend
  Future<List<Map<String, dynamic>>> fetchAppointments() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/appointments');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['appointments'] is List) {
            items = decoded['data']['appointments'];
          } else if (decoded['data']['data'] is List) {
            items = decoded['data']['data'];
          }
          return items.map((item) => item as Map<String, dynamic>).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetches real prescriptions for this patient from MERN backend
  Future<List<Map<String, dynamic>>> fetchPrescriptions() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/prescriptions/patient');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['prescriptions'] is List) {
            items = decoded['data']['prescriptions'];
          }
          return items.map((item) => item as Map<String, dynamic>).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetches diagnostic/lab reports for this patient from MERN backend
  Future<List<Map<String, dynamic>>> fetchDiagnosticReports() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/diagnostic-reports');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['reports'] is List) {
            items = decoded['data']['reports'];
          }
          return items.map((item) => item as Map<String, dynamic>).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetches registered hospital doctors from MERN backend
  Future<List<Map<String, dynamic>>> fetchDoctors() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctors');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['doctors'] is List) {
            items = decoded['data']['doctors'];
          } else if (decoded['data']['data'] is List) {
            items = decoded['data']['data'];
          }
          return items.map((item) => item as Map<String, dynamic>).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetches real hospital invoices for this patient from MERN backend (GET /invoices)
  Future<List<Map<String, dynamic>>> fetchInvoices() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/invoices');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          List items = [];
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['invoices'] is List) {
            items = decoded['data']['invoices'];
          } else if (decoded['data']['data'] is List) {
            items = decoded['data']['data'];
          }
          return items.map((item) => item as Map<String, dynamic>).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Submits payment for a patient invoice in MERN backend (POST /reception/billing/collect-payment)
  Future<bool> payInvoice({required String invoiceId, required double amount, String paymentMethod = 'UPI / Online'}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/reception/billing/collect-payment');
    try {
      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode({
          'invoiceId': invoiceId,
          'amount': amount,
          'paymentMethod': paymentMethod,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(response.body);
        return decoded['status'] == 'success';
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Books an appointment slot with a doctor in the MERN backend database
  /// Books a new consultation appointment in MERN backend (POST /appointments)
  Future<Map<String, dynamic>> bookAppointment({
    required String doctorId,
    required String date,
    required String time,
    String? type,
    String? reason,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/appointments');
    try {
      String typeToSend = 'Appointment';
      if (type != null && (type.toLowerCase().contains('video') || type.toLowerCase().contains('online'))) {
        typeToSend = 'Video Consultation';
      }

      final payload = <String, dynamic>{
        'doctor': doctorId,
        'date': date,
        'time': time,
        'type': typeToSend,
        'reason': reason ?? 'General OPD Consultation',
      };

      final pId = UserSession.patientId;
      if (pId != null && pId.isNotEmpty) {
        payload['patient'] = pId;
      }

      final response = await _client.post(
        url,
        headers: UserSession.headers,
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 15));

      final decoded = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'message': 'Appointment booked successfully!'};
      } else {
        final serverMsg = decoded['message'] ?? 'Failed to book appointment. Please try again.';
        return {'success': false, 'message': serverMsg};
      }
    } catch (_) {
      return {'success': false, 'message': 'Network timeout or server error. Please try again.'};
    }
  }

  /// Updates logged-in patient profile details in MERN backend (PATCH /patients/me)
  Future<Map<String, dynamic>?> updatePatientProfile(Map<String, dynamic> updateData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/patients/me');
    try {
      final response = await _client.patch(
        url,
        headers: UserSession.headers,
        body: jsonEncode(updateData),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null) {
          return decoded['data']['patient'] as Map<String, dynamic>?;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Uploads photo file bytes to Cloudinary via MERN backend /uploads endpoint or direct Cloudinary REST API
  Future<String?> uploadImageToCloudinary(List<int> bytes, String filename) async {
    final base64Str = 'data:image/jpeg;base64,${base64Encode(bytes)}';
    final backendUrl = Uri.parse('${ApiConfig.baseUrl}/uploads');

    // 1. Try Backend Base64 JSON Upload (/api/v1/uploads)
    try {
      final response = await _client.post(
        backendUrl,
        headers: UserSession.headers,
        body: jsonEncode({
          'file': base64Str,
          'folder': 'patient-photos',
        }),
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null && decoded['data']['url'] != null) {
          return decoded['data']['url'] as String;
        }
      }
    } catch (_) {
      // Proceed to Multipart request fallback
    }

    // 2. Try Backend Multipart File Upload (/api/v1/uploads)
    try {
      final request = http.MultipartRequest('POST', backendUrl);
      final headers = UserSession.headers;
      headers.forEach((key, value) {
        if (key.toLowerCase() != 'content-type') {
          request.headers[key] = value;
        }
      });
      request.fields['folder'] = 'patient-photos';
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename.isNotEmpty ? filename : 'patient_profile.jpg',
        ),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(response.body);
        if (decoded['status'] == 'success' && decoded['data'] != null && decoded['data']['url'] != null) {
          return decoded['data']['url'] as String;
        }
      }
    } catch (_) {
      // Proceed to Cloudinary direct fallback
    }

    // 3. Direct Cloudinary REST API Fallback
    try {
      final cloudUrl = Uri.parse('https://api.cloudinary.com/v1_1/dffwkwxzb/image/upload');
      final cloudReq = http.MultipartRequest('POST', cloudUrl);
      cloudReq.fields['upload_preset'] = 'ml_default';
      cloudReq.fields['folder'] = 'hms/patient-photos';
      cloudReq.files.add(
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename.isNotEmpty ? filename : 'patient_profile.jpg',
        ),
      );

      final cloudStream = await cloudReq.send().timeout(const Duration(seconds: 25));
      final cloudRes = await http.Response.fromStream(cloudStream);

      if (cloudRes.statusCode == 200 || cloudRes.statusCode == 201) {
        final decoded = jsonDecode(cloudRes.body);
        if (decoded['secure_url'] != null) {
          return decoded['secure_url'] as String;
        }
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  /// Fetches booked time slots for a doctor on a given date from MERN backend (GET /appointments/available-slots)
  Future<List<String>> fetchBookedSlots({required String doctorId, required String date}) async {
    if (doctorId.isEmpty || date.isEmpty) return [];
    final url = Uri.parse('${ApiConfig.baseUrl}/appointments/available-slots?doctorId=$doctorId&date=$date');
    try {
      final response = await _client.get(
        url,
        headers: UserSession.headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data']['bookedSlots'] is List) {
          return (decoded['data']['bookedSlots'] as List).map((s) => s.toString()).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
