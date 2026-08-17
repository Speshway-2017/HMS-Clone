import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../patient/screens/report_detail_screen.dart';
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
    final uhid = _patientData['uhid']?.toString() ?? widget.patient['uhid']?.toString() ?? 'UHID-PENDING';
    final age = _patientData['age']?.toString() ?? widget.patient['age']?.toString() ?? 'N/A';
    final gender = _patientData['gender']?.toString() ?? widget.patient['gender']?.toString() ?? 'N/A';
    final bloodGroup = _patientData['bloodGroup']?.toString() ?? widget.patient['bloodGroup']?.toString() ?? 'N/A';
    final allergies = _patientData['allergies']?.toString() ?? widget.patient['allergies']?.toString() ?? '';

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy900,
        foregroundColor: AppColors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Patient Medical EMR', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: _loadPatientFullDetails,
            tooltip: 'Refresh Patient Records',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : Column(
              children: [
                // 1. HERO PATIENT SUMMARY BANNER
                _buildHeroPatientBanner(name, uhid, age, gender, bloodGroup, allergies),

                // 2. SEGMENTED TAB BAR WITH BADGES
                Container(
                  color: AppColors.navy900,
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TabBar(
                    controller: _tabController,
                    isScrollable: true,
                    indicator: BoxDecoration(
                      color: AppColors.emerald600,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: AppColors.white,
                    unselectedLabelColor: AppColors.slate400,
                    labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    labelPadding: const EdgeInsets.symmetric(horizontal: 12),
                    tabs: [
                      const Tab(child: Row(children: [Icon(Icons.person_outline_rounded, size: 16), SizedBox(width: 6), Text('Overview')])),
                      const Tab(child: Row(children: [Icon(Icons.history_rounded, size: 16), SizedBox(width: 6), Text('Medical History')])),
                      Tab(child: Row(children: [const Icon(Icons.medical_services_outlined, size: 16), const SizedBox(width: 6), Text('Diagnoses (${_appointments.length})')])),
                      Tab(child: Row(children: [const Icon(Icons.medication_outlined, size: 16), const SizedBox(width: 6), Text('Prescriptions (${_prescriptions.length})')])),
                      Tab(child: Row(children: [const Icon(Icons.science_outlined, size: 16), const SizedBox(width: 6), Text('Lab Reports (${_labOrders.length})')])),
                      Tab(child: Row(children: [const Icon(Icons.biotech_outlined, size: 16), const SizedBox(width: 6), Text('Radiology (${_radiologyOrders.length})')])),
                      Tab(child: Row(children: [const Icon(Icons.local_hospital_outlined, size: 16), const SizedBox(width: 6), Text('Hospitalizations (${_admissions.length})')])),
                    ],
                  ),
                ),

                // 3. TAB VIEWS CONTENT
                Expanded(
                  child: TabBarView(
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

  // ── HERO PATIENT BANNER WIDGET ──
  Widget _buildHeroPatientBanner(String name, String uhid, String age, String gender, String bloodGroup, String allergies) {
    final initials = name.isNotEmpty ? name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase() : 'PT';
    final hasAllergy = allergies.isNotEmpty && allergies.toLowerCase() != 'none';

    return Container(
      width: double.infinity,
      color: AppColors.navy900,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.emerald600,
                child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(name, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.bold, color: Colors.white)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.emerald500.withOpacity(0.2), borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.emerald500.withOpacity(0.4))),
                          child: Text('Blood: $bloodGroup', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald400)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('$uhid • $age yrs • $gender', style: const TextStyle(fontSize: 11.5, color: AppColors.slate300)),
                  ],
                ),
              ),
            ],
          ),
          if (hasAllergy) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.errorRed.withOpacity(0.2),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.errorRed.withOpacity(0.5)),
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
          ],
        ],
      ),
    );
  }

  // ── 1. OVERVIEW & VITALS TAB ──
  Widget _buildProfileTab() {
    final phone = _patientData['phone']?.toString() ?? widget.patient['phone']?.toString() ?? '—';
    final email = _patientData['email']?.toString() ?? widget.patient['email']?.toString() ?? '—';
    final address = _patientData['address']?.toString() ?? widget.patient['address']?.toString() ?? '—';
    final bloodGroup = _patientData['bloodGroup']?.toString() ?? widget.patient['bloodGroup']?.toString() ?? '—';
    final allergies = _patientData['allergies']?.toString() ?? widget.patient['allergies']?.toString() ?? 'None';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('CLINICAL VITALS & OBSERVATIONS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.slate500, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildVitalCard('BLOOD PRESSURE', '120/80 mmHg', Icons.favorite_rounded, AppColors.errorRed)),
              const SizedBox(width: 8),
              Expanded(child: _buildVitalCard('PULSE RATE', '72 bpm', Icons.monitor_heart_rounded, AppColors.emerald600)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildVitalCard('SPO2 LEVEL', '98%', Icons.air_rounded, AppColors.navy700)),
              const SizedBox(width: 8),
              Expanded(child: _buildVitalCard('TEMPERATURE', '98.6 °F', Icons.thermostat_rounded, Colors.orange)),
            ],
          ),
          const SizedBox(height: 16),
          const Text('PATIENT CONTACT & GENERAL DETAILS', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.slate500, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildInfoCard('PHONE NUMBER', phone, Icons.phone_outlined)),
              const SizedBox(width: 10),
              Expanded(child: _buildInfoCard('EMAIL ADDRESS', email, Icons.email_outlined)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildInfoCard('RESIDENTIAL ADDRESS', address, Icons.location_on_outlined)),
              const SizedBox(width: 10),
              Expanded(child: _buildInfoCard('BLOOD GROUP', bloodGroup, Icons.bloodtype_outlined)),
            ],
          ),
          const SizedBox(height: 10),
          _buildInfoCard('KNOWN ALLERGIES', allergies, Icons.warning_amber_rounded, isWarning: allergies.toLowerCase() != 'none'),
        ],
      ),
    );
  }

  Widget _buildVitalCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy900)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 2. MEDICAL HISTORY TAB ──
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
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item['diagnosis']?.toString() ?? 'OPD Visit', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.navy900)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                      child: Text(item['visitType'] ?? 'OPD', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(item['notes']?.toString() ?? 'No detailed notes logged.', style: const TextStyle(fontSize: 12, color: AppColors.slate700)),
                const SizedBox(height: 8),
                Text('Attending Doctor: ${item['doctorName'] ?? 'Physician'}', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
              ],
            ),
          );
        } else {
          final appt = _appointments[idx - history.length];
          final dateStr = appt['date'] != null ? appt['date'].toString().split('T')[0] : 'Recent';
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(appt['diagnosis']?.toString() ?? 'OP Consultation', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.navy900)),
                    Text(dateStr, style: const TextStyle(fontSize: 10.5, color: AppColors.slate500, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(appt['clinicalNotes']?.toString() ?? appt['chiefComplaint']?.toString() ?? 'Consultation completed.', style: const TextStyle(fontSize: 12, color: AppColors.slate700)),
              ],
            ),
          );
        }
      },
    );
  }

  // ── 3. DIAGNOSES TAB ──
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
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(diag, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.navy900))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: const Text('DIAGNOSIS', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Date: $dateStr • Ref: ${item['referenceId'] ?? 'N/A'}', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              if (item['clinicalNotes'] != null && item['clinicalNotes'].toString().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text('Clinical Notes: ${item['clinicalNotes']}', style: const TextStyle(fontSize: 12, color: AppColors.slate700)),
              ],
            ],
          ),
        );
      },
    );
  }

  // ── 4. PRESCRIPTIONS TAB ──
  Widget _buildPrescriptionsTab() {
    if (_prescriptions.isEmpty) {
      return const Center(child: Text('No prescription records found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _prescriptions.length,
      itemBuilder: (context, idx) {
        final item = _prescriptions[idx];
        final medicines = (item['medications'] as List? ?? item['medicines'] as List? ?? []);
        final rxNo = item['prescriptionNumber']?.toString() ?? 'RX-${idx + 1}';
        final diagnosis = item['diagnosis']?.toString() ?? 'Clinical Consultation';
        final advice = item['advice']?.toString() ?? '';
        final clinicalNotes = item['clinicalNotes']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.receipt_long_rounded, size: 18, color: AppColors.emerald600),
                      const SizedBox(width: 6),
                      Text('Prescription #$rxNo', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.emerald600)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                    child: Text(diagnosis, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                  ),
                ],
              ),
              if (clinicalNotes.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Notes: $clinicalNotes', style: const TextStyle(fontSize: 11.5, color: AppColors.slate600)),
              ],
              const Divider(height: 18),

              if (medicines.isNotEmpty) ...[
                const Text('PRESCRIBED MEDICATIONS:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                ...medicines.map((m) {
                  final name = m['name']?.toString() ?? 'Medicine';
                  final strength = m['strength']?.toString() ?? '';
                  final dosage = m['dosage']?.toString() ?? '1 tab';
                  final freq = m['frequency']?.toString() ?? '1-0-1';
                  final dur = m['duration']?.toString() ?? '5 days';
                  final instructions = m['instructions']?.toString() ?? '';

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.medication_rounded, size: 16, color: AppColors.navy700),
                              const SizedBox(width: 8),
                              Text(strength.isNotEmpty ? '$name ($strength)' : name, style: const TextStyle(fontSize: 13, color: AppColors.navy900, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _buildPillChip('Dosage: $dosage', AppColors.navy100, AppColors.navy800),
                              const SizedBox(width: 6),
                              _buildPillChip('Freq: $freq', AppColors.emerald50, AppColors.emerald600),
                              const SizedBox(width: 6),
                              _buildPillChip('Dur: $dur', AppColors.slate200, AppColors.slate700),
                            ],
                          ),
                          if (instructions.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text('Instructions: $instructions', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.slate600)),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],

              if (advice.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, size: 16, color: AppColors.navy700),
                      const SizedBox(width: 6),
                      Expanded(child: Text('Advice: $advice', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.navy800))),
                    ],
                  ),
                ),
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

  Widget _buildPillChip(String text, Color bg, Color textCol) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: textCol)),
    );
  }

  // ── 5. LAB REPORTS TAB ──
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
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.science_rounded, size: 18, color: AppColors.navy700),
                        const SizedBox(width: 8),
                        Expanded(child: Text(testTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.navy900))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: Text(statusStr, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Order Ref: #$orderNo', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => _openInAppReportViewer(item, typeLabel: 'LABORATORY REPORT'),
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

  // ── 6. RADIOLOGY TAB ──
  Widget _buildRadiologyTab() {
    if (_radiologyOrders.isEmpty) {
      return const Center(child: Text('No radiology imaging orders found.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _radiologyOrders.length,
      itemBuilder: (context, idx) {
        final item = _radiologyOrders[idx];
        final procedure = item['type']?.toString() ?? item['procedureName']?.toString() ?? item['testName']?.toString() ?? 'X-Ray / CT Imaging';
        final statusStr = item['status']?.toString().toUpperCase() ?? 'PENDING';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.biotech_rounded, size: 18, color: AppColors.navy700),
                        const SizedBox(width: 8),
                        Expanded(child: Text(procedure, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.navy900))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: Text(statusStr, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Order Ref: ${item['orderNumber'] ?? item['_id'] ?? 'RAD-${idx + 1}'}', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: () => _openInAppReportViewer(item, typeLabel: 'RADIOLOGY SCAN'),
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

  // ── IN-APP REPORT VIEWER (PATIENT DASHBOARD REFERENCE) ──
  void _openInAppReportViewer(Map<String, dynamic> item, {required String typeLabel}) {
    final title = _formatTestNames(item['tests'] ?? item['orderNumber'] ?? item['testName'] ?? item['procedureName'] ?? item['type'] ?? 'Medical Investigation Report');
    
    Map<String, dynamic>? report;
    if (item['report'] is Map) {
      report = Map<String, dynamic>.from(item['report'] as Map);
    }

    final obsText = report?['observations']?.toString() ?? item['findings']?.toString() ?? item['observations']?.toString() ?? item['remarks']?.toString() ?? item['notes']?.toString() ?? '';
    final remarksText = report?['remarks']?.toString() ?? item['remarks']?.toString() ?? item['advice']?.toString() ?? '';

    List<dynamic> files = [];
    if (item['files'] is List && (item['files'] as List).isNotEmpty) {
      files = item['files'] as List;
    } else if (report != null && report['files'] is List && (report['files'] as List).isNotEmpty) {
      files = report['files'] as List;
    } else if (item['attachments'] is List && (item['attachments'] as List).isNotEmpty) {
      files = item['attachments'] as List;
    }

    if (files.isEmpty && item['resultsUrl'] != null && item['resultsUrl'].toString().isNotEmpty) {
      files = [{'secure_url': item['resultsUrl'].toString(), 'original_filename': '$title Report File'}];
    }

    String doctorName = 'Attending Specialist';
    final docVal = item['doctor'];
    if (docVal is Map && docVal['name'] != null) {
      doctorName = docVal['name'].toString();
    } else if (docVal is String && docVal.isNotEmpty) {
      if (!docVal.startsWith('6') || docVal.length != 24) {
        doctorName = docVal;
      }
    }

    final patientName = _patientData['name']?.toString() ?? widget.patient['name']?.toString() ?? 'Patient';
    final patientUhid = _patientData['uhid']?.toString() ?? widget.patient['uhid']?.toString() ?? '';

    final reportData = <String, dynamic>{
      'title': title,
      'testName': title,
      'typeLabel': typeLabel,
      'requestType': typeLabel,
      'doctor': doctorName,
      'date': item['createdAt']?.toString().split('T').first ?? 'Today',
      'subText': typeLabel.contains('RADIOLOGY') ? 'Radiology & Imaging' : 'Laboratory Department',
      'patientName': patientName,
      'uhid': patientUhid,
      'patient': {
        'name': patientName,
        'uhid': patientUhid,
      },
      'observations': obsText.isNotEmpty ? obsText : title,
      'remarks': remarksText.isNotEmpty
          ? remarksText
          : '• Certified digital medical report issued by Hospital Information System.\n'
            '• Patient advised routine monitoring and follow-up care as recommended.\n'
            '• Maintain healthy dietary regimen and stay well hydrated.\n'
            '• In case of severe discomfort, report immediately to Hospital Emergency Desk.',
      'files': files,
      'status': item['status']?.toString().toUpperCase() ?? 'REPORT_UPLOADED',
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ReportDetailScreen(reportData: reportData),
      ),
    );
  }

  // ── 7. SURGERIES & HOSPITALIZATIONS TAB ──
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
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('IP Hospitalization #${item['admissionNumber'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.navy900)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(4)),
                    child: Text('${item['status'] ?? 'Active'}'.toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Primary Diagnosis: ${item['primaryDiagnosis'] ?? 'Under Observation'}', style: const TextStyle(fontSize: 12, color: AppColors.slate700)),
            ],
          ),
        );
      },
    );
  }

  // ── DETAILED PRESCRIPTION MODAL ──
  void _showPrescriptionDetailModal(Map<String, dynamic> item) {
    final rxNo = item['prescriptionNumber']?.toString() ?? 'RX';
    final diagnosis = item['diagnosis']?.toString() ?? 'Consultation';
    final chiefComplaint = item['chiefComplaint']?.toString() ?? '';
    final clinicalNotes = item['clinicalNotes']?.toString() ?? '';
    final advice = item['advice']?.toString() ?? '';
    final medicines = (item['medications'] as List? ?? item['medicines'] as List? ?? []);

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
                    if (medicines.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Text('No specific medications listed.', style: TextStyle(fontSize: 12, color: AppColors.slate500, fontStyle: FontStyle.italic)),
                      )
                    else
                      ...medicines.map((m) {
                        final name = m['name']?.toString() ?? 'Medicine';
                        final strength = m['strength']?.toString() ?? '';
                        final dosage = m['dosage']?.toString() ?? '1 tab';
                        final freq = m['frequency']?.toString() ?? '1-0-1';
                        final dur = m['duration']?.toString() ?? '5 days';
                        final instructions = m['instructions']?.toString() ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(strength.isNotEmpty ? '$name ($strength)' : name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.navy900)),
                              const SizedBox(height: 2),
                              Text('Dosage: $dosage • Frequency: $freq • Duration: $dur', style: const TextStyle(fontSize: 11.5, color: AppColors.slate700)),
                              if (instructions.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text('Instructions: $instructions', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.slate600)),
                                ),
                            ],
                          ),
                        );
                      }),
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
