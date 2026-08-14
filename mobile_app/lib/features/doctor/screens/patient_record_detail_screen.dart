import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../services/doctor_api_service.dart';

class PatientRecordDetailScreen extends StatefulWidget {
  final Map<String, dynamic> patient;

  const PatientRecordDetailScreen({
    super.key,
    required this.patient,
  });

  @override
  State<PatientRecordDetailScreen> createState() => _PatientRecordDetailScreenState();
}

class _PatientRecordDetailScreenState extends State<PatientRecordDetailScreen> with SingleTickerProviderStateMixin {
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

  String _formatTestNames(dynamic testsData) {
    if (testsData == null) return 'Laboratory Test';
    if (testsData is String) return testsData;
    if (testsData is List) {
      if (testsData.isEmpty) return 'Laboratory Test';
      final names = testsData.map((t) {
        if (t is Map) return t['name']?.toString() ?? t['testName']?.toString() ?? '';
        return t.toString();
      }).where((s) => s.isNotEmpty).join(', ');
      return names.isNotEmpty ? names : 'Laboratory Test';
    }
    return testsData.toString();
  }

  @override
  Widget build(BuildContext context) {
    final name = _patientData['name']?.toString() ?? widget.patient['name']?.toString() ?? 'Patient';
    final uhid = _patientData['uhid']?.toString() ?? widget.patient['uhid']?.toString() ?? 'UHID-893321';
    final age = _patientData['age']?.toString() ?? widget.patient['age']?.toString() ?? 'N/A';
    final gender = _patientData['gender']?.toString() ?? widget.patient['gender']?.toString() ?? 'N/A';
    final bloodGroup = _patientData['bloodGroup']?.toString() ?? widget.patient['bloodGroup']?.toString() ?? 'N/A';
    final allergies = _patientData['allergies']?.toString() ?? widget.patient['allergies']?.toString() ?? '';

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy800,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('$uhid • $age yrs • $gender • Blood: $bloodGroup', style: const TextStyle(fontSize: 11, color: AppColors.slate300)),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(allergies.isNotEmpty && allergies.toLowerCase() != 'none' ? 95 : 50),
          child: Column(
            children: [
              if (allergies.isNotEmpty && allergies.toLowerCase() != 'none')
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.errorRed.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.errorRed.withOpacity(0.6)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.white),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('Known Allergy: $allergies', style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              TabBar(
                controller: _tabController,
                isScrollable: true,
                indicatorColor: AppColors.white,
                indicatorWeight: 3,
                labelColor: AppColors.white,
                unselectedLabelColor: AppColors.slate400,
                labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
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
      ),
      body: _isLoading
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
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
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
          final dateStr = appt['date'] != null ? appt['date'].toString().split('T')[0] : 'Recent';
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(appt['diagnosis']?.toString() ?? 'OP Consultation', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                    Text(dateStr, style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(appt['clinicalNotes']?.toString() ?? appt['chiefComplaint']?.toString() ?? 'Consultation completed.', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
              ],
            ),
          );
        }
      },
    );
  }

  // 3. Diagnoses Tab
  Widget _buildDiagnosesTab() {
    final list = _appointments.where((a) => (a['diagnosis'] != null && a['diagnosis'].toString().isNotEmpty) || (a['chiefComplaint'] != null && a['chiefComplaint'].toString().isNotEmpty)).toList();

    if (list.isEmpty) {
      return const Center(child: Text('No diagnoses recorded for this patient.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, idx) {
        final item = list[idx];
        final diag = item['diagnosis']?.toString() ?? item['chiefComplaint']?.toString() ?? 'Primary Diagnosis';
        final dateStr = item['date'] != null ? item['date'].toString().split('T')[0] : 'Recent';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(diag, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: const Text('DIAGNOSIS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Date: $dateStr • Ref: ${item['referenceId'] ?? 'N/A'}', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
              if (item['clinicalNotes'] != null && item['clinicalNotes'].toString().isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Clinical Notes: ${item['clinicalNotes']}', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
              ],
            ],
          ),
        );
      },
    );
  }

  // 4. Prescriptions Tab with Detailed Card & View Action
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
        final diagnosis = item['diagnosis']?.toString() ?? 'Clinical Consultation';
        final advice = item['advice']?.toString() ?? '';
        final clinicalNotes = item['clinicalNotes']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Prescription #$rxNo', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.emerald600)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(4)),
                    child: Text(diagnosis, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                  ),
                ],
              ),
              if (clinicalNotes.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Notes: $clinicalNotes', style: const TextStyle(fontSize: 11.5, color: AppColors.slate600)),
              ],
              const Divider(height: 16),

              if (medicines.isNotEmpty) ...[
                const Text('PRESCRIBED MEDICATIONS:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500, letterSpacing: 0.5)),
                const SizedBox(height: 6),
                ...medicines.map((m) {
                  final name = m['name']?.toString() ?? 'Medicine';
                  final dosage = m['dosage']?.toString() ?? '1 tab';
                  final freq = m['frequency']?.toString() ?? '1-0-1';
                  final dur = m['duration']?.toString() ?? '5 days';
                  final instructions = m['instructions']?.toString() ?? '';

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6.0),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(6)),
                      child: Row(
                        children: [
                          const Icon(Icons.medication_rounded, size: 16, color: AppColors.navy700),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: const TextStyle(fontSize: 12.5, color: AppColors.navy900, fontWeight: FontWeight.bold)),
                                Text('Dosage: $dosage • Frequency: $freq • Duration: $dur', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                                if (instructions.isNotEmpty)
                                  Text('Instruction: $instructions', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500, fontStyle: FontStyle.italic)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],

              if (advice.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Doctor Advice: $advice', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
              ],

              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => _showPrescriptionDetailModal(item),
                  icon: const Icon(Icons.visibility_outlined, size: 16),
                  label: const Text('View Full RX Sheet', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // 5. Lab Reports Tab with View Option & Safe Parsing
  Widget _buildLabReportsTab() {
    if (_labOrders.isEmpty) {
      return const Center(child: Text('No laboratory test orders found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _labOrders.length,
      itemBuilder: (context, idx) {
        final item = _labOrders[idx];
        final testTitle = _formatTestNames(item['tests'] ?? item['orderNumber'] ?? item['testName']);
        final statusStr = item['status']?.toString().toUpperCase() ?? 'PENDING';
        final orderNo = item['orderNumber']?.toString() ?? item['_id']?.toString() ?? 'LAB-${idx + 1}';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(testTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: Text(statusStr, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Order Ref: #$orderNo', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => _showLabReportDetailModal(item),
                  icon: const Icon(Icons.visibility_outlined, size: 16),
                  label: const Text('View Report Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // 6. Radiology Tab with View Option
  Widget _buildRadiologyTab() {
    if (_radiologyOrders.isEmpty) {
      return const Center(child: Text('No radiology imaging orders found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _radiologyOrders.length,
      itemBuilder: (context, idx) {
        final item = _radiologyOrders[idx];
        final procedure = item['procedureName']?.toString() ?? item['testName']?.toString() ?? 'X-Ray / CT Imaging';
        final statusStr = item['status']?.toString().toUpperCase() ?? 'PENDING';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(procedure, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: Text(statusStr, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Order Ref: ${item['orderNumber'] ?? item['_id'] ?? 'RAD-${idx + 1}'}', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => _showRadiologyReportDetailModal(item),
                  icon: const Icon(Icons.visibility_outlined, size: 16),
                  label: const Text('View Imaging Report', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // 7. Surgeries Tab
  Widget _buildSurgeriesTab() {
    if (_admissions.isEmpty) {
      return const Center(child: Text('No surgical or inpatient hospitalization records.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _admissions.length,
      itemBuilder: (context, idx) {
        final item = _admissions[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('IP Hospitalization #${item['admissionNumber'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
              const SizedBox(height: 4),
              Text('Diagnosis: ${item['primaryDiagnosis'] ?? 'Under Observation'}', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
              const SizedBox(height: 2),
              Text('Status: ${item['status'] ?? 'Active'}', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
            ],
          ),
        );
      },
    );
  }

  // Detailed Modals for Prescriptions, Lab Reports, Radiology
  void _showPrescriptionDetailModal(Map<String, dynamic> item) {
    final rxNo = item['prescriptionNumber']?.toString() ?? 'RX';
    final diagnosis = item['diagnosis']?.toString() ?? 'Consultation';
    final chiefComplaint = item['chiefComplaint']?.toString() ?? '';
    final clinicalNotes = item['clinicalNotes']?.toString() ?? '';
    final advice = item['advice']?.toString() ?? '';
    final medicines = item['medicines'] as List? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Prescription #$rxNo', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildModalSection('Diagnosis', diagnosis),
                    if (chiefComplaint.isNotEmpty) _buildModalSection('Chief Complaints', chiefComplaint),
                    if (clinicalNotes.isNotEmpty) _buildModalSection('Clinical Notes', clinicalNotes),
                    const SizedBox(height: 10),
                    const Text('Prescribed Medications:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                    const SizedBox(height: 6),
                    ...medicines.map((m) => Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('Dosage: ${m['dosage'] ?? '1 tab'} • Frequency: ${m['frequency'] ?? '1-0-1'} • Duration: ${m['duration'] ?? '5 days'}', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
                              if (m['instructions'] != null && m['instructions'].toString().isNotEmpty)
                                Text('Instructions: ${m['instructions']}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.slate600)),
                            ],
                          ),
                        )),
                    if (advice.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _buildModalSection('Doctor Advice', advice),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLabReportDetailModal(Map<String, dynamic> item) {
    final title = _formatTestNames(item['tests'] ?? item['orderNumber'] ?? item['testName']);
    final status = item['status']?.toString() ?? 'Pending';
    final orderNo = item['orderNumber']?.toString() ?? item['_id']?.toString() ?? 'N/A';
    final observations = item['observations']?.toString() ?? item['remarks']?.toString() ?? 'No specific test remarks recorded.';
    final files = item['files'] as List? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy900))),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildModalSection('Order Ref', '#$orderNo'),
                    _buildModalSection('Status', status.toUpperCase()),
                    _buildModalSection('Observations & Findings', observations),
                    if (files.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      const Text('Report File Attachments:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      ...files.map((f) {
                        final url = f['secure_url']?.toString() ?? f['url']?.toString() ?? '';
                        final filename = f['original_filename']?.toString() ?? 'Diagnostic Report PDF';
                        return ListTile(
                          leading: const Icon(Icons.picture_as_pdf_rounded, color: AppColors.errorRed),
                          title: Text(filename, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                          onTap: () {
                            if (url.isNotEmpty) launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                          },
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRadiologyReportDetailModal(Map<String, dynamic> item) {
    final procedure = item['procedureName']?.toString() ?? item['testName']?.toString() ?? 'Radiology Scan';
    final status = item['status']?.toString() ?? 'Pending';
    final orderNo = item['orderNumber']?.toString() ?? item['_id']?.toString() ?? 'N/A';
    final observations = item['observations']?.toString() ?? item['remarks']?.toString() ?? 'No specific imaging findings logged.';
    final files = item['files'] as List? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(procedure, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy900))),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildModalSection('Imaging Ref', '#$orderNo'),
                    _buildModalSection('Status', status.toUpperCase()),
                    _buildModalSection('Radiologist Findings & Impression', observations),
                    if (files.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      const Text('Scan Attachments:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      ...files.map((f) {
                        final url = f['secure_url']?.toString() ?? f['url']?.toString() ?? '';
                        final filename = f['original_filename']?.toString() ?? 'Imaging Scan File';
                        return ListTile(
                          leading: const Icon(Icons.image_rounded, color: AppColors.navy700),
                          title: Text(filename, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                          onTap: () {
                            if (url.isNotEmpty) launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                          },
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModalSection(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.slate500)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.navy900)),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String label, String value, IconData icon, {bool isWarning = false}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isWarning ? AppColors.errorBg.withOpacity(0.3) : AppColors.white,
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
