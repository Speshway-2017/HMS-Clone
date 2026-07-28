import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../services/upload_service.dart';
import '../../../utils/responsive_helper.dart';
import '../../authentication/services/auth_service.dart';

class PatientDashboard extends StatefulWidget {
  const PatientDashboard({super.key});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  int _currentIndex = 0;

  // Real Patient Profile Info
  late String _patientName;
  late String _patientUhid;
  late String _hospitalName;
  late String _email;
  late String _phone;
  String? _avatarUrl;

  // Change Password Form Controllers & State
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Edit Patient Details Controllers & State
  final _nameEditController = TextEditingController();
  final _emailEditController = TextEditingController();
  final _phoneEditController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isUpdatingPassword = false;
  bool _isUploadingAvatar = false;
  bool _isEditingDetails = false;
  bool _isSavingDetails = false;
  final ImagePicker _picker = ImagePicker();

  // Real Patient Vitals, Appointments, Prescriptions, Reports
  Map<String, String>? _vitals;
  final List<Map<String, dynamic>> _appointments = [];
  final List<Map<String, dynamic>> _prescriptions = [];
  final List<Map<String, dynamic>> _reports = [];

  @override
  void initState() {
    super.initState();
    _loadPatientProfile();
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _nameEditController.dispose();
    _emailEditController.dispose();
    _phoneEditController.dispose();
    super.dispose();
  }

  void _loadPatientProfile() {
    final user = AuthService.currentUser;
    if (user != null) {
      _patientName = (user['name'] != null && user['name'].toString().trim().isNotEmpty)
          ? user['name'].toString().trim()
          : (user['email']?.toString().split('@').first ?? 'Registered Patient');
      
      _patientUhid = user['uhid'] ??
          (user['_id'] != null
              ? 'UHID-${user['_id'].toString().substring(0, 8).toUpperCase()}'
              : 'UHID-${user['phone'] ?? 'REG'}');
      
      _hospitalName = user['hospital']?.toString() ?? 'Sunrise General Hospital';
      _avatarUrl = user['avatarUrl']?.toString();
      _email = user['email']?.toString() ?? 'patient@hms.com';
      _phone = user['phone']?.toString() ?? '+91 9876543210';
    } else {
      _patientName = 'Registered Patient';
      _patientUhid = 'UHID-REGISTERED';
      _hospitalName = 'Sunrise General Hospital';
      _avatarUrl = null;
      _email = 'patient@hms.com';
      _phone = '+91 9876543210';
    }
  }

  Widget _buildAvatarWidget({required double radius, required double iconSize, Color? iconColor}) {
    final double diameter = radius * 2;
    final initial = _patientName.trim().isNotEmpty ? _patientName.trim()[0].toUpperCase() : 'P';
    
    final fallbackWidget = Container(
      width: diameter,
      height: diameter,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            iconColor == AppColors.white ? AppColors.navy700 : AppColors.navy800,
            iconColor == AppColors.white ? AppColors.navy900 : AppColors.navy900,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: iconColor == AppColors.white ? AppColors.white.withValues(alpha: 0.4) : AppColors.slate200,
          width: 1.5,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: radius * 0.9,
          fontWeight: FontWeight.bold,
          color: AppColors.white,
        ),
      ),
    );

    if (_avatarUrl == null || _avatarUrl!.trim().isEmpty) {
      return fallbackWidget;
    }

    final cleanUrl = _avatarUrl!.trim();

    // Case 1: HTTP / HTTPS Web Image (Cloudinary or Remote URL)
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return SizedBox(
        width: diameter,
        height: diameter,
        child: ClipOval(
          child: Image.network(
            cleanUrl,
            width: diameter,
            height: diameter,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => fallbackWidget,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return fallbackWidget;
            },
          ),
        ),
      );
    }

    // Case 2: Local File System Image (Picked via Camera or Gallery)
    try {
      final file = File(cleanUrl);
      if (file.existsSync()) {
        return SizedBox(
          width: diameter,
          height: diameter,
          child: ClipOval(
            child: Image.file(
              file,
              width: diameter,
              height: diameter,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => fallbackWidget,
            ),
          ),
        );
      }
    } catch (_) {}

    return fallbackWidget;
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildPrescriptionsScreen(responsive),
      _buildReportsScreen(responsive),
      _buildSettingsScreen(responsive),
    ];

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(
          _currentIndex == 0
              ? 'Patient Health Portal'
              : (_currentIndex == 1
                  ? 'My Prescriptions'
                  : (_currentIndex == 2 ? 'Medical Reports' : 'Account & Settings')),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Account Settings',
            onPressed: () {
              setState(() {
                _currentIndex = 3;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Log Out',
            onPressed: _showLogoutDialog,
          ),
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: AppColors.navy700,
        unselectedItemColor: AppColors.slate400,
        backgroundColor: AppColors.white,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite_outline_rounded),
            activeIcon: Icon(Icons.favorite_rounded),
            label: 'My Health',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long_rounded),
            label: 'Prescriptions',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.folder_open_outlined),
            activeIcon: Icon(Icons.folder_rounded),
            label: 'Reports',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  // --- HOME SCREEN (MY HEALTH) ---
  Widget _buildHomeScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildPatientHeader(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),
          
          // Latest Vitals
          Text(
            'Latest Measured Vitals',
            style: TextStyle(
              fontSize: responsive.scaleText(15.0),
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),
          _buildVitalsCard(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Upcoming Appointments
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Appointments Queue',
                style: TextStyle(
                  fontSize: responsive.scaleText(15.0),
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate800,
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.navy700),
            ],
          ),
          const SizedBox(height: 10),
          _buildAppointmentsList(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Quick Shortcuts Grid
          Text(
            'Portal Services',
            style: TextStyle(
              fontSize: responsive.scaleText(15.0),
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),
          _buildServicesGrid(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),
        ],
      ),
    );
  }

  Widget _buildPatientHeader(ResponsiveHelper responsive) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentIndex = 3;
        });
      },
      child: Container(
        padding: EdgeInsets.all(responsive.scaleWidth(18.0)),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.navy700, AppColors.navy900],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16.0),
          boxShadow: [
            BoxShadow(
              color: AppColors.navy900.withValues(alpha: 0.15),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            _buildAvatarWidget(radius: 28, iconSize: 28, iconColor: AppColors.white),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hello, $_patientName',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _patientUhid,
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.white.withValues(alpha: 0.7),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _hospitalName,
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.white.withValues(alpha: 0.5),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.white),
          ],
        ),
      ),
    );
  }

  Widget _buildVitalsCard(ResponsiveHelper responsive) {
    if (_vitals == null || _vitals!.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: const Row(
          children: [
            Icon(Icons.monitor_heart_outlined, color: AppColors.navy700, size: 24),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'No Clinical Vitals Logged',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Blood pressure, pulse & temp will be updated after clinical checkup.',
                    style: TextStyle(fontSize: 10, color: AppColors.slate500),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.insights_rounded, color: AppColors.navy700, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Clinical Summary',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                  ),
                ],
              ),
              Text(
                _vitals!['lastChecked'] ?? 'Recently',
                style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildVitalItem('BP', _vitals!['bp'] ?? '--', Icons.speed, Colors.purple),
              _buildVitalItem('Pulse', _vitals!['pulse'] ?? '--', Icons.favorite, Colors.red),
              _buildVitalItem('SpO2', _vitals!['spo2'] ?? '--', Icons.air, Colors.blue),
              _buildVitalItem('Temp', _vitals!['temp'] ?? '--', Icons.thermostat, Colors.orange),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVitalItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 14, color: color),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          value.split(' ')[0],
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
        ),
        if (value.split(' ').length > 1)
          Text(
            value.split(' ')[1],
            style: const TextStyle(fontSize: 8, color: AppColors.slate400, fontWeight: FontWeight.w500),
          ),
      ],
    );
  }

  Widget _buildAppointmentsList(ResponsiveHelper responsive) {
    if (_appointments.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: const Row(
          children: [
            Icon(Icons.calendar_month_outlined, color: AppColors.navy700, size: 24),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'No Upcoming Appointments',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Book an OPD consultation to schedule your next hospital visit.',
                    style: TextStyle(fontSize: 10, color: AppColors.slate500),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _appointments.length,
      itemBuilder: (context, index) {
        final apt = _appointments[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 10.0),
          padding: const EdgeInsets.all(14.0),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(10.0),
            border: Border.all(color: AppColors.slate200),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: AppColors.navy50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.calendar_month_rounded, color: AppColors.navy700, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      apt['doctorName'] ?? 'Attending Doctor',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${apt['specialty'] ?? 'General'} • ${apt['type'] ?? 'Consultation'}',
                      style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${apt['date']} at ${apt['time']}',
                      style: const TextStyle(fontSize: 10, color: AppColors.navy700, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.emerald50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  (apt['status'] ?? 'Scheduled').toString().toUpperCase(),
                  style: const TextStyle(color: AppColors.emerald600, fontSize: 8, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildServicesGrid(ResponsiveHelper responsive) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      children: [
        _buildShortcutCard(
          title: 'Book Appointment',
          desc: 'Schedule OPD slot',
          icon: Icons.add_task_rounded,
          color: AppColors.navy700,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Appointment booking screen is pending API integration.')),
            );
          },
        ),
        _buildShortcutCard(
          title: 'Prescriptions',
          desc: 'Access medication history',
          icon: Icons.receipt_long_rounded,
          color: AppColors.emerald600,
          onTap: () {
            setState(() {
              _currentIndex = 1;
            });
          },
        ),
        _buildShortcutCard(
          title: 'Lab & Diagnostics',
          desc: 'Review test logs',
          icon: Icons.science_rounded,
          color: Colors.amber.shade800,
          onTap: () {
            setState(() {
              _currentIndex = 2;
            });
          },
        ),
        _buildShortcutCard(
          title: 'Account Settings',
          desc: 'Change picture & password',
          icon: Icons.settings_applications_rounded,
          color: Colors.deepPurple.shade700,
          onTap: () {
            setState(() {
              _currentIndex = 3;
            });
          },
        ),
      ],
    );
  }

  Widget _buildShortcutCard({
    required String title,
    required String desc,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.0),
      child: Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 22),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 9,
                    color: AppColors.slate500,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- PRESCRIPTIONS SCREEN ---
  Widget _buildPrescriptionsScreen(ResponsiveHelper responsive) {
    if (_prescriptions.isEmpty) {
      return Center(
        child: Padding(
          padding: EdgeInsets.all(responsive.scaleWidth(24.0)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.navy50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.navy700),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Active Prescriptions',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate800),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your digital prescription slips will appear here once issued by your doctor.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      itemCount: _prescriptions.length,
      itemBuilder: (context, index) {
        final rx = _prescriptions[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 14.0),
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: AppColors.slate200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rx['id'],
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Prescribed by: ${rx['doctorName']}',
                        style: const TextStyle(fontSize: 11, color: AppColors.slate700, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  Text(
                    rx['date'],
                    style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Diagnosis: ${rx['diagnosis']}',
                style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 12),
              const Divider(color: AppColors.slate100, height: 1),
              const SizedBox(height: 12),
              
              const Text(
                'Medication & Dosage:',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800),
              ),
              const SizedBox(height: 6),
              ...((rx['medications'] as List<String>).map((med) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle, size: 6, color: AppColors.emerald500),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          med,
                          style: const TextStyle(fontSize: 11, color: AppColors.slate700, height: 1.3),
                        ),
                      ),
                    ],
                  ),
                );
              })),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy700,
                      foregroundColor: AppColors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: () {
                      _showQRCodeVerification(rx['id']);
                    },
                    icon: const Icon(Icons.qr_code_2_rounded, size: 14),
                    label: const Text('Verify Link / QR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showQRCodeVerification(String rxId) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Verify Prescription • $rxId',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Scan this unique QR code to instantly verify the authenticity of this digital prescription slip.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: AppColors.slate500, height: 1.4),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.slate100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.qr_code_scanner_rounded, size: 120, color: AppColors.navy900),
              ),
              const SizedBox(height: 14),
              Text(
                'Prescription ID: $rxId',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate600),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close', style: TextStyle(color: AppColors.navy700, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  // --- REPORTS SCREEN ---
  Widget _buildReportsScreen(ResponsiveHelper responsive) {
    if (_reports.isEmpty) {
      return Center(
        child: Padding(
          padding: EdgeInsets.all(responsive.scaleWidth(24.0)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: AppColors.navy50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.folder_open_outlined, size: 48, color: AppColors.navy700),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Diagnostic Reports Available',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate800),
              ),
              const SizedBox(height: 8),
              const Text(
                'Laboratory and radiology test results will be posted here after verification.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      itemCount: _reports.length,
      itemBuilder: (context, index) {
        final report = _reports[index];
        final isCompleted = report['status'] == 'Completed';
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12.0),
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: AppColors.slate200),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isCompleted ? AppColors.emerald50 : Colors.amber.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCompleted ? Icons.check_circle_outline_rounded : Icons.pending_actions_rounded,
                  color: isCompleted ? AppColors.emerald600 : Colors.amber.shade800,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report['title'],
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Category: ${report['category']} • ${report['date']}',
                      style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isCompleted ? AppColors.emerald50 : Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      report['status'],
                      style: TextStyle(
                        color: isCompleted ? AppColors.emerald600 : Colors.amber.shade800,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (isCompleted) ...[
                    const SizedBox(height: 6),
                    GestureDetector(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Downloading report PDF...')),
                        );
                      },
                      child: const Row(
                        children: [
                          Icon(Icons.download_rounded, size: 10, color: AppColors.navy700),
                          SizedBox(width: 2),
                          Text(
                            'Download',
                            style: TextStyle(fontSize: 9, color: AppColors.navy700, fontWeight: FontWeight.bold),
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
      },
    );
  }

  // --- SETTINGS SCREEN ---
  Widget _buildSettingsScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Profile Picture Card
          _buildProfilePicCard(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),

          // Change Password Card
          _buildChangePasswordCard(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),

          // Account Info Card
          _buildAccountInfoCard(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),

          // Log Out Card
          _buildLogoutCard(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),
        ],
      ),
    );
  }

  Widget _buildProfilePicCard(ResponsiveHelper responsive) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              _buildAvatarWidget(radius: 46, iconSize: 50, iconColor: AppColors.navy700),
              InkWell(
                onTap: _showProfilePhotoOptions,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.navy700,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, size: 16, color: AppColors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            _patientName,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 2),
          Text(
            _patientUhid,
            style: const TextStyle(fontSize: 12, color: AppColors.navy700, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isUploadingAvatar ? null : _showProfilePhotoOptions,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.navy700,
              foregroundColor: AppColors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: _isUploadingAvatar
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                  )
                : const Icon(Icons.cloud_upload_rounded, size: 16),
            label: Text(
              _isUploadingAvatar ? 'Uploading to Cloudinary...' : 'Change Profile Picture (Cloudinary)',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showProfilePhotoOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Change Profile Picture',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Your profile picture will be processed and stored on Cloudinary.',
                  style: TextStyle(fontSize: 11, color: AppColors.slate500),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: AppColors.navy50, shape: BoxShape.circle),
                    child: const Icon(Icons.camera_alt_outlined, color: AppColors.navy700),
                  ),
                  title: const Text('Take Photo (Camera)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Capture photo with device camera', style: TextStyle(fontSize: 10)),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndUploadProfilePic(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: AppColors.emerald50, shape: BoxShape.circle),
                    child: const Icon(Icons.photo_library_outlined, color: AppColors.emerald600),
                  ),
                  title: const Text('Choose from Gallery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Select image from photo gallery', style: TextStyle(fontSize: 10)),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndUploadProfilePic(ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.amber.shade50, shape: BoxShape.circle),
                    child: Icon(Icons.face_retouching_natural_rounded, color: Colors.amber.shade800),
                  ),
                  title: const Text('Preset Medical Avatars', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text('Select pre-uploaded Cloudinary medical avatar', style: TextStyle(fontSize: 10)),
                  onTap: () {
                    Navigator.pop(context);
                    _showPresetAvatarsPicker();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickAndUploadProfilePic(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      // Show local image immediately so user sees profile pic update right away
      setState(() {
        _avatarUrl = pickedFile.path;
        _isUploadingAvatar = true;
      });

      final File file = File(pickedFile.path);
      final String cloudinaryUrl = await UploadService.uploadImageToCloudinary(file);

      final authService = AuthService();
      await authService.updateProfilePicture(cloudinaryUrl);

      if (!mounted) return;

      setState(() {
        _avatarUrl = cloudinaryUrl;
        _isUploadingAvatar = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.cloud_done_rounded, color: AppColors.white),
              SizedBox(width: 10),
              Expanded(
                child: Text('Profile picture stored on Cloudinary & updated!'),
              ),
            ],
          ),
          backgroundColor: AppColors.emerald600,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isUploadingAvatar = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Upload update: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: Colors.amber.shade800,
        ),
      );
    }
  }

  void _showPresetAvatarsPicker() {
    final presets = [
      {
        'name': 'Medical Navy',
        'url': 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(_patientName)}&background=0F172A&color=ffffff&bold=true&size=256',
      },
      {
        'name': 'Ocean Blue',
        'url': 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(_patientName)}&background=0284C7&color=ffffff&bold=true&size=256',
      },
      {
        'name': 'Emerald Health',
        'url': 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(_patientName)}&background=059669&color=ffffff&bold=true&size=256',
      },
      {
        'name': 'Purple Care',
        'url': 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(_patientName)}&background=7C3AED&color=ffffff&bold=true&size=256',
      },
    ];

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Choose Preset Avatar', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          content: SizedBox(
            width: double.maxFinite,
            child: GridView.builder(
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: presets.length,
              itemBuilder: (context, index) {
                final preset = presets[index];
                final url = preset['url']!;
                return InkWell(
                  onTap: () async {
                    final navigator = Navigator.of(context);
                    final messenger = ScaffoldMessenger.of(context);
                    navigator.pop();
                    setState(() {
                      _avatarUrl = url;
                      _isUploadingAvatar = true;
                    });
                    final authService = AuthService();
                    await authService.updateProfilePicture(url);
                    if (!mounted) return;
                    setState(() {
                      _isUploadingAvatar = false;
                    });
                    messenger.showSnackBar(
                      const SnackBar(content: Text('Avatar updated!'), backgroundColor: AppColors.emerald600),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.slate100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.navy700.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundImage: NetworkImage(url),
                        ),
                        const SizedBox(height: 8),
                        Text(preset['name']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildChangePasswordCard(ResponsiveHelper responsive) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.lock_reset_rounded, color: AppColors.navy700, size: 20),
              SizedBox(width: 8),
              Text(
                'Change Password',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Ensure your account uses a strong, secure password.',
            style: TextStyle(fontSize: 11, color: AppColors.slate500),
          ),
          const SizedBox(height: 16),
          
          // Current Password Field
          TextField(
            controller: _currentPasswordController,
            obscureText: _obscureCurrent,
            decoration: InputDecoration(
              labelText: 'Current Password',
              labelStyle: const TextStyle(fontSize: 12),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              suffixIcon: IconButton(
                icon: Icon(_obscureCurrent ? Icons.visibility_off : Icons.visibility, size: 18),
                onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // New Password Field
          TextField(
            controller: _newPasswordController,
            obscureText: _obscureNew,
            decoration: InputDecoration(
              labelText: 'New Password',
              labelStyle: const TextStyle(fontSize: 12),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              suffixIcon: IconButton(
                icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, size: 18),
                onPressed: () => setState(() => _obscureNew = !_obscureNew),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Confirm New Password Field
          TextField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirm,
            decoration: InputDecoration(
              labelText: 'Confirm New Password',
              labelStyle: const TextStyle(fontSize: 12),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              suffixIcon: IconButton(
                icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 18),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Action Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isUpdatingPassword ? null : _handlePasswordChange,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _isUpdatingPassword
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                    )
                  : const Text('Update Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handlePasswordChange() async {
    final newPass = _newPasswordController.text.trim();
    final confirmPass = _confirmPasswordController.text.trim();

    if (newPass.isEmpty || confirmPass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter and confirm your new password.')),
      );
      return;
    }

    if (newPass.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 6 characters long.')),
      );
      return;
    }

    if (newPass != confirmPass) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New password and confirmation do not match.')),
      );
      return;
    }

    setState(() {
      _isUpdatingPassword = true;
    });

    try {
      final authService = AuthService();
      await authService.changePassword(newPass, confirmPass);

      if (!mounted) return;
      setState(() {
        _isUpdatingPassword = false;
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password updated successfully!'),
          backgroundColor: AppColors.emerald600,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isUpdatingPassword = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Widget _buildAccountInfoCard(ResponsiveHelper responsive) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.badge_outlined, color: AppColors.navy700, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Patient Details',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  ),
                ],
              ),
              if (!_isEditingDetails)
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _isEditingDetails = true;
                      _nameEditController.text = _patientName;
                      _emailEditController.text = _email;
                      _phoneEditController.text = _phone;
                    });
                  },
                  icon: const Icon(Icons.edit_outlined, size: 14, color: AppColors.navy700),
                  label: const Text('Edit Details', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (_isEditingDetails) ...[
            TextField(
              controller: _nameEditController,
              decoration: InputDecoration(
                labelText: 'Full Name',
                labelStyle: const TextStyle(fontSize: 12),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _emailEditController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Registered Email',
                labelStyle: const TextStyle(fontSize: 12),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phoneEditController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                labelStyle: const TextStyle(fontSize: 12),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isEditingDetails = false;
                    });
                  },
                  child: const Text('Cancel', style: TextStyle(color: AppColors.slate500)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _isSavingDetails ? null : _handleSavePatientDetails,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy700,
                    foregroundColor: AppColors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: _isSavingDetails
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                        )
                      : const Icon(Icons.check_circle_outline_rounded, size: 14),
                  label: const Text('Save Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ] else ...[
            _buildInfoRow('Full Name', _patientName, Icons.person_outline),
            const Divider(height: 16),
            _buildInfoRow('Registered Email', _email, Icons.email_outlined),
            const Divider(height: 16),
            _buildInfoRow('Phone Number', _phone, Icons.phone_outlined),
            const Divider(height: 16),
            _buildInfoRow('Patient UHID', _patientUhid, Icons.numbers_outlined),
            const Divider(height: 16),
            _buildInfoRow('Hospital Branch', _hospitalName, Icons.local_hospital_outlined),
          ],
        ],
      ),
    );
  }

  Future<void> _handleSavePatientDetails() async {
    final newName = _nameEditController.text.trim();
    final newEmail = _emailEditController.text.trim();
    final newPhone = _phoneEditController.text.trim();

    if (newName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Patient name cannot be empty.')),
      );
      return;
    }

    setState(() {
      _isSavingDetails = true;
    });

    try {
      final authService = AuthService();
      await authService.updatePatientDetails(
        name: newName,
        email: newEmail,
        phone: newPhone,
      );

      if (!mounted) return;

      setState(() {
        _patientName = newName;
        if (newEmail.isNotEmpty) _email = newEmail;
        if (newPhone.isNotEmpty) _phone = newPhone;
        _isSavingDetails = false;
        _isEditingDetails = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Patient details updated successfully!'),
          backgroundColor: AppColors.emerald600,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSavingDetails = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Widget _buildInfoRow(String title, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.slate400),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLogoutCard(ResponsiveHelper responsive) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.red.shade700,
        side: BorderSide(color: Colors.red.shade200),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onPressed: _showLogoutDialog,
      icon: const Icon(Icons.logout_rounded, size: 18),
      label: const Text('Sign Out of Account', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Log Out', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: const Text('Are you sure you want to sign out of your patient portal?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: AppColors.slate500)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700),
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, AppRoutes.login);
              },
              child: const Text('Sign Out', style: TextStyle(color: AppColors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }
}
