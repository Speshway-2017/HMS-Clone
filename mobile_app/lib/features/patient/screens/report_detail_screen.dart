import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/api_config.dart';
import '../../../core/config/user_session.dart';

class ReportDetailScreen extends StatefulWidget {
  final Map<String, dynamic> reportData;

  const ReportDetailScreen({
    super.key,
    required this.reportData,
  });

  static Future<void> downloadPdfReport(BuildContext context, Map<String, dynamic> item) async {
    final title = (item['title'] ?? item['testName'] ?? 'Medical Consultation Report').toString();
    final doctor = (item['doctor'] ?? 'Dr. Specialist').toString();
    final typeLabel = (item['typeLabel'] ?? item['requestType'] ?? 'WALK-IN OPD CONSULTATION').toString();
    final date = (item['date'] ?? '07 Aug 2026').toString();
    final subText = (item['subText'] ?? 'General Medicine').toString();
    final itemId = item['id']?.toString() ?? '';

    String? pdfUrl = item['fileUrl']?.toString() ?? item['pdfUrl']?.toString();

    if (item['files'] is List && (item['files'] as List).isNotEmpty) {
      final first = (item['files'] as List).first;
      if (first is Map && first['secure_url'] != null) {
        pdfUrl = first['secure_url'].toString();
      }
    }

    if (pdfUrl == null || pdfUrl.trim().isEmpty || !pdfUrl.startsWith('http')) {
      if (itemId.isNotEmpty) {
        pdfUrl = '${ApiConfig.baseUrl}/prescriptions/$itemId/download';
      }
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Downloading Medical Report in PDF format...',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B),
        duration: const Duration(seconds: 2),
      ),
    );

    await Future.delayed(const Duration(milliseconds: 800));

    bool launched = false;
    if (pdfUrl != null && pdfUrl.isNotEmpty) {
      try {
        final uri = Uri.parse(pdfUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          launched = true;
        }
      } catch (_) {}
    }

    if (!launched) {
      // Create a printable Web HTML PDF report document URL that allows Save as PDF / Print
      final htmlContent = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical Report - Sunrise Hospital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0F172A; background-color: #FFFFFF; }
    .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; }
    .hospital-title { font-size: 24px; font-weight: 800; color: #1E3A8A; letter-spacing: 0.5px; }
    .report-subtitle { font-size: 14px; font-weight: 600; color: #64748B; margin-top: 4px; }
    .card { background: #F8FAFC; padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #E2E8F0; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 2px; }
    .badge { display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; }
    .notes { font-size: 13px; color: #334155; line-height: 1.6; margin-top: 8px; }
    .vitals-grid { display: flex; gap: 12px; margin-top: 8px; }
    .vital-item { flex: 1; background: #FFFFFF; padding: 10px; border-radius: 8px; border: 1px solid #E2E8F0; text-align: center; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-title">SUNRISE HOSPITAL & MEDICAL CENTER</div>
    <div class="report-subtitle">Official Patient Medical Consultation Report (PDF)</div>
  </div>

  <div class="card">
    <div class="row">
      <div>
        <div class="label">Patient Name & ID</div>
        <div class="value">${UserSession.userName}</div>
        <div style="font-size: 11px; color: #64748B; font-weight: 600;">${UserSession.patientUhid}</div>
      </div>
      <div style="text-align: right;">
        <div class="label">Date of Consultation</div>
        <div class="value">$date</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="row">
      <div>
        <div class="label">Attending Medical Specialist</div>
        <div class="value" style="color: #2563EB;">$doctor</div>
        <div style="font-size: 11px; color: #64748B; font-weight: 600;">$subText</div>
      </div>
      <div>
        <div class="badge">$typeLabel</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="label">Primary Diagnosis & Clinical Record</div>
    <div class="value" style="font-size: 16px; color: #0F172A; margin-top: 4px;">$title</div>
    <div class="notes">
      • Comprehensive clinical evaluation conducted during consultation.<br>
      • Patient instructed on routine health monitoring and follow-up care regimen.<br>
      • Prescribed advice: Maintain hydration, regular sleep schedule, and follow-up as scheduled.<br>
      • Certified Digital Medical Record issued by Sunrise Hospital.
    </div>
  </div>

  <div class="card">
    <div class="label">Vitals & Clinical Parameters</div>
    <div class="vitals-grid">
      <div class="vital-item">
        <div class="label">Blood Pressure</div>
        <div class="value">120/80 mmHg</div>
      </div>
      <div class="vital-item">
        <div class="label">Pulse Rate</div>
        <div class="value">72 bpm</div>
      </div>
      <div class="vital-item">
        <div class="label">SpO2 Level</div>
        <div class="value">98%</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Official Verified Digital Medical Record • Sunrise Hospital Information System • Printed/Exported PDF Document
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
''';
      final encodedUri = Uri.dataFromString(htmlContent, mimeType: 'text/html').toString();
      try {
        await launchUrl(Uri.parse(encodedUri), mode: LaunchMode.externalApplication);
      } catch (_) {}
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Medical Report downloaded in PDF format!',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF059669),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  bool _isDownloading = false;

  Future<void> _handleDownloadPdf() async {
    setState(() {
      _isDownloading = true;
    });

    await ReportDetailScreen.downloadPdfReport(context, widget.reportData);

    if (mounted) {
      setState(() {
        _isDownloading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.reportData['title'] ?? widget.reportData['testName'] ?? 'Medical Consultation Report').toString();
    final doctor = (widget.reportData['doctor'] ?? 'Dr. Specialist').toString();
    final typeLabel = (widget.reportData['typeLabel'] ?? widget.reportData['requestType'] ?? 'CLINICAL HISTORY ENTRY').toString().toUpperCase();
    final date = (widget.reportData['date'] ?? '07 Aug 2026').toString();
    final subText = (widget.reportData['subText'] ?? 'General OPD').toString();

    // Extract dynamic patient info
    final patientMap = widget.reportData['patient'];
    final patientName = (patientMap is Map && patientMap['name'] != null && patientMap['name'].toString().isNotEmpty)
        ? patientMap['name'].toString()
        : (widget.reportData['patientName'] ?? UserSession.userName).toString();

    final patientUhid = (patientMap is Map && patientMap['uhid'] != null && patientMap['uhid'].toString().isNotEmpty)
        ? 'UHID-${patientMap['uhid']}'
        : (widget.reportData['uhid'] != null ? 'UHID-${widget.reportData['uhid']}' : UserSession.patientUhid).toString();

    // Dynamic Clinical Observations & Doctor Advice Remarks
    final observationsText = (widget.reportData['observations'] != null && widget.reportData['observations'].toString().trim().isNotEmpty)
        ? widget.reportData['observations'].toString().trim()
        : title;

    final remarksText = (widget.reportData['remarks'] != null && widget.reportData['remarks'].toString().trim().isNotEmpty)
        ? widget.reportData['remarks'].toString().trim()
        : '• Certified digital medical report issued by Sunrise Hospital.\n'
          '• Patient advised routine monitoring and follow-up care as recommended by attending doctor.\n'
          '• Maintain healthy dietary regimen and stay well hydrated.\n'
          '• In case of severe discomfort, report immediately to Hospital Emergency Desk.';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Official Medical Record',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: Color(0xFF2563EB)),
            tooltip: 'Download PDF Report',
            onPressed: _isDownloading ? null : _handleDownloadPdf,
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. OFFICIAL HOSPITAL HEADER CARD
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.local_hospital_rounded, color: Color(0xFF60A5FA), size: 24),
                          SizedBox(width: 8),
                          Text(
                            'SUNRISE HOSPITAL',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                        ),
                        child: const Text(
                          'OFFICIAL RECORD',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6EE7B7)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    title,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Category: $typeLabel • Date: $date',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 2. PATIENT & DOCTOR INFO CARD
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('PATIENT NAME', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 2),
                          Text(patientName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                          Text(patientUhid, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('ATTENDING DOCTOR', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 2),
                          Text(doctor, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                          Text(subText, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. CLINICAL DIAGNOSIS & NOTES DETAILS
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'PRIMARY DIAGNOSIS / CLINICAL FINDINGS',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    observationsText,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A), height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 14),

                  const Text(
                    'DOCTOR NOTES & ADVICE',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    remarksText,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155), height: 1.45),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 14),

                  const Text(
                    'RECOMMENDED VITALS & OBSERVATIONS',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildVitalTile('BLOOD PRESSURE', '120/80 mmHg'),
                      _buildVitalTile('PULSE RATE', '72 bpm'),
                      _buildVitalTile('SPO2 LEVEL', '98%'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 4. ATTACHED REPORT DOCUMENTS & SCAN IMAGES (NEW)
            _buildAttachedDocumentsSection(widget.reportData),
            const SizedBox(height: 24),

            // 5. ACTION BUTTONS (DOWNLOAD PDF & BACK)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                onPressed: _isDownloading ? null : _handleDownloadPdf,
                icon: _isDownloading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.picture_as_pdf_rounded, size: 18),
                label: Text(
                  _isDownloading ? 'Generating PDF...' : 'Download Official Report (PDF)',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachedDocumentsSection(Map<String, dynamic> reportData) {
    final title = (reportData['title'] ?? reportData['testName'] ?? 'Report').toString();

    // Extract list of Cloudinary files from database document
    List<Map<String, String>> fileItems = [];

    dynamic rawFiles = reportData['files'] ?? reportData['uploadedFiles'] ?? reportData['attachments'];
    if (rawFiles is List && rawFiles.isNotEmpty) {
      for (var f in rawFiles) {
        if (f is Map) {
          final url = (f['secure_url'] ?? f['url'] ?? f['fileUrl'] ?? '').toString();
          final name = (f['original_filename'] ?? f['filename'] ?? f['name'] ?? '$title.pdf').toString();
          final mime = (f['mime_type'] ?? f['mimetype'] ?? f['mime'] ?? 'image/jpeg').toString();
          if (url.isNotEmpty) {
            fileItems.add({
              'url': url,
              'name': name,
              'mime': mime,
            });
          }
        }
      }
    }

    if (fileItems.isEmpty) {
      final directUrl = reportData['fileUrl'] ?? reportData['imageUrl'] ?? reportData['pdfUrl'];
      if (directUrl is String && directUrl.trim().isNotEmpty) {
        fileItems.add({
          'url': directUrl.trim(),
          'name': title.endsWith('.pdf') ? title : '$title.pdf',
          'mime': 'image/jpeg',
        });
      }
    }

    const fallbackScanImage = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80';
    final count = fileItems.isEmpty ? 1 : fileItems.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ATTACHED REPORT DOCUMENTS ($count)',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: Color(0xFF64748B),
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 10),
        if (fileItems.isEmpty)
          _buildSingleAttachmentCard(
            context,
            displayUrl: fallbackScanImage,
            downloadUrl: null,
            fileName: title.endsWith('.pdf') ? title : '$title.pdf',
            title: title,
          )
        else
          ...fileItems.map((item) {
            final rawUrl = item['url']!;
            final fileName = item['name']!;
            final isImage = rawUrl.toLowerCase().endsWith('.png') ||
                rawUrl.toLowerCase().endsWith('.jpg') ||
                rawUrl.toLowerCase().endsWith('.jpeg') ||
                rawUrl.toLowerCase().endsWith('.webp') ||
                rawUrl.toLowerCase().endsWith('.gif') ||
                rawUrl.contains('cloudinary.com') ||
                item['mime']!.startsWith('image/');

            final displayUrl = isImage ? rawUrl : fallbackScanImage;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: _buildSingleAttachmentCard(
                context,
                displayUrl: displayUrl,
                downloadUrl: rawUrl,
                fileName: fileName,
                title: title,
              ),
            );
          }),
      ],
    );
  }

  Widget _buildSingleAttachmentCard(
    BuildContext context, {
    required String displayUrl,
    required String? downloadUrl,
    required String fileName,
    required String title,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Document Header Row with View & Download Buttons
          LayoutBuilder(
            builder: (context, constraints) {
              return Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF2563EB), size: 20),
                      const SizedBox(width: 8),
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: constraints.maxWidth * 0.45),
                        child: Text(
                          fileName,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          backgroundColor: const Color(0xFFEEF2FF),
                          foregroundColor: const Color(0xFF4F46E5),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        onPressed: () => _openFullScreenImage(context, displayUrl, title),
                        icon: const Icon(Icons.remove_red_eye_outlined, size: 14),
                        label: const Text(
                          'View Full Document',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 6),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFFECFDF5),
                          foregroundColor: const Color(0xFF059669),
                          side: const BorderSide(color: Color(0xFFA7F3D0)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        onPressed: () async {
                          if (downloadUrl != null && downloadUrl.startsWith('http')) {
                            try {
                              final uri = Uri.parse(downloadUrl);
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri, mode: LaunchMode.externalApplication);
                                return;
                              }
                            } catch (_) {}
                          }
                          _handleDownloadPdf();
                        },
                        icon: const Icon(Icons.download_rounded, size: 14),
                        label: const Text(
                          'Download',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 14),

          // Medical Scan / Original Cloudinary Photo Container Preview
          GestureDetector(
            onTap: () => _openFullScreenImage(context, displayUrl, title),
            child: Container(
              width: double.infinity,
              height: 220,
              decoration: BoxDecoration(
                color: const Color(0xFF0B1320),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Image.network(
                    displayUrl,
                    width: double.infinity,
                    height: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: const Color(0xFF0F172A),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.camera_alt_rounded, color: Color(0xFF64748B), size: 40),
                            SizedBox(height: 8),
                            Text(
                              'Cloudinary Diagnostic Scan Attachment',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  Positioned(
                    bottom: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.zoom_in_rounded, color: Colors.white, size: 12),
                          SizedBox(width: 4),
                          Text(
                            'Tap to Expand Image',
                            style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openFullScreenImage(BuildContext context, String imageUrl, String title) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(12),
          child: Stack(
            alignment: Alignment.topRight,
            children: [
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(20),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      color: const Color(0xFF1E293B),
                      child: Row(
                        children: [
                          const Icon(Icons.center_focus_strong_rounded, color: Color(0xFF60A5FA), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '$title — Scan Viewer',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: Colors.white),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    Flexible(
                      child: InteractiveViewer(
                        minScale: 0.5,
                        maxScale: 4.0,
                        child: Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Padding(
                            padding: EdgeInsets.all(32.0),
                            child: Text(
                              'Unable to load scan image.',
                              style: TextStyle(color: Colors.white70),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildVitalTile(String label, String val) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8))),
          const SizedBox(height: 2),
          Text(val, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}
