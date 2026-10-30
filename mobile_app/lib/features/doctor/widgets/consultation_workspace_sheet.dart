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

class _ConsultationWorkspaceSheetState extends State<ConsultationWorkspaceSheet> with SingleTickerProviderStateMixin {
  final _apiService = DoctorApiService();

  late TabController _tabController;

  // Vitals Controllers
  final _bpController = TextEditingController();
  final _pulseController = TextEditingController();
  final _tempController = TextEditingController();
  final _spo2Controller = TextEditingController();
  final _respRateController = TextEditingController();
  final _weightController = TextEditingController();

  // Clinical Evaluation Controllers
  final _chiefComplaintsController = TextEditingController();
  final _symptomsController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _clinicalNotesController = TextEditingController();
  final _adviceController = TextEditingController();

  // Dynamic Medications list
  final List<Map<String, dynamic>> _medications = [];

  // Pharmacy Inventory Search per row index
  final Map<int, List<Map<String, dynamic>>> _searchResults = {};
  final Map<int, bool> _isSearching = {};
  final Map<int, bool> _showSuggestions = {};

  // Investigations: Laboratory & Radiology
  final List<String> _selectedLabTests = [];
  final List<String> _selectedRadiologyTests = [];

  final _customLabTestController = TextEditingController();
  final _customRadiologyTestController = TextEditingController();

  // Master Lists for Lab and Radiology
  final List<String> _defaultLabTests = [
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
  ];

  final List<String> _defaultRadiologyTests = [
    'Chest X-Ray PA View',
    'USG Abdomen & Pelvis',
    '12-Lead ECG',
    'CT Brain Contrast',
    'MRI Lumbar Spine',
    'X-Ray Knee Joint (AP/Lat)',
    '2D Echo Color Doppler',
    'Mammography (Bilateral)',
  ];

  // Inpatient (IP) Admission Recommendation Form
  bool _recommendIp = false;
  final _ipDiagnosisController = TextEditingController();
  final _ipNotesController = TextEditingController();
  final _ipReasonController = TextEditingController();
  final _ipInstructionsController = TextEditingController();

  String _ipPriority = 'Routine';
  String _preferredWard = 'General Ward';
  String _preferredBedType = 'Standard Bed';
  String _expectedStay = '3-5 Days';

  List<String> _wardCategories = [
    'General Ward',
    'Semi-Private Ward',
    'Private Ward',
    'ICU / Critical Care',
    'Deluxe Suite',
  ];

  List<String> _bedTypes = [
    'Standard Bed',
    'Oxygen Bed',
    'ICU Bed with Ventilator',
    'Isolation Bed',
  ];

  final List<String> _priorityLevels = ['Routine', 'Urgent', 'Emergency / STAT'];
  final List<String> _expectedStayOptions = ['1-2 Days', '3-5 Days', '1 Week', '2+ Weeks'];

  bool _isSubmitting = false;
  bool _isLoadingWardsAndBeds = false;

  String? _consultationSessionId;
  Map<String, dynamic>? _patientHistoryData;
  bool _isLoadingHistory = false;
  bool _isLoadingDraft = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _tabController.addListener(_onTabChanged);
    _initializeDefaultData();
    _fetchExistingWardsAndBeds();
    _fetchDraftSessionAndHistory();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) {
      _autoSaveDraftSession();
    }
  }

  Future<void> _fetchExistingWardsAndBeds() async {
    setState(() => _isLoadingWardsAndBeds = true);
    try {
      final wards = await _apiService.fetchExistingWards();
      final beds = await _apiService.fetchExistingBeds();

      if (!mounted) return;

      final wardNames = <String>{};
      for (final w in wards) {
        final name = w['name']?.toString() ?? '';
        final wType = w['wardType']?.toString() ?? '';
        if (name.isNotEmpty) wardNames.add(name);
        if (wType.isNotEmpty) wardNames.add(wType);
      }

      final bedTypes = <String>{};
      for (final b in beds) {
        final bType = b['bedType']?.toString() ?? '';
        final room = b['room'] as Map<String, dynamic>? ?? {};
        final roomType = room['roomType']?.toString() ?? '';
        if (bType.isNotEmpty) bedTypes.add(bType);
        if (roomType.isNotEmpty) bedTypes.add(roomType);
      }

      setState(() {
        if (wardNames.isNotEmpty) {
          _wardCategories = wardNames.toList();
        }
        if (bedTypes.isNotEmpty) {
          _bedTypes = bedTypes.toList();
        }

        if (_wardCategories.isNotEmpty && !_wardCategories.contains(_preferredWard)) {
          _preferredWard = _wardCategories.first;
        }
        if (_bedTypes.isNotEmpty && !_bedTypes.contains(_preferredBedType)) {
          _preferredBedType = _bedTypes.first;
        }
        _isLoadingWardsAndBeds = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingWardsAndBeds = false);
    }
  }

  Future<void> _fetchDraftSessionAndHistory() async {
    final appt = widget.appointment;
    String apptId = '';
    if (appt['appointment'] != null) {
      if (appt['appointment'] is Map) {
        apptId = appt['appointment']['_id']?.toString() ?? appt['appointment']['id']?.toString() ?? '';
      } else if (appt['appointment'] is String) {
        apptId = appt['appointment'].toString();
      }
    }
    if (apptId.isEmpty) {
      apptId = appt['_id']?.toString() ?? appt['id']?.toString() ?? '';
    }

    final patientObj = appt['patient'];
    String patientId = '';
    if (patientObj is Map) {
      patientId = patientObj['_id']?.toString() ?? patientObj['id']?.toString() ?? '';
    } else if (patientObj is String) {
      patientId = patientObj;
    }

    setState(() {
      _isLoadingDraft = true;
      _isLoadingHistory = true;
    });

    try {
      // 1. Fetch or initialize draft consultation session
      if (apptId.isNotEmpty) {
        var draft = await _apiService.fetchConsultationDraft(apptId);
        draft ??= await _apiService.startConsultationSession(apptId);

        if (draft != null && mounted) {
          _consultationSessionId = draft['_id']?.toString();

          // Restore Vitals
          final v = draft['vitals'] as Map<String, dynamic>? ?? {};
          if (v.isNotEmpty) {
            if (v['bp'] != null || v['bloodPressure'] != null) _bpController.text = v['bp']?.toString() ?? v['bloodPressure']?.toString() ?? '';
            if (v['pulse'] != null || v['pulseRate'] != null) _pulseController.text = v['pulse']?.toString() ?? v['pulseRate']?.toString() ?? '';
            if (v['temp'] != null || v['temperature'] != null) _tempController.text = v['temp']?.toString() ?? v['temperature']?.toString() ?? '';
            if (v['spo2'] != null) _spo2Controller.text = v['spo2']?.toString() ?? '';
            if (v['respRate'] != null) _respRateController.text = v['respRate']?.toString() ?? '';
            if (v['weight'] != null) _weightController.text = v['weight']?.toString() ?? '';
          }

          // Restore Text Fields
          if ((draft['chiefComplaint']?.toString() ?? '').isNotEmpty) {
            _chiefComplaintsController.text = draft['chiefComplaint'].toString();
          }
          if ((draft['diagnosis']?.toString() ?? '').isNotEmpty) {
            _diagnosisController.text = draft['diagnosis'].toString();
          }
          if ((draft['symptoms']?.toString() ?? '').isNotEmpty) {
            _symptomsController.text = draft['symptoms'].toString();
          }
          if ((draft['clinicalNotes']?.toString() ?? '').isNotEmpty) {
            _clinicalNotesController.text = draft['clinicalNotes'].toString();
          }
          if ((draft['advice']?.toString() ?? '').isNotEmpty) {
            _adviceController.text = draft['advice'].toString();
          }

          // Restore Prescriptions (Medications)
          final rawDraftMeds = draft['prescriptions'] ?? draft['medicines'] ?? widget.appointment['prescriptions'] ?? widget.appointment['medicines'];
          if (rawDraftMeds != null && rawDraftMeds is List && rawDraftMeds.isNotEmpty) {
            _medications.clear();
            _searchResults.clear();
            _isSearching.clear();
            _showSuggestions.clear();
            for (int i = 0; i < rawDraftMeds.length; i++) {
              final item = Map<String, dynamic>.from(rawDraftMeds[i] as Map);
              _medications.add({
                'name': item['name']?.toString() ?? item['drugName']?.toString() ?? '',
                'strength': item['strength']?.toString() ?? item['power']?.toString() ?? '',
                'dosage': item['dosage']?.toString() ?? '1 tablet',
                'frequency': item['frequency']?.toString() ?? '1-0-1',
                'duration': item['duration']?.toString() ?? '5 days',
                'instructions': item['instructions']?.toString() ?? item['timing']?.toString() ?? 'After food',
                'route': item['route']?.toString() ?? 'Oral',
              });
              _searchResults[i] = [];
              _isSearching[i] = false;
              _showSuggestions[i] = false;
            }
          }

          // Restore Lab Orders
          final rawLabs = draft['labOrders'] ?? draft['labTests'] ?? widget.appointment['labOrders'] ?? widget.appointment['labTests'];
          if (rawLabs != null && rawLabs is List && rawLabs.isNotEmpty) {
            _selectedLabTests.clear();
            for (final l in rawLabs) {
              if (l != null) {
                if (l is Map && l['testName'] != null) {
                  _selectedLabTests.add(l['testName'].toString());
                } else {
                  _selectedLabTests.add(l.toString());
                }
              }
            }
          }

          // Restore Radiology Orders
          final rawRads = draft['radiologyOrders'] ?? draft['radiologyTests'] ?? widget.appointment['radiologyOrders'] ?? widget.appointment['radiologyTests'];
          if (rawRads != null && rawRads is List && rawRads.isNotEmpty) {
            _selectedRadiologyTests.clear();
            for (final r in rawRads) {
              if (r != null) {
                if (r is Map && r['testName'] != null) {
                  _selectedRadiologyTests.add(r['testName'].toString());
                } else {
                  _selectedRadiologyTests.add(r.toString());
                }
              }
            }
          }

          // Restore IP Recommendation
          final rec = draft['admissionRecommendation'] ?? draft['ipRecommendation'] ?? widget.appointment['admissionRecommendation'] ?? widget.appointment['ipRecommendation'] ?? widget.appointment['admission'];
          if (rec != null && rec is Map) {
            final recMap = Map<String, dynamic>.from(rec);
            if (recMap['recommended'] == true || recMap['isRecommended'] == true || (recMap['primaryDiagnosis']?.toString() ?? '').isNotEmpty) {
              _recommendIp = true;
              _ipDiagnosisController.text = recMap['primaryDiagnosis']?.toString() ?? recMap['diagnosis']?.toString() ?? _diagnosisController.text;
              _ipNotesController.text = recMap['clinicalNotes']?.toString() ?? recMap['notes']?.toString() ?? '';
              _ipReasonController.text = recMap['admissionReason']?.toString() ?? recMap['reason']?.toString() ?? '';
              _ipInstructionsController.text = recMap['specialInstructions']?.toString() ?? recMap['instructions']?.toString() ?? '';
              if (recMap['priority'] != null) _ipPriority = recMap['priority'].toString();
              if (recMap['preferredWard'] != null) _preferredWard = recMap['preferredWard'].toString();
              if (recMap['preferredBedType'] != null) _preferredBedType = recMap['preferredBedType'].toString();
              if (recMap['expectedStay'] != null) _expectedStay = recMap['expectedStay'].toString();
            }
          }
        }
      }

      // 2. Fetch Patient History
      if (patientId.isNotEmpty) {
        final history = await _apiService.fetchPatientHistory(patientId);
        if (mounted) {
          _patientHistoryData = history;
        }
      }
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingDraft = false;
          _isLoadingHistory = false;
        });
      }
    }
  }

  Future<void> _autoSaveDraftSession() async {
    if (_consultationSessionId == null || _consultationSessionId!.isEmpty) return;

    final validMeds = _medications
        .where((m) => (m['name']?.toString().trim() ?? '').isNotEmpty)
        .toList();

    final draftPayload = {
      'vitals': {
        'bp': _bpController.text.trim(),
        'pulse': _pulseController.text.trim(),
        'temp': _tempController.text.trim(),
        'spo2': _spo2Controller.text.trim(),
        'respRate': _respRateController.text.trim(),
        'weight': _weightController.text.trim(),
      },
      'chiefComplaint': _chiefComplaintsController.text.trim(),
      'diagnosis': _diagnosisController.text.trim(),
      'symptoms': _symptomsController.text.trim(),
      'clinicalNotes': _clinicalNotesController.text.trim(),
      'advice': _adviceController.text.trim(),
      'prescriptions': validMeds,
      'labOrders': _selectedLabTests,
      'radiologyOrders': _selectedRadiologyTests,
      'admissionRecommendation': {
        'recommended': _recommendIp,
        'primaryDiagnosis': _ipDiagnosisController.text.trim().isNotEmpty
            ? _ipDiagnosisController.text.trim()
            : _diagnosisController.text.trim(),
        'priority': _ipPriority,
        'preferredWard': _preferredWard,
        'preferredBedType': _preferredBedType,
        'expectedStay': _expectedStay,
        'clinicalNotes': _ipNotesController.text.trim(),
        'admissionReason': _ipReasonController.text.trim(),
        'specialInstructions': _ipInstructionsController.text.trim(),
      },
    };

    await _apiService.updateConsultationDraft(_consultationSessionId!, draftPayload);
  }

  void _initializeDefaultData() {
    final appt = widget.appointment;
    final existingVitals = appt['vitals'] as Map<String, dynamic>? ?? {};

    if (existingVitals.isNotEmpty) {
      if (existingVitals['bp'] != null || existingVitals['bloodPressure'] != null) {
        _bpController.text = existingVitals['bp']?.toString() ?? existingVitals['bloodPressure']?.toString() ?? '';
      }
      if (existingVitals['pulse'] != null || existingVitals['pulseRate'] != null) {
        _pulseController.text = existingVitals['pulse']?.toString() ?? existingVitals['pulseRate']?.toString() ?? '';
      }
      if (existingVitals['temp'] != null || existingVitals['temperature'] != null) {
        _tempController.text = existingVitals['temp']?.toString() ?? existingVitals['temperature']?.toString() ?? '';
      }
      if (existingVitals['spo2'] != null) _spo2Controller.text = existingVitals['spo2']?.toString() ?? '';
      if (existingVitals['respRate'] != null) _respRateController.text = existingVitals['respRate']?.toString() ?? '';
      if (existingVitals['weight'] != null) _weightController.text = existingVitals['weight']?.toString() ?? '';
    } else {
      _bpController.text = '120/80';
      _pulseController.text = '72';
      _tempController.text = '98.6';
      _spo2Controller.text = '98';
      _respRateController.text = '16';
      _weightController.text = '68';
    }

    _chiefComplaintsController.text = appt['chiefComplaint']?.toString() ?? appt['notes']?.toString() ?? '';
    _diagnosisController.text = appt['diagnosis']?.toString() ?? '';
    _clinicalNotesController.text = appt['clinicalNotes']?.toString() ?? '';
    _symptomsController.text = appt['symptoms']?.toString() ?? '';
    _adviceController.text = appt['advice']?.toString() ?? '';

    // Initialize Prescriptions / Medications from appt if available
    final rawMeds = appt['prescriptions'] ?? appt['medicines'];
    if (rawMeds != null && rawMeds is List && rawMeds.isNotEmpty) {
      _medications.clear();
      for (int i = 0; i < rawMeds.length; i++) {
        final item = Map<String, dynamic>.from(rawMeds[i] as Map);
        _medications.add({
          'name': item['name']?.toString() ?? item['drugName']?.toString() ?? '',
          'strength': item['strength']?.toString() ?? item['power']?.toString() ?? '',
          'dosage': item['dosage']?.toString() ?? '1 tablet',
          'frequency': item['frequency']?.toString() ?? '1-0-1',
          'duration': item['duration']?.toString() ?? '5 days',
          'instructions': item['instructions']?.toString() ?? item['timing']?.toString() ?? 'After food',
          'route': item['route']?.toString() ?? 'Oral',
        });
        _searchResults[i] = [];
        _isSearching[i] = false;
        _showSuggestions[i] = false;
      }
    } else {
      _addMedicationRow();
    }

    // Initialize Lab Orders from appt
    final rawLabs = appt['labOrders'] ?? appt['labTests'];
    if (rawLabs != null && rawLabs is List && rawLabs.isNotEmpty) {
      _selectedLabTests.clear();
      for (final l in rawLabs) {
        if (l != null) {
          if (l is Map && l['testName'] != null) {
            _selectedLabTests.add(l['testName'].toString());
          } else {
            _selectedLabTests.add(l.toString());
          }
        }
      }
    }

    // Initialize Radiology Orders from appt
    final rawRads = appt['radiologyOrders'] ?? appt['radiologyTests'];
    if (rawRads != null && rawRads is List && rawRads.isNotEmpty) {
      _selectedRadiologyTests.clear();
      for (final r in rawRads) {
        if (r != null) {
          if (r is Map && r['testName'] != null) {
            _selectedRadiologyTests.add(r['testName'].toString());
          } else {
            _selectedRadiologyTests.add(r.toString());
          }
        }
      }
    }

    // Initialize IP Admission Recommendation from appt
    final rec = appt['admissionRecommendation'] ?? appt['ipRecommendation'] ?? appt['admission'];
    if (rec != null && rec is Map) {
      final recMap = Map<String, dynamic>.from(rec);
      if (recMap['recommended'] == true || recMap['isRecommended'] == true || (recMap['primaryDiagnosis']?.toString() ?? '').isNotEmpty) {
        _recommendIp = true;
        _ipDiagnosisController.text = recMap['primaryDiagnosis']?.toString() ?? recMap['diagnosis']?.toString() ?? appt['diagnosis']?.toString() ?? '';
        _ipNotesController.text = recMap['clinicalNotes']?.toString() ?? recMap['notes']?.toString() ?? '';
        _ipReasonController.text = recMap['admissionReason']?.toString() ?? recMap['reason']?.toString() ?? '';
        _ipInstructionsController.text = recMap['specialInstructions']?.toString() ?? recMap['instructions']?.toString() ?? '';
        if (recMap['priority'] != null) _ipPriority = recMap['priority'].toString();
        if (recMap['preferredWard'] != null) _preferredWard = recMap['preferredWard'].toString();
        if (recMap['preferredBedType'] != null) _preferredBedType = recMap['preferredBedType'].toString();
        if (recMap['expectedStay'] != null) _expectedStay = recMap['expectedStay'].toString();
      }
    }
  }

  @override
  void dispose() {
    _autoSaveDraftSession();
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _bpController.dispose();
    _pulseController.dispose();
    _tempController.dispose();
    _spo2Controller.dispose();
    _respRateController.dispose();
    _weightController.dispose();
    _chiefComplaintsController.dispose();
    _symptomsController.dispose();
    _diagnosisController.dispose();
    _clinicalNotesController.dispose();
    _adviceController.dispose();
    _customLabTestController.dispose();
    _customRadiologyTestController.dispose();
    _ipDiagnosisController.dispose();
    _ipNotesController.dispose();
    _ipReasonController.dispose();
    _ipInstructionsController.dispose();
    super.dispose();
  }

  void _addMedicationRow() {
    setState(() {
      _medications.add({
        'name': '',
        'strength': '',
        'dosage': '1 tablet',
        'frequency': '1-0-1',
        'duration': '5 days',
        'instructions': 'After food',
        'route': 'Oral',
      });
      final idx = _medications.length - 1;
      _searchResults[idx] = [];
      _isSearching[idx] = false;
      _showSuggestions[idx] = false;
    });
  }

  void _removeMedicationRow(int index) {
    if (_medications.length > 1) {
      setState(() {
        _medications.removeAt(index);
        _searchResults.remove(index);
        _isSearching.remove(index);
        _showSuggestions.remove(index);
      });
    }
  }

  Future<void> _searchPharmacyMedicine(int index, String query) async {
    if (query.trim().length < 2) {
      setState(() {
        _searchResults[index] = [];
        _showSuggestions[index] = false;
      });
      return;
    }

    setState(() {
      _isSearching[index] = true;
      _showSuggestions[index] = true;
    });

    final results = await _apiService.searchPharmacyInventory(query);

    if (!mounted) return;
    setState(() {
      _searchResults[index] = results;
      _isSearching[index] = false;
    });
  }

  void _selectPharmacyMedicine(int index, Map<String, dynamic> item) {
    final name = item['name']?.toString() ?? '';
    final strength = item['strength']?.toString() ?? '';
    final unit = item['unit']?.toString() ?? 'tablet';

    setState(() {
      _medications[index]['name'] = name;
      _medications[index]['strength'] = strength;
      if (unit.toLowerCase().contains('capsule')) {
        _medications[index]['dosage'] = '1 capsule';
      } else if (unit.toLowerCase().contains('syrup') || unit.toLowerCase().contains('ml')) {
        _medications[index]['dosage'] = '5 ml syrup';
      } else if (unit.toLowerCase().contains('injection')) {
        _medications[index]['dosage'] = '1 injection';
      } else {
        _medications[index]['dosage'] = '1 tablet';
      }
      _showSuggestions[index] = false;
    });
  }

  void _addCustomLabTest() {
    final text = _customLabTestController.text.trim();
    if (text.isNotEmpty && !_selectedLabTests.contains(text)) {
      setState(() {
        _selectedLabTests.add(text);
        _customLabTestController.clear();
      });
    }
  }

  void _addCustomRadiologyTest() {
    final text = _customRadiologyTestController.text.trim();
    if (text.isNotEmpty && !_selectedRadiologyTests.contains(text)) {
      setState(() {
        _selectedRadiologyTests.add(text);
        _customRadiologyTestController.clear();
      });
    }
  }

  Future<void> _handleSubmitConsultation() async {
    final primaryDiag = _diagnosisController.text.trim();
    if (primaryDiag.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Primary Diagnosis is required before completing consultation.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      _tabController.animateTo(1); // Switch to Diagnosis Tab
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final appt = widget.appointment;
    String apptId = '';
    if (appt['appointment'] != null) {
      if (appt['appointment'] is Map) {
        apptId = appt['appointment']['_id']?.toString() ?? appt['appointment']['id']?.toString() ?? '';
      } else if (appt['appointment'] is String) {
        apptId = appt['appointment'].toString();
      }
    }
    if (apptId.isEmpty) {
      apptId = appt['_id']?.toString() ?? appt['id']?.toString() ?? '';
    }

    final vitalsData = {
      'bp': _bpController.text.trim(),
      'pulse': _pulseController.text.trim(),
      'temp': _tempController.text.trim(),
      'spo2': _spo2Controller.text.trim(),
      'respRate': _respRateController.text.trim(),
      'weight': _weightController.text.trim(),
    };

    final validMeds = _medications
        .where((m) => (m['name']?.toString().trim() ?? '').isNotEmpty)
        .toList();

    try {
      // 1. Submit IP Admission Recommendation if toggled
      if (_recommendIp) {
        await _apiService.recommendAdmission(
          appointmentId: apptId,
          primaryDiagnosis: _ipDiagnosisController.text.trim().isNotEmpty
              ? _ipDiagnosisController.text.trim()
              : primaryDiag,
          priority: _ipPriority,
          preferredWard: _preferredWard,
          preferredBedType: _preferredBedType,
          expectedStay: _expectedStay,
          clinicalNotes: _ipNotesController.text.trim().isNotEmpty
              ? _ipNotesController.text.trim()
              : _clinicalNotesController.text.trim(),
          admissionReason: _ipReasonController.text.trim(),
          specialInstructions: _ipInstructionsController.text.trim(),
        );
      }

      // 2. Submit Complete Consultation
      final res = await _apiService.completeConsultation(
        appointmentId: apptId,
        diagnosis: primaryDiag,
        clinicalNotes: _clinicalNotesController.text.trim(),
        chiefComplaint: _chiefComplaintsController.text.trim(),
        symptoms: _symptomsController.text.trim(),
        advice: _adviceController.text.trim(),
        vitals: vitalsData,
        medicines: validMeds,
        labTests: _selectedLabTests,
        radiologyTests: _selectedRadiologyTests,
        recommendIp: _recommendIp,
        ipRecommendation: _recommendIp
            ? {
                'primaryDiagnosis': primaryDiag,
                'priority': _ipPriority,
                'preferredWard': _preferredWard,
                'preferredBedType': _preferredBedType,
                'expectedStay': _expectedStay,
                'clinicalNotes': _ipNotesController.text.trim(),
                'specialInstructions': _ipInstructionsController.text.trim(),
              }
            : {},
      );

      if (!mounted) return;

      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Consultation completed successfully! Data synced live to web application.'),
            backgroundColor: AppColors.emerald600,
          ),
        );
        widget.onCompleted();
        Navigator.pop(context);
      } else {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Failed to complete consultation. Please retry.'),
            backgroundColor: AppColors.errorRed,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
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
    final phone = patient['phone']?.toString() ?? '';

    return Container(
      height: MediaQuery.of(context).size.height * 0.94,
      decoration: const BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header Card
          _buildPatientHeader(patientName, uhid, gender, age, phone),

          // Tab Bar Navigation
          Container(
            color: AppColors.white,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppColors.navy800,
              unselectedLabelColor: AppColors.slate500,
              indicatorColor: AppColors.navy800,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              tabs: const [
                Tab(icon: Icon(Icons.monitor_heart_outlined, size: 18), text: '1. Vitals'),
                Tab(icon: Icon(Icons.medical_information_outlined, size: 18), text: '2. Diagnosis'),
                Tab(icon: Icon(Icons.description_outlined, size: 18), text: '3. Prescription'),
                Tab(icon: Icon(Icons.science_outlined, size: 18), text: '4. Investigations'),
                Tab(icon: Icon(Icons.local_hospital_outlined, size: 18), text: '5. IP Admission'),
                Tab(icon: Icon(Icons.history_outlined, size: 18), text: '6. History'),
              ],
            ),
          ),

          // Tab View Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildVitalsTab(),
                _buildDiagnosisTab(),
                _buildPrescriptionTab(),
                _buildInvestigationsTab(),
                _buildIpAdmissionTab(),
                _buildHistoryTab(),
              ],
            ),
          ),

          // Sticky Bottom Action Bar
          _buildStickyFooterBar(),
        ],
      ),
    );
  }

  Widget _buildPatientHeader(String name, String uhid, String gender, String age, String phone) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: const BoxDecoration(
        color: AppColors.navy800,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.navy100,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'P',
              style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      name,
                      style: const TextStyle(color: AppColors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.emerald600.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        (widget.appointment['status']?.toString().toLowerCase() == 'completed' || widget.appointment['status']?.toString().toLowerCase() == 'consulted')
                            ? 'COMPLETED RECORD'
                            : (_isLoadingDraft ? 'LOADING DRAFT...' : 'OP CONSULTATION'),
                        style: const TextStyle(color: AppColors.emerald50, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '$uhid • $gender, $age yrs ${phone.isNotEmpty ? '• Ph: $phone' : ''}',
                  style: const TextStyle(color: AppColors.slate300, fontSize: 11.5),
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
    );
  }

  // --- TAB 1: VITALS ---
  Widget _buildVitalsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.monitor_heart, color: AppColors.navy700, size: 20),
                  SizedBox(width: 8),
                  Text('Patient Vitals & Biometrics', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _buildVitalBox('BP (mmHg)', _bpController, '120/80', Icons.favorite_outline)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildVitalBox('Pulse (bpm)', _pulseController, '72', Icons.speed)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildVitalBox('Temp (°F)', _tempController, '98.6', Icons.thermostat_outlined)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildVitalBox('SpO2 (%)', _spo2Controller, '98', Icons.air)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildVitalBox('Resp Rate (/min)', _respRateController, '16', Icons.waves)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildVitalBox('Weight (kg)', _weightController, '68', Icons.scale_outlined)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVitalBox(String label, TextEditingController controller, String hint, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.navy50.withOpacity(0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.navy100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: AppColors.navy700),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate700)),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            controller: controller,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy900),
            decoration: InputDecoration(
              isDense: true,
              hintText: hint,
              hintStyle: const TextStyle(color: AppColors.slate400, fontSize: 12, fontWeight: FontWeight.normal),
              fillColor: AppColors.white,
              filled: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: AppColors.slate300)),
            ),
          ),
        ],
      ),
    );
  }

  // --- TAB 2: DIAGNOSIS ---
  Widget _buildDiagnosisTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.medical_information, color: AppColors.navy700, size: 20),
                  SizedBox(width: 8),
                  Text('Clinical Evaluation & Notes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _diagnosisController,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                decoration: InputDecoration(
                  labelText: 'Primary Diagnosis *',
                  hintText: 'e.g. Essential Hypertension / Type-2 Diabetes',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  prefixIcon: Icon(Icons.stars, color: Colors.amber.shade600),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _chiefComplaintsController,
                maxLines: 2,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Chief Complaints / Reason for Visit',
                  hintText: 'e.g. Fever for 3 days, dry cough, weakness...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  prefixIcon: const Icon(Icons.format_quote, color: AppColors.navy600),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _symptomsController,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Associated Symptoms',
                  hintText: 'e.g. Headache, Nausea, Fatigue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  prefixIcon: const Icon(Icons.healing, color: AppColors.emerald600),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _clinicalNotesController,
                maxLines: 3,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Detailed Examination & Clinical Notes',
                  hintText: 'Chest clear, S1 S2 normal, abdomen soft non-tender...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _adviceController,
                maxLines: 2,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Doctor Advice & General Instructions',
                  hintText: 'Take plenty of fluids, rest for 3 days, avoid cold drinks',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- TAB 3: PRESCRIPTION WITH PHARMACY AUTOCOMPLETE ---
  Widget _buildPrescriptionTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.description, color: AppColors.navy700, size: 20),
                  SizedBox(width: 8),
                  Text('Prescription (Rx)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: _addMedicationRow,
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: const Text('Add Drug', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _medications.length,
            itemBuilder: (context, index) {
              return _buildMedicationItemCard(index);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMedicationItemCard(int index) {
    final med = _medications[index];
    final showSuggs = _showSuggestions[index] ?? false;
    final results = _searchResults[index] ?? [];
    final isSearching = _isSearching[index] ?? false;

    final defaultDosages = ['1 tablet', '2 tablets', '1 capsule', '5 ml syrup', '10 ml syrup', '1 injection', 'Apply Topically'];
    final currentDosage = med['dosage']?.toString() ?? '1 tablet';
    final dosageItems = <String>{...defaultDosages, if (currentDosage.isNotEmpty) currentDosage}.toList();

    final defaultFrequencies = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'Once Daily', 'As Needed (PRN)'];
    final currentFreq = med['frequency']?.toString() ?? '1-0-1';
    final freqItems = <String>{...defaultFrequencies, if (currentFreq.isNotEmpty) currentFreq}.toList();

    final defaultDurations = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
    final currentDuration = med['duration']?.toString() ?? '5 days';
    final durationItems = <String>{...defaultDurations, if (currentDuration.isNotEmpty) currentDuration}.toList();

    final defaultInstructions = ['After food', 'Before food', 'With milk', 'At bedtime'];
    final currentInstructions = med['instructions']?.toString() ?? 'After food';
    final instructionItems = <String>{...defaultInstructions, if (currentInstructions.isNotEmpty) currentInstructions}.toList();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.slate200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: AppColors.navy100,
                  child: Text('${index + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    children: [
                      TextField(
                        controller: TextEditingController.fromValue(
                          TextEditingValue(
                            text: med['name'] ?? '',
                            selection: TextSelection.collapsed(offset: (med['name'] ?? '').length),
                          ),
                        ),
                        onChanged: (val) {
                          _medications[index]['name'] = val;
                          _searchPharmacyMedicine(index, val);
                        },
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy900),
                        decoration: InputDecoration(
                          hintText: 'Type Drug Name (e.g. Paracetamol, Amoxicillin)...',
                          isDense: true,
                          suffixIcon: isSearching
                              ? const SizedBox(width: 14, height: 14, child: Center(child: CircularProgressIndicator(strokeWidth: 2)))
                              : const Icon(Icons.search, size: 18, color: AppColors.slate400),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.errorRed, size: 20),
                  onPressed: () => _removeMedicationRow(index),
                ),
              ],
            ),

            // Pharmacy Autocomplete Overlay Suggestions
            if (showSuggs && results.isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 140),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.navy200),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  itemCount: results.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, rIdx) {
                    final res = results[rIdx];
                    final rName = res['name']?.toString() ?? '';
                    final rStrength = res['strength']?.toString() ?? '';
                    final rStock = res['stockQty']?.toString() ?? '0';

                    return ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      title: Row(
                        children: [
                          Text(rName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                          if (rStrength.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(4)),
                              child: Text(rStrength, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
                            ),
                          ],
                        ],
                      ),
                      subtitle: Text('Pharmacy Stock: $rStock units available', style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.slate400),
                      onTap: () => _selectPharmacyMedicine(index, res),
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 10),

            // Strength & Dosage Inputs
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: TextEditingController.fromValue(
                      TextEditingValue(
                        text: med['strength'] ?? '',
                        selection: TextSelection.collapsed(offset: (med['strength'] ?? '').length),
                      ),
                    ),
                    onChanged: (val) => _medications[index]['strength'] = val,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      labelText: 'Power / Strength',
                      hintText: 'e.g. 500mg',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String>(
                    value: dosageItems.contains(currentDosage) ? currentDosage : dosageItems.first,
                    decoration: InputDecoration(
                      labelText: 'Dosage Form',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate900),
                    items: dosageItems
                        .map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 11))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _medications[index]['dosage'] = val);
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Frequency, Duration, Instructions
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: freqItems.contains(currentFreq) ? currentFreq : freqItems.first,
                    decoration: InputDecoration(
                      labelText: 'Frequency',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate900),
                    items: freqItems
                        .map((f) => DropdownMenuItem(value: f, child: Text(f, style: const TextStyle(fontSize: 10.5))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _medications[index]['frequency'] = val);
                    },
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: durationItems.contains(currentDuration) ? currentDuration : durationItems.first,
                    decoration: InputDecoration(
                      labelText: 'Duration',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate900),
                    items: durationItems
                        .map((du) => DropdownMenuItem(value: du, child: Text(du, style: const TextStyle(fontSize: 10.5))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _medications[index]['duration'] = val);
                    },
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: instructionItems.contains(currentInstructions) ? currentInstructions : instructionItems.first,
                    decoration: InputDecoration(
                      labelText: 'Timing',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate900),
                    items: instructionItems
                        .map((ins) => DropdownMenuItem(value: ins, child: Text(ins, style: const TextStyle(fontSize: 10.5))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _medications[index]['instructions'] = val);
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- TAB 4: SEPARATE LABORATORY AND RADIOLOGY TESTS ---
  Widget _buildInvestigationsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section 4A: Laboratory Investigations
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.science, color: AppColors.navy700, size: 20),
                      SizedBox(width: 8),
                      Text('Laboratory Investigations (Pathology)', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: _defaultLabTests.map((test) {
                      final isSelected = _selectedLabTests.contains(test);
                      return FilterChip(
                        label: Text(test, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSelected ? AppColors.white : AppColors.slate800)),
                        selected: isSelected,
                        selectedColor: AppColors.navy800,
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
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _customLabTestController,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Add custom lab test (e.g. D-Dimer, Serum Ferritin)...',
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _addCustomLabTest,
                        child: const Text('Add Test', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Section 4B: Radiology Investigations
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.camera_alt, color: AppColors.emerald700, size: 20),
                      SizedBox(width: 8),
                      Text('Radiology & Imaging Investigations', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: _defaultRadiologyTests.map((test) {
                      final isSelected = _selectedRadiologyTests.contains(test);
                      return FilterChip(
                        label: Text(test, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isSelected ? AppColors.white : AppColors.slate800)),
                        selected: isSelected,
                        selectedColor: AppColors.emerald600,
                        backgroundColor: AppColors.slate100,
                        checkmarkColor: AppColors.white,
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              _selectedRadiologyTests.add(test);
                            } else {
                              _selectedRadiologyTests.remove(test);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _customRadiologyTestController,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            hintText: 'Add custom radiology order (e.g. HRCT Chest, PET Scan)...',
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _addCustomRadiologyTest,
                        child: const Text('Add Scan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- TAB 5: COMPREHENSIVE IP ADMISSION RECOMMENDATION ---
  Widget _buildIpAdmissionTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _recommendIp ? AppColors.errorBg : AppColors.slate100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _recommendIp ? AppColors.errorBorder : AppColors.slate300),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Recommend Inpatient (IP) Admission',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy900),
                    ),
                    subtitle: const Text(
                      'Triggers official IP admission request to Receptionist & Inpatient Desk',
                      style: TextStyle(fontSize: 11, color: AppColors.slate600),
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
              ),

              if (_recommendIp) ...[
                const SizedBox(height: 16),
                const Text('IP ADMISSION RECOMMENDATION FORM', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy800, letterSpacing: 0.5)),
                const SizedBox(height: 12),

                // Primary Admission Diagnosis
                TextField(
                  controller: _ipDiagnosisController,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    labelText: 'Primary Admission Diagnosis *',
                    hintText: 'e.g. Acute Appendicitis / Severe Pneumonia',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),

                const SizedBox(height: 12),

                // Priority & Expected Stay
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _ipPriority,
                        decoration: InputDecoration(
                          labelText: 'Priority Level',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        items: _priorityLevels
                            .map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _ipPriority = val);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _expectedStay,
                        decoration: InputDecoration(
                          labelText: 'Expected Stay',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        items: _expectedStayOptions
                            .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _expectedStay = val);
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Preferred Ward & Bed Type
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _wardCategories.contains(_preferredWard) ? _preferredWard : (_wardCategories.isNotEmpty ? _wardCategories.first : null),
                        decoration: InputDecoration(
                          labelText: _isLoadingWardsAndBeds ? 'Loading Wards...' : 'Preferred Ward',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        items: _wardCategories
                            .map((w) => DropdownMenuItem(value: w, child: Text(w, style: const TextStyle(fontSize: 11.5))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _preferredWard = val);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _bedTypes.contains(_preferredBedType) ? _preferredBedType : (_bedTypes.isNotEmpty ? _bedTypes.first : null),
                        decoration: InputDecoration(
                          labelText: _isLoadingWardsAndBeds ? 'Loading Beds...' : 'Preferred Bed Type',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        items: _bedTypes
                            .map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 11.5))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _preferredBedType = val);
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Clinical Reason for Admission
                TextField(
                  controller: _ipReasonController,
                  maxLines: 2,
                  style: const TextStyle(fontSize: 12.5),
                  decoration: InputDecoration(
                    labelText: 'Clinical Reason for IP Admission',
                    hintText: 'e.g. Requires IV Antibiotics, Continuous Monitoring & Surgical Evaluation...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),

                const SizedBox(height: 12),

                // Special Nursing & Care Instructions
                TextField(
                  controller: _ipInstructionsController,
                  maxLines: 2,
                  style: const TextStyle(fontSize: 12.5),
                  decoration: InputDecoration(
                    labelText: 'Special Nursing / Care Instructions',
                    hintText: 'e.g. Strict Bed Rest, NPO after 12 AM, Monitor Vital Signs q2h...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // --- STICKY FOOTER ACTION BAR ---
  Widget _buildStickyFooterBar() {
    final medCount = _medications.where((m) => (m['name']?.toString().trim() ?? '').isNotEmpty).length;
    final totalLabs = _selectedLabTests.length;
    final totalRads = _selectedRadiologyTests.length;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        color: AppColors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                child: Text('$medCount Rx Drugs', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                child: Text('${totalLabs + totalRads} Orders', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
              ),
              if (_recommendIp) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.errorBg, borderRadius: BorderRadius.circular(6)),
                  child: const Text('IP RECD', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          if (widget.appointment['status']?.toString().toLowerCase() == 'completed' || widget.appointment['status']?.toString().toLowerCase() == 'consulted')
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.check_circle_rounded, color: AppColors.white, size: 20),
              label: const Text(
                'Consultation Completed (Close Record)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.emerald600,
                minimumSize: const Size(double.infinity, 46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            )
          else
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _handleSubmitConsultation,
              icon: _isSubmitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline, color: AppColors.white, size: 20),
              label: Text(
                _isSubmitting ? 'Finalizing Consultation...' : 'Complete Consultation & Issue Rx',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy800,
                minimumSize: const Size(double.infinity, 46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
        ],
      ),
    );
  }

  // --- HISTORY TAB UI ---
  Widget _buildHistoryTab() {
    if (_isLoadingHistory) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.navy800),
            SizedBox(height: 12),
            Text('Loading patient clinical history...', style: TextStyle(color: AppColors.slate600, fontSize: 13)),
          ],
        ),
      );
    }

    if (_patientHistoryData == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.history_toggle_off_outlined, size: 48, color: AppColors.slate400),
            const SizedBox(height: 12),
            const Text('No clinical history records found for this patient.', style: TextStyle(color: AppColors.slate600, fontSize: 13)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _fetchDraftSessionAndHistory,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry Loading History'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy800, foregroundColor: AppColors.white),
            ),
          ],
        ),
      );
    }

    final patientInfo = _patientHistoryData!['patient'] as Map<String, dynamic>? ?? {};
    final medicalHistoryList = List<Map<String, dynamic>>.from(
      (patientInfo['medicalHistory'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
    );
    final prescriptions = List<Map<String, dynamic>>.from(
      (_patientHistoryData!['prescriptions'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
    );
    final appointments = List<Map<String, dynamic>>.from(
      (_patientHistoryData!['appointments'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
    );
    final labOrders = List<Map<String, dynamic>>.from(
      (_patientHistoryData!['labOrders'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
    );
    final radiologyOrders = List<Map<String, dynamic>>.from(
      (_patientHistoryData!['radiologyOrders'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Patient Header Summary
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.slate200),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 2))],
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.navy50,
                  child: Icon(Icons.person, color: AppColors.navy800, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        patientInfo['name']?.toString() ?? 'Patient History',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.navy800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'UHID: ${patientInfo['uhid'] ?? 'N/A'} • Blood: ${patientInfo['bloodGroup'] ?? 'N/A'} • Allergies: ${patientInfo['allergies'] ?? 'None Reported'}',
                        style: const TextStyle(fontSize: 11, color: AppColors.slate600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Section 1: Previous Prescriptions & Diagnosis
          const Text('Previous Prescriptions & Diagnosis', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy800)),
          const SizedBox(height: 8),

          if (prescriptions.isEmpty)
            _buildEmptyCard('No previous prescriptions recorded.')
          else
            ...prescriptions.take(5).map((rx) => _buildPrescriptionHistoryCard(rx)),

          const SizedBox(height: 16),

          // Section 2: Past Consultations
          const Text('Past Consultations History', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy800)),
          const SizedBox(height: 8),

          if (appointments.isEmpty)
            _buildEmptyCard('No past consultations found.')
          else
            ...appointments.take(5).map((appt) => _buildConsultationHistoryCard(appt)),

          const SizedBox(height: 16),

          // Section 3: Investigations & Pathology
          const Text('Past Pathology & Radiology Orders', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy800)),
          const SizedBox(height: 8),

          if (labOrders.isEmpty && radiologyOrders.isEmpty)
            _buildEmptyCard('No past lab or radiology orders found.')
          else ...[
            ...labOrders.take(3).map((lab) => _buildLabOrderCard(lab)),
            ...radiologyOrders.take(3).map((rad) => _buildRadiologyOrderCard(rad)),
          ],

          const SizedBox(height: 16),

          // Section 4: Global Medical Timeline
          if (medicalHistoryList.isNotEmpty) ...[
            const Text('Patient Medical History Timeline', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.navy800)),
            const SizedBox(height: 8),
            ...medicalHistoryList.take(8).map((item) => _buildTimelineCard(item)),
          ],
        ],
      ),
    );
  }

  Widget _buildPrescriptionHistoryCard(Map<String, dynamic> rx) {
    final rxNum = rx['prescriptionNumber']?.toString() ?? 'RX-RECORD';
    final dateStr = rx['createdAt'] != null ? rx['createdAt'].toString().substring(0, 10) : 'Recent';
    final diagnosis = rx['diagnosis']?.toString() ?? 'General Visit';
    final meds = List<Map<String, dynamic>>.from(
      (rx['medicines'] as List? ?? rx['medications'] as List? ?? []).map((m) => Map<String, dynamic>.from(m)),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(rxNum, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.navy800)),
                Text(dateStr, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              ],
            ),
            const SizedBox(height: 4),
            Text('Diagnosis: $diagnosis', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.emerald700)),
            if (meds.isNotEmpty) ...[
              const Divider(height: 12, thickness: 0.5),
              ...meds.map((m) {
                final name = m['name'] ?? m['drugName'] ?? 'Medicine';
                final strength = m['strength'] ?? '';
                final dosage = m['dosage'] ?? '1 tab';
                final freq = m['frequency'] ?? '1-0-1';
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      const Icon(Icons.medication_outlined, size: 14, color: AppColors.navy600),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '$name ${strength.isNotEmpty ? "($strength)" : ""} • $dosage • $freq',
                          style: const TextStyle(fontSize: 11, color: AppColors.slate800),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildConsultationHistoryCard(Map<String, dynamic> appt) {
    final dateStr = appt['date'] != null ? appt['date'].toString().substring(0, 10) : 'Recent';
    final diagnosis = appt['diagnosis']?.toString() ?? 'OP Visit';
    final complaint = appt['chiefComplaint']?.toString() ?? appt['notes']?.toString() ?? 'None';
    final notes = appt['clinicalNotes']?.toString() ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('OPD Consultation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.navy800)),
                Text(dateStr, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              ],
            ),
            const SizedBox(height: 4),
            Text('Diagnosis: $diagnosis', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
            const SizedBox(height: 2),
            Text('Chief Complaint: $complaint', style: const TextStyle(fontSize: 11, color: AppColors.slate700)),
            if (notes.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text('Notes: $notes', style: const TextStyle(fontSize: 11, color: AppColors.slate600, fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLabOrderCard(Map<String, dynamic> lab) {
    final tests = List<String>.from((lab['tests'] as List? ?? []).map((t) => t.toString()));
    final status = lab['status']?.toString() ?? 'Pending';
    final dateStr = lab['date'] != null ? lab['date'].toString().substring(0, 10) : 'Recent';

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: const CircleAvatar(radius: 14, backgroundColor: AppColors.navy50, child: Icon(Icons.science_outlined, size: 14, color: AppColors.navy800)),
        title: Text(tests.isNotEmpty ? tests.join(', ') : 'Lab Order', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        subtitle: Text('Status: $status • Date: $dateStr', style: const TextStyle(fontSize: 10.5, color: AppColors.slate600)),
      ),
    );
  }

  Widget _buildRadiologyOrderCard(Map<String, dynamic> rad) {
    final type = rad['type']?.toString() ?? 'Radiology Scan';
    final status = rad['status']?.toString() ?? 'Pending';
    final dateStr = rad['date'] != null ? rad['date'].toString().substring(0, 10) : 'Recent';

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: const CircleAvatar(radius: 14, backgroundColor: AppColors.emerald50, child: Icon(Icons.biotech_outlined, size: 14, color: AppColors.emerald700)),
        title: Text(type, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        subtitle: Text('Status: $status • Date: $dateStr', style: const TextStyle(fontSize: 10.5, color: AppColors.slate600)),
      ),
    );
  }

  Widget _buildTimelineCard(Map<String, dynamic> item) {
    final visitType = item['visitType']?.toString() ?? 'Clinical Event';
    final docName = item['doctorName']?.toString() ?? 'Doctor';
    final diag = item['diagnosis']?.toString() ?? 'General Visit';
    final notes = item['notes']?.toString() ?? '';
    final dateStr = item['date'] != null ? item['date'].toString().substring(0, 10) : 'Recent';

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: const BorderSide(color: AppColors.slate200)),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            const Icon(Icons.event_note_outlined, size: 18, color: AppColors.navy700),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(visitType, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                      Text(dateStr, style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                    ],
                  ),
                  Text('Dr. $docName • Diagnosis: $diag', style: const TextStyle(fontSize: 11, color: AppColors.slate700)),
                  if (notes.isNotEmpty) Text(notes, style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCard(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(8)),
      child: Text(message, style: const TextStyle(fontSize: 11.5, color: AppColors.slate600, fontStyle: FontStyle.italic)),
    );
  }
}
