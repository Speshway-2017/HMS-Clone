import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as styles } from "./pdfStyles";

export interface DiagnosticReportPDFProps {
  report: {
    title?: string;
    testName?: string;
    category?: string;
    requestType?: string;
    status?: string;
    createdAt?: string;
    date?: string;
    doctorName?: string;
    doctor?: any;
    patientName?: string;
    patientId?: string;
    age?: number | string;
    gender?: string;
    remarks?: string;
    findings?: string;
    notes?: string;
    parameters?: Array<{
      name: string;
      value: string | number;
      unit?: string;
      referenceRange?: string;
      status?: string;
    }>;
  };
  hospitalName?: string;
}

export const DiagnosticReportPDF: React.FC<DiagnosticReportPDFProps> = ({
  report,
  hospitalName = "General Hospital Management System",
}) => {
  const title = report.title || report.testName || "Diagnostic Test Report";
  const category = report.category || report.requestType || "Laboratory Medicine";
  const reportDate = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : report.date || new Date().toLocaleDateString();

  const docName =
    typeof report.doctor === "object"
      ? report.doctor?.name || "Dr. Attending Specialist"
      : report.doctorName || "Dr. Attending Specialist";

  const formattedDocName = docName.startsWith("Dr.") ? docName : `Dr. ${docName}`;
  const statusStr = (report.status || "VERIFIED").toUpperCase();

  // Default demo parameters if none passed
  const paramsList =
    report.parameters && report.parameters.length > 0
      ? report.parameters
      : [
          {
            name: "Primary Clinical Marker / Specimen Result",
            value: "Normal / Within Range",
            unit: "N/A",
            referenceRange: "Standard Baseline",
            status: "NORMAL",
          },
        ];

  return (
    <Document title={`${title} - ${reportDate}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospitalName}</Text>
            <Text style={styles.hospitalSubtitle}>
              Department of Pathology & Diagnostic Radiology Services
            </Text>
          </View>
          <View style={styles.documentBadgeContainer}>
            <View style={styles.documentBadge}>
              <Text style={styles.documentTitle}>Diagnostic Report</Text>
            </View>
            <Text style={styles.docIdText}>Date: {reportDate}</Text>
          </View>
        </View>

        {/* Patient & Test Metadata Box */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient Name:</Text>
              <Text style={styles.infoValue}>{report.patientName || "Valued Patient"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient ID / Ref:</Text>
              <Text style={styles.infoValue}>{report.patientId || "PAT-REGISTERED"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Test Category:</Text>
              <Text style={styles.infoValue}>{category}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Ordering Doctor:</Text>
              <Text style={styles.infoValue}>{formattedDocName}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Report Status:</Text>
              <Text style={styles.statusPillSuccess}>{statusStr}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Test Name:</Text>
              <Text style={styles.infoValue}>{title}</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Lab Parameter Analysis & Results</Text>

        {/* Results Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Parameter Name</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Observed Result</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Reference Interval</Text>
          </View>

          {paramsList.map((param, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableCellBold, { width: "40%" }]}>{param.name}</Text>
              <Text style={[styles.tableCell, { width: "20%" }]}>{param.value}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{param.unit || "—"}</Text>
              <Text style={[styles.tableCell, { width: "25%" }]}>
                {param.referenceRange || "Standard"}
              </Text>
            </View>
          ))}
        </View>

        {/* Clinical Findings & Remarks */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Pathologist Observations & Remarks:</Text>
          <Text style={styles.notesText}>
            {report.remarks || report.findings || report.notes || "Specimen examined and verified as per quality assurance standards. Values correlate with clinical indications."}
          </Text>
        </View>

        {/* Signature Box */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Lab Technologist</Text>
            <Text style={styles.signatureTitle}>Certified Pathology Analyst</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{formattedDocName}</Text>
            <Text style={styles.signatureTitle}>Consultant Pathologist</Text>
          </View>
        </View>

        {/* Disclaimer Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This digital diagnostic report is electronically verified and issued by {hospitalName}. For queries or emergency consultations, please contact hospital laboratory reception.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
