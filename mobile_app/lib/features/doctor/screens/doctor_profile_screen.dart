import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../services/doctor_api_service.dart';

class DoctorProfileScreen extends StatefulWidget {
  const DoctorProfileScreen({super.key});

  @override
  State<DoctorProfileScreen> createState() => _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> with SingleTickerProviderStateMixin {
  final _apiService = DoctorApiService();
  final ImagePicker _picker = ImagePicker();
  late TabController _tabController;

  bool _isLoading = true;
  bool _isSaving = false;

  // Profile Controllers
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _specializationController = TextEditingController();
  final _qualificationController = TextEditingController();
  final _licenseController = TextEditingController();
  final _photoUrlController = TextEditingController();
  final _consultationFeeController = TextEditingController(text: '₹500');
  final _opExpiryLimitController = TextEditingController(text: '10');
  final _bioController = TextEditingController();

  // Password Controllers
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _isChangingPassword = false;

  // Availability & Working Hours State (Reference image copy 4.png)
  String _selectedStatus = 'on_duty';
  int _slotDuration = 15;
  int _maxPatients = 25;
  String _breakTime = '13:00';

  List<Map<String, dynamic>> _workingHours = [
    {'day': 'Monday', 'from': '09:00', 'to': '17:00', 'active': true},
    {'day': 'Tuesday', 'from': '09:00', 'to': '17:00', 'active': true},
    {'day': 'Wednesday', 'from': '09:00', 'to': '13:00', 'active': true},
    {'day': 'Thursday', 'from': '09:00', 'to': '17:00', 'active': true},
    {'day': 'Friday', 'from': '09:00', 'to': '17:00', 'active': true},
    {'day': 'Saturday', 'from': '10:00', 'to': '13:00', 'active': false},
    {'day': 'Sunday', 'from': '—', 'to': '—', 'active': false},
  ];

  final List<Map<String, String>> _statusOptions = [
    {'value': 'on_duty', 'label': 'On Duty (Available)'},
    {'value': 'off_duty', 'label': 'Off Duty'},
    {'value': 'on_leave', 'label': 'On Leave'},
    {'value': 'ACTIVE', 'label': 'Active Practice'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadProfileData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _specializationController.dispose();
    _qualificationController.dispose();
    _licenseController.dispose();
    _photoUrlController.dispose();
    _consultationFeeController.dispose();
    _opExpiryLimitController.dispose();
    _bioController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);

    final profile = await _apiService.fetchMyProfile();
    if (profile != null && mounted) {
      setState(() {
        _nameController.text = profile['name']?.toString() ?? UserSession.userName;
        _phoneController.text = profile['phone']?.toString() ?? UserSession.user?['phone']?.toString() ?? '';
        _specializationController.text = profile['specialization']?.toString() ?? 'Cardiologist';
        _qualificationController.text = profile['qualification']?.toString() ?? 'MBBS, MD';
        _licenseController.text = profile['licenseNo']?.toString() ?? '';
        _photoUrlController.text = profile['photoUrl']?.toString() ?? '';
        _consultationFeeController.text = profile['consultationFee']?.toString() ?? '₹500';
        _opExpiryLimitController.text = (profile['opExpiryLimit'] ?? 10).toString();
        _bioController.text = profile['bio']?.toString() ?? '';
        _selectedStatus = profile['status']?.toString() ?? 'on_duty';

        if (profile['workingHours'] is List && (profile['workingHours'] as List).isNotEmpty) {
          _workingHours = (profile['workingHours'] as List).map((wh) => Map<String, dynamic>.from(wh)).toList();
        }

        if (profile['consultationSettings'] is Map) {
          final cs = profile['consultationSettings'] as Map;
          _slotDuration = cs['slotDuration'] ?? 15;
          _maxPatients = cs['maxPatients'] ?? 25;
          _breakTime = cs['breakTime']?.toString() ?? '13:00';
        }

        _isLoading = false;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _nameController.text = UserSession.userName;
        _phoneController.text = UserSession.user?['phone']?.toString() ?? '';
        _isLoading = false;
      });
    }
  }

  Future<void> _pickProfilePhoto(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _photoUrlController.text = image.path;
        });
        await UserSession.setProfileImagePath(image.path);

        await _apiService.updateMyProfile({'photoUrl': image.path});

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile photo updated & synchronized with Web App!'),
            backgroundColor: AppColors.emerald600,
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

  void _showImagePickerModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Wrap(
              children: [
                const ListTile(
                  title: Text('Update Doctor Profile Photo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                ListTile(
                  leading: const Icon(Icons.camera_alt_rounded, color: AppColors.navy700),
                  title: const Text('Take Photo with Camera'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickProfilePhoto(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library_rounded, color: AppColors.navy700),
                  title: const Text('Choose from Gallery'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickProfilePhoto(ImageSource.gallery);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickTimeForDay(int idx, {required bool isFrom}) async {
    final currentStr = isFrom ? _workingHours[idx]['from'] : _workingHours[idx]['to'];
    int initialHour = 9;
    int initialMinute = 0;
    if (currentStr != null && currentStr.contains(':')) {
      final parts = currentStr.split(':');
      initialHour = int.tryParse(parts[0]) ?? 9;
      initialMinute = int.tryParse(parts[1]) ?? 0;
    }

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initialHour, minute: initialMinute),
    );

    if (picked != null) {
      final formattedHour = picked.hour.toString().padLeft(2, '0');
      final formattedMinute = picked.minute.toString().padLeft(2, '0');
      final newTimeStr = '$formattedHour:$formattedMinute';

      setState(() {
        if (isFrom) {
          _workingHours[idx]['from'] = newTimeStr;
        } else {
          _workingHours[idx]['to'] = newTimeStr;
        }
      });
    }
  }

  Future<void> _handleSaveProfile() async {
    setState(() => _isSaving = true);

    final expiryVal = int.tryParse(_opExpiryLimitController.text.trim()) ?? 10;

    final payload = {
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'specialization': _specializationController.text.trim(),
      'qualification': _qualificationController.text.trim(),
      'licenseNo': _licenseController.text.trim(),
      'photoUrl': _photoUrlController.text.trim(),
      'consultationFee': _consultationFeeController.text.trim(),
      'opExpiryLimit': expiryVal,
      'status': _selectedStatus,
      'bio': _bioController.text.trim(),
      'workingHours': _workingHours,
      'consultationSettings': {
        'slotDuration': _slotDuration,
        'maxPatients': _maxPatients,
        'breakTime': _breakTime,
      },
    };

    final success = await _apiService.updateMyProfile(payload);

    if (!mounted) return;

    setState(() => _isSaving = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile & Availability slots updated! Synchronized with web application.'),
          backgroundColor: AppColors.emerald600,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update doctor settings.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  Future<void> _handleChangePassword() async {
    final newPass = _newPasswordController.text.trim();
    final confirmPass = _confirmPasswordController.text.trim();

    if (newPass.isEmpty || confirmPass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill both password fields.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    if (newPass != confirmPass) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New password and confirmation do not match.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    setState(() => _isChangingPassword = true);

    final res = await _apiService.changePassword(newPassword: newPass, confirmPassword: confirmPass);

    if (!mounted) return;

    setState(() => _isChangingPassword = false);

    if (res['success'] == true) {
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Password changed successfully.'), backgroundColor: AppColors.emerald600),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to change password.'), backgroundColor: AppColors.errorRed),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final docName = _nameController.text.isNotEmpty ? _nameController.text : UserSession.userName;

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy800,
        foregroundColor: AppColors.white,
        title: const Text('Doctor Settings & Workspace', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.white,
          indicatorWeight: 3,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.slate400,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'Profile'),
            Tab(text: 'Security'),
            Tab(text: 'Availability'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildProfileTab(docName),
                _buildSecurityTab(),
                _buildAvailabilityTab(),
              ],
            ),
    );
  }

  // 1. Profile Details Tab
  Widget _buildProfileTab(String docName) {
    final photoPath = _photoUrlController.text.trim();
    final isLocalFile = photoPath.isNotEmpty && (photoPath.startsWith('/') || photoPath.contains(':\\') || photoPath.contains('storage'));

    ImageProvider? imageProvider;
    if (photoPath.isNotEmpty) {
      if (isLocalFile) {
        imageProvider = FileImage(File(photoPath));
      } else if (photoPath.startsWith('http')) {
        imageProvider = NetworkImage(photoPath);
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Avatar with Camera Badge
          Center(
            child: GestureDetector(
              onTap: _showImagePickerModal,
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 44,
                    backgroundColor: AppColors.navy100,
                    backgroundImage: imageProvider,
                    child: imageProvider == null
                        ? Text(docName.isNotEmpty ? docName[0].toUpperCase() : 'D', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.navy800))
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(color: AppColors.navy700, shape: BoxShape.circle),
                      child: const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(docName, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy900)),
          Text('${_specializationController.text} • Enterprise HQ', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),

          const SizedBox(height: 20),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
            child: Column(
              children: [
                _buildTextField('Doctor Full Name', _nameController, icon: Icons.person_outline),
                const SizedBox(height: 10),
                _buildTextField('Specialization', _specializationController, icon: Icons.local_hospital_outlined),
                const SizedBox(height: 10),
                _buildTextField('Qualifications', _qualificationController, icon: Icons.school_outlined),
                const SizedBox(height: 10),
                _buildTextField('Phone Number', _phoneController, icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
                const SizedBox(height: 10),
                _buildTextField('Consultation Fee', _consultationFeeController, icon: Icons.payments_outlined),
                const SizedBox(height: 10),
                _buildTextField('OP Expiry Limit (Days)', _opExpiryLimitController, icon: Icons.timer_outlined, keyboardType: TextInputType.number),
                const SizedBox(height: 10),
                _buildTextField('Medical License No', _licenseController, icon: Icons.verified_user_outlined),
                const SizedBox(height: 10),
                _buildTextField('Profile Photo URL / Path', _photoUrlController, icon: Icons.link_outlined, hintText: 'Tap camera icon or enter URL'),
                const SizedBox(height: 10),
                _buildTextField('Doctor Bio', _bioController, icon: Icons.description_outlined, maxLines: 2),
              ],
            ),
          ),

          const SizedBox(height: 20),

          ElevatedButton.icon(
            onPressed: _isSaving ? null : _handleSaveProfile,
            icon: _isSaving
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_rounded, color: Colors.white),
            label: Text(_isSaving ? 'Saving...' : 'Save & Sync Profile to Web', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          ),
          const SizedBox(height: 12),
          _buildLogoutButton(),
        ],
      ),
    );
  }

  // 2. Security Tab (Change Password)
  Widget _buildSecurityTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.lock_reset_rounded, size: 20, color: AppColors.navy700),
                    SizedBox(width: 8),
                    Text('Change Account Password', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('Update your login password securely.', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                const SizedBox(height: 16),

                // New Password
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: !_showNewPassword,
                  decoration: InputDecoration(
                    labelText: 'New Password *',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(_showNewPassword ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setState(() => _showNewPassword = !_showNewPassword),
                    ),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 12),

                // Confirm Password
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: !_showConfirmPassword,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password *',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(_showConfirmPassword ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                    ),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),

                ElevatedButton.icon(
                  onPressed: _isChangingPassword ? null : _handleChangePassword,
                  icon: _isChangingPassword
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_circle_outline, color: Colors.white),
                  label: Text(_isChangingPassword ? 'Updating Password...' : 'Update Password', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, minimumSize: const Size.fromHeight(44), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 3. Availability Tab (Working Hours & Editable Slots - Reference image copy 4.png & 7.png)
  Widget _buildAvailabilityTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status & Slot settings
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Duty Availability Status', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedStatus,
                  decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                  items: _statusOptions.map((opt) => DropdownMenuItem(value: opt['value'], child: Text(opt['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)))).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedStatus = val);
                  },
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Slot Duration', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<int>(
                            value: _slotDuration,
                            decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                            items: [10, 15, 20, 30].map((d) => DropdownMenuItem(value: d, child: Text('$d Mins', style: const TextStyle(fontSize: 12)))).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _slotDuration = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Max Patients / Day', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<int>(
                            value: _maxPatients,
                            decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8), border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
                            items: [15, 20, 25, 30, 40, 50].map((m) => DropdownMenuItem(value: m, child: Text('$m Patients', style: const TextStyle(fontSize: 12)))).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _maxPatients = val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Working Hours Slots List (Reference Web App image copy 4.png)
          Row(
            children: const [
              Icon(Icons.schedule_rounded, size: 18, color: AppColors.navy700),
              SizedBox(width: 8),
              Text('Weekly Working Hours & Slots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy900)),
            ],
          ),
          const SizedBox(height: 4),
          const Text('Tap times below to change availability start & end hours.', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
          const SizedBox(height: 10),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _workingHours.length,
            itemBuilder: (context, idx) {
              final wh = _workingHours[idx];
              final day = wh['day']?.toString() ?? 'Day';
              final isActive = wh['active'] == true;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: isActive ? AppColors.navy100 : AppColors.slate200)),
                child: Row(
                  children: [
                    SizedBox(width: 75, child: Text(day, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isActive ? AppColors.navy900 : AppColors.slate400))),
                    Expanded(
                      child: isActive
                          ? Row(
                              children: [
                                InkWell(
                                  onTap: () => _pickTimeForDay(idx, isFrom: true),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: AppColors.slate100,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.slate300),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.access_time_rounded, size: 12, color: AppColors.navy700),
                                        const SizedBox(width: 4),
                                        Text(wh['from']?.toString() ?? '09:00', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                                      ],
                                    ),
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 4.0),
                                  child: Text('to', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                                ),
                                InkWell(
                                  onTap: () => _pickTimeForDay(idx, isFrom: false),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: AppColors.slate100,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.slate300),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.access_time_rounded, size: 12, color: AppColors.navy700),
                                        const SizedBox(width: 4),
                                        Text(wh['to']?.toString() ?? '17:00', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : const Text('Off Day', style: TextStyle(fontSize: 12, color: AppColors.slate400, fontWeight: FontWeight.w500)),
                    ),
                    Switch(
                      value: isActive,
                      activeColor: AppColors.navy700,
                      onChanged: (val) {
                        setState(() {
                          _workingHours[idx]['active'] = val;
                          if (val && (_workingHours[idx]['from'] == '—' || _workingHours[idx]['from'] == '')) {
                            _workingHours[idx]['from'] = '09:00';
                            _workingHours[idx]['to'] = '17:00';
                          }
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),

          const SizedBox(height: 16),

          ElevatedButton.icon(
            onPressed: _isSaving ? null : _handleSaveProfile,
            icon: _isSaving
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_rounded, color: Colors.white),
            label: Text(_isSaving ? 'Saving Slots...' : 'Save Availability & Sync to Web', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    required IconData icon,
    String? hintText,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate900),
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        prefixIcon: Icon(icon, size: 18, color: AppColors.slate400),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildLogoutButton() {
    return OutlinedButton.icon(
      onPressed: () async {
        await UserSession.clear();
        if (!mounted) return;
        Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (r) => false);
      },
      icon: const Icon(Icons.logout_rounded, color: AppColors.errorRed),
      label: const Text('Logout from Doctor Workspace', style: TextStyle(color: AppColors.errorRed, fontWeight: FontWeight.bold)),
      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.errorRed), padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
    );
  }
}
