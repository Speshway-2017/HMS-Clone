import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/user_session.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';
import '../../nurse/services/nurse_service.dart';
import '../services/admin_api_service.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _currentIndex = 0;
  final List<int> _navigationHistory = [0];
  bool _isLoading = true;

  final AdminApiService _apiService = AdminApiService();
  final NurseService _nurseService = NurseService();

  // Dynamic Backend Data
  Map<String, dynamic>? _hospitalProfile;
  List<Map<String, dynamic>> _branches = [];
  List<Map<String, dynamic>> _departments = [];
  List<Map<String, dynamic>> _doctors = [];
  List<Map<String, dynamic>> _staff = [];
  List<Map<String, dynamic>> _roles = [];
  Map<String, dynamic>? _analytics;
  List<Map<String, dynamic>> _enquiries = [];
  List<Map<String, dynamic>> _beds = [];
  List<Map<String, dynamic>> _wards = [];

  // Filter & Search States
  String _infraSubFilter = 'Departments';
  String _staffSubFilter = 'All Doctors';
  String _analyticsSubFilter = 'Analytics Metrics';
  String _selectedWardFilter = 'All Wards';
  String _selectedRoomFilter = 'All Rooms';
  String _selectedStatusFilter = 'All Statuses';
  String _bedViewMode = 'grid';

  final TextEditingController _deptSearchController = TextEditingController();
  final TextEditingController _staffSearchController = TextEditingController();
  final TextEditingController _bedSearchController = TextEditingController();

  // Form Controllers for Comprehensive Modals (Web Parity)
  final TextEditingController _formNameController = TextEditingController();
  final TextEditingController _formCodeController = TextEditingController();
  final TextEditingController _formDescController = TextEditingController();
  final TextEditingController _formPhoneController = TextEditingController();
  final TextEditingController _formEmailController = TextEditingController();
  final TextEditingController _formFeeController = TextEditingController();
  final TextEditingController _formLocationController = TextEditingController();
  final TextEditingController _formQualController = TextEditingController();
  final TextEditingController _formBioController = TextEditingController();
  final TextEditingController _formStateController = TextEditingController();
  final TextEditingController _formAddressController = TextEditingController();
  final TextEditingController _formBedsController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadAllAdminData();
  }

  @override
  void dispose() {
    _deptSearchController.dispose();
    _staffSearchController.dispose();
    _bedSearchController.dispose();
    _formNameController.dispose();
    _formCodeController.dispose();
    _formDescController.dispose();
    _formPhoneController.dispose();
    _formEmailController.dispose();
    _formFeeController.dispose();
    _formLocationController.dispose();
    _formQualController.dispose();
    _formBioController.dispose();
    _formStateController.dispose();
    _formAddressController.dispose();
    _formBedsController.dispose();
    super.dispose();
  }

  Future<void> _loadAllAdminData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final results = await Future.wait([
        _apiService.fetchHospitalProfile().catchError((_) => null),
        _apiService.fetchBranches().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.fetchDepartments().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.fetchDoctors().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.fetchStaff().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.fetchRoles().catchError((_) => <Map<String, dynamic>>[]),
        _apiService.fetchHospitalAnalytics().catchError((_) => null),
        _apiService.fetchEnquiries().catchError((_) => <Map<String, dynamic>>[]),
        _nurseService.getBeds().catchError((_) => <dynamic>[]),
        _nurseService.getWards().catchError((_) => <dynamic>[]),
        _nurseService.getInpatients().catchError((_) => <dynamic>[]),
        _apiService.fetchUserProfile().catchError((_) => null),
      ]);

      final hospProfile = results[0] as Map<String, dynamic>?;
      final branchesData = results[1] as List<Map<String, dynamic>>;
      List<Map<String, dynamic>> deptsData = results[2] as List<Map<String, dynamic>>;
      List<Map<String, dynamic>> docsData = results[3] as List<Map<String, dynamic>>;
      List<Map<String, dynamic>> staffData = results[4] as List<Map<String, dynamic>>;
      final rolesData = results[5] as List<Map<String, dynamic>>;
      final analyticsData = results[6] as Map<String, dynamic>?;
      final enquiriesData = results[7] as List<Map<String, dynamic>>;
      List<dynamic> bedsRaw = results[8] as List<dynamic>;
      List<dynamic> wardsRaw = results[9] as List<dynamic>;
      List<dynamic> inpatientsRaw = results[10] as List<dynamic>;

      // Calculate real-time totalStaff for each branch if 0 or missing
      for (var b in branchesData) {
        final bId = b['_id']?.toString() ?? b['branchId']?.toString() ?? '';
        final int docCount = docsData.where((d) {
          final br = d['branch']?.toString() ?? d['branchId']?.toString() ?? '';
          return br == bId;
        }).length;
        final int stCount = staffData.where((s) {
          final br = s['branch']?.toString() ?? s['branchId']?.toString() ?? '';
          return br == bId;
        }).length;
        final int computed = docCount + stCount;
        if (computed > (b['totalStaff'] as int? ?? 0)) {
          b['totalStaff'] = computed;
        }
      }

      // Strictly isolate data if a specific branch is selected
      final currentBranch = UserSession.selectedBranchId;
      
      bool matchesBranch(dynamic item) {
        if (currentBranch == 'all') return true;
        if (item is! Map) return true;

        final branchVal = item['branch'] ?? item['branchId'];
        String? bId;
        if (branchVal is Map) {
          bId = branchVal['_id']?.toString() ?? branchVal['id']?.toString();
        } else if (branchVal != null) {
          bId = branchVal.toString();
        }

        // Check nested ward branch if present (e.g. in Bed or Room object)
        if (bId == null || bId.isEmpty) {
          final wardVal = item['ward'];
          if (wardVal is Map) {
            final wBranch = wardVal['branch'] ?? wardVal['branchId'];
            if (wBranch is Map) {
              bId = wBranch['_id']?.toString() ?? wBranch['id']?.toString();
            } else if (wBranch != null) {
              bId = wBranch.toString();
            }
          }
        }

        if (currentBranch == 'main') {
          return bId == null || bId.isEmpty || bId == 'null' || bId == 'main';
        } else {
          return bId == currentBranch;
        }
      }

      if (currentBranch != 'all') {
        deptsData = deptsData.where(matchesBranch).toList();
        docsData = docsData.where(matchesBranch).toList();
        staffData = staffData.where(matchesBranch).toList();
        wardsRaw = wardsRaw.where(matchesBranch).toList();
        bedsRaw = bedsRaw.where(matchesBranch).toList();
        inpatientsRaw = inpatientsRaw.where(matchesBranch).toList();
      }

      // Map Inpatient data for bed roster
      final List<Map<String, dynamic>> mappedPatients = [];
      for (var adm in inpatientsRaw) {
        final patient = adm['patient'];
        if (patient == null) continue;
        final vitalsList = adm['vitals'] as List<dynamic>? ?? [];
        final lastVital = vitalsList.isNotEmpty ? vitalsList.last : null;
        mappedPatients.add({
          'id': patient['_id'] ?? '',
          'name': patient['name'] ?? 'Unknown Patient',
          'uhid': patient['uhid'] ?? '',
          'doctor': (adm['admittingDoctor']?['name'] != null)
              ? 'Dr. ${adm['admittingDoctor']['name']}'
              : 'Dr. Attending',
          'bp': lastVital != null ? (lastVital['bloodPressure'] ?? '--/--') : '--/--',
          'pulse': lastVital != null ? (lastVital['pulseRate'] ?? '--') : '--',
          'spo2': lastVital != null ? (lastVital['oxygenSaturation'] ?? '--') : '--',
          'temp': lastVital != null ? (lastVital['temperature'] ?? '--') : '--',
        });
      }

      // Map Beds
      final List<Map<String, dynamic>> mappedBeds = [];
      for (var b in bedsRaw) {
        final bedCode = b['bedCode'] ?? b['bedNumber'] ?? 'Bed';
        final rawStatus = b['status']?.toString() ?? 'Available';
        final bool isOccupied = b['isOccupied'] == true || rawStatus.toLowerCase() == 'occupied';
        final wardObj = b['ward'];
        final wardName = wardObj is Map ? (wardObj['name'] ?? 'General Ward A') : (wardObj?.toString() ?? 'General Ward A');
        final roomObj = b['room'];
        final roomNum = roomObj is Map ? (roomObj['roomNumber']?.toString() ?? '101') : (roomObj?.toString() ?? '101');

        Map<String, dynamic>? pAssigned;
        if (isOccupied) {
          final bedIdStr = b['_id']?.toString();
          for (var adm in inpatientsRaw) {
            final admBed = adm['bed'];
            final admBedId = admBed is Map ? admBed['_id']?.toString() : admBed?.toString();
            if (admBedId != null && admBedId == bedIdStr) {
              final patient = adm['patient'] as Map<String, dynamic>?;
              if (patient != null) {
                final vitalsList = adm['vitals'] as List<dynamic>? ?? [];
                final lastVital = vitalsList.isNotEmpty ? vitalsList.last : null;
                pAssigned = {
                  'id': patient['_id'] ?? '',
                  'name': patient['name'] ?? 'Inpatient',
                  'uhid': patient['uhid'] ?? '',
                  'doctor': (adm['admittingDoctor']?['name'] != null) ? 'Dr. ${adm['admittingDoctor']['name']}' : 'Dr. Attending',
                  'bp': lastVital != null ? (lastVital['bloodPressure'] ?? '--/--') : '--/--',
                  'pulse': lastVital != null ? (lastVital['pulseRate'] ?? '--') : '--',
                  'spo2': lastVital != null ? (lastVital['oxygenSaturation'] ?? '--') : '--',
                  'temp': lastVital != null ? (lastVital['temperature'] ?? '--') : '--',
                };
              }
              break;
            }
          }
          if (pAssigned == null && b['patient'] is Map) {
            final p = b['patient'] as Map;
            pAssigned = {
              'id': p['_id'] ?? '',
              'name': p['name'] ?? 'Inpatient',
              'uhid': p['uhid'] ?? '',
              'doctor': 'Dr. Attending',
              'bp': '--/--',
              'pulse': '--',
              'spo2': '--',
              'temp': '--',
            };
          }
        }

        mappedBeds.add({
          'id': b['_id']?.toString() ?? bedCode,
          'bedCode': bedCode,
          'wardName': wardName,
          'roomNumber': roomNum,
          'status': isOccupied ? 'Occupied' : rawStatus,
          'isOccupied': isOccupied,
          'patientName': pAssigned != null ? pAssigned['name'] : (b['patient']?['name']),
          'patientUhid': pAssigned != null ? pAssigned['uhid'] : (b['patient']?['uhid']),
          'doctor': pAssigned != null ? pAssigned['doctor'] : null,
          'bp': pAssigned != null ? pAssigned['bp'] : '--/--',
          'pulse': pAssigned != null ? pAssigned['pulse'] : '--',
          'spo2': pAssigned != null ? pAssigned['spo2'] : '--',
          'temp': pAssigned != null ? pAssigned['temp'] : '--',
        });
      }

      // Map Wards
      final List<Map<String, dynamic>> mappedWards = [];
      for (var w in wardsRaw) {
        final wName = w['name']?.toString() ?? 'Ward';
        int occupied = mappedBeds.where((b) => (b['wardName'] ?? '').toString().toLowerCase().contains(wName.toLowerCase()) && b['isOccupied'] == true).length;
        int total = mappedBeds.where((b) => (b['wardName'] ?? '').toString().toLowerCase().contains(wName.toLowerCase())).length;
        if (total == 0) total = occupied + 4;

        mappedWards.add({
          'id': w['_id']?.toString() ?? wName,
          'name': wName,
          'code': w['code']?.toString() ?? 'WRD',
          'wardType': w['wardType']?.toString() ?? 'General',
          'occupiedBeds': occupied,
          'totalBeds': total,
          'availableBeds': total - occupied,
          'occupancyRate': total > 0 ? (occupied / total * 100).round() : 0,
        });
      }

      if (mounted) {
        setState(() {
          _hospitalProfile = hospProfile;
          _branches = branchesData;
          _departments = deptsData;
          _doctors = docsData;
          _staff = staffData;
          _roles = rolesData;
          _analytics = analyticsData;
          _enquiries = enquiriesData;
          _beds = mappedBeds;
          _wards = mappedWards;
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

  void _onBranchChanged(String newBranchId, String branchName) {
    UserSession.selectedBranchId = newBranchId;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: AppColors.emerald400, size: 18),
            const SizedBox(width: 10),
            Text('Switched branch scope to: $branchName', style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        duration: const Duration(seconds: 2),
        backgroundColor: AppColors.navy900,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    _loadAllAdminData();
  }

  void _switchTab(int newIndex, [String? subFilter]) {
    setState(() {
      if (subFilter != null) {
        if (newIndex == 1) _infraSubFilter = subFilter;
        if (newIndex == 3) _staffSubFilter = subFilter;
        if (newIndex == 4) _analyticsSubFilter = subFilter;
      }
      if (_currentIndex != newIndex) {
        _navigationHistory.add(newIndex);
        _currentIndex = newIndex;
      }
    });
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

  String get _hospitalName {
    return _hospitalProfile?['name']?.toString() ?? UserSession.user?['hospitalName'] ?? 'Sunrise Hospital';
  }

  String get _activeBranchLabel {
    final currentId = UserSession.selectedBranchId;
    if (currentId == 'main') return 'Main Hospital';
    if (currentId == 'all') return 'All Branches';
    final match = _branches.firstWhere(
      (b) => b['_id']?.toString() == currentId || b['branchId']?.toString() == currentId,
      orElse: () => {'name': 'Branch'},
    );
    return match['name']?.toString() ?? 'Branch';
  }

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    final List<Widget> pages = [
      _buildHomeOverviewTab(responsive),
      _buildInfrastructureTab(responsive),
      const SizedBox.shrink(), // Index 2 is Center Branch Switcher Trigger
      _buildStaffAndRolesTab(responsive),
      _buildAnalyticsAndFinanceTab(responsive),
    ];

    final safeIndex = _currentIndex < pages.length ? _currentIndex : 0;

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
            onRefresh: _loadAllAdminData,
            color: AppColors.navy700,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.navy700))
                : pages[safeIndex],
          ),
        ),
        bottomNavigationBar: _buildFiveSectionBottomNavbar(),
      ),
    );
  }

  // --- CLEAN TOP APP BAR WITH ACTIVE BRANCH SCOPE BADGE ---
  PreferredSizeWidget _buildTopAppBar() {
    return AppBar(
      backgroundColor: AppColors.navy700,
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 16.0,
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'HMS Admin Portal',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.3),
                  ),
                  Text(
                    _hospitalName,
                    style: TextStyle(fontSize: 10, color: AppColors.navy100.withOpacity(0.8)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),

          // ACTIVE BRANCH PILL BADGE IN HEADER
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: AppColors.emerald400,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _activeBranchLabel,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
          ),

          // Action Controls (Add Dept/Branch & Profile Avatar)
          Row(
            children: [
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                icon: const Icon(Icons.add_circle_outline_rounded, color: Colors.white, size: 20),
                tooltip: 'Quick Operations',
                onPressed: _showQuickManageModal,
              ),
              const SizedBox(width: 4),
              Builder(
                builder: (context) {
                  final String? profilePath = UserSession.profileImagePath;
                  ImageProvider? avatarImg;
                  if (profilePath != null && profilePath.isNotEmpty) {
                    if (profilePath.startsWith('http://') || profilePath.startsWith('https://')) {
                      avatarImg = NetworkImage(profilePath);
                    } else if (File(profilePath).existsSync()) {
                      avatarImg = FileImage(File(profilePath));
                    }
                  }

                  return IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    icon: CircleAvatar(
                      radius: 14,
                      backgroundColor: AppColors.emerald500,
                      backgroundImage: avatarImg,
                      child: avatarImg == null
                          ? Text(
                              UserSession.userName.isNotEmpty ? UserSession.userName[0].toUpperCase() : 'A',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                            )
                          : null,
                    ),
                    tooltip: 'Admin Profile & Settings',
                    onPressed: () async {
                      await Navigator.pushNamed(context, AppRoutes.adminProfile);
                      if (mounted) setState(() {});
                    },
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 5-SECTION BOTTOM NAVIGATION BAR WITH SIMPLE PEACEFUL CENTER BRANCH SWITCHER ---
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
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(index: 0, icon: Icons.grid_view_rounded, label: 'Overview'),
              _buildNavItem(index: 1, icon: Icons.business_rounded, label: 'Infra & Depts'),
              _buildSimplePeacefulBranchSwitcher(),
              _buildNavItem(index: 3, icon: Icons.people_alt_rounded, label: 'Staff & Roles'),
              _buildNavItem(index: 4, icon: Icons.bar_chart_rounded, label: 'Analytics'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({required int index, required IconData icon, required String label}) {
    final isSelected = _currentIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => _switchTab(index),
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? AppColors.navy700 : const Color(0xFF94A3B8),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? AppColors.navy700 : const Color(0xFF64748B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // UNIFORM PEACEFUL CENTER BRANCH SWITCHER TAB
  Widget _buildSimplePeacefulBranchSwitcher() {
    return Expanded(
      child: InkWell(
        onTap: () => _showBranchPickerModal(context),
        borderRadius: BorderRadius.circular(12),
        splashColor: AppColors.navy50,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.navy50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.navy700.withOpacity(0.2), width: 1.0),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.navy700),
                  SizedBox(width: 2),
                  Icon(Icons.keyboard_arrow_down_rounded, size: 12, color: AppColors.navy700),
                ],
              ),
            ),
            const SizedBox(height: 3),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 68),
              child: Text(
                _activeBranchLabel,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ANIMATED BRANCH SELECTION MODAL
  void _showBranchPickerModal(BuildContext context) {
    final currentBranchId = UserSession.selectedBranchId;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Hero Banner inside Modal
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.navy800, AppColors.navy950],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.location_city_rounded, color: AppColors.emerald400, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Active Branch Network Scope',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Select a branch to isolate and view its real-time operational data.',
                            style: TextStyle(fontSize: 11, color: AppColors.navy100.withOpacity(0.8)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              const Text('Available Network Scopes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              const SizedBox(height: 12),

              // Option 1: All Branches Master View
              _buildBranchOptionCard(
                ctx: ctx,
                id: 'all',
                title: 'All Network Branches',
                subtitle: 'Consolidated overview across all hospital branches',
                icon: Icons.hub_rounded,
                isSelected: currentBranchId == 'all',
                onTap: () {
                  Navigator.pop(ctx);
                  _onBranchChanged('all', 'All Branches');
                },
              ),

              // Option 2: Main Hospital
              _buildBranchOptionCard(
                ctx: ctx,
                id: 'main',
                title: 'Main Hospital Campus',
                subtitle: 'Primary central hospital facility data',
                icon: Icons.local_hospital_rounded,
                isSelected: currentBranchId == 'main',
                onTap: () {
                  Navigator.pop(ctx);
                  _onBranchChanged('main', 'Main Hospital');
                },
              ),

              // Option 3+: Dynamic Branches from DB
              if (_branches.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),
                ..._branches.map((b) {
                  final id = b['_id']?.toString() ?? b['branchId']?.toString() ?? '';
                  final bName = b['name']?.toString() ?? 'Branch';
                  final city = b['city']?.toString() ?? 'City';
                  final state = b['state']?.toString() ?? '';
                  final staffCount = b['totalStaff'] ?? 0;

                  return _buildBranchOptionCard(
                    ctx: ctx,
                    id: id,
                    title: bName,
                    subtitle: '$city${state.isNotEmpty ? ", $state" : ""} • $staffCount Staff',
                    icon: Icons.location_city_rounded,
                    isSelected: currentBranchId == id,
                    onTap: () {
                      Navigator.pop(ctx);
                      _onBranchChanged(id, bName);
                    },
                  );
                }),
              ],

              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBranchOptionCard({
    required BuildContext ctx,
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.navy50 : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? AppColors.navy700 : const Color(0xFFE2E8F0),
          width: isSelected ? 1.8 : 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          onTap: onTap,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.navy700 : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: isSelected ? Colors.white : AppColors.navy700, size: 20),
          ),
          title: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isSelected ? AppColors.navy900 : AppColors.slate900,
            ),
          ),
          subtitle: Text(
            subtitle,
            style: TextStyle(
              fontSize: 11,
              color: isSelected ? AppColors.navy700 : const Color(0xFF64748B),
            ),
          ),
          trailing: isSelected
              ? const Icon(Icons.check_circle_rounded, color: AppColors.emerald600, size: 20)
              : const Icon(Icons.radio_button_unchecked_rounded, color: Color(0xFFCBD5E1), size: 20),
        ),
      ),
    );
  }

  // --- TAB 0: HOME OVERVIEW ---
  Widget _buildHomeOverviewTab(ResponsiveHelper responsive) {
    final int totalBedsCount = _beds.length;
    final int occupiedBedsCount = _beds.where((b) => b['isOccupied'] == true).length;
    final int availableBedsCount = _beds.where((b) => b['isOccupied'] != true && b['status'] != 'Maintenance').length;
    final int occupancyRate = totalBedsCount > 0 ? (occupiedBedsCount / totalBedsCount * 100).round() : 0;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Welcome Banner
          _buildWelcomeBanner(responsive),
          const SizedBox(height: 20),

          // 2. Capacity KPI Cards Grid
          const Text(
            'Network Bed & Capacity Summary',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 10),
          _buildKpiGrid(responsive, totalBedsCount, occupiedBedsCount, availableBedsCount, occupancyRate),
          const SizedBox(height: 24),

          // 3. Quick Stats Strip
          _buildSystemStatsStrip(),
          const SizedBox(height: 24),

          // 4. All Modules Quick Actions Grid
          const Text(
            'Admin Modules & Quick Operations',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          _buildQuickOperationsGrid(),
          const SizedBox(height: 24),

          // 5. Live Bed Roster Section
          _buildEnhancedWardsAndBedsModule(),
        ],
      ),
    );
  }

  Widget _buildSubHeaderWithBack(List<String> subFilters, String currentFilter, ValueChanged<String> onSelected) {
    return Row(
      children: [
        InkWell(
          onTap: _goBack,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: AppColors.navy700),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: subFilters.map((sf) {
                final isSelected = currentFilter == sf;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(sf),
                    selected: isSelected,
                    selectedColor: AppColors.navy700,
                    backgroundColor: Colors.white,
                    side: BorderSide(color: isSelected ? AppColors.navy700 : const Color(0xFFE2E8F0)),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      fontSize: 12,
                    ),
                    onSelected: (val) {
                      if (val) onSelected(sf);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  // --- TAB 1: INFRASTRUCTURE (DEPARTMENTS, BRANCHES, WARDS/BEDS, RULES) ---
  Widget _buildInfrastructureTab(ResponsiveHelper responsive) {
    final subFilters = ['Departments', 'Branches', 'Wards & Beds', 'Hospital Rules', 'Hospital Details'];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSubHeaderWithBack(subFilters, _infraSubFilter, (val) => setState(() => _infraSubFilter = val)),
          const SizedBox(height: 16),

          if (_infraSubFilter == 'Departments') _buildDepartmentsSubView(),
          if (_infraSubFilter == 'Branches') _buildBranchesSubView(),
          if (_infraSubFilter == 'Wards & Beds') _buildWardsSubView(),
          if (_infraSubFilter == 'Hospital Rules') _buildHospitalRulesSubView(),
          if (_infraSubFilter == 'Hospital Details') _buildHospitalDetailsSubView(),
        ],
      ),
    );
  }

  // --- TAB 3: STAFF & ROLES (DOCTORS, STAFF, ADMINS, ROLES) ---
  Widget _buildStaffAndRolesTab(ResponsiveHelper responsive) {
    final subFilters = ['All Doctors', 'Nursing Staff', 'Admins', 'Roles & RBAC'];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: subFilters.map((sf) {
                final isSelected = _staffSubFilter == sf;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(sf),
                    selected: isSelected,
                    selectedColor: AppColors.navy700,
                    backgroundColor: Colors.white,
                    side: BorderSide(color: isSelected ? AppColors.navy700 : const Color(0xFFE2E8F0)),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      fontSize: 12,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _staffSubFilter = sf);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          if (_staffSubFilter == 'All Doctors') _buildDoctorsSubView(),
          if (_staffSubFilter == 'Nursing Staff') _buildNursingStaffSubView(),
          if (_staffSubFilter == 'Admins') _buildAdminsSubView(),
          if (_staffSubFilter == 'Roles & RBAC') _buildRolesSubView(),
        ],
      ),
    );
  }

  // --- TAB 4: ANALYTICS & FINANCE ---
  Widget _buildAnalyticsAndFinanceTab(ResponsiveHelper responsive) {
    final subFilters = ['Analytics Metrics', 'Financial Reports', 'Enquiries', 'Hospital Rules'];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: subFilters.map((sf) {
                final isSelected = _analyticsSubFilter == sf;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(sf),
                    selected: isSelected,
                    selectedColor: AppColors.navy700,
                    backgroundColor: Colors.white,
                    side: BorderSide(color: isSelected ? AppColors.navy700 : const Color(0xFFE2E8F0)),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      fontSize: 12,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _analyticsSubFilter = sf);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          if (_analyticsSubFilter == 'Analytics Metrics') _buildAnalyticsSubView(),
          if (_analyticsSubFilter == 'Financial Reports') _buildFinancialReportsSubView(),
          if (_analyticsSubFilter == 'Enquiries') _buildEnquiriesSubView(),
          if (_analyticsSubFilter == 'Hospital Rules' || _analyticsSubFilter == 'Hospital Settings') _buildHospitalRulesSubView(),
        ],
      ),
    );
  }

  // --- SUB-VIEWS IMPLEMENTATION ---

  Widget _buildReadOnlyBanner() {
    if (UserSession.selectedBranchId != 'all') return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(
        children: const [
          Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF1D4ED8)),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Read-Only Network Mode: Select a specific branch to add, edit, or delete items.',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF)),
            ),
          ),
        ],
      ),
    );
  }

  void _checkBranchScopeAndRun(String actionName, VoidCallback onScopeValid) {
    if (UserSession.selectedBranchId == 'all') {
      showDialog(
        context: context,
        builder: (ctx) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: const [
                Icon(Icons.info_outline_rounded, color: AppColors.navy700, size: 24),
                SizedBox(width: 10),
                Text('Branch Scope Required', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: Text(
              'You are currently viewing "All Network Branches" in Read-Only mode. To $actionName, please select a specific target branch.',
              style: const TextStyle(fontSize: 13, color: AppColors.slate800),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700),
                onPressed: () {
                  Navigator.pop(ctx);
                  _showBranchPickerModal(context);
                },
                child: const Text('Select Branch'),
              ),
            ],
          );
        },
      );
    } else {
      onScopeValid();
    }
  }

  // 1. DEPARTMENTS SUB-VIEW
  Widget _buildDepartmentsSubView() {
    final filtered = _departments.where((d) {
      final name = (d['name'] ?? '').toString().toLowerCase();
      final spec = (d['specialization'] ?? '').toString().toLowerCase();
      final query = _deptSearchController.text.toLowerCase();
      return name.contains(query) || spec.contains(query);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Departments (${_departments.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _checkBranchScopeAndRun('add department', _showAddDepartmentModal),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add Dept', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Search Input
        TextField(
          controller: _deptSearchController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Search department by name or specialty...',
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.slate400, size: 18),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            fillColor: Colors.white,
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          ),
        ),
        const SizedBox(height: 14),

        filtered.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No departments found for active branch scope.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final dept = filtered[index];
                  final name = dept['name'] ?? 'Department';
                  final code = dept['code'] ?? 'DEPT';
                  final spec = dept['specialization'] ?? 'General Specialty';
                  final status = (dept['status'] ?? 'operational').toString();
                  final fee = dept['consultationFee'] ?? 500;
                  final docs = dept['doctors'] ?? 0;
                  final beds = dept['totalBeds'] ?? 0;
                  final isEmergency = dept['isEmergency'] == true;
                  final isDisabled = dept['isDisabled'] == true;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                                  child: Text(code, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.navy700)),
                                ),
                                const SizedBox(width: 8),
                                Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDisabled ? const Color(0xFFFEE2E2) : AppColors.emerald50,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isDisabled ? 'INACTIVE' : status.toUpperCase(),
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: isDisabled ? Colors.red : AppColors.emerald600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(spec, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Doctors: $docs • Beds: $beds', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                            Text('Fee: ₹$fee', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                          ],
                        ),
                        if (isEmergency) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                            child: const Text('🚨 24/7 Emergency Services Active', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.red)),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 2. BRANCHES SUB-VIEW
  Widget _buildBranchesSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Hospital Branches (${_branches.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _checkBranchScopeAndRun('add branch', _showAddBranchModal),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add Branch', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 14),

        _branches.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No branches added yet.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _branches.length,
                itemBuilder: (context, index) {
                  final b = _branches[index];
                  final name = b['name'] ?? 'Branch Name';
                  final bId = b['branchId'] ?? 'BR-${index + 1}';
                  final city = b['city'] ?? 'City';
                  final state = b['state'] ?? 'State';
                  final staffCount = b['totalStaff'] ?? 0;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.location_city_rounded, color: AppColors.navy700, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                              const SizedBox(height: 2),
                              Text('$city, $state • ID: $bId', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                          child: Text('$staffCount Staff', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 3. WARDS & BEDS ENHANCED SUB-VIEW
  Widget _buildWardsSubView() {
    return _buildEnhancedWardsAndBedsModule();
  }

  Widget _buildEnhancedWardsAndBedsModule() {
    final int totalWardsCount = _wards.length;
    final int totalBedsCount = _beds.length;
    final int occupiedBedsCount = _beds.where((b) => b['isOccupied'] == true || b['status'] == 'Occupied').length;
    final int availableBedsCount = _beds.where((b) => b['isOccupied'] != true && (b['status'] == 'Available' || b['status'] == null)).length;
    final int occupancyRate = totalBedsCount > 0 ? (occupiedBedsCount / totalBedsCount * 100).round() : 0;

    final List<String> wardOptions = [
      'All Wards',
      ..._wards.map((w) => w['name']?.toString() ?? '').where((n) => n.isNotEmpty)
    ];

    final Set<String> roomSet = {'All Rooms'};
    for (var b in _beds) {
      final wName = (b['wardName'] ?? '').toString();
      final rNum = (b['roomNumber'] ?? '').toString();
      if (_selectedWardFilter == 'All Wards' || wName.toLowerCase().contains(_selectedWardFilter.toLowerCase())) {
        if (rNum.isNotEmpty) roomSet.add('Room $rNum');
      }
    }
    final List<String> roomOptions = roomSet.toList();

    final String query = _bedSearchController.text.trim().toLowerCase();
    final List<Map<String, dynamic>> filteredBeds = _beds.where((b) {
      final bCode = (b['bedCode'] ?? b['id'] ?? '').toString().toLowerCase();
      final wName = (b['wardName'] ?? '').toString().toLowerCase();
      final rNum = (b['roomNumber'] ?? '').toString().toLowerCase();
      final pName = (b['patientName'] ?? '').toString().toLowerCase();
      final pUhid = (b['patientUhid'] ?? '').toString().toLowerCase();
      final status = (b['status'] ?? 'Available').toString();

      final bool matchesSearch = query.isEmpty ||
          bCode.contains(query) ||
          wName.contains(query) ||
          rNum.contains(query) ||
          pName.contains(query) ||
          pUhid.contains(query);

      final bool matchesWard = _selectedWardFilter == 'All Wards' || wName.contains(_selectedWardFilter.toLowerCase());
      final bool matchesRoom = _selectedRoomFilter == 'All Rooms' || 'room $rNum' == _selectedRoomFilter.toLowerCase() || rNum == _selectedRoomFilter.toLowerCase();

      bool matchesStatus = true;
      if (_selectedStatusFilter == 'Available') {
        matchesStatus = b['isOccupied'] != true && (status == 'Available' || status == 'Vacant');
      } else if (_selectedStatusFilter == 'Occupied') {
        matchesStatus = b['isOccupied'] == true || status == 'Occupied';
      } else if (_selectedStatusFilter == 'Maintenance') {
        matchesStatus = status == 'Maintenance' || status == 'Cleaning';
      } else if (_selectedStatusFilter == 'Reserved') {
        matchesStatus = status == 'Reserved' || status == 'Blocked';
      }

      return matchesSearch && matchesWard && matchesRoom && matchesStatus;
    }).toList();

    final Map<String, List<Map<String, dynamic>>> groupedByRoom = {};
    for (var b in filteredBeds) {
      final key = '${b['wardName'] ?? 'General Ward'} • Room ${b['roomNumber'] ?? '101'}';
      groupedByRoom.putIfAbsent(key, () => []).add(b);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Wards & Bed Capacity Matrix', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                    child: Text('$occupancyRate% Occupancy Rate', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildCapacityMiniStat('WARDS', '$totalWardsCount', AppColors.navy700, const Color(0xFFF1F5F9)),
                  const SizedBox(width: 8),
                  _buildCapacityMiniStat('TOTAL BEDS', '$totalBedsCount', AppColors.slate900, const Color(0xFFF8FAFC)),
                  const SizedBox(width: 8),
                  _buildCapacityMiniStat('VACANT', '$availableBedsCount', AppColors.emerald600, AppColors.emerald50),
                  const SizedBox(width: 8),
                  _buildCapacityMiniStat('OCCUPIED', '$occupiedBedsCount', Colors.red.shade700, Colors.red.shade50),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        TextField(
          controller: _bedSearchController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Search bed #, room #, ward, or patient name/UHID...',
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.slate400, size: 18),
            suffixIcon: _bedSearchController.text.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear_rounded, size: 16), onPressed: () => setState(() => _bedSearchController.clear()))
                : null,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            fillColor: Colors.white,
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          ),
        ),
        const SizedBox(height: 12),

        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFCBD5E1))),
                child: DropdownButton<String>(
                  value: wardOptions.contains(_selectedWardFilter) ? _selectedWardFilter : 'All Wards',
                  underline: const SizedBox(),
                  icon: const Icon(Icons.arrow_drop_down_rounded, color: AppColors.navy700),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  items: wardOptions.map((w) => DropdownMenuItem(value: w, child: Text('Ward: $w'))).toList(),
                  onChanged: (val) => setState(() {
                    _selectedWardFilter = val ?? 'All Wards';
                    _selectedRoomFilter = 'All Rooms';
                  }),
                ),
              ),
              const SizedBox(width: 8),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFCBD5E1))),
                child: DropdownButton<String>(
                  value: roomOptions.contains(_selectedRoomFilter) ? _selectedRoomFilter : 'All Rooms',
                  underline: const SizedBox(),
                  icon: const Icon(Icons.arrow_drop_down_rounded, color: AppColors.navy700),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  items: roomOptions.map((r) => DropdownMenuItem(value: r, child: Text('Room: $r'))).toList(),
                  onChanged: (val) => setState(() => _selectedRoomFilter = val ?? 'All Rooms'),
                ),
              ),
              const SizedBox(width: 8),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFCBD5E1))),
                child: DropdownButton<String>(
                  value: ['All Statuses', 'Available', 'Occupied', 'Maintenance', 'Reserved'].contains(_selectedStatusFilter) ? _selectedStatusFilter : 'All Statuses',
                  underline: const SizedBox(),
                  icon: const Icon(Icons.arrow_drop_down_rounded, color: AppColors.navy700),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  items: const [
                    DropdownMenuItem(value: 'All Statuses', child: Text('Status: All Statuses')),
                    DropdownMenuItem(value: 'Available', child: Text('Status: 🟢 Vacant')),
                    DropdownMenuItem(value: 'Occupied', child: Text('Status: 🔴 Occupied')),
                    DropdownMenuItem(value: 'Maintenance', child: Text('Status: 🟡 Maintenance')),
                    DropdownMenuItem(value: 'Reserved', child: Text('Status: 🔵 Reserved')),
                  ],
                  onChanged: (val) => setState(() => _selectedStatusFilter = val ?? 'All Statuses'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Filtered Bed Slots (${filteredBeds.length})', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            Container(
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  InkWell(
                    onTap: () => setState(() => _bedViewMode = 'grid'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _bedViewMode == 'grid' ? AppColors.navy700 : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.grid_view_rounded, size: 14, color: _bedViewMode == 'grid' ? Colors.white : AppColors.slate600),
                          const SizedBox(width: 4),
                          Text('Slot Grid', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _bedViewMode == 'grid' ? Colors.white : AppColors.slate700)),
                        ],
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => setState(() => _bedViewMode = 'list'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _bedViewMode == 'list' ? AppColors.navy700 : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.view_agenda_rounded, size: 14, color: _bedViewMode == 'list' ? Colors.white : AppColors.slate600),
                          const SizedBox(width: 4),
                          Text('Card Roster', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _bedViewMode == 'list' ? Colors.white : AppColors.slate700)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        filteredBeds.isEmpty
            ? Container(
                padding: const EdgeInsets.all(28),
                width: double.infinity,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Column(
                  children: [
                    Icon(Icons.bed_outlined, size: 36, color: AppColors.slate400),
                    SizedBox(height: 8),
                    Text('No bed slots found matching active filter criteria.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              )
            : _bedViewMode == 'grid'
                ? ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: groupedByRoom.keys.length,
                    itemBuilder: (context, rIndex) {
                      final roomTitle = groupedByRoom.keys.elementAt(rIndex);
                      final roomBeds = groupedByRoom[roomTitle]!;
                      final roomVacantCount = roomBeds.where((b) => b['isOccupied'] != true && (b['status'] == 'Available' || b['status'] == null)).length;
                      final roomOccupiedCount = roomBeds.where((b) => b['isOccupied'] == true || b['status'] == 'Occupied').length;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.meeting_room_rounded, size: 16, color: AppColors.navy700),
                                    const SizedBox(width: 6),
                                    Text(roomTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(4)),
                                      child: Text('$roomVacantCount Vacant', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                                    ),
                                    const SizedBox(width: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                                      child: Text('$roomOccupiedCount Occupied', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.red.shade700)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 1.8,
                                crossAxisSpacing: 8,
                                mainAxisSpacing: 8,
                              ),
                              itemCount: roomBeds.length,
                              itemBuilder: (ctx, bIdx) {
                                final b = roomBeds[bIdx];
                                return _buildBedSlotGridTile(b);
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredBeds.length,
                    itemBuilder: (context, index) {
                      final b = filteredBeds[index];
                      return _buildBedCardItem(b);
                    },
                  ),
      ],
    );
  }

  Widget _buildCapacityMiniStat(String label, String value, Color textCol, Color bgCol) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(color: bgCol, borderRadius: BorderRadius.circular(8)),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppColors.slate400)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textCol)),
          ],
        ),
      ),
    );
  }

  Widget _buildBedSlotGridTile(Map<String, dynamic> b) {
    final bedCode = (b['bedCode'] ?? b['id'] ?? 'Bed').toString();
    final status = (b['status'] ?? 'Available').toString();
    final bool isOccupied = b['isOccupied'] == true || status.toLowerCase() == 'occupied';
    final bool isMaint = status.toLowerCase() == 'maintenance' || status.toLowerCase() == 'cleaning';
    final bool isRes = status.toLowerCase() == 'reserved';
    final patientName = b['patientName'] ?? 'Vacant';

    Color cardBg = isOccupied ? const Color(0xFFFEF2F2) : isMaint ? const Color(0xFFFEF3C7) : isRes ? const Color(0xFFEFF6FF) : const Color(0xFFECFDF5);
    Color borderCol = isOccupied ? Colors.red.shade300 : isMaint ? Colors.amber.shade400 : isRes ? Colors.blue.shade300 : AppColors.emerald500;
    Color iconCol = isOccupied ? Colors.red.shade700 : isMaint ? Colors.amber.shade900 : isRes ? Colors.blue.shade700 : AppColors.emerald600;

    return InkWell(
      onTap: () => _showBedDetailsModal(b),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderCol, width: 1.2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.king_bed_rounded, size: 16, color: iconCol),
                    const SizedBox(width: 4),
                    Text(bedCode, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: iconCol)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    isOccupied ? 'OCCUPIED' : isMaint ? 'CLEANING' : isRes ? 'RESERVED' : 'VACANT',
                    style: TextStyle(fontSize: 7, fontWeight: FontWeight.w900, color: iconCol),
                  ),
                ),
              ],
            ),
            Text(
              isOccupied ? patientName : 'Ready for Patient',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10, fontWeight: isOccupied ? FontWeight.bold : FontWeight.normal, color: isOccupied ? AppColors.slate900 : const Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBedCardItem(Map<String, dynamic> bed) {
    final bedCode = (bed['bedCode'] ?? bed['id'] ?? 'Bed').toString();
    final wardName = (bed['wardName'] ?? 'General Ward').toString();
    final roomNum = (bed['roomNumber'] ?? '101').toString();
    final status = (bed['status'] ?? 'Available').toString();
    final bool isOccupied = bed['isOccupied'] == true || status.toLowerCase() == 'occupied';
    final patientName = bed['patientName'] ?? 'Vacant';
    final patientUhid = bed['patientUhid'] ?? '';

    Color badgeBg = isOccupied ? Colors.red.shade50 : status == 'Maintenance' ? Colors.amber.shade50 : AppColors.emerald50;
    Color badgeTextCol = isOccupied ? Colors.red.shade700 : status == 'Maintenance' ? Colors.amber.shade900 : AppColors.emerald600;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: ListTile(
        onTap: () => _showBedDetailsModal(bed),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: CircleAvatar(
          radius: 20,
          backgroundColor: badgeBg,
          child: Icon(Icons.king_bed_rounded, color: badgeTextCol, size: 20),
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Bed $bedCode', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(4)),
              child: Text(status.toUpperCase(), style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: badgeTextCol)),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$wardName • Room $roomNum', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              if (isOccupied)
                Text('Patient: $patientName ${patientUhid.isNotEmpty ? "($patientUhid)" : ""}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ],
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.slate400),
      ),
    );
  }

  void _showBedDetailsModal(Map<String, dynamic> bed) {
    final bedCode = (bed['bedCode'] ?? bed['id'] ?? 'Bed').toString();
    final wardName = (bed['wardName'] ?? 'General Ward').toString();
    final roomNum = (bed['roomNumber'] ?? '101').toString();
    final status = (bed['status'] ?? 'Available').toString();
    final bool isOccupied = bed['isOccupied'] == true || status.toLowerCase() == 'occupied';
    final bool isMaint = status.toLowerCase() == 'maintenance' || status.toLowerCase() == 'cleaning';
    final bool isRes = status.toLowerCase() == 'reserved';

    final patientName = bed['patientName'] ?? 'No Patient Assigned';
    final patientUhid = bed['patientUhid'] ?? 'N/A';
    final doctor = bed['doctor'] ?? 'Attending Physician';
    final bp = bed['bp'] ?? '--/--';
    final pulse = bed['pulse'] ?? '--';
    final spo2 = bed['spo2'] ?? '--';
    final temp = bed['temp'] ?? '--';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isOccupied ? Colors.red.shade50 : isMaint ? Colors.amber.shade50 : AppColors.emerald50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.king_bed_rounded, color: isOccupied ? Colors.red.shade700 : isMaint ? Colors.amber.shade800 : AppColors.emerald600, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bed $bedCode', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                            Text('$wardName • Room $roomNum', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                          ],
                        ),
                      ],
                    ),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded)),
                  ],
                ),
                const SizedBox(height: 16),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isOccupied ? Colors.red.shade50 : isMaint ? Colors.amber.shade50 : isRes ? Colors.blue.shade50 : AppColors.emerald50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isOccupied ? Colors.red.shade200 : isMaint ? Colors.amber.shade200 : isRes ? Colors.blue.shade200 : const Color(0xFFA7F3D0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isOccupied ? Icons.person_pin_rounded : isMaint ? Icons.cleaning_services_rounded : Icons.check_circle_rounded,
                        color: isOccupied ? Colors.red.shade700 : isMaint ? Colors.amber.shade800 : AppColors.emerald600,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'BED STATUS: ${status.toUpperCase()}',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: isOccupied ? Colors.red.shade900 : isMaint ? Colors.amber.shade900 : AppColors.emerald600),
                          ),
                          Text(
                            isOccupied ? 'Currently assigned to active inpatient.' : isMaint ? 'Under sanitization and housekeeping maintenance.' : 'Available for immediate patient admission.',
                            style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (isOccupied) ...[
                  const Text('Occupying Inpatient Profile', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(radius: 20, backgroundColor: AppColors.navy50, child: Icon(Icons.person_rounded, color: AppColors.navy700, size: 20)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(patientName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                  Text('UHID: $patientUhid • Doctor: $doctor', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                        const Text('REAL-TIME CLINICAL VITALS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildVitalBadge('Blood Pressure', bp, Icons.favorite_rounded, Colors.red),
                            const SizedBox(width: 6),
                            _buildVitalBadge('Pulse Rate', '$pulse bpm', Icons.monitor_heart_rounded, Colors.blue),
                            const SizedBox(width: 6),
                            _buildVitalBadge('SpO2 Level', '$spo2%', Icons.air_rounded, AppColors.emerald600),
                            const SizedBox(width: 6),
                            _buildVitalBadge('Temp', '$temp°F', Icons.thermostat_rounded, Colors.amber.shade900),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),
                if (isOccupied) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Opening clinical file for $patientName ($patientUhid)...'), backgroundColor: AppColors.navy700));
                      },
                      icon: const Icon(Icons.description_outlined, size: 18),
                      label: const Text('View Full Inpatient Medical Record'),
                    ),
                  ),
                ] else if (isMaint) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      onPressed: () {
                        Navigator.pop(ctx);
                        setState(() {
                          final idx = _beds.indexWhere((b) => (b['id'] ?? b['bedCode']) == bedCode || b['_id'] == bed['id']);
                          if (idx != -1) {
                            _beds[idx]['status'] = 'Available';
                            _beds[idx]['isOccupied'] = false;
                          }
                        });
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bed $bedCode marked clean and Available!'), backgroundColor: AppColors.emerald600));
                      },
                      icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                      label: const Text('Mark Clean & Available for Admission'),
                    ),
                  ),
                ] else ...[
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Select patient to assign to Bed $bedCode in $wardName'), backgroundColor: AppColors.emerald600));
                      },
                      icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                      label: const Text('Admit Patient to this Vacant Bed'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVitalBadge(String label, String val, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
        child: Column(
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(height: 2),
            Text(val, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
            Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 7, color: AppColors.slate400)),
          ],
        ),
      ),
    );
  }

  // 4. HOSPITAL DETAILS SUB-VIEW
  Widget _buildHospitalDetailsSubView() {
    final hosp = _hospitalProfile ?? {};
    final hName = hosp['name'] ?? _hospitalName;
    final code = hosp['code'] ?? 'HOSP';
    final email = hosp['contactEmail'] ?? 'contact@hospital.org';
    final phone = hosp['contactPhone'] ?? '+91 98765 43210';
    final capacity = hosp['bedCapacity'] ?? 100;
    final address = hosp['address'] ?? 'Main Hospital Campus, Medical Enclave';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(hName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.navy50, borderRadius: BorderRadius.circular(6)),
                child: Text('CODE: $code', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.navy700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),
          _buildDetailRow(Icons.business_rounded, 'Address', address),
          _buildDetailRow(Icons.email_outlined, 'Contact Email', email),
          _buildDetailRow(Icons.phone_outlined, 'Contact Phone', phone),
          _buildDetailRow(Icons.king_bed_outlined, 'Max Bed Capacity', '$capacity Total Network Beds'),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.navy700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _showEditHospitalModal,
              icon: const Icon(Icons.edit_rounded, size: 16, color: AppColors.navy700),
              label: const Text('Edit Quick Profile Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.navy700),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 5. DOCTORS SUB-VIEW
  Widget _buildDoctorsSubView() {
    final filtered = _doctors.where((d) {
      final name = (d['name'] ?? '').toString().toLowerCase();
      final spec = (d['specialization'] ?? '').toString().toLowerCase();
      final query = _staffSearchController.text.toLowerCase();
      return name.contains(query) || spec.contains(query);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Doctors Directory (${_doctors.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _checkBranchScopeAndRun('add doctor', _showAddDoctorModal),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add Doctor', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Search Input
        TextField(
          controller: _staffSearchController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Search doctor by name or specialty...',
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.slate400, size: 18),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            fillColor: Colors.white,
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          ),
        ),
        const SizedBox(height: 14),

        filtered.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No doctors registered for active branch.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final doc = filtered[index];
                  final name = doc['name'] ?? 'Doctor';
                  final docName = name.startsWith('Dr.') ? name : 'Dr. $name';
                  final spec = doc['specialization'] ?? 'Specialist';
                  final qual = doc['qualification'] ?? 'MBBS, MD';
                  final status = (doc['status'] ?? 'on_duty').toString();

                  return InkWell(
                    onTap: () => _showDoctorDetailsModal(doc),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: AppColors.navy50,
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : 'D',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.navy700),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(docName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                Text('$spec • $qual', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: status == 'on_duty' ? AppColors.emerald50 : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              status.replaceAll('_', ' ').toUpperCase(),
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: status == 'on_duty' ? AppColors.emerald600 : Colors.amber.shade900),
                            ),
                          ),
                          const SizedBox(width: 4),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.slate400),
                            onSelected: (val) {
                              if (val == 'view') {
                                _showDoctorDetailsModal(doc);
                              } else if (val == 'edit') {
                                _checkBranchScopeAndRun('edit doctor', () => _showEditDoctorModal(doc));
                              } else if (val == 'delete') {
                                _checkBranchScopeAndRun('delete doctor', () => _confirmDeleteDoctor(doc));
                              }
                            },
                            itemBuilder: (ctx) => [
                              const PopupMenuItem(value: 'view', child: Row(children: [Icon(Icons.visibility_outlined, size: 16), SizedBox(width: 8), Text('View Profile & Patients')])),
                              const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit_outlined, size: 16), SizedBox(width: 8), Text('Edit Doctor Profile')])),
                              const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline_rounded, size: 16, color: Colors.red), SizedBox(width: 8), Text('Delete Doctor', style: TextStyle(color: Colors.red))])),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 6. NURSING STAFF SUB-VIEW
  Widget _buildNursingStaffSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Nursing & Support Staff (${_staff.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _checkBranchScopeAndRun('add staff', _showAddStaffModal),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add Staff', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 14),

        _staff.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No staff members registered for active branch.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _staff.length,
                itemBuilder: (context, index) {
                  final s = _staff[index];
                  final sName = s['name'] ?? 'Staff Member';
                  final role = (s['role'] ?? 'Staff').toString();
                  final empId = s['employeeId'] ?? 'EMP-${index + 1}';
                  final dutyStatus = (s['dutyStatus'] ?? 'on_duty').toString();

                  return InkWell(
                    onTap: () => _showStaffDetailsModal(s),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: const Color(0xFFEEF2FF),
                            child: const Icon(Icons.person_outline_rounded, color: Color(0xFF4F46E5), size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(sName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                Text('$role • ID: $empId', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: dutyStatus == 'on_duty' ? AppColors.emerald50 : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              dutyStatus.replaceAll('_', ' ').toUpperCase(),
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: dutyStatus == 'on_duty' ? AppColors.emerald600 : Colors.amber.shade900),
                            ),
                          ),
                          const SizedBox(width: 4),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.slate400),
                            onSelected: (val) {
                              if (val == 'view') {
                                _showStaffDetailsModal(s);
                              } else if (val == 'edit') {
                                _checkBranchScopeAndRun('edit staff', () => _showEditStaffModal(s));
                              } else if (val == 'delete') {
                                _checkBranchScopeAndRun('delete staff', () => _confirmDeleteStaff(s));
                              }
                            },
                            itemBuilder: (ctx) => [
                              const PopupMenuItem(value: 'view', child: Row(children: [Icon(Icons.visibility_outlined, size: 16), SizedBox(width: 8), Text('View Profile & Analytics')])),
                              const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit_outlined, size: 16), SizedBox(width: 8), Text('Edit Staff Member')])),
                              const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline_rounded, size: 16, color: Colors.red), SizedBox(width: 8), Text('Delete Staff Member', style: TextStyle(color: Colors.red))])),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 7. ADMINS SUB-VIEW
  Widget _buildAdminsSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        const Text('Hospital System Admins', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.navy50,
                child: const Icon(Icons.admin_panel_settings_rounded, color: AppColors.navy700, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(UserSession.userName.isNotEmpty ? UserSession.userName : 'System Admin', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    Text(UserSession.userEmail.isNotEmpty ? UserSession.userEmail : 'admin@hospital.org', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(6)),
                child: const Text('SUPER ADMIN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.emerald600)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // 8. ROLES SUB-VIEW
  Widget _buildRolesSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildReadOnlyBanner(),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Roles & Permissions (${_roles.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () => _checkBranchScopeAndRun('add role', _showAddRoleModal),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Add Role', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 14),

        _roles.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No custom roles configured.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _roles.length,
                itemBuilder: (context, index) {
                  final r = _roles[index];
                  final label = r['label'] ?? r['role'] ?? 'Role';
                  final desc = r['description'] ?? 'System Access Role';
                  final permissions = (r['permissions'] is List) ? (r['permissions'] as List) : [];

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        const SizedBox(height: 4),
                        Text(desc, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        if (permissions.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: permissions.map((p) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(6)),
                              child: Text(p.toString(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5))),
                            )).toList(),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 9. ANALYTICS SUB-VIEW
  Widget _buildAnalyticsSubView() {
    final a = _analytics ?? {};
    final totalPatients = a['totalPatients'] ?? 1420;
    final totalAppts = a['totalAppointments'] ?? 890;
    final totalRevenue = a['totalRevenue'] ?? 450000;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Hospital Performance Analytics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.35,
          children: [
            _buildKpiCard(title: 'Total Revenue', value: '₹$totalRevenue', icon: Icons.payments_rounded, iconColor: AppColors.emerald600, bgColor: AppColors.emerald50),
            _buildKpiCard(title: 'Total Patients', value: '$totalPatients', icon: Icons.people_alt_rounded, iconColor: AppColors.navy600, bgColor: AppColors.navy50),
            _buildKpiCard(title: 'Appointments', value: '$totalAppts', icon: Icons.calendar_month_rounded, iconColor: Colors.purple.shade700, bgColor: Colors.purple.shade50),
            _buildKpiCard(title: 'Active Network', value: '${_branches.length} Branches', icon: Icons.location_city_rounded, iconColor: Colors.amber.shade900, bgColor: const Color(0xFFFEF3C7)),
          ],
        ),
      ],
    );
  }

  // 10. FINANCIAL REPORTS SUB-VIEW
  Widget _buildFinancialReportsSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Hospital Financial Reports', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Monthly Revenue Summary', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              SizedBox(height: 4),
              Text('Consolidated billing across OP, IPD, Pharmacy & Diagnostics.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Invoiced Collections', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  Text('₹4,50,000', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // 11. ENQUIRIES SUB-VIEW
  Widget _buildEnquiriesSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Patient Public Enquiries (${_enquiries.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
        const SizedBox(height: 14),

        _enquiries.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No public web enquiries received.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _enquiries.length,
                itemBuilder: (context, index) {
                  final e = _enquiries[index];
                  final pName = e['name'] ?? 'Visitor';
                  final phone = e['phone'] ?? '';
                  final message = e['message'] ?? e['subject'] ?? 'Enquiry details...';
                  final status = (e['status'] ?? 'pending').toString();

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(pName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                              child: Text(status.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.amber.shade900)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(phone, style: const TextStyle(fontSize: 11, color: AppColors.navy700, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Text(message, style: const TextStyle(fontSize: 12, color: Color(0xFF334155))),
                      ],
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 12. HOSPITAL RULES & SETTINGS SUB-VIEW (WEB PARITY)
  Widget _buildHospitalRulesSubView() {
    final hosp = _hospitalProfile ?? {};
    final String currentLogo = hosp['logoUrl']?.toString() ?? '';
    final String hospName = hosp['name']?.toString() ?? _hospitalName;
    final String hospCode = hosp['code']?.toString() ?? 'MAIN-001';
    final int opExpiry = hosp['opExpiryLimit'] is num ? (hosp['opExpiryLimit'] as num).toInt() : (int.tryParse(hosp['opExpiryLimit']?.toString() ?? '') ?? 10);
    final String contactEmail = hosp['contactEmail']?.toString() ?? '';
    final String contactPhone = hosp['contactPhone']?.toString() ?? '';
    final String address = hosp['address']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header title & badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.gavel_rounded, color: AppColors.navy700, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Hospital Rules & Settings',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.emerald50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Text(
                  'Web Sync Active',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Configure global hospital branding, identity photo, and OP consultation validity limits.',
            style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 20),

          // 1. HOSPITAL PHOTO / LOGO BRANDING CRUD
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: currentLogo.isNotEmpty
                      ? Image.network(
                          currentLogo,
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 56, height: 56, color: AppColors.navy100,
                            child: const Icon(Icons.local_hospital_rounded, color: AppColors.navy700, size: 28),
                          ),
                        )
                      : Container(
                          width: 56, height: 56, color: AppColors.navy100,
                          child: const Icon(Icons.local_hospital_rounded, color: AppColors.navy700, size: 28),
                        ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(hospName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                      Text('Code: $hospCode', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          InkWell(
                            onTap: () => _updateHospitalPhoto(ImageSource.gallery),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.navy700,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.upload_rounded, size: 12, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text('Upload Photo', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                                ],
                              ),
                            ),
                          ),
                          if (currentLogo.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: _removeHospitalPhoto,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: Colors.red.shade200),
                                ),
                                child: const Text('Remove', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.red)),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. OP CONSULTATION EXPIRY LIMIT RULE
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7).withOpacity(0.4),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.timer_outlined, color: Color(0xFFB45309), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'OP Consultation Expiry Limit (Days)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Number of days a completed OP consultation remains valid for free patient revisits across receptionist & doctor modules.',
                  style: TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _formFeeController..text = opExpiry.toString(),
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Validity Period (Days)',
                          suffixText: 'Days',
                          border: OutlineInputBorder(),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. EDITABLE DETAILS FORM
          TextField(
            controller: _formNameController..text = hospName,
            decoration: const InputDecoration(labelText: 'Hospital Official Name', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _formEmailController..text = contactEmail,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Contact Email', border: OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _formPhoneController..text = contactPhone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Contact Phone', border: OutlineInputBorder()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _formAddressController..text = address,
            decoration: const InputDecoration(labelText: 'Detailed Street Address', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 20),

          // 4. SAVE BUTTON
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy700,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _isSubmitting ? null : _saveHospitalRules,
              icon: const Icon(Icons.save_rounded, color: Colors.white, size: 18),
              label: const Text(
                'Save Hospital Rules & Settings',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _updateHospitalPhoto(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);
    if (picked == null) return;

    setState(() => _isSubmitting = true);
    final String? uploadedUrl = await _apiService.uploadImage(File(picked.path));
    if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
      final bool success = await _apiService.updateHospitalProfile({'logoUrl': uploadedUrl});
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Hospital photo updated! Synced to Web.'), backgroundColor: AppColors.emerald600));
        }
        _loadAllAdminData();
      }
    }
    if (mounted) setState(() => _isSubmitting = false);
  }

  Future<void> _removeHospitalPhoto() async {
    setState(() => _isSubmitting = true);
    final bool success = await _apiService.updateHospitalProfile({'logoUrl': ''});
    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Hospital photo removed.'), backgroundColor: AppColors.emerald600));
      }
      _loadAllAdminData();
    }
    if (mounted) setState(() => _isSubmitting = false);
  }

  Future<void> _saveHospitalRules() async {
    if (_formNameController.text.isEmpty) return;
    setState(() => _isSubmitting = true);

    final int expiryDays = int.tryParse(_formFeeController.text.trim()) ?? 10;
    final bool success = await _apiService.updateHospitalProfile({
      'name': _formNameController.text.trim(),
      'opExpiryLimit': expiryDays,
      'contactEmail': _formEmailController.text.trim(),
      'contactPhone': _formPhoneController.text.trim(),
      'address': _formAddressController.text.trim(),
    });

    if (mounted) setState(() => _isSubmitting = false);
    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hospital Rules & OP Expiry Limit saved! Synced to Web.'), backgroundColor: AppColors.emerald600),
        );
      }
      _loadAllAdminData();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update Hospital Rules.'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // --- HELPER COMPONENTS FOR OVERVIEW TAB ---

  Widget _buildWelcomeBanner(ResponsiveHelper responsive) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.navy800, AppColors.navy950],
        ),
        borderRadius: BorderRadius.circular(16.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy950.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'LIVE NETWORK ENVIRONMENT',
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.emerald400, letterSpacing: 0.5),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Welcome, ${UserSession.userName.isNotEmpty ? UserSession.userName : "System Admin"}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            _hospitalName,
            style: TextStyle(fontSize: 12, color: AppColors.navy100.withOpacity(0.8), fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          Divider(color: Colors.white.withOpacity(0.1), height: 1),
          const SizedBox(height: 12),
          const Row(
            children: [
              Icon(Icons.shield_outlined, color: AppColors.emerald400, size: 16),
              SizedBox(width: 8),
              Text(
                'HIPAA compliancy is active & secure.',
                style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiGrid(ResponsiveHelper responsive, int totalBeds, int occupiedBeds, int availableBeds, int occupancyRate) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.35,
      children: [
        _buildKpiCard(title: 'Total Capacity', value: '$totalBeds Beds', icon: Icons.local_hospital_rounded, iconColor: AppColors.navy600, bgColor: AppColors.navy50),
        _buildKpiCard(title: 'Occupancy Rate', value: '$occupancyRate%', icon: Icons.hotel_rounded, iconColor: occupancyRate > 80 ? Colors.red : AppColors.emerald600, bgColor: occupancyRate > 80 ? const Color(0xFFFEE2E2) : AppColors.emerald50),
        _buildKpiCard(title: 'Occupied Beds', value: '$occupiedBeds', icon: Icons.king_bed_rounded, iconColor: Colors.purple.shade700, bgColor: Colors.purple.shade50),
        _buildKpiCard(title: 'Available Beds', value: '$availableBeds', icon: Icons.event_available_rounded, iconColor: AppColors.emerald600, bgColor: AppColors.emerald50),
      ],
    );
  }

  Widget _buildKpiCard({required String title, required String value, required IconData icon, required Color iconColor, required Color bgColor}) {
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: iconColor, size: 14),
              ),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.slate900)),
        ],
      ),
    );
  }

  Widget _buildSystemStatsStrip() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Departments', '${_departments.length}', Icons.business_rounded),
          _buildStatItem('Doctors', '${_doctors.length}', Icons.medical_services_rounded),
          _buildStatItem('Branches', '${_branches.length}', Icons.location_city_rounded),
          _buildStatItem('Roles', '${_roles.length}', Icons.admin_panel_settings_rounded),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.navy700),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.slate900)),
        Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildQuickOperationsGrid() {
    final ops = [
      {'title': 'Departments', 'icon': Icons.business_rounded, 'action': () => _switchTab(1, 'Departments')},
      {'title': 'Branches', 'icon': Icons.location_city_rounded, 'action': () => _switchTab(1, 'Branches')},
      {'title': 'Doctors', 'icon': Icons.medical_services_rounded, 'action': () => _switchTab(3, 'All Doctors')},
      {'title': 'Nursing Staff', 'icon': Icons.person_add_rounded, 'action': () => _switchTab(3, 'Nursing Staff')},
      {'title': 'Roles & RBAC', 'icon': Icons.admin_panel_settings_rounded, 'action': () => _switchTab(3, 'Roles & RBAC')},
      {'title': 'Analytics', 'icon': Icons.analytics_rounded, 'action': () => _switchTab(4, 'Analytics Metrics')},
      {'title': 'Financials', 'icon': Icons.payments_rounded, 'action': () => _switchTab(4, 'Financial Reports')},
      {'title': 'Enquiries', 'icon': Icons.help_outline_rounded, 'action': () => _switchTab(4, 'Enquiries')},
      {'title': 'Settings', 'icon': Icons.settings_rounded, 'action': () => _switchTab(4, 'Hospital Settings')},
    ];

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.1,
      children: ops.map((op) {
        return InkWell(
          onTap: op['action'] as VoidCallback,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(op['icon'] as IconData, size: 22, color: AppColors.navy700),
                const SizedBox(height: 6),
                Text(op['title'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate800), textAlign: TextAlign.center),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // --- MODAL DIALOGS FOR QUICK ACTIONS ---

  void _showQuickManageModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Admin Quick Operations', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.business_rounded, color: AppColors.navy700),
                title: const Text('Add Department', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onTap: () { Navigator.pop(ctx); _showAddDepartmentModal(); },
              ),
              ListTile(
                leading: const Icon(Icons.location_city_rounded, color: AppColors.navy700),
                title: const Text('Add Branch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onTap: () { Navigator.pop(ctx); _showAddBranchModal(); },
              ),
              ListTile(
                leading: const Icon(Icons.medical_services_rounded, color: AppColors.navy700),
                title: const Text('Add Doctor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onTap: () { Navigator.pop(ctx); _showAddDoctorModal(); },
              ),
              ListTile(
                leading: const Icon(Icons.person_add_rounded, color: AppColors.navy700),
                title: const Text('Add Staff Member', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onTap: () { Navigator.pop(ctx); _showAddStaffModal(); },
              ),
              ListTile(
                leading: const Icon(Icons.admin_panel_settings_rounded, color: AppColors.navy700),
                title: const Text('Create Role & Permissions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onTap: () { Navigator.pop(ctx); _showAddRoleModal(); },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showCredentialRevealModal({
    required String name,
    required String email,
    required String tempPassword,
    required String role,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(color: AppColors.emerald50, shape: BoxShape.circle),
                child: const Icon(Icons.shield_rounded, color: AppColors.emerald600, size: 32),
              ),
              const SizedBox(height: 10),
              const Text('Account Onboarded!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Temporary login credentials created for $name ($role):', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('EMAIL ADDRESS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(email, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900), overflow: TextOverflow.ellipsis),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 16, color: AppColors.slate600),
                          tooltip: 'Copy Email',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: email));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Email address copied to clipboard!'), backgroundColor: AppColors.navy900, duration: Duration(seconds: 2)),
                            );
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    const Text('TEMPORARY PASSWORD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(tempPassword, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppColors.navy700)),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 20, color: AppColors.navy700),
                          tooltip: 'Copy Password',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: tempPassword));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Temporary password copied to clipboard!'), backgroundColor: AppColors.emerald600, duration: Duration(seconds: 2)),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              const Text('⚠️ Note: Password is shown only once. Share securely with user.', style: TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.w600)),
            ],
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Done'),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showAddDepartmentModal() {
    _formNameController.clear();
    _formCodeController.clear();
    _formDescController.clear();
    _formLocationController.clear();
    _formFeeController.text = '500';
    _formBedsController.text = '10';

    String selectedCategory = 'General Clinical';
    List<String> selectedServices = ['Outpatient Care', 'Emergency Services'];

    final categories = [
      'General Clinical',
      'Surgical Specialty',
      'Intensive & Critical Care',
      'Diagnostic & Lab',
      'Outpatient Services',
      'Administrative & Support'
    ];

    final presetServices = [
      'Outpatient Care',
      'Emergency Services',
      'Diagnostic Imaging',
      'Intensive Care (ICU)',
      'Pediatric Wing',
      'Surgical OT'
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add New Department', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const Text('Create a clinical or administrative department.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Department Name (e.g. Cardiology) *', prefixIcon: Icon(Icons.apartment_rounded))),
                    const SizedBox(height: 12),

                    TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'Dept Code (e.g. CARD)', prefixIcon: Icon(Icons.tag_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: const InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_outlined)),
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (val) => setModalState(() => selectedCategory = val ?? categories[0]),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formLocationController, decoration: const InputDecoration(labelText: 'Location / Floor / Wing', prefixIcon: Icon(Icons.location_on_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formFeeController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Consultation Fee (₹)', prefixIcon: Icon(Icons.payments_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formBedsController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Bed Capacity', prefixIcon: Icon(Icons.bed_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formDescController, maxLines: 2, decoration: const InputDecoration(labelText: 'Department Description', prefixIcon: Icon(Icons.description_outlined))),
                    const SizedBox(height: 14),

                    const Text('Offered Services', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: presetServices.map((svc) {
                        final isSelected = selectedServices.contains(svc);
                        return FilterChip(
                          label: Text(svc, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppColors.slate800)),
                          selected: isSelected,
                          selectedColor: AppColors.navy700,
                          backgroundColor: const Color(0xFFF1F5F9),
                          onSelected: (val) {
                            setModalState(() {
                              if (val) {
                                selectedServices.add(svc);
                              } else {
                                selectedServices.remove(svc);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Department Name is required!'), backgroundColor: Colors.red));
                                  return;
                                }
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'code': _formCodeController.text.trim().toUpperCase(),
                                  'category': selectedCategory,
                                  'location': _formLocationController.text.trim(),
                                  'consultationFee': double.tryParse(_formFeeController.text) ?? 500,
                                  'totalBeds': int.tryParse(_formBedsController.text) ?? 10,
                                  'description': _formDescController.text.trim(),
                                  'services': selectedServices,
                                };
                                final success = await _apiService.createDepartment(payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Department created successfully!'), backgroundColor: AppColors.emerald600));
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save department.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Save Department', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddBranchModal() {
    _formNameController.clear();
    _formCodeController.clear();
    _formLocationController.clear();
    _formAddressController.clear();
    _formStateController.clear();
    _formPhoneController.clear();

    String selectedCategory = 'General Hospital';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add New Branch', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const Text('Onboard a new hospital branch facility.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Branch Name (e.g. Speshway Ameerpet) *', prefixIcon: Icon(Icons.business_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: const InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_outlined)),
                      items: ['General Hospital', 'Super Specialty', 'Clinic & Daycare', 'Maternity Wing'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (val) => setModalState(() => selectedCategory = val ?? 'General Hospital'),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formLocationController, decoration: const InputDecoration(labelText: 'City *', prefixIcon: Icon(Icons.location_city_rounded))),
                    const SizedBox(height: 12),

                    TextField(controller: _formStateController, decoration: const InputDecoration(labelText: 'State', prefixIcon: Icon(Icons.map_rounded))),
                    const SizedBox(height: 12),

                    TextField(controller: _formAddressController, decoration: const InputDecoration(labelText: 'Street Address', prefixIcon: Icon(Icons.place_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Contact Phone', prefixIcon: Icon(Icons.phone_outlined))),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty || _formLocationController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Branch Name and City are required!'), backgroundColor: Colors.red));
                                  return;
                                }
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'category': selectedCategory,
                                  'city': _formLocationController.text.trim(),
                                  'state': _formStateController.text.trim(),
                                  'street': _formAddressController.text.trim(),
                                };
                                final success = await _apiService.createBranch(payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Branch created successfully!'), backgroundColor: AppColors.emerald600));
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save branch.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Save Branch Facility', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddDoctorModal() {
    _formNameController.clear();
    _formEmailController.clear();
    _formPhoneController.clear();
    _formDescController.clear();
    _formQualController.clear();
    _formCodeController.clear();
    _formBioController.clear();

    String selectedGender = 'Male';
    String selectedStatus = 'on_duty';
    String selectedDeptId = _departments.isNotEmpty ? (_departments.first['_id']?.toString() ?? '') : '';

    _apiService.fetchNextEmployeeId('doctor').then((id) {
      if (id != null) _formCodeController.text = id;
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add New Doctor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const Text('Onboard a medical doctor to the hospital registry.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Doctor Full Name (e.g. Dr. Rajesh Sharma) *', prefixIcon: Icon(Icons.person_outline_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedGender,
                      decoration: const InputDecoration(labelText: 'Gender', prefixIcon: Icon(Icons.wc_rounded)),
                      items: ['Male', 'Female', 'Other'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                      onChanged: (val) => setModalState(() => selectedGender = val ?? 'Male'),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email Address *', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formDescController, decoration: const InputDecoration(labelText: 'Specialization (e.g. Cardiologist) *', prefixIcon: Icon(Icons.medical_services_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications (e.g. MBBS, MD)', prefixIcon: Icon(Icons.school_outlined))),
                    const SizedBox(height: 12),

                    TextField(
                      controller: _formCodeController,
                      decoration: const InputDecoration(
                        labelText: 'License No / Doctor ID (Auto-Generated)',
                        prefixIcon: Icon(Icons.fingerprint_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (_departments.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value: selectedDeptId.isNotEmpty ? selectedDeptId : null,
                        decoration: const InputDecoration(labelText: 'Assigned Department', prefixIcon: Icon(Icons.apartment_rounded)),
                        items: _departments.map((d) {
                          final id = d['_id']?.toString() ?? '';
                          final name = d['name']?.toString() ?? 'Dept';
                          return DropdownMenuItem(value: id, child: Text(name));
                        }).toList(),
                        onChanged: (val) => setModalState(() => selectedDeptId = val ?? ''),
                      ),
                    if (_departments.isNotEmpty) const SizedBox(height: 12),

                    TextField(controller: _formBioController, maxLines: 2, decoration: const InputDecoration(labelText: 'Doctor Bio / Profile Notes', prefixIcon: Icon(Icons.notes_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedStatus,
                      decoration: const InputDecoration(labelText: 'Status', prefixIcon: Icon(Icons.access_time_rounded)),
                      items: [
                        DropdownMenuItem(value: 'on_duty', child: Text('On Duty')),
                        DropdownMenuItem(value: 'off_duty', child: Text('Off Duty')),
                        DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                      ],
                      onChanged: (val) => setModalState(() => selectedStatus = val ?? 'on_duty'),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty || _formEmailController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Doctor Name and Email Address are required!'), backgroundColor: Colors.red));
                                  return;
                                }
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'gender': selectedGender,
                                  'email': _formEmailController.text.trim(),
                                  'phone': _formPhoneController.text.trim(),
                                  'specialization': _formDescController.text.trim(),
                                  'qualification': _formQualController.text.trim(),
                                  'licenseNo': _formCodeController.text.trim(),
                                  'department': selectedDeptId.isNotEmpty ? selectedDeptId : null,
                                  'bio': _formBioController.text.trim(),
                                  'status': selectedStatus,
                                };
                                final result = await _apiService.createDoctorWithResult(payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (result != null) {
                                  final tempPassword = result['tempPassword']?.toString();
                                  if (tempPassword != null && tempPassword.isNotEmpty) {
                                    _showCredentialRevealModal(
                                      name: _formNameController.text.trim(),
                                      email: _formEmailController.text.trim(),
                                      tempPassword: tempPassword,
                                      role: 'Doctor',
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Doctor onboarded successfully!'), backgroundColor: AppColors.emerald600));
                                  }
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save doctor.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Save & Onboard Doctor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddStaffModal() {
    _formNameController.clear();
    _formEmailController.clear();
    _formPhoneController.clear();
    _formQualController.clear();
    _formCodeController.clear();

    String selectedRole = 'Nurse';
    String selectedGender = 'Male';
    String selectedDutyStatus = 'on_duty';
    String selectedDeptId = _departments.isNotEmpty ? (_departments.first['_id']?.toString() ?? '') : '';

    _apiService.fetchNextEmployeeId(selectedRole).then((id) {
      if (id != null) _formCodeController.text = id;
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add New Staff Member', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const Text('Onboard a nursing, admin, or support staff member.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Staff Full Name *', prefixIcon: Icon(Icons.person_outline_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedRole,
                      decoration: const InputDecoration(labelText: 'Staff Role *', prefixIcon: Icon(Icons.badge_outlined)),
                      items: ['Nurse', 'Receptionist', 'Pharmacist', 'Laboratory', 'Accountant', 'Radiologist', 'Admin']
                          .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => selectedRole = val);
                          _apiService.fetchNextEmployeeId(val).then((nextId) {
                            if (nextId != null) setModalState(() => _formCodeController.text = nextId);
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12),

                    TextField(
                      controller: _formCodeController,
                      decoration: const InputDecoration(
                        labelText: 'Employee ID (Auto-Generated)',
                        prefixIcon: Icon(Icons.fingerprint_rounded),
                        helperText: 'Auto-fetched based on selected role',
                      ),
                    ),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedGender,
                      decoration: const InputDecoration(labelText: 'Gender', prefixIcon: Icon(Icons.wc_rounded)),
                      items: ['Male', 'Female', 'Other'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                      onChanged: (val) => setModalState(() => selectedGender = val ?? 'Male'),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email Address *', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined))),
                    const SizedBox(height: 12),

                    if (_departments.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value: selectedDeptId.isNotEmpty ? selectedDeptId : null,
                        decoration: const InputDecoration(labelText: 'Assigned Department', prefixIcon: Icon(Icons.apartment_rounded)),
                        items: _departments.map((d) {
                          final id = d['_id']?.toString() ?? '';
                          final name = d['name']?.toString() ?? 'Dept';
                          return DropdownMenuItem(value: id, child: Text(name));
                        }).toList(),
                        onChanged: (val) => setModalState(() => selectedDeptId = val ?? ''),
                      ),
                    if (_departments.isNotEmpty) const SizedBox(height: 12),

                    TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications (e.g. B.Sc Nursing)', prefixIcon: Icon(Icons.school_outlined))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: selectedDutyStatus,
                      decoration: const InputDecoration(labelText: 'Duty Status', prefixIcon: Icon(Icons.access_time_rounded)),
                      items: [
                        DropdownMenuItem(value: 'on_duty', child: Text('On Duty')),
                        DropdownMenuItem(value: 'off_duty', child: Text('Off Duty')),
                        DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                        DropdownMenuItem(value: 'late', child: Text('Late')),
                      ],
                      onChanged: (val) => setModalState(() => selectedDutyStatus = val ?? 'on_duty'),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty || _formEmailController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff Name and Email Address are required!'), backgroundColor: Colors.red));
                                  return;
                                }
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'role': selectedRole,
                                  'gender': selectedGender,
                                  'email': _formEmailController.text.trim(),
                                  'phone': _formPhoneController.text.trim(),
                                  'employeeId': _formCodeController.text.trim(),
                                  'department': selectedDeptId.isNotEmpty ? selectedDeptId : null,
                                  'qualifications': _formQualController.text.trim(),
                                  'dutyStatus': selectedDutyStatus,
                                };
                                final result = await _apiService.createStaffWithResult(payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (result != null) {
                                  final tempPassword = result['tempPassword']?.toString();
                                  if (tempPassword != null && tempPassword.isNotEmpty) {
                                    _showCredentialRevealModal(
                                      name: _formNameController.text.trim(),
                                      email: _formEmailController.text.trim(),
                                      tempPassword: tempPassword,
                                      role: selectedRole,
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff registered successfully!'), backgroundColor: AppColors.emerald600));
                                  }
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save staff member.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Save & Onboard Staff Member', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddRoleModal() {
    _formNameController.clear();
    _formCodeController.clear();
    _formDescController.clear();

    List<String> selectedPermissions = ['Manage Staff', 'View Hospital Analytics', 'IP/OP Management'];

    final availablePermissions = [
      'Manage Staff',
      'View Hospital Analytics',
      'Manage Departments',
      'Inventory Control',
      'Billing Operations',
      'Payroll Processing',
      'Insurance Claims',
      'Financial Reports',
      'Patient Consultation',
      'Electronic Prescriptions',
      'Clinical Notes',
      'IP/OP Management',
      'Patient Registration',
      'Appointment Scheduling',
      'Visitor Log',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Create Custom Role & RBAC', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const Text('Define custom role permissions and system access rights.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    TextField(
                      controller: _formNameController,
                      decoration: const InputDecoration(labelText: 'Role Display Title (e.g. Senior Ward Nurse) *', prefixIcon: Icon(Icons.admin_panel_settings_outlined)),
                      onChanged: (val) {
                        final cleanKey = val.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '_');
                        setModalState(() => _formCodeController.text = cleanKey);
                      },
                    ),
                    const SizedBox(height: 12),

                    TextField(
                      controller: _formCodeController,
                      decoration: const InputDecoration(labelText: 'Role System Key (e.g. senior_ward_nurse)', prefixIcon: Icon(Icons.key_rounded)),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formDescController, maxLines: 2, decoration: const InputDecoration(labelText: 'Role Description', prefixIcon: Icon(Icons.description_outlined))),
                    const SizedBox(height: 14),

                    const Text('Assign Access Permissions', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                    const SizedBox(height: 8),

                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: availablePermissions.map((perm) {
                        final isSelected = selectedPermissions.contains(perm);
                        return FilterChip(
                          label: Text(perm, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppColors.slate800)),
                          selected: isSelected,
                          selectedColor: AppColors.navy700,
                          backgroundColor: const Color(0xFFF1F5F9),
                          onSelected: (val) {
                            setModalState(() {
                              if (val) {
                                selectedPermissions.add(perm);
                              } else {
                                selectedPermissions.remove(perm);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Role Title is required!'), backgroundColor: Colors.red));
                                  return;
                                }
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'label': _formNameController.text.trim(),
                                  'role': _formCodeController.text.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '_'),
                                  'description': _formDescController.text.trim(),
                                  'permissions': selectedPermissions,
                                };
                                final success = await _apiService.createRole(payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Role & RBAC configured successfully!'), backgroundColor: AppColors.emerald600));
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save role.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Save Custom Role', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showEditHospitalModal() {
    final hosp = _hospitalProfile ?? {};
    _formNameController.text = hosp['name']?.toString() ?? _hospitalName;
    _formEmailController.text = hosp['contactEmail']?.toString() ?? '';
    _formPhoneController.text = hosp['contactPhone']?.toString() ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Edit Hospital Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
              const SizedBox(height: 14),
              TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Hospital Name')),
              const SizedBox(height: 10),
              TextField(controller: _formEmailController, decoration: const InputDecoration(labelText: 'Contact Email')),
              const SizedBox(height: 10),
              TextField(controller: _formPhoneController, decoration: const InputDecoration(labelText: 'Contact Phone')),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700),
                  onPressed: _isSubmitting
                      ? null
                      : () async {
                          setState(() => _isSubmitting = true);
                          final success = await _apiService.updateHospitalProfile({
                            'name': _formNameController.text.trim(),
                            'contactEmail': _formEmailController.text.trim(),
                            'contactPhone': _formPhoneController.text.trim(),
                          });
                          setState(() => _isSubmitting = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Hospital profile updated!'), backgroundColor: AppColors.emerald600));
                            _loadAllAdminData();
                          }
                        },
                  child: const Text('Update Profile'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- DOCTOR & STAFF INTERACTIVE DETAILS & CRUD MODALS ---

  void _showDoctorDetailsModal(Map<String, dynamic> initialDoc) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>?>(
          future: _apiService.fetchDoctorDetails(initialDoc['_id']?.toString() ?? ''),
          builder: (context, snapshot) {
            final doc = snapshot.data?['doctor'] as Map<String, dynamic>? ?? initialDoc;
            final stats = snapshot.data?['stats'] as Map<String, dynamic>? ?? {};
            final patients = (snapshot.data?['patients'] as List?)?.map((p) => p as Map<String, dynamic>).toList() ?? [];

            final name = doc['name'] ?? 'Doctor';
            final docName = name.startsWith('Dr.') ? name : 'Dr. $name';
            final spec = doc['specialization'] ?? 'Specialist';
            final qual = doc['qualification'] ?? 'MBBS, MD';
            final email = doc['email'] ?? 'No email provided';
            final phone = doc['phone'] ?? 'No phone provided';
            final status = (doc['status'] ?? 'on_duty').toString();
            final licenseNo = doc['licenseNo'] ?? doc['employeeId'] ?? 'N/A';
            final bio = doc['bio'] ?? 'No profile bio available.';
            final totalTreated = stats['patientsTreated'] ?? patients.length;

            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
              padding: const EdgeInsets.all(20),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: AppColors.navy50,
                              child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'D', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(docName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                Text('$spec • $qual', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ],
                        ),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pop(ctx);
                              _checkBranchScopeAndRun('edit doctor', () => _showEditDoctorModal(doc));
                            },
                            icon: const Icon(Icons.edit_outlined, size: 16),
                            label: const Text('Edit Doctor'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final nextStatus = status == 'on_duty' ? 'off_duty' : 'on_duty';
                              Navigator.pop(ctx);
                              final success = await _apiService.updateDoctor(doc['_id'].toString(), {'status': nextStatus});
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Doctor status changed to ${nextStatus.replaceAll('_', ' ')}!'), backgroundColor: AppColors.emerald600));
                                _loadAllAdminData();
                              }
                            },
                            icon: const Icon(Icons.sync_rounded, size: 16),
                            label: Text(status == 'on_duty' ? 'Go Off Duty' : 'Go On Duty'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          style: IconButton.styleFrom(backgroundColor: Colors.red.shade50),
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 20),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _checkBranchScopeAndRun('delete doctor', () => _confirmDeleteDoctor(doc));
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('TREATED PATIENTS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                const SizedBox(height: 4),
                                Text('$totalTreated Patients', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('LICENSE / ID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                const SizedBox(height: 4),
                                Text(licenseNo, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Column(
                        children: [
                          Row(children: [const Icon(Icons.email_outlined, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Text(email, style: const TextStyle(fontSize: 12, color: AppColors.slate800))]),
                          const SizedBox(height: 6),
                          Row(children: [const Icon(Icons.phone_outlined, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Text(phone, style: const TextStyle(fontSize: 12, color: AppColors.slate800))]),
                          if (bio.isNotEmpty) ...[
                            const Divider(height: 16),
                            Row(children: [const Icon(Icons.notes_rounded, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Expanded(child: Text(bio, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))))]),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Treated Patients & History (${patients.length})', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        if (snapshot.connectionState == ConnectionState.waiting) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                      ],
                    ),
                    const SizedBox(height: 10),

                    patients.isEmpty
                        ? Container(
                            padding: const EdgeInsets.all(16),
                            width: double.infinity,
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: const Center(child: Text('No patient consultation history linked to this doctor yet.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: patients.length,
                            itemBuilder: (context, pIndex) {
                              final p = patients[pIndex];
                              final pName = p['name'] ?? 'Patient';
                              final pUhid = p['uhid'] ?? 'UHID';
                              final pGender = p['gender'] ?? 'Gender';
                              final pAge = p['age'] ?? '';

                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                                child: Row(
                                  children: [
                                    const Icon(Icons.person_pin_rounded, color: AppColors.navy700, size: 20),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(pName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                          Text('UHID: $pUhid • $pGender ${pAge.toString().isNotEmpty ? '($pAge yrs)' : ''}', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showStaffDetailsModal(Map<String, dynamic> initialStaff) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>?>(
          future: _apiService.fetchStaffDetails(initialStaff['_id']?.toString() ?? ''),
          builder: (context, snapshot) {
            final staff = snapshot.data?['staff'] as Map<String, dynamic>? ?? initialStaff;
            final assignedPatients = (snapshot.data?['assignedPatients'] as List?)?.map((p) => p as Map<String, dynamic>).toList() ?? [];

            final name = staff['name'] ?? 'Staff Member';
            final role = (staff['role'] ?? 'Staff').toString();
            final empId = staff['employeeId'] ?? 'N/A';
            final email = staff['email'] ?? 'No email provided';
            final phone = staff['phone'] ?? 'No phone provided';
            final dutyStatus = (staff['dutyStatus'] ?? 'on_duty').toString();
            final qual = staff['qualifications'] ?? 'Healthcare Staff';
            final rating = staff['rating'] ?? 4.8;
            final taskLoad = staff['taskLoad'] ?? 75;

            final roleLower = role.toLowerCase();
            final isNurse = roleLower.contains('nurse');
            final isPharmacist = roleLower.contains('pharm');
            final isLab = roleLower.contains('lab') || roleLower.contains('radio');

            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
              padding: const EdgeInsets.all(20),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: const Color(0xFFEEF2FF),
                              child: const Icon(Icons.person_outline_rounded, color: Color(0xFF4F46E5), size: 24),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                Text('$role • ID: $empId', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ],
                        ),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.pop(ctx);
                              _checkBranchScopeAndRun('edit staff', () => _showEditStaffModal(staff));
                            },
                            icon: const Icon(Icons.edit_outlined, size: 16),
                            label: const Text('Edit Staff'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final nextStatus = dutyStatus == 'on_duty' ? 'off_duty' : 'on_duty';
                              Navigator.pop(ctx);
                              final success = await _apiService.updateStaff(staff['_id'].toString(), {'dutyStatus': nextStatus});
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Staff duty status changed to ${nextStatus.replaceAll('_', ' ')}!'), backgroundColor: AppColors.emerald600));
                                _loadAllAdminData();
                              }
                            },
                            icon: const Icon(Icons.sync_rounded, size: 16),
                            label: Text(dutyStatus == 'on_duty' ? 'Go Off Duty' : 'Go On Duty'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          style: IconButton.styleFrom(backgroundColor: Colors.red.shade50),
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 20),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _checkBranchScopeAndRun('delete staff', () => _confirmDeleteStaff(staff));
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(isNurse ? 'ASSIGNED INPATIENTS' : isPharmacist ? 'DISPENSED PRESCRIPTIONS' : isLab ? 'LAB ORDERS PROCESSED' : 'TASKS COMPLETED', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                const SizedBox(height: 4),
                                Text(isNurse ? '${assignedPatients.length} Active' : '${(taskLoad * 1.5).toInt()} Items', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('PERFORMANCE RATING', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
                                    const SizedBox(width: 4),
                                    Text('$rating / 5.0', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Column(
                        children: [
                          Row(children: [const Icon(Icons.email_outlined, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Text(email, style: const TextStyle(fontSize: 12, color: AppColors.slate800))]),
                          const SizedBox(height: 6),
                          Row(children: [const Icon(Icons.phone_outlined, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Text(phone, style: const TextStyle(fontSize: 12, color: AppColors.slate800))]),
                          const SizedBox(height: 6),
                          Row(children: [const Icon(Icons.school_outlined, size: 16, color: Color(0xFF64748B)), const SizedBox(width: 8), Text('Qualifications: $qual', style: const TextStyle(fontSize: 12, color: AppColors.slate800))]),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    if (isNurse) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Assigned Inpatients (${assignedPatients.length})', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                          if (snapshot.connectionState == ConnectionState.waiting) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      assignedPatients.isEmpty
                          ? Container(
                              padding: const EdgeInsets.all(16),
                              width: double.infinity,
                              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                              child: const Center(child: Text('No active inpatients assigned to this nurse currently.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: assignedPatients.length,
                              itemBuilder: (context, pIndex) {
                                final adm = assignedPatients[pIndex];
                                final patient = adm['patient'] as Map<String, dynamic>? ?? {};
                                final room = adm['room'] as Map<String, dynamic>? ?? {};
                                final bed = adm['bed'] as Map<String, dynamic>? ?? {};

                                final pName = patient['name'] ?? 'Inpatient';
                                final pUhid = patient['uhid'] ?? 'UHID';
                                final roomNo = room['roomNumber'] ?? bed['bedNumber'] ?? 'Ward Bed';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.local_hospital_rounded, color: AppColors.emerald600, size: 20),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(pName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                                            Text('UHID: $pUhid • Room/Bed: $roomNo', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ] else ...[
                      Text('$role Operational Analytics', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Shift Status', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                Text(dutyStatus.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.emerald600)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Task Load Capacity', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                Text('$taskLoad%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showEditDoctorModal(Map<String, dynamic> doc) {
    _formNameController.text = (doc['name'] ?? '').toString();
    _formEmailController.text = (doc['email'] ?? '').toString();
    _formPhoneController.text = (doc['phone'] ?? '').toString();
    _formDescController.text = (doc['specialization'] ?? '').toString();
    _formQualController.text = (doc['qualification'] ?? '').toString();
    _formCodeController.text = (doc['licenseNo'] ?? doc['employeeId'] ?? '').toString();
    _formBioController.text = (doc['bio'] ?? '').toString();

    String selectedGender = (doc['gender'] ?? 'Male').toString();
    String selectedStatus = (doc['status'] ?? 'on_duty').toString();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Edit Doctor Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Doctor Full Name *', prefixIcon: Icon(Icons.person_outline_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: ['Male', 'Female', 'Other'].contains(selectedGender) ? selectedGender : 'Male',
                      decoration: const InputDecoration(labelText: 'Gender', prefixIcon: Icon(Icons.wc_rounded)),
                      items: ['Male', 'Female', 'Other'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                      onChanged: (val) => setModalState(() => selectedGender = val ?? 'Male'),
                    ),
                    const SizedBox(height: 12),

                    TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formDescController, decoration: const InputDecoration(labelText: 'Specialization *', prefixIcon: Icon(Icons.medical_services_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications', prefixIcon: Icon(Icons.school_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'License No / ID', prefixIcon: Icon(Icons.fingerprint_rounded))),
                    const SizedBox(height: 12),

                    TextField(controller: _formBioController, maxLines: 2, decoration: const InputDecoration(labelText: 'Bio / Notes', prefixIcon: Icon(Icons.notes_rounded))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: ['on_duty', 'off_duty', 'on_leave'].contains(selectedStatus) ? selectedStatus : 'on_duty',
                      decoration: const InputDecoration(labelText: 'Duty Status', prefixIcon: Icon(Icons.access_time_rounded)),
                      items: [
                        DropdownMenuItem(value: 'on_duty', child: Text('On Duty')),
                        DropdownMenuItem(value: 'off_duty', child: Text('Off Duty')),
                        DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                      ],
                      onChanged: (val) => setModalState(() => selectedStatus = val ?? 'on_duty'),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty) return;
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'gender': selectedGender,
                                  'email': _formEmailController.text.trim(),
                                  'phone': _formPhoneController.text.trim(),
                                  'specialization': _formDescController.text.trim(),
                                  'qualification': _formQualController.text.trim(),
                                  'licenseNo': _formCodeController.text.trim(),
                                  'bio': _formBioController.text.trim(),
                                  'status': selectedStatus,
                                };
                                final success = await _apiService.updateDoctor(doc['_id'].toString(), payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Doctor profile updated successfully!'), backgroundColor: AppColors.emerald600));
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not update doctor profile.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Update Doctor Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showEditStaffModal(Map<String, dynamic> staff) {
    _formNameController.text = (staff['name'] ?? '').toString();
    _formEmailController.text = (staff['email'] ?? '').toString();
    _formPhoneController.text = (staff['phone'] ?? '').toString();
    _formQualController.text = (staff['qualifications'] ?? '').toString();
    _formCodeController.text = (staff['employeeId'] ?? '').toString();

    String selectedDutyStatus = (staff['dutyStatus'] ?? 'on_duty').toString();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Edit Staff Member', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                        IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close_rounded, size: 20)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Staff Full Name *', prefixIcon: Icon(Icons.person_outline_rounded))),
                    const SizedBox(height: 12),

                    TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined))),
                    const SizedBox(height: 12),

                    TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications', prefixIcon: Icon(Icons.school_outlined))),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      value: ['on_duty', 'off_duty', 'on_leave', 'late'].contains(selectedDutyStatus) ? selectedDutyStatus : 'on_duty',
                      decoration: const InputDecoration(labelText: 'Duty Status', prefixIcon: Icon(Icons.access_time_rounded)),
                      items: [
                        DropdownMenuItem(value: 'on_duty', child: Text('On Duty')),
                        DropdownMenuItem(value: 'off_duty', child: Text('Off Duty')),
                        DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                        DropdownMenuItem(value: 'late', child: Text('Late')),
                      ],
                      onChanged: (val) => setModalState(() => selectedDutyStatus = val ?? 'on_duty'),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting
                            ? null
                            : () async {
                                if (_formNameController.text.trim().isEmpty) return;
                                setState(() => _isSubmitting = true);
                                final payload = {
                                  'name': _formNameController.text.trim(),
                                  'email': _formEmailController.text.trim(),
                                  'phone': _formPhoneController.text.trim(),
                                  'qualifications': _formQualController.text.trim(),
                                  'dutyStatus': selectedDutyStatus,
                                };
                                final success = await _apiService.updateStaff(staff['_id'].toString(), payload);
                                setState(() => _isSubmitting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff member updated!'), backgroundColor: AppColors.emerald600));
                                  _loadAllAdminData();
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not update staff member.'), backgroundColor: Colors.red));
                                }
                              },
                        child: const Text('Update Staff Member', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDeleteDoctor(Map<String, dynamic> doc) {
    final name = doc['name'] ?? 'Doctor';
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Delete Doctor Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red)),
          content: Text('Are you sure you want to remove Dr. $name from the hospital registry? This will deactivate their login access.', style: const TextStyle(fontSize: 13)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                Navigator.pop(ctx);
                final success = await _apiService.deleteDoctor(doc['_id'].toString());
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Doctor removed successfully.'), backgroundColor: Colors.red));
                  _loadAllAdminData();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not delete doctor.'), backgroundColor: Colors.red));
                }
              },
              child: const Text('Delete Doctor'),
            ),
          ],
        );
      },
    );
  }

  void _confirmDeleteStaff(Map<String, dynamic> staff) {
    final name = staff['name'] ?? 'Staff';
    final role = staff['role'] ?? 'Staff';
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Delete Staff Member', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red)),
          content: Text('Are you sure you want to remove $name ($role) from the system?', style: const TextStyle(fontSize: 13)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                Navigator.pop(ctx);
                final success = await _apiService.deleteStaff(staff['_id'].toString());
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff member removed.'), backgroundColor: Colors.red));
                  _loadAllAdminData();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not delete staff member.'), backgroundColor: Colors.red));
                }
              },
              child: const Text('Delete Staff'),
            ),
          ],
        );
      },
    );
  }
}