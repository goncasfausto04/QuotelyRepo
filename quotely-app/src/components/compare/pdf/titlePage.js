import { COLORS } from "./doc.js";

export function drawTitlePage(doc, quotes, briefingTitle) {
  const { pdf, margin, width } = doc;
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 0, doc.pageWidth, 40, "F");
  pdf.setFontSize(32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont(undefined, "bold");
  pdf.text("Quote Comparison Report", margin, 25);
  doc.y = 50;

  // Briefing details box
  pdf.setFillColor(...COLORS.background);
  pdf.setDrawColor(...COLORS.secondary);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, doc.y, width, 35, "FD");
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.dark);
  pdf.text("Briefing Details", margin + 5, doc.y + 8);
  pdf.setFontSize(9);
  pdf.setFont(undefined, "normal");
  pdf.text(`Title: ${briefingTitle || "All Quotes"}`, margin + 5, doc.y + 16);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin + 5, doc.y + 23);
  pdf.text(`Total Quotes: ${quotes.length}`, margin + 5, doc.y + 30);
  doc.y += 45;

  // Summary stat boxes
  const scored = quotes.filter((q) => q.score != null);
  const stats = [
    ["Total Quotes", String(quotes.length), COLORS.primary],
    ["Best Match", scored[0]?.supplier_name || "—", COLORS.secondary],
    ["Avg Score", scored.length ? `${Math.round(scored.reduce((s, q) => s + q.score, 0) / scored.length)}%` : "—", COLORS.accent],
  ];
  const boxWidth = (width - 10) / 3;
  stats.forEach(([label, value, color], i) => {
    const x = margin + i * (boxWidth + 5);
    pdf.setFillColor(...color);
    pdf.rect(x, doc.y, boxWidth, 20, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "normal");
    pdf.text(label, x + 3, doc.y + 7);
    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text(value.substring(0, 15), x + 3, doc.y + 16);
  });
  doc.y += 30;
}
