import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../services/admin_api_service.dart';

class AdminProfileScreen extends StatefulWidget {
  const AdminProfileScreen({super.key});

  @override
  State<AdminProfileScreen> createState() => _AdminProfileScreenState();
}

class _AdminProfileScreenState extends State<AdminProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isSavingPassword = false;

  final ImagePicker _picker = ImagePicker();
  final AdminApiService _apiService = AdminApiService();

  @override
  void initState() {
    super.initState();
    _syncProfileFromWeb();
  }

  Future<void> _syncProfileFromWeb() async {
    final user = await _apiService.fetchUserProfile();
    if (user != null && mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _pickProfileImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image != null) {
        final localFile = File(image.path);
        // Instant local UI preview
        await UserSession.setProfileImagePath(image.path);
        if (!mounted) return;
        setState(() {});

        // Upload to backend/Cloudinary & sync with MongoDB for Web App parity
        final uploadedUrl = await _apiService.uploadImage(localFile);
        if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
          await _apiService.updateUserProfile(avatarUrl: uploadedUrl);
        } else {
          // If direct upload returned local path, sync to profile endpoint
          await _apiService.updateUserProfile(avatarUrl: image.path);
        }

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: AppColors.emerald400, size: 18),
                SizedBox(width: 10),
                Text('Profile photo updated & synced with Web App!'),
              ],
            ),
            backgroundColor: AppColors.navy900,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to pick profile image.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  Future<void> _removeProfileImage() async {
    await UserSession.setProfileImagePath(null);
    await _apiService.updateUserProfile(avatarUrl: "");
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.delete_outline_rounded, color: Colors.white, size: 18),
            SizedBox(width: 10),
            Text('Profile photo removed & synced with Web App.'),
          ],
        ),
        backgroundColor: AppColors.navy700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Admin Profile Photo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                const SizedBox(height: 14),
                ListTile(
                  leading: const Icon(Icons.photo_camera_rounded, color: AppColors.navy700),
                  title: const Text('Take Photo (Camera)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickProfileImage(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library_rounded, color: AppColors.navy700),
                  title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickProfileImage(ImageSource.gallery);
                  },
                ),
                if (UserSession.profileImagePath != null && UserSession.profileImagePath!.isNotEmpty) ...[
                  ListTile(
                    leading: const Icon(Icons.delete_outline_rounded, color: AppColors.errorRed),
                    title: const Text('Remove Current Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.errorRed)),
                    onTap: () {
                      Navigator.pop(ctx);
                      _removeProfileImage();
                    },
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _handlePasswordChange() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSavingPassword = true;
    });

    final success = await _apiService.changePassword(
      _newPasswordController.text,
      _confirmPasswordController.text,
    );

    if (!mounted) return;
    setState(() {
      _isSavingPassword = false;
      if (success) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      }
    });

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: AppColors.emerald400, size: 18),
              SizedBox(width: 10),
              Text('Admin security password updated successfully!'),
            ],
          ),
          backgroundColor: AppColors.navy900,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
              SizedBox(width: 10),
              Text('Failed to update password. Please check input.'),
            ],
          ),
          backgroundColor: AppColors.errorRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.logout_rounded, color: AppColors.errorRed),
              SizedBox(width: 10),
              Text(
                'Sign Out Admin',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
            ],
          ),
          content: const Text(
            'Are you sure you want to end your System Admin session?',
            style: TextStyle(fontSize: 12, color: AppColors.slate600),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel', style: TextStyle(color: AppColors.slate600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.errorRed,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Log Out', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );

    if (confirm == true && mounted) {
      await UserSession.clear();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final String adminName = UserSession.userName.isNotEmpty ? UserSession.userName : 'System Admin';
    final String adminEmail = UserSession.userEmail.isNotEmpty ? UserSession.userEmail : 'admin@hospital.org';
    final String hospitalName = UserSession.user?['hospitalName'] ?? 'Sunrise Hospital Network';

    final String? profilePath = UserSession.profileImagePath;
    ImageProvider? avatarImg;
    if (profilePath != null && profilePath.isNotEmpty) {
      if (profilePath.startsWith('http://') || profilePath.startsWith('https://')) {
        avatarImg = NetworkImage(profilePath);
      } else if (File(profilePath).existsSync()) {
        avatarImg = FileImage(File(profilePath));
      }
    }
    final bool hasCustomPhoto = avatarImg != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Admin Profile & Settings',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Profile Card with Photo CRUD Actions
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.navy800, AppColors.navy950],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Avatar with edit badge
                      GestureDetector(
                        onTap: _showImagePickerOptions,
                        child: Stack(
                          children: [
                            CircleAvatar(
                              radius: 32,
                              backgroundColor: Colors.white.withOpacity(0.25),
                              backgroundImage: avatarImg,
                              child: avatarImg == null
                                  ? Text(
                                      adminName.isNotEmpty ? adminName[0].toUpperCase() : 'A',
                                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white),
                                    )
                                  : null,
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: AppColors.emerald500,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.camera_alt_rounded, size: 12, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              adminName,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              adminEmail,
                              style: TextStyle(fontSize: 12, color: AppColors.navy100.withOpacity(0.8)),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'SUPER ADMINISTRATOR',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.emerald400, letterSpacing: 0.5),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(color: Colors.white.withOpacity(0.3)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          onPressed: _showImagePickerOptions,
                          icon: const Icon(Icons.photo_camera_rounded, size: 16),
                          label: Text(hasCustomPhoto ? 'Change Photo' : 'Add Profile Photo', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      if (hasCustomPhoto) ...[
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red.shade300,
                            side: BorderSide(color: Colors.red.shade300.withOpacity(0.4)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          ),
                          onPressed: _removeProfileImage,
                          icon: const Icon(Icons.delete_outline_rounded, size: 16),
                          label: const Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Account & Network Information Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Hospital Network Info', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                  const SizedBox(height: 12),
                  _buildProfileInfoRow(Icons.local_hospital_rounded, 'Assigned Hospital', hospitalName),
                  _buildProfileInfoRow(Icons.email_outlined, 'Registered Email', adminEmail),
                  _buildProfileInfoRow(Icons.verified_user_outlined, 'Access Permissions', 'Full System Admin & Branch Oversight'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Change Password Section
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Change Security Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    const Text('Update your system administrator password securely.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    // Current Password
                    TextFormField(
                      controller: _currentPasswordController,
                      obscureText: _obscureCurrent,
                      decoration: InputDecoration(
                        labelText: 'Current Password',
                        suffixIcon: IconButton(
                          icon: Icon(_obscureCurrent ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                          onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                        ),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Please enter current password' : null,
                    ),
                    const SizedBox(height: 12),

                    // New Password
                    TextFormField(
                      controller: _newPasswordController,
                      obscureText: _obscureNew,
                      decoration: InputDecoration(
                        labelText: 'New Security Password',
                        suffixIcon: IconButton(
                          icon: Icon(_obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                          onPressed: () => setState(() => _obscureNew = !_obscureNew),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Please enter new password';
                        if (val.length < 6) return 'Password must be at least 6 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Confirm Password
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirm,
                      decoration: InputDecoration(
                        labelText: 'Confirm New Password',
                        suffixIcon: IconButton(
                          icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                          onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                        ),
                      ),
                      validator: (val) {
                        if (val != _newPasswordController.text) return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy700,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _isSavingPassword ? null : _handlePasswordChange,
                        child: _isSavingPassword
                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Update Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),

            // SIGN OUT BUTTON AT THE BOTTOM
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFEE2E2),
                foregroundColor: AppColors.errorRed,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: Color(0xFFFCA5A5)),
                ),
              ),
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout_rounded, color: AppColors.errorRed, size: 20),
              label: const Text(
                'Log Out Admin Account',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.errorRed),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.navy700),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
