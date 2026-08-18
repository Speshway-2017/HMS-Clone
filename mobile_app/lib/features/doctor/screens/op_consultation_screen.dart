import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../widgets/consultation_workspace_sheet.dart';

class OpConsultationScreen extends StatelessWidget {
  final Map<String, dynamic> appointment;
  final VoidCallback? onCompleted;

  const OpConsultationScreen({
    super.key,
    required this.appointment,
    this.onCompleted,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.slate900,
      body: SafeArea(
        child: ConsultationWorkspaceSheet(
          appointment: appointment,
          onCompleted: () {
            if (onCompleted != null) onCompleted!();
          },
        ),
      ),
    );
  }
}
