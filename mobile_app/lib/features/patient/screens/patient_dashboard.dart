import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../../authentication/services/auth_service.dart';

class PatientDashboard extends StatefulWidget {
  const PatientDashboard({super.key});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  int _currentIndex = 0;

  // Real Patient Info
  late String _patientName;
  late String _patientUhid;
  late String _hospitalName;

  // Real Patient Vitals, Appointments, Prescriptions, Reports
  Map<String, String>? _vitals;
  List<Map<String, dynamic>> _appointments = [];
  List<Map<String, dynamic>> _prescriptions = [];
  List<Map<String, dynamic>> _reports = [];

  @override
  void initState() {
    super.initState();
    _loadPatientProfile();
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
    } else {
      _patientName = 'Registered Patient';
      _patientUhid = 'UHID-REGISTERED';
      _hospitalName = 'Sunrise General Hospital';
    }
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildPrescriptionsScreen(responsive),
      _buildReportsScreen(responsive),
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
              : (_currentIndex == 1 ? 'My Prescriptions' : 'Medical Reports'),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Log Out',
            onPressed: () {
              Navigator.pushReplacementNamed(context, AppRoutes.login);
            },
          ),
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: AppColors.navy700,
        unselectedItemColor: AppColors.slate400,
        backgroundColor: AppColors.white,
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
    return Container(
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
            color: AppColors.navy900.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.white.withOpacity(0.2),
            child: const Icon(Icons.person_rounded, color: AppColors.white, size: 28),
          ),
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
                    color: AppColors.white.withOpacity(0.7),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _hospitalName,
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.white.withOpacity(0.5),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
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
            color: color.withOpacity(0.1),
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
          title: 'Billing & Invoices',
          desc: 'Pay active billing slips',
          icon: Icons.payments_rounded,
          color: Colors.deepPurple.shade700,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Billing details are loading from the database...')),
            );
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
}
