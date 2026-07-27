import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../utils/responsive_helper.dart';
import '../widgets/admin_drawer.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final responsive = ResponsiveHelper.of(context);
    
    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: AppColors.white,
        title: const Text(
          'HMS Admin Portal',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notifications are currently empty.')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Profile details are loading.')),
              );
            },
          ),
        ],
      ),
      drawer: const AdminDrawer(activeRoute: '/admin/dashboard'),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: EdgeInsets.symmetric(
          horizontal: responsive.scaleWidth(16.0),
          vertical: responsive.scaleHeight(16.0),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Header Card (styled like web bento elements)
            _buildWelcomeCard(responsive),
            
            SizedBox(height: responsive.scaleHeight(20.0)),
            
            // KPI Grid
            Text(
              'Network Summary',
              style: TextStyle(
                fontSize: responsive.scaleText(15.0),
                fontWeight: FontWeight.bold,
                color: AppColors.slate800,
              ),
            ),
            const SizedBox(height: 10),
            _buildKpiGrid(responsive),
            
            SizedBox(height: responsive.scaleHeight(24.0)),
            
            // Module placeholders
            Text(
              'Operational Focus',
              style: TextStyle(
                fontSize: responsive.scaleText(15.0),
                fontWeight: FontWeight.bold,
                color: AppColors.slate800,
              ),
            ),
            const SizedBox(height: 10),
            _buildOperationalSection(responsive),
            
            SizedBox(height: responsive.scaleHeight(20.0)),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeCard(ResponsiveHelper responsive) {
    return Container(
      padding: EdgeInsets.all(responsive.scaleWidth(20.0)),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.navy800,
            AppColors.navy950,
          ],
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
              color: AppColors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'DEMO ENVIRONMENT',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: AppColors.emerald400,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Welcome back, System Admin',
            style: TextStyle(
              fontSize: responsive.scaleText(18.0),
              fontWeight: FontWeight.bold,
              color: AppColors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Sunrise General Hospital Network',
            style: TextStyle(
              fontSize: responsive.scaleText(12.0),
              color: AppColors.navy100.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          Divider(color: AppColors.white.withOpacity(0.1), height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.shield_outlined, color: AppColors.emerald400, size: 16),
              const SizedBox(width: 8),
              Text(
                'HIPAA compliancy is active & secure.',
                style: TextStyle(
                  fontSize: responsive.scaleText(11.0),
                  color: AppColors.white.withOpacity(0.9),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiGrid(ResponsiveHelper responsive) {
    // 2-column responsive grid
    return GridView.count(
      crossAxisCount: responsive.isTablet ? 4 : 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.35,
      children: [
        _buildKpiCard(
          title: 'Total Hospitals',
          value: '4',
          icon: Icons.local_hospital_rounded,
          iconColor: AppColors.navy600,
          bgColor: AppColors.navy50,
        ),
        _buildKpiCard(
          title: 'Bed Occupancy',
          value: '72%',
          icon: Icons.hotel_rounded,
          iconColor: AppColors.emerald600,
          bgColor: AppColors.emerald50,
        ),
        _buildKpiCard(
          title: 'Active Patients',
          value: '1,280',
          icon: Icons.personal_injury_rounded,
          iconColor: Colors.amber.shade900,
          bgColor: Colors.amber.shade50,
        ),
        _buildKpiCard(
          title: 'Daily Revenue',
          value: '₹48.5k',
          icon: Icons.payments_rounded,
          iconColor: Colors.deepPurple.shade700,
          bgColor: Colors.deepPurple.shade50,
        ),
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
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
              Text(
                title,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate500,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 14),
              ),
            ],
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: AppColors.slate900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOperationalSection(ResponsiveHelper responsive) {
    return Column(
      children: [
        _buildModulePlaceholderCard(
          title: 'Manage Clinical Registry',
          desc: 'Monitor branch status, setup departments, and register medical administrators across all active nodes.',
          icon: Icons.app_registration_rounded,
          actionText: 'Configure Nodes',
        ),
        const SizedBox(height: 12),
        _buildModulePlaceholderCard(
          title: 'System Analytics & Logs',
          desc: 'Review aggregated analytics maps, revenue audits, and check system activities logged by role access controls.',
          icon: Icons.assessment_rounded,
          actionText: 'View Audit Logs',
        ),
      ],
    );
  }

  Widget _buildModulePlaceholderCard({
    required String title,
    required String desc,
    required IconData icon,
    required String actionText,
  }) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.navy50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.layers_outlined, color: AppColors.navy700),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.slate500,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    side: const BorderSide(color: AppColors.navy700, width: 1.0),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  child: Text(
                    actionText,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
