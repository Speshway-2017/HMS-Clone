import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../authentication/services/auth_service.dart';

class NurseService {
  final http.Client _client;

  NurseService({http.Client? client}) : _client = client ?? http.Client();

  Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Lists all active inpatients/admissions in the nurse's hospital
  Future<List<dynamic>> getInpatients() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'] ?? [];
      } else {
        final message = decoded['message'] ?? 'Failed to load inpatients.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error loading patient list: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Fetches detailed clinical info for a specific admission
  Future<dynamic> getInpatientDetails(String admissionId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients/$admissionId/details');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'];
      } else {
        final message = decoded['message'] ?? 'Failed to load admission details.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error loading admission details: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Records vitals for a specific admission
  Future<dynamic> recordVitals({
    required String admissionId,
    required String bp,
    required String pulse,
    required String spo2,
    required String temp,
    String weight = "",
    String respRate = "",
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients/$admissionId/vitals');
    final headers = await _getHeaders();
    final body = jsonEncode({
      'temperature': temp,
      'bloodPressure': bp,
      'pulseRate': pulse,
      'respiratoryRate': respRate,
      'oxygenSaturation': spo2,
      'weight': weight,
    });

    try {
      final response = await _client.post(url, headers: headers, body: body).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'];
      } else {
        final message = decoded['message'] ?? 'Failed to record vitals.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error saving vitals: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Marks a specific medication order as administered
  Future<dynamic> administerMedication({
    required String admissionId,
    required String medicationId,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients/$admissionId/medications/$medicationId/administer');
    final headers = await _getHeaders();

    try {
      final response = await _client.post(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'];
      } else {
        final message = decoded['message'] ?? 'Failed to administer medication.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error updating medication status: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Logs fluid intake and output
  Future<dynamic> logFluid({
    required String admissionId,
    required String intakeVolume,
    required String intakeRoute,
    required String outputVolume,
    required String outputType,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients/$admissionId/fluid-logs');
    final headers = await _getHeaders();
    final body = jsonEncode({
      'intakeVolume': intakeVolume,
      'intakeRoute': intakeRoute,
      'outputVolume': outputVolume,
      'outputType': outputType,
    });

    try {
      final response = await _client.post(url, headers: headers, body: body).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'];
      } else {
        final message = decoded['message'] ?? 'Failed to log fluid info.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error logging fluid: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Lists all active nurses in the hospital
  Future<List<dynamic>> getNurses() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/nurses');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'] ?? [];
      } else {
        final message = decoded['message'] ?? 'Failed to load nurses.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error loading nurse list: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }
  /// Lists all active wards in the hospital
  Future<List<dynamic>> getWards() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/wards');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        final data = decoded['data'];
        if (data is Map && data.containsKey('wards')) {
          return data['wards'] ?? [];
        } else if (data is List) {
          return data;
        }
        return [];
      } else {
        final message = decoded['message'] ?? 'Failed to load wards.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error loading wards: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Lists all beds in the hospital with ward, room, and patient details
  Future<List<dynamic>> getBeds({String? wardId}) async {
    final query = wardId != null && wardId.isNotEmpty ? '?ward=$wardId&limit=100' : '?limit=100';
    final url = Uri.parse('${ApiConfig.baseUrl}/beds$query');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        final data = decoded['data'];
        if (data is Map && data.containsKey('beds')) {
          return data['beds'] ?? [];
        } else if (data is List) {
          return data;
        }
        return [];
      } else {
        final message = decoded['message'] ?? 'Failed to load beds.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error loading beds: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  /// Lists all rooms in the hospital with ward and category details
  Future<List<dynamic>> getRooms({String? wardId}) async {
    final query = wardId != null && wardId.isNotEmpty ? '?ward=$wardId&limit=100' : '?limit=100';
    final url = Uri.parse('${ApiConfig.baseUrl}/rooms$query');
    final headers = await _getHeaders();

    try {
      final response = await _client.get(url, headers: headers).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        final data = decoded['data'];
        if (data is Map && data.containsKey('rooms')) {
          return data['rooms'] ?? [];
        } else if (data is List) {
          return data;
        }
        return [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Sends a nursing note / observation to the patient's attending doctor in the database
  Future<dynamic> sendNursingNoteToDoctor({
    required String admissionId,
    required String patientId,
    required String observation,
    String status = "Routine",
    String bp = "",
    String pulse = "",
    String spo2 = "",
    String temp = "",
    String notes = "",
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/inpatients/$patientId/vitals');
    final headers = await _getHeaders();
    final body = jsonEncode({
      'temperature': temp,
      'bloodPressure': bp,
      'pulseRate': pulse,
      'oxygenSaturation': spo2,
      'observationNotes': 'Nursing Note [$status]: $observation. ${notes.isNotEmpty ? "Notes: $notes" : ""}',
    });

    try {
      final response = await _client.post(url, headers: headers, body: body).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);
      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded['data'];
      }
    } catch (_) {}
    return null;
  }

  /// Sends an emergency alert directly to the patient's consulting doctor
  Future<dynamic> sendEmergencyAlert({
    required String patientId,
    required String alertType,
    String notes = "",
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/nurse/emergency-alert');
    final headers = await _getHeaders();
    final body = jsonEncode({
      'patientId': patientId,
      'alertType': alertType,
      'notes': notes,
    });

    try {
      final response = await _client.post(url, headers: headers, body: body).timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);

      if (response.statusCode == 200 && decoded['status'] == 'success') {
        return decoded;
      } else {
        final message = decoded['message'] ?? 'Failed to send emergency alert.';
        throw Exception(message);
      }
    } on SocketException {
      throw Exception('Unable to connect to the server. Please check your network connection.');
    } catch (e) {
      throw Exception('Error sending emergency alert: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }
}
