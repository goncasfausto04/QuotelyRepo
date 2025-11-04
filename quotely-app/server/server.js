// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- Health check route ---
app.get("/", (req, res) => res.send("✅ AI Backend is running"));

// --- Single Google AI instance ---
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, // Uses the same key for all routes
});

// --- ROUTE 1: Email / Quote Analysis ---
app.post("/api/analyze-email", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText?.trim())
    return res.status(400).json({ error: "No email text provided" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are a *Procurement Quote Analysis Assistant*.

Your task is to analyze the following supplier quote email and extract structured data for procurement comparison.

⚙️ **OUTPUT RULES (MUST FOLLOW STRICTLY)**
- Output **only** valid JSON. No markdown, no explanations.
- If information is missing or unclear, use **null** (not empty strings).
- All numeric fields must be **numbers without currency symbols**.
- Dates must be ISO formatted ("YYYY-MM-DD").
- Arrays must contain plain strings, not objects.
- Do **not** add extra fields.

📦 **REQUIRED JSON STRUCTURE**
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
    "reasoning": "string summarizing rating logic"
  },
  "red_flags": ["array of concerns or missing info"],
  "notes": "string with other relevant observations"
}

📋 **EVALUATION RULES**
1. Extract *all* numerical values (no symbols).
2. If multiple prices exist, prefer **total price**.
3. Convert time periods to days (e.g., “2 weeks” → 14).
4. Include all materials/items explicitly mentioned.
5. Flag any missing or ambiguous data in "red_flags".
6. Ratings should be realistic; use 5 only for exceptional quotes.
7. Keep reasoning concise and factual.

📧 **EMAIL TO ANALYZE:**
${emailText}

Return **only** the JSON output. No preamble, no explanation.`,
    });

    const cleanText = response.text.replace(/^[^{\[]+/, "").trim(); // strip any junk before JSON
    res.json({ analysis: cleanText });
  } catch (err) {
    console.error("Error analyzing email:", err);
    res.status(500).json({ error: "Failed to analyze email" });
  }
});

// --- ROUTE 2: Project (Procurement) Question Generation ---
const generateProcurementQuestions = async (userDescription) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
You are an assistant helping a user **compose an inquiry email to a supplier or service provider**.

Based on the short description below, ask the most relevant and specific **questions** you need in order to write a complete, professional email.  

✅ **Rules for generating questions:**
- Ask **only questions necessary** to understand what the user wants to request.
- Focus on key aspects such as: type of product/service, specifications, quantity, brand/model, delivery or pickup, timeline, budget, and contact preferences.
- Keep each question **concise and conversational**, as if you’re chatting.
- Avoid repeating or rephrasing questions.
- Ask between **5–8 questions** maximum.

Return output as a **valid JSON array** of questions like:
["Question 1?", "Question 2?", "Question 3?"]

📝 User’s request:
"${userDescription}"

Return only the JSON array — no other text.`,
  });

  let questions;
  try {
    const jsonMatch = response.text.match(/\[.*\]/s);
    if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    else throw new Error("No JSON found");
  } catch {
    questions = response.text
      .split("\n")
      .filter((q) => q.trim().endsWith("?"))
      .map((q) => q.trim())
      .slice(0, 8);
  }

  return questions;
};

app.post("/start", async (req, res) => {
  const { description } = req.body;
  if (!description?.trim())
    return res.status(400).json({ error: "Description is required" });

  try {
    const questions = await generateProcurementQuestions(description);
    res.json({
      message: "Let's get some details so I can help you write the perfect inquiry email.",
      questions,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// --- ROUTE 3: Email Composition ---
const generateSupplierEmail = async (answers) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
You are a professional assistant that writes **inquiry emails to suppliers or workshops**, helping a user compose an email.

The user has provided the following answers to your questions:
${answers.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}

✉️ Write a short, clear, and polite **email to the supplier** that includes all relevant details for the request.
- Use a professional and friendly tone.
- Make it sound natural (as if written by a person, not AI).
- Include all key info: specifications, quantities, preferences, delivery or timing, etc.
- End with a clear call to action (e.g., “Please confirm availability and send a quote.”).
- Do not include placeholders or notes to the user.

📬 Return only the plain email text — no markdown, no JSON, no explanation.`,
  });

  return response.text.trim();
};

app.post("/compose-email", async (req, res) => {
  const { answers } = req.body;
  if (!answers || !Array.isArray(answers))
    return res.status(400).json({ error: "Answers array is required" });

  try {
    const email = await generateSupplierEmail(answers);
    res.json({ email });
  } catch (error) {
    console.error("Error generating email:", error);
    res.status(500).json({ error: "Failed to generate email" });
  }
});


// --- Start unified server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
