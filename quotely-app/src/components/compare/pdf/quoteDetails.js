import { COLORS, money } from "./doc.js";

function header(doc, quote, index) {
  const { pdf, margin, width } = doc;
  const score = quote.score != null ? Math.round(quote.score) : null;
  pdf.setFillColor(...(score > 70 ? COLORS.secondary : score > 50 ? COLORS.primary : COLORS.light));
  pdf.rect(margin, doc.y - 4, width, 10, "F");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont(undefined, "bold");
  pdf.text(`${index + 1}. ${(quote.supplier_name || "Unknown Supplier").substring(0, 30)}`, margin + 3, doc.y + 2);
  if (score != null) pdf.text(`${score}%`, margin + width - 15, doc.y + 2);
  doc.y += 12;
}

function grid(doc, quote) {
  const { pdf, margin, width } = doc;
  const cells = [
    ["Price", money(quote.total_price, quote.currency)],
    ["Lead Time", quote.lead_time_days ? `${quote.lead_time_days} days` : "—"],
    ["Warranty", quote.warranty_months ? `${quote.warranty_months} months` : "—"],
    ["Shipping", money(quote.shipping_cost, quote.currency)],
  ];
  pdf.setFontSize(9);
  cells.forEach(([label, value], i) => {
    const row = Math.floor(i / 2);
    const x = margin + 5 + (i % 2) * (width / 2);
    const y = doc.y + row * 7;
    if (row % 2 === 0 && i % 2 === 0) {
      pdf.setFillColor(...COLORS.background);
      pdf.rect(margin, y - 4, width, 6.5, "F");
    }
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(...COLORS.primary);
    pdf.text(`${label}:`, x, y);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(...COLORS.dark);
    pdf.text(value, x + 30, y);
  });
  doc.y += 18;
}

function extras(doc, quote) {
  const { pdf, margin, width } = doc;
  pdf.setFontSize(8);
  for (const [label, value] of [
    ["Payment Terms", quote.payment_terms],
    ["Input Method", quote.input_method?.replace(/_/g, " ")],
  ]) {
    if (!value) continue;
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(...COLORS.primary);
    pdf.text(`${label}:`, margin + 5, doc.y);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(...COLORS.dark);
    const wrapped = pdf.splitTextToSize(String(value), width - 40);
    pdf.text(wrapped, margin + 35, doc.y);
    doc.y += wrapped.length * 3 + 2;
  }

  const materials = quote.analysis_json?.materials_included || [];
  if (materials.length) {
    doc.y += 4;
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(...COLORS.primary);
    pdf.text("Materials Included:", margin + 5, doc.y);
    doc.y += 4;
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(...COLORS.dark);
    materials.slice(0, 4).forEach((m) => {
      pdf.text(`• ${String(m).substring(0, 60)}`, margin + 10, doc.y);
      doc.y += 3.5;
    });
    if (materials.length > 4) {
      pdf.text(`... and ${materials.length - 4} more`, margin + 10, doc.y);
      doc.y += 3.5;
    }
  }
}

export function drawQuoteDetails(doc, quotes) {
  quotes.forEach((quote, i) => {
    doc.ensureSpace(50);
    header(doc, quote, i);
    grid(doc, quote);
    extras(doc, quote);
    doc.y += 5;
    doc.pdf.setDrawColor(...COLORS.light);
    doc.pdf.setLineWidth(0.3);
    doc.pdf.line(doc.margin, doc.y, doc.margin + doc.width, doc.y);
    doc.y += 7;
  });
}
