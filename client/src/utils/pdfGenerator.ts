import React from "react";
import { pdf } from "@react-pdf/renderer";
import toast from "react-hot-toast";

/**
 * Renders a @react-pdf/renderer document component into a Blob and triggers
 * an automatic browser download for the generated PDF.
 *
 * @param docElement - The React Element rendering <Document>...</Document>
 * @param fileName   - Target file name (e.g. "Diagnostic-Report.pdf")
 */
export async function downloadPDF(
  docElement: React.ReactElement,
  fileName: string
): Promise<void> {
  const toastId = toast.loading("Generating PDF document...");
  try {
    const cleanFileName = fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    // Render React-PDF document to Blob
    const blob = await pdf(docElement).toBlob();

    // Create a temporary object URL and click invisible anchor element
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast.success(`Downloaded ${cleanFileName}`, { id: toastId });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    toast.error("Failed to generate PDF report. Please try again.", {
      id: toastId,
    });
  }
}
