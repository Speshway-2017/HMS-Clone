import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../authentication/services/auth_service.dart';
import '../services/nurse_service.dart';

class NursingNotesScreen extends StatefulWidget {
  const NursingNotesScreen({super.key});

  @override
  State<NursingNotesScreen> createState() => _NursingNotesScreenState();
}

class _NursingNotesScreenState extends State<NursingNotesScreen> {
  final NurseService _nurseService = NurseService();
  bool _isLoading = false;

  // Search & Filters State
  String _selectedPatientFilter = 'All';
  String _searchQuery = '';
  String _activeFilterPill = 'All Notes'; // Today, This Week, Critical, All Notes

  // Database Option Lists
  List<dynamic> _inpatients = [];
  String _currentNurseName = 'Staff Nurse, RN';

  // Notes List State (Pre-populated Mockup connected to DB)
  List<Map<String, dynamic>> _notes = [];

  @override
  void initState() {
    super.initState();
    _loadNotesData();
  }

  Future<void> _loadNotesData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final name = await AuthService.getUserName();
      if (name != null) {
        setState(() {
          _currentNurseName = name;
        });
      }

      final inpatients = await _nurseService.getInpatients();
      setState(() {
        _inpatients = inpatients;
        _notes = [];
        _isLoading = false;
      });
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

  void _showAddEditNoteSheet({Map<String, dynamic>? editingNote}) {
    Map<String, dynamic>? selectedPatient = editingNote != null
        ? _inpatients.firstWhere((p) => p['patient']['_id'] == editingNote['patientId'], orElse: () => null)
        : null;

    final observationController = TextEditingController(text: editingNote?['observation'] ?? '');
    final symptomsController = TextEditingController(text: editingNote?['symptoms'] ?? '');
    final medicationController = TextEditingController(text: editingNote?['medication'] ?? '');
    final notesController = TextEditingController(text: editingNote?['notes'] ?? '');
    String status = editingNote?['status'] ?? 'Routine';

    // Vitals Controllers
    final tempController = TextEditingController(text: editingNote?['vitals']['temp']?.replaceAll(' °F', '') ?? '');
    final bpController = TextEditingController(text: editingNote?['vitals']['bp'] ?? '');
    final pulseController = TextEditingController(text: editingNote?['vitals']['pulse']?.replaceAll(' bpm', '') ?? '');
    final respController = TextEditingController(text: editingNote?['vitals']['resp']?.replaceAll(' bpm', '') ?? '');
    final spo2Controller = TextEditingController(text: editingNote?['vitals']['spo2']?.replaceAll('%', '') ?? '');

    List<String> attachments = List<String>.from(editingNote?['attachments'] ?? []);

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
                        Text(
                          editingNote == null ? 'Add Nursing Note' : 'Edit Nursing Note',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Patient Selector (Live DB data)
                    const Text('Patient', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<dynamic>(
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      hint: const Text('Select Patient...', style: TextStyle(fontSize: 12)),
                      value: selectedPatient,
                      onChanged: editingNote != null ? null : (val) {
                        setSheetState(() {
                          selectedPatient = val;
                        });
                      },
                      items: _inpatients.map((adm) {
                        final pat = adm['patient'];
                        return DropdownMenuItem<dynamic>(
                          value: adm,
                          child: Text(pat['name'] ?? '', style: const TextStyle(fontSize: 12)),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),

                    // Priority Status Selector
                    const Text('Status Level', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      value: status,
                      onChanged: (val) {
                        if (val != null) {
                          setSheetState(() {
                            status = val;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'Routine', child: Text('Routine', style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(value: 'Critical', child: Text('Critical', style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(value: 'Urgent', child: Text('Urgent', style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(value: 'Follow-up', child: Text('Follow-up', style: TextStyle(fontSize: 12))),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Observation field
                    const Text('Observation Summary', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: observationController,
                      maxLines: 3,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: 'Describe patient observations or nursing interventions...',
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Symptoms
                    const Text('Symptoms Described', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: symptomsController,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: 'e.g. fatigue, headache',
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Medication Administered
                    const Text('Medication Administered', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: medicationController,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: 'e.g. Paracetamol 650mg PO',
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Vitals Sub-Section
                    const Text('Recorded Vitals', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: tempController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Temp (°F)', labelStyle: TextStyle(fontSize: 10)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: bpController,
                            decoration: const InputDecoration(labelText: 'BP (mmHg)', labelStyle: TextStyle(fontSize: 10)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: pulseController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Pulse (bpm)', labelStyle: TextStyle(fontSize: 10)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: respController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Resp (bpm)', labelStyle: TextStyle(fontSize: 10)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: spo2Controller,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'SpO2 (%)', labelStyle: TextStyle(fontSize: 10)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Additional Notes
                    const Text('Additional Notes', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: notesController,
                      maxLines: 2,
                      style: const TextStyle(fontSize: 12),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Attachments upload simulator
                    GestureDetector(
                      onTap: () {
                        setSheetState(() {
                          attachments.add('scanned_vitals_report_doc.pdf');
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAFAFA),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFEFF1F7)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.attach_file_rounded, size: 14, color: AppColors.slate500),
                            SizedBox(width: 6),
                            Text('Attach Clinical Scan Files', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                          ],
                        ),
                      ),
                    ),
                    if (attachments.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...attachments.map((file) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.insert_drive_file_outlined, size: 12, color: AppColors.navy700),
                                    const SizedBox(width: 8),
                                    Text(file, style: const TextStyle(fontSize: 10, color: AppColors.slate700)),
                                  ],
                                ),
                                GestureDetector(
                                  onTap: () {
                                    setSheetState(() {
                                      attachments.remove(file);
                                    });
                                  },
                                  child: const Icon(Icons.close_rounded, size: 12, color: AppColors.errorRed),
                                )
                              ],
                            ),
                          )),
                    ],
                    const SizedBox(height: 24),

                    // Save Buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.navy700,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                              if (selectedPatient == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please select a patient.')),
                                );
                                return;
                              }
                              if (observationController.text.trim().isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please enter observation.')),
                                );
                                return;
                              }

                              final currentFormattedTime = TimeOfDay.now().format(context);
                              final currentFormattedDate = '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}';

                              final newNotePayload = {
                                'id': editingNote != null ? editingNote['id'] : 'note-${DateTime.now().millisecondsSinceEpoch}',
                                'patientId': selectedPatient!['patient']['_id'],
                                'patientName': selectedPatient!['patient']['name'],
                                'uhid': selectedPatient!['patient']['uhid'] ?? 'UHID-MOCK',
                                'ward': selectedPatient!['ward'] ?? 'Ward',
                                'room': 'Room ${selectedPatient!['room']['roomNumber']}',
                                'date': editingNote != null ? editingNote['date'] : currentFormattedDate,
                                'time': editingNote != null ? editingNote['time'] : currentFormattedTime,
                                'nurse': _currentNurseName,
                                'observation': observationController.text.trim(),
                                'symptoms': symptomsController.text.trim(),
                                'medication': medicationController.text.trim(),
                                'status': status,
                                'vitals': {
                                  'temp': tempController.text.trim().isEmpty ? '--' : '${tempController.text.trim()} °F',
                                  'bp': bpController.text.trim().isEmpty ? '--' : bpController.text.trim(),
                                  'pulse': pulseController.text.trim().isEmpty ? '--' : '${pulseController.text.trim()} bpm',
                                  'resp': respController.text.trim().isEmpty ? '--' : '${respController.text.trim()} bpm',
                                  'spo2': spo2Controller.text.trim().isEmpty ? '--' : '${spo2Controller.text.trim()}%',
                                },
                                'notes': notesController.text.trim(),
                                'attachments': attachments,
                              };

                              setState(() {
                                if (editingNote != null) {
                                  _notes = _notes.map((n) => n['id'] == editingNote['id'] ? newNotePayload : n).toList();
                                } else {
                                  _notes.insert(0, newNotePayload);
                                }
                              });

                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: AppColors.emerald600,
                                  content: Text(editingNote == null ? 'Nursing note logged.' : 'Nursing note updated.'),
                                ),
                              );
                            },
                            child: const Text('Save Note', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: AppColors.slate700,
                              elevation: 0,
                              side: const BorderSide(color: AppColors.slate300),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ],
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

  void _deleteNote(String id) {
    setState(() {
      _notes.removeWhere((n) => n['id'] == id);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Note deleted successfully.')),
    );
  }

  List<Map<String, dynamic>> _getFilteredNotes() {
    return _notes.where((n) {
      // 1. Patient Filter
      if (_selectedPatientFilter != 'All' && n['patientId'] != _selectedPatientFilter) {
        return false;
      }

      // 2. Search Query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchPatient = n['patientName'].toString().toLowerCase().contains(query);
        final matchObs = n['observation'].toString().toLowerCase().contains(query);
        if (!matchPatient && !matchObs) return false;
      }

      // 3. Tab Pills Filter
      if (_activeFilterPill == 'Today') {
        final todayStr = '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}';
        if (n['date'] != todayStr) return false;
      } else if (_activeFilterPill == 'Critical') {
        if (n['status'] != 'Critical' && n['status'] != 'Urgent') return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _getFilteredNotes();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Nursing Notes Log',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : Column(
              children: [
                _buildFilterHeaderCard(),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(child: Text('No observation notes found.', style: TextStyle(color: AppColors.slate500, fontSize: 12)))
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.all(16.0),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final note = filtered[index];
                            return _buildTimelineNoteCard(note);
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFEFF1F7))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nursing Notes Log', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                  Text('Document and audit clinical patient observations.', style: TextStyle(fontSize: 9, color: AppColors.slate500)),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.navy700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                onPressed: () => _showAddEditNoteSheet(),
                icon: const Icon(Icons.add, size: 14),
                label: const Text('Add Note', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Search notes input
          TextFormField(
            onChanged: (val) {
              setState(() {
                _searchQuery = val.trim();
              });
            },
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search_rounded, size: 16, color: AppColors.slate400),
              hintText: 'Search observations, patient names, UHIDs...',
              contentPadding: EdgeInsets.symmetric(vertical: 8),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),

          // Patient filter and Pills
          Row(
            children: [
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 10),
                      border: OutlineInputBorder(),
                    ),
                    isDense: true,
                    style: const TextStyle(fontSize: 11, color: AppColors.slate800),
                    hint: const Text('All Patients'),
                    value: _selectedPatientFilter,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedPatientFilter = val;
                        });
                      }
                    },
                    items: [
                      const DropdownMenuItem(value: 'All', child: Text('All Patients', style: TextStyle(fontSize: 11))),
                      ..._inpatients.map((adm) {
                        final pat = adm['patient'];
                        return DropdownMenuItem(
                          value: pat['_id'].toString(),
                          child: Text(pat['name'] ?? '', style: const TextStyle(fontSize: 11)),
                        );
                      })
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Filter Pills
              ...['All Notes', 'Today', 'Critical'].map((pill) {
                final isSelected = _activeFilterPill == pill;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _activeFilterPill = pill;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(left: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.navy700 : const Color(0xFFF1F3F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      pill,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : AppColors.slate600,
                      ),
                    ),
                  ),
                );
              }),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildTimelineNoteCard(Map<String, dynamic> note) {
    Color statColor = AppColors.slate400;
    Color statBg = AppColors.slate100;
    if (note['status'] == 'Critical') {
      statColor = AppColors.errorRed;
      statBg = AppColors.errorBg;
    } else if (note['status'] == 'Urgent') {
      statColor = Colors.orange;
      statBg = Colors.orange.shade50;
    } else if (note['status'] == 'Routine') {
      statColor = AppColors.navy700;
      statBg = AppColors.navy50;
    }

    final List<String> atts = List<String>.from(note['attachments'] ?? []);

    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    note['patientName'],
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  ),
                  Text(
                    'UHID: ${note['uhid']} • ${note['ward']} (${note['room']})',
                    style: const TextStyle(fontSize: 9, color: AppColors.slate500, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statBg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  note['status'].toString().toUpperCase(),
                  style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: statColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(color: Color(0xFFF1F3F9), height: 1),
          const SizedBox(height: 10),

          // Observation Details
          const Text('CLINICAL OBSERVATION', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppColors.slate400)),
          const SizedBox(height: 4),
          Text(
            note['observation'],
            style: const TextStyle(fontSize: 12, color: AppColors.slate800, height: 1.4),
          ),
          const SizedBox(height: 8),

          if (note['symptoms'].toString().isNotEmpty) ...[
            Text('Symptoms: ${note['symptoms']}', style: const TextStyle(fontSize: 10, color: AppColors.slate600, fontWeight: FontWeight.w500)),
            const SizedBox(height: 4),
          ],
          if (note['medication'].toString().isNotEmpty) ...[
            Text('Medication Administered: ${note['medication']}', style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
          ],

          // Vitals Summary Panel
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSingleVitalItem('Temp', note['vitals']['temp']),
                _buildSingleVitalItem('BP', note['vitals']['bp']),
                _buildSingleVitalItem('Pulse', note['vitals']['pulse']),
                _buildSingleVitalItem('Resp', note['vitals']['resp']),
                _buildSingleVitalItem('SpO2', note['vitals']['spo2']),
              ],
            ),
          ),
          const SizedBox(height: 8),

          if (note['notes'].toString().isNotEmpty) ...[
            Text(
              'Followup directions: ${note['notes']}',
              style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontStyle: FontStyle.italic),
            ),
            const SizedBox(height: 8),
          ],

          if (atts.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              children: atts.map((file) => Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(4)),
                child: Row(
                  children: [
                    const Icon(Icons.insert_drive_file_outlined, size: 10, color: AppColors.navy700),
                    const SizedBox(width: 4),
                    Text(file, style: const TextStyle(fontSize: 8, color: AppColors.slate700)),
                  ],
                ),
              )).toList(),
            ),
            const SizedBox(height: 12),
          ],

          // Footer meta and actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'By ${note['nurse']} on ${note['date']} @ ${note['time']}',
                style: const TextStyle(fontSize: 8, color: AppColors.slate400),
              ),
              Row(
                children: [
                  GestureDetector(
                    onTap: () => _showAddEditNoteSheet(editingNote: note),
                    child: const Text('Edit', style: TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () => _deleteNote(note['id']),
                    child: const Text('Delete', style: TextStyle(fontSize: 10, color: AppColors.errorRed, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Printing report for ${note['patientName']}...')),
                      );
                    },
                    child: const Icon(Icons.print_rounded, size: 14, color: AppColors.slate500),
                  ),
                ],
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildSingleVitalItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 8, color: AppColors.slate400, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate800)),
      ],
    );
  }
}
