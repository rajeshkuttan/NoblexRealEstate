import jsPDF from "jspdf";

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  if (row.asset && typeof row.asset === "object") {
    const a = row.asset as Record<string, unknown>;
    return { ...row, assetCode: a.investmentCode, assetName: a.investmentName, asset: undefined };
  }
  if (row.holding && typeof row.holding === "object") {
    const h = row.holding as Record<string, unknown>;
    return { ...row, ...h, holding: undefined };
  }
  return row;
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function exportInvestmentReportPdf(
  title: string,
  rows: Record<string, unknown>[],
  filename: string
) {
  const flat = rows.map((r) => flattenRow(r));
  if (!flat.length) return false;

  const pdf = new jsPDF({ orientation: flat[0] && Object.keys(flat[0]).length > 6 ? "landscape" : "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  pdf.setFontSize(14);
  pdf.text(title, margin, y);
  y += 8;
  pdf.setFontSize(8);
  pdf.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  const keys = Object.keys(flat[0]).filter((k) => !["id", "companyId"].includes(k));
  const colW = Math.min(42, (pageW - margin * 2) / Math.max(keys.length, 1));

  pdf.setFont("helvetica", "bold");
  let x = margin;
  for (const key of keys) {
    pdf.text(key.slice(0, 14), x, y);
    x += colW;
  }
  y += 5;
  pdf.setFont("helvetica", "normal");

  for (const row of flat) {
    if (y > pdf.internal.pageSize.getHeight() - 12) {
      pdf.addPage();
      y = 16;
    }
    x = margin;
    for (const key of keys) {
      const text = formatCell(row[key]).slice(0, 22);
      pdf.text(text, x, y);
      x += colW;
    }
    y += 5;
  }

  pdf.save(filename);
  return true;
}
