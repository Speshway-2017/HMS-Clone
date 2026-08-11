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
import 'shift_handover_screen.dart';

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
  List<Map<String, dynamic>> _wards = [];
  String _selectedWardFilter = 'All Wards';
  final List<Map<String, dynamic>> _nursingNotes = [];



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

      // 4. Fetch Real Wards & Compute Occupancy
      List<dynamic> wardsData = [];
      try {
        wardsData = await _nurseService.getWards();
      } catch (_) {
        wardsData = [];
      }

      final List<Map<String, dynamic>> mappedWards = [];
      for (var w in wardsData) {
        final wardName = w['name']?.toString() ?? 'Ward';
        final wardCode = w['code']?.toString() ?? '';
        final wardType = w['wardType']?.toString() ?? 'General';
        final floorNumber = w['floorNumber'] ?? 1;
        final description = w['description']?.toString() ?? '';

        int occupiedBeds = mappedPatients.where((p) {
          final roomStr = (p['room'] ?? '').toString().toLowerCase();
          return roomStr.contains(wardName.toLowerCase()) ||
                 (wardCode.isNotEmpty && roomStr.contains(wardCode.toLowerCase()));
        }).length;

        int totalBeds = 10;
        if (occupiedBeds > totalBeds) totalBeds = occupiedBeds + 2;

        mappedWards.add({
          'id': w['_id']?.toString() ?? wardName,
          'name': wardName,
          'code': wardCode,
          'wardType': wardType,
          'floorNumber': floorNumber,
          'description': description,
          'occupiedBeds': occupiedBeds,
          'totalBeds': totalBeds,
          'occupancyRate': (occupiedBeds / totalBeds * 100).round(),
        });
      }

      // Fallback: If no backend ward documents found, extract unique wards from patient room allocations!
      if (mappedWards.isEmpty) {
        final Set<String> uniqueWardNames = {};
        for (var p in mappedPatients) {
          final r = p['room']?.toString() ?? '';
          if (r.contains('•')) {
            uniqueWardNames.add(r.split('•').first.trim());
          } else if (r.isNotEmpty) {
            uniqueWardNames.add(r);
          }
        }
        if (uniqueWardNames.isEmpty) {
          uniqueWardNames.addAll(['General Ward A', 'ICU Care Station', 'Private Ward B']);
        }

        for (var wName in uniqueWardNames) {
          int occupied = mappedPatients.where((p) => (p['room']?.toString() ?? '').contains(wName)).length;
          int totalBeds = 10;
          if (occupied > totalBeds) totalBeds = occupied + 2;
          mappedWards.add({
            'id': wName,
            'name': wName,
            'code': wName.length >= 3 ? wName.substring(0, 3).toUpperCase() : wName.toUpperCase(),
            'wardType': wName.toLowerCase().contains('icu') ? 'ICU' : 'General',
            'floorNumber': 1,
            'description': 'Active Inpatient Ward Unit',
            'occupiedBeds': occupied,
            'totalBeds': totalBeds,
            'occupancyRate': (occupied / totalBeds * 100).round(),
          });
        }
      }

      setState(() {
        _patients = mappedPatients;
        _medications = mappedMeds;
        _fluidLogs = mappedFluidLogs;
        _wards = mappedWards;
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
      const ShiftHandoverScreen(),
      _buildNotesScreen(responsive),
      _buildMoreQuickActionsScreen(responsive),
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
                  ? 'Assigned Patients & Vitals'
                  : (_currentIndex == 2
                      ? 'Shift Handover Hub'
                      : (_currentIndex == 3 ? 'Nursing Notes & Logs' : 'Nurse Quick Actions'))),
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
              final nav = Navigator.of(context);
              await AuthService.logout();
              nav.pushReplacementNamed(AppRoutes.login);
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
            icon: Icon(Icons.people_alt_outlined),
            activeIcon: Icon(Icons.people_alt_rounded),
            label: 'Patients',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.swap_horiz_rounded),
            activeIcon: Icon(Icons.swap_horizontal_circle_rounded),
            label: 'Handover',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.note_alt_outlined),
            activeIcon: Icon(Icons.note_alt_rounded),
            label: 'Notes',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.grid_view_outlined),
            activeIcon: Icon(Icons.grid_view_rounded),
            label: 'More',
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
            const Text(
              'Fluid Monitoring Logs',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.slate800,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(16.0),
                border: Border.all(color: const Color(0xFFEFF1F7)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.water_drop_outlined, color: AppColors.slate400, size: 22),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'No active fluid monitoring logs recorded.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.slate500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: responsive.scaleHeight(20.0)),
          ],

          // Quick Actions Row (UI Mockup)
          _buildQuickActionsRow(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Stats Row
          _buildStatsRow(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Ward Management & Occupancy Overview
          _buildWardManagementSection(responsive),
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
            color: Colors.black.withValues(alpha: 0.02),
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
            color: Colors.black.withValues(alpha: 0.015),
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
          icon: Icons.speed_rounded,
          label: 'Vitals',
          onTap: () {
            setState(() {
              _currentIndex = 1;
            });
          },
        ),
        _buildActionCircle(
          icon: Icons.person_search_rounded,
          label: 'Patients',
          onTap: () {
            setState(() {
              _currentIndex = 1;
            });
          },
        ),
        _buildActionCircle(
          icon: Icons.chat_bubble_outline_rounded,
          label: 'Log Note',
          onTap: () {
            setState(() {
              _currentIndex = 3;
            });
          },
        ),
        _buildActiveActionSquare(
          icon: Icons.add_rounded,
          label: 'Shift Log',
          onTap: () {
            setState(() {
              _currentIndex = 2;
            });
          },
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
                color: Colors.black.withValues(alpha: 0.04),
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
                color: const Color(0xFF0F3E92).withValues(alpha: 0.3),
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
        border: Border.all(color: color.withValues(alpha: 0.15)),
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
                    final messenger = ScaffoldMessenger.of(context);
                    await _nurseService.administerMedication(
                      admissionId: med['admissionId'],
                      medicationId: med['id'],
                    );
                    await _loadDashboardData();
                    messenger.showSnackBar(
                      SnackBar(
                        backgroundColor: AppColors.emerald600,
                        content: Text('${med['medication']} marked as administered.'),
                      ),
                    );
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

  // --- NURSING NOTES SCREEN (Tab 3) ---
  Widget _buildNotesScreen(ResponsiveHelper responsive) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.pushNamed(context, AppRoutes.nurseNursingNotes);
          if (result != null && result is Map<String, dynamic>) {
            setState(() {
              _nursingNotes.insert(0, result);
            });
          }
        },
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_comment_rounded, size: 18),
        label: const Text('Add Note', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nursing Notes & Logs',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.slate900,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Ward observations, clinical logs, and patient notes.',
                      style: TextStyle(fontSize: 11, color: AppColors.slate500),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () async {
                    final result = await Navigator.pushNamed(context, AppRoutes.nurseNursingNotes);
                    if (result != null && result is Map<String, dynamic>) {
                      setState(() {
                        _nursingNotes.insert(0, result);
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.edit_note_rounded, size: 16),
                  label: const Text('New Note', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_nursingNotes.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(16.0),
                  border: Border.all(color: const Color(0xFFEFF1F7)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.note_alt_outlined, color: AppColors.slate400, size: 40),
                    const SizedBox(height: 12),
                    const Text(
                      'No nursing notes recorded today.',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate700),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tap "New Note" to add a clinical observation or shift note.',
                      style: TextStyle(fontSize: 11, color: AppColors.slate500),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final result = await Navigator.pushNamed(context, AppRoutes.nurseNursingNotes);
                        if (result != null && result is Map<String, dynamic>) {
                          setState(() {
                            _nursingNotes.insert(0, result);
                          });
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.navy700,
                        side: const BorderSide(color: AppColors.navy700),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('Create First Note'),
                    ),
                  ],
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _nursingNotes.length,
                itemBuilder: (context, index) {
                  final note = _nursingNotes[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12.0),
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16.0),
                      border: Border.all(color: const Color(0xFFEFF1F7)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              note['patientName'] ?? 'General Ward Note',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.slate900,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: note['priority'] == 'Critical' 
                                    ? AppColors.errorBg 
                                    : AppColors.navy50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                (note['category'] ?? 'Observation').toString().toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: note['priority'] == 'Critical' 
                                      ? AppColors.errorRed 
                                      : AppColors.navy700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          note['note'] ?? note['content'] ?? '',
                          style: const TextStyle(fontSize: 12, color: AppColors.slate700),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'By $_nurseName • ${note['time'] ?? 'Just now'}',
                              style: const TextStyle(fontSize: 10, color: AppColors.slate400),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
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

  // --- MORE / QUICK ACTIONS HUB SCREEN ---
  Widget _buildMoreQuickActionsScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Nurse Quick Actions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.slate900,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Clinical management tools, ward logging, and account settings.',
            style: TextStyle(fontSize: 12, color: AppColors.slate500),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              int crossAxisCount = width >= 1025 ? 4 : (width >= 768 ? 3 : 2);
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  _buildQuickActionHubCard(
                    title: 'Ward Management',
                    subtitle: 'Bed Roster & Occupancy',
                    icon: Icons.king_bed_rounded,
                    color: Colors.indigo.shade700,
                    bgColor: Colors.indigo.shade50,
                    onTap: () => _showWardManagementSheet(responsive),
                  ),
                  _buildQuickActionHubCard(
                    title: 'Medication Schedule',
                    subtitle: 'Administration Log',
                    icon: Icons.medication_rounded,
                    color: AppColors.emerald600,
                    bgColor: AppColors.emerald50,
                    onTap: () => _showMedsSheet(responsive),
                  ),
                  _buildQuickActionHubCard(
                    title: 'Bedside Care Log',
                    subtitle: 'Intake & Output Chart',
                    icon: Icons.water_drop_rounded,
                    color: Colors.blue.shade700,
                    bgColor: Colors.blue.shade50,
                    onTap: () => _showBedsideCareSheet(responsive),
                  ),
                  _buildQuickActionHubCard(
                    title: 'Emergency Alert',
                    subtitle: 'Broadcast Ward Notice',
                    icon: Icons.error_rounded,
                    color: AppColors.errorRed,
                    bgColor: AppColors.errorBg,
                    onTap: () => _showEmergencyAlertSheet(responsive),
                  ),
                  _buildQuickActionHubCard(
                    title: 'Discharge Prep',
                    subtitle: 'Readiness Checklist',
                    icon: Icons.assignment_turned_in_rounded,
                    color: Colors.teal.shade700,
                    bgColor: Colors.teal.shade50,
                    onTap: () => _showDischargePrepSheet(responsive),
                  ),
                  _buildQuickActionHubCard(
                    title: 'Account Settings',
                    subtitle: 'Profile & Security',
                    icon: Icons.settings_rounded,
                    color: AppColors.slate700,
                    bgColor: AppColors.slate100,
                    onTap: () => _showSettingsSheet(responsive),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionHubCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16.0),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 10, color: AppColors.slate500),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showSettingsSheet(ResponsiveHelper responsive) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: _buildSettingsScreen(responsive),
          ),
        );
      },
    );
  }

  void _showMedsSheet(ResponsiveHelper responsive) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.only(left: 16, right: 16, top: 20, bottom: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Medication Schedule',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Expanded(
                child: SingleChildScrollView(
                  child: _buildMedsScreen(responsive),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showBedsideCareSheet(ResponsiveHelper responsive) {
    if (_fluidLogs.isNotEmpty) {
      _showFluidDetailsSheet(_fluidLogs.first);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.slate700,
          content: Text('No active fluid logs recorded yet.'),
        ),
      );
    }
  }

  void _showEmergencyAlertSheet(ResponsiveHelper responsive) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.errorRed, size: 28),
                  SizedBox(width: 10),
                  Text('Emergency Alert Broadcast', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Select emergency type to notify all ward staff and attending physicians instantly:'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed, foregroundColor: Colors.white),
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(backgroundColor: AppColors.errorRed, content: Text('CODE BLUE Emergency Broadcasted!')),
                  );
                },
                icon: const Icon(Icons.emergency_rounded),
                label: const Text('Broadcast CODE BLUE (Cardiac Arrest)'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.navy700),
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(backgroundColor: AppColors.navy700, content: Text('Rapid Response Team Alerted.')),
                  );
                },
                icon: const Icon(Icons.notifications_active_rounded),
                label: const Text('Rapid Response Team Alert'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDischargePrepSheet(ResponsiveHelper responsive) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Discharge Readiness Prep', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              const SizedBox(height: 12),
              const CheckboxListTile(value: true, onChanged: null, title: Text('Take-Home Medications Reconciled', style: TextStyle(fontSize: 12))),
              const CheckboxListTile(value: true, onChanged: null, title: Text('Physician Discharge Summary Signed', style: TextStyle(fontSize: 12))),
              const CheckboxListTile(value: false, onChanged: null, title: Text('Patient Transport & Escort Confirmed', style: TextStyle(fontSize: 12))),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, foregroundColor: Colors.white),
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(backgroundColor: AppColors.emerald600, content: Text('Discharge checklist updated.')),
                  );
                },
                child: const Text('Confirm Readiness'),
              ),
            ],
          ),
        );
      },
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
                          final messenger = ScaffoldMessenger.of(context);
                          await _nurseService.logFluid(
                            admissionId: log['admissionId'],
                            intakeVolume: intakeValController.text.trim().isEmpty ? '0' : intakeValController.text.trim(),
                            intakeRoute: intakeRouteController.text.trim().isEmpty ? 'Oral' : intakeRouteController.text.trim(),
                            outputVolume: outputValController.text.trim().isEmpty ? '0' : outputValController.text.trim(),
                            outputType: outputTypeController.text.trim().isEmpty ? 'Urine' : outputTypeController.text.trim(),
                          );
                          
                          await _loadDashboardData();
                          messenger.showSnackBar(
                            SnackBar(
                              backgroundColor: AppColors.emerald600,
                              content: Text('Fluid log recorded for ${log['patientName']}.'),
                            ),
                          );
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

  Widget _buildWardManagementSection(ResponsiveHelper responsive) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.king_bed_rounded, color: Colors.indigo.shade700, size: 18),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Ward Management & Occupancy',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate800,
                  ),
                ),
              ],
            ),
            GestureDetector(
              onTap: () => _showWardManagementSheet(responsive),
              child: Text(
                'Bed Roster (${_wards.length} Wards)',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.indigo.shade700,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_wards.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEFF1F7)),
            ),
            child: const Row(
              children: [
                Icon(Icons.bed_outlined, color: AppColors.slate400, size: 20),
                SizedBox(width: 10),
                Text(
                  'No ward allocation records found.',
                  style: TextStyle(fontSize: 12, color: AppColors.slate500),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 145,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: _wards.length,
              itemBuilder: (context, index) {
                final ward = _wards[index];
                final String name = ward['name'] ?? 'Ward';
                final String type = ward['wardType'] ?? 'General';
                final int occupied = ward['occupiedBeds'] ?? 0;
                final int total = ward['totalBeds'] ?? 10;
                final int rate = ward['occupancyRate'] ?? 0;
                final int floor = ward['floorNumber'] ?? 1;

                Color badgeColor = Colors.blue.shade700;
                Color badgeBg = Colors.blue.shade50;
                if (type.toUpperCase().contains('ICU')) {
                  badgeColor = Colors.amber.shade800;
                  badgeBg = Colors.amber.shade50;
                } else if (type.toUpperCase().contains('PRIVATE')) {
                  badgeColor = Colors.purple.shade700;
                  badgeBg = Colors.purple.shade50;
                }

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedWardFilter = name;
                    });
                    _showWardManagementSheet(responsive);
                  },
                  child: Container(
                    width: 220,
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFEAEFF8)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.indigo.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.slate900,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: badgeBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                type,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: badgeColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Icon(Icons.layers_outlined, size: 12, color: AppColors.slate400),
                            const SizedBox(width: 4),
                            Text(
                              'Floor $floor',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                            ),
                            const Spacer(),
                            Text(
                              '$occupied/$total Beds',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.slate700,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Occupancy Rate',
                                  style: TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.w500),
                                ),
                                Text(
                                  '$rate%',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: rate > 85 ? AppColors.errorRed : Colors.indigo.shade700,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: (occupied / (total == 0 ? 1 : total)).clamp(0.0, 1.0),
                                minHeight: 6,
                                backgroundColor: const Color(0xFFF0F3FA),
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  rate > 85 ? AppColors.errorRed : Colors.indigo.shade600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  void _showWardManagementSheet(ResponsiveHelper responsive) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final List<String> wardOptions = ['All Wards', ..._wards.map((w) => w['name']?.toString() ?? '').where((n) => n.isNotEmpty)];

            final List<Map<String, dynamic>> filteredPatients = _selectedWardFilter == 'All Wards'
                ? _patients
                : _patients.where((p) => (p['room'] ?? '').toString().toLowerCase().contains(_selectedWardFilter.toLowerCase())).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Modal Header
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
                    decoration: const BoxDecoration(
                      color: AppColors.navy700,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.king_bed_rounded, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Ward Management & Bed Roster',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Real-time ward occupancy & patient allocations',
                                style: TextStyle(
                                  color: Color(0xFFCBD5E1),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close_rounded, color: Colors.white),
                        ),
                      ],
                    ),
                  ),

                  // Filter Chips Strip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    color: Colors.white,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      child: Row(
                        children: wardOptions.map((wardName) {
                          final isSelected = _selectedWardFilter == wardName;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(wardName),
                              selected: isSelected,
                              selectedColor: AppColors.navy700,
                              backgroundColor: const Color(0xFFF1F5F9),
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : AppColors.slate700,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                fontSize: 12,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setState(() {
                                    _selectedWardFilter = wardName;
                                  });
                                  setModalState(() {});
                                }
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),

                  // Active Inpatients Bed Roster Count & Summary
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Inpatient Roster (${filteredPatients.length} Admitted)',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.slate800,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.emerald50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.check_circle_rounded, size: 12, color: AppColors.emerald600),
                              SizedBox(width: 4),
                              Text(
                                'Ward Live Sync',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.emerald600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Bed Roster List
                  Expanded(
                    child: filteredPatients.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.bed_outlined, size: 48, color: AppColors.slate400),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No admitted patients in this ward',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.slate700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'All beds in this ward section are currently available or unallocated.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 11, color: AppColors.slate500),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: filteredPatients.length,
                            itemBuilder: (context, index) {
                              final pt = filteredPatients[index];
                              final String name = pt['name'] ?? 'Inpatient';
                              final String roomStr = pt['room'] ?? 'General Ward';
                              final String status = pt['vitalsStatus'] ?? 'Pending';
                              final String bp = pt['bp'] ?? '--/--';
                              final String pulse = pt['pulse'] ?? '--';
                              final String spo2 = pt['spo2'] ?? '--';
                              final String temp = pt['temp'] ?? '--';

                              Color statusColor = AppColors.emerald600;
                              Color statusBg = AppColors.emerald50;
                              if (status == 'Critical') {
                                statusColor = AppColors.errorRed;
                                statusBg = AppColors.errorBg;
                              } else if (status == 'Pending') {
                                statusColor = Colors.amber.shade800;
                                statusBg = Colors.amber.shade50;
                              }

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.02),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 20,
                                          backgroundColor: AppColors.navy100,
                                          child: Text(
                                            name.isNotEmpty ? name[0].toUpperCase() : 'P',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.navy700,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                name,
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.slate900,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                roomStr,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: Colors.indigo.shade700,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: statusBg,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            status,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: statusColor,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const Padding(
                                      padding: EdgeInsets.symmetric(vertical: 10.0),
                                      child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                                    ),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        _buildVitalMiniItem('BP', bp),
                                        _buildVitalMiniItem('Pulse', pulse),
                                        _buildVitalMiniItem('SpO2', spo2),
                                        _buildVitalMiniItem('Temp', temp),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () {
                                              Navigator.pop(context);
                                              setState(() {
                                                _currentIndex = 1; // Switch to Patients Vitals tab
                                              });
                                            },
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(vertical: 8),
                                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                            ),
                                            icon: const Icon(Icons.favorite_outline_rounded, size: 14, color: AppColors.navy700),
                                            label: const Text(
                                              'Vitals',
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy700),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () {
                                              Navigator.pop(context);
                                              _showBedsideCareSheet(responsive);
                                            },
                                            style: ElevatedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(vertical: 8),
                                              backgroundColor: AppColors.navy700,
                                              foregroundColor: Colors.white,
                                              elevation: 0,
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                            ),
                                            icon: const Icon(Icons.water_drop_outlined, size: 14),
                                            label: const Text(
                                              'Log Fluid',
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildVitalMiniItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 9, color: AppColors.slate400, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 1),
        Text(
          value,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800),
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
      ..color = const Color(0xFF0F3E92).withValues(alpha: 0.85)
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
