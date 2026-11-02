import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/app_logo.dart';

class AdminDrawer extends StatelessWidget {
  final String activeRoute;
  final Function(int tabIndex, String? subFilter)? onSelectTab;

  const AdminDrawer({
    super.key,
    required this.activeRoute,
    this.onSelectTab,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
      ),
      child: Column(
        children: [
          // Drawer Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 50, 20, 24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.navy800,
                  AppColors.navy950,
                ],
              ),
            ),
            child: Row(
              children: [
                const AppLogo(size: 40, showShadow: false),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'HMS Enterprise',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                        ),
                      ),
                      Text(
                        'Admin Portal Workspace',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.emerald400.withOpacity(0.85),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Drawer items
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.dashboard_outlined,
                  title: 'Dashboard Home',
                  route: AppRoutes.adminDashboard,
                  tabIndex: 0,
                  subFilter: null,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.local_hospital_outlined,
                  title: 'Hospitals Details',
                  route: '/admin/hospitals',
                  tabIndex: 1,
                  subFilter: 'Hospital Details',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.alt_route_outlined,
                  title: 'Hospital Branches',
                  route: '/admin/branches',
                  tabIndex: 1,
                  subFilter: 'Branches',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.business_outlined,
                  title: 'Departments & Capacity',
                  route: '/admin/departments',
                  tabIndex: 1,
                  subFilter: 'Departments',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.king_bed_outlined,
                  title: 'Wards & Beds Roster',
                  route: '/admin/beds',
                  tabIndex: 1,
                  subFilter: 'Wards & Beds',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.people_outline,
                  title: 'Doctors & Staff',
                  route: '/admin/staff',
                  tabIndex: 3,
                  subFilter: 'All Doctors',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.admin_panel_settings_outlined,
                  title: 'Roles & RBAC Permissions',
                  route: '/admin/roles',
                  tabIndex: 3,
                  subFilter: 'Roles & RBAC',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.analytics_outlined,
                  title: 'Analytics Metrics',
                  route: '/admin/analytics',
                  tabIndex: 4,
                  subFilter: 'Analytics Metrics',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.assignment_outlined,
                  title: 'Financial Reports',
                  route: '/admin/reports',
                  tabIndex: 4,
                  subFilter: 'Financial Reports',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.help_outline,
                  title: 'Patient Enquiries',
                  route: '/admin/enquiries',
                  tabIndex: 4,
                  subFilter: 'Enquiries',
                ),
                const Divider(color: AppColors.slate200, height: 24),
                _buildDrawerItem(
                  context,
                  icon: Icons.settings_outlined,
                  title: 'Hospital Settings',
                  route: '/admin/settings',
                  tabIndex: 4,
                  subFilter: 'Hospital Settings',
                ),
              ],
            ),
          ),
          
          // Drawer Footer / Sign Out
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.errorBorder),
                borderRadius: BorderRadius.circular(10),
                color: AppColors.errorBg,
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                clipBehavior: Clip.antiAlias,
                child: ListTile(
                  leading: const Icon(Icons.logout_rounded, color: AppColors.errorRed),
                  title: const Text(
                    'Secure Log Out',
                    style: TextStyle(
                      color: AppColors.errorRed,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context); // Close drawer
                    Navigator.pushReplacementNamed(context, AppRoutes.login);
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String route,
    required int tabIndex,
    required String? subFilter,
  }) {
    final isSelected = activeRoute == route;
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.navy50 : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        clipBehavior: Clip.antiAlias,
        child: ListTile(
        visualDensity: const VisualDensity(horizontal: 0, vertical: -2),
        leading: Icon(
          icon,
          color: isSelected ? AppColors.navy700 : AppColors.slate500,
          size: 20,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? AppColors.navy700 : AppColors.slate700,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 13,
          ),
        ),
        trailing: isSelected 
            ? Container(
                width: 4,
                height: 16,
                decoration: BoxDecoration(
                  color: AppColors.navy700,
                  borderRadius: BorderRadius.circular(2),
                ),
              )
            : null,
        onTap: () {
          Navigator.pop(context); // Close drawer
          if (onSelectTab != null) {
            onSelectTab!(tabIndex, subFilter);
          } else {
            Navigator.pushReplacementNamed(context, AppRoutes.adminDashboard);
          }
        },
      ),
    ),
    );
  }
}
