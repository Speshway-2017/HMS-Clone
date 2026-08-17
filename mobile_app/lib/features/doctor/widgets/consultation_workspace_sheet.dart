import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../services/doctor_api_service.dart';

class ConsultationWorkspaceSheet extends StatefulWidget {
  final Map<String, dynamic> appointment;
  final VoidCallback onCompleted;

  const ConsultationWorkspaceSheet({
    super.key,
    required this.appointment,
    required this.onCompleted,
  });

  @override
  State<ConsultationWorkspaceSheet> createState() => _ConsultationWorkspaceSheetState();
}

class _ConsultationWorkspaceSheetState extends State<ConsultationWorkspaceSheet> {
  final _apiService = DoctorApiService();
  final _formKey = GlobalKey<FormState>();

  // Clinical input controllers
  final _chiefComplaintsController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _clinicalNotesController = TextEditingController();
  final _bpController = TextEditingController();
  final _pulseController = TextEditingController();
  final _tempController = TextEditingController();
  final _spo2Controller = TextEditingController();
  final _weightController = TextEditingController();

  // Dynamic Medications list
  final List<Map<String, String>> _medications = [];

  // Dynamic Lab tests ordered
  final List<String> _selectedLabTests = [];

  bool _recommendIp = false;
  final _wardController = TextEditingController(text: 'General Ward');
  String _ipPriority = 'Routine';
  bool _isSubmitting = false;

  final List<String> _availableLabTests = [
    'Complete Blood Count (CBC)',
    'Lipid Profile',
    'HbA1c Glucose',
    'Liver Function Test (LFT)',
    'Renal Function Test (KFT)',
    'Thyroid Profile (T3, T4, TSH)',
    'Chest X-Ray PA View',
    '12-Lead ECG',
    'USG Abdomen & Pelvis',
  ];

  @override
  void dispose() {
    _chiefComplaintsController.dispose();
    _diagnosisController.dispose();
    _clinicalNotesController.dispose();
    _bpController.dispose();
    _pulseController.dispose();
    _tempController.dispose();
    _spo2Controller.dispose();
    _weightController.dispose();
    _wardController.dispose();
    super.dispose();
  }

  void _addMedicationRow() {
    setState(() {
      _medications.add({
        'name': '',
        'dosage': '1 tablet',
        'frequency': '1-0-1',
        'duration': '5 days',
        'instructions': 'After food',
      });
    });
  }

  void _removeMedicationRow(int index) {
    if (_medications.length > 1) {
      setState(() {
        _medications.removeAt(index);
      });
    }
  }

  Future<void> _handleSubmitConsultation() async {
    if (_diagnosisController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a Primary Diagnosis before completing consultation.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final apptId = widget.appointment['_id']?.toString() ?? widget.appointment['id']?.toString() ?? 'demo_id';

    try {
      // 1. If IP admission requested, trigger admission recommendation endpoint
      if (_recommendIp) {
        await _apiService.recommendAdmission(
          appointmentId: apptId,
          primaryDiagnosis: _diagnosisController.text.trim(),
          priority: _ipPriority,
          preferredWard: _wardController.text.trim(),
          clinicalNotes: _clinicalNotesController.text.trim(),
        );
      }

      // 2. Complete consultation with diagnosis, notes, prescription & lab orders
      final success = await _apiService.completeConsultation(
        appointmentId: apptId,
        diagnosis: _diagnosisController.text.trim(),
        clinicalNotes: _clinicalNotesController.text.trim(),
        medicines: _medications,
        labTests: _selectedLabTests,
        recommendIp: _recommendIp,
      );

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Consultation completed successfully! Prescription & record updated.'),
            backgroundColor: AppColors.emerald600,
          ),
        );
        widget.onCompleted();
        Navigator.pop(context);
      } else {
        setState(() {
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to complete consultation. Please check your inputs.'),
            backgroundColor: AppColors.errorRed,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = widget.appointment['patient'] as Map<String, dynamic>? ?? {};
    final patientName = patient['name']?.toString() ?? widget.appointment['patientName']?.toString() ?? 'Patient';
    final uhid = patient['uhid']?.toString() ?? 'UHID-893321';
    final age = patient['age']?.toString() ?? '45';
    final gender = patient['gender']?.toString() ?? 'Male';

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: const BoxDecoration(
              color: AppColors.navy800,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.navy100,
                  child: Text(
                    patientName.isNotEmpty ? patientName[0].toUpperCase() : 'P',
                    style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        patientName,
                        style: const TextStyle(color: AppColors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '$uhid • $gender, $age yrs',
                        style: const TextStyle(color: AppColors.slate300, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Content Scroll
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Section 1: Patient Vitals Card
                    _buildSectionHeader('1. Patient Vitals', Icons.monitor_heart_outlined),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.navy50.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.navy100),
                      ),
                      child: Row(
                        children: [
                          Expanded(child: _buildVitalInput('BP (mmHg)', _bpController)),
                          const SizedBox(width: 8),
                          Expanded(child: _buildVitalInput('Pulse (bpm)', _pulseController)),
                          const SizedBox(width: 8),
                          Expanded(child: _buildVitalInput('Temp (°F)', _tempController)),
                          const SizedBox(width: 8),
                          Expanded(child: _buildVitalInput('SpO2 (%)', _spo2Controller)),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Section 2: Clinical Symptoms & Diagnosis
                    _buildSectionHeader('2. Clinical Evaluation & Diagnosis', Icons.medical_information_outlined),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _diagnosisController,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate900),
                      decoration: InputDecoration(
                        labelText: 'Primary Diagnosis *',
                        hintText: 'e.g. Essential Hypertension / Acute Bronchitis',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _clinicalNotesController,
                      maxLines: 2,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'Clinical Notes / Chief Complaints',
                        hintText: 'Patient reports persistent headache for 3 days...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Section 3: Rx Prescription Builder
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildSectionHeader('3. Prescription (Rx)', Icons.description_outlined),
                        TextButton.icon(
                          onPressed: _addMedicationRow,
                          icon: const Icon(Icons.add, size: 16, color: AppColors.emerald600),
                          label: const Text('Add Drug', style: TextStyle(color: AppColors.emerald600, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _medications.length,
                      itemBuilder: (context, index) {
                        return _buildMedicationCard(index);
                      },
                    ),

                    const SizedBox(height: 20),

                    // Section 4: Lab & Diagnostics Orders
                    _buildSectionHeader('4. Order Lab Tests & Imaging', Icons.science_outlined),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: _availableLabTests.map((test) {
                        final isSelected = _selectedLabTests.contains(test);
                        return FilterChip(
                          label: Text(test, style: TextStyle(fontSize: 11, color: isSelected ? AppColors.white : AppColors.slate800)),
                          selected: isSelected,
                          selectedColor: AppColors.navy700,
                          backgroundColor: AppColors.slate100,
                          checkmarkColor: AppColors.white,
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedLabTests.add(test);
                              } else {
                                _selectedLabTests.remove(test);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 20),

                    // Section 5: Inpatient (IP) Admission Recommendation
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _recommendIp ? AppColors.errorBg : AppColors.slate50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _recommendIp ? AppColors.errorBorder : AppColors.slate200),
                      ),
                      child: Column(
                        children: [
                          Material(
                            color: Colors.transparent,
                            child: SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text(
                                'Recommend Inpatient (IP) Admission',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy900),
                              ),
                              subtitle: const Text(
                                'Triggers IP admission request to receptionist workspace',
                                style: TextStyle(fontSize: 10.5, color: AppColors.slate500),
                              ),
                              value: _recommendIp,
                              activeColor: AppColors.errorRed,
                              onChanged: (val) {
                                setState(() {
                                  _recommendIp = val;
                                });
                              },
                            ),
                          ),
                          if (_recommendIp) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _wardController,
                                    decoration: InputDecoration(
                                      labelText: 'Preferred Ward',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                DropdownButton<String>(
                                  value: _ipPriority,
                                  items: ['Routine', 'Urgent', 'Emergency']
                                      .map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12))))
                                      .toList(),
                                  onChanged: (val) {
                                    if (val != null) setState(() => _ipPriority = val);
                                  },
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Complete Button
                    ElevatedButton.icon(
                      onPressed: _isSubmitting ? null : _handleSubmitConsultation,
                      icon: _isSubmitting
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.check_circle_outline, color: AppColors.white),
                      label: Text(
                        _isSubmitting ? 'Finalizing Consultation...' : 'Complete Consultation & Issue Rx',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.navy700,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.navy700),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
        ),
      ],
    );
  }

  Widget _buildVitalInput(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.slate600)),
        const SizedBox(height: 2),
        TextField(
          controller: controller,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy900),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            fillColor: AppColors.white,
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
          ),
        ),
      ],
    );
  }

  Widget _buildMedicationCard(int index) {
    final med = _medications[index];
    final nameController = TextEditingController(text: med['name']);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: nameController,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  onChanged: (val) => _medications[index]['name'] = val,
                  decoration: const InputDecoration(
                    hintText: 'Drug Name (e.g. Amoxicillin 500mg)',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.errorRed, size: 18),
                onPressed: () => _removeMedicationRow(index),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: med['dosage'],
                  decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 6)),
                  style: const TextStyle(fontSize: 10, color: AppColors.slate900),
                  items: ['1 tablet', '2 tablets', '1 capsule', '5 ml syrup', '1 injection']
                      .map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 10))))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _medications[index]['dosage'] = val);
                  },
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: med['frequency'],
                  decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 6)),
                  style: const TextStyle(fontSize: 10, color: AppColors.slate900),
                  items: ['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'As Needed']
                      .map((f) => DropdownMenuItem(value: f, child: Text(f, style: const TextStyle(fontSize: 10))))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _medications[index]['frequency'] = val);
                  },
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: med['duration'],
                  decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 6)),
                  style: const TextStyle(fontSize: 10, color: AppColors.slate900),
                  items: ['3 days', '5 days', '7 days', '14 days', '30 days']
                      .map((du) => DropdownMenuItem(value: du, child: Text(du, style: const TextStyle(fontSize: 10))))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _medications[index]['duration'] = val);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
