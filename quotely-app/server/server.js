import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({}); // automatically uses GEMINI_API_KEY

app.post("/api/analyze-email", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText)
    return res.status(400).json({ error: "No email text provided" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a procurement analysis assistant. Analyze the following supplier quote email and extract key information for comparison.

REQUIRED OUTPUT FORMAT (valid JSON only, no markdown):
{
  "supplier_name": "string or null",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "total_price": number or null,
  "currency": "string or null",
  "unit_price": number or null,
  "quantity": number or null,
  "lead_time_days": number or null,
  "delivery_date": "YYYY-MM-DD or null",
  "materials_included": ["array of strings"],
  "specifications": ["array of key specs mentioned"],
  "payment_terms": "string or null",
  "warranty_period": "string or null",
  "shipping_cost": number or null,
  "additional_fees": ["array of fee descriptions"],
  "rating": {
    "overall": number (1-5),
    "price_competitiveness": number (1-5),
    "delivery_speed": number (1-5),
    "completeness": number (1-5),
    "reasoning": "string explaining the rating"
  },
  "red_flags": ["array of any concerns or missing critical info"],
  "notes": "string with any additional relevant observations"
}

EXTRACTION RULES:
1. Extract ALL numerical values without currency symbols
2. If multiple prices exist, use the TOTAL price
3. Convert time periods to days (e.g., "2 weeks" = 14 days)
4. List ALL materials/items mentioned in the quote
5. Flag missing critical information in "red_flags"
6. Be conservative with ratings - only 5 stars for exceptional quotes
7. If information is not found, use null (not empty strings)
8. Ensure the output is valid JSON without any markdown formatting

RATING CRITERIA:
- Price competitiveness: Compare to typical market rates if context allows
- Delivery speed: Faster = better (consider lead time)
- Completeness: All info provided, clear terms, professional

EMAIL TO ANALYZE:
${emailText}

OUTPUT (valid JSON only):`,
    });

    res.json({ analysis: response.text });
  } catch (err) {
    console.error("Error analyzing email:", err);
    res.status(500).json({ error: "Failed to analyze email" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
