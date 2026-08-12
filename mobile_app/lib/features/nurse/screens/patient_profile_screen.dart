import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class PatientProfileScreen extends StatelessWidget {
  final Map<String, dynamic> patientData;

  const PatientProfileScreen({super.key, required this.patientData});

  @override
  Widget build(BuildContext context) {
    // Parse patient details from map payload
    final String name = patientData['name'] ?? 'John Doe';
    final int age = patientData['age'] ?? 45;
    final String gender = patientData['gender'] ?? 'Male';
    final String room = patientData['room'] ?? 'Room 205';
    final String bp = patientData['bp'] ?? '120/80';
    final String pulse = patientData['pulse'] ?? '72 bpm';
    final String spo2 = patientData['spo2'] ?? '98%';
    final String temp = patientData['temp'] ?? '98.6 °F';

    // Doctor and diagnosis fields mapped dynamically
    final String doctor = patientData['doctor'] ?? 'Dr. Sarah Smith (Cardiology)';
    final String diagnosis = patientData['diagnosis'] ?? 'Under Post-Op / Clinical Observation';
    const String respiration = '16 bpm';

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FC),
      appBar: AppBar(
        backgroundColor: AppColors.navy700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          '$name\'s Profile',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildProfileHeaderCard(name, age, gender, room, doctor, diagnosis),
            const SizedBox(height: 16),
            _buildVitalsCard(bp, pulse, temp, respiration, spo2),
            const SizedBox(height: 16),
            _buildMedicationCard(),
            const SizedBox(height: 16),
            _buildFluidCard(),
            const SizedBox(height: 16),
            _buildQuickLinksCard(context),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeaderCard(
    String name,
    int age,
    String gender,
    String room,
    String doctor,
    String diagnosis,
  ) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Simulated Patient Avatar photo
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.navy100,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                )
              ],
            ),
            child: Center(
              child: Text(
                name.substring(0, 1).toUpperCase(),
                style: const TextStyle(
                  color: AppColors.navy700,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),

          // Details column
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Age: $age  •  Gender: $gender',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Room: $room',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  'Doctor: $doctor',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.navy700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Divider(color: Color(0xFFF1F3F9), height: 1),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text(
                      'Diagnosis: ',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.errorBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        diagnosis,
                        style: const TextStyle(
                          color: AppColors.errorRed,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVitalsCard(
    String bp,
    String pulse,
    String temp,
    String resp,
    String spo2,
  ) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Clinical Vitals',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildVitalMetricColumn('BP', bp, Icons.speed, Colors.purple),
              _buildVitalMetricColumn('Pulse', pulse, Icons.favorite, Colors.red),
              _buildVitalMetricColumn('Temp', temp, Icons.thermostat, Colors.orange),
              _buildVitalMetricColumn('Resp', resp, Icons.air, Colors.blue),
              _buildVitalMetricColumn('Oxygen', spo2, Icons.cloud_queue_rounded, Colors.teal),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildVitalMetricColumn(String label, String val, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(height: 6),
        Text(
          val,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 9, color: AppColors.slate500, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildMedicationCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Today\'s Medication',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 14),
          _buildMedicationCheckRow('Morning Dosage (08:00)', true),
          const SizedBox(height: 10),
          _buildMedicationCheckRow('Afternoon Dosage (14:00)', true),
          const SizedBox(height: 10),
          _buildMedicationCheckRow('Night Dosage (20:00)', false),
        ],
      ),
    );
  }

  Widget _buildMedicationCheckRow(String label, bool isGiven) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isGiven ? AppColors.slate600 : AppColors.slate800,
            fontWeight: isGiven ? FontWeight.normal : FontWeight.w600,
          ),
        ),
        Icon(
          isGiven ? Icons.check_circle_rounded : Icons.cancel_rounded,
          color: isGiven ? AppColors.emerald600 : AppColors.errorRed,
          size: 18,
        ),
      ],
    );
  }

  Widget _buildFluidCard() {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Intake & Output Balance',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _buildFluidBalanceMetric('Fluid Intake', '1,250 ml', Colors.blue),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildFluidBalanceMetric('Fluid Output', '900 ml', Colors.orange),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildFluidBalanceMetric(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.12)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 9, color: AppColors.slate600, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickLinksCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: const Color(0xFFEFF1F7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Quick Links & Logs',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
          const SizedBox(height: 12),
          _buildQuickLinkItem('Lab Reports', Icons.biotech_rounded, () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening Lab Reports...')),
            );
          }),
          const Divider(color: Color(0xFFF1F3F9), height: 1),
          _buildQuickLinkItem('Doctor Notes', Icons.description_rounded, () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening Physician Notes...')),
            );
          }),
          const Divider(color: Color(0xFFF1F3F9), height: 1),
          _buildQuickLinkItem('Nurse Notes', Icons.rate_review_rounded, () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening Nursing Notes...')),
            );
          }),
          const Divider(color: Color(0xFFF1F3F9), height: 1),
          _buildQuickLinkItem('Emergency Contact', Icons.contact_phone_rounded, () {
            showDialog(
              context: context,
              builder: (context) {
                return AlertDialog(
                  title: const Text('Emergency Contact Info', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  content: const Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Contact: Mary Doe', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('Relation: Spouse', style: TextStyle(fontSize: 12, color: AppColors.slate600)),
                      SizedBox(height: 4),
                      Text('Phone: +1 555-019-2834', style: TextStyle(fontSize: 12, color: AppColors.slate600)),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    )
                  ],
                );
              },
            );
          }),
        ],
      ),
    );
  }

  Widget _buildQuickLinkItem(String title, IconData icon, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, size: 18, color: AppColors.navy700),
      title: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.slate400),
      onTap: onTap,
      dense: true,
      contentPadding: EdgeInsets.zero,
    );
  }
}
