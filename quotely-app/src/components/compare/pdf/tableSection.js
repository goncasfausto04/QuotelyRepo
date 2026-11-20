import { COLORS, money } from "./doc.js";

export function drawTable(doc, quotes) {
  const { pdf, margin, width } = doc;
  doc.ensureSpace(50);
  doc.sectionHeader("Quote Comparison Table");

  pdf.setFillColor(...COLORS.dark);
  pdf.rect(margin, doc.y - 5, width, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont(undefined, "bold");
  const col = width / 4;
  ["Supplier", "Total Price", "Lead Time", "Score"].forEach((h, i) => pdf.text(h, margin + 3 + i * col, doc.y));
  doc.y += 7;

  pdf.setFontSize(8);
  quotes.slice(0, 15).forEach((q, i) => {
    doc.ensureSpace(20);
    if (i % 2 === 0) {
      pdf.setFillColor(...COLORS.background);
      pdf.rect(margin, doc.y - 5, width, 6, "F");
    }
    const good = q.score > 70;
    pdf.setTextColor(...(good ? COLORS.primary : COLORS.dark));
    pdf.setFont(undefined, "normal");
    pdf.text((q.supplier_name || "Unknown").substring(0, 18), margin + 3, doc.y);
    pdf.text(money(q.total_price, q.currency), margin + col + 3, doc.y);
    pdf.text(q.lead_time_days ? `${q.lead_time_days}d` : "—", margin + col * 2 + 3, doc.y);
    pdf.setFont(undefined, good ? "bold" : "normal");
    pdf.text(q.score != null ? `${Math.round(q.score)}%` : "—", margin + col * 3 + 3, doc.y);
    doc.y += 6;
  });
  doc.y += 10;
}
