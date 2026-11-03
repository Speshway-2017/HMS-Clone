import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.navy700),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Terms & Conditions',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Warning Banner for Medical Emergency
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFEE2E2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Icon(Icons.warning_amber_rounded, color: AppColors.errorRed, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'IMPORTANT MEDICAL DISCLAIMER:\nThis application is a hospital operational and patient portal system. It does NOT replace emergency medical response. In life-threatening emergencies, immediately dial your local emergency services (112 / 911) or visit the nearest emergency room.',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.errorRed,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildSection(
              title: '1. Acceptance of Terms',
              content:
                  'By installing, accessing, or using the HMS Enterprise Mobile Application, you agree to be bound by these Terms and Conditions. If you do not agree to all terms, please refrain from using the application.',
            ),

            _buildSection(
              title: '2. User Accounts & Security',
              content:
                  '• You are responsible for maintaining the confidentiality of your login credentials and mobile verification factors.\n'
                  '• You agree to provide accurate, truthful, and complete personal and medical history information.\n'
                  '• You must promptly notify hospital administration if you suspect unauthorized access to your patient portal.',
            ),

            _buildSection(
              title: '3. Scope of Healthcare Services',
              content:
                  '• The appointment schedules, queue tokens, and prescription summaries shown in this application are directly linked with hospital clinical workflows.\n'
                  '• Diagnostic reports and clinical advice delivered through this app represent professional opinions of licensed hospital clinicians.\n'
                  '• Any self-adjustments to prescribed medication without doctor consultation are strictly discouraged.',
            ),

            _buildSection(
              title: '4. Permitted App Permissions',
              content:
                  'Camera and photo storage access are requested solely when you choose to upload a patient profile picture or submit digital medical documents. Unsolicited background capture is never conducted.',
            ),

            _buildSection(
              title: '5. Account Termination & Deletion',
              content:
                  'You may terminate your patient account at any time using the in-app "Delete My Account" option located in your Profile screen. Upon deletion, your login credentials will be permanently deactivated. Clinical records required by healthcare statutes will be archived per hospital record retention guidelines.',
            ),

            _buildSection(
              title: '6. Contact & Support',
              content:
                  'For technical inquiries or legal notices regarding these Terms, contact us at:\n\n'
                  'Email: support@speshway.site\n'
                  'HMS Enterprise Administration Desk\n'
                  'Website: https://cms.speshway.site',
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required String content}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.slate200),
        ),
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
            const SizedBox(height: 8),
            Text(
              content,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.slate600,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

