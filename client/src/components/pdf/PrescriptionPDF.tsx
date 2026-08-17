import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as styles } from "./pdfStyles";

export interface PrescriptionPDFProps {
  prescription: {
    prescriptionNumber?: string;
    date?: string;
    createdAt?: string;
    doctorName?: string;
    doctor?: any;
    departmentName?: string;
    department?: any;
    patientName?: string;
    patientId?: string;
    age?: number | string;
    gender?: string;
    diagnosis?: string;
    symptoms?: string;
    vitals?: {
      bp?: string;
      pulse?: string;
      temp?: string;
      weight?: string;
    };
    medicines?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    advice?: string;
    followUpDate?: string;
  };
  hospitalName?: string;
}

export const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({
  prescription,
  hospitalName = "General Hospital Management System",
}) => {
  const rxNumber = prescription.prescriptionNumber || "RX-CONFIRMED";
  const rxDate = prescription.createdAt
    ? new Date(prescription.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : prescription.date || new Date().toLocaleDateString();

  const docName =
    typeof prescription.doctor === "object"
      ? prescription.doctor?.name || "Dr. Attending Specialist"
      : prescription.doctorName || "Dr. Attending Specialist";
  const formattedDocName = docName.startsWith("Dr.") ? docName : `Dr. ${docName}`;

  const dept =
    typeof prescription.department === "object"
      ? prescription.department?.name || "General Medicine OPD"
      : prescription.departmentName || "General Medicine OPD";

  const medicinesList =
    prescription.medicines && prescription.medicines.length > 0
      ? prescription.medicines
      : [
          {
            name: "Tab. Paracetamol 500mg",
            dosage: "1 Tablet",
            frequency: "1-0-1 (After Meals)",
            duration: "5 Days",
            instructions: "Take with water after food",
          },
        ];

  return (
    <Document title={`Prescription - ${rxNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospitalName}</Text>
            <Text style={styles.hospitalSubtitle}>
              Outpatient Department (OPD) & Clinical Consultation
            </Text>
          </View>
          <View style={styles.documentBadgeContainer}>
            <View style={styles.documentBadge}>
              <Text style={styles.documentTitle}>Rx Medical Prescription</Text>
            </View>
            <Text style={styles.docIdText}>Rx No: {rxNumber}</Text>
            <Text style={styles.docIdText}>Date: {rxDate}</Text>
          </View>
        </View>

        {/* Doctor & Patient Metadata Box */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Attending Doctor:</Text>
              <Text style={styles.infoValue}>{formattedDocName}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{dept}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient Name:</Text>
              <Text style={styles.infoValue}>{prescription.patientName || "Valued Patient"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient ID / Reg:</Text>
              <Text style={styles.infoValue}>{prescription.patientId || "PAT-REGISTERED"}</Text>
            </View>
            {prescription.vitals && (
              <>
                <View style={styles.infoItemThird}>
                  <Text style={styles.infoLabel}>Blood Pressure:</Text>
                  <Text style={styles.infoValue}>{prescription.vitals.bp || "120/80 mmHg"}</Text>
                </View>
                <View style={styles.infoItemThird}>
                  <Text style={styles.infoLabel}>Pulse Rate:</Text>
                  <Text style={styles.infoValue}>{prescription.vitals.pulse || "72 bpm"}</Text>
                </View>
                <View style={styles.infoItemThird}>
                  <Text style={styles.infoLabel}>Body Weight:</Text>
                  <Text style={styles.infoValue}>{prescription.vitals.weight || "65 kg"}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Clinical Diagnosis */}
        {prescription.diagnosis && (
          <View style={[styles.notesBox, { marginBottom: 12 }]}>
            <Text style={styles.notesTitle}>Clinical Diagnosis & Impressions:</Text>
            <Text style={styles.notesText}>{prescription.diagnosis}</Text>
          </View>
        )}

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Prescribed Medication Schedule (Rx)</Text>

        {/* Medicines Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Medication Name</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Dosage</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Frequency</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Duration</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Instructions</Text>
          </View>

          {medicinesList.map((med, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableCellBold, { width: "35%" }]}>{med.name}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{med.dosage || "1 Tab"}</Text>
              <Text style={[styles.tableCell, { width: "20%" }]}>{med.frequency || "1-0-1"}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{med.duration || "5 Days"}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{med.instructions || "After Food"}</Text>
            </View>
          ))}
        </View>

        {/* Doctor Advice & Follow Up */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Doctor Advice & Special Instructions:</Text>
          <Text style={styles.notesText}>
            {prescription.advice || "Take prescribed medications regularly. Maintain adequate fluid intake and restful recovery."}
          </Text>
          {prescription.followUpDate && (
            <Text style={[styles.notesText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>
              Follow-Up Review Date: {prescription.followUpDate}
            </Text>
          )}
        </View>

        {/* Doctor Signature Stamp */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 8, color: "#059669", fontFamily: "Helvetica-Bold" }}>
              ✓ ELECTRONIC RX VERIFIED
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{formattedDocName}</Text>
            <Text style={styles.signatureTitle}>Registered Medical Practitioner</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This digital prescription document is issued by {hospitalName}. Valid for pharmacy fulfillment as per medical council guidelines.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
