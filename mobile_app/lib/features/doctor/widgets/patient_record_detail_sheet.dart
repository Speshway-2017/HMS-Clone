import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../services/doctor_api_service.dart';

class PatientRecordDetailSheet extends StatefulWidget {
  final Map<String, dynamic> patient;

  const PatientRecordDetailSheet({
    super.key,
    required this.patient,
  });

  @override
  State<PatientRecordDetailSheet> createState() => _PatientRecordDetailSheetState();
}

class _PatientRecordDetailSheetState extends State<PatientRecordDetailSheet> with SingleTickerProviderStateMixin {
  final _apiService = DoctorApiService();
  late TabController _tabController;

  bool _isLoading = true;
  Map<String, dynamic> _patientData = {};
  List<dynamic> _appointments = [];
  List<dynamic> _prescriptions = [];
  List<dynamic> _labOrders = [];
  List<dynamic> _radiologyOrders = [];
  List<dynamic> _admissions = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
    _loadPatientFullDetails();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPatientFullDetails() async {
    setState(() => _isLoading = true);

    final patientId = widget.patient['_id']?.toString() ?? widget.patient['id']?.toString() ?? '';
    if (patientId.isNotEmpty) {
      final res = await _apiService.fetchMyPatientById(patientId);
      if (res != null && mounted) {
        setState(() {
          _patientData = res['patient'] as Map<String, dynamic>? ?? widget.patient;
          _appointments = res['appointments'] as List? ?? [];
          _prescriptions = res['prescriptions'] as List? ?? [];
          _labOrders = res['labOrders'] as List? ?? [];
          _radiologyOrders = res['radiologyOrders'] as List? ?? [];
          _admissions = res['admissions'] as List? ?? [];
          _isLoading = false;
        });
        return;
      }
    }

    if (mounted) {
      setState(() {
        _patientData = widget.patient;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _patientData['name']?.toString() ?? widget.patient['name']?.toString() ?? 'Patient';
    final uhid = _patientData['uhid']?.toString() ?? widget.patient['uhid']?.toString() ?? 'UHID-893321';
    final age = _patientData['age']?.toString() ?? widget.patient['age']?.toString() ?? 'N/A';
    final gender = _patientData['gender']?.toString() ?? widget.patient['gender']?.toString() ?? 'N/A';
    final bloodGroup = _patientData['bloodGroup']?.toString() ?? widget.patient['bloodGroup']?.toString() ?? 'N/A';
    final status = _patientData['status']?.toString().toUpperCase() ?? 'OPD';
    final allergies = _patientData['allergies']?.toString() ?? widget.patient['allergies']?.toString() ?? '';

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header Card (Reference Web App right pane)
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: const BoxDecoration(
              color: AppColors.navy800,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppColors.navy100,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'P',
                        style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold, fontSize: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(name, style: const TextStyle(color: AppColors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: AppColors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                                child: Text(status, style: const TextStyle(color: AppColors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text('$uhid • $age yrs • $gender • Blood: $bloodGroup', style: const TextStyle(color: AppColors.slate300, fontSize: 11.5)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppColors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                if (allergies.isNotEmpty && allergies.toLowerCase() != 'none') ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.errorRed.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.errorRed.withOpacity(0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 14, color: Colors.white),
                        const SizedBox(width: 6),
                        Text('Allergy: $allergies', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  indicatorColor: AppColors.white,
                  indicatorWeight: 3,
                  labelColor: AppColors.white,
                  unselectedLabelColor: AppColors.slate400,
                  labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  tabs: const [
                    Tab(text: 'Profile'),
                    Tab(text: 'Medical History'),
                    Tab(text: 'Diagnoses'),
                    Tab(text: 'Prescriptions'),
                    Tab(text: 'Lab Reports'),
                    Tab(text: 'Radiology'),
                    Tab(text: 'Surgeries'),
                  ],
                ),
              ],
            ),
          ),

          // Body Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildProfileTab(),
                      _buildMedicalHistoryTab(),
                      _buildDiagnosesTab(),
                      _buildPrescriptionsTab(),
                      _buildLabReportsTab(),
                      _buildRadiologyTab(),
                      _buildSurgeriesTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  // 1. Profile Tab
  Widget _buildProfileTab() {
    final phone = _patientData['phone']?.toString() ?? widget.patient['phone']?.toString() ?? '—';
    final email = _patientData['email']?.toString() ?? widget.patient['email']?.toString() ?? '—';
    final address = _patientData['address']?.toString() ?? widget.patient['address']?.toString() ?? '—';
    final bloodGroup = _patientData['bloodGroup']?.toString() ?? widget.patient['bloodGroup']?.toString() ?? '—';
    final allergies = _patientData['allergies']?.toString() ?? widget.patient['allergies']?.toString() ?? 'None';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildInfoCard('PHONE', phone, Icons.phone_outlined)),
              const SizedBox(width: 10),
              Expanded(child: _buildInfoCard('EMAIL', email, Icons.email_outlined)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildInfoCard('ADDRESS', address, Icons.location_on_outlined)),
              const SizedBox(width: 10),
              Expanded(child: _buildInfoCard('BLOOD GROUP', bloodGroup, Icons.bloodtype_outlined)),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoCard('KNOWN ALLERGIES', allergies, Icons.warning_amber_rounded, isWarning: allergies.toLowerCase() != 'none'),
        ],
      ),
    );
  }

  // 2. Medical History Tab
  Widget _buildMedicalHistoryTab() {
    final history = _patientData['medicalHistory'] as List? ?? [];
    if (history.isEmpty && _appointments.isEmpty) {
      return const Center(child: Text('No past medical history recorded.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: history.length + _appointments.length,
      itemBuilder: (context, idx) {
        if (idx < history.length) {
          final item = history[idx];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['diagnosis']?.toString() ?? 'OPD Visit', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                const SizedBox(height: 4),
                Text(item['notes']?.toString() ?? '', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
                const SizedBox(height: 6),
                Text('${item['visitType'] ?? 'OPD'} • Doctor: ${item['doctorName'] ?? 'Physician'}', style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
              ],
            ),
          );
        } else {
          final appt = _appointments[idx - history.length];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(appt['diagnosis']?.toString() ?? 'OP Consultation', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                const SizedBox(height: 4),
                Text(appt['clinicalNotes']?.toString() ?? 'Consultation completed.', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
              ],
            ),
          );
        }
      },
    );
  }

  // 3. Diagnoses Tab
  Widget _buildDiagnosesTab() {
    final list = _appointments.where((a) => a['diagnosis'] != null && a['diagnosis'].toString().isNotEmpty).toList();
    if (list.isEmpty) {
      return const Center(child: Text('No diagnoses recorded for this patient.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, idx) {
        final item = list[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item['diagnosis']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
              const SizedBox(height: 2),
              Text('Consultation Date: ${item['date']?.toString().split('T')[0] ?? 'Recent'}', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
            ],
          ),
        );
      },
    );
  }

  // 4. Prescriptions Tab
  Widget _buildPrescriptionsTab() {
    if (_prescriptions.isEmpty) {
      return const Center(child: Text('No prescription records found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _prescriptions.length,
      itemBuilder: (context, idx) {
        final item = _prescriptions[idx];
        final medicines = item['medicines'] as List? ?? [];
        final rxNo = item['prescriptionNumber']?.toString() ?? 'RX-${idx + 1}';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Prescription #$rxNo', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.emerald600)),
              const SizedBox(height: 8),
              ...medicines.map((m) => Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Text('• ${m['name']} — ${m['dosage']} (${m['frequency'] ?? '1-0-1'}, ${m['duration'] ?? '5 days'})', style: const TextStyle(fontSize: 12, color: AppColors.slate800)),
                  )),
            ],
          ),
        );
      },
    );
  }

  // 5. Lab Reports Tab
  Widget _buildLabReportsTab() {
    if (_labOrders.isEmpty) {
      return const Center(child: Text('No laboratory test orders found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _labOrders.length,
      itemBuilder: (context, idx) {
        final item = _labOrders[idx];
        final tests = (item['tests'] as List? ?? []).join(', ');
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(tests.isNotEmpty ? tests : 'Lab Test', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: AppColors.navy900)),
              const SizedBox(height: 4),
              Text('Status: ${item['status'] ?? 'pending'}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
            ],
          ),
        );
      },
    );
  }

  // 6. Radiology Tab
  Widget _buildRadiologyTab() {
    if (_radiologyOrders.isEmpty) {
      return const Center(child: Text('No radiology imaging orders found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _radiologyOrders.length,
      itemBuilder: (context, idx) {
        final item = _radiologyOrders[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item['procedureName']?.toString() ?? 'X-Ray / Scan', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: AppColors.navy900)),
              const SizedBox(height: 4),
              Text('Status: ${item['status'] ?? 'pending'}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
            ],
          ),
        );
      },
    );
  }

  // 7. Surgeries Tab
  Widget _buildSurgeriesTab() {
    if (_admissions.isEmpty) {
      return const Center(child: Text('No surgical procedure records.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _admissions.length,
      itemBuilder: (context, idx) {
        final item = _admissions[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('IP Hospitalization #${item['admissionNumber'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: AppColors.navy900)),
              Text('Diagnosis: ${item['primaryDiagnosis'] ?? 'Under Observation'}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoCard(String label, String value, IconData icon, {bool isWarning = false}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isWarning ? AppColors.errorBg.withOpacity(0.3) : AppColors.slate50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isWarning ? AppColors.errorBorder : AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: isWarning ? AppColors.errorRed : AppColors.slate500),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: isWarning ? AppColors.errorRed : AppColors.slate500)),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: isWarning ? AppColors.errorRed : AppColors.navy900)),
        ],
      ),
    );
  }
}
