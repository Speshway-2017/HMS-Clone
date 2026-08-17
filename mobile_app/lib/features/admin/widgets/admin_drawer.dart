import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/app_logo.dart';

class AdminDrawer extends StatelessWidget {
  final String activeRoute;

  const AdminDrawer({
    super.key,
    required this.activeRoute,
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
                        'Admin Workspace',
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
                  title: 'Dashboard',
                  route: AppRoutes.adminDashboard,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.local_hospital_outlined,
                  title: 'Hospitals',
                  route: '/admin/hospitals',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.alt_route_outlined,
                  title: 'Branches',
                  route: '/admin/branches',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.business_outlined,
                  title: 'Departments',
                  route: '/admin/departments',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.people_outline,
                  title: 'Admins',
                  route: '/admin/admins',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.admin_panel_settings_outlined,
                  title: 'Manage Roles',
                  route: '/admin/roles',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.analytics_outlined,
                  title: 'Analytics',
                  route: '/admin/analytics',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.assignment_outlined,
                  title: 'Reports Hub',
                  route: '/admin/reports',
                ),
                const Divider(color: AppColors.slate200, height: 24),
                _buildDrawerItem(
                  context,
                  icon: Icons.settings_outlined,
                  title: 'Settings',
                  route: '/admin/settings',
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
          if (!isSelected && route == AppRoutes.adminDashboard) {
            Navigator.pushReplacementNamed(context, route);
          } else if (!isSelected) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('$title module integration is pending.'),
                duration: const Duration(seconds: 1),
              ),
            );
          }
        },
      ),
    ),
    );
  }
}
