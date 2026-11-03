import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

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
          'Privacy Policy',
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
            // Header Badge Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.navy50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.navy100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.shield_rounded, color: AppColors.navy700, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Google Play Data Safety & HIPAA Compliant',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Last Updated: November 2026\nEffective for HMS Enterprise Mobile Application.',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.navy900,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            _buildSection(
              title: '1. Overview & Commitment',
              content:
                  'HMS Enterprise ("we", "our", or "the Hospital System") is dedicated to safeguarding your personal and medical information. This Privacy Policy details how we collect, process, store, and protect your information when you access our mobile application and integrated healthcare portal.',
            ),

            _buildSection(
              title: '2. Information We Collect',
              content:
                  'We only collect information necessary to deliver clinical services, manage appointments, and maintain patient health records:\n\n'
                  '• Personal Identifiers: Full name, verified mobile number, email address, residential address, age, and gender.\n'
                  '• Clinical Information: Assigned UHID (Unique Hospital Identification), blood group, allergies, emergency contact details, and insurance policy details.\n'
                  '• User-Provided Media: Profile avatars and patient photographs uploaded from your camera or photo gallery.\n'
                  '• Device & Technical Data: Network connection state, app performance logs, and authentication tokens for session persistence.',
            ),

            _buildSection(
              title: '3. Use of Camera & Photo Permissions',
              content:
                  'The application may request access to your device Camera and Photo Library strictly for the following purpose:\n\n'
                  '• To capture or select a patient identification picture to verify your hospital identity and display on your patient profile.\n\n'
                  'We never access, scan, or transfer photos without your explicit in-app action. You can revoke these permissions at any time via Android System Settings.',
            ),

            _buildSection(
              title: '4. Data Security & Storage Standards',
              content:
                  'Your health records and personal information are treated with the highest enterprise-level care:\n\n'
                  '• End-to-End Encryption: All communication between this application and our backend server (cms.speshway.site) is secured using TLS 1.3 / HTTPS encryption.\n'
                  '• Database Protection: Sensitive patient health records and credentials are encrypted using industry-standard AES-256 ciphers.\n'
                  '• Role-Based Isolation: Access to your medical records is strictly restricted to authorized doctors, nurses, and hospital administration staff.',
            ),

            _buildSection(
              title: '5. Third-Party Service Providers',
              content:
                  'We do not sell, rent, or trade your personal or health data to advertisers. We partner only with verified infrastructure providers:\n\n'
                  '• Cloudinary: Used solely for secure image storage and Content Delivery Network (CDN) hosting of profile photos.\n'
                  '• Push Notification & SMS Gateways: Used exclusively to deliver appointment alerts and OTP verification messages.',
            ),

            _buildSection(
              title: '6. Account & Data Deletion Rights',
              content:
                  'In full compliance with Google Play Store User Data & Data Safety requirements, you have the right to permanently delete your account and personal profile at any time:\n\n'
                  '• In-App Deletion: Open your Patient Profile screen in the app, scroll to the bottom danger zone, and tap "Delete My Account". Upon confirmation, your credentials and active sessions are permanently erased.\n'
                  '• Web Deletion: You can also request account and data deletion online at https://cms.speshway.site/delete-account without reinstalling the app.\n\n'
                  'Note: Clinical transactions, prescriptions, and billing ledgers will be anonymized and archived strictly as mandated by hospital compliance and statutory healthcare record retention laws.',
            ),

            _buildSection(
              title: '7. Contact Us',
              content:
                  'If you have any questions or data privacy inquiries regarding this Privacy Policy or our clinical data practices, please contact our Data Protection Officer at:\n\n'
                  'Email: support@speshway.site\n'
                  'Hospital Management System Enterprise Data Office\n'
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
      padding: const EdgeInsets.only(bottom: 20),
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

