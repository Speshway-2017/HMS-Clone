import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../services/nurse_service.dart';

class AssignTaskScreen extends StatefulWidget {
  const AssignTaskScreen({super.key});

  @override
  State<AssignTaskScreen> createState() => _AssignTaskScreenState();
}

class _AssignTaskScreenState extends State<AssignTaskScreen> {
  final NurseService _nurseService = NurseService();
  bool _isLoading = false;

  // Form Fields
  Map<String, dynamic>? _selectedPatient;
  String _taskName = 'Medication Administration';
  final _descriptionController = TextEditingController();
  String _priority = 'Medium';
  String? _assignedNurseId;
  DateTime? _dueDate;
  TimeOfDay? _dueTime;
  bool _reminder = true;
  List<String> _attachments = [];

  // Options lists loaded from DB
  List<dynamic> _inpatients = [];
  List<dynamic> _nurses = [];

  // Task lists simulation for bottom layout sections
  final List<Map<String, dynamic>> _shiftPendingTasks = [
    {'title': 'Medication Administration', 'patient': 'Sita Devi (ICU-02)', 'due': 'Due in 15 mins', 'priority': 'Critical'},
    {'title': 'Blood Sample Collection', 'patient': 'Rahul Verma (Ward A-04)', 'due': 'Due in 1 hr', 'priority': 'High'},
    {'title': 'Dressing Change', 'patient': 'Amit Patel (Ward B-11)', 'due': 'Due in 2 hrs', 'priority': 'Medium'},
  ];

  final List<Map<String, dynamic>> _upcomingTasks = [
    {'title': 'IV Fluid Change', 'patient': 'Anjali Sen (Ward A-08)', 'time': 'Tomorrow, 09:30 AM'},
    {'title': 'ECG Monitoring Session', 'patient': 'Sita Devi (ICU-02)', 'time': 'Tomorrow, 14:00 PM'},
  ];

  final List<String> _taskNameOptions = [
    'Medication Administration',
    'Blood Pressure Check',
    'Temperature Check',
    'IV Fluid Change',
    'Dressing Change',
    'Blood Sample Collection',
    'ECG Monitoring',
    'Oxygen Monitoring',
    'Doctor Follow-up',
    'Other'
  ];

  final List<String> _priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  @override
  void initState() {
    super.initState();
    _loadFormData();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadFormData() async {
    setState(() {
      _isLoading = true;
    });

    try {
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

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.navy700,
              onPrimary: Colors.white,
              onSurface: AppColors.slate800,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dueDate = picked;
      });
    }
  }

  Future<void> _selectTime() async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.navy700,
              onSurface: AppColors.slate800,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dueTime = picked;
      });
    }
  }

  void _submitTask(bool isDraft) {
    if (_selectedPatient == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please select a patient.')),
      );
      return;
    }
    if (_assignedNurseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please assign the task to a nurse.')),
      );
      return;
    }
    if (_dueDate == null || _dueTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppColors.errorRed, content: Text('Please select due date and time.')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.emerald600,
        content: Text(isDraft ? 'Draft task saved.' : 'Nursing task assigned successfully.'),
      ),
    );
    Navigator.pop(context, {
      'title': _taskName,
      'patient': _selectedPatient!['patient']['name'],
      'done': false
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC), // Soft gray background
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Assign Nursing Task',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
          : SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeaderCard(),
                  const SizedBox(height: 16),
                  _buildFormCard(),
                  const SizedBox(height: 20),
                  _buildStatsSection(),
                  const SizedBox(height: 20),
                  _buildShiftPendingSection(),
                  const SizedBox(height: 20),
                  _buildUpcomingSection(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Assign Nursing Task',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          SizedBox(height: 4),
          Text(
            'Create and assign nursing activities for patients.',
            style: TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Patient picker dropdown
          const Text(
            'Patient',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<dynamic>(
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: AppColors.slate50,
            ),
            hint: const Text('Select Admitted Patient...', style: TextStyle(fontSize: 12)),
            value: _selectedPatient,
            onChanged: (val) {
              setState(() {
                _selectedPatient = val;
              });
            },
            items: _inpatients.map((adm) {
              final pat = adm['patient'];
              final String name = pat != null ? pat['name'] : 'Unknown';
              final String uhid = pat != null ? pat['uhid'] : '';
              return DropdownMenuItem<dynamic>(
                value: adm,
                child: Text('$name ($uhid)', style: const TextStyle(fontSize: 12)),
              );
            }).toList(),
          ),

          // Selected Patient Info Subcard (matches mockup layout)
          if (_selectedPatient != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.navy50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.navy100),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.navy200,
                    child: Text(
                      _selectedPatient!['patient']['name'].substring(0, 1).toUpperCase(),
                      style: const TextStyle(color: AppColors.navy700, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedPatient!['patient']['name'],
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: ${_selectedPatient!['patient']['uhid'] ?? ''}  •  Ward: ${_selectedPatient!['ward'] ?? ''}  •  Room: ${_selectedPatient!['room'] != null ? _selectedPatient!['room']['roomNumber'] : 'N/A'}',
                          style: const TextStyle(fontSize: 9, color: AppColors.slate500, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),

          // 2. Task Name Dropdown
          const Text(
            'Task Name',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: AppColors.slate50,
            ),
            value: _taskName,
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _taskName = val;
                });
              }
            },
            items: _taskNameOptions.map((name) {
              return DropdownMenuItem<String>(
                value: name,
                child: Text(name, style: const TextStyle(fontSize: 12)),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // 3. Task Description TextArea
          const Text(
            'Task Description',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _descriptionController,
            maxLines: 4,
            style: const TextStyle(fontSize: 12),
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Enter clinical instructions, dosages, or vital alerts parameters...',
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 16),

          // 4. Priority Pills
          const Text(
            'Priority',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: _priorityOptions.map((p) {
              final isSelected = _priority == p;
              Color pColor = AppColors.slate400;
              Color bgPColor = AppColors.slate50;
              if (p == 'Low') {
                pColor = isSelected ? Colors.white : AppColors.emerald600;
                bgPColor = isSelected ? AppColors.emerald600 : AppColors.emerald50;
              } else if (p == 'Medium') {
                pColor = isSelected ? Colors.white : Colors.amber.shade800;
                bgPColor = isSelected ? Colors.amber.shade800 : Colors.amber.shade50;
              } else if (p == 'High') {
                pColor = isSelected ? Colors.white : Colors.orange.shade800;
                bgPColor = isSelected ? Colors.orange.shade800 : Colors.orange.shade50;
              } else if (p == 'Critical') {
                pColor = isSelected ? Colors.white : AppColors.errorRed;
                bgPColor = isSelected ? AppColors.errorRed : AppColors.errorBg;
              }

              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _priority = p;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: bgPColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: pColor.withOpacity(0.3)),
                    ),
                    child: Center(
                      child: Text(
                        p,
                        style: TextStyle(color: pColor, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // 5. Assign to Nurse Dropdown
          const Text(
            'Assign To',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: AppColors.slate50,
            ),
            hint: const Text('Select Nurse...', style: TextStyle(fontSize: 12)),
            value: _assignedNurseId,
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _assignedNurseId = val;
                });
              }
            },
            items: _nurses.map((nurse) {
              final String name = nurse['name'] ?? '';
              final String id = nurse['_id'] ?? '';
              final String empId = nurse['employeeId'] ?? 'Staff';
              return DropdownMenuItem<String>(
                value: id,
                child: Text('$name ($empId)', style: const TextStyle(fontSize: 12)),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // 6. Scheduling Due Date & Due Time
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Due Date', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _selectDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppColors.slate300),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_month_rounded, size: 14, color: AppColors.slate400),
                            const SizedBox(width: 8),
                            Text(
                              _dueDate == null
                                  ? 'Select Date'
                                  : '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate800),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Due Time', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _selectTime,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppColors.slate300),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.access_time_rounded, size: 14, color: AppColors.slate400),
                            const SizedBox(width: 8),
                            Text(
                              _dueTime == null ? 'Select Time' : _dueTime!.format(context),
                              style: const TextStyle(fontSize: 11, color: AppColors.slate800),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 7. Reminder switch Toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFEFF1F7)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active_rounded, size: 16, color: AppColors.navy700),
                    SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Notification Alerts', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                        Text('Enable notifications 15m prior', style: TextStyle(fontSize: 8, color: AppColors.slate500)),
                      ],
                    ),
                  ],
                ),
                Switch(
                  value: _reminder,
                  activeColor: AppColors.navy700,
                  onChanged: (val) {
                    setState(() {
                      _reminder = val;
                    });
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 8. Upload Attachments simulator
          const Text('Attachments', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () {
              setState(() {
                _attachments.add('scan_report_0${_attachments.length + 1}.pdf');
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                color: const Color(0xFFFAFAFA),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.none), // dashed border simulator
              ),
              child: const Column(
                children: [
                  Icon(Icons.cloud_upload_outlined, color: AppColors.slate400, size: 24),
                  SizedBox(height: 6),
                  Text('Tap to simulate attaching files', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                ],
              ),
            ),
          ),
          if (_attachments.isNotEmpty) ...[
            const SizedBox(height: 8),
            Column(
              children: _attachments.map((file) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(6)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.insert_drive_file_outlined, size: 14, color: AppColors.navy700),
                          const SizedBox(width: 8),
                          Text(file, style: const TextStyle(fontSize: 10, color: AppColors.slate800)),
                        ],
                      ),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _attachments.remove(file);
                          });
                        },
                        child: const Icon(Icons.close_rounded, size: 14, color: AppColors.errorRed),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 24),

          // Action Buttons
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
                  onPressed: () => _submitTask(false),
                  child: const Text('Assign Task', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
                  onPressed: () => _submitTask(true),
                  child: const Text('Save Draft', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.bar_chart_rounded, size: 16, color: AppColors.navy700),
              SizedBox(width: 8),
              Text('Task Statistics', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSingleStatMetric('Completion', '75%', AppColors.navy700),
              _buildSingleStatMetric('Critical Active', '1', AppColors.errorRed),
              _buildSingleStatMetric('Nurses Assigned', '${_nurses.length}', Colors.blue),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSingleStatMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.slate500, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildShiftPendingSection() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.playlist_play_rounded, size: 18, color: AppColors.navy700),
                  SizedBox(width: 8),
                  Text('Shift Pending Tasks', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                child: const Text('TODAY', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppColors.navy700)),
              )
            ],
          ),
          const SizedBox(height: 14),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _shiftPendingTasks.length,
            separatorBuilder: (context, i) => const Divider(color: AppColors.slate100, height: 1),
            itemBuilder: (context, index) {
              final task = _shiftPendingTasks[index];
              Color pColor = AppColors.slate400;
              if (task['priority'] == 'Critical') pColor = AppColors.errorRed;
              if (task['priority'] == 'High') pColor = Colors.orange;

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(task['title'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                          const SizedBox(height: 2),
                          Text('Patient: ${task['patient']}', style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(task['due'], style: TextStyle(fontSize: 9, color: pColor, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(task['priority'], style: const TextStyle(fontSize: 8, color: AppColors.slate400)),
                      ],
                    )
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingSection() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.navy700),
              SizedBox(width: 8),
              Text('Upcoming Tasks', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ],
          ),
          const SizedBox(height: 14),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _upcomingTasks.length,
            separatorBuilder: (context, i) => const Divider(color: AppColors.slate100, height: 1),
            itemBuilder: (context, index) {
              final task = _upcomingTasks[index];
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(task['title'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Patient: ${task['patient']}', style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
                        Text(task['time'], style: const TextStyle(fontSize: 9, color: AppColors.slate400, fontWeight: FontWeight.bold)),
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
