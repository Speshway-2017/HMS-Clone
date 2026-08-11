import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../authentication/services/auth_service.dart';
import '../services/nurse_service.dart';

class ShiftHandoverScreen extends StatefulWidget {
  const ShiftHandoverScreen({super.key});

  @override
  State<ShiftHandoverScreen> createState() => _ShiftHandoverScreenState();
}

class _ShiftHandoverScreenState extends State<ShiftHandoverScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final NurseService _nurseService = NurseService();
  bool _isLoading = false;

  // State details
  String _outgoingNurse = 'Staff Nurse';
  String? _incomingNurseId;
  String? _selectedWard = 'General Ward B';
  bool _shiftStarted = false;
  DateTime? _shiftStartTime;
  DateTime? _shiftEndTime;

  // Form Fields
  final _startNotesController = TextEditingController();
  final _patientSummaryController = TextEditingController();
  final _pendingMedsController = TextEditingController();
  final _criticalAlertsController = TextEditingController();
  final _doctorInstructionsController = TextEditingController();
  final _specialObservationsController = TextEditingController();
  List<String> _attachments = [];

  // Database option lists
  List<dynamic> _inpatients = [];
  List<dynamic> _nurses = [];

  // Mock Timeline events
  final List<Map<String, dynamic>> _shiftTimeline = [
    {'time': '07:30 AM', 'event': 'Start Shift', 'details': 'Clock-in recorded. Handover from Sr. Linda completed.'},
    {'time': '08:30 AM', 'event': 'Medication Round', 'details': 'Administered morning dosage for 8 ward patients.'},
    {'time': '10:15 AM', 'event': 'Doctor Visit', 'details': 'Assisted Dr. Anand with critical ICU rounds.'},
    {'time': '12:00 PM', 'event': 'Shift Break', 'details': '30-minute lunch rotation break.'},
    {'time': '02:30 PM', 'event': 'Vitals Update', 'details': 'Recorded mid-day vitals for Sita Devi and Amit Patel.'},
  ];

  // Mock Recent Shift Logs
  final List<Map<String, dynamic>> _shiftLogs = [
    {'date': '27/07/2026', 'shift': 'Day Shift', 'nurse': 'Sr. Priya Nair', 'ward': 'General Ward B', 'duration': '8.5 hrs', 'status': 'Completed'},
    {'date': '26/07/2026', 'shift': 'Night Shift', 'nurse': 'Sr. Linda Jenkins', 'ward': 'ICU Ward A', 'duration': '12 hrs', 'status': 'Completed'},
    {'date': '25/07/2026', 'shift': 'Day Shift', 'nurse': 'Nurse Rahul Sharma', 'ward': 'General Ward B', 'duration': '8 hrs', 'status': 'Completed'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadHandoverData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _startNotesController.dispose();
    _patientSummaryController.dispose();
    _pendingMedsController.dispose();
    _criticalAlertsController.dispose();
    _doctorInstructionsController.dispose();
    _specialObservationsController.dispose();
    super.dispose();
  }

  Future<void> _loadHandoverData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final name = await AuthService.getUserName();
      if (name != null) {
        setState(() {
          _outgoingNurse = name;
        });
      }

      final inpatients = await _nurseService.getInpatients();
      final nurses = await _nurseService.getNurses();

      setState(() {
        _inpatients = inpatients;
        _nurses = nurses;
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

  void _startShift() {
    setState(() {
      _shiftStarted = true;
      _shiftStartTime = DateTime.now();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(backgroundColor: AppColors.emerald600, content: Text('Shift started successfully.')),
    );
  }

  void _endShift() {
    setState(() {
      _shiftEndTime = DateTime.now();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(backgroundColor: AppColors.navy700, content: Text('Shift ended. Please complete handover notes.')),
    );
  }

  void _submitHandover(bool isDraft) {
    if (_incomingNurseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please select the incoming nurse.')),
      );
      return;
    }
    if (_patientSummaryController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please enter patient summary details.')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.emerald600,
        content: Text(isDraft ? 'Handover draft saved successfully.' : 'Shift Handover submitted successfully.'),
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Shift Handover Hub',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Shift & Handover'),
            Tab(text: 'Timeline & History'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildFormTab(),
                _buildTimelineTab(),
              ],
            ),
    );
  }

  Widget _buildFormTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildStatsRow(),
          const SizedBox(height: 16),
          _buildStartShiftCard(),
          const SizedBox(height: 16),
          if (_shiftStarted) ...[
            _buildEndShiftCard(),
            const SizedBox(height: 16),
            _buildHandoverNotesCard(),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }

  Widget _buildTimelineTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildTimelineCard(),
          const SizedBox(height: 16),
          _buildRecentLogsCard(),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildSummaryStatCard(
            title: 'Assigned',
            value: '${_inpatients.length}',
            color: AppColors.navy700,
            bgColor: AppColors.navy50,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildSummaryStatCard(
            title: 'Meds Due',
            value: '4',
            color: Colors.amber.shade800,
            bgColor: Colors.amber.shade50,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildSummaryStatCard(
            title: 'Shift Status',
            value: _shiftStarted ? 'Active' : 'Pending',
            color: _shiftStarted ? AppColors.emerald600 : AppColors.slate400,
            bgColor: _shiftStarted ? AppColors.emerald50 : AppColors.slate100,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryStatCard({
    required String title,
    required String value,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(fontSize: 9, color: AppColors.slate600, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildStartShiftCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Start Shift Card',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          Text(
            'Shift Start Time: ${_shiftStartTime != null ? _shiftStartTime!.toLocal().toString().substring(11, 16) : 'Not Started'}',
            style: const TextStyle(fontSize: 12, color: AppColors.slate700),
          ),
          const SizedBox(height: 8),
          Text(
            'Assigned Nurse: $_outgoingNurse',
            style: const TextStyle(fontSize: 12, color: AppColors.slate700),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Ward Location',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            value: _selectedWard,
            onChanged: _shiftStarted ? null : (val) {
              setState(() {
                _selectedWard = val;
              });
            },
            items: const [
              DropdownMenuItem(value: 'General Ward B', child: Text('General Ward B', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'General Ward A', child: Text('General Ward A', style: TextStyle(fontSize: 12))),
              DropdownMenuItem(value: 'ICU Ward A', child: Text('ICU Ward A', style: TextStyle(fontSize: 12))),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _startNotesController,
            enabled: !_shiftStarted,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Shift Prep Notes (Optional)',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _shiftStarted ? AppColors.slate300 : AppColors.navy700,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: _shiftStarted ? null : _startShift,
            child: const Text('Start Shift', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildEndShiftCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'End Shift Card',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          Text(
            'Shift End Time: ${_shiftEndTime != null ? _shiftEndTime!.toLocal().toString().substring(11, 16) : 'Active'}',
            style: const TextStyle(fontSize: 12, color: AppColors.slate700),
          ),
          const SizedBox(height: 8),
          const Text(
            'Completed Tasks: 4  •  Pending Tasks: 2  •  Critical Patients: 1',
            style: TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _shiftEndTime != null ? AppColors.slate300 : AppColors.errorRed,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: _shiftEndTime != null ? null : _endShift,
            child: const Text('End Shift', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildHandoverNotesCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Shift Handover Notes',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),

          Text(
            'Outgoing Nurse: $_outgoingNurse',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700),
          ),
          const SizedBox(height: 12),

          // Incoming Nurse Selector
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Incoming Nurse',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            hint: const Text('Select Incoming Nurse...', style: TextStyle(fontSize: 11)),
            value: _incomingNurseId,
            onChanged: (val) {
              setState(() {
                _incomingNurseId = val;
              });
            },
            items: _nurses.map((nurse) {
              final String name = nurse['name'] ?? '';
              final String id = nurse['_id'] ?? '';
              return DropdownMenuItem<String>(
                value: id,
                child: Text(name, style: const TextStyle(fontSize: 12)),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),

          // Patient Summary
          TextFormField(
            controller: _patientSummaryController,
            maxLines: 3,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Patient Summary',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              hintText: 'Summary of active admissions conditions...',
            ),
          ),
          const SizedBox(height: 12),

          // Pending Medications
          TextFormField(
            controller: _pendingMedsController,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Pending Medications',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              hintText: 'e.g. Sita Devi IV drip due at 16:00',
            ),
          ),
          const SizedBox(height: 12),

          // Critical Alerts
          TextFormField(
            controller: _criticalAlertsController,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Critical Alerts',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
              hintText: 'e.g. Monitor blood pressure for Room 202',
            ),
          ),
          const SizedBox(height: 12),

          // Doctor Instructions
          TextFormField(
            controller: _doctorInstructionsController,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Doctor Instructions',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),

          // Special Observations
          TextFormField(
            controller: _specialObservationsController,
            maxLines: 2,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              labelText: 'Special Observations',
              labelStyle: TextStyle(fontSize: 12),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),

          // Attachments simulator
          GestureDetector(
            onTap: () {
              setState(() {
                _attachments.add('handover_report_doc.pdf');
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
                  Text('Simulate Upload Attachments', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                ],
              ),
            ),
          ),
          if (_attachments.isNotEmpty) ...[
            const SizedBox(height: 8),
            ..._attachments.map((file) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      const Icon(Icons.insert_drive_file_outlined, size: 12, color: AppColors.navy700),
                      const SizedBox(width: 8),
                      Text(file, style: const TextStyle(fontSize: 10, color: AppColors.slate700)),
                    ],
                  ),
                )),
          ],
          const SizedBox(height: 20),

          // Handover Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _submitHandover(false),
                  child: const Text('Submit Handover', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.slate700,
                    elevation: 0,
                    side: const BorderSide(color: AppColors.slate300),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => _submitHandover(true),
                  child: const Text('Save Draft', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Shift Action Timeline',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _shiftTimeline.length,
            itemBuilder: (context, index) {
              final ev = _shiftTimeline[index];
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: AppColors.navy700, shape: BoxShape.circle),
                      ),
                      if (index != _shiftTimeline.length - 1)
                        Container(width: 2, height: 40, color: AppColors.slate200),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(ev['event'], style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                            Text(ev['time'], style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(ev['details'], style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                        const SizedBox(height: 12),
                      ],
                    ),
                  )
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildRecentLogsCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Recent Handover Logs',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _shiftLogs.length,
            separatorBuilder: (context, i) => const Divider(color: AppColors.slate100, height: 1),
            itemBuilder: (context, index) {
              final log = _shiftLogs[index];
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${log['shift']} • ${log['date']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                          const SizedBox(height: 2),
                          Text('Nurse: ${log['nurse']} • Ward: ${log['ward']}', style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(log['duration'], style: const TextStyle(fontSize: 10, color: AppColors.navy700, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        GestureDetector(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Exporting Handover Log for ${log['date']} to PDF...')),
                            );
                          },
                          child: const Text('Export PDF', style: TextStyle(fontSize: 9, color: Colors.blue, fontWeight: FontWeight.bold)),
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
}
