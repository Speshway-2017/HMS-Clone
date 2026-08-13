import 'dart:io';
import 'package:flutter/material.dart';
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

  final TextEditingController _deptSearchController = TextEditingController();
  final TextEditingController _staffSearchController = TextEditingController();

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
      final bedsRaw = results[8] as List<dynamic>;
      final wardsRaw = results[9] as List<dynamic>;
      final inpatientsRaw = results[10] as List<dynamic>;

      // Strictly isolate data if a specific branch is selected
      final currentBranch = UserSession.selectedBranchId;
      if (currentBranch != 'all' && currentBranch != 'main') {
        deptsData = deptsData.where((d) => d['branch'] == currentBranch || d['branchId'] == currentBranch).toList();
        docsData = docsData.where((d) => d['branch'] == currentBranch || d['branchId'] == currentBranch).toList();
        staffData = staffData.where((s) => s['branch'] == currentBranch || s['branchId'] == currentBranch).toList();
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
          for (var p in mappedPatients) {
            pAssigned = p;
            break;
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
    );
  }

  // --- TAB 0: HOME OVERVIEW ---
  Widget _buildHomeOverviewTab(ResponsiveHelper responsive) {
    final int totalBedsCount = _beds.length;
    final int occupiedBedsCount = _beds.where((b) => b['isOccupied'] == true).length;
    final int availableBedsCount = _beds.where((b) => b['isOccupied'] != true && b['status'] != 'Maintenance').length;
    final int occupancyRate = totalBedsCount > 0 ? (occupiedBedsCount / totalBedsCount * 100).round() : 0;

    final List<String> wardOptions = [
      'All Wards',
      ..._wards.map((w) => w['name']?.toString() ?? '').where((n) => n.isNotEmpty)
    ];

    final List<Map<String, dynamic>> displayedBeds = _selectedWardFilter == 'All Wards'
        ? _beds
        : _beds.where((b) => (b['wardName'] ?? '').toString().toLowerCase().contains(_selectedWardFilter.toLowerCase())).toList();

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Welcome Banner
          _buildWelcomeBanner(responsive),
          const SizedBox(height: 20),

          // 2. Capacity KPI Cards Grid (Isolated for Active Branch)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Branch Capacity Summary',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.navy50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _activeBranchLabel.toUpperCase(),
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.navy700),
                ),
              ),
            ],
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Branch Bed Roster',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.emerald50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, size: 12, color: AppColors.emerald600),
                    SizedBox(width: 4),
                    Text(
                      'Live Sync',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.emerald600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Ward Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: wardOptions.map((wName) {
                final isSelected = _selectedWardFilter == wName;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(wName),
                    selected: isSelected,
                    selectedColor: AppColors.navy700,
                    backgroundColor: const Color(0xFFF1F5F9),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      fontSize: 11,
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _selectedWardFilter = wName;
                        });
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),

          // Beds List
          displayedBeds.isEmpty
              ? Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Center(
                    child: Text('No registered beds matching this ward.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayedBeds.length,
                  itemBuilder: (context, index) {
                    final bed = displayedBeds[index];
                    return _buildBedCardItem(bed);
                  },
                ),
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
          _buildSubHeaderWithBack(subFilters, _staffSubFilter, (val) => setState(() => _staffSubFilter = val)),
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
          _buildSubHeaderWithBack(subFilters, _analyticsSubFilter, (val) => setState(() => _analyticsSubFilter = val)),
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
              onPressed: _showAddDepartmentModal,
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
              onPressed: _showAddBranchModal,
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

  // 3. WARDS SUB-VIEW
  Widget _buildWardsSubView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Wards & Capacity Overview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
        const SizedBox(height: 14),

        _wards.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: const Center(child: Text('No ward data available for active scope.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12))),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _wards.length,
                itemBuilder: (context, index) {
                  final w = _wards[index];
                  final wName = w['name'] ?? 'Ward';
                  final occupied = w['occupiedBeds'] ?? 0;
                  final total = w['totalBeds'] ?? 10;
                  final rate = w['occupancyRate'] ?? 0;

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
                            Text(wName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                            Text('$occupied / $total Beds Occupied', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.navy700)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: total > 0 ? occupied / total : 0,
                            minHeight: 6,
                            backgroundColor: const Color(0xFFE2E8F0),
                            color: rate > 80 ? Colors.red : AppColors.emerald500,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ],
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
              onPressed: _showAddDoctorModal,
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

                  return Container(
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
                      ],
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
              onPressed: _showAddStaffModal,
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
                  final role = s['role'] ?? 'Staff';
                  final empId = s['employeeId'] ?? 'EMP-${index + 1}';

                  return Container(
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
                      ],
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
              onPressed: _showAddRoleModal,
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
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.location_on_rounded, size: 12, color: AppColors.emerald400),
                const SizedBox(width: 4),
                Text(
                  'ACTIVE SCOPE: ${_activeBranchLabel.toUpperCase()}',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.emerald400, letterSpacing: 0.5),
                ),
              ],
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
        _buildKpiCard(title: 'Branch Capacity', value: '$totalBeds Beds', icon: Icons.local_hospital_rounded, iconColor: AppColors.navy600, bgColor: AppColors.navy50),
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

  Widget _buildBedCardItem(Map<String, dynamic> bed) {
    final String bedCode = bed['bedCode'] ?? 'Bed';
    final String roomNum = bed['roomNumber'] ?? '101';
    final String wardName = bed['wardName'] ?? 'Ward';
    final bool isOccupied = bed['isOccupied'] == true;
    final String patientName = bed['patientName'] ?? 'Inpatient';
    final String doctor = bed['doctor'] ?? 'Dr. Unassigned';
    final String bp = bed['bp'] ?? '--/--';
    final String pulse = bed['pulse'] ?? '--';
    final String spo2 = bed['spo2'] ?? '--';
    final String temp = bed['temp'] ?? '--';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isOccupied ? Colors.purple.shade50 : AppColors.emerald50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isOccupied ? Icons.king_bed_rounded : Icons.bed_outlined,
                  size: 20,
                  color: isOccupied ? Colors.purple.shade700 : AppColors.emerald600,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$bedCode • Room $roomNum', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    Text(wardName, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.indigo.shade700)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOccupied ? Colors.purple.shade50 : AppColors.emerald50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isOccupied ? 'OCCUPIED' : 'AVAILABLE',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isOccupied ? Colors.purple.shade700 : AppColors.emerald600),
                ),
              ),
            ],
          ),
          if (isOccupied) ...[
            const Padding(padding: EdgeInsets.symmetric(vertical: 8.0), child: Divider(height: 1, color: Color(0xFFF1F5F9))),
            Text(patientName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            const SizedBox(height: 2),
            Text(doctor, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMiniVital('BP', bp),
                _buildMiniVital('Pulse', pulse),
                _buildMiniVital('SpO2', spo2),
                _buildMiniVital('Temp', temp),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMiniVital(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
        Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate900)),
      ],
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

  void _showAddDepartmentModal() {
    _formNameController.clear();
    _formCodeController.clear();
    _formDescController.clear();
    _formFeeController.text = '500';
    _formBedsController.text = '20';
    bool isEmergency = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
                top: 20, left: 20, right: 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
                    ),
                    const SizedBox(height: 14),
                    const Text('Add Department (Web Parity)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    const Text('Create a clinical department with fee structures and bed capacity.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),
                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Department Name (e.g. Cardiology)', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'Dept Code (e.g. CARD)', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    TextField(controller: _formDescController, decoration: const InputDecoration(labelText: 'Medical Specialty Scope', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _formFeeController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Consultation Fee (₹)', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _formBedsController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Ward Beds', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('24/7 Emergency Department', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Enable emergency triage & continuous monitoring', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                      value: isEmergency,
                      activeColor: AppColors.emerald600,
                      onChanged: (val) => setModalState(() => isEmergency = val),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting ? null : () async {
                          if (_formNameController.text.isEmpty) return;
                          setState(() => _isSubmitting = true);
                          final success = await _apiService.createDepartment({
                            'name': _formNameController.text.trim(),
                            'code': _formCodeController.text.trim().toUpperCase(),
                            'specialization': _formDescController.text.trim(),
                            'consultationFee': double.tryParse(_formFeeController.text) ?? 500,
                            'totalBeds': int.tryParse(_formBedsController.text) ?? 20,
                            'isEmergency': isEmergency,
                          });
                          setState(() => _isSubmitting = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Department created successfully!'), backgroundColor: AppColors.emerald600));
                            _loadAllAdminData();
                          }
                        },
                        child: const Text('Save Department', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
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
    _formStateController.clear();
    _formAddressController.clear();
    _formPhoneController.clear();
    _formEmailController.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
                ),
                const SizedBox(height: 14),
                const Text('Add Hospital Branch (Web Parity)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                const SizedBox(height: 4),
                const Text('Expand network facility infrastructure with location contact details.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const SizedBox(height: 16),
                TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Branch Name (e.g. City Center Campus)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'Branch ID (e.g. BR-002)', border: OutlineInputBorder()))),
                    const SizedBox(width: 10),
                    Expanded(child: TextField(controller: _formLocationController, decoration: const InputDecoration(labelText: 'City Location', border: OutlineInputBorder()))),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(controller: _formStateController, decoration: const InputDecoration(labelText: 'State / Province / Region', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _formAddressController, decoration: const InputDecoration(labelText: 'Street Address & Enclave', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Contact Phone', border: OutlineInputBorder()))),
                    const SizedBox(width: 10),
                    Expanded(child: TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Branch Email', border: OutlineInputBorder()))),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    onPressed: _isSubmitting ? null : () async {
                      if (_formNameController.text.isEmpty) return;
                      setState(() => _isSubmitting = true);
                      final success = await _apiService.createBranch({
                        'name': _formNameController.text.trim(),
                        'branchId': _formCodeController.text.trim(),
                        'city': _formLocationController.text.trim(),
                        'state': _formStateController.text.trim(),
                        'address': _formAddressController.text.trim(),
                        'phone': _formPhoneController.text.trim(),
                        'email': _formEmailController.text.trim(),
                      });
                      setState(() => _isSubmitting = false);
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      if (success) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Branch created successfully!'), backgroundColor: AppColors.emerald600));
                        _loadAllAdminData();
                      }
                    },
                    child: const Text('Save Hospital Branch', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAddDoctorModal() {
    _formNameController.clear();
    _formDescController.clear();
    _formEmailController.clear();
    _formPhoneController.clear();
    _formQualController.clear();
    _formCodeController.clear();
    _formBioController.clear();

    String selectedDeptId = _departments.isNotEmpty ? (_departments.first['_id']?.toString() ?? '') : '';
    String gender = 'Male';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
                    ),
                    const SizedBox(height: 14),
                    const Text('Add Doctor (Web Parity)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    const Text('Register a doctor and auto-create secure user access credentials.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),
                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Doctor Full Name (e.g. Dr. Sarah Jenkins)', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: gender,
                            decoration: const InputDecoration(labelText: 'Gender', border: OutlineInputBorder()),
                            items: const [
                              DropdownMenuItem(value: 'Male', child: Text('Male')),
                              DropdownMenuItem(value: 'Female', child: Text('Female')),
                              DropdownMenuItem(value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (val) => setModalState(() => gender = val ?? 'Male'),
                          ),
                        ),
                        if (_departments.isNotEmpty) ...[
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: selectedDeptId.isNotEmpty ? selectedDeptId : null,
                              decoration: const InputDecoration(labelText: 'Department', border: OutlineInputBorder()),
                              items: _departments.map((d) {
                                return DropdownMenuItem<String>(
                                  value: d['_id']?.toString() ?? '',
                                  child: Text(d['name']?.toString() ?? 'Dept', overflow: TextOverflow.ellipsis),
                                );
                              }).toList(),
                              onChanged: (val) => setModalState(() => selectedDeptId = val ?? ''),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email (For Login)', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _formDescController, decoration: const InputDecoration(labelText: 'Specialization (e.g. Cardiologist)', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications (e.g. MBBS, MD)', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'License / Reg No (Optional - Auto generated if empty)', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    TextField(controller: _formBioController, maxLines: 2, decoration: const InputDecoration(labelText: 'Short Professional Bio / Notes', border: OutlineInputBorder())),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting ? null : () async {
                          if (_formNameController.text.isEmpty) return;
                          setState(() => _isSubmitting = true);
                          final success = await _apiService.createDoctor({
                            'name': _formNameController.text.trim(),
                            'gender': gender,
                            'department': selectedDeptId.isNotEmpty ? selectedDeptId : null,
                            'email': _formEmailController.text.trim(),
                            'phone': _formPhoneController.text.trim(),
                            'specialization': _formDescController.text.trim(),
                            'qualification': _formQualController.text.trim(),
                            'licenseNo': _formCodeController.text.trim(),
                            'bio': _formBioController.text.trim(),
                          });
                          setState(() => _isSubmitting = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Doctor registered & credentials created!'), backgroundColor: AppColors.emerald600));
                            _loadAllAdminData();
                          }
                        },
                        child: const Text('Save Doctor Profile', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
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
    _formCodeController.clear();
    _formQualController.clear();

    String staffRole = 'nurse';
    String gender = 'Female';
    String dutyStatus = 'on_duty';
    String selectedDeptId = _departments.isNotEmpty ? (_departments.first['_id']?.toString() ?? '') : '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
                    ),
                    const SizedBox(height: 14),
                    const Text('Add Staff Member (Web Parity)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    const Text('Add nursing, administrative, or clinical support staff.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),
                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Staff Member Full Name', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: staffRole,
                            decoration: const InputDecoration(labelText: 'Staff Role', border: OutlineInputBorder()),
                            items: const [
                              DropdownMenuItem(value: 'nurse', child: Text('Nurse')),
                              DropdownMenuItem(value: 'receptionist', child: Text('Receptionist')),
                              DropdownMenuItem(value: 'pharmacist', child: Text('Pharmacist')),
                              DropdownMenuItem(value: 'accountant', child: Text('Accountant')),
                              DropdownMenuItem(value: 'laboratory', child: Text('Lab Tech')),
                              DropdownMenuItem(value: 'ward_boy', child: Text('Ward Assistant')),
                              DropdownMenuItem(value: 'admin_staff', child: Text('Admin Staff')),
                            ],
                            onChanged: (val) => setModalState(() => staffRole = val ?? 'nurse'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: gender,
                            decoration: const InputDecoration(labelText: 'Gender', border: OutlineInputBorder()),
                            items: const [
                              DropdownMenuItem(value: 'Female', child: Text('Female')),
                              DropdownMenuItem(value: 'Male', child: Text('Male')),
                              DropdownMenuItem(value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (val) => setModalState(() => gender = val ?? 'Female'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _formEmailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _formPhoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _formQualController, decoration: const InputDecoration(labelText: 'Qualifications', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: dutyStatus,
                            decoration: const InputDecoration(labelText: 'Initial Duty Status', border: OutlineInputBorder()),
                            items: const [
                              DropdownMenuItem(value: 'on_duty', child: Text('On Duty')),
                              DropdownMenuItem(value: 'off_duty', child: Text('Off Duty')),
                              DropdownMenuItem(value: 'on_leave', child: Text('On Leave')),
                            ],
                            onChanged: (val) => setModalState(() => dutyStatus = val ?? 'on_duty'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(controller: _formCodeController, decoration: const InputDecoration(labelText: 'Employee ID (Optional - Auto generated if empty)', border: OutlineInputBorder())),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting ? null : () async {
                          if (_formNameController.text.isEmpty) return;
                          setState(() => _isSubmitting = true);
                          final success = await _apiService.createStaff({
                            'name': _formNameController.text.trim(),
                            'role': staffRole,
                            'gender': gender,
                            'department': selectedDeptId.isNotEmpty ? selectedDeptId : null,
                            'email': _formEmailController.text.trim(),
                            'phone': _formPhoneController.text.trim(),
                            'employeeId': _formCodeController.text.trim(),
                            'qualifications': _formQualController.text.trim(),
                            'dutyStatus': dutyStatus,
                          });
                          setState(() => _isSubmitting = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff member registered successfully!'), backgroundColor: AppColors.emerald600));
                            _loadAllAdminData();
                          }
                        },
                        child: const Text('Save Staff Member', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
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
    _formDescController.clear();
    final Set<String> selectedPermissions = {'hospital_view', 'billing_view'};

    final Map<String, String> availablePermissions = {
      'hospital_view': 'View Hospital Network',
      'billing_view': 'Access Billing & Invoices',
      'patient_manage': 'Manage Patient Records',
      'staff_manage': 'Manage Staff & Duty Roster',
      'doctor_manage': 'Manage Doctor Profiles',
      'inventory_manage': 'Pharmacy & Inventory Access',
      'reports_export': 'Export Financial Analytics',
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
                    ),
                    const SizedBox(height: 14),
                    const Text('Create Custom Role & RBAC (Web Parity)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 4),
                    const Text('Define granular access permissions for hospital staff roles.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),
                    TextField(controller: _formNameController, decoration: const InputDecoration(labelText: 'Role Title (e.g. Pharmacy Manager)', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    TextField(controller: _formDescController, decoration: const InputDecoration(labelText: 'Role Scope Description', border: OutlineInputBorder())),
                    const SizedBox(height: 14),
                    const Text('Granted System Permissions:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: availablePermissions.entries.map((entry) {
                        final permKey = entry.key;
                        final permLabel = entry.value;
                        final isSelected = selectedPermissions.contains(permKey);

                        return FilterChip(
                          label: Text(permLabel),
                          selected: isSelected,
                          selectedColor: AppColors.navy700,
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? Colors.white : AppColors.slate800,
                          ),
                          onSelected: (bool selected) {
                            setModalState(() {
                              if (selected) {
                                selectedPermissions.add(permKey);
                              } else {
                                selectedPermissions.remove(permKey);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.navy700, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        onPressed: _isSubmitting ? null : () async {
                          if (_formNameController.text.isEmpty) return;
                          setState(() => _isSubmitting = true);
                          final success = await _apiService.createRole({
                            'label': _formNameController.text.trim(),
                            'description': _formDescController.text.trim(),
                            'permissions': selectedPermissions.toList(),
                          });
                          setState(() => _isSubmitting = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Custom role created with RBAC permissions!'), backgroundColor: AppColors.emerald600));
                            _loadAllAdminData();
                          }
                        },
                        child: const Text('Save Custom Role', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
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
}
