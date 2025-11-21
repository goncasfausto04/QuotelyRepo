import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateQuotesPDF(
  quotes,
  briefingTitle,
  userWeights,
  availableParams = []
) {
  // Input validation
  if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
    console.error("No quotes provided for PDF generation");
    return;
  }

  try {
    const pdf = new jsPDF("p", "mm", "a4");
    let yPosition = 15;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add new page if needed
    const checkPageBreak = (neededSpace = 30) => {
      if (yPosition > pageHeight - neededSpace) {
        pdf.addPage();
        yPosition = 15;
        return true;
      }
      return false;
    };

    // ===== TITLE PAGE =====
    pdf.setFontSize(28);
    pdf.setTextColor(40, 100, 180);
    pdf.text("Quote Comparison Report", margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(14);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Briefing: ${briefingTitle || "All Quotes"}`, margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      margin,
      yPosition
    );
    yPosition += 15;

    // Add summary box
    pdf.setFillColor(240, 248, 255);
    pdf.setDrawColor(40, 100, 180);
    pdf.rect(margin, yPosition, contentWidth, 25, "FD");
    yPosition += 5;

    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    pdf.text(`Total Quotes: ${quotes.length}`, margin + 5, yPosition);
    yPosition += 7;

    if (quotes.some((q) => q.score !== undefined && q.score !== null)) {
      const bestQuote =
        quotes.find((q) => q.score !== undefined && q.score !== null) ||
        quotes[0];
      pdf.text(
        `Best Match: ${bestQuote.supplier_name || "Unknown"} (${Math.round(
          bestQuote.score || 0
        )}%)`,
        margin + 5,
        yPosition
      );
      yPosition += 7;
    }

    yPosition += 8;

    // ===== PRIORITIES SECTION =====
    if (userWeights && Object.keys(userWeights).length > 0) {
      checkPageBreak(40);

      pdf.setFontSize(13);
      pdf.setTextColor(40, 100, 180);
      pdf.text("Applied Priorities", margin, yPosition);
      yPosition += 8;

      pdf.setFillColor(230, 245, 255);
      pdf.setDrawColor(100, 150, 200);
      pdf.rect(margin, yPosition - 5, contentWidth, 0.5, "FD");

      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);

      const enabledWeights = Object.entries(userWeights).filter(
        ([_, config]) => config.enabled
      );

      enabledWeights.forEach(([key, config]) => {
        // Get param name from availableParams or format key
        const paramName =
          availableParams.find((p) => p.key === key)?.name ||
          config.name ||
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        const maxWeight = Math.max(...enabledWeights.map(([_, c]) => c.weight));
        const importance = Math.round((config.weight / maxWeight) * 100);
        const barWidth = Math.min((config.weight / maxWeight) * 40, 40);

        // Parameter name and weight
        pdf.text(`${paramName}:`, margin + 5, yPosition);
        pdf.setTextColor(40, 100, 180);
        pdf.text(`${config.weight}/5 (${importance}%)`, margin + 50, yPosition);

        // Weight bar
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margin + 100, yPosition - 2.5, 40, 3);
        pdf.setFillColor(40, 100, 180);
        pdf.rect(margin + 100, yPosition - 2.5, barWidth, 3, "F");

        yPosition += 6;
        pdf.setTextColor(60, 60, 60);
      });

      yPosition += 8;
    }

    // ===== COMPARISON TABLE =====
    checkPageBreak(50);

    pdf.setFontSize(13);
    pdf.setTextColor(40, 100, 180);
    pdf.text("Quick Comparison", margin, yPosition);
    yPosition += 8;

    // Table header
    pdf.setFillColor(40, 100, 180);
    pdf.rect(margin, yPosition - 5, contentWidth, 6, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");

    const colWidth = contentWidth / 4;
    const headers = ["Supplier", "Price", "Lead Time", "Score"];
    headers.forEach((header, idx) => {
      pdf.text(header, margin + idx * colWidth + 3, yPosition);
    });

    pdf.setFont(undefined, "normal");
    yPosition += 5;

    // Table rows
    pdf.setTextColor(60, 60, 60);
    quotes.slice(0, 10).forEach((quote, idx) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(245, 248, 252);
        pdf.rect(margin, yPosition - 5, contentWidth, 6, "F");
      }

      const supplier = (quote.supplier_name || "Unknown").substring(0, 15);
      const price = quote.total_price
        ? `${quote.currency || "USD"} ${parseFloat(
            quote.total_price
          ).toLocaleString()}`
        : "—";
      const leadTime = quote.lead_time_days ? `${quote.lead_time_days}d` : "—";
      const score =
        quote.score !== undefined && quote.score !== null
          ? `${Math.round(quote.score)}%`
          : "—";

      pdf.text(supplier, margin + 3, yPosition);
      pdf.text(price, margin + colWidth + 3, yPosition);
      pdf.text(leadTime, margin + colWidth * 2 + 3, yPosition);
      pdf.text(score, margin + colWidth * 3 + 3, yPosition);

      yPosition += 6;
    });

    yPosition += 10;

    // ===== DETAILED QUOTES =====
    checkPageBreak(50);

    pdf.setFontSize(13);
    pdf.setTextColor(40, 100, 180);
    pdf.text("Detailed Quotes", margin, yPosition);
    yPosition += 10;

    quotes.forEach((quote, index) => {
      checkPageBreak(50);

      // Quote header box
      pdf.setFillColor(220, 240, 255);
      pdf.setDrawColor(40, 100, 180);
      pdf.rect(margin, yPosition - 4, contentWidth, 8, "FD");

      pdf.setFontSize(11);
      pdf.setTextColor(40, 100, 180);
      pdf.setFont(undefined, "bold");
      pdf.text(
        `${index + 1}. ${quote.supplier_name || "Unknown Supplier"}`,
        margin + 3,
        yPosition + 1
      );
      pdf.setFont(undefined, "normal");

      if (quote.score !== undefined && quote.score !== null) {
        pdf.setTextColor(100, 50, 200);
        pdf.setFontSize(10);
        pdf.text(
          `Score: ${Math.round(quote.score)}%`,
          margin + contentWidth - 35,
          yPosition + 1
        );
      }

      yPosition += 10;

      // Details in two columns
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);

      const leftColX = margin + 5;
      const rightColX = margin + contentWidth / 2;
      let leftY = yPosition;
      let rightY = yPosition;

      const details = [
        [
          "Price",
          quote.total_price
            ? `${quote.currency || "USD"} ${parseFloat(
                quote.total_price
              ).toLocaleString()}`
            : "—",
        ],
        [
          "Lead Time",
          quote.lead_time_days ? `${quote.lead_time_days} days` : "—",
        ],
        [
          "Warranty",
          quote.warranty_months ? `${quote.warranty_months} months` : "—",
        ],
        [
          "Shipping",
          quote.shipping_cost
            ? `${quote.currency || "USD"} ${parseFloat(
                quote.shipping_cost
              ).toLocaleString()}`
            : "—",
        ],
      ];

      details.forEach(([label, value], idx) => {
        const isRight = idx >= 2;
        const x = isRight ? rightColX : leftColX;
        const y = isRight ? rightY : leftY;

        pdf.setTextColor(40, 100, 180);
        pdf.setFont(undefined, "bold");
        pdf.text(`${label}:`, x, y);

        pdf.setTextColor(80, 80, 80);
        pdf.setFont(undefined, "normal");
        const wrappedValue = pdf.splitTextToSize(value, 50);
        pdf.text(wrappedValue, x + 25, y);

        if (isRight) {
          rightY += 6;
        } else {
          leftY += 6;
        }
      });

      yPosition = Math.max(leftY, rightY) + 5;

      // Additional details below
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(8);

      const additionalDetails = [
        ["Warranty Details", quote.warranty_period],
        ["Payment Terms", quote.payment_terms],
        ["Input Method", quote.input_method?.replace(/_/g, " ")],
        ["Submitted By", quote.submitted_by],
      ];

      additionalDetails.forEach(([label, value]) => {
        if (value) {
          const wrappedValue = pdf.splitTextToSize(value, contentWidth - 40);
          pdf.setTextColor(40, 100, 180);
          pdf.setFont(undefined, "bold");
          pdf.text(`${label}:`, margin + 5, yPosition);
          pdf.setTextColor(80, 80, 80);
          pdf.setFont(undefined, "normal");
          pdf.text(wrappedValue, margin + 35, yPosition);
          yPosition += wrappedValue.length * 3 + 2;
        }
      });

      // Materials
      if (quote.materials_included && quote.materials_included.length > 0) {
        yPosition += 2;
        pdf.setTextColor(40, 100, 180);
        pdf.setFont(undefined, "bold");
        pdf.text("Materials Included:", margin + 5, yPosition);
        yPosition += 4;
        pdf.setTextColor(80, 80, 80);
        pdf.setFont(undefined, "normal");
        quote.materials_included.slice(0, 5).forEach((material) => {
          pdf.text(`• ${material}`, margin + 10, yPosition);
          yPosition += 3;
        });
        if (quote.materials_included.length > 5) {
          pdf.text(
            `... and ${quote.materials_included.length - 5} more`,
            margin + 10,
            yPosition
          );
          yPosition += 3;
        }
      }

      // Additional fees
      if (quote.additional_fees && quote.additional_fees.length > 0) {
        yPosition += 2;
        pdf.setTextColor(200, 80, 80);
        pdf.setFont(undefined, "bold");
        pdf.text("Additional Fees:", margin + 5, yPosition);
        yPosition += 4;
        pdf.setTextColor(80, 80, 80);
        pdf.setFont(undefined, "normal");
        quote.additional_fees.forEach((fee) => {
          const feeAmount = fee.amount
            ? parseFloat(fee.amount).toLocaleString()
            : "0";
          const feeText = `• ${fee.name || "Fee"}: ${
            quote.currency || "USD"
          } ${feeAmount}`;
          pdf.text(feeText, margin + 10, yPosition);
          yPosition += 3;
        });
      }

      // Separator
      yPosition += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 8;
    });

    // Footer on last page
    checkPageBreak(10);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated by Quotely • ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 10
    );

    // Save PDF
    const filename = briefingTitle
      ? `${briefingTitle
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_quotes_${new Date().getTime()}.pdf`
      : `quotes_comparison_${new Date().getTime()}.pdf`;

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
}
