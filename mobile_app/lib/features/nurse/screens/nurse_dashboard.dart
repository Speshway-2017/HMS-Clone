import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';

class NurseDashboard extends StatefulWidget {
  const NurseDashboard({super.key});

  @override
  State<NurseDashboard> createState() => _NurseDashboardState();
}

class _NurseDashboardState extends State<NurseDashboard> {
  int _currentIndex = 0;

  // Mock patient data for vitals tracking
  final List<Map<String, dynamic>> _patients = [
    {
      'id': 'P-101',
      'name': 'Rahul Verma',
      'age': 34,
      'gender': 'Male',
      'room': 'Ward A • Bed 04',
      'vitalsStatus': 'Normal',
      'lastChecked': '10:00 AM',
      'bp': '120/80',
      'pulse': '72 bpm',
      'spo2': '98%',
      'temp': '98.6 °F',
    },
    {
      'id': 'P-102',
      'name': 'Sita Devi',
      'age': 62,
      'gender': 'Female',
      'room': 'ICU • Bed 02',
      'vitalsStatus': 'Critical',
      'lastChecked': '11:15 AM',
      'bp': '145/95',
      'pulse': '92 bpm',
      'spo2': '91%',
      'temp': '101.2 °F',
    },
    {
      'id': 'P-103',
      'name': 'Amit Patel',
      'age': 45,
      'gender': 'Male',
      'room': 'Ward B • Bed 11',
      'vitalsStatus': 'Pending',
      'lastChecked': 'Never today',
      'bp': '--/--',
      'pulse': '--',
      'spo2': '--',
      'temp': '--',
    },
    {
      'id': 'P-104',
      'name': 'Anjali Sen',
      'age': 28,
      'gender': 'Female',
      'room': 'Ward A • Bed 08',
      'vitalsStatus': 'Normal',
      'lastChecked': '09:30 AM',
      'bp': '118/76',
      'pulse': '68 bpm',
      'spo2': '99%',
      'temp': '98.2 °F',
    },
  ];

  // Mock medication schedule
  final List<Map<String, dynamic>> _medications = [
    {
      'id': 'M-01',
      'patientName': 'Sita Devi (ICU-02)',
      'medication': 'Injection Piperacillin 4.5g',
      'time': '12:00 PM',
      'administered': false,
      'route': 'IV Infusion',
    },
    {
      'id': 'M-02',
      'patientName': 'Rahul Verma (A-04)',
      'medication': 'Tab. Paracetamol 650mg',
      'time': '12:30 PM',
      'administered': false,
      'route': 'Oral',
    },
    {
      'id': 'M-03',
      'patientName': 'Amit Patel (B-11)',
      'medication': 'Tab. Metformin 500mg',
      'time': '01:00 PM',
      'administered': false,
      'route': 'Oral',
    },
    {
      'id': 'M-04',
      'patientName': 'Anjali Sen (A-08)',
      'medication': 'Nebulization Budecort 1mg',
      'time': '01:30 PM',
      'administered': false,
      'route': 'Inhalation',
    },
  ];

  // Mock Shift Tasks
  final List<Map<String, dynamic>> _shiftTasks = [
    {'title': 'Complete Handover Log', 'done': true},
    {'title': 'Verify Emergency Cart Inventory', 'done': false},
    {'title': 'Collect Blood Samples for Room 102', 'done': false},
    {'title': 'Update Ward Intake/Output Chart', 'done': false},
  ];

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    // List of page widgets for navigation tabs
    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildVitalsScreen(responsive),
      _buildMedsScreen(responsive),
    ];

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(
          _currentIndex == 0
              ? 'Nurse Workspace'
              : (_currentIndex == 1 ? 'Vitals Tracker' : 'Medication Schedule'),
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
        ],
      ),
    );
  }

  // --- HOME SCREEN ---
  Widget _buildHomeScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildWelcomeSection(responsive),
          SizedBox(height: responsive.scaleHeight(20.0)),
          
          // Stats Row
          _buildStatsRow(responsive),
          SizedBox(height: responsive.scaleHeight(24.0)),

          // Urgent Care Alerts
          Text(
            'Urgent Care Notices',
            style: TextStyle(
              fontSize: responsive.scaleText(15.0),
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
              Text(
                'My Shift Checklist',
                style: TextStyle(
                  fontSize: responsive.scaleText(15.0),
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
      padding: EdgeInsets.all(responsive.scaleWidth(20.0)),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate900.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.navy100,
            child: const Text(
              'NC',
              style: TextStyle(
                color: AppColors.navy700,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nurse Care Station',
                  style: TextStyle(
                    fontSize: responsive.scaleText(16.0),
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'General Ward B • Active Shift Logs',
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
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        children: [
          Row(
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
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sita Devi (ICU • Bed 02)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.slate900,
                      ),
                    ),
                    Text(
                      'High blood pressure (145/95) & Fever. Retake vitals.',
                      style: TextStyle(
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
                        '${patient['name']} (${patient['gender'][0]}, ${patient['age']})',
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
              
              // Vitals Grid Display
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
                    onPressed: () => _showRecordVitalsSheet(patient),
                    icon: const Icon(Icons.add_circle_outline_rounded, size: 14),
                    label: const Text('Record Vitals', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              )
            ],
          ),
        );
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

  void _showRecordVitalsSheet(Map<String, dynamic> patient) {
    final bpController = TextEditingController(text: patient['bp'] == '--/--' ? '' : patient['bp']);
    final pulseController = TextEditingController(text: patient['pulse'].replaceAll(RegExp(r'[^0-9]'), ''));
    final spo2Controller = TextEditingController(text: patient['spo2'].replaceAll(RegExp(r'[^0-9]'), ''));
    final tempController = TextEditingController(text: patient['temp'].replaceAll(RegExp(r'[^0-9.]'), ''));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 20,
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
                    Text(
                      'Record Vitals • ${patient['name']}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Form Fields
                Row(
                  children: [
                    Expanded(
                      child: _buildVitalsTextField(
                        controller: bpController,
                        label: 'Blood Pressure',
                        hint: 'e.g., 120/80',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildVitalsTextField(
                        controller: pulseController,
                        label: 'Pulse (bpm)',
                        hint: 'e.g., 72',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildVitalsTextField(
                        controller: spo2Controller,
                        label: 'SpO2 (%)',
                        hint: 'e.g., 98',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildVitalsTextField(
                        controller: tempController,
                        label: 'Temp (°F)',
                        hint: 'e.g., 98.6',
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy700,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    setState(() {
                      patient['bp'] = bpController.text.isEmpty ? '--/--' : bpController.text;
                      patient['pulse'] = pulseController.text.isEmpty ? '--' : '${pulseController.text} bpm';
                      patient['spo2'] = spo2Controller.text.isEmpty ? '--' : '${spo2Controller.text}%';
                      patient['temp'] = tempController.text.isEmpty ? '--' : '${tempController.text} °F';
                      patient['lastChecked'] = 'Just now';

                      // Compute standard basic status logic
                      double? tempVal = double.tryParse(tempController.text);
                      int? spo2Val = int.tryParse(spo2Controller.text);
                      
                      if ((tempVal != null && tempVal > 100) || (spo2Val != null && spo2Val < 93)) {
                        patient['vitalsStatus'] = 'Critical';
                      } else {
                        patient['vitalsStatus'] = 'Normal';
                      }
                    });
                    
                    Navigator.pop(context);
                    
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: AppColors.emerald600,
                        content: Text('Vitals updated for ${patient['name']}.'),
                      ),
                    );
                  },
                  child: const Text('Save Vitals Data', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVitalsTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate700),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 13, color: AppColors.slate900),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 12, color: AppColors.slate400),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            filled: true,
            fillColor: AppColors.slate100,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }

  // --- MEDS SCREEN ---
  Widget _buildMedsScreen(ResponsiveHelper responsive) {
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
              // Checkbox indicator
              GestureDetector(
                onTap: () {
                  setState(() {
                    med['administered'] = !med['administered'];
                  });
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
}
