import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as styles } from "./pdfStyles";

export interface InvoiceReceiptPDFProps {
  invoice: {
    invoiceNumber?: string;
    invoiceId?: string;
    _id?: string;
    date?: string;
    createdAt?: string;
    patientName?: string;
    patientId?: string;
    status?: string;
    paymentMethod?: string;
    transactionId?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      amount?: number;
      rate?: number;
    }>;
    subtotal?: number;
    discount?: number;
    totalAmount?: number;
    amountPaid?: number;
    balance?: number;
  };
  hospitalName?: string;
}

export const InvoiceReceiptPDF: React.FC<InvoiceReceiptPDFProps> = ({
  invoice,
  hospitalName = "General Hospital Management System",
}) => {
  const invNumber = invoice.invoiceNumber || invoice.invoiceId || invoice._id || "INV-PAYMENT";
  const invDate = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : invoice.date || new Date().toLocaleDateString();

  const statusStr = (invoice.status || "PAID").toUpperCase();
  const total = invoice.totalAmount ?? invoice.amountPaid ?? 500;
  const subtotal = invoice.subtotal ?? total;
  const discount = invoice.discount ?? 0;
  const paid = invoice.amountPaid ?? total;
  const balance = invoice.balance ?? (total - paid > 0 ? total - paid : 0);

  const lineItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            description: "Outpatient OPD Consultation & Specialist Fee",
            quantity: 1,
            amount: total,
          },
        ];

  return (
    <Document title={`Invoice Receipt - ${invNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospitalName}</Text>
            <Text style={styles.hospitalSubtitle}>
              Accounts & Financial Portal — Billing Payment Receipt
            </Text>
          </View>
          <View style={styles.documentBadgeContainer}>
            <View style={styles.documentBadge}>
              <Text style={styles.documentTitle}>Official Receipt</Text>
            </View>
            <Text style={styles.docIdText}>Invoice #: {invNumber}</Text>
            <Text style={styles.docIdText}>Date: {invDate}</Text>
          </View>
        </View>

        {/* Invoice Metadata Box */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Billed To:</Text>
              <Text style={styles.infoValue}>{invoice.patientName || "Valued Patient"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Patient Reg No:</Text>
              <Text style={styles.infoValue}>{invoice.patientId || "PAT-REGISTERED"}</Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Payment Status:</Text>
              <Text
                style={
                  statusStr === "PAID"
                    ? styles.statusPillSuccess
                    : styles.statusPillWarning
                }
              >
                {statusStr}
              </Text>
            </View>
            <View style={styles.infoItemHalf}>
              <Text style={styles.infoLabel}>Payment Mode:</Text>
              <Text style={styles.infoValue}>{invoice.paymentMethod || "UPI / Digital Direct"}</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Itemized Billing Statement</Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Item / Service Description</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: "35%", textAlign: "right" }]}>Amount (₹)</Text>
          </View>

          {lineItems.map((item, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableCellBold, { width: "50%" }]}>{item.description}</Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {item.quantity || 1}
              </Text>
              <Text style={[styles.tableCellBold, { width: "35%", textAlign: "right" }]}>
                ₹{(item.amount || total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Totals Summary */}
        <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
          <View
            style={{
              width: 220,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#CBD5E1",
              borderStyle: "solid",
              borderRadius: 6,
              padding: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 8, color: "#64748B" }}>Subtotal:</Text>
              <Text style={{ fontSize: 8, color: "#0F172A", fontFamily: "Helvetica-Bold" }}>
                ₹{subtotal.toFixed(2)}
              </Text>
            </View>

            {discount > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: "#059669" }}>Discount / Coverage:</Text>
                <Text style={{ fontSize: 8, color: "#059669", fontFamily: "Helvetica-Bold" }}>
                  - ₹{discount.toFixed(2)}
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#CBD5E1",
                borderTopStyle: "solid",
                paddingTop: 4,
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0F172A" }}>
                Total Paid:
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#059669" }}>
                ₹{paid.toFixed(2)}
              </Text>
            </View>

            {balance > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 8, color: "#D97706" }}>Balance Due:</Text>
                <Text style={{ fontSize: 8, color: "#D97706", fontFamily: "Helvetica-Bold" }}>
                  ₹{balance.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature & Stamp */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 8, color: "#059669", fontFamily: "Helvetica-Bold" }}>
              ✓ COMPUTER GENERATED RECEIPT
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Accounts Officer</Text>
            <Text style={styles.signatureTitle}>Hospital Billing & Revenue Dept.</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your payment. This official payment receipt is generated by {hospitalName}.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
