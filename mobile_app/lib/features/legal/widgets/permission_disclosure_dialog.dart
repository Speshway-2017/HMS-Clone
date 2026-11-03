import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class PermissionDisclosureDialog extends StatelessWidget {
  final String title;
  final String permissionType;
  final String purposeDescription;
  final IconData icon;
  final VoidCallback onContinue;

  const PermissionDisclosureDialog({
    super.key,
    required this.title,
    required this.permissionType,
    required this.purposeDescription,
    required this.icon,
    required this.onContinue,
  });

  /// Shows prominent disclosure modal before requesting system permission
  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String permissionType,
    required String purposeDescription,
    required IconData icon,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => PermissionDisclosureDialog(
        title: title,
        permissionType: permissionType,
        purposeDescription: purposeDescription,
        icon: icon,
        onContinue: () => Navigator.pop(ctx, true),
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.navy50,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.navy700, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.slate900,
              ),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.emerald50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.emerald200),
            ),
            child: Text(
              'Required Permission: $permissionType',
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: AppColors.emerald700,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            purposeDescription,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.slate600,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'In compliance with Google Play Data Safety policies, this data is encrypted, never shared with third parties for marketing, and used solely for your patient records.',
            style: TextStyle(
              fontSize: 10.5,
              color: AppColors.slate400,
              fontStyle: FontStyle.italic,
              height: 1.35,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Not Now', style: TextStyle(color: AppColors.slate500)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.navy700,
            foregroundColor: AppColors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
          onPressed: onContinue,
          child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

