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

class _InpatientEmrSheetState extends State<InpatientEmrSheet> {
  final _apiService = DoctorApiService();
  final _noteController = TextEditingController();
  final _dischargeDiagnosisController = TextEditingController();
  final _dischargeNotesController = TextEditingController();

  final List<String> _notesList = [];

  bool _isSavingNote = false;
  bool _isDischarging = false;
  bool _showDischargeForm = false;

  @override
  void dispose() {
    _noteController.dispose();
    _dischargeDiagnosisController.dispose();
    _dischargeNotesController.dispose();
    super.dispose();
  }

  Future<void> _handleAddNote() async {
    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) return;

    setState(() {
      _isSavingNote = true;
    });

    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? 'adm_id';
    await _apiService.addInpatientNotes(admId, noteText);

    if (!mounted) return;

    setState(() {
      _notesList.insert(0, noteText);
      _noteController.clear();
      _isSavingNote = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Clinical progress note saved.'), backgroundColor: AppColors.emerald600),
    );
    widget.onUpdated();
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

    final admId = widget.inpatient['_id']?.toString() ?? widget.inpatient['id']?.toString() ?? 'adm_id';

    final success = await _apiService.finalizeDischarge(admId, {
      'diagnosisAtDischarge': _dischargeDiagnosisController.text.trim(),
      'dischargeNotes': _dischargeNotesController.text.trim(),
      'specialInstructions': 'Follow up in OPD after 7 days.',
    });

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('IP Discharge finalized! Sent to Receptionist billing.'), backgroundColor: AppColors.emerald600),
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
    final inpatient = widget.inpatient;
    final patient = inpatient['patient'] as Map<String, dynamic>? ?? {};
    final patientName = patient['name']?.toString() ?? 'Inpatient';
    final uhid = patient['uhid']?.toString() ?? 'UHID-893300';
    final wardName = (typeofObjName(inpatient['ward']) ?? inpatient['ward']?.toString()) ?? 'General Ward';
    final roomNum = typeofObjNumber(inpatient['room']) ?? '101';
    final bedNum = typeofObjBedNumber(inpatient['bed']) ?? '101-A';
    final ipNo = inpatient['admissionNumber']?.toString() ?? 'IP20260001';
    final diagnosis = inpatient['primaryDiagnosis']?.toString() ?? 'Under Observation';

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
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
                  backgroundColor: AppColors.emerald50,
                  child: Text(
                    patientName.isNotEmpty ? patientName[0].toUpperCase() : 'I',
                    style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.bold),
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
          ),

          // Scroll Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Admission Summary Info Box
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.navy50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.navy100),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.local_hospital_outlined, size: 16, color: AppColors.navy700),
                            SizedBox(width: 6),
                            Text('Primary Diagnosis', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(diagnosis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate800)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Doctor Clinical Progress Notes Section
                  Row(
                    children: const [
                      Icon(Icons.notes_outlined, size: 18, color: AppColors.navy700),
                      SizedBox(width: 8),
                      Text('Daily Progress Notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _noteController,
                          maxLines: 2,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Enter doctor rounds progress note...',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _isSavingNote ? null : _handleAddNote,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy700,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: _isSavingNote
                            ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Add Note', style: TextStyle(color: AppColors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _notesList.length,
                    itemBuilder: (context, idx) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Round Note #${_notesList.length - idx}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500),
                            ),
                            const SizedBox(height: 4),
                            Text(_notesList[idx], style: const TextStyle(fontSize: 12, color: AppColors.slate800)),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 24),

                  // Finalize Discharge Section
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.errorBg.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.errorBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.output_rounded, size: 18, color: AppColors.errorRed),
                            const SizedBox(width: 8),
                            const Text('Initiate IP Discharge', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                            const Spacer(),
                            TextButton(
                              onPressed: () => setState(() => _showDischargeForm = !_showDischargeForm),
                              child: Text(_showDischargeForm ? 'Cancel' : 'Discharge Summary', style: const TextStyle(color: AppColors.errorRed, fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        if (_showDischargeForm) ...[
                          const SizedBox(height: 10),
                          TextField(
                            controller: _dischargeDiagnosisController,
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              labelText: 'Diagnosis at Discharge *',
                              fillColor: AppColors.white,
                              filled: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _dischargeNotesController,
                            maxLines: 2,
                            style: const TextStyle(fontSize: 12),
                            decoration: InputDecoration(
                              labelText: 'Discharge Summary Notes & Advice',
                              fillColor: AppColors.white,
                              filled: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: _isDischarging ? null : _handleFinalizeDischarge,
                            icon: _isDischarging
                                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.check, color: Colors.white, size: 16),
                            label: const Text('Finalize Discharge & Notify Receptionist', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.errorRed,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
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
