import toast from "react-hot-toast";

/**
 * Utility to export tabular data to a real Excel/CSV spreadsheet.
 * Uses UTF-8 BOM byte array so MS Excel automatically detects columns, numbers, and special characters.
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  try {
    const csvLines: string[] = [];

    // Header row
    csvLines.push(headers.map((h) => `"${String(h ?? "").replace(/"/g, '""')}"`).join(","));

    // Data rows
    rows.forEach((row) => {
      csvLines.push(row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","));
    });

    const csvString = csvLines.join("\r\n");
    // Add UTF-8 BOM so MS Excel displays unicode characters properly
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const cleanFilename = filename.toLowerCase().endsWith(".csv") || filename.toLowerCase().endsWith(".xlsx")
      ? filename
      : `${filename}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Successfully exported ${cleanFilename}!`);
  } catch (err: any) {
    console.error("Excel Export Error:", err);
    toast.error("Failed to export Excel file.");
  }
}

/**
 * Utility to parse an uploaded Excel / CSV file into an array of JS objects.
 */
export function parseExcelOrCSV(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error("File is empty.");
        }

        const lines = text
          .split(/\r\n|\n|\r/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          throw new Error("No readable lines found in the file.");
        }

        // Parse CSV line helper handling quotes
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
        const dataRows = lines.slice(1);

        const data: Record<string, string>[] = dataRows.map((rowLine) => {
          const values = parseLine(rowLine).map((v) => v.replace(/^"|"$/g, ""));
          const rowObj: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowObj[header] = values[index] ?? "";
          });
          return rowObj;
        });

        resolve({ headers, data });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };

    reader.readAsText(file);
  });
}

/**
 * Export report preview for printing/PDF
 */
export function exportToPDFReport(title: string, headers: string[], rows: (string | number)[][]) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF report.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
            .header { border-bottom: 2px solid #1e2b4f; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: bold; color: #1e2b4f; margin: 0; }
            .meta { font-size: 11px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background-color: #f1f5f9; color: #334155; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
            td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${title}</h1>
              <p class="meta">HMS Enterprise Hospital Management Network</p>
            </div>
            <div class="meta" style="text-align: right;">
              <p>Generated: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}</p>
              <p>Official System Output</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "—"}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>

          <div class="footer">
            Report generated electronically. Authorised Signatory Not Required.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success("Generated PDF Report View.");
  } catch (err: any) {
    console.error("PDF Export Error:", err);
    toast.error("Failed to generate PDF.");
  }
}
