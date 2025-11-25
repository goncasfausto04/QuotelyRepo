import express from "express";

export default function makeAnalyzeRouter({
  ai,
  retryWithBackoff,
  supabase,
  upload,
}) {
  const router = express.Router();

  // Email analysis
  router.post("/analyze-email", async (req, res) => {
    const { emailText } = req.body;

    console.log("📧 Email analysis requested");
    console.log(`📝 Email length: ${emailText?.length || 0} characters`);

    if (!emailText?.trim()) {
      console.log("❌ No email text provided");
      return res.status(400).json({ error: "No email text provided" });
    }

    try {
      console.log("🤖 Sending to AI for analysis...");

      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are a data extraction assistant. Extract factual information from this quote email. Do NOT provide ratings or opinions.

REQUIRED OUTPUT FORMAT (valid JSON only, no markdown):
{\n  "supplier_name": "string or null",\n  "contact_email": "string or null",\n  "contact_phone": "string or null",\n  "total_price": number or null,\n  "currency": "string or null",\n  "unit_price": number or null,\n  "quantity": number or null,\n  "lead_time_days": number or null,\n  "delivery_date": "YYYY-MM-DD or null",\n  "materials_included": ["array of strings"],\n  "specifications": ["array of key specs mentioned"],\n  "payment_terms": "string or null",\n  "warranty_period": "string or null",\n  "warranty_months": number or null,\n  "shipping_cost": number or null,\n  "additional_fees": [{"description": "string", "amount": number}],\n  "certifications": ["array of certifications mentioned"],\n  "notes": "string with any additional relevant observations"\n}\n\nEXTRACTION RULES:\n1. Extract ONLY factual data present in the email\n2. Do NOT make assumptions or infer information\n3. Convert time periods to days (e.g., "2 weeks" = 14)\n4. Convert warranty to months (e.g., "12 months" = 12, "1 year" = 12)\n5. Extract ALL numerical values without currency symbols\n6. If information is not explicitly stated, use null\n7. Ensure output is valid JSON without markdown formatting\n\nEMAIL TO ANALYZE:\n${emailText}\n\nOUTPUT (valid JSON only):`,
        });
      });

      let cleanText = response.text.trim();
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      console.log("✅ Email analysis completed successfully");
      console.log(`📊 Extracted data length: ${cleanText.length} characters`);

      res.json({ analysis: cleanText });
    } catch (err) {
      console.error("❌ Error analyzing email:", err.message);
      res.status(500).json({
        error:
          err.status === 503
            ? "AI service is temporarily overloaded. Please try again in a moment."
            : "Failed to analyze email",
        details: err.message,
      });
    }
  });

  // PDF analysis
  router.post("/analyze-pdf", upload.single("pdfFile"), async (req, res) => {
    const { briefingId } = req.body;

    console.log("📄 PDF analysis requested");

    if (!req.file) {
      console.log("❌ No PDF file uploaded");
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    if (!briefingId) {
      console.log("❌ No briefing ID provided");
      return res.status(400).json({ error: "Briefing ID is required" });
    }

    console.log(
      `📎 File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(
        2
      )} KB)`
    );
    console.log(`🆔 Briefing ID: ${briefingId}`);

    try {
      console.log("🤖 Sending PDF to AI for analysis...");

      const pdfBase64 = req.file.buffer.toString("base64");
      console.log(
        `🔄 PDF encoded to base64 (${(pdfBase64.length / 1024).toFixed(2)} KB)`
      );

      const response = await retryWithBackoff(
        async () => {
          return await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: `You are a data extraction assistant. Extract factual information from this quote PDF. Do NOT provide ratings or opinions.

REQUIRED OUTPUT FORMAT (valid JSON only, no markdown):\n{\n  "supplier_name": "string or null",\n  "contact_email": "string or null",\n  "contact_phone": "string or null",\n  "total_price": number or null,\n  "currency": "string or null",\n  "unit_price": number or null,\n  "quantity": number or null,\n  "lead_time_days": number or null,\n  "delivery_date": "YYYY-MM-DD or null",\n  "materials_included": ["array of strings"],\n  "specifications": ["array of key specs mentioned"],\n  "payment_terms": "string or null",\n  "warranty_period": "string or null",\n  "warranty_months": number or null,\n  "shipping_cost": number or null,\n  "additional_fees": [{"description": "string", "amount": number}],\n  "certifications": ["array of certifications mentioned"],\n  "notes": "string with any additional relevant observations"\n}\n\nEXTRACTION RULES:\n1. Extract ONLY factual data present in the PDF\n2. Do NOT make assumptions or infer information\n3. Convert time periods to days (e.g., "2 weeks" = 14)\n4. Convert warranty to months (e.g., "12 months" = 12, "1 year" = 12)\n5. Extract ALL numerical values without currency symbols\n6. If information is not explicitly stated, use null\n7. Ensure output is valid JSON without markdown formatting\n\nOUTPUT (valid JSON only):`,
              },
            ],
          });
        },
        5,
        2000
      );

      let cleanText = response.text.trim();
      cleanText = cleanText.replace(/``````\s*/g, "");

      const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      const analysis = JSON.parse(cleanText);
      console.log("✅ PDF analysis completed successfully");

      // Optionally upload PDF to Supabase Storage
      let pdfUrl = null;
      try {
        console.log("☁️  Uploading PDF to storage...");
        const fileName = `${briefingId}/${Date.now()}_${req.file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("quote-pdfs")
          .upload(fileName, req.file.buffer, {
            contentType: "application/pdf",
          });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("quote-pdfs").getPublicUrl(fileName);
          pdfUrl = publicUrl;
          console.log("✅ PDF uploaded to storage:", fileName);
        } else {
          console.log("⚠️  PDF storage upload error:", uploadError.message);
        }
      } catch (storageError) {
        console.warn(
          "⚠️  PDF storage failed (non-critical):",
          storageError.message
        );
      }

      res.json({
        analysis: cleanText,
        pdfUrl: pdfUrl,
      });
    } catch (err) {
      console.error("Error analyzing PDF:", err);
      res.status(500).json({
        error: "Failed to analyze PDF",
        details: err.message,
      });
    }
  });

  return router;
}
