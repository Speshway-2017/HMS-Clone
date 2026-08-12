import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../services/patient_api_service.dart';

class PatientDashboard extends StatefulWidget {
  const PatientDashboard({super.key});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  int _currentIndex = 0;
  final List<int> _navigationHistory = [0];
  bool _isLoading = true;

  final PatientApiService _apiService = PatientApiService();

  // Dynamic Data from Web Backend Database
  Map<String, dynamic>? _patientProfile;
  List<Map<String, dynamic>> _appointments = [];
  List<Map<String, dynamic>> _prescriptions = [];
  List<Map<String, dynamic>> _reports = [];
  List<Map<String, dynamic>> _medicalHistory = [];
  List<Map<String, dynamic>> _availableDoctors = [];

  // Book Appointment Selection State
  String _selectedBookingDepartment = 'All';
  Map<String, dynamic>? _selectedBookingDoctor;
  DateTime _selectedBookingDate = DateTime.now().add(const Duration(days: 1));
  String _selectedBookingTime = '10:00 AM';
  String _selectedBookingType = 'In-Person OP Visit';
  final TextEditingController _bookingReasonController = TextEditingController();
  bool _isBookingSubmitting = false;

  // Medical Records / History Filter State
  String _selectedHistoryFilter = 'All History Logs';
  final TextEditingController _historySearchController = TextEditingController();

  final List<String> _departmentFilterList = [
    'All',
    'Cardiology',
    'Neurology',
    'General Medicine',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Surgery'
  ];

  final List<String> _availableTimeSlots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM'
  ];

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final profile = await _apiService.fetchPatientProfile();
      final appts = await _apiService.fetchAppointments();
      final rxs = await _apiService.fetchPrescriptions();
      final reports = await _apiService.fetchDiagnosticReports();
      final docs = await _apiService.fetchDoctors();

      List<Map<String, dynamic>> history = [];
      if (profile != null && profile['medicalHistory'] is List) {
        history = (profile['medicalHistory'] as List)
            .map((item) => item as Map<String, dynamic>)
            .toList();
      }

      if (mounted) {
        setState(() {
          _patientProfile = profile;
          _appointments = appts;
          _prescriptions = rxs;
          _reports = reports;
          _availableDoctors = docs;
          _medicalHistory = history;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _switchTab(int newIndex) {
    if (_currentIndex != newIndex) {
      setState(() {
        _navigationHistory.add(newIndex);
        _currentIndex = newIndex;
      });
    }
  }

  void _goBack() {
    if (_navigationHistory.length > 1) {
      setState(() {
        _navigationHistory.removeLast();
        _currentIndex = _navigationHistory.last;
      });
    } else if (_currentIndex != 0) {
      setState(() {
        _currentIndex = 0;
        _navigationHistory.clear();
        _navigationHistory.add(0);
      });
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.logout_rounded, color: Colors.redAccent),
              SizedBox(width: 10),
              Text(
                'Log Out',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
            ],
          ),
          content: const Text(
            'Are you sure you want to log out of your Patient Portal session?',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Log Out', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );

    if (confirm == true && mounted) {
      await UserSession.clear();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (route) => false);
    }
  }

  Map<String, dynamic>? get _nextAppointment {
    if (_appointments.isEmpty) return null;
    for (var appt in _appointments) {
      final status = (appt['status'] ?? '').toString().toLowerCase();
      if (status != 'cancelled' && status != 'completed') {
        return appt;
      }
    }
    return _appointments.first;
  }

  List<Map<String, dynamic>> get _upcomingAppointments {
    if (_appointments.isEmpty) return [];
    return _appointments.where((appt) {
      final status = (appt['status'] ?? '').toString().toLowerCase();
      return status != 'cancelled' && status != 'completed' && status != 'missed';
    }).toList();
  }

  void _showUpcomingAppointmentsModal(BuildContext context) {
    final upcomingList = _upcomingAppointments;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.82,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag Handle Bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Modal Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF2563EB), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Upcoming Appointments',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            '${upcomingList.length} Active Booking${upcomingList.length == 1 ? '' : 's'} Scheduled',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),

              // Modal Content List
              Expanded(
                child: upcomingList.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.event_available_rounded, size: 48, color: Color(0xFF94A3B8)),
                              const SizedBox(height: 12),
                              const Text(
                                'No Upcoming Appointments',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'You do not have any active appointments scheduled.',
                                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _switchTab(2);
                                },
                                child: const Text('Book New Appointment'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: upcomingList.length,
                        itemBuilder: (context, index) {
                          final appt = upcomingList[index];
                          String docName = _parseNameString(appt['doctor'], appt['doctorName']?.toString() ?? 'Specialist Doctor');
                          if (!docName.startsWith('Dr.') && !docName.startsWith('dr.')) {
                            docName = 'Dr. $docName';
                          }

                          final deptName = _parseNameString(appt['department'], appt['type']?.toString() ?? 'General Medicine');
                          final refId = appt['referenceId']?.toString() ?? 'APT-${index + 1}';
                          final dateStr = appt['date'] != null ? appt['date'].toString().split('T')[0] : 'Scheduled';
                          final timeStr = appt['time']?.toString() ?? 'N/A';
                          final rawType = (appt['type'] ?? appt['bookingType'] ?? '').toString();
                          final meetingLink = (appt['meetingLink'] ?? appt['googleMeetLink'] ?? appt['link'] ?? '').toString().trim();

                          final isVideo = rawType.toLowerCase().contains('video') ||
                              rawType.toLowerCase().contains('online') ||
                              meetingLink.isNotEmpty;
                          final hasLink = meetingLink.isNotEmpty &&
                              (meetingLink.startsWith('http://') || meetingLink.startsWith('https://'));

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top Reference Bar
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        refId,
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isVideo ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        isVideo ? 'Video Consultation' : 'In-Person OP Visit',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isVideo ? const Color(0xFF2563EB) : const Color(0xFF166534),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),

                                // Doctor Details
                                Text(
                                  docName,
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$deptName • $_hospitalName',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                ),
                                const SizedBox(height: 10),

                                // Date & Time Bar
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.calendar_today_rounded, size: 14, color: Color(0xFF2563EB)),
                                      const SizedBox(width: 6),
                                      Text(dateStr, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                                      const Spacer(),
                                      const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF2563EB)),
                                      const SizedBox(width: 6),
                                      Text(timeStr, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // Action Button Logic
                                if (isVideo)
                                  SizedBox(
                                    width: double.infinity,
                                    height: 40,
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: hasLink ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      onPressed: () async {
                                        if (hasLink) {
                                          final uri = Uri.parse(meetingLink);
                                          if (await canLaunchUrl(uri)) {
                                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                                          }
                                        } else {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Meeting link pending from doctor.'),
                                              backgroundColor: Colors.orangeAccent,
                                            ),
                                          );
                                        }
                                      },
                                      icon: const Icon(Icons.videocam_rounded, size: 16),
                                      label: Text(
                                        hasLink ? 'Join Video Consultation' : 'Waiting for Doctor\'s Meeting Link...',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        'In-Person Visit • Report to OPD Desk',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  String get _patientDisplayName {
    return _patientProfile?['name'] ?? UserSession.userName;
  }

  String get _patientUhid {
    return _patientProfile?['uhid'] ?? UserSession.patientUhid;
  }

  String get _hospitalName {
    final hosp = _patientProfile?['hospital'];
    if (hosp is Map && hosp['name'] != null) {
      return hosp['name'].toString();
    }
    return 'Sunrise Hospital';
  }

  String? get _patientPhotoUrl {
    final photo = _patientProfile?['photoUrl'] ?? _patientProfile?['avatarUrl'] ?? UserSession.user?['avatarUrl'] ?? UserSession.patient?['photoUrl'];
    if (photo is String && photo.trim().isNotEmpty) {
      return photo.trim();
    }
    return null;
  }

  String _parseNameString(dynamic val, [String fallback = 'General']) {
    if (val == null) return fallback;
    if (val is Map) {
      if (val['name'] != null && val['name'].toString().trim().isNotEmpty) {
        return val['name'].toString().trim();
      }
      if (val['departmentName'] != null && val['departmentName'].toString().trim().isNotEmpty) {
        return val['departmentName'].toString().trim();
      }
      if (val['specialty'] != null && val['specialty'].toString().trim().isNotEmpty) {
        return val['specialty'].toString().trim();
      }
      return fallback;
    }
    final str = val.toString().trim();
    if (str.isEmpty || str.startsWith('{')) return fallback;
    return str;
  }

  /// Helper to check if patient booking is within OP limit (7 days from previous visit)
  bool _isWithinOpLimit(String? doctorId, DateTime targetDate) {
    if (_appointments.isEmpty) return false;

    return _appointments.any((appt) {
      final apptDoc = appt['doctor'];
      final apptDocId = (apptDoc is Map ? apptDoc['_id'] ?? apptDoc['id'] : apptDoc)?.toString();

      if (doctorId != null && doctorId.isNotEmpty && apptDocId != null && apptDocId.isNotEmpty) {
        if (apptDocId != doctorId) return false;
      }

      final status = (appt['status'] ?? '').toString().toLowerCase();
      if (status == 'cancelled' || status == 'no_show') return false;

      final dateRaw = appt['date'] ?? appt['createdAt'];
      if (dateRaw == null) return false;

      final apptDate = DateTime.tryParse(dateRaw.toString());
      if (apptDate == null) return false;

      final diff = targetDate.difference(apptDate).abs();
      return diff.inDays <= 7;
    });
  }

  /// Unified dataset combining Lab Reports, Prescriptions, Appointments, and History logs
  List<Map<String, dynamic>> get _combinedMedicalLogs {
    final List<Map<String, dynamic>> list = [];

    // 1. Lab Reports
    for (var r in _reports) {
      final title = r['title'] ?? r['testName'] ?? r['name'] ?? 'Diagnostic Lab Report';
      final rawDoc = r['doctorName'] ?? r['doctor'];
      final docName = _parseNameString(rawDoc, 'Dr. Akshaya');
      final formattedDoc = docName.startsWith('Dr.') || docName.startsWith('dr.') ? docName : 'Dr. $docName';

      list.add({
        'id': r['_id'] ?? r['id'],
        'category': 'Lab Reports',
        'typeLabel': 'DIAGNOSTIC LAB REPORT',
        'date': r['date']?.toString().split('T')[0] ?? r['createdAt']?.toString().split('T')[0] ?? '11 Aug 2026',
        'title': title,
        'doctor': formattedDoc,
        'subText': r['category'] ?? 'Laboratory',
        'fileUrl': r['fileUrl'] ?? r['pdfUrl'],
        'rawDate': DateTime.tryParse(r['date']?.toString() ?? r['createdAt']?.toString() ?? '') ?? DateTime.now(),
      });
    }

    // 2. Digital Prescriptions
    for (var rx in _prescriptions) {
      final docName = _parseNameString(rx['doctor'], 'Dr. Akshaya');
      final formattedDoc = docName.startsWith('Dr.') || docName.startsWith('dr.') ? docName : 'Dr. $docName';

      list.add({
        'id': rx['_id'] ?? rx['id'],
        'category': 'Prescriptions RX',
        'typeLabel': 'DIGITAL PRESCRIPTION',
        'date': rx['date']?.toString().split('T')[0] ?? rx['createdAt']?.toString().split('T')[0] ?? '10 Aug 2026',
        'title': rx['diagnosis'] ?? rx['title'] ?? 'General OPD Prescription',
        'doctor': formattedDoc,
        'subText': 'Pharmacy RX',
        'fileUrl': rx['fileUrl'],
        'rawDate': DateTime.tryParse(rx['date']?.toString() ?? rx['createdAt']?.toString() ?? '') ?? DateTime.now(),
      });
    }

    // 3. Appointments (Walk-In / Video)
    for (var appt in _appointments) {
      final isVideo = (appt['type'] ?? '').toString().toLowerCase().contains('video');
      final docName = _parseNameString(appt['doctor'], 'Dr. Shankar');
      final formattedDoc = docName.startsWith('Dr.') || docName.startsWith('dr.') ? docName : 'Dr. $docName';

      list.add({
        'id': appt['_id'] ?? appt['id'],
        'category': isVideo ? 'Video Consultations' : 'Walk-In OPD',
        'typeLabel': isVideo ? 'VIDEO CONSULTATION' : 'WALK-IN OPD CONSULTATION',
        'date': appt['date']?.toString().split('T')[0] ?? '09 Aug 2026',
        'title': appt['reason'] ?? appt['notes'] ?? '${_parseNameString(appt['department'], 'General Medicine')} Visit',
        'doctor': formattedDoc,
        'subText': _parseNameString(appt['department'], 'General Medicine'),
        'fileUrl': null,
        'rawDate': DateTime.tryParse(appt['date']?.toString() ?? '') ?? DateTime.now(),
      });
    }

    // 4. Medical History Entries
    for (var h in _medicalHistory) {
      final rawDoc = h['doctorName'] ?? h['doctor'];
      final docName = _parseNameString(rawDoc, 'Attending Physician');
      final formattedDoc = docName.startsWith('Dr.') || docName.startsWith('dr.') ? docName : 'Dr. $docName';

      list.add({
        'id': h['_id'] ?? h['id'],
        'category': 'All History Logs',
        'typeLabel': 'CLINICAL HISTORY ENTRY',
        'date': h['diagnosedDate']?.toString().split('T')[0] ?? h['date']?.toString().split('T')[0] ?? '08 Aug 2026',
        'title': h['condition'] ?? h['diagnosis'] ?? 'Medical Condition Entry',
        'doctor': formattedDoc,
        'subText': h['status'] ?? 'Active',
        'fileUrl': null,
        'rawDate': DateTime.tryParse(h['diagnosedDate']?.toString() ?? h['date']?.toString() ?? '') ?? DateTime.now(),
      });
    }

    // Sort descending by date
    list.sort((a, b) => (b['rawDate'] as DateTime).compareTo(a['rawDate'] as DateTime));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildPrescriptionsScreen(responsive),
      _buildBookAppointmentScreen(responsive),
      _buildRecordsScreen(responsive),
      _buildMedicalHistoryScreen(responsive),
    ];

    return PopScope(
      canPop: _currentIndex == 0 && _navigationHistory.length <= 1,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _goBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: _buildTopAppBar(),
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _loadAllData,
            color: const Color(0xFF2563EB),
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                  )
                : pages[_currentIndex],
          ),
        ),
        bottomNavigationBar: _buildFiveSectionBottomNavbar(),
      ),
    );
  }

  // --- APP BAR WITH BACK BUTTON & PROFILE/LOGOUT ACTIONS ---
  PreferredSizeWidget _buildTopAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFFF8FAFC),
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 12.0,
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Back Button if not on Home screen
          if (_currentIndex != 0) ...[
            Container(
              margin: const EdgeInsets.only(right: 8),
              decoration: const BoxDecoration(
                color: Color(0xFFEEF2FF),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.arrow_back_rounded,
                  color: Color(0xFF2563EB),
                  size: 20,
                ),
                tooltip: 'Back to previous section',
                onPressed: _goBack,
              ),
            ),
          ],

          // Tappable User Profile Avatar & Details Header
          Expanded(
            child: InkWell(
              onTap: () async {
                final updated = await Navigator.pushNamed(context, AppRoutes.patientProfile);
                if (updated == true && mounted) {
                  _loadAllData();
                }
              },
              borderRadius: BorderRadius.circular(25),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  children: [
                    Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.08),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 20,
                            backgroundColor: const Color(0xFFDCE7FE),
                            backgroundImage: _patientPhotoUrl != null
                                ? NetworkImage(_patientPhotoUrl!)
                                : null,
                            child: _patientPhotoUrl == null
                                ? const Icon(
                                    Icons.person_rounded,
                                    color: AppColors.navy700,
                                    size: 24,
                                  )
                                : null,
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Color(0xFF2563EB),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.edit_rounded,
                              color: Colors.white,
                              size: 9,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  _patientDisplayName,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.arrow_forward_ios_rounded,
                                size: 9,
                                color: Color(0xFF2563EB),
                              ),
                            ],
                          ),
                          Text(
                            '$_patientUhid • $_hospitalName',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Log Out Action Button
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: Color(0xFFFEF2F2),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(
                Icons.logout_rounded,
                color: Colors.redAccent,
                size: 20,
              ),
              tooltip: 'Log Out',
              onPressed: _handleLogout,
            ),
          ),
        ],
      ),
    );
  }

  // --- HOME SCREEN ---
  Widget _buildHomeScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. NEXT APPOINTMENT BLUE CARD
          _buildNextAppointmentCard(responsive),
          const SizedBox(height: 24),

          // 2. QUICK ACTIONS GRID
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'Quick Actions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildQuickActionsGrid(responsive),
          const SizedBox(height: 24),

          // 3. RECENT REPORTS SECTION
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Reports',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              GestureDetector(
                onTap: () {
                  _switchTab(3); // Switch to Records tab
                },
                child: const Text(
                  'See All',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildRecentReportsList(responsive),
          const SizedBox(height: 20),
        ],
      ),
    );
  }  // --- 1. NEXT APPOINTMENT HERO CARD ---
  Widget _buildNextAppointmentCard(ResponsiveHelper responsive) {
    final appt = _nextAppointment;

    String doctorName = 'Specialist Doctor';
    String department = 'OPD Consultation';
    String dateStr = 'No upcoming appointment';
    String timeStr = 'N/A';
    String meetingLink = '';
    String rawType = '';

    if (appt != null) {
      doctorName = _parseNameString(appt['doctor'], appt['doctorName']?.toString() ?? 'Specialist Doctor');
      if (!doctorName.startsWith('Dr.') && !doctorName.startsWith('dr.')) {
        doctorName = 'Dr. $doctorName';
      }

      department = _parseNameString(appt['department'], appt['type']?.toString() ?? 'General Medicine');

      if (appt['date'] != null) {
        dateStr = appt['date'].toString().split('T')[0];
      }
      if (appt['time'] != null) {
        timeStr = appt['time'].toString();
      }

      rawType = (appt['type'] ?? appt['bookingType'] ?? '').toString();
      meetingLink = (appt['meetingLink'] ?? appt['googleMeetLink'] ?? appt['link'] ?? '').toString().trim();
    }

    final isVideoConsultation = rawType.toLowerCase().contains('video') ||
        rawType.toLowerCase().contains('online') ||
        meetingLink.isNotEmpty;
    final hasMeetingLink = meetingLink.isNotEmpty &&
        (meetingLink.startsWith('http://') || meetingLink.startsWith('https://'));

    return GestureDetector(
      onTap: () => _showUpcomingAppointmentsModal(context),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20.0),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1D61E7), Color(0xFF0241BA)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        borderRadius: BorderRadius.circular(20.0),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1D61E7).withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Tag + Mode Icon
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isVideoConsultation ? 'VIDEO CONSULTATION' : 'IN-PERSON OP VISIT',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isVideoConsultation ? Icons.videocam_rounded : Icons.location_on_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Doctor Name & Specialty
          Text(
            doctorName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$department • $_hospitalName',
            style: TextStyle(
              color: Colors.white.withOpacity(0.85),
              fontSize: 13,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 16),

          // Date & Time Row
          Row(
            children: [
              const Icon(
                Icons.calendar_today_rounded,
                color: Colors.white,
                size: 14,
              ),
              const SizedBox(width: 6),
              Text(
                dateStr,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 12),
                height: 12,
                width: 1,
                color: Colors.white.withOpacity(0.5),
              ),
              const Icon(
                Icons.access_time_rounded,
                color: Colors.white,
                size: 14,
              ),
              const SizedBox(width: 6),
              Text(
                timeStr,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Bottom Consultation Action Section
          if (appt == null)
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0241BA),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
                onPressed: () => _switchTab(2),
                child: const Text(
                  'Book New Appointment',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
            )
          else if (!isVideoConsultation)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.business_rounded, color: Colors.white, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'In-Person OP Visit • Report directly to Hospital OPD Desk',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: hasMeetingLink ? Colors.white : Colors.white.withOpacity(0.4),
                  foregroundColor: hasMeetingLink ? const Color(0xFF0241BA) : Colors.white70,
                  elevation: hasMeetingLink ? 2 : 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
                onPressed: () async {
                  if (hasMeetingLink) {
                    final uri = Uri.parse(meetingLink);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } else {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Opening consultation link: $meetingLink'),
                        ),
                      );
                    }
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('The doctor has not added the Google Meet link yet. Please wait until consultation time.'),
                        backgroundColor: Colors.orangeAccent,
                        duration: Duration(seconds: 4),
                      ),
                    );
                  }
                },
                icon: Icon(
                  Icons.videocam_rounded,
                  color: hasMeetingLink ? const Color(0xFF0241BA) : Colors.white70,
                  size: 18,
                ),
                label: Text(
                  hasMeetingLink ? 'Join Video Consultation' : 'Waiting for Doctor\'s Meeting Link...',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: hasMeetingLink ? const Color(0xFF0241BA) : Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

  // --- 2. QUICK ACTIONS GRID ---
  Widget _buildQuickActionsGrid(ResponsiveHelper responsive) {
    final List<Map<String, dynamic>> actions = [
      {
        'title': 'Book\nAppointment',
        'icon': Icons.calendar_month_rounded,
        'bgColor': const Color(0xFFDBEFEF),
        'iconColor': const Color(0xFF2563EB),
        'tabIndex': 2,
      },
      {
        'title': 'Medical\nRecords',
        'icon': Icons.folder_rounded,
        'bgColor': const Color(0xFFD1FAE5),
        'iconColor': const Color(0xFF059669),
        'tabIndex': 3,
      },
      {
        'title': 'Prescriptions',
        'icon': Icons.assignment_rounded,
        'bgColor': const Color(0xFFDBE4F6),
        'iconColor': const Color(0xFF1E3A8A),
        'tabIndex': 1,
      },
      {
        'title': 'Lab Reports',
        'icon': Icons.biotech_rounded,
        'bgColor': const Color(0xFFFEE2E2),
        'iconColor': const Color(0xFFDC2626),
        'tabIndex': 3,
      },
      {
        'title': 'Insurance',
        'icon': Icons.verified_user_rounded,
        'bgColor': const Color(0xFFE2E8F0),
        'iconColor': const Color(0xFF475569),
        'tabIndex': 4,
      },
      {
        'title': 'Payments',
        'icon': Icons.account_balance_wallet_rounded,
        'bgColor': const Color(0xFFE0E7FF),
        'iconColor': const Color(0xFF4F46E5),
        'tabIndex': 0,
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: actions.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 12,
        childAspectRatio: 0.88,
      ),
      itemBuilder: (context, index) {
        final action = actions[index];
        return InkWell(
          onTap: () {
            final targetTab = action['tabIndex'] as int;
            _switchTab(targetTab);
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: action['bgColor'] as Color,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    action['icon'] as IconData,
                    color: action['iconColor'] as Color,
                    size: 22,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  action['title'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    height: 1.15,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- 3. RECENT REPORTS SECTION ---
  Widget _buildRecentReportsList(ResponsiveHelper responsive) {
    if (_reports.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Center(
          child: Text(
            'No diagnostic reports found in database.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ),
      );
    }

    return Column(
      children: _reports.take(3).map((report) {
        final title = report['title'] ?? report['testName'] ?? 'Lab Test Report';
        final lab = _parseNameString(report['department'] ?? report['lab'], 'Laboratory');
        final date = report['date'] ?? report['createdAt']?.toString().split('T')[0] ?? '';
        final status = (report['status'] ?? 'NORMAL').toString().toUpperCase();
        final isNormal = status == 'NORMAL' || status == 'COMPLETED';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.insert_drive_file_rounded,
                  color: Color(0xFF2563EB),
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title.toString(),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '$lab • $date',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isNormal ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: isNormal ? const Color(0xFF166534) : const Color(0xFF92400E),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF94A3B8),
                size: 20,
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // --- 5-SECTION BOTTOM NAVIGATION BAR WITH HIGHLIGHTED BOOK APPOINTMENT ---
  Widget _buildFiveSectionBottomNavbar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Container(
          height: 68,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(index: 0, icon: Icons.home_rounded, label: 'Home'),
              _buildNavItem(index: 1, icon: Icons.receipt_long_rounded, label: 'Prescriptions'),
              _buildHighlightedNavItem(),
              _buildNavItem(index: 3, icon: Icons.description_rounded, label: 'Records'),
              _buildNavItem(index: 4, icon: Icons.history_rounded, label: 'History'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          _switchTab(index);
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightedNavItem() {
    final isSelected = _currentIndex == 2;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _switchTab(2);
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: const Offset(0, -10),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.4),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(color: Colors.white, width: 3),
                ),
                child: const Icon(
                  Icons.calendar_month_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -6),
              child: Text(
                'Book Appt',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF1E293B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- PRESCRIPTIONS SCREEN ---
  Widget _buildPrescriptionsScreen(ResponsiveHelper responsive) {
    if (_prescriptions.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              children: [
                Icon(Icons.assignment_outlined, size: 48, color: Color(0xFF94A3B8)),
                SizedBox(height: 12),
                Text(
                  'No Prescriptions Found',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                SizedBox(height: 6),
                Text(
                  'Active medication slips generated by your doctor will appear here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.all(16.0),
      itemCount: _prescriptions.length,
      itemBuilder: (context, index) {
        final rx = _prescriptions[index];
        final rxId = rx['id'] ?? rx['prescriptionNumber'] ?? rx['_id'] ?? 'RX-${index + 1000}';
        final doctor = _parseNameString(rx['doctor'] ?? rx['doctorName'], 'Consulting Doctor');
        final date = rx['date'] ?? rx['createdAt']?.toString().split('T')[0] ?? '';
        final diagnosis = rx['diagnosis'] ?? 'Medical Consultation';

        List meds = [];
        if (rx['medications'] is List) meds = rx['medications'];

        return Container(
          margin: const EdgeInsets.only(bottom: 14.0),
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
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
                        rxId.toString(),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Prescribed by: $doctor',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF334155),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    date.toString(),
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Diagnosis: $diagnosis',
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 12),
              const Divider(color: Color(0xFFF1F5F9), height: 1),
              const SizedBox(height: 12),
              const Text(
                'Medication & Dosage:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              if (meds.isEmpty)
                const Text(
                  'Follow doctor dosage advice.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                )
              else
                ...meds.map((med) {
                  final text = med is Map
                      ? '${med['name']} — ${med['dosage'] ?? ''} • ${med['duration'] ?? ''}'
                      : med.toString();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.circle,
                          size: 6,
                          color: Color(0xFF10B981),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            text,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF334155),
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleConfirmBooking() async {
    if (_selectedBookingDoctor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a doctor to proceed with booking.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    final docId = _selectedBookingDoctor!['_id'] ?? _selectedBookingDoctor!['id'] ?? '';
    final rawDocName = _parseNameString(_selectedBookingDoctor!['name'] ?? _selectedBookingDoctor!['user'], 'Doctor');
    final formattedDocName = rawDocName.startsWith('Dr.') ? rawDocName : 'Dr. $rawDocName';
    final dateStr = _selectedBookingDate.toString().split(' ')[0];

    setState(() {
      _isBookingSubmitting = true;
    });

    final result = await _apiService.bookAppointment(
      doctorId: docId.toString(),
      date: dateStr,
      time: _selectedBookingTime,
      type: _selectedBookingType,
      reason: _bookingReasonController.text.trim().isNotEmpty
          ? _bookingReasonController.text.trim()
          : 'General OPD Consultation',
    );

    if (!mounted) return;

    setState(() {
      _isBookingSubmitting = false;
    });

    final isSuccess = result['success'] == true;
    final serverMessage = result['message']?.toString() ?? 'Failed to book appointment.';

    if (isSuccess) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: Color(0xFF166534), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                'Appointment Booked!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              Text(
                'Your consultation with $formattedDocName is confirmed for $dateStr at $_selectedBookingTime.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _loadAllData();
                    _switchTab(0);
                  },
                  child: const Text('View in Home Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(serverMessage),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  // --- BOOK APPOINTMENT SCREEN (TAB 2) ---
  Widget _buildBookAppointmentScreen(ResponsiveHelper responsive) {
    // Filter doctors based on selected department
    final filteredDoctors = _availableDoctors.where((doc) {
      if (_selectedBookingDepartment == 'All') return true;
      final deptName = _parseNameString(doc['department'] ?? doc['specialization'] ?? doc['specialty'], '');
      return deptName.toLowerCase() == _selectedBookingDepartment.toLowerCase();
    }).toList();

    // Generate upcoming 7 days
    final List<DateTime> upcomingDays = List.generate(
      7,
      (index) => DateTime.now().add(Duration(days: index + 1)),
    );

    final activeDoc = _selectedBookingDoctor;
    final activeDocFee = activeDoc != null
        ? ((activeDoc['consultationSettings'] as Map?)?['fee'] ?? activeDoc['fee'] ?? 500)
        : 500;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Section Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.calendar_month_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Book Consultation',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Select a specialty, choose your doctor, and pick a time slot.',
                        style: TextStyle(fontSize: 11, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // STEP 1: Department Filter Chips
          const Text(
            'STEP 1: SELECT SPECIALTY DEPARTMENT',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: _departmentFilterList.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final dept = _departmentFilterList[index];
                final isSelected = _selectedBookingDepartment == dept;

                return ChoiceChip(
                  label: Text(dept),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedBookingDepartment = dept;
                      });
                    }
                  },
                  selectedColor: const Color(0xFF1E293B),
                  backgroundColor: const Color(0xFFF1F5F9),
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  showCheckmark: false,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // STEP 2: Choose Specialist Doctor Grid
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'STEP 2: CHOOSE SPECIALIST DOCTOR',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5),
              ),
              Text(
                '${filteredDoctors.length} Available',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (filteredDoctors.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Center(
                child: Text(
                  'No doctors available for this specialty department.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredDoctors.length,
              itemBuilder: (context, index) {
                final doc = filteredDoctors[index];
                final docId = doc['_id'] ?? doc['id'] ?? '';
                final isSelected = activeDoc != null && (activeDoc['_id'] == docId || activeDoc['id'] == docId);

                String docName = _parseNameString(doc['name'] ?? doc['user'], 'Doctor');
                if (!docName.startsWith('Dr.') && !docName.startsWith('dr.')) {
                  docName = 'Dr. $docName';
                }

                final docSpec = _parseNameString(doc['department'] ?? doc['specialization'] ?? doc['specialty'], 'General Physician');
                final docQual = doc['qualification']?.toString() ?? 'MD, MBBS';
                final docFee = (doc['consultationSettings'] as Map?)?['fee'] ?? doc['fee'] ?? 500;

                final docPhoto = doc['photoUrl'] ?? doc['avatarUrl'] ?? (doc['user'] is Map ? doc['user']['avatarUrl'] : null);
                final hasPhoto = docPhoto is String && docPhoto.trim().isNotEmpty;
                final isRevisit = _isWithinOpLimit(docId.toString(), _selectedBookingDate);

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedBookingDoctor = doc;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected ? const Color(0xFF2563EB).withOpacity(0.08) : Colors.black.withOpacity(0.02),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: isSelected ? const Color(0xFF2563EB) : const Color(0xFFEEF2FF),
                              backgroundImage: hasPhoto ? NetworkImage(docPhoto.toString().trim()) : null,
                              child: !hasPhoto
                                  ? Icon(
                                      Icons.person_rounded,
                                      color: isSelected ? Colors.white : const Color(0xFF2563EB),
                                      size: 26,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          docName,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                      if (isSelected)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF2563EB),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Icon(Icons.check_circle_rounded, color: Colors.white, size: 12),
                                              SizedBox(width: 4),
                                              Text('Selected', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '$docSpec • $docQual',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                      color: isSelected ? const Color(0xFF1D4ED8) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.white : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                isRevisit ? 'Consultation Fee: ₹0 (Free Revisit)' : 'Consultation Fee: ₹$docFee',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isRevisit ? const Color(0xFF15803D) : const Color(0xFF0F172A),
                                ),
                              ),
                              if (isRevisit)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDCFCE7),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text('Free OP Revisit', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534))),
                                )
                              else
                                Row(
                                  children: const [
                                    Icon(Icons.circle, color: Color(0xFF10B981), size: 8),
                                    SizedBox(width: 4),
                                    Text('Available Today', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF15803D))),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          const SizedBox(height: 20),

          // STEP 3: Schedule Date & Time Slot Selector
          if (activeDoc != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'STEP 3: SELECT DATE & TIME SLOT',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF475569), letterSpacing: 0.5),
                      ),
                      IconButton(
                        icon: const Icon(Icons.calendar_today_rounded, size: 18, color: Color(0xFF2563EB)),
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _selectedBookingDate,
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 60)),
                          );
                          if (picked != null) {
                            setState(() {
                              _selectedBookingDate = picked;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Horizontal 7-Day Date Bar
                  SizedBox(
                    height: 58,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      itemCount: upcomingDays.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, idx) {
                        final dt = upcomingDays[idx];
                        final isSelected = _selectedBookingDate.day == dt.day && _selectedBookingDate.month == dt.month;
                        final dayName = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][dt.weekday - 1];

                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedBookingDate = dt;
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 54,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  dayName,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? Colors.white70 : const Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${dt.day}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Available Time Slots',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 8),

                  // Time Slots Wrap Grid
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _availableTimeSlots.map((slot) {
                      final isSelected = _selectedBookingTime == slot;
                      return InkWell(
                        onTap: () {
                          setState(() {
                            _selectedBookingTime = slot;
                          });
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Text(
                            slot,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                              color: isSelected ? Colors.white : const Color(0xFF334155),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Consultation Type Segmented Buttons
                  const Text(
                    'Consultation Mode',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          avatar: Icon(Icons.location_on_rounded, size: 14, color: _selectedBookingType == 'In-Person OP Visit' ? Colors.white : const Color(0xFF2563EB)),
                          label: const Text('In-Person OP Visit'),
                          selected: _selectedBookingType == 'In-Person OP Visit',
                          onSelected: (val) {
                            if (val) setState(() => _selectedBookingType = 'In-Person OP Visit');
                          },
                          selectedColor: const Color(0xFF2563EB),
                          labelStyle: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: _selectedBookingType == 'In-Person OP Visit' ? Colors.white : const Color(0xFF334155),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          avatar: Icon(Icons.videocam_rounded, size: 14, color: _selectedBookingType == 'Online Video Consultation' ? Colors.white : const Color(0xFF059669)),
                          label: const Text('Video Call'),
                          selected: _selectedBookingType == 'Online Video Consultation',
                          onSelected: (val) {
                            if (val) setState(() => _selectedBookingType = 'Online Video Consultation');
                          },
                          selectedColor: const Color(0xFF059669),
                          labelStyle: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: _selectedBookingType == 'Online Video Consultation' ? Colors.white : const Color(0xFF334155),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Reason text field
                  TextField(
                    controller: _bookingReasonController,
                    decoration: InputDecoration(
                      labelText: 'Symptoms / Reason for visit (Optional)',
                      labelStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // STEP 4: Booking Summary Card & Submit
            Builder(
              builder: (context) {
                final isSummaryRevisit = _isWithinOpLimit(activeDoc['_id']?.toString() ?? activeDoc['id']?.toString(), _selectedBookingDate);
                final finalConsultFee = isSummaryRevisit ? 0 : activeDocFee;
                final deptName = _parseNameString(activeDoc['department'] ?? activeDoc['specialization'] ?? activeDoc['specialty'], 'General Medicine');
                final rawDocName = _parseNameString(activeDoc['name'] ?? activeDoc['user'], 'Doctor');
                final formattedDocName = rawDocName.startsWith('Dr.') ? rawDocName : 'Dr. $rawDocName';

                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.assignment_outlined, color: Color(0xFF4F46E5), size: 20),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'BOOKING SUMMARY',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Live Auto-Fetched',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF166534),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 14),

                      if (isSummaryRevisit)
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF86EFAC)),
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.check_circle_rounded, color: Color(0xFF166534), size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Free OP Revisit Active — Previous visit within 7-day limit.',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Row 1: Patient Selected
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Patient Selected:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          Row(
                            children: const [
                              Icon(Icons.check_circle_outline_rounded, color: Color(0xFF059669), size: 16),
                              SizedBox(width: 4),
                              Text('Yes', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Row 2: Selected Doctor
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Selected Doctor:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          Text(
                            formattedDocName,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Row 3: Department
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Department:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          Text(
                            deptName,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Row 4: Booking Type
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Booking Type:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          const Text(
                            'Appointment',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Row 5: Registration Fee
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Registration Fee:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          const Text(
                            '₹0 (Existing Patient – Free)',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Row 6: Consultation Fee
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Consultation Fee:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          Text(
                            isSummaryRevisit ? '₹0 (Free OP Revisit)' : '₹$finalConsultFee',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: isSummaryRevisit ? const Color(0xFF059669) : const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 14),

                      // Row 7: Total Consultation Bill
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const Text(
                            'Total Consultation Bill:',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            '₹$finalConsultFee.00',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF1E3A8A)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Footer Note
                      const Text(
                        'Note: Confirmed bookings generate an official consultation slip, which automatically populates in Doctor & Receptionist dashboards.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                          fontStyle: FontStyle.italic,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          onPressed: _isBookingSubmitting ? null : _handleConfirmBooking,
                          child: _isBookingSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text(
                                  'Confirm & Book Appointment',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  // --- RECORDS SCREEN (TAB 3) & MEDICAL HISTORY SCREEN (TAB 4) ---
  Widget _buildRecordsScreen(ResponsiveHelper responsive) {
    return _buildWebParityMedicalHistoryView(responsive);
  }

  Widget _buildMedicalHistoryScreen(ResponsiveHelper responsive) {
    return _buildWebParityMedicalHistoryView(responsive);
  }

  Widget _buildWebParityMedicalHistoryView(ResponsiveHelper responsive) {
    final allLogs = _combinedMedicalLogs;

    // Filter Counts
    final totalCount = allLogs.length;
    final videoCount = allLogs.where((l) => l['category'] == 'Video Consultations').length;
    final opdCount = allLogs.where((l) => l['category'] == 'Walk-In OPD').length;
    final rxCount = allLogs.where((l) => l['category'] == 'Prescriptions RX').length;
    final labCount = allLogs.where((l) => l['category'] == 'Lab Reports').length;

    // Apply Filter & Search Query
    final query = _historySearchController.text.trim().toLowerCase();
    final filteredLogs = allLogs.where((item) {
      if (_selectedHistoryFilter != 'All History Logs' && item['category'] != _selectedHistoryFilter) {
        return false;
      }
      if (query.isNotEmpty) {
        final title = (item['title'] ?? '').toString().toLowerCase();
        final doctor = (item['doctor'] ?? '').toString().toLowerCase();
        final typeLabel = (item['typeLabel'] ?? '').toString().toLowerCase();
        return title.contains(query) || doctor.contains(query) || typeLabel.contains(query);
      }
      return true;
    }).toList();

    final bloodGroup = _patientProfile?['bloodGroup'] ?? 'A+';
    final allergy = _patientProfile?['allergies'] ?? 'Curd';

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. DARK METRIC STAT BANNER (Matching Web Dashboard Screenshot)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildMetricStatBox('TOTAL HISTORY RECORDS', '$totalCount Items', Colors.white),
                      const SizedBox(width: 14),
                      _buildMetricStatBox('CONSULTATION VISITS', '${_appointments.length} Total', const Color(0xFF34D399)),
                      const SizedBox(width: 14),
                      _buildMetricStatBox('DIGITAL RX ISSUED', '${_prescriptions.length} Records', const Color(0xFFFBBF24)),
                      const SizedBox(width: 14),
                      _buildMetricStatBox('BLOOD GROUP / ALLERGY', '$bloodGroup • $allergy', const Color(0xFFF472B6)),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // 2. FILTER CHIPS BAR & SEARCH INPUT
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _buildHistoryFilterChip('All History Logs', totalCount),
                const SizedBox(width: 8),
                _buildHistoryFilterChip('Video Consultations', videoCount),
                const SizedBox(width: 8),
                _buildHistoryFilterChip('Walk-In OPD', opdCount),
                const SizedBox(width: 8),
                _buildHistoryFilterChip('Prescriptions RX', rxCount),
                const SizedBox(width: 8),
                _buildHistoryFilterChip('Lab Reports', labCount),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Search Field Input
          TextField(
            controller: _historySearchController,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Search diagnosis, doctor, notes...',
              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
              suffixIcon: _historySearchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 16, color: Color(0xFF64748B)),
                      onPressed: () {
                        setState(() {
                          _historySearchController.clear();
                        });
                      },
                    )
                  : null,
              isDense: true,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            style: const TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 18),

          // 3. TIMELINE MEDICAL RECORD ITEMS
          if (filteredLogs.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.folder_off_rounded, size: 44, color: Color(0xFF94A3B8)),
                  SizedBox(height: 12),
                  Text(
                    'No Medical Records Found',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'No matching records found for the selected filter category.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredLogs.length,
              itemBuilder: (context, index) {
                final item = filteredLogs[index];
                return _buildTimelineMedicalCard(item, index == filteredLogs.length - 1);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildMetricStatBox(String label, String value, Color valueColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: Color(0xFF94A3B8),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryFilterChip(String label, int count) {
    final isSelected = _selectedHistoryFilter == label;
    return ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
          ),
        ],
      ),
      selected: isSelected,
      onSelected: (val) {
        if (val) {
          setState(() {
            _selectedHistoryFilter = label;
          });
        }
      },
      selectedColor: const Color(0xFF1E293B),
      backgroundColor: const Color(0xFFF1F5F9),
      labelStyle: TextStyle(
        fontSize: 11,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
        color: isSelected ? Colors.white : const Color(0xFF475569),
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
        ),
      ),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    );
  }

  Widget _buildTimelineMedicalCard(Map<String, dynamic> item, bool isLast) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Left Timeline Vertical Node
          Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 14),
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                  color: Color(0xFF2563EB),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.description_rounded, color: Colors.white, size: 15),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: const Color(0xFFE2E8F0),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Main Medical Record Card
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Date & Category Pills + Doctor Details
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        flex: 5,
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                item['date'].toString(),
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                item['typeLabel'].toString(),
                                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        flex: 4,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              item['doctor'].toString(),
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                            Text(
                              item['subText'].toString(),
                              style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Diagnosis / Record Details
                  const Text(
                    'PRIMARY DIAGNOSIS / RECORD',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item['title'].toString(),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 10),

                  // Action Buttons Row
                  Wrap(
                    alignment: WrapAlignment.end,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2563EB),
                          side: const BorderSide(color: Color(0xFFBFDBFE)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Viewing ${item['title']} details')),
                          );
                        },
                        icon: const Icon(Icons.remove_red_eye_rounded, size: 14),
                        label: const Text('View Report', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEFF6FF),
                          foregroundColor: const Color(0xFF1D4ED8),
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Downloading ${item['title']} PDF...')),
                          );
                        },
                        icon: const Icon(Icons.download_rounded, size: 14),
                        label: const Text('Download Report', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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
}
