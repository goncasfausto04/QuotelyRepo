import jsPDF from "jspdf";

export async function generateQuotesPDF(
  quotes,
  briefingTitle,
  userWeights,
  availableParams = []
) {
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

    // Color scheme - modern and professional
    const colors = {
      primary: [41, 98, 255], // Bright blue
      secondary: [79, 172, 254], // Light blue
      accent: [255, 107, 107], // Red for warnings
      dark: [38, 43, 63], // Dark text
      light: [145, 158, 171], // Light gray
      background: [245, 247, 250], // Light background
    };

    const checkPageBreak = (neededSpace = 30) => {
      if (yPosition > pageHeight - neededSpace) {
        addPageFooter(pdf, pageHeight, margin, contentWidth);
        pdf.addPage();
        yPosition = 15;
        return true;
      }
      return false;
    };

    const addPageFooter = (pdf, pageHeight, margin, contentWidth) => {
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.light);
      pdf.line(margin, pageHeight - 15, margin + contentWidth, pageHeight - 15);
      pdf.text(
        `Quotely Report • Generated ${new Date().toLocaleDateString()}`,
        margin,
        pageHeight - 10
      );
    };

    // ===== TITLE PAGE =====
    // Logo/Header area
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 40, "F");

    pdf.setFontSize(32);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.text("Quote Comparison Report", margin, 25);
    yPosition = 50;

    // Briefing details box
    pdf.setFillColor(...colors.background);
    pdf.setDrawColor(...colors.secondary);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, contentWidth, 35, "FD");

    pdf.setFontSize(11);
    pdf.setTextColor(...colors.dark);
    pdf.setFont(undefined, "bold");
    pdf.text("Briefing Details", margin + 5, yPosition + 8);

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.text(
      `Title: ${briefingTitle || "All Quotes"}`,
      margin + 5,
      yPosition + 16
    );
    pdf.text(
      `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      margin + 5,
      yPosition + 23
    );
    pdf.text(`Total Quotes: ${quotes.length}`, margin + 5, yPosition + 30);

    yPosition += 45;

    // Summary stats boxes
    const statBoxWidth = (contentWidth - 10) / 3;
    const stats = [
      {
        label: "Total Quotes",
        value: quotes.length.toString(),
        color: colors.primary,
      },
      {
        label: "Best Match",
        value:
          quotes
            .find((q) => q.score !== undefined)
            ?.supplier_name?.substring(0, 15) || "—",
        color: colors.secondary,
      },
      {
        label: "Avg Score",
        value: quotes.some((q) => q.score !== undefined)
          ? `${Math.round(
              quotes.reduce((sum, q) => sum + (q.score || 0), 0) / quotes.length
            )}%`
          : "—",
        color: colors.accent,
      },
    ];

    stats.forEach((stat, idx) => {
      const xPos = margin + idx * (statBoxWidth + 5);
      pdf.setFillColor(...stat.color);
      pdf.rect(xPos, yPosition, statBoxWidth, 20, "F");

      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "normal");
      pdf.text(stat.label, xPos + 3, yPosition + 7);

      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      const valueTruncated = stat.value.substring(0, 12);
      pdf.text(valueTruncated, xPos + 3, yPosition + 16);
    });

    yPosition += 30;

    // ===== PRIORITIES SECTION =====
    if (userWeights && Object.keys(userWeights).length > 0) {
      checkPageBreak(40);

      // Section header
      pdf.setFillColor(...colors.primary);
      pdf.rect(margin, yPosition - 3, contentWidth, 8, "F");
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "bold");
      pdf.text("Applied Scoring Weights", margin + 5, yPosition + 2);
      yPosition += 12;

      pdf.setFontSize(9);
      pdf.setTextColor(...colors.dark);
      pdf.setFont(undefined, "normal");

      const enabledWeights = Object.entries(userWeights).filter(
        ([_, config]) => config.enabled
      );

      const maxWeight = Math.max(...enabledWeights.map(([_, c]) => c.weight));

      enabledWeights.forEach(([key, config]) => {
        const paramName =
          availableParams.find((p) => p.key === key)?.name ||
          config.name ||
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

        const importance = Math.round((config.weight / maxWeight) * 100);
        const barWidth = Math.min((config.weight / maxWeight) * 35, 35);

        // Parameter name
        pdf.setTextColor(...colors.dark);
        pdf.setFont(undefined, "bold");
        pdf.text(`${paramName}`, margin + 5, yPosition);

        // Weight value and percentage
        pdf.setTextColor(...colors.primary);
        pdf.setFont(undefined, "normal");
        pdf.text(`${config.weight}/5`, margin + 70, yPosition);

        // Weight bar background
        pdf.setDrawColor(...colors.light);
        pdf.setLineWidth(0.3);
        pdf.rect(margin + 95, yPosition - 2, 35, 4);

        // Weight bar fill
        pdf.setFillColor(...colors.secondary);
        pdf.rect(margin + 95, yPosition - 2, barWidth, 4, "F");

        // Percentage
        pdf.setTextColor(...colors.light);
        pdf.setFontSize(8);
        pdf.text(`${importance}%`, margin + 132, yPosition);

        yPosition += 7;
        pdf.setFontSize(9);
      });

      yPosition += 8;
    }

    // ===== COMPARISON TABLE =====
    checkPageBreak(50);

    pdf.setFillColor(...colors.primary);
    pdf.rect(margin, yPosition - 3, contentWidth, 8, "F");
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, "bold");
    pdf.text("Quote Comparison Table", margin + 5, yPosition + 2);
    yPosition += 10;

    // Table header
    pdf.setFillColor(...colors.dark);
    pdf.rect(margin, yPosition - 5, contentWidth, 7, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");

    const colWidth = contentWidth / 4;
    const headers = ["Supplier", "Total Price", "Lead Time", "Score"];
    headers.forEach((header, idx) => {
      pdf.text(header, margin + 3 + idx * colWidth, yPosition);
    });

    pdf.setFont(undefined, "normal");
    yPosition += 7;

    // Table rows
    pdf.setFontSize(8);
    quotes.slice(0, 15).forEach((quote, idx) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(...colors.background);
        pdf.rect(margin, yPosition - 5, contentWidth, 6, "F");
      }

      const hasGoodScore = quote.score && quote.score > 70;
      pdf.setTextColor(...(hasGoodScore ? colors.primary : colors.dark));

      const supplier = (quote.supplier_name || "Unknown").substring(0, 18);
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

      // Highlight high scores
      if (hasGoodScore) {
        pdf.setFont(undefined, "bold");
      }
      pdf.text(score, margin + colWidth * 3 + 3, yPosition);
      pdf.setFont(undefined, "normal");

      yPosition += 6;
    });

    yPosition += 10;

    // ===== DETAILED QUOTES =====
    quotes.forEach((quote, index) => {
      checkPageBreak(50);

      // Quote header with colored background
      const scorePercentage = quote.score ? Math.round(quote.score) : null;
      const headerBg =
        scorePercentage && scorePercentage > 70
          ? colors.secondary
          : scorePercentage && scorePercentage > 50
          ? colors.primary
          : colors.light;

      pdf.setFillColor(...headerBg);
      pdf.rect(margin, yPosition - 4, contentWidth, 10, "F");

      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "bold");
      pdf.text(
        `${index + 1}. ${(quote.supplier_name || "Unknown Supplier").substring(
          0,
          30
        )}`,
        margin + 3,
        yPosition + 2
      );

      if (scorePercentage !== null) {
        pdf.setFontSize(10);
        pdf.text(
          `${scorePercentage}%`,
          margin + contentWidth - 15,
          yPosition + 2
        );
      }

      yPosition += 12;

      // Key details in grid
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.dark);
      pdf.setFont(undefined, "bold");

      const detailsGrid = [
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

      const colCount = 2;
      const detailColWidth = contentWidth / colCount;

      detailsGrid.forEach((detail, idx) => {
        const row = Math.floor(idx / colCount);
        const col = idx % colCount;
        const xPos = margin + 5 + col * detailColWidth;
        const yPos = yPosition + row * 7;

        // Background for alternating rows
        if (row % 2 === 0) {
          pdf.setFillColor(...colors.background);
          pdf.rect(margin, yPos - 4, contentWidth, 6.5, "F");
        }

        pdf.setTextColor(...colors.primary);
        pdf.text(`${detail[0]}:`, xPos, yPos);

        pdf.setTextColor(...colors.dark);
        pdf.setFont(undefined, "normal");
        pdf.text(detail[1], xPos + 30, yPos);
        pdf.setFont(undefined, "bold");
      });

      yPosition += 32;

      // Additional information
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.dark);
      pdf.setFont(undefined, "normal");

      const additionalInfo = [
        ["Payment Terms", quote.payment_terms],
        ["Input Method", quote.input_method?.replace(/_/g, " ")],
      ];

      additionalInfo.forEach(([label, value]) => {
        if (value) {
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(...colors.primary);
          pdf.text(`${label}:`, margin + 5, yPosition);
          pdf.setFont(undefined, "normal");
          pdf.setTextColor(...colors.dark);
          const wrapped = pdf.splitTextToSize(value, contentWidth - 40);
          pdf.text(wrapped, margin + 35, yPosition);
          yPosition += wrapped.length * 3 + 2;
        }
      });

      // Materials section
      if (quote.materials_included && quote.materials_included.length > 0) {
        yPosition += 3;
        pdf.setFillColor(...colors.background);
        pdf.rect(margin, yPosition - 4, contentWidth, 0.5, "F");
        yPosition += 5;

        pdf.setFont(undefined, "bold");
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(8);
        pdf.text("Materials Included:", margin + 5, yPosition);
        yPosition += 4;

        pdf.setFont(undefined, "normal");
        pdf.setTextColor(...colors.dark);
        quote.materials_included.slice(0, 4).forEach((material) => {
          pdf.text(`• ${material.substring(0, 40)}`, margin + 10, yPosition);
          yPosition += 3;
        });
        if (quote.materials_included.length > 4) {
          pdf.text(
            `... and ${quote.materials_included.length - 4} more items`,
            margin + 10,
            yPosition
          );
          yPosition += 3;
        }
      }

      // Divider
      yPosition += 5;
      pdf.setDrawColor(...colors.light);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 7;
    });

    // Add footer to last page
    addPageFooter(pdf, pageHeight, margin, contentWidth);

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
