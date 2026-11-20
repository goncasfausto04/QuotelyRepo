import { COLORS } from "./doc.js";

export function drawWeights(doc, weights, params) {
  const enabled = Object.entries(weights || {}).filter(([, c]) => c.enabled);
  if (!enabled.length) return;
  const { pdf, margin } = doc;
  doc.ensureSpace(40);
  doc.sectionHeader("Applied Scoring Weights");
  doc.y += 2;

  const max = Math.max(...enabled.map(([, c]) => c.weight), 1);
  for (const [key, cfg] of enabled) {
    const name = params.find((p) => p.key === key)?.name || key.replace(/_/g, " ");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont(undefined, "bold");
    pdf.text(name, margin + 5, doc.y);
    pdf.setTextColor(...COLORS.primary);
    pdf.setFont(undefined, "normal");
    pdf.text(`${cfg.weight}/5`, margin + 70, doc.y);
    pdf.setDrawColor(...COLORS.light);
    pdf.setLineWidth(0.3);
    pdf.rect(margin + 95, doc.y - 2, 35, 4);
    pdf.setFillColor(...COLORS.secondary);
    pdf.rect(margin + 95, doc.y - 2, (cfg.weight / max) * 35, 4, "F");
    pdf.setTextColor(...COLORS.light);
    pdf.setFontSize(8);
    pdf.text(`${Math.round((cfg.weight / max) * 100)}%`, margin + 132, doc.y);
    doc.y += 7;
  }
  doc.y += 8;
}
