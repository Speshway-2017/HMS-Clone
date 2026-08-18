import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../services/doctor_api_service.dart';

class InpatientEmrSheet extends StatefulWidget {
  final Map<String, dynamic> inpatient;
  final VoidCallback onUpdated;

  const InpatientEmrSheet({
    super.key,
    required this.inpatient,
    required this.onUpdated,
  });

  @override
  State<InpatientEmrSheet> createState() => _InpatientEmrSheetState();
}

class _InpatientEmrSheetState extends State<InpatientEmrSheet> with SingleTickerProviderStateMixin {
  final _apiService = DoctorApiService();
  late TabController _tabController;

  bool _isLoadingDetails = false;
  Map<String, dynamic>? _details;

  // Round note controller
  final _noteController = TextEditingController();
  final List<Map<String, dynamic>> _notesList = [];
  bool _isSavingNote = false;

  // Vitals controllers
  final _bpController = TextEditingController();
  final _pulseController = TextEditingController();
  final _tempController = TextEditingController();
  final _spo2Controller = TextEditingController();
  final _rrController = TextEditingController();
  final _weightController = TextEditingController();
  bool _isSavingVitals = false;
  List<Map<String, dynamic>> _vitalsHistory = [];

  // Medication controllers
  final _drugNameController = TextEditingController();
  final _dosageController = TextEditingController(text: '1 tablet');
  final _freqController = TextEditingController(text: '1-0-1');
  final _durationController = TextEditingController(text: '5 days');
  String _medRoute = 'Oral';
  final _medNotesController = TextEditingController();
  bool _isAddingMedication = false;
  List<Map<String, dynamic>> _medicationOrders = [];

  // Lab Orders controllers
  final List<String> _selectedIpLabTests = [];
  final _customIpLabTestController = TextEditingController();
  String _ipLabPriority = 'Routine';
  bool _isPrescribingIpLab = false;
  List<Map<String, dynamic>> _ipLabOrdersHistory = [];

  // Radiology Orders controllers
  final List<String> _selectedIpRadiologyTests = [];
  final _customIpRadiologyTestController = TextEditingController();
  final _ipRadiologyNotesController = TextEditingController();
  String _ipRadiologyPriority = 'Routine';
  bool _isPrescribingIpRadiology = false;
  List<Map<String, dynamic>> _ipRadiologyOrdersHistory = [];

  // Discharge controllers
  final _dischargeDiagnosisController = TextEditingController();
  final _dischargeNotesController = TextEditingController();
  final _specialInstructionsController = TextEditingController(text: 'Follow up in OPD after 7 days.');
  bool _isDischarging = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _loadInpatientDetails();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _noteController.dispose();
    _bpController.dispose();
    _pulseController.dispose();
    _tempController.dispose();
    _spo2Controller.dispose();
    _rrController.dispose();
    _weightController.dispose();
    _drugNameController.dispose();
    _dosageController.dispose();
    _freqController.dispose();
    _durationController.dispose();
    _medNotesController.dispose();
    _customIpLabTestController.dispose();
    _customIpRadiologyTestController.dispose();
    _ipRadiologyNotesController.dispose();
    _dischargeDiagnosisController.dispose();
    _dischargeNotesController.dispose();
    _specialInstructionsController.dispose();
    super.dispose();
  }

  Future<void> _loadInpatientDetails() async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    if (admId.isEmpty) return;

    setState(() {
      _isLoadingDetails = true;
    });

    try {
      final details = await _apiService.fetchInpatientDetails(admId);
      if (details != null && mounted) {
        setState(() {
          _details = details;
          if (details['vitals'] is List) {
            _vitalsHistory = List<Map<String, dynamic>>.from(details['vitals']);
          }
          if (details['medicationOrders'] is List) {
            _medicationOrders = List<Map<String, dynamic>>.from(details['medicationOrders']);
          }
          if (details['labOrders'] is List) {
            _ipLabOrdersHistory = List<Map<String, dynamic>>.from(details['labOrders']);
          }
          if (details['radiologyOrders'] is List) {
            _ipRadiologyOrdersHistory = List<Map<String, dynamic>>.from(details['radiologyOrders']);
          }
          if (details['notes'] is List) {
            _notesList.clear();
            for (var n in details['notes']) {
              if (n is Map) {
                _notesList.add(Map<String, dynamic>.from(n));
              } else if (n is String) {
                _notesList.add({'note': n, 'date': DateTime.now().toIso8601String()});
              }
            }
          }
          if (details['primaryDiagnosis'] != null) {
            _dischargeDiagnosisController.text = details['primaryDiagnosis'].toString();
          }
        });
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isLoadingDetails = false;
      });
    }
  }

  Future<void> _handleAddNote() async {
    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) return;

    setState(() {
      _isSavingNote = true;
    });

    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    final success = await _apiService.addInpatientNotes(admId, noteText);

    if (!mounted) return;

    if (success) {
      setState(() {
        _notesList.insert(0, {
          'note': noteText,
          'date': DateTime.now().toIso8601String(),
        });
        _noteController.clear();
        _isSavingNote = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Daily rounds progress note saved!'), backgroundColor: AppColors.emerald600),
      );
      widget.onUpdated();
    } else {
      setState(() {
        _isSavingNote = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save progress note.'), backgroundColor: AppColors.errorRed),
      );
    }
  }

  Future<void> _handleSaveVitals() async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    if (admId.isEmpty) return;

    setState(() {
      _isSavingVitals = true;
    });

    final payload = {
      'bloodPressure': _bpController.text.trim(),
      'pulseRate': _pulseController.text.trim(),
      'temperature': _tempController.text.trim(),
      'oxygenSaturation': _spo2Controller.text.trim(),
      'respiratoryRate': _rrController.text.trim(),
      'weight': _weightController.text.trim(),
    };

    final success = await _apiService.saveInpatientVitals(admId, payload);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inpatient vitals saved successfully!'), backgroundColor: AppColors.emerald600),
      );
      _bpController.clear();
      _pulseController.clear();
      _tempController.clear();
      _spo2Controller.clear();
      _rrController.clear();
      _weightController.clear();
      _loadInpatientDetails();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save vitals.'), backgroundColor: AppColors.errorRed),
      );
    }

    setState(() {
      _isSavingVitals = false;
    });
  }

  Future<void> _handleAddMedication() async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    final drugName = _drugNameController.text.trim();
    if (drugName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter drug name.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    setState(() {
      _isAddingMedication = true;
    });

    final payload = {
      'drugName': drugName,
      'dosage': _dosageController.text.trim(),
      'frequency': _freqController.text.trim(),
      'duration': _durationController.text.trim(),
      'route': _medRoute,
      'notes': _medNotesController.text.trim(),
    };

    final success = await _apiService.addInpatientMedication(admId, payload);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inpatient medication order created and synced with Pharmacy!'), backgroundColor: AppColors.emerald600),
      );
      _drugNameController.clear();
      _medNotesController.clear();
      _loadInpatientDetails();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to order medication.'), backgroundColor: AppColors.errorRed),
      );
    }

    setState(() {
      _isAddingMedication = false;
    });
  }

  Future<void> _handleUpdateMedication(String medId, String action) async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    final success = await _apiService.updateInpatientMedication(admId, {
      'medicationId': medId,
      'action': action,
    });

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Medication order status updated to $action.'), backgroundColor: AppColors.navy700),
      );
      _loadInpatientDetails();
    }
  }

  Future<void> _handlePrescribeIpLabOrders() async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    if (_selectedIpLabTests.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or enter at least 1 Pathology lab test.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    setState(() {
      _isPrescribingIpLab = true;
    });

    final success = await _apiService.addInpatientLabOrders(admId, _selectedIpLabTests, priority: _ipLabPriority);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inpatient Lab order prescribed and synced with Pathology Lab!'), backgroundColor: AppColors.emerald600),
      );
      setState(() {
        _selectedIpLabTests.clear();
        _customIpLabTestController.clear();
      });
      _loadInpatientDetails();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to prescribe Lab order.'), backgroundColor: AppColors.errorRed),
      );
    }

    setState(() {
      _isPrescribingIpLab = false;
    });
  }

  Future<void> _handlePrescribeIpRadiologyOrders() async {
    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';
    if (_selectedIpRadiologyTests.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or enter at least 1 Radiology scan.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    setState(() {
      _isPrescribingIpRadiology = true;
    });

    final success = await _apiService.addInpatientRadiologyOrders(
      admId,
      _selectedIpRadiologyTests,
      priority: _ipRadiologyPriority,
      notes: _ipRadiologyNotesController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inpatient Radiology order prescribed and synced with Radiology Desk!'), backgroundColor: AppColors.emerald600),
      );
      setState(() {
        _selectedIpRadiologyTests.clear();
        _customIpRadiologyTestController.clear();
        _ipRadiologyNotesController.clear();
      });
      _loadInpatientDetails();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to prescribe Radiology order.'), backgroundColor: AppColors.errorRed),
      );
    }

    setState(() {
      _isPrescribingIpRadiology = false;
    });
  }

  Future<void> _handleFinalizeDischarge() async {
    if (_dischargeDiagnosisController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Diagnosis at discharge is required.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    setState(() {
      _isDischarging = true;
    });

    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? '';

    final success = await _apiService.finalizeDischarge(admId, {
      'diagnosisAtDischarge': _dischargeDiagnosisController.text.trim(),
      'dischargeNotes': _dischargeNotesController.text.trim(),
      'specialInstructions': _specialInstructionsController.text.trim(),
    });

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('IP Discharge finalized! Billing request sent to Receptionist.'), backgroundColor: AppColors.emerald600),
      );
      widget.onUpdated();
      Navigator.pop(context);
    } else {
      setState(() {
        _isDischarging = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to finalize discharge.'), backgroundColor: AppColors.errorRed),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final inpatient = _details ?? widget.inpatient;
    final patient = inpatient['patient'] as Map<String, dynamic>? ?? {};
    final patientName = patient['name']?.toString() ?? 'Inpatient';
    final uhid = patient['uhid']?.toString() ?? 'UHID-893300';
    final wardName = (typeofObjName(inpatient['ward']) ?? inpatient['ward']?.toString()) ?? 'General Ward';
    final roomNum = typeofObjNumber(inpatient['room']) ?? '101';
    final bedNum = typeofObjBedNumber(inpatient['bed']) ?? '101-A';
    final ipNo = inpatient['admissionNumber']?.toString() ?? 'IP20260001';
    final diagnosis = inpatient['primaryDiagnosis']?.toString() ?? 'Under Observation';

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            decoration: const BoxDecoration(
              color: AppColors.navy800,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.emerald50,
                      child: Text(
                        patientName.isNotEmpty ? patientName[0].toUpperCase() : 'I',
                        style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.bold, fontSize: 16),
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
                            '$ipNo • $uhid • $wardName (R$roomNum / Bed $bedNum)',
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
                const SizedBox(height: 10),
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  indicatorColor: AppColors.emerald400,
                  indicatorWeight: 3,
                  labelColor: AppColors.white,
                  unselectedLabelColor: AppColors.slate300,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                  tabs: const [
                    Tab(text: 'Rounds Notes'),
                    Tab(text: 'IP Vitals'),
                    Tab(text: 'Medication Orders'),
                    Tab(text: 'Lab Orders'),
                    Tab(text: 'Radiology Orders'),
                    Tab(text: 'Discharge EMR'),
                  ],
                ),
              ],
            ),
          ),

          // Primary Diagnosis Banner
          if (_isLoadingDetails)
            const LinearProgressIndicator(minHeight: 2, color: AppColors.emerald400, backgroundColor: AppColors.navy50)
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppColors.navy50,
              child: Row(
                children: [
                  const Icon(Icons.local_hospital_outlined, size: 14, color: AppColors.navy700),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Admitting Diagnosis: $diagnosis',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.navy900),
                    ),
                  ),
                ],
              ),
            ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildRoundsNotesTab(),
                _buildIpVitalsTab(),
                _buildMedicationOrdersTab(),
                _buildLabOrdersTab(),
                _buildRadiologyOrdersTab(),
                _buildDischargeTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── TAB 0: ROUNDS & PROGRESS NOTES ──
  Widget _buildRoundsNotesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Doctor Daily Rounds Progress Notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
          const SizedBox(height: 10),
          TextField(
            controller: _noteController,
            maxLines: 3,
            style: const TextStyle(fontSize: 12.5),
            decoration: InputDecoration(
              hintText: 'Enter clinical observations, daily rounds notes, patient status...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton.icon(
              onPressed: _isSavingNote ? null : _handleAddNote,
              icon: _isSavingNote
                  ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.add_task_rounded, size: 16, color: Colors.white),
              label: const Text('Save Rounds Note', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Previous Rounds Log', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          _notesList.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                  child: const Center(child: Text('No progress notes logged yet.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _notesList.length,
                  itemBuilder: (context, idx) {
                    final item = _notesList[idx];
                    final noteText = item['note']?.toString() ?? item.toString();
                    final dateStr = item['date'] != null ? item['date'].toString() : '';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.slate200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Round Note #${_notesList.length - idx}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                              if (dateStr.isNotEmpty)
                                Text(dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr, style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(noteText, style: const TextStyle(fontSize: 12, color: AppColors.slate800, height: 1.3)),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  // ── TAB 1: IP VITALS MONITORING ──
  Widget _buildIpVitalsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Record New Vitals Entry', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _bpController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'BP (mmHg)',
                    hintText: '120/80',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _pulseController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Pulse (bpm)',
                    hintText: '72',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                  controller: _tempController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Temp (°F)',
                    hintText: '98.6',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _spo2Controller,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'SpO2 (%)',
                    hintText: '98%',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
                  controller: _rrController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Resp Rate',
                    hintText: '18 bpm',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _weightController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Weight (kg)',
                    hintText: '70',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isSavingVitals ? null : _handleSaveVitals,
            icon: _isSavingVitals
                ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.monitor_heart_rounded, size: 16, color: Colors.white),
            label: const Text('Log IP Vitals Reading', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 12)),
          ),
          const SizedBox(height: 20),
          const Text('Vitals History Log', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          _vitalsHistory.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                  child: const Center(child: Text('No vitals logged for this admission.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _vitalsHistory.length,
                  itemBuilder: (context, idx) {
                    final item = _vitalsHistory[_vitalsHistory.length - 1 - idx];
                    final bp = item['bloodPressure'] ?? '—';
                    final pulse = item['pulseRate'] ?? '—';
                    final temp = item['temperature'] ?? '—';
                    final spo2 = item['oxygenSaturation'] ?? '—';
                    final recBy = item['recordedBy'] ?? 'Staff';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.slate200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Reading by $recBy', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                              Text(item['recordedAt'] != null ? item['recordedAt'].toString().substring(0, 10) : '', style: const TextStyle(fontSize: 9.5, color: AppColors.slate400)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('BP: $bp | Pulse: $pulse bpm | Temp: $temp°F | SpO2: $spo2%', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.slate800)),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  // ── TAB 2: MEDICATION ORDERS ──
  Widget _buildMedicationOrdersTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Add Inpatient Medication Order', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
          const SizedBox(height: 10),
          TextField(
            controller: _drugNameController,
            style: const TextStyle(fontSize: 12.5),
            decoration: InputDecoration(
              labelText: 'Drug Name & Strength *',
              hintText: 'e.g. Paracetamol 500mg, Ceftriaxone 1g',
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _dosageController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Dosage',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _freqController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Frequency',
                    hintText: '1-0-1',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _medRoute,
                  style: const TextStyle(fontSize: 12, color: AppColors.slate900),
                  decoration: InputDecoration(
                    labelText: 'Route',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Oral', child: Text('Oral (PO)')),
                    DropdownMenuItem(value: 'IV', child: Text('Intravenous (IV)')),
                    DropdownMenuItem(value: 'IM', child: Text('Intramuscular (IM)')),
                    DropdownMenuItem(value: 'SC', child: Text('Subcutaneous (SC)')),
                  ],
                  onChanged: (val) => setState(() => _medRoute = val ?? 'Oral'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _durationController,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    labelText: 'Duration',
                    hintText: '5 days',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _medNotesController,
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              labelText: 'Instructions / Notes',
              hintText: 'After meals / Dilute in 100ml NS',
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _isAddingMedication ? null : _handleAddMedication,
            icon: _isAddingMedication
                ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.add_circle_outline, size: 16, color: Colors.white),
            label: const Text('Order Inpatient Medication', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 12)),
          ),
          const SizedBox(height: 20),
          const Text('Active Medication Orders', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          _medicationOrders.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                  child: const Center(child: Text('No active medication orders.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _medicationOrders.length,
                  itemBuilder: (context, idx) {
                    final med = _medicationOrders[idx];
                    final medId = med['_id']?.toString() ?? '';
                    final drugName = med['drugName'] ?? 'Medication';
                    final dosage = med['dosage'] ?? '1';
                    final freq = med['frequency'] ?? '1-0-1';
                    final route = med['route'] ?? 'Oral';
                    final status = med['status'] ?? 'active';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: status == 'stopped' ? AppColors.slate100 : AppColors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: status == 'stopped' ? AppColors.slate300 : AppColors.emerald200),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(drugName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: status == 'stopped' ? AppColors.slate500 : AppColors.navy900)),
                                const SizedBox(height: 2),
                                Text('$dosage • $freq • Route: $route', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                              ],
                            ),
                          ),
                          if (status == 'active')
                            TextButton(
                              onPressed: () => _handleUpdateMedication(medId, 'stop'),
                              child: const Text('Stop', style: TextStyle(color: AppColors.errorRed, fontSize: 11, fontWeight: FontWeight.bold)),
                            )
                          else if (status == 'stopped')
                            TextButton(
                              onPressed: () => _handleUpdateMedication(medId, 'resume'),
                              child: const Text('Resume', style: TextStyle(color: AppColors.emerald600, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  // ── TAB 3: IP LAB ORDERS (PATHOLOGY) ──
  Widget _buildLabOrdersTab() {
    final availablePresetLabs = [
      'CBC (Complete Blood Count)',
      'Lipid Profile',
      'HbA1c (Glycated Hb)',
      'LFT (Liver Function Test)',
      'KFT / RFT (Renal Function)',
      'Thyroid Profile (T3, T4, TSH)',
      'Serum Electrolytes (Na, K, Cl)',
      'Urine Routine & Microscopy',
      'Blood Sugar (Fasting & PP)',
      'ESR & C-Reactive Protein (CRP)',
      'D-Dimer Test',
      'Blood Culture & Sensitivity',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Prescribe Laboratory Tests (Pathology)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                child: const Text('Syncs with Pathology Lab', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: availablePresetLabs.map((labName) {
              final isSelected = _selectedIpLabTests.contains(labName);
              return FilterChip(
                label: Text(labName, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? AppColors.white : AppColors.slate800)),
                selected: isSelected,
                selectedColor: AppColors.navy800,
                backgroundColor: AppColors.slate100,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedIpLabTests.add(labName);
                    } else {
                      _selectedIpLabTests.remove(labName);
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _customIpLabTestController,
                  style: const TextStyle(fontSize: 12.5),
                  decoration: InputDecoration(
                    hintText: 'Add custom lab test (e.g. Serum Ferritin, Troponin I)...',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  final text = _customIpLabTestController.text.trim();
                  if (text.isNotEmpty) {
                    setState(() {
                      if (!_selectedIpLabTests.contains(text)) {
                        _selectedIpLabTests.add(text);
                      }
                      _customIpLabTestController.clear();
                    });
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy800),
                child: const Text('Add Test', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('Order Priority:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _ipLabPriority,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900),
                items: const [
                  DropdownMenuItem(value: 'Routine', child: Text('Routine')),
                  DropdownMenuItem(value: 'Urgent', child: Text('Urgent')),
                  DropdownMenuItem(value: 'STAT', child: Text('STAT (Emergency)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _ipLabPriority = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isPrescribingIpLab ? null : _handlePrescribeIpLabOrders,
            icon: _isPrescribingIpLab
                ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.science_rounded, size: 16, color: Colors.white),
            label: Text('Prescribe & Sync (${_selectedIpLabTests.length} Lab Tests)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 12)),
          ),
          const SizedBox(height: 20),
          const Text('Prescribed Inpatient Lab Orders', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800)),
          const SizedBox(height: 8),
          _ipLabOrdersHistory.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                  child: const Center(child: Text('No laboratory orders prescribed yet.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _ipLabOrdersHistory.length,
                  itemBuilder: (context, idx) {
                    final item = _ipLabOrdersHistory[_ipLabOrdersHistory.length - 1 - idx];
                    final tests = List<String>.from((item['tests'] as List? ?? []).map((t) => t.toString()));
                    final status = item['status']?.toString() ?? 'pending';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.slate200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(tests.isNotEmpty ? tests.join(', ') : 'Lab Order', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'completed' ? AppColors.emerald50 : AppColors.navy50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(status.toUpperCase(), style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: status == 'completed' ? AppColors.emerald700 : AppColors.navy800)),
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
    );
  }

  // ── TAB 4: IP RADIOLOGY ORDERS (IMAGING) ──
  Widget _buildRadiologyOrdersTab() {
    final availablePresetRads = [
      'Chest X-Ray PA View',
      'USG Abdomen & Pelvis',
      '12-Lead ECG',
      'CT Brain Contrast',
      'MRI Lumbar Spine',
      'X-Ray Knee Joint (AP/Lat)',
      '2D Echo Color Doppler',
      'Mammography (Bilateral)',
      'HRCT Chest Scan',
      'USG Doppler Lower Limb',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Prescribe Radiology & Imaging Scans', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                child: const Text('Syncs with Radiology Desk', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: availablePresetRads.map((scanName) {
              final isSelected = _selectedIpRadiologyTests.contains(scanName);
              return FilterChip(
                label: Text(scanName, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal, color: isSelected ? AppColors.white : AppColors.slate800)),
                selected: isSelected,
                selectedColor: AppColors.navy800,
                backgroundColor: AppColors.slate100,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedIpRadiologyTests.add(scanName);
                    } else {
                      _selectedIpRadiologyTests.remove(scanName);
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _customIpRadiologyTestController,
                  style: const TextStyle(fontSize: 12.5),
                  decoration: InputDecoration(
                    hintText: 'Add custom scan (e.g. HRCT Chest, Angiography)...',
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  final text = _customIpRadiologyTestController.text.trim();
                  if (text.isNotEmpty) {
                    setState(() {
                      if (!_selectedIpRadiologyTests.contains(text)) {
                        _selectedIpRadiologyTests.add(text);
                      }
                      _customIpRadiologyTestController.clear();
                    });
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy800),
                child: const Text('Add Scan', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Text('Scan Priority:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _ipRadiologyPriority,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900),
                items: const [
                  DropdownMenuItem(value: 'Routine', child: Text('Routine')),
                  DropdownMenuItem(value: 'Urgent', child: Text('Urgent')),
                  DropdownMenuItem(value: 'STAT', child: Text('STAT (Emergency)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _ipRadiologyPriority = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _ipRadiologyNotesController,
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              hintText: 'Radiology clinical notes or instructions for imaging tech...',
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _isPrescribingIpRadiology ? null : _handlePrescribeIpRadiologyOrders,
            icon: _isPrescribingIpRadiology
                ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.biotech_rounded, size: 16, color: Colors.white),
            label: Text('Prescribe & Sync (${_selectedIpRadiologyTests.length} Radiology Scans)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 12)),
          ),
          const SizedBox(height: 20),
          const Text('Prescribed Inpatient Radiology Scans', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800)),
          const SizedBox(height: 8),
          _ipRadiologyOrdersHistory.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.slate200)),
                  child: const Center(child: Text('No radiology imaging scans prescribed yet.', style: TextStyle(fontSize: 12, color: AppColors.slate500))),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _ipRadiologyOrdersHistory.length,
                  itemBuilder: (context, idx) {
                    final item = _ipRadiologyOrdersHistory[_ipRadiologyOrdersHistory.length - 1 - idx];
                    final scans = List<String>.from((item['scans'] as List? ?? []).map((s) => s.toString()));
                    final type = item['type']?.toString() ?? (scans.isNotEmpty ? scans.join(', ') : 'Radiology Scan');
                    final status = item['status']?.toString() ?? 'pending';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.slate200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(type, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'completed' ? AppColors.emerald50 : AppColors.navy50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(status.toUpperCase(), style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: status == 'completed' ? AppColors.emerald700 : AppColors.navy800)),
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
    );
  }

  // ── TAB 5: DISCHARGE SUMMARY & EMR ──
  Widget _buildDischargeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.errorBg.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.errorBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.output_rounded, size: 18, color: AppColors.errorRed),
                    SizedBox(width: 8),
                    Text('Initiate Inpatient Discharge', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Finalizing discharge will mark clinical completion, generate the discharge summary, and trigger the billing workflow for Receptionist confirmation.',
                  style: TextStyle(fontSize: 11, color: AppColors.slate700),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _dischargeDiagnosisController,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              labelText: 'Diagnosis at Discharge *',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _dischargeNotesController,
            maxLines: 3,
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              labelText: 'Discharge Summary & Clinical Condition Notes',
              hintText: 'Describe clinical course, condition on discharge...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _specialInstructionsController,
            maxLines: 2,
            style: const TextStyle(fontSize: 12),
            decoration: InputDecoration(
              labelText: 'Post-Discharge Instructions & Follow-up',
              hintText: 'e.g. Follow up in OPD after 7 days, complete oral antibiotics...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isDischarging ? null : _handleFinalizeDischarge,
            icon: _isDischarging
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            label: const Text('Finalize Discharge & Notify Billing', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.errorRed,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  String? typeofObjName(dynamic val) {
    if (val is Map && val['name'] != null) return val['name'].toString();
    return null;
  }

  String? typeofObjNumber(dynamic val) {
    if (val is Map && val['roomNumber'] != null) return val['roomNumber'].toString();
    return null;
  }

  String? typeofObjBedNumber(dynamic val) {
    if (val is Map && val['bedNumber'] != null) return val['bedNumber'].toString();
    return null;
  }
}

