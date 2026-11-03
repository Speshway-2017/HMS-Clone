import '../../legal/widgets/permission_disclosure_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../authentication/services/auth_service.dart';
import '../services/patient_api_service.dart';

class PatientProfileScreen extends StatefulWidget {
  const PatientProfileScreen({super.key});

  @override
  State<PatientProfileScreen> createState() => _PatientProfileScreenState();
}

class _PatientProfileScreenState extends State<PatientProfileScreen> {
  final PatientApiService _apiService = PatientApiService();
  final ImagePicker _picker = ImagePicker();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingPhoto = false;

  Map<String, dynamic>? _patientProfile;

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _ageController;
  late TextEditingController _addressController;
  late TextEditingController _allergiesController;
  late TextEditingController _insProviderController;
  late TextEditingController _insPolicyController;
  late TextEditingController _avatarUrlController;

  // Nominee / Emergency Contact Controllers
  late TextEditingController _nomineeNameController;
  late TextEditingController _nomineePhoneController;

  // Dropdown States
  String _selectedGender = 'Male';
  String _selectedBloodGroup = 'O+';
  String _selectedNomineeRelation = 'Parent';
  int _selectedAvatarIndex = 0;

  final List<String> _genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  final List<String> _bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  final List<String> _nomineeRelationOptions = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];

  final List<IconData> _avatarIcons = [
    Icons.person_rounded,
    Icons.face_rounded,
    Icons.account_circle_rounded,
    Icons.face_retouching_natural_rounded,
    Icons.sentiment_very_satisfied_rounded,
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _ageController = TextEditingController();
    _addressController = TextEditingController();
    _allergiesController = TextEditingController();
    _insProviderController = TextEditingController();
    _insPolicyController = TextEditingController();
    _avatarUrlController = TextEditingController();
    _nomineeNameController = TextEditingController();
    _nomineePhoneController = TextEditingController();

    _loadProfileData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _ageController.dispose();
    _addressController.dispose();
    _allergiesController.dispose();
    _insProviderController.dispose();
    _insPolicyController.dispose();
    _avatarUrlController.dispose();
    _nomineeNameController.dispose();
    _nomineePhoneController.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    setState(() {
      _isLoading = true;
    });

    final profile = await _apiService.fetchPatientProfile();

    if (mounted) {
      setState(() {
        _patientProfile = profile;
        _nameController.text = profile?['name'] ?? UserSession.userName;
        _emailController.text = profile?['email'] ?? UserSession.userEmail;
        _phoneController.text = profile?['phone'] ?? '';
        _ageController.text = profile?['age']?.toString() ?? '';
        _addressController.text = profile?['address'] ?? '';
        _allergiesController.text = profile?['allergies'] ?? '';
        _insProviderController.text = profile?['insuranceProvider'] ?? '';
        _insPolicyController.text = profile?['insurancePolicyNumber'] ?? '';
        _avatarUrlController.text = profile?['avatarUrl'] ?? profile?['photo'] ?? '';

        final gender = profile?['gender']?.toString();
        if (gender != null && _genderOptions.contains(gender)) {
          _selectedGender = gender;
        }

        final blood = profile?['bloodGroup']?.toString();
        if (blood != null && _bloodGroupOptions.contains(blood)) {
          _selectedBloodGroup = blood;
        }

        final nominee = profile?['emergencyContact'];
        if (nominee is Map) {
          _nomineeNameController.text = nominee['name']?.toString() ?? '';
          _nomineePhoneController.text = nominee['phone']?.toString() ?? '';
          final rel = nominee['relation']?.toString();
          if (rel != null && _nomineeRelationOptions.contains(rel)) {
            _selectedNomineeRelation = rel;
          }
        }

        _isLoading = false;
      });
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please correct the validation errors in the form.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    final updatePayload = {
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'age': int.tryParse(_ageController.text.trim()),
      'gender': _selectedGender,
      'bloodGroup': _selectedBloodGroup,
      'address': _addressController.text.trim(),
      'allergies': _allergiesController.text.trim(),
      'insuranceProvider': _insProviderController.text.trim(),
      'insurancePolicyNumber': _insPolicyController.text.trim(),
      'avatarUrl': _avatarUrlController.text.trim(),
      'photoUrl': _avatarUrlController.text.trim(),
      'emergencyContact': {
        'name': _nomineeNameController.text.trim(),
        'phone': _nomineePhoneController.text.trim(),
        'relation': _selectedNomineeRelation,
      },
    };

    final updatedProfile = await _apiService.updatePatientProfile(updatePayload);

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    if (updatedProfile != null) {
      final currentUser = Map<String, dynamic>.from(UserSession.user ?? {});
      if (_avatarUrlController.text.trim().isNotEmpty) {
        currentUser['avatarUrl'] = _avatarUrlController.text.trim();
      }
      if (_nameController.text.trim().isNotEmpty) {
        currentUser['name'] = _nameController.text.trim();
      }
      if (_emailController.text.trim().isNotEmpty) {
        currentUser['email'] = _emailController.text.trim();
      }

      await UserSession.saveSession(
        token: UserSession.token ?? '',
        user: currentUser,
        patient: updatedProfile,
      );

      if (_avatarUrlController.text.trim().isNotEmpty) {
        await AuthService().updateProfilePicture(_avatarUrlController.text.trim());
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile & Nominee details saved successfully!'),
          backgroundColor: Color(0xFF059669),
        ),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Saved local profile details.'),
        ),
      );
      Navigator.pop(context, true);
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.logout_rounded, color: Colors.redAccent),
              SizedBox(width: 10),
              Text(
                'Log Out',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          content: const Text(
            'Are you sure you want to log out of your session?',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
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

  Future<void> _handleDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: AppColors.errorRed, size: 24),
              SizedBox(width: 10),
              Text(
                'Delete Account',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate900,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'Are you sure you want to permanently delete your patient account?',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate800,
                ),
              ),
              SizedBox(height: 10),
              Text(
                '• Your email credentials and login sessions will be immediately and irreversibly destroyed.\n'
                '• You will no longer be able to access this portal or your self-service appointment drafts.\n'
                '• Pursuant to healthcare compliance laws, past diagnostic and treatment records are archived per hospital retention regulations.',
                style: TextStyle(
                  fontSize: 11.5,
                  color: AppColors.slate600,
                  height: 1.45,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'This action cannot be undone.',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.errorRed,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel', style: TextStyle(color: AppColors.slate500)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.errorRed,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Permanently Delete', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirmed == true && mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(
          child: CircularProgressIndicator(color: AppColors.errorRed),
        ),
      );

      await AuthService().deleteAccount();

      if (!mounted) return;
      Navigator.pop(context); // Close loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your account has been deleted successfully.'),
          backgroundColor: AppColors.slate800,
        ),
      );
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (route) => false);
    }
  }

  Future<void> _updatePhotoAndSession(String photoUrl) async {
    final cleanUrl = photoUrl.trim();
    if (cleanUrl.isEmpty) return;

    setState(() {
      _avatarUrlController.text = cleanUrl;
    });

    final updatePayload = {
      'photoUrl': cleanUrl,
      'avatarUrl': cleanUrl,
    };

    final updatedProfile = await _apiService.updatePatientProfile(updatePayload);
    await AuthService().updateProfilePicture(cleanUrl);

    final currentUser = Map<String, dynamic>.from(UserSession.user ?? {});
    currentUser['avatarUrl'] = cleanUrl;

    await UserSession.saveSession(
      token: UserSession.token ?? '',
      user: currentUser,
      patient: updatedProfile ?? UserSession.patient,
    );

    if (mounted && updatedProfile != null) {
      setState(() {
        _patientProfile = updatedProfile;
      });
    }
  }

  // --- CAMERA / GALLERY PHOTO PICKER & CLOUDINARY UPLOAD ---
  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    final isCamera = source == ImageSource.camera;
    final proceed = await PermissionDisclosureDialog.show(
      context,
      title: isCamera ? 'Camera Access Required' : 'Photo Gallery Access',
      permissionType: isCamera ? 'Camera' : 'Photos & Media',
      purposeDescription: isCamera
          ? 'HMS Enterprise requires camera access so you can take an identification photo for your hospital profile and medical charts.'
          : 'HMS Enterprise requires photo access to let you select an identification picture for your hospital profile.',
      icon: isCamera ? Icons.camera_alt_rounded : Icons.photo_library_rounded,
    );
    if (!proceed) return;

    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (pickedFile == null) return;

      setState(() {
        _isUploadingPhoto = true;
      });

      final bytes = await pickedFile.readAsBytes();
      final String filename = pickedFile.name.isNotEmpty ? pickedFile.name : 'patient_photo_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final cloudinaryUrl = await _apiService.uploadImageToCloudinary(bytes, filename);

      if (!mounted) return;

      setState(() {
        _isUploadingPhoto = false;
      });

      if (cloudinaryUrl != null && cloudinaryUrl.isNotEmpty) {
        await _updatePhotoAndSession(cloudinaryUrl);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile photo uploaded and updated successfully!'),
            backgroundColor: Color(0xFF059669),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cloudinary photo upload failed. Please try again.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isUploadingPhoto = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error accessing camera or uploading file.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _showAvatarPickerModal() {
    final urlController = TextEditingController(text: _avatarUrlController.text);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Update Profile Photo',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),
              const Text(
                'Take a new photo with Camera or pick from Gallery to upload to Cloudinary:',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),

              // Camera & Gallery Buttons Row
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _pickAndUploadPhoto(ImageSource.camera);
                      },
                      icon: const Icon(Icons.camera_alt_rounded, size: 20),
                      label: const Text('Camera', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEFF6FF),
                        foregroundColor: const Color(0xFF2563EB),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _pickAndUploadPhoto(ImageSource.gallery);
                      },
                      icon: const Icon(Icons.photo_library_rounded, size: 20),
                      label: const Text('Gallery', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const Divider(color: Color(0xFFE2E8F0)),
              const SizedBox(height: 12),

              // Avatar Presets Title
              const Text(
                'Or Select an Avatar Preset:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 10),

              // Avatar Presets Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_avatarIcons.length, (index) {
                  final isSelected = _selectedAvatarIndex == index && urlController.text.isEmpty;
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedAvatarIndex = index;
                        _avatarUrlController.clear();
                      });
                      Navigator.pop(ctx);
                    },
                    borderRadius: BorderRadius.circular(30),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFDBE4F6) : const Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        _avatarIcons[index],
                        size: 26,
                        color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 16),

              // Direct Image URL Field
              TextField(
                controller: urlController,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Cloudinary / Direct Image URL',
                  hintText: 'https://res.cloudinary.com/...',
                  labelStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  prefixIcon: const Icon(Icons.cloud_done_rounded, size: 18, color: Color(0xFF2563EB)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    final customUrl = urlController.text.trim();
                    if (customUrl.isNotEmpty) {
                      _updatePhotoAndSession(customUrl);
                    }
                    Navigator.pop(ctx);
                  },
                  child: const Text('Apply Custom URL', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: Container(
          margin: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
          decoration: const BoxDecoration(
            color: Color(0xFFEEF2FF),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(
              Icons.arrow_back_rounded,
              color: Color(0xFF2563EB),
              size: 20,
            ),
            tooltip: 'Back to Dashboard',
            onPressed: () => Navigator.pop(context),
          ),
        ),
        title: const Text(
          'My Profile & Nominee',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
          : Form(
              key: _formKey,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Profile Avatar Header Card
                    _buildProfileAvatarHeader(),
                    const SizedBox(height: 20),

                    // Personal Details Card (STRICT VALIDATIONS & NO OVERFLOW)
                    _buildCardContainer(
                      title: 'Personal Information',
                      icon: Icons.person_rounded,
                      child: Column(
                        children: [
                          _buildTextField(
                            label: 'Full Name',
                            controller: _nameController,
                            icon: Icons.person_outline_rounded,
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Please enter full name';
                              if (val.trim().length < 2) return 'Must be at least 2 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // Email Address
                          _buildTextField(
                            label: 'Email Address',
                            controller: _emailController,
                            icon: Icons.email_outlined,
                            keyboardType: TextInputType.emailAddress,
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Please enter email address';
                              final emailReg = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                              if (!emailReg.hasMatch(val.trim())) return 'Enter a valid email address';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // Phone Number
                          _buildTextField(
                            label: 'Phone Number',
                            controller: _phoneController,
                            icon: Icons.phone_outlined,
                            keyboardType: TextInputType.number,
                            maxLength: 10,
                            counterText: '',
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Please enter phone number';
                              if (val.trim().replaceAll(RegExp(r'\D'), '').length != 10) return 'Phone must be 10 digits';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),

                          // Age & Gender Row
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 4,
                                child: _buildTextField(
                                  label: 'Age',
                                  controller: _ageController,
                                  icon: Icons.cake_outlined,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                  validator: (val) {
                                    if (val == null || val.trim().isEmpty) return 'Enter age';
                                    final age = int.tryParse(val.trim());
                                    if (age == null || age < 0 || age > 120) return 'Valid age (0-120)';
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 6,
                                child: _buildDropdownField(
                                  label: 'Gender',
                                  value: _selectedGender,
                                  options: _genderOptions,
                                  icon: Icons.wc_rounded,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedGender = val);
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Blood Group & Address
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 4,
                                child: _buildDropdownField(
                                  label: 'Blood Group',
                                  value: _selectedBloodGroup,
                                  options: _bloodGroupOptions,
                                  icon: Icons.bloodtype_rounded,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedBloodGroup = val);
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 6,
                                child: _buildTextField(
                                  label: 'City / Location',
                                  controller: _addressController,
                                  icon: Icons.location_city_outlined,
                                  validator: (val) {
                                    if (val == null || val.trim().isEmpty) return 'Please enter address';
                                    if (val.trim().length < 3) return 'Must be at least 3 chars';
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Nominee / Emergency Contact Details Card
                    _buildCardContainer(
                      title: 'Nominee / Emergency Contact',
                      icon: Icons.contact_emergency_rounded,
                      accentColor: const Color(0xFF059669),
                      child: Column(
                        children: [
                          _buildTextField(
                            label: 'Nominee / Emergency Contact Name',
                            controller: _nomineeNameController,
                            icon: Icons.badge_outlined,
                            validator: (val) {
                              if (val != null && val.trim().isNotEmpty && val.trim().length < 2) {
                                return 'Nominee name must be at least 2 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 6,
                                child: _buildTextField(
                                  label: 'Nominee Phone Number',
                                  controller: _nomineePhoneController,
                                  icon: Icons.phone_forwarded_outlined,
                                  keyboardType: TextInputType.number,
                                  maxLength: 10,
                                  counterText: '',
                                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                  validator: (val) {
                                    if (val != null && val.trim().isNotEmpty && val.trim().replaceAll(RegExp(r'\D'), '').length != 10) {
                                      return 'Must be 10 digits';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                flex: 5,
                                child: _buildDropdownField(
                                  label: 'Relationship',
                                  value: _selectedNomineeRelation,
                                  options: _nomineeRelationOptions,
                                  icon: Icons.family_restroom_rounded,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _selectedNomineeRelation = val);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Medical & Insurance Information Card
                    _buildCardContainer(
                      title: 'Medical & Insurance Details',
                      icon: Icons.verified_user_rounded,
                      accentColor: const Color(0xFF4F46E5),
                      child: Column(
                        children: [
                          _buildTextField(
                            label: 'Known Allergies & Conditions',
                            controller: _allergiesController,
                            icon: Icons.warning_amber_rounded,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildTextField(
                                  label: 'Insurance Provider',
                                  controller: _insProviderController,
                                  icon: Icons.health_and_safety_outlined,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildTextField(
                                  label: 'Policy Number',
                                  controller: _insPolicyController,
                                  icon: Icons.tag_rounded,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Save Profile Changes Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: _isSaving ? null : _handleSave,
                        child: _isSaving
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.save_rounded, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'Save Profile & Nominee Changes',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Legal & Compliance Policies Card
                    _buildCardContainer(
                      title: 'Legal & Compliance',
                      icon: Icons.gavel_rounded,
                      accentColor: AppColors.navy700,
                      child: Column(
                        children: [
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.navy50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.shield_outlined, color: AppColors.navy700, size: 20),
                            ),
                            title: const Text(
                              'Privacy Policy',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800),
                            ),
                            subtitle: const Text(
                              'Data safety, HIPAA & encryption disclosures',
                              style: TextStyle(fontSize: 11, color: AppColors.slate500),
                            ),
                            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.slate400),
                            onTap: () => Navigator.pushNamed(context, AppRoutes.privacyPolicy),
                          ),
                          const Divider(color: AppColors.slate100),
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.navy50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.description_outlined, color: AppColors.navy700, size: 20),
                            ),
                            title: const Text(
                              'Terms & Conditions',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800),
                            ),
                            subtitle: const Text(
                              'Emergency disclaimer & user agreement',
                              style: TextStyle(fontSize: 11, color: AppColors.slate500),
                            ),
                            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.slate400),
                            onTap: () => Navigator.pushNamed(context, AppRoutes.termsConditions),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Danger Zone / Account Deletion Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFEE2E2), width: 1.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.warning_amber_rounded, color: AppColors.errorRed, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Account Management & Deletion',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.slate900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Permanently deactivate your patient profile and erase your login credentials in accordance with Google Play Data Safety standards.',
                            style: TextStyle(fontSize: 11, color: AppColors.slate500, height: 1.4),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.errorRed, width: 1.5),
                                foregroundColor: AppColors.errorRed,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: _handleDeleteAccount,
                              icon: const Icon(Icons.delete_forever_rounded, size: 18),
                              label: const Text(
                                'Delete My Account & Personal Data',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Log Out Account Red Card Button (Matching Profile & Settings Screenshot)
                    SizedBox(
                      width: double.infinity,
                      child: InkWell(
                        onTap: _handleLogout,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFFEE2E2), width: 1.5),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.logout_rounded, color: Colors.redAccent, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Log Out Patient Account',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.redAccent,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProfileAvatarHeader() {
    final hasCustomPhoto = _avatarUrlController.text.trim().isNotEmpty;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: _showAvatarPickerModal,
            borderRadius: BorderRadius.circular(50),
            child: Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF2563EB), width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withOpacity(0.2),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 44,
                    backgroundColor: const Color(0xFFDBE4F6),
                    backgroundImage: hasCustomPhoto ? NetworkImage(_avatarUrlController.text.trim()) : null,
                    child: _isUploadingPhoto
                        ? const CircularProgressIndicator(color: Color(0xFF2563EB), strokeWidth: 2.5)
                        : (!hasCustomPhoto
                            ? Icon(
                                _avatarIcons[_selectedAvatarIndex],
                                color: AppColors.navy700,
                                size: 52,
                              )
                            : null),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _nameController.text.isNotEmpty ? _nameController.text : UserSession.userName,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _patientProfile?['uhid'] ?? UserSession.patientUhid,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
              if (hasCustomPhoto) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.cloud_done_rounded, size: 12, color: Color(0xFF166534)),
                      SizedBox(width: 4),
                      Text(
                        'Cloudinary Verified',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCardContainer({
    required String title,
    required IconData icon,
    required Widget child,
    Color accentColor = const Color(0xFF2563EB),
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: accentColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: accentColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    FormFieldValidator<String>? validator,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
    String? counterText,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLength: maxLength,
      inputFormatters: inputFormatters,
      validator: validator,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
      decoration: InputDecoration(
        labelText: label,
        counterText: counterText,
        labelStyle: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
        errorStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.redAccent),
        prefixIcon: Icon(icon, size: 16, color: const Color(0xFF2563EB)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        isDense: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String value,
    required List<String> options,
    required IconData icon,
    required ValueChanged<String?> onChanged,
  }) {
    final effectiveValue = options.contains(value) ? value : options.first;

    return DropdownButtonFormField<String>(
      initialValue: effectiveValue,
      isExpanded: true,
      icon: const Icon(Icons.arrow_drop_down_rounded, color: Color(0xFF2563EB)),
      dropdownColor: Colors.white,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
        prefixIcon: Icon(icon, size: 16, color: const Color(0xFF2563EB)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        isDense: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
        ),
      ),
      items: options.map((opt) {
        return DropdownMenuItem<String>(
          value: opt,
          child: Text(
            opt,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }
}
