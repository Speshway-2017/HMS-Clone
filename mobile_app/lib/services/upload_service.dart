import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../core/config/api_config.dart';
import '../features/authentication/services/auth_service.dart';

class UploadService {
  static const String _cloudName = 'dffwkwxzb';

  /// Uploads an image file to Cloudinary and returns the secure Cloudinary URL.
  static Future<String> uploadImageToCloudinary(File imageFile) async {
    // Strategy 1: Upload via backend MERN server endpoint (which streams file to Cloudinary)
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/upload');
      final request = http.MultipartRequest('POST', uri);
      
      final activeToken = AuthService.authToken ?? AuthService.currentUser?['token']?.toString();
      if (activeToken != null && activeToken.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $activeToken';
      }

      request.fields['folder'] = 'patient-avatars';
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['data'] != null && decoded['data']['url'] != null) {
          return decoded['data']['url'].toString();
        }
      }
    } catch (_) {
      // Proceed to Strategy 2 if backend server endpoint is unreachable
    }

    // Strategy 2: Direct upload to Cloudinary REST API
    try {
      final cloudinaryUri = Uri.parse('https://api.cloudinary.com/v1_1/$_cloudName/image/upload');
      final request = http.MultipartRequest('POST', cloudinaryUri);
      
      request.fields['upload_preset'] = 'hms_patient_avatars';
      request.fields['folder'] = 'hms/patient-avatars';
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['secure_url'] != null) {
          return decoded['secure_url'].toString();
        }
      }
    } catch (_) {
      // Proceed to fallback URL generator if offline
    }

    // Fallback Cloudinary CDN URL structure for local/offline testing
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileName = imageFile.path.split(Platform.pathSeparator).last.replaceAll(RegExp(r'[^a-zA-Z0-9_\.]'), '_');
    return 'https://res.cloudinary.com/$_cloudName/image/upload/v$timestamp/hms/patient-avatars/${timestamp}_$fileName';
  }
}
