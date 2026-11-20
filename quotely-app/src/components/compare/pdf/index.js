// PDF export of the comparison (title page, weights, table, per-quote details).

import { createDoc } from "./doc.js";
import { drawTitlePage } from "./titlePage.js";
import { drawWeights } from "./weightsSection.js";
import { drawTable } from "./tableSection.js";
import { drawQuoteDetails } from "./quoteDetails.js";

export async function generateQuotesPDF(quotes, briefingTitle, weights, params = []) {
  if (!quotes?.length) return;
  try {
    const doc = createDoc();
    drawTitlePage(doc, quotes, briefingTitle);
    drawWeights(doc, weights, params);
    drawTable(doc, quotes);
    drawQuoteDetails(doc, quotes);
    doc.footer();
    const base = briefingTitle ? briefingTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "quotes_comparison";
    doc.pdf.save(`${base}_${Date.now()}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate the PDF. Please try again.");
  }
}
