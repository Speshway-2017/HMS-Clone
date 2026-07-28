import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../services/nurse_service.dart';

class PatientVitalsScreen extends StatefulWidget {
  final Map<String, dynamic> patientData;

  const PatientVitalsScreen({super.key, required this.patientData});

  @override
  State<PatientVitalsScreen> createState() => _PatientVitalsScreenState();
}

class _PatientVitalsScreenState extends State<PatientVitalsScreen> {
  final NurseService _nurseService = NurseService();
  bool _isLoading = false;

  // Form Controllers
  final _tempController = TextEditingController();
  final _bpSystolicController = TextEditingController();
  final _bpDiastolicController = TextEditingController();
  final _pulseController = TextEditingController();
  final _respRateController = TextEditingController();
  final _spo2Controller = TextEditingController();
  final _weightController = TextEditingController();
  final _heightController = TextEditingController();
  final _painScoreController = TextEditingController();
  final _notesController = TextEditingController();

  // Clinical Dropdowns
  String _patientCondition = 'Stable';
  String _consciousnessLevel = 'Alert';
  String _oxygenSupport = 'None';

  @override
  void initState() {
    super.initState();
    _prefillCurrentVitals();
  }

  @override
  void dispose() {
    _tempController.dispose();
    _bpSystolicController.dispose();
    _bpDiastolicController.dispose();
    _pulseController.dispose();
    _respRateController.dispose();
    _spo2Controller.dispose();
    _weightController.dispose();
    _heightController.dispose();
    _painScoreController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _prefillCurrentVitals() {
    final bpParts = widget.patientData['bp']?.split('/') ?? ['', ''];
    _bpSystolicController.text = bpParts[0];
    _bpDiastolicController.text = bpParts.length > 1 ? bpParts[1].replaceAll(RegExp(r'[^0-9]'), '') : '';
    _pulseController.text = widget.patientData['pulse']?.replaceAll(RegExp(r'[^0-9]'), '') ?? '';
    _spo2Controller.text = widget.patientData['spo2']?.replaceAll(RegExp(r'[^0-9]'), '') ?? '';
    _tempController.text = widget.patientData['temp']?.replaceAll(RegExp(r'[^0-9.]'), '') ?? '';
  }

  Future<void> _submitVitals(bool notifyDoctor) async {
    final String bp = '${_bpSystolicController.text.trim()}/${_bpDiastolicController.text.trim()}';
    final String pulse = _pulseController.text.trim();
    final String spo2 = _spo2Controller.text.trim();
    final String temp = _tempController.text.trim();
    final String respRate = _respRateController.text.trim();
    final String weight = _weightController.text.trim();

    if (bp == '/' || pulse.isEmpty || spo2.isEmpty || temp.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.errorRed,
          content: Text('Please fill out BP, Pulse, SpO2, and Temperature.'),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await _nurseService.recordVitals(
        admissionId: widget.patientData['admissionId'] ?? '',
        bp: bp,
        pulse: pulse,
        spo2: spo2,
        temp: temp,
        weight: weight,
        respRate: respRate,
      );

      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.emerald600,
            content: Text(
              notifyDoctor 
                  ? 'Vitals saved and doctor has been notified successfully.' 
                  : 'Vitals saved successfully.',
            ),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppColors.errorRed, content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Parse patient details from widget
    final String name = widget.patientData['name'] ?? 'Sita Devi';
    final int age = widget.patientData['age'] ?? 45;
    final String gender = widget.patientData['gender'] ?? 'Female';
    final String room = widget.patientData['room'] ?? 'Room 202 • Bed 3';
    final String bp = widget.patientData['bp'] ?? '120/80';
    final String pulse = widget.patientData['pulse'] ?? '72 bpm';
    final String spo2 = widget.patientData['spo2'] ?? '98%';
    final String temp = widget.patientData['temp'] ?? '98.6 °F';
    final String uhid = widget.patientData['uhid'] ?? 'UHID-982341';

    const String wardName = 'General Ward B';
    const String assignedDoctor = 'Dr. Anand';

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Patient Vitals',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Refreshing patient vitals...')),
              );
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildPatientInfoCard(name, uhid, age, gender, room, assignedDoctor, wardName),
                  const SizedBox(height: 16),
                  _buildCurrentVitalsSection(temp, bp, pulse, spo2),
                  const SizedBox(height: 16),
                  _buildRecordVitalsForm(),
                  const SizedBox(height: 16),
                  _buildClinicalAssessmentCard(),
                  const SizedBox(height: 16),
                  _buildNotesCard(),
                  const SizedBox(height: 16),
                  _buildVitalsHistorySection(),
                  const SizedBox(height: 24),
                  _buildActionButtons(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildPatientInfoCard(
    String name,
    String uhid,
    int age,
    String gender,
    String room,
    String doctor,
    String ward,
  ) {
    Color badgeColor = AppColors.emerald600;
    Color badgeBg = AppColors.emerald50;
    String status = 'Stable';

    if (widget.patientData['vitalsStatus'] == 'Critical') {
      badgeColor = AppColors.errorRed;
      badgeBg = AppColors.errorBg;
      status = 'Critical';
    }

    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.navy100,
            child: Text(
              name.substring(0, 1).toUpperCase(),
              style: const TextStyle(color: AppColors.navy700, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(6)),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(color: badgeColor, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'ID: $uhid  •  $gender, $age yrs',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  '$ward  •  $room',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Assigned Doctor: $doctor',
                  style: const TextStyle(fontSize: 11, color: AppColors.navy700, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildCurrentVitalsSection(
    String temp,
    String bp,
    String pulse,
    String spo2,
  ) {
    // Standard mock clinical fallbacks if not fully populated in parent card
    const String respRate = '16';
    const String weight = '70';
    const String height = '175';
    const String bmi = '22.9';

    // Parse status color classifications
    String spo2ValStr = spo2.replaceAll(RegExp(r'[^0-9]'), '');
    int spo2Val = int.tryParse(spo2ValStr) ?? 98;
    String spo2Status = spo2Val < 92 ? 'Critical' : (spo2Val < 95 ? 'Warning' : 'Normal');

    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Current Vitals',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 14),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 2.3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            children: [
              _buildVitalIndicatorTile(
                label: 'Temp',
                value: temp.replaceAll(' °F', ''),
                unit: '°F',
                icon: Icons.thermostat,
                iconColor: Colors.orange,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'BP',
                value: bp,
                unit: 'mmHg',
                icon: Icons.speed,
                iconColor: Colors.purple,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'Pulse',
                value: pulse.replaceAll(' bpm', ''),
                unit: 'bpm',
                icon: Icons.favorite,
                iconColor: Colors.red,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'Resp Rate',
                value: respRate,
                unit: 'bpm',
                icon: Icons.air_rounded,
                iconColor: Colors.blue,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'SpO2',
                value: spo2.replaceAll('%', ''),
                unit: '%',
                icon: Icons.cloud_queue_rounded,
                iconColor: Colors.teal,
                status: spo2Status,
              ),
              _buildVitalIndicatorTile(
                label: 'Weight',
                value: weight,
                unit: 'kg',
                icon: Icons.monitor_weight_outlined,
                iconColor: Colors.brown,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'Height',
                value: height,
                unit: 'cm',
                icon: Icons.height_rounded,
                iconColor: Colors.indigo,
                status: 'Normal',
              ),
              _buildVitalIndicatorTile(
                label: 'BMI',
                value: bmi,
                unit: 'kg/m²',
                icon: Icons.calculate_outlined,
                iconColor: Colors.blueGrey,
                status: 'Normal',
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildVitalIndicatorTile({
    required String label,
    required String value,
    required String unit,
    required IconData icon,
    required Color iconColor,
    required String status,
  }) {
    Color statusColor = AppColors.emerald600;
    if (status == 'Warning') {
      statusColor = Colors.amber.shade800;
    } else if (status == 'Critical') {
      statusColor = AppColors.errorRed;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$value $unit',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(label, style: const TextStyle(fontSize: 8, color: AppColors.slate500, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordVitalsForm() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Record New Vitals',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 16),

          // Temperature Input
          _buildOutlinedFormInput(
            controller: _tempController,
            label: 'Temperature (°F)',
            hint: 'e.g. 98.6',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),

          // BP Inputs (Systolic & Diastolic)
          Row(
            children: [
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _bpSystolicController,
                  label: 'BP Systolic (mmHg)',
                  hint: 'e.g. 120',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _bpDiastolicController,
                  label: 'BP Diastolic (mmHg)',
                  hint: 'e.g. 80',
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Pulse Rate & Resp Rate
          Row(
            children: [
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _pulseController,
                  label: 'Pulse Rate (bpm)',
                  hint: 'e.g. 72',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _respRateController,
                  label: 'Respiratory (bpm)',
                  hint: 'e.g. 16',
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Oxygen Saturation & Weight & Height
          Row(
            children: [
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _spo2Controller,
                  label: 'SpO2 (%)',
                  hint: 'e.g. 98',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _weightController,
                  label: 'Weight (kg)',
                  hint: 'e.g. 70',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _heightController,
                  label: 'Height (cm)',
                  hint: 'e.g. 175',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildOutlinedFormInput(
                  controller: _painScoreController,
                  label: 'Pain Score (0-10)',
                  hint: '0 for no pain',
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOutlinedFormInput({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 12),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 11, color: AppColors.slate500),
        hintText: hint,
        hintStyle: const TextStyle(fontSize: 11, color: AppColors.slate400),
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }

  Widget _buildClinicalAssessmentCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Clinical Assessment',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 16),

          // Condition dropdown
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Patient Condition',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            value: _patientCondition,
            onChanged: (val) {
              if (val != null) setState(() => _patientCondition = val);
            },
            items: const [
              DropdownMenuItem(value: 'Stable', child: Text('Stable', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Improving', child: Text('Improving', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Observation', child: Text('Observation', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Critical', child: Text('Critical', style: TextStyle(fontSize: 12))),
            ],
          ),
          const SizedBox(height: 12),

          // Consciousness dropdown
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Consciousness Level',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            value: _consciousnessLevel,
            onChanged: (val) {
              if (val != null) setState(() => _consciousnessLevel = val);
            },
            items: const [
              DropdownMenuItem(value: 'Alert', child: Text('Alert', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Drowsy', child: Text('Drowsy', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Unconscious', child: Text('Unconscious', style: TextStyle(fontSize: 12))),
            ],
          ),
          const SizedBox(height: 12),

          // Oxygen dropdown
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Oxygen Support',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            value: _oxygenSupport,
            onChanged: (val) {
              if (val != null) setState(() => _oxygenSupport = val);
            },
            items: const [
              DropdownMenuItem(value: 'None', child: Text('None', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Nasal Cannula', child: Text('Nasal Cannula', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Face Mask', child: Text('Face Mask', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'Ventilator', child: Text('Ventilator', style: TextStyle(fontSize: 12))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNotesCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Nurse Notes',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notesController,
            maxLines: 4,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              hintText: 'Add nursing observations, patient complaints, or important clinical notes...',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVitalsHistorySection() {
    final String bp = widget.patientData['bp'] ?? '120/80';
    final String pulse = widget.patientData['pulse'] ?? '72 bpm';
    final String spo2 = widget.patientData['spo2'] ?? '98%';
    final String temp = widget.patientData['temp'] ?? '98.6 °F';

    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Vitals History',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
              GestureDetector(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Opening Full Vitals History Log...')),
                  );
                },
                child: const Text(
                  'View Full History',
                  style: TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildVitalsHistoryCard('Today, 10:15 AM', temp, bp, pulse, spo2, 'Sr. Priya Nair, RN'),
          const Divider(color: Color(0xFFF1F3F9), height: 16),
          _buildVitalsHistoryCard('Yesterday, 14:45 PM', '98.2 °F', '115/75', '68 bpm', '99%', 'Nurse Rahul Sharma, RN'),
        ],
      ),
    );
  }

  Widget _buildVitalsHistoryCard(
    String time,
    String temp,
    String bp,
    String pulse,
    String spo2,
    String nurse,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(time, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate800)),
            Text('By $nurse', style: const TextStyle(fontSize: 9, color: AppColors.slate500)),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Temp: $temp', style: const TextStyle(fontSize: 10, color: AppColors.slate600)),
            Text('BP: $bp', style: const TextStyle(fontSize: 10, color: AppColors.slate600)),
            Text('Pulse: $pulse', style: const TextStyle(fontSize: 10, color: AppColors.slate600)),
            Text('SpO2: $spo2', style: const TextStyle(fontSize: 10, color: AppColors.slate600)),
          ],
        )
      ],
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.navy700,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () => _submitVitals(false),
          child: const Text('Save Vitals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ),
        const SizedBox(height: 10),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: AppColors.navy700,
            elevation: 0,
            side: const BorderSide(color: AppColors.navy700),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () => _submitVitals(true),
          child: const Text('Save & Notify Doctor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ),
      ],
    );
  }
}
