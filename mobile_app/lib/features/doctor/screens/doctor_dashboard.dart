import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../utils/responsive_helper.dart';

class DoctorDashboard extends StatefulWidget {
  const DoctorDashboard({super.key});

  @override
  State<DoctorDashboard> createState() => _DoctorDashboardState();
}

class _DoctorDashboardState extends State<DoctorDashboard> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);

    // List of page widgets for navigation tabs
    final List<Widget> pages = [
      _buildHomeScreen(responsive),
      _buildAppointmentsPlaceholder(responsive),
      _buildPatientsPlaceholder(responsive),
    ];

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: AppColors.white,
        title: Text(
          _currentIndex == 0 
              ? 'Dr. Alexander Workspace' 
              : (_currentIndex == 1 ? 'My Appointments' : 'Patient Records'),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              Navigator.pushReplacementNamed(context, AppRoutes.login);
            },
          ),
        ],
      ),
      body: pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: AppColors.navy700,
        unselectedItemColor: AppColors.slate400,
        backgroundColor: AppColors.white,
        elevation: 8,
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
            icon: Icon(Icons.calendar_month_outlined),
            activeIcon: Icon(Icons.calendar_month_rounded),
            label: 'Appointments',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline_rounded),
            activeIcon: Icon(Icons.people_rounded),
            label: 'Patients',
          ),
        ],
      ),
    );
  }

  Widget _buildHomeScreen(ResponsiveHelper responsive) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.all(responsive.scaleWidth(16.0)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Doctor welcome section
          _buildWelcomeSection(responsive),
          
          SizedBox(height: responsive.scaleHeight(20.0)),
          
          // Next Patient Queue Item
          Text(
            'Up Next',
            style: TextStyle(
              fontSize: responsive.scaleText(15.0),
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),
          _buildNextPatientCard(responsive),
          
          SizedBox(height: responsive.scaleHeight(24.0)),
          
          // Shortcut Modules
          Text(
            'Clinical Modules',
            style: TextStyle(
              fontSize: responsive.scaleText(15.0),
              fontWeight: FontWeight.bold,
              color: AppColors.slate800,
            ),
          ),
          const SizedBox(height: 10),
          _buildClinicalGrid(responsive),
          
          SizedBox(height: responsive.scaleHeight(20.0)),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection(ResponsiveHelper responsive) {
    return Container(
      padding: EdgeInsets.all(responsive.scaleWidth(20.0)),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate900.withOpacity(0.02),
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
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.navy100,
                child: const Text(
                  'DA',
                  style: TextStyle(
                    color: AppColors.navy700,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back, Dr. Alexander',
                      style: TextStyle(
                        fontSize: responsive.scaleText(16.0),
                        fontWeight: FontWeight.bold,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Cardiology Department • Sunrise General',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.slate500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: AppColors.slate200, height: 1),
          const SizedBox(height: 12),
          Text(
            'You have 8 outpatient appointments scheduled for today.',
            style: TextStyle(
              fontSize: responsive.scaleText(12.0),
              color: AppColors.slate700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNextPatientCard(ResponsiveHelper responsive) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.errorBg,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppColors.errorBorder),
                ),
                child: const Text(
                  'STAT / URGENT',
                  style: TextStyle(
                    color: AppColors.errorRed,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Spacer(),
              const Text(
                'Token #04 • 10:15 AM',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'No Active Queue Patient',
                      style: TextStyle(
                        fontSize: responsive.scaleText(14.0),
                        fontWeight: FontWeight.bold,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Queue is currently clear. Next patient token will be announced here.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.slate500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded, color: AppColors.navy700),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Consultation Workspace is pending active patient queue.')),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildClinicalGrid(ResponsiveHelper responsive) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.4,
      children: [
        _buildShortcutCard(
          title: 'Outpatient Queue',
          desc: '8 consultations left',
          icon: Icons.personal_injury_outlined,
          color: AppColors.navy700,
        ),
        _buildShortcutCard(
          title: 'Prescriptions',
          desc: 'Create RX slips',
          icon: Icons.description_outlined,
          color: AppColors.emerald600,
        ),
        _buildShortcutCard(
          title: 'Lab Orders',
          desc: 'Review test results',
          icon: Icons.science_outlined,
          color: Colors.amber.shade800,
        ),
        _buildShortcutCard(
          title: 'My Schedule',
          desc: 'Manage calendar logs',
          icon: Icons.calendar_month_outlined,
          color: Colors.deepPurple.shade700,
        ),
      ],
    );
  }

  Widget _buildShortcutCard({
    required String title,
    required String desc,
    required IconData icon,
    required Color color,
  }) {
    return Container(
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
              Icon(icon, color: color, size: 20),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withOpacity(0.3),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: const TextStyle(
                  fontSize: 9,
                  color: AppColors.slate500,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentsPlaceholder(ResponsiveHelper responsive) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.navy50,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.calendar_month_rounded, color: AppColors.navy700, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'My Appointments Queue',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate800),
            ),
            const SizedBox(height: 8),
            const Text(
              'This module will fetch live patient appointments, check-ins, and schedule logs from the backend API.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPatientsPlaceholder(ResponsiveHelper responsive) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.emerald50,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.people_alt_rounded, color: AppColors.emerald600, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Patient Clinical Ledger',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate800),
            ),
            const SizedBox(height: 8),
            const Text(
              'This module will search diagnostic records, radiology orders, prescriptions history, and consultation history grouped by sessions.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
