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
    final urls = [
      Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/today'),
      Uri.parse('${ApiConfig.baseUrl}/appointments?dateMode=today'),
      Uri.parse('${ApiConfig.baseUrl}/appointments'),
    ];

    for (final url in urls) {
      try {
        final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          List items = [];
          if (decoded['data'] != null) {
            if (decoded['data'] is List) {
              items = decoded['data'];
            } else if (decoded['data'] is Map) {
              if (decoded['data']['appointments'] is List) {
                items = decoded['data']['appointments'];
              } else if (decoded['data']['items'] is List) {
                items = decoded['data']['items'];
              } else if (decoded['data']['data'] is List) {
                items = decoded['data']['data'];
              }
            }
          } else if (decoded['items'] is List) {
            items = decoded['items'];
          }

          if (items.isNotEmpty) {
            return items.map((item) => Map<String, dynamic>.from(item)).toList();
          }
        }
      } catch (_) {}
    }
    return [];
  }

  /// Fetches live OP patient queue strictly from backend API
  Future<List<Map<String, dynamic>>> fetchQueue() async {
    final urls = [
      Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/queue'),
      Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/today'),
      Uri.parse('${ApiConfig.baseUrl}/appointments?dateMode=today'),
    ];

    for (final url in urls) {
      try {
        final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          List items = [];
          if (decoded['data'] != null) {
            if (decoded['data'] is List) {
              items = decoded['data'];
            } else if (decoded['data'] is Map) {
              if (decoded['data']['queue'] is List) {
                items = decoded['data']['queue'];
              } else if (decoded['data']['tokens'] is List) {
                items = decoded['data']['tokens'];
              } else if (decoded['data']['appointments'] is List) {
                items = decoded['data']['appointments'];
              } else if (decoded['data']['items'] is List) {
                items = decoded['data']['items'];
              }
            }
          }

          if (items.isNotEmpty) {
            return items.map((item) => Map<String, dynamic>.from(item)).toList();
          }
        }
      } catch (_) {}
    }
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

  /// Search pharmacy inventory medicines with suggestions & strength
  Future<List<Map<String, dynamic>>> searchPharmacyInventory(String query) async {
    if (query.trim().isEmpty) return [];
    final url = Uri.parse('${ApiConfig.baseUrl}/inventory?category=medicines&search=${Uri.encodeComponent(query.trim())}');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] is List) {
          return (decoded['data'] as List).map((i) => Map<String, dynamic>.from(i)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// Complete consultation session for an appointment
  Future<Map<String, dynamic>> completeConsultation({
    required String appointmentId,
    required String diagnosis,
    required String clinicalNotes,
    String chiefComplaint = '',
    String symptoms = '',
    String advice = '',
    Map<String, dynamic> vitals = const {},
    List<Map<String, dynamic>> medicines = const [],
    List<String> labTests = const [],
    List<String> radiologyTests = const [],
    bool recommendIp = false,
    Map<String, dynamic> ipRecommendation = const {},
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/$appointmentId/complete');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'diagnosis': diagnosis,
          'notes': clinicalNotes,
          'clinicalNotes': clinicalNotes,
          'chiefComplaint': chiefComplaint,
          'symptoms': symptoms,
          'advice': advice,
          'vitals': vitals,
          'medications': medicines,
          'medicines': medicines,
          'labOrders': labTests,
          'labTests': labTests,
          'radiologyOrders': radiologyTests,
          'radiologyTests': radiologyTests,
          'recommendIp': recommendIp,
          'ipRecommendation': ipRecommendation,
        }),
      ).timeout(const Duration(seconds: 12));

      final decoded = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'message': decoded['message'] ?? 'Consultation completed successfully.'};
      } else {
        return {'success': false, 'message': decoded['message'] ?? decoded['error'] ?? 'Server error (${response.statusCode})'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Recommend IP Admission for an appointment with full form fields
  Future<bool> recommendAdmission({
    required String appointmentId,
    required String primaryDiagnosis,
    String priority = 'Routine',
    String preferredWard = 'General Ward',
    String preferredBedType = 'General',
    String expectedStay = '',
    String clinicalNotes = '',
    String admissionReason = '',
    String specialInstructions = '',
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
          'preferredBedType': preferredBedType,
          'expectedStay': expectedStay,
          'clinicalNotes': clinicalNotes,
          'admissionReason': admissionReason,
          'specialInstructions': specialInstructions,
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

  /// Prescribe IP Lab Orders (Pathology)
  Future<bool> addInpatientLabOrders(String admissionId, List<String> tests, {String priority = 'Routine'}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/lab-orders');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({'tests': tests, 'priority': priority}),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Prescribe IP Radiology Orders (Imaging)
  Future<bool> addInpatientRadiologyOrders(String admissionId, List<String> scans, {String priority = 'Routine', String notes = ''}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/radiology-orders');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({'scans': scans, 'priority': priority, 'notes': notes}),
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

  /// Fetches complete details of an Inpatient admission (vitals history, notes, medications, timeline)
  Future<Map<String, dynamic>?> fetchInpatientDetails(String admissionId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/details');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null) {
          return Map<String, dynamic>.from(decoded['data']);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Save Inpatient Vitals (Temp, BP, Pulse, Resp Rate, SpO2, Weight)
  Future<bool> saveInpatientVitals(String admissionId, Map<String, dynamic> vitalsData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/vitals');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode(vitalsData),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Add new Inpatient Medication Order
  Future<bool> addInpatientMedication(String admissionId, Map<String, dynamic> medicationData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/medications');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode(medicationData),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Update / Stop / Resume Inpatient Medication Order
  Future<bool> updateInpatientMedication(String admissionId, Map<String, dynamic> updateData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/inpatients/$admissionId/medications');
    try {
      final response = await _client.put(
        url,
        headers: _headers,
        body: jsonEncode(updateData),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Create Radiology Order for Outpatient consultation
  Future<bool> createRadiologyOrder(String appointmentId, Map<String, dynamic> radiologyData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/appointments/$appointmentId/radiology');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode(radiologyData),
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Fetch existing active Wards configured in hospital
  Future<List<Map<String, dynamic>>> fetchExistingWards() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/wards?limit=100');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        List items = [];
        if (decoded['data'] != null) {
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['wards'] is List) {
            items = decoded['data']['wards'];
          }
        }
        return items.map((i) => Map<String, dynamic>.from(i)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetch existing active Beds configured in hospital
  Future<List<Map<String, dynamic>>> fetchExistingBeds() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/beds?limit=100');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        List items = [];
        if (decoded['data'] != null) {
          if (decoded['data'] is List) {
            items = decoded['data'];
          } else if (decoded['data']['beds'] is List) {
            items = decoded['data']['beds'];
          }
        }
        return items.map((i) => Map<String, dynamic>.from(i)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Start or initialize a draft consultation session
  Future<Map<String, dynamic>?> startConsultationSession(String appointmentId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/consultations/start');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({'appointmentId': appointmentId}),
      ).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data'] is Map) {
          return Map<String, dynamic>.from(decoded['data']);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Fetch draft consultation session for an appointment
  Future<Map<String, dynamic>?> fetchConsultationDraft(String appointmentId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/consultations/$appointmentId/draft');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data'] is Map) {
          return Map<String, dynamic>.from(decoded['data']);
        }
      }
    } catch (_) {}
    return null;
  }

  /// Auto-save / update draft consultation session
  Future<bool> updateConsultationDraft(String consultationId, Map<String, dynamic> draftData) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/consultations/$consultationId/draft');
    try {
      final response = await _client.put(
        url,
        headers: _headers,
        body: jsonEncode(draftData),
      ).timeout(const Duration(seconds: 8));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch full medical history & previous prescriptions of a patient
  Future<Map<String, dynamic>?> fetchPatientHistory(String patientId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/doctor-dashboard/my-patients/$patientId');
    try {
      final response = await _client.get(url, headers: _headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data'] is Map) {
          return Map<String, dynamic>.from(decoded['data']);
        }
      }
    } catch (_) {}
    return null;
  }
}

