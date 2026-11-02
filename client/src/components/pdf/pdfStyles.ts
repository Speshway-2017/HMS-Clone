import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1E293B",
    backgroundColor: "#FFFFFF",
  },
  
  // Header Banner
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#0F172A",
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 16,
  },
  hospitalInfo: {
    flexDirection: "column",
  },
  hospitalName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  hospitalSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2,
  },
  documentBadgeContainer: {
    alignItems: "flex-end",
  },
  documentBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderStyle: "solid",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  documentTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    textTransform: "uppercase",
  },
  docIdText: {
    fontSize: 7,
    color: "#64748B",
    marginTop: 3,
  },

  // Patient & Clinical Info Section
  infoSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "solid",
    padding: 10,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItemHalf: {
    width: "50%",
    marginBottom: 6,
    flexDirection: "row",
  },
  infoItemThird: {
    width: "33.33%",
    marginBottom: 6,
    flexDirection: "row",
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    width: 90,
  },
  infoValue: {
    fontSize: 8.5,
    color: "#0F172A",
    flex: 1,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    borderLeftStyle: "solid",
    paddingLeft: 6,
  },

  // Table Styles
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  tableCell: {
    fontSize: 8.5,
    color: "#334155",
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },

  // Status Badges
  statusPillSuccess: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  statusPillNormal: {
    backgroundColor: "#F1F5F9",
    color: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
  },
  statusPillWarning: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },

  // Notes Box
  notesBox: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.3,
  },

  // Doctor Signature Section
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
  },
  signatureBox: {
    alignItems: "center",
    width: 140,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#94A3B8",
    borderBottomStyle: "solid",
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  signatureTitle: {
    fontSize: 7.5,
    color: "#64748B",
  },

  // Footer Disclaimer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#94A3B8",
    textAlign: "center",
  },
});
