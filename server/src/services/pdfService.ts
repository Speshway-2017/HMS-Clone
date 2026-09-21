import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

interface PDFMedication {
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface PDFData {
  prescriptionId: string;
  prescriptionNumber?: string;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  hospitalLogoUrl?: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string;
  patientUhid: string;
  doctorName: string;
  doctorLicenseNo?: string;
  doctorSpecialization?: string;
  departmentName: string;
  visitDate: Date;
  diagnosis: string;
  chiefComplaint: string;
  clinicalNotes: string;
  medications: PDFMedication[];
  labOrders: string[];
  radiologyOrders: string[];
  advice: string;
  followUpDate: Date | null;
  verificationUrl: string;
}

export async function generatePrescriptionPDF(data: PDFData, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const qrBuffer = await QRCode.toBuffer(data.verificationUrl, { width: 85, margin: 1 });

  let logoBuffer: Buffer | null = null;
  if (data.hospitalLogoUrl) {
    try {
      const res = await fetch(data.hospitalLogoUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        logoBuffer = Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.error("Error fetching hospital logo for PDF:", err);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);

      writeStream.on("finish", () => {
        resolve();
      });
      writeStream.on("error", (err) => {
        reject(err);
      });

      doc.pipe(writeStream);

      // --- COLOR PALETTE ---
      const primaryColor = "#1E40AF"; // Navy
      const darkColor = "#1E293B"; // Dark Slate
      const secondaryColor = "#64748B"; // Slate Gray
      const lightBg = "#F8FAFC"; // Light Slate
      const borderColor = "#E2E8F0"; // Light Gray

      // --- HEADER SECTION ---
      // Draw a solid top primary color bar
      doc.rect(0, 0, 595.28, 15).fill(primaryColor);

      // Hospital Info
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(18).text(data.hospitalName.toUpperCase(), 50, 32, { width: 410 });
      doc.fillColor(secondaryColor).font("Helvetica").fontSize(9);
      if (data.hospitalAddress) {
        doc.text(data.hospitalAddress, { width: 410 });
      }
      const contactInfo = [
        data.hospitalPhone ? `Tel: ${data.hospitalPhone}` : "",
        data.hospitalEmail ? `Email: ${data.hospitalEmail}` : "",
      ].filter(Boolean).join("  |  ");
      if (contactInfo) {
        doc.text(contactInfo, { width: 410 });
      }

      // Draw Logo or Red Cross Symbol
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 480, 25, { fit: [65, 65], align: "right", valign: "center" });
        } catch (imgError) {
          console.error("Failed to render custom logo image, drawing default symbol:", imgError);
          doc.save();
          doc.translate(500, 45);
          doc.rect(-6, -18, 12, 36).fill("#EF4444");
          doc.rect(-18, -6, 36, 12).fill("#EF4444");
          doc.restore();
        }
      } else {
        doc.save();
        doc.translate(500, 45);
        doc.rect(-6, -18, 12, 36).fill("#EF4444");
        doc.rect(-18, -6, 36, 12).fill("#EF4444");
        doc.restore();
      }

      // Divider Line
      doc.moveTo(50, 105).lineTo(545, 105).strokeColor(primaryColor).lineWidth(1.5).stroke();

      // --- DOCUMENT TITLE ---
      doc.fillColor(darkColor).font("Helvetica-Bold").fontSize(14).text("MEDICAL PRESCRIPTION (Rx)", 50, 118, { align: "center" });
      
      // --- PATIENT & DOCTOR INFO CARD (GRID) ---
      doc.rect(50, 140, 495, 85).fill(lightBg);
      doc.rect(50, 140, 495, 85).strokeColor(borderColor).lineWidth(1).stroke();

      // Patient Details Left Side
      doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("PATIENT UHID:", 60, 150);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(data.patientUhid || "N/A", 145, 150);

      doc.fillColor(secondaryColor).font("Helvetica").text("Patient Name:", 60, 168);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(data.patientName, 145, 168);

      const ageGenderStr = `${data.patientAge !== null ? `${data.patientAge} Years` : "—"} / ${data.patientGender || "—"}`;
      doc.fillColor(secondaryColor).font("Helvetica").text("Age / Gender:", 60, 186);
      doc.fillColor(darkColor).font("Helvetica").text(ageGenderStr, 145, 186);

      doc.fillColor(secondaryColor).font("Helvetica").text("Prescription ID:", 60, 204);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(data.prescriptionNumber || data.prescriptionId, 145, 204);

      // Doctor Details Right Side
      doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("DOCTOR / DEPT:", 310, 150);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`Dr. ${data.doctorName}`, 395, 150);

      doc.fillColor(secondaryColor).font("Helvetica").text("Specialization:", 310, 168);
      doc.fillColor(darkColor).font("Helvetica").text(data.doctorSpecialization || "Consultant", 395, 168);

      doc.fillColor(secondaryColor).font("Helvetica").text("Department:", 310, 186);
      doc.fillColor(darkColor).font("Helvetica").text(data.departmentName, 395, 186);

      doc.fillColor(secondaryColor).font("Helvetica").text("Visit Date:", 310, 204);
      doc.fillColor(darkColor).font("Helvetica").text(new Date(data.visitDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), 395, 204);

      // --- ASSESSMENT ---
      let currentY = 245;
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("CLINICAL ASSESSMENT", 50, currentY);
      doc.moveTo(50, currentY + 14).lineTo(545, currentY + 14).strokeColor(borderColor).lineWidth(0.5).stroke();

      currentY += 22;
      doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(9.5).text("Chief Complaint:", 55, currentY);
      doc.fillColor(darkColor).font("Helvetica").fontSize(9.5).text(data.chiefComplaint || "None reported.", 150, currentY);

      currentY += 18;
      doc.fillColor(secondaryColor).font("Helvetica-Bold").text("Diagnosis:", 55, currentY);
      doc.fillColor(darkColor).font("Helvetica").text(data.diagnosis || "No primary diagnosis entered.", 150, currentY);

      if (data.clinicalNotes) {
        currentY += 18;
        doc.fillColor(secondaryColor).font("Helvetica-Bold").text("Clinical Notes:", 55, currentY);
        doc.fillColor(darkColor).font("Helvetica").text(data.clinicalNotes, 150, currentY);
      }

      // --- MEDICATIONS TABLE ---
      currentY += 35;
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("PRESCRIBED MEDICATIONS (Rx)", 50, currentY);
      doc.moveTo(50, currentY + 14).lineTo(545, currentY + 14).strokeColor(borderColor).lineWidth(0.5).stroke();

      currentY += 22;
      
      // Table Headers
      const colWidths = { 
        name: 145, 
        strength: 45, 
        dosage: 40, 
        frequency: 45, 
        duration: 45, 
        qty: 45, 
        morning: 40, 
        afternoon: 40, 
        night: 50 
      };
      const colX = {
        name: 50,
        strength: 50 + colWidths.name,
        dosage: 50 + colWidths.name + colWidths.strength,
        frequency: 50 + colWidths.name + colWidths.strength + colWidths.dosage,
        duration: 50 + colWidths.name + colWidths.strength + colWidths.dosage + colWidths.frequency,
        qty: 50 + colWidths.name + colWidths.strength + colWidths.dosage + colWidths.frequency + colWidths.duration,
        morning: 50 + colWidths.name + colWidths.strength + colWidths.dosage + colWidths.frequency + colWidths.duration + colWidths.qty,
        afternoon: 50 + colWidths.name + colWidths.strength + colWidths.dosage + colWidths.frequency + colWidths.duration + colWidths.qty + colWidths.morning,
        night: 50 + colWidths.name + colWidths.strength + colWidths.dosage + colWidths.frequency + colWidths.duration + colWidths.qty + colWidths.morning + colWidths.afternoon,
      };

      // Header background
      doc.rect(50, currentY, 495, 20).fill("#F1F5F9");
      doc.fillColor(darkColor).font("Helvetica-Bold").fontSize(8);
      doc.text("Medicine Name", colX.name + 6, currentY + 6);
      doc.text("Strength", colX.strength + 4, currentY + 6);
      doc.text("Dosage", colX.dosage + 4, currentY + 6);
      doc.text("Freq", colX.frequency + 4, currentY + 6);
      doc.text("Dur", colX.duration + 4, currentY + 6);
      doc.text("Qty", colX.qty + 4, currentY + 6);
      doc.text("Morn", colX.morning + 4, currentY + 6);
      doc.text("Aftn", colX.afternoon + 4, currentY + 6);
      doc.text("Night", colX.night + 4, currentY + 6);

      currentY += 20;

      // Table Rows
      if (data.medications.length === 0) {
        doc.rect(50, currentY, 495, 20).strokeColor(borderColor).stroke();
        doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(9).text("No medications prescribed.", 60, currentY + 6);
        currentY += 20;
      } else {
        doc.fontSize(8);
        for (const med of data.medications) {
          // Zebra striping
          doc.rect(50, currentY, 495, 22).strokeColor(borderColor).stroke();
          
          doc.fillColor(darkColor).font("Helvetica-Bold").text(med.name, colX.name + 6, currentY + 7);
          doc.font("Helvetica").fillColor(darkColor);
          doc.text(med.strength || "—", colX.strength + 4, currentY + 7);
          doc.text(med.dosage || "—", colX.dosage + 4, currentY + 7);
          doc.text(med.frequency || "—", colX.frequency + 4, currentY + 7);
          doc.text(med.duration || "—", colX.duration + 4, currentY + 7);

          const qty = (parseFloat(med.dosage || "") || 0) * (parseFloat(med.frequency || "") || 0) * (parseFloat(med.duration || "") || 0);
          const qtyStr = qty > 0 ? String(qty) : "—";
          doc.text(qtyStr, colX.qty + 4, currentY + 7);

          const instLower = (med.instructions || "").toLowerCase();
          const hasMorning = instLower.includes("morning");
          const hasAfternoon = instLower.includes("afternoon");
          const hasNight = instLower.includes("night");

          // For morning
          if (hasMorning) {
            doc.fillColor("#059669").font("Helvetica-Bold").text("Yes", colX.morning + 8, currentY + 7);
          } else {
            doc.fillColor("#94A3B8").font("Helvetica").text("—", colX.morning + 14, currentY + 7);
          }

          // For afternoon
          if (hasAfternoon) {
            doc.fillColor("#059669").font("Helvetica-Bold").text("Yes", colX.afternoon + 8, currentY + 7);
          } else {
            doc.fillColor("#94A3B8").font("Helvetica").text("—", colX.afternoon + 14, currentY + 7);
          }

          // For night
          if (hasNight) {
            doc.fillColor("#059669").font("Helvetica-Bold").text("Yes", colX.night + 10, currentY + 7);
          } else {
            doc.fillColor("#94A3B8").font("Helvetica").text("—", colX.night + 16, currentY + 7);
          }

          currentY += 22;
        }
      }

      // --- LAB & RADIOLOGY ---
      let hasDiagnostics = data.labOrders.length > 0 || data.radiologyOrders.length > 0;
      if (hasDiagnostics) {
        currentY += 20;
        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("DIAGNOSTICS & IMAGING ORDERS", 50, currentY);
        doc.moveTo(50, currentY + 14).lineTo(545, currentY + 14).strokeColor(borderColor).lineWidth(0.5).stroke();
        currentY += 22;

        if (data.labOrders.length > 0) {
          doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(9.5).text("Laboratory Tests:", 55, currentY);
          doc.fillColor(darkColor).font("Helvetica").text(data.labOrders.join(", "), 160, currentY, { width: 380 });
          currentY += Math.max(18, Math.ceil(data.labOrders.join(", ").length / 60) * 12);
        }

        if (data.radiologyOrders.length > 0) {
          doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(9.5).text("Radiology Orders:", 55, currentY);
          doc.fillColor(darkColor).font("Helvetica").text(data.radiologyOrders.join(", "), 160, currentY, { width: 380 });
          currentY += 22;
        }
      }

      // --- ADVICE & FOLLOW UP ---
      if (data.advice || data.followUpDate) {
        currentY += 10;
        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("ADVICE & FOLLOW-UP", 50, currentY);
        doc.moveTo(50, currentY + 14).lineTo(545, currentY + 14).strokeColor(borderColor).lineWidth(0.5).stroke();
        currentY += 22;

        if (data.advice) {
          doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(9.5).text("Instructions / Advice:", 55, currentY);
          doc.fillColor(darkColor).font("Helvetica").text(data.advice, 160, currentY, { width: 380 });
          currentY += Math.max(18, Math.ceil(data.advice.length / 60) * 12);
        }

        if (data.followUpDate) {
          doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(9.5).text("Follow-up Date:", 55, currentY);
          const fDateStr = new Date(data.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          doc.fillColor("#B91C1C").font("Helvetica-Bold").text(fDateStr, 160, currentY);
          currentY += 20;
        }
      }

      // --- FOOTER BLOCK: QR CODE, SIGNATURE, SEAL ---
      // Stay on current page, but make sure footer fits
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      const footerTop = 660; // Push down to bottom of page (A4 height is 841.89)

      // QR Code
      doc.image(qrBuffer, 50, footerTop, { width: 85 });
      doc.fillColor(secondaryColor).font("Helvetica").fontSize(7.5);
      doc.text("Scan QR to verify Rx", 53, footerTop + 90);

      // Hospital Seal
      doc.save();
      doc.translate(270, footerTop + 42);
      doc.strokeColor("#E2E8F0").lineWidth(1);
      doc.circle(0, 0, 32).stroke();
      doc.strokeColor("#F1F5F9").circle(0, 0, 28).stroke();
      doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(6);
      doc.text("HOSPITAL SEAL", -25, -7, { width: 50, align: "center" });
      doc.text("VERIFIED", -25, 3, { width: 50, align: "center" });
      doc.restore();

      // Signature Area
      doc.moveTo(410, footerTop + 55).lineTo(540, footerTop + 55).strokeColor(secondaryColor).lineWidth(0.5).stroke();
      doc.fillColor(darkColor).font("Helvetica-Oblique").fontSize(13).text(data.doctorName, 410, footerTop + 35, { align: "center", width: 130 });
      doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5);
      doc.text("Authorized Signature", 410, footerTop + 60, { align: "center", width: 130 });
      if (data.doctorLicenseNo) {
        doc.font("Helvetica").fontSize(7.5).text(`Reg No: ${data.doctorLicenseNo}`, 410, footerTop + 72, { align: "center", width: 130 });
      }

      // Final Terms & Conditions Disclaimer
      doc.fillColor(secondaryColor).font("Helvetica").fontSize(7).text(
        "This is an electronically generated and validated digital prescription. Any alteration invalidates this record. In case of emergency or severe adverse reactions, please visit the nearest hospital emergency room immediately.",
        50,
        760,
        { width: 495, align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
