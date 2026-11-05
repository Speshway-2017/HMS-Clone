import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as styles } from "./pdfStyles";

export interface ConsultationSlipPDFProps {
  consultation: {
    appointmentId?: string;
    referenceId?: string;
    date?: string;
    time?: string;
    type?: string;
    status?: string;
    doctorName?: string;
    doctor?: any;
    departmentName?: string;
    department?: any;
    patientName?: string;
    patientId?: string;
    chiefComplaint?: string;
    reason?: string;
    symptoms?: string;
    notes?: string;
    vitals?: {
      bp?: string;
      pulse?: string;
      temp?: string;
      weight?: string;
    };
  };
  hospitalName?: string;
}

export const ConsultationSlipPDF: React.FC<ConsultationSlipPDFProps> = ({
  consultation,
  hospitalName = "General Hospital Management System",
}) => {
  const refId = consultation.referenceId || consultation.appointmentId || "OPD-SLIP";
  const dateStr = consultation.date
    ? new Date(consultation.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString();

  const docName =
    typeof consultation.doctor === "object"
      ? consultation.doctor?.name || "Dr. Attending Specialist"
      : consultation.doctorName || "Dr. Attending Specialist";
  const formattedDocName = docName.startsWith("Dr.") ? docName : `Dr. ${docName}`;

  const dept =
    typeof consultation.department === "object"
      ? consultation.department?.name || "General OPD Medicine"
      : consultation.departmentName || "General OPD Medicine";

  return (
    <Document title={`Consultation Slip - ${refId}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospitalName}</Text>
            <Text style={styles.hospitalSubtitle}>
              Outpatient Department (OPD) Consultation Slip
            </Text>
          </View>
          <View style={styles.documentBadgeContainer}>
            <View style={styles.documentBadge}>
              <Text style={styles.documentTitle}>OPD Consultation Slip</Text>
            </View>
            <Text style={styles.docIdText}>Ref ID: {refId}</Text>
            <Text style={styles.docIdText}>Date: {dateStr} at {consultation.time || "Scheduled Time"}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient Name:</Text>
              <Text style={styles.infoValue}>{consultation.patientName || "Valued Patient"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient ID:</Text>
              <Text style={styles.infoValue}>{consultation.patientId || "PAT-REGISTERED"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Attending Doctor:</Text>
              <Text style={styles.infoValue}>{formattedDocName}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{dept}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Consultation Mode:</Text>
              <Text style={styles.infoValue}>{consultation.type || "In-Person OP Visit"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.statusPillSuccess}>
                {(consultation.status || "CONFIRMED").toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Clinical Symptoms & Visit Reason */}
        <Text style={styles.sectionTitle}>Chief Symptoms & Reason for Visit</Text>
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>
            {consultation.chiefComplaint || consultation.reason || consultation.symptoms || consultation.notes || "General OPD Consultation & Routine Medical Review."}
          </Text>
        </View>

        {/* Vitals Log */}
        {consultation.vitals && (
          <>
            <Text style={styles.sectionTitle}>Clinical Vitals Recorded</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Blood Pressure</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Pulse Rate</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Body Temperature</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Body Weight</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCellBold, { width: "25%" }]}>{consultation.vitals.bp || "120/80 mmHg"}</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>{consultation.vitals.pulse || "74 bpm"}</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>{consultation.vitals.temp || "98.6 °F"}</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>{consultation.vitals.weight || "68 kg"}</Text>
              </View>
            </View>
          </>
        )}

        {/* Signature & Stamp */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Receptionist / Triage Nurse</Text>
            <Text style={styles.signatureTitle}>OPD Verification Desk</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{formattedDocName}</Text>
            <Text style={styles.signatureTitle}>Attending Specialist</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Official OPD Consultation Slip generated by {hospitalName}. Present this document at triage and pharmacy counters.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
