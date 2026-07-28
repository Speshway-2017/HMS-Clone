import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../services/nurse_service.dart';
import '../../authentication/services/auth_service.dart';

class NurseDashboard extends StatefulWidget {
  const NurseDashboard({super.key});

  @override
  State<NurseDashboard> createState() => _NurseDashboardState();
}

class _NurseDashboardState extends State<NurseDashboard> {
  int _currentIndex = 0;
  bool _isLoading = false;
  String? _errorMessage;
  String _nurseName = 'Staff Nurse';
  String _nurseEmail = '';
  String? _profileImagePath;

  // Password Change controllers
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _newPasswordObscure = true;
  bool _confirmPasswordObscure = true;
  bool _isSavingPassword = false;

  final NurseService _nurseService = NurseService();

  // State lists populated from MongoDB
  List<Map<String, dynamic>> _patients = [];
  List<Map<String, dynamic>> _medications = [];
  List<Map<String, dynamic>> _fluidLogs = [];

  // Local Checklist Tasks (can be added dynamically)
  final List<Map<String, dynamic>> _shiftTasks = [
    {'title': 'Complete Handover Log', 'done': true},
    {'title': 'Verify Emergency Cart Inventory', 'done': false},
    {'title': 'Collect Blood Samples for Room 102', 'done': false},
    {'title': 'Update Ward Intake/Output Chart', 'done': false},
  ];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final name = await AuthService.getUserName();
      if (name != null) {
        setState(() {
          _nurseName = name;
        });
      }

      final prefs = await SharedPreferences.getInstance();
      final email = prefs.getString('user_email') ?? '';
      final profilePath = prefs.getString('profile_image_path');
      setState(() {
        _nurseEmail = email;
        _profileImagePath = profilePath;
      });

      final inpatients = await _nurseService.getInpatients();
      final List<Map<String, dynamic>> mappedPatients = [];
      final List<Map<String, dynamic>> mappedMeds = [];
      final List<Map<String, dynamic>> mappedFluidLogs = [];

      for (var adm in inpatients) {
        final patient = adm['patient'];
        if (patient == null) continue;

        final patientId = patient['_id'] ?? '';
        final name = patient['name'] ?? 'Unknown';
        final age = patient['age'] ?? 0;
        final gender = patient['gender'] ?? '';
        final admissionId = adm['_id'] ?? '';

        final room = adm['room'];
        final bed = adm['bed'];
        final roomNumber = room != null ? (room['roomNumber'] ?? 'N/A') : 'N/A';
        final bedNumber = bed != null ? (bed['bedNumber'] ?? 'N/A') : 'N/A';
        final ward = adm['ward'] ?? 'Ward';

        // 1. Map Vitals
        final vitalsList = adm['vitals'] as List<dynamic>? ?? [];
        final lastVital = vitalsList.isNotEmpty ? vitalsList.last : null;
        
        final String bp = lastVital != null ? (lastVital['bloodPressure'] ?? '--/--') : '--/--';
        final String pulse = lastVital != null ? (lastVital['pulseRate'] ?? '--') : '--';
        final String spo2 = lastVital != null ? (lastVital['oxygenSaturation'] ?? '--') : '--';
        final String temp = lastVital != null ? (lastVital['temperature'] ?? '--') : '--';
        final String lastChecked = lastVital != null ? 'Just now' : 'Never today';

        // Compute vitals alert status
        String vitalsStatus = 'Pending';
        if (lastVital != null) {
          double? tempVal = double.tryParse(temp.replaceAll(RegExp(r'[^0-9.]'), ''));
          int? spo2Val = int.tryParse(spo2.replaceAll(RegExp(r'[^0-9]'), ''));
          if ((tempVal != null && tempVal > 100) || (spo2Val != null && spo2Val < 93)) {
            vitalsStatus = 'Critical';
          } else {
            vitalsStatus = 'Normal';
          }
        }

        mappedPatients.add({
          'id': patientId,
          'admissionId': admissionId,
          'name': name,
          'age': age,
          'gender': gender,
          'room': '$ward • Room $roomNumber • Bed $bedNumber',
          'vitalsStatus': vitalsStatus,
          'lastChecked': lastChecked,
          'bp': bp,
          'pulse': pulse.contains('bpm') || pulse == '--' ? pulse : '$pulse bpm',
          'spo2': spo2.contains('%') || spo2 == '--' ? spo2 : '$spo2%',
          'temp': temp.contains('°F') || temp == '--' ? temp : '$temp °F',
        });

        // 2. Map Medications
        final medOrders = adm['medicationOrders'] as List<dynamic>? ?? [];
        for (var med in medOrders) {
          if (med['status'] == 'stopped') continue;

          final medId = med['_id'] ?? '';
          final drugName = med['drugName'] ?? '';
          final dosage = med['dosage'] ?? '';
          final route = med['route'] ?? 'Oral';
          final frequency = med['frequency'] ?? '';

          // Check if administered today
          final history = med['history'] as List<dynamic>? ?? [];
          final bool administered = history.any((h) {
            if (h['action'] != 'administered') return false;
            try {
              final ts = DateTime.parse(h['timestamp']);
              final now = DateTime.now();
              return ts.year == now.year && ts.month == now.month && ts.day == now.day;
            } catch (_) {
              return false;
            }
          });

          mappedMeds.add({
            'id': medId,
            'admissionId': admissionId,
            'patientName': '$name ($ward-$roomNumber)',
            'medication': '$drugName $dosage',
            'time': frequency,
            'administered': administered,
            'route': route,
          });
        }

        // 3. Map Fluid Logs from Admission Timeline
        final timeline = adm['timeline'] as List<dynamic>? ?? [];
        double totalIntake = 0;
        double totalOutput = 0;
        List<Map<String, dynamic>> loggedFluids = [];

        for (var event in timeline) {
          if (event['eventType'] == 'fluid_log') {
            try {
              final data = jsonDecode(event['description']);
              final double intake = double.tryParse(data['intakeVolume'].toString()) ?? 0;
              final double output = double.tryParse(data['outputVolume'].toString()) ?? 0;
              totalIntake += intake;
              totalOutput += output;
              
              loggedFluids.add({
                'time': event['time'] ?? '',
                'intake': '${intake.toInt()} ml',
                'intakeRoute': data['intakeRoute'] ?? 'Oral',
                'output': '${output.toInt()} ml',
                'outputType': data['outputType'] ?? 'Urine',
                'recordedBy': event['userName'] ?? 'Nurse',
              });
            } catch (_) {}
          }
        }

        mappedFluidLogs.add({
          'admissionId': admissionId,
          'patientName': name,
          'room': 'Room $roomNumber • $ward',
          'monitoringReason': adm['admissionReason']?.toString().isNotEmpty == true 
              ? adm['admissionReason'].toString() 
              : 'Post-Op monitoring',
          'badge': 'STANDARD',
          'totalIntake': '${totalIntake.toInt()} ml',
          'totalOutput': '${totalOutput.toInt()} ml',
          'balance': '${(totalIntake - totalOutput).toInt()} ml',
          'history': loggedFluids,
        });
      }

      setState(() {
        _patients = mappedPatients;
        _medications = mappedMeds;
        _fluidLogs = mappedFluidLogs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildVitalsScreen(responsive),
      _buildMedsScreen(responsive),
      _buildSettingsScreen(responsive),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC), // Soft aesthetic gray/blue background
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(
          _currentIndex == 0
              ? 'Nurse Workspace'
              : (_currentIndex == 1
                  ? 'Vitals Tracker'
                  : (_currentIndex == 2 ? 'Medication Schedule' : 'Account Settings')),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Reload',
            onPressed: _loadDashboardData,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Log Out',
            onPressed: () async {
              await AuthService.logout();
              if (mounted) {
                Navigator.pushReplacementNamed(context, AppRoutes.login);
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              color: AppColors.navy700,
              child: pages[_currentIndex],
            ),
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
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite_border_rounded),
            activeIcon: Icon(Icons.favorite_rounded),
            label: 'Vitals',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.medication_outlined),
            activeIcon: Icon(Icons.medication_rounded),
            label: 'Meds Due',
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

  // --- HOME SCREEN ---
  Widget _buildHomeScreen(ResponsiveHelper responsive) {
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.errorRed, size: 48),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.slate700, fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadDashboardData,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, foregroundColor: Colors.white),
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildWelcomeSection(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),

          // Premium Section: Active Fluid Monitoring Cards (UI mockup matches)
          if (_fluidLogs.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Fluid Monitoring Logs',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate800,
                  ),
                ),
                Text(
                  '${_fluidLogs.length} Active',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w600),
                )
              ],
            ),
            const SizedBox(height: 10),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _fluidLogs.length,
              itemBuilder: (context, index) {
                final log = _fluidLogs[index];
                return _buildFluidLogCard(log, responsive);
              },
            ),
            SizedBox(height: responsive.scaleHeight(20.0)),
          ] else ...[
            // Default placeholder card to look like the design if no admissions exist yet
            const Text(
              'Fluid Monitoring Logs',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.slate800,
              ),
            ),
            const SizedBox(height: 10),
            _buildFluidLogCard({
              'admissionId': '',
              'patientName': 'Mark Wu',
              'room': 'Room 208 • Post-Op',
              'monitoringReason': 'Post-Op monitoring',
              'badge': 'STANDARD',
              'totalIntake': '0 ml',
              'totalOutput': '0 ml',
              'balance': '0 ml',
              'history': [],
            }, responsive),
            SizedBox(height: responsive.scaleHeight(20.0)),
          ],

          // Quick Actions Row (UI Mockup)
          _buildQuickActionsRow(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Stats Row
          _buildStatsRow(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Urgent Care Alerts
          const Text(
            'Urgent Care Notices',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),
          _buildUrgentCareCard(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Shift Checklist
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My Shift Checklist',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate800,
                ),
              ),
              Text(
                '${_shiftTasks.where((t) => t['done']).length}/${_shiftTasks.length} Done',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navy600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildShiftChecklist(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection(ResponsiveHelper responsive) {
    return Container(
      padding: EdgeInsets.all(responsive.scaleWidth(18.0)),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(20.0),
        border: Border.all(color: const Color(0xFFF1F3F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.navy50,
            child: Text(
              _nurseName.isNotEmpty ? _nurseName.substring(0, 2).toUpperCase() : 'NS',
              style: const TextStyle(
                color: AppColors.navy700,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _nurseName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Care Station Nurse • Ward B',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.slate500,
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

  // Fluid Log Card implementing the exact mockup UI
  Widget _buildFluidLogCard(Map<String, dynamic> log, ResponsiveHelper responsive) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(24.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24.0),
          onTap: () => _showFluidDetailsSheet(log),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Row(
              children: [
                // Fluid Drop Icon (partially filled matching the mockup)
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF0F6),
                    borderRadius: BorderRadius.circular(16.0),
                  ),
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 24,
                      child: CustomPaint(
                        painter: DropletPainter(fillPercent: 0.65),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Fluid Log: ',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.slate900,
                            ),
                          ),
                          Text(
                            log['patientName'] ?? '',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.slate900,
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Badge Pill
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECEEF5),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              log['badge'] ?? 'STANDARD',
                              style: const TextStyle(
                                color: Color(0xFF536E9B),
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        '${log['room']} • ${log['monitoringReason']}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.slate500,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: Color(0xFFC7CDDA),
                  size: 14,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Quick Actions Panel row matching the UI mockup
  Widget _buildQuickActionsRow(ResponsiveHelper responsive) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildActionCircle(
          icon: Icons.add_task_rounded,
          label: 'New Task',
          onTap: () async {
            final result = await Navigator.pushNamed(context, AppRoutes.nurseAssignTask);
            if (result != null && result is Map<String, dynamic>) {
              setState(() {
                _shiftTasks.add(result);
              });
            }
          },
        ),
        _buildActionCircle(
          icon: Icons.person_search_rounded,
          label: 'Patients',
          onTap: () {
            setState(() {
              _currentIndex = 1; // Switches tab index to Vitals Tracker
            });
          },
        ),
        _buildActionCircle(
          icon: Icons.chat_bubble_outline_rounded,
          label: 'Log Note',
          onTap: () => Navigator.pushNamed(context, AppRoutes.nurseNursingNotes),
        ),
        _buildActiveActionSquare(
          icon: Icons.add_rounded,
          label: 'Shift Log',
          onTap: () => Navigator.pushNamed(context, AppRoutes.nurseShiftHandover),
        ),
      ],
    );
  }

  Widget _buildActionCircle({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFECEEF5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onTap,
              child: Icon(
                icon,
                color: const Color(0xFF0F3E92),
                size: 22,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.slate700,
          ),
        )
      ],
    );
  }

  Widget _buildActiveActionSquare({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFF0F3E92),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F3E92).withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: onTap,
              child: Icon(
                icon,
                color: Colors.white,
                size: 26,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.slate700,
          ),
        )
      ],
    );
  }

  Widget _buildStatsRow(ResponsiveHelper responsive) {
    final pendingVitals = _patients.where((p) => p['vitalsStatus'] == 'Pending').length;
    final criticalVitals = _patients.where((p) => p['vitalsStatus'] == 'Critical').length;
    final medsDue = _medications.where((m) => !m['administered']).length;

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            title: 'Critical Patients',
            value: '$criticalVitals',
            color: AppColors.errorRed,
            bgColor: AppColors.errorBg,
            responsive: responsive,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            title: 'Meds Pending',
            value: '$medsDue',
            color: Colors.amber.shade800,
            bgColor: Colors.amber.shade50,
            responsive: responsive,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            title: 'Vitals Pending',
            value: '$pendingVitals',
            color: AppColors.navy700,
            bgColor: AppColors.navy50,
            responsive: responsive,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required Color color,
    required Color bgColor,
    required ResponsiveHelper responsive,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 12.0),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: responsive.scaleText(20.0),
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.slate600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUrgentCareCard(ResponsiveHelper responsive) {
    final critical = _patients.firstWhere((p) => p['vitalsStatus'] == 'Critical', orElse: () => {});
    if (critical.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppColors.emerald600, size: 18),
            SizedBox(width: 12),
            Text(
              'No critical inpatient alerts at this time.',
              style: TextStyle(fontSize: 12, color: AppColors.slate600, fontWeight: FontWeight.w500),
            )
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
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: const BoxDecoration(
              color: AppColors.errorBg,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.warning_amber_rounded, color: AppColors.errorRed, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${critical['name']} (${critical['room'].split(' • ')[1]})',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                Text(
                  'BP (${critical['bp']}) & Temp (${critical['temp']}). Retake vitals.',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.errorRed,
              foregroundColor: AppColors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: () {
              setState(() {
                _currentIndex = 1; // Go to vitals screen
              });
            },
            child: const Text('Update', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildShiftChecklist(ResponsiveHelper responsive) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _shiftTasks.length,
        separatorBuilder: (context, index) => const Divider(color: AppColors.slate100, height: 1),
        itemBuilder: (context, index) {
          final task = _shiftTasks[index];
          return CheckboxListTile(
            value: task['done'],
            activeColor: AppColors.navy700,
            title: Text(
              task['title'],
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: task['done'] ? AppColors.slate400 : AppColors.slate800,
                decoration: task['done'] ? TextDecoration.lineThrough : null,
              ),
            ),
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: (val) {
              setState(() {
                task['done'] = val;
              });
            },
          );
        },
      ),
    );
  }

  // --- VITALS SCREEN ---
  Widget _buildVitalsScreen(ResponsiveHelper responsive) {
    if (_patients.isEmpty) {
      return const Center(
        child: Text(
          'No active patients registered.',
          style: TextStyle(color: AppColors.slate500, fontSize: 13, fontWeight: FontWeight.w500),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      itemCount: _patients.length,
      itemBuilder: (context, index) {
        final patient = _patients[index];
        Color statusColor = AppColors.slate400;
        Color statusBgColor = AppColors.slate100;
        if (patient['vitalsStatus'] == 'Normal') {
          statusColor = AppColors.emerald600;
          statusBgColor = AppColors.emerald50;
        } else if (patient['vitalsStatus'] == 'Critical') {
          statusColor = AppColors.errorRed;
          statusBgColor = AppColors.errorBg;
        } else if (patient['vitalsStatus'] == 'Pending') {
          statusColor = AppColors.navy700;
          statusBgColor = AppColors.navy50;
        }

        return GestureDetector(
          onTap: () {
            Navigator.pushNamed(
              context,
              AppRoutes.nursePatientProfile,
              arguments: patient,
            );
          },
          child: Container(
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
                        '${patient['name']} (${patient['gender'].toString().isNotEmpty ? patient['gender'][0] : 'U'}, ${patient['age']})',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.slate900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        patient['room'],
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.slate500,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBgColor,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      patient['vitalsStatus'].toString().toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(color: AppColors.slate100, height: 1),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildVitalMetric('BP', patient['bp'], Icons.speed, Colors.purple),
                  _buildVitalMetric('Pulse', patient['pulse'], Icons.favorite, Colors.red),
                  _buildVitalMetric('SpO2', patient['spo2'], Icons.air, Colors.blue),
                  _buildVitalMetric('Temp', patient['temp'], Icons.thermostat, Colors.orange),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Checked: ${patient['lastChecked']}',
                    style: const TextStyle(fontSize: 10, color: AppColors.slate400),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.navy700,
                      foregroundColor: AppColors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: () async {
                      final result = await Navigator.pushNamed(
                        context,
                        AppRoutes.nursePatientVitals,
                        arguments: patient,
                      );
                      if (result == true) {
                        _loadDashboardData();
                      }
                    },
                    icon: const Icon(Icons.add_circle_outline_rounded, size: 14),
                    label: const Text('Record Vitals', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              )
            ],
          ),
        ),);
      },
    );
  }

  Widget _buildVitalMetric(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
        ),
      ],
    );
  }



  // --- MEDS SCREEN ---
  Widget _buildMedsScreen(ResponsiveHelper responsive) {
    if (_medications.isEmpty) {
      return const Center(
        child: Text(
          'No scheduled medications for today.',
          style: TextStyle(color: AppColors.slate500, fontSize: 13, fontWeight: FontWeight.w500),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      itemCount: _medications.length,
      itemBuilder: (context, index) {
        final med = _medications[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12.0),
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: med['administered'] ? AppColors.slate100 : AppColors.white,
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: AppColors.slate200),
          ),
          child: Row(
            children: [
              // Checkbox indicator linked to MERN database
              GestureDetector(
                onTap: () async {
                  if (med['administered']) return; // Disable unchecking to maintain clinical safety
                  
                  setState(() {
                    _isLoading = true;
                  });

                  try {
                    await _nurseService.administerMedication(
                      admissionId: med['admissionId'],
                      medicationId: med['id'],
                    );
                    await _loadDashboardData();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: AppColors.emerald600,
                          content: Text('${med['medication']} marked as administered.'),
                        ),
                      );
                    }
                  } catch (e) {
                    setState(() {
                      _isLoading = false;
                      _errorMessage = e.toString();
                    });
                  }
                },
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: med['administered'] ? AppColors.emerald500 : AppColors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: med['administered'] ? AppColors.emerald500 : AppColors.slate300,
                      width: 1.5,
                    ),
                  ),
                  child: med['administered']
                      ? const Icon(Icons.check, size: 14, color: AppColors.white)
                      : null,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      med['medication'],
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: med['administered'] ? AppColors.slate500 : AppColors.slate900,
                        decoration: med['administered'] ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Patient: ${med['patientName']} • ${med['route']}',
                      style: TextStyle(
                        fontSize: 10,
                        color: med['administered'] ? AppColors.slate400 : AppColors.slate500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: med['administered'] ? AppColors.slate200 : AppColors.navy50,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.access_time_rounded,
                      size: 10,
                      color: med['administered'] ? AppColors.slate500 : AppColors.navy700,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      med['time'],
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: med['administered'] ? AppColors.slate500 : AppColors.navy700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- SETTINGS SCREEN (Change Password) ---
  Widget _buildSettingsScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Profile Header Display
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: const Color(0xFFEFF1F7)),
            ),
            child: Column(
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 46,
                      backgroundColor: AppColors.navy100,
                      backgroundImage: _profileImagePath != null 
                          ? FileImage(File(_profileImagePath!)) 
                          : null,
                      child: _profileImagePath == null 
                          ? Text(
                              _nurseName.isNotEmpty ? _nurseName.substring(0, 2).toUpperCase() : 'NS',
                              style: const TextStyle(
                                color: AppColors.navy700,
                                fontWeight: FontWeight.bold,
                                fontSize: 24,
                              ),
                            )
                          : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _showImagePickerOptions,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: AppColors.navy700,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  _nurseName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _nurseEmail,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.slate500,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.navy50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Registered Nurse (RN)',
                    style: TextStyle(
                      color: AppColors.navy700,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text(
            'Security & Credentials',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),

          // Change Password Form
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: const Color(0xFFEFF1F7)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Change Password',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate800,
                  ),
                ),
                const SizedBox(height: 16),

                // New Password field
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: _newPasswordObscure,
                  style: const TextStyle(fontSize: 13, color: AppColors.slate900),
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    labelStyle: const TextStyle(fontSize: 12, color: AppColors.slate500),
                    border: const OutlineInputBorder(),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _newPasswordObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: AppColors.slate400,
                      ),
                      onPressed: () {
                        setState(() {
                          _newPasswordObscure = !_newPasswordObscure;
                        });
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Confirm Password field
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _confirmPasswordObscure,
                  style: const TextStyle(fontSize: 13, color: AppColors.slate900),
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    labelStyle: const TextStyle(fontSize: 12, color: AppColors.slate500),
                    border: const OutlineInputBorder(),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _confirmPasswordObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: AppColors.slate400,
                      ),
                      onPressed: () {
                        setState(() {
                          _confirmPasswordObscure = !_confirmPasswordObscure;
                        });
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy700,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isSavingPassword ? null : _handleChangePassword,
                  child: _isSavingPassword
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Update Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleChangePassword() async {
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (newPassword.isEmpty || confirmPassword.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.errorRed,
          content: Text('Please fill out all fields.'),
        ),
      );
      return;
    }

    if (newPassword != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.errorRed,
          content: Text('Passwords do not match.'),
        ),
      );
      return;
    }

    setState(() {
      _isSavingPassword = true;
    });

    try {
      final auth = AuthService();
      await auth.changePassword(newPassword, confirmPassword);
      
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.emerald600,
            content: Text('Password changed successfully.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.errorRed,
            content: Text(e.toString()),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSavingPassword = false;
        });
      }
    }
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: AppColors.navy700),
                title: const Text('Take Photo (Camera)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  _pickProfileImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: AppColors.navy700),
                title: const Text('Choose from Gallery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  _pickProfileImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickProfileImage(ImageSource source) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        maxWidth: 500,
        maxHeight: 500,
        imageQuality: 85,
      );
      
      if (image != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('profile_image_path', image.path);
        setState(() {
          _profileImagePath = image.path;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppColors.emerald600,
              content: Text('Profile picture updated successfully.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.errorRed,
            content: Text('Failed to capture profile picture: $e'),
          ),
        );
      }
    }
  }

  // --- LOGIC SHEETS FOR ACTIONS ---



  // Bottom sheet showing fluid monitoring logs and allowing logging
  void _showFluidDetailsSheet(Map<String, dynamic> log) {
    final intakeValController = TextEditingController();
    final intakeRouteController = TextEditingController(text: 'Oral');
    final outputValController = TextEditingController();
    final outputTypeController = TextEditingController(text: 'Urine');

    final history = log['history'] as List<dynamic>? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 20,
                right: 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Fluid Balance Sheet: ${log['patientName']}',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${log['room']} • Monitoring Intake/Output',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Display Totals Banner
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F4F9),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildFluidMetric('Intake', log['totalIntake'] ?? '0 ml', Colors.blue.shade700),
                          _buildFluidMetric('Output', log['totalOutput'] ?? '0 ml', Colors.orange.shade700),
                          _buildFluidMetric('Balance', log['balance'] ?? '0 ml', const Color(0xFF0F3E92)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Log History
                    const Text('Intake & Output History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.slate800)),
                    const SizedBox(height: 8),
                    if (history.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: const Center(
                          child: Text(
                            'No fluids logged today.',
                            style: TextStyle(color: AppColors.slate500, fontSize: 12),
                          ),
                        ),
                      )
                    else
                      Container(
                        constraints: const BoxConstraints(maxHeight: 150),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          physics: const BouncingScrollPhysics(),
                          itemCount: history.length,
                          separatorBuilder: (context, i) => const Divider(color: AppColors.slate100, height: 1),
                          itemBuilder: (context, index) {
                            final item = history[index];
                            return Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Intake: ${item['intake']} (${item['intakeRoute']})',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate800),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Output: ${item['output']} (${item['outputType']})',
                                        style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        item['time'],
                                        style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'By: ${item['recordedBy']}',
                                        style: const TextStyle(fontSize: 9, color: AppColors.slate400),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    const SizedBox(height: 20),

                    // Input Fields to Log fluid
                    const Text('Record Fluid Log', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.slate800)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: intakeValController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Intake (ml)',
                              hintText: 'e.g., 250',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: intakeRouteController,
                            decoration: const InputDecoration(
                              labelText: 'Intake Route',
                              hintText: 'e.g., IV or Oral',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: outputValController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Output (ml)',
                              hintText: 'e.g., 200',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: outputTypeController,
                            decoration: const InputDecoration(
                              labelText: 'Output Type',
                              hintText: 'e.g., Urine',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.navy700,
                        foregroundColor: AppColors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        if (log['admissionId'] == '') {
                          // Prevent database operations on mock items
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Cannot log fluid on mock placeholder patient. Please seed active admissions.')),
                          );
                          return;
                        }

                        Navigator.pop(context);
                        setState(() {
                          _isLoading = true;
                        });

                        try {
                          await _nurseService.logFluid(
                            admissionId: log['admissionId'],
                            intakeVolume: intakeValController.text.trim().isEmpty ? '0' : intakeValController.text.trim(),
                            intakeRoute: intakeRouteController.text.trim().isEmpty ? 'Oral' : intakeRouteController.text.trim(),
                            outputVolume: outputValController.text.trim().isEmpty ? '0' : outputValController.text.trim(),
                            outputType: outputTypeController.text.trim().isEmpty ? 'Urine' : outputTypeController.text.trim(),
                          );
                          
                          await _loadDashboardData();
                          
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: AppColors.emerald600,
                                content: Text('Fluid log recorded for ${log['patientName']}.'),
                              ),
                            );
                          }
                        } catch (e) {
                          setState(() {
                            _isLoading = false;
                            _errorMessage = e.toString();
                          });
                        }
                      },
                      child: const Text('Save Fluid Records', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFluidMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }
}

// Droplet painter drawing custom water drop representation
class DropletPainter extends CustomPainter {
  final double fillPercent;
  DropletPainter({this.fillPercent = 0.5});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0F3E92)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path();
    path.moveTo(size.width / 2, size.height * 0.1);
    path.quadraticBezierTo(
      size.width * 0.95,
      size.height * 0.65,
      size.width * 0.8,
      size.height * 0.85,
    );
    path.arcToPoint(
      Offset(size.width * 0.2, size.height * 0.85),
      radius: Radius.circular(size.width * 0.4),
      clockwise: true,
    );
    path.quadraticBezierTo(
      size.width * 0.05,
      size.height * 0.65,
      size.width / 2,
      size.height * 0.1,
    );
    path.close();
    canvas.drawPath(path, paint);

    final fillPaint = Paint()
      ..color = const Color(0xFF0F3E92).withOpacity(0.85)
      ..style = PaintingStyle.fill;
    
    canvas.save();
    canvas.clipPath(path);
    final fillRect = Rect.fromLTRB(
      0,
      size.height * (1.0 - fillPercent),
      size.width,
      size.height,
    );
    canvas.drawRect(fillRect, fillPaint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant DropletPainter oldDelegate) => oldDelegate.fillPercent != fillPercent;
}
