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

// --- ROUTE 2: Project Briefing Questions ---
const generateQuestions = async (userDescription) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
You are an expert project discovery assistant.

Your job is to analyze this project description and generate exactly **8 targeted questions** that will help gather complete technical and business requirements.

🧭 **GUIDELINES**
- The questions should be **clear**, **non-redundant**, and **specific** to the provided description.
- Avoid generic fluff like “What's your budget?” unless relevant.
- Cover key areas such as: scope, functionality, design, integrations, timelines, target audience, success criteria, and constraints.
- Do not repeat or rephrase similar questions.

Return output as a **valid JSON array of 8 strings only**, e.g.:
["Question 1?", "Question 2?", "Question 3?", ...]

Project Description:
"${userDescription}"

Return only the JSON array. No markdown, no comments, no text outside the array.`,
  });

  let questions;
  try {
    const jsonMatch = response.text.match(/\[.*\]/s);
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0]);
    } else throw new Error("No JSON array found");
  } catch {
    // fallback if JSON parsing fails
    questions = response.text
      .split("\n")
      .filter((line) => line.trim() && line.includes("?"))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .slice(0, 8);
  }

  return questions;
};

app.post("/start", async (req, res) => {
  const { description } = req.body;
  if (!description?.trim())
    return res.status(400).json({ error: "Project description is required" });

  try {
    const questions = await generateQuestions(description);
    res.json({
      message:
        "Hello! I'm here to assist you. Please answer the following questions to proceed.",
      questions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTE 3: Briefing Creation ---
const generateBriefingWithEstimates = async (answers) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
You are a professional project analyst.

Based on the following set of client answers, create a **concise and professional project briefing document** with realistic **cost** and **timeline estimates**.

🧩 **REQUIREMENTS**
- Structure the briefing clearly with headings and sections.
- Include: *Project Summary, Objectives, Scope, Deliverables, Technical Requirements, Timeline Estimate, Cost Estimate, and Risks/Notes.*
- Write in a **neutral, professional tone**.
- Be specific when possible (e.g., “Estimated 4-6 weeks for MVP” rather than “a few weeks”).
- If any critical details are missing, infer reasonable assumptions and mention them in “Notes”.
- Return the final output formatted in Markdown with clear section headings (no code blocks, no JSON, no metadata).

Client Answers:
${answers.map((a) => a.trim()).join(" | ")}

Generate the briefing document now.`,
  });

  return response.text;
};

app.post("/briefing", async (req, res) => {
  const { answers, approved } = req.body;

  if (!answers) return res.status(400).json({ error: "Answers are required" });

  if (!approved) {
    return res.json({
      message:
        "Briefing is pending approval. Estimates will be generated after approval.",
    });
  }

  try {
    const briefing = await generateBriefingWithEstimates(answers);
    res.json({ briefing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- Start unified server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
