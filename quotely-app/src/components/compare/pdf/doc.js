// Shared jsPDF helpers: page geometry, colours, a moving y cursor, page breaks.

import jsPDF from "jspdf";

export const COLORS = {
  primary: [41, 98, 255],
  secondary: [79, 172, 254],
  accent: [255, 107, 107],
  dark: [38, 43, 63],
  light: [145, 158, 171],
  background: [245, 247, 250],
};

export const money = (amount, currency) =>
  amount == null || amount === "" ? "—" : `${currency ? `${currency} ` : ""}${parseFloat(amount).toLocaleString()}`;

export function createDoc() {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const doc = { pdf, pageHeight, pageWidth, margin, width: pageWidth - 2 * margin, y: 15 };

  doc.footer = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.light);
    pdf.line(margin, pageHeight - 15, margin + doc.width, pageHeight - 15);
    pdf.text(`Quotely Report • Generated ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
  };

  // New page if fewer than `space` mm are left
  doc.ensureSpace = (space = 30) => {
    if (doc.y <= pageHeight - space) return;
    doc.footer();
    pdf.addPage();
    doc.y = 15;
  };

  doc.sectionHeader = (title) => {
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(margin, doc.y - 3, doc.width, 8, "F");
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.text(title, margin + 5, doc.y + 2);
    doc.y += 10;
  };

  return doc;
}
