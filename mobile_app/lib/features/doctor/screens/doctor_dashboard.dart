import 'package:flutter/material.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../services/doctor_api_service.dart';
import '../widgets/consultation_workspace_sheet.dart';
import '../widgets/inpatient_emr_sheet.dart';
import '../screens/patient_record_detail_screen.dart';

class DoctorDashboard extends StatefulWidget {
  const DoctorDashboard({super.key});

  @override
  State<DoctorDashboard> createState() => _DoctorDashboardState();
}

class _DoctorDashboardState extends State<DoctorDashboard> {
  int _currentIndex = 0;
  final _apiService = DoctorApiService();

  bool _isLoading = true;
  Map<String, dynamic> _metrics = {};
  List<Map<String, dynamic>> _queueList = [];
  List<Map<String, dynamic>> _todayAppointments = [];
  List<Map<String, dynamic>> _inpatients = [];
  List<Map<String, dynamic>> _myPatients = [];
  List<Map<String, dynamic>> _notifications = [];
  List<Map<String, dynamic>> _completedConsultations = [];

  // Tab sub-filtering
  int _opSubTab = 0; // 0: Queue, 1: Appointments, 2: Completed
  int _patientSubTab = 0; // 0: Ledger, 1: Notifications
  String _searchQuery = '';
  String _opSearchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final metrics = await _apiService.fetchMetrics();
      var queue = await _apiService.fetchQueue();
      var appointments = await _apiService.fetchTodayAppointments();
      final inpatients = await _apiService.fetchInpatients();
      final patients = await _apiService.fetchMyPatients();
      final notifications = await _apiService.fetchNotifications();
      final completed = await _apiService.fetchCompletedConsultations();

      // Combine backend completed consultations with any completed appointments
      final completedMap = <String, Map<String, dynamic>>{};
      for (final c in completed) {
        final id = c['_id']?.toString() ?? c['id']?.toString() ?? '';
        if (id.isNotEmpty) completedMap[id] = c;
      }
      for (final a in appointments) {
        final st = (a['status']?.toString() ?? '').toLowerCase();
        if (st == 'completed' || st == 'consulted') {
          final id = a['_id']?.toString() ?? a['id']?.toString() ?? '';
          if (id.isNotEmpty && !completedMap.containsKey(id)) {
            completedMap[id] = a;
          }
        }
      }
      final completedList = completedMap.values.toList();

      // If queue is empty but appointments exist, synthesize queue items from appointments
      if (queue.isEmpty && appointments.isNotEmpty) {
        queue = appointments.map((a) {
          final patient = a['patient'] as Map<String, dynamic>? ?? {};
          final status = a['status']?.toString() ?? 'waiting';
          return {
            '_id': a['_id'] ?? a['id'],
            'patient': patient,
            'tokenNumber': a['referenceId'] != null ? a['referenceId'].toString().substring(a['referenceId'].toString().length - 3) : 'Q-01',
            'status': status == 'checked_in' ? 'called' : (status == 'in_consultation' ? 'called' : 'waiting'),
            'appointment': a,
          };
        }).toList();
      }

      // If appointments is empty but queue has items, synthesize appointments from queue items
      if (appointments.isEmpty && queue.isNotEmpty) {
        appointments = queue.map((q) {
          final patient = q['patient'] as Map<String, dynamic>? ?? {};
          return {
            '_id': q['_id'] ?? q['id'],
            'patient': patient,
            'time': q['time'] ?? 'Today',
            'type': q['type'] ?? 'OP Consultation',
            'status': q['status'] ?? 'scheduled',
          };
        }).toList();
      }

      if (!mounted) return;

      setState(() {
        _metrics = metrics;
        _queueList = queue;
        _todayAppointments = appointments;
        _inpatients = inpatients;
        _myPatients = patients;
        _notifications = notifications;
        _completedConsultations = completedList;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _openConsultationWorkspace(Map<String, dynamic> appointment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ConsultationWorkspaceSheet(
        appointment: appointment,
        onCompleted: _loadDashboardData,
      ),
    );
  }

  void _openInpatientEmr(Map<String, dynamic> inpatient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => InpatientEmrSheet(
        inpatient: inpatient,
        onUpdated: _loadDashboardData,
      ),
    );
  }

  void _openPatientDetailSheet(Map<String, dynamic> patient) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PatientRecordDetailScreen(patient: patient),
      ),
    );
  }

  Future<void> _handleCallPatient(String queueId) async {
    await _apiService.callPatient(queueId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Patient token called to consultation room!'), backgroundColor: AppColors.navy700),
    );
    _loadDashboardData();
  }

  Future<void> _handleSkipPatient(String queueId) async {
    await _apiService.skipPatient(queueId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Patient skipped in queue.'), backgroundColor: AppColors.slate700),
    );
    _loadDashboardData();
  }

  Future<void> _handleMarkNoShow(String queueId) async {
    await _apiService.markNoShow(queueId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Marked patient as No-Show.'), backgroundColor: AppColors.errorRed),
    );
    _loadDashboardData();
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);
    final docName = UserSession.userName.isNotEmpty ? UserSession.userName : 'Dr. Practitioner';

    final List<Widget> pages = [
      _buildHomeScreen(responsive, docName),
      _buildOpQueueWorkspaceScreen(responsive),
      _buildInpatientsScreen(responsive),
      _buildPatientsAndNotificationsScreen(responsive),
    ];

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy800,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              docName,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.2),
            ),
            Text(
              'HMS Clinical Workspace • Doctor Portal',
              style: TextStyle(fontSize: 10.5, color: AppColors.slate300.withOpacity(0.9)),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14.0),
            child: GestureDetector(
              onTap: () => Navigator.pushNamed(context, AppRoutes.doctorProfile),
              child: Tooltip(
                message: 'Doctor Profile & Settings',
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.navy100,
                  child: Text(
                    docName.startsWith('Dr.') ? docName.substring(4, 5).toUpperCase() : docName[0].toUpperCase(),
                    style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: pages[_currentIndex],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: AppColors.navy700,
        unselectedItemColor: AppColors.slate400,
        backgroundColor: AppColors.white,
        elevation: 12,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.queue_outlined),
            activeIcon: Icon(Icons.queue_rounded),
            label: 'OP Queue',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.hotel_outlined),
            activeIcon: Icon(Icons.hotel_rounded),
            label: 'Inpatients',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline_rounded),
            activeIcon: Icon(Icons.people_rounded),
            label: 'Patient Records',
          ),
        ],
      ),
    );
  }

  // ── TAB 0: HOME SCREEN OVERVIEW ──
  Widget _buildHomeScreen(ResponsiveHelper responsive, String docName) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final nextQueueItem = _queueList.firstWhere(
      (q) => q['status'] == 'called' || q['status'] == 'waiting',
      orElse: () => {},
    );

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Greeting Banner Card
          Container(
            padding: const EdgeInsets.all(18.0),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.navy800, AppColors.navy700],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16.0),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy900.withOpacity(0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.white.withOpacity(0.2),
                      child: Text(
                        docName.startsWith('Dr.') ? docName.substring(4, 5).toUpperCase() : docName[0].toUpperCase(),
                        style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome, $docName',
                            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.white),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Cardiology & Internal Medicine • Enterprise HQ',
                            style: TextStyle(fontSize: 11, color: AppColors.slate200),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Today\'s Schedule: ${_metrics['todayAppointments'] ?? _todayAppointments.length} Appointments',
                        style: const TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // KPI Stats Grid
          Row(
            children: [
              Expanded(
                child: _buildKpiCard(
                  title: 'Today Appointments',
                  count: '${_metrics['todayAppointments'] ?? _todayAppointments.length}',
                  icon: Icons.calendar_month_rounded,
                  color: AppColors.navy700,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildKpiCard(
                  title: 'In OP Queue',
                  count: '${_metrics['inQueue'] ?? _queueList.length}',
                  icon: Icons.hourglass_top_rounded,
                  color: Colors.amber.shade800,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildKpiCard(
                  title: 'IP Wards',
                  count: '${_metrics['inpatientsCount'] ?? _inpatients.length}',
                  icon: Icons.hotel_rounded,
                  color: AppColors.emerald600,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Up Next / Active Patient Banner
          Text(
            'Active Consultation Queue',
            style: TextStyle(fontSize: responsive.scaleText(15.0), fontWeight: FontWeight.bold, color: AppColors.slate800),
          ),
          const SizedBox(height: 10),
          _buildActivePatientBanner(nextQueueItem),

          const SizedBox(height: 24),

          // Quick Clinical Modules Grid
          Text(
            'Clinical Workspace Modules',
            style: TextStyle(fontSize: responsive.scaleText(15.0), fontWeight: FontWeight.bold, color: AppColors.slate800),
          ),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.35,
            children: [
              _buildShortcutCard(
                title: 'Outpatient Queue',
                desc: 'Call & consult patients',
                icon: Icons.queue_play_next_rounded,
                color: AppColors.navy700,
                onTap: () => setState(() => _currentIndex = 1),
              ),
              _buildShortcutCard(
                title: 'Inpatient Wards',
                desc: 'IP EMR & Discharge',
                icon: Icons.hotel_class_rounded,
                color: AppColors.emerald600,
                onTap: () => setState(() => _currentIndex = 2),
              ),
              _buildShortcutCard(
                title: 'Patient Records',
                desc: 'History & EMR',
                icon: Icons.assignment_ind_rounded,
                color: Colors.deepPurple.shade700,
                onTap: () => setState(() => _currentIndex = 3),
              ),
              _buildShortcutCard(
                title: 'Notifications',
                desc: '${_notifications.length} Alerts inbox',
                icon: Icons.notifications_active_rounded,
                color: Colors.amber.shade800,
                onTap: () => setState(() {
                  _currentIndex = 3;
                  _patientSubTab = 1;
                }),
              ),
            ],
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildKpiCard({required String title, required String count, required IconData icon, required Color color}) {
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(count, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildActivePatientBanner(Map<String, dynamic> item) {
    if (item.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: Row(
          children: const [
            Icon(Icons.check_circle_outline_rounded, color: AppColors.emerald600, size: 28),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'No active patients in queue. Next checked-in patient will appear here.',
                style: TextStyle(fontSize: 12, color: AppColors.slate600, fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
      );
    }

    final patient = item['patient'] as Map<String, dynamic>? ?? {};
    final patientName = patient['name']?.toString() ?? 'Patient';
    final token = item['tokenNumber']?.toString() ?? item['queueNumber']?.toString() ?? 'Q-01';
    final status = item['status']?.toString() ?? 'waiting';

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14.0),
        border: Border.all(color: status == 'called' ? AppColors.navy700 : AppColors.slate200, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy700.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: status == 'called' ? AppColors.navy50 : AppColors.slate100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'TOKEN #$token',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: status == 'called' ? AppColors.navy800 : AppColors.slate700,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: status == 'called' ? AppColors.emerald50 : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: status == 'called' ? AppColors.emerald600 : Colors.amber.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(patientName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
          const SizedBox(height: 2),
          Text(
            '${patient['uhid'] ?? 'UHID-893321'} • ${patient['gender'] ?? 'Male'}, ${patient['age'] ?? 45} yrs',
            style: const TextStyle(fontSize: 11.5, color: AppColors.slate500),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _handleCallPatient(item['_id']?.toString() ?? ''),
                  icon: const Icon(Icons.volume_up_rounded, size: 16, color: Colors.white),
                  label: const Text('Call Room', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _openConsultationWorkspace(item),
                  icon: const Icon(Icons.edit_note_rounded, size: 16, color: Colors.white),
                  label: const Text('Start Workspace', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutCard({
    required String title,
    required String desc,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: AppColors.slate200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 22),
                const Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.slate400),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── TAB 1: OP QUEUE & WORKSPACE SCREEN ──
  Widget _buildOpQueueWorkspaceScreen(ResponsiveHelper responsive) {
    return Column(
      children: [
        // Sub-Tab Switcher
        Container(
          color: AppColors.navy800,
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _opSubTab = 0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: _opSubTab == 0 ? AppColors.white : Colors.transparent, width: 3)),
                    ),
                    child: Text(
                      'Live Queue (${_queueList.length})',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.white, fontWeight: _opSubTab == 0 ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _opSubTab = 1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: _opSubTab == 1 ? AppColors.white : Colors.transparent, width: 3)),
                    ),
                    child: Text(
                      'Appointments (${_todayAppointments.length})',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.white, fontWeight: _opSubTab == 1 ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _opSubTab = 2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: _opSubTab == 2 ? AppColors.white : Colors.transparent, width: 3)),
                    ),
                    child: Text(
                      'Completed (${_completedConsultations.length})',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.white, fontWeight: _opSubTab == 2 ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Find OPs Search Bar
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
          child: TextField(
            onChanged: (val) => setState(() => _opSearchQuery = val),
            style: const TextStyle(fontSize: 12.5),
            decoration: InputDecoration(
              hintText: _opSubTab == 0
                  ? 'Find OP by patient name, UHID, or token number...'
                  : (_opSubTab == 1
                      ? 'Find OP appointment by patient name or UHID...'
                      : 'Find completed consultation record by name, UHID, or diagnosis...'),
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
              isDense: true,
              filled: true,
              fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.slate200)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
          ),
        ),

        Expanded(
          child: _opSubTab == 0
              ? _buildQueueListView()
              : (_opSubTab == 1 ? _buildAppointmentsListView() : _buildCompletedConsultationsListView()),
        ),
      ],
    );
  }

  Widget _buildQueueListView() {
    final filtered = _queueList.where((item) {
      if (_opSearchQuery.trim().isEmpty) return true;
      final query = _opSearchQuery.toLowerCase().trim();
      final patient = item['patient'] as Map<String, dynamic>? ?? {};
      final pName = patient['name']?.toString().toLowerCase() ?? '';
      final uhid = patient['uhid']?.toString().toLowerCase() ?? '';
      final token = (item['tokenNumber']?.toString() ?? item['queueNumber']?.toString() ?? '').toLowerCase();
      return pName.contains(query) || uhid.contains(query) || token.contains(query);
    }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.person_search_outlined, size: 44, color: AppColors.slate400),
              const SizedBox(height: 12),
              Text(
                _opSearchQuery.isNotEmpty ? 'No OP patients matching "$_opSearchQuery"' : 'No active patients in today\'s OP queue.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.slate600, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      itemBuilder: (context, idx) {
        final item = filtered[idx];
        final patient = item['patient'] as Map<String, dynamic>? ?? {};
        final pName = patient['name']?.toString() ?? 'Patient';
        final token = item['tokenNumber']?.toString() ?? item['queueNumber']?.toString() ?? 'Q-${idx + 1}';
        final qId = item['_id']?.toString() ?? '';
        final status = item['status']?.toString() ?? 'waiting';

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.slate200)),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                      child: Text('Token $token', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy800)),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: status == 'called' ? AppColors.emerald50 : Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: status == 'called' ? AppColors.emerald600 : Colors.amber.shade800),
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.slate400),
                      onSelected: (val) {
                        if (val == 'noshow') _handleMarkNoShow(qId);
                        if (val == 'skip') _handleSkipPatient(qId);
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(value: 'skip', child: Text('Skip Patient', style: TextStyle(fontSize: 12))),
                        const PopupMenuItem(value: 'noshow', child: Text('Mark No-Show', style: TextStyle(fontSize: 12, color: AppColors.errorRed))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(pName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                Text('${patient['uhid'] ?? 'UHID-893321'} • ${patient['gender'] ?? 'Male'}, ${patient['age'] ?? 45} yrs', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleCallPatient(qId),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 8)),
                        child: const Text('Call Room', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleSkipPatient(qId),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 8)),
                        child: const Text('Skip', style: TextStyle(fontSize: 11, color: AppColors.slate600)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _openConsultationWorkspace(item),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 8)),
                        child: const Text('OP Workspace', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAppointmentsListView() {
    final filtered = _todayAppointments.where((item) {
      if (_opSearchQuery.trim().isEmpty) return true;
      final query = _opSearchQuery.toLowerCase().trim();
      final patient = item['patient'] as Map<String, dynamic>? ?? {};
      final pName = patient['name']?.toString().toLowerCase() ?? '';
      final uhid = patient['uhid']?.toString().toLowerCase() ?? '';
      return pName.contains(query) || uhid.contains(query);
    }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.event_busy_outlined, size: 44, color: AppColors.slate400),
              const SizedBox(height: 12),
              Text(
                _opSearchQuery.isNotEmpty ? 'No OP appointments matching "$_opSearchQuery"' : 'No appointments scheduled for today.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.slate600, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      itemBuilder: (context, idx) {
        final item = filtered[idx];
        final patient = item['patient'] as Map<String, dynamic>? ?? {};
        final pName = patient['name']?.toString() ?? 'Patient';

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.slate200)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.navy50,
              child: Text(pName.isNotEmpty ? pName[0].toUpperCase() : 'A', style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold)),
            ),
            title: Text(pName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('${item['time'] ?? '09:30 AM'} • ${item['type'] ?? 'OP Consultation'} • ${patient['uhid'] ?? 'UHID-893321'}'),
            trailing: ElevatedButton(
              onPressed: () => _openConsultationWorkspace(item),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
              child: const Text('OP Workspace', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCompletedConsultationsListView() {
    final filtered = _completedConsultations.where((item) {
      if (_opSearchQuery.trim().isEmpty) return true;
      final query = _opSearchQuery.toLowerCase().trim();
      final patient = item['patient'] as Map<String, dynamic>? ?? {};
      final pName = (patient['name']?.toString() ?? item['patientName']?.toString() ?? '').toLowerCase();
      final uhid = (patient['uhid']?.toString() ?? item['uhid']?.toString() ?? '').toLowerCase();
      final diag = (item['diagnosis']?.toString() ?? '').toLowerCase();
      return pName.contains(query) || uhid.contains(query) || diag.contains(query);
    }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.assignment_turned_in_outlined, size: 44, color: AppColors.emerald600),
              const SizedBox(height: 12),
              Text(
                _opSearchQuery.isNotEmpty
                    ? 'No completed consultations matching "$_opSearchQuery"'
                    : 'No consultations completed yet today.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.slate600, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: filtered.length,
      itemBuilder: (context, idx) {
        final item = filtered[idx];
        final patient = item['patient'] as Map<String, dynamic>? ?? {};
        final pName = patient['name']?.toString() ?? item['patientName']?.toString() ?? 'Patient';
        final uhid = patient['uhid']?.toString() ?? item['uhid']?.toString() ?? 'UHID-893321';
        final age = patient['age']?.toString() ?? '45';
        final gender = patient['gender']?.toString() ?? 'Male';
        final diag = item['diagnosis']?.toString() ?? 'Completed Visit';
        final completedDate = item['completedAt'] != null || item['updatedAt'] != null
            ? (item['completedAt'] ?? item['updatedAt']).toString().substring(0, 10)
            : 'Today';

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.slate200)),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.emerald50,
                      child: Text(
                        pName.isNotEmpty ? pName[0].toUpperCase() : 'P',
                        style: const TextStyle(color: AppColors.emerald700, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(pName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.navy900)),
                          Text('$uhid • $gender, $age yrs', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                      child: const Text('COMPLETED', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    children: [
                      const Icon(Icons.medical_information_outlined, size: 14, color: AppColors.navy700),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Diagnosis: $diag',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.navy900),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text('• $completedDate', style: const TextStyle(fontSize: 10.5, color: AppColors.slate500)),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _openConsultationWorkspace(item),
                        icon: const Icon(Icons.receipt_long_outlined, size: 15, color: Colors.white),
                        label: const Text('View Record', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy800, padding: const EdgeInsets.symmetric(vertical: 8)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _openPatientDetailSheet(patient.isNotEmpty ? patient : item),
                        icon: const Icon(Icons.folder_shared_outlined, size: 15, color: AppColors.navy700),
                        label: const Text('Patient Record', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── TAB 2: INPATIENTS (IP) WARD EMR SCREEN ──
  Widget _buildInpatientsScreen(ResponsiveHelper responsive) {
    if (_inpatients.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.hotel_outlined, size: 48, color: AppColors.slate400),
              SizedBox(height: 12),
              Text('No Admitted Inpatients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate800)),
              SizedBox(height: 6),
              Text('Inpatients assigned to you will appear here for daily EMR rounds & discharge.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.slate500)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _inpatients.length,
      itemBuilder: (context, idx) {
        final item = _inpatients[idx];
        final patient = item['patient'] as Map<String, dynamic>? ?? {};
        final pName = patient['name']?.toString() ?? 'Inpatient';
        final wardName = item['ward']?.toString() ?? 'General Ward';
        final roomNum = item['room'] != null && item['room'] is Map ? item['room']['roomNumber']?.toString() : '101';
        final bedNum = item['bed'] != null && item['bed'] is Map ? item['bed']['bedNumber']?.toString() : '101-A';
        final diagnosis = item['primaryDiagnosis']?.toString() ?? 'Under Observation';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.slate200)),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                      child: Text('$wardName • R$roomNum / Bed $bedNum', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                    ),
                    const Spacer(),
                    Text(item['admissionNumber']?.toString() ?? 'IP2026', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(pName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                Text('Diagnosis: $diagnosis', style: const TextStyle(fontSize: 12, color: AppColors.slate700, fontWeight: FontWeight.w500)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openInpatientEmr(item),
                  icon: const Icon(Icons.medical_services_outlined, size: 16, color: Colors.white),
                  label: const Text('Open IP EMR & Rounds Sheet', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, minimumSize: const Size.fromHeight(40)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── TAB 3: PATIENT LEDGER & NOTIFICATIONS SCREEN ──
  Widget _buildPatientsAndNotificationsScreen(ResponsiveHelper responsive) {
    return Column(
      children: [
        Container(
          color: AppColors.navy800,
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _patientSubTab = 0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: _patientSubTab == 0 ? AppColors.white : Colors.transparent, width: 3)),
                    ),
                    child: Text('Patient Records (${_myPatients.length})', textAlign: TextAlign.center, style: TextStyle(color: AppColors.white, fontWeight: _patientSubTab == 0 ? FontWeight.bold : FontWeight.normal, fontSize: 13)),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _patientSubTab = 1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: _patientSubTab == 1 ? AppColors.white : Colors.transparent, width: 3)),
                    ),
                    child: Text('Notifications (${_notifications.length})', textAlign: TextAlign.center, style: TextStyle(color: AppColors.white, fontWeight: _patientSubTab == 1 ? FontWeight.bold : FontWeight.normal, fontSize: 13)),
                  ),
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: _patientSubTab == 0 ? _buildMyPatientsList() : _buildNotificationsInbox(),
        ),
      ],
    );
  }

  Widget _buildMyPatientsList() {
    final filtered = _myPatients.where((p) {
      final name = p['name']?.toString().toLowerCase() ?? '';
      final uhid = p['uhid']?.toString().toLowerCase() ?? '';
      return name.contains(_searchQuery.toLowerCase()) || uhid.contains(_searchQuery.toLowerCase());
    }).toList();

    final totalCount = _myPatients.length;
    final opdCount = _myPatients.where((p) => p['status'] != 'admitted').length;
    final admittedCount = _myPatients.where((p) => p['status'] == 'admitted').length;
    final allergiesCount = _myPatients.where((p) => p['allergies'] != null && p['allergies'].toString().trim().isNotEmpty && p['allergies'].toString().toLowerCase() != 'none').length;

    return Column(
      children: [
        // Summary KPI Stat Bar (Reference Web App image copy 2.png)
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.navy800, borderRadius: BorderRadius.circular(10)),
                  child: Column(
                    children: [
                      Text('$totalCount', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      const Text('MY PATIENTS', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: AppColors.slate300)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
                  child: Column(
                    children: [
                      Text('$opdCount', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy900)),
                      const Text('OPD', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
                  child: Column(
                    children: [
                      Text('$admittedCount', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                      const Text('ADMITTED', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.slate200)),
                  child: Column(
                    children: [
                      Text('$allergiesCount', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                      const Text('ALLERGIES', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        Padding(
          padding: const EdgeInsets.all(12.0),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Search your patients by name or UHID...',
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(child: Text('No patient records found.', style: TextStyle(color: AppColors.slate500)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: filtered.length,
                  itemBuilder: (context, idx) {
                    final item = filtered[idx];
                    final allergyText = item['allergies']?.toString() ?? '';
                    final hasAllergy = allergyText.isNotEmpty && allergyText.toLowerCase() != 'none';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: ListTile(
                          onTap: () => _openPatientDetailSheet(item),
                          leading: CircleAvatar(
                            backgroundColor: AppColors.navy100,
                            child: Text(
                              (item['name'] != null && item['name'].toString().isNotEmpty) ? item['name'].toString()[0].toUpperCase() : 'P',
                              style: const TextStyle(color: AppColors.navy800, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(item['name']?.toString() ?? 'Patient', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${item['uhid'] ?? ''} • ${item['gender'] ?? ''}, ${item['age'] ?? ''} yrs • Blood: ${item['bloodGroup'] ?? 'N/A'}'),
                              if (hasAllergy) ...[
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.warning_amber_rounded, size: 12, color: AppColors.errorRed),
                                    const SizedBox(width: 4),
                                    Text('Allergy: $allergyText', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                                  ],
                                ),
                              ],
                            ],
                          ),
                          trailing: const Icon(Icons.chevron_right, size: 20),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildNotificationsInbox() {
    if (_notifications.isEmpty) {
      return const Center(child: Text('Notifications inbox is empty.', style: TextStyle(color: AppColors.slate500)));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _notifications.length,
      itemBuilder: (context, idx) {
        final item = _notifications[idx];
        final title = item['title']?.toString() ?? 'Notification';
        final msg = item['message']?.toString() ?? '';
        final isCrit = item['severity'] == 'critical';

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: isCrit ? AppColors.errorBg.withOpacity(0.3) : AppColors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: isCrit ? AppColors.errorBorder : AppColors.slate200)),
          child: ListTile(
            leading: Icon(isCrit ? Icons.error_outline : Icons.notifications_none, color: isCrit ? AppColors.errorRed : AppColors.navy700),
            title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isCrit ? AppColors.errorRed : AppColors.navy900)),
            subtitle: Text(msg, style: const TextStyle(fontSize: 11, color: AppColors.slate700)),
          ),
        );
      },
    );
  }
}
