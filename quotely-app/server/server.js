// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- Helper: Retry with exponential backoff ---
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isRetriableError = error.status === 503 || error.status === 429;

      if (isLastRetry || !isRetriableError) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i); // Exponential: 1s, 2s, 4s
      console.log(
        `⏳ API overloaded, retrying in ${delay}ms... (attempt ${
          i + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// --- Health check route ---
app.get("/", (req, res) =>
  res.json({
    status: "✅ AI Backend is running",
    endpoints: {
      analyze: "POST /api/analyze-email",
      start: "POST /start",
      compose: "POST /compose-email",
    },
  })
);

// --- Single Google AI instance ---
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// --- ROUTE 1: Email / Quote Analysis ---
app.post("/api/analyze-email", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText?.trim()) {
    return res.status(400).json({ error: "No email text provided" });
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a data extraction assistant. Extract factual information from this quote email. Do NOT provide ratings or opinions.

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
  "warranty_months": number or null,
  "shipping_cost": number or null,
  "additional_fees": [{"description": "string", "amount": number}],
  "certifications": ["array of certifications mentioned"],
  "notes": "string with any additional relevant observations"
}

EXTRACTION RULES:
1. Extract ONLY factual data present in the email
2. Do NOT make assumptions or infer information
3. Convert time periods to days (e.g., "2 weeks" = 14)
4. Convert warranty to months (e.g., "12 months" = 12, "1 year" = 12)
5. Extract ALL numerical values without currency symbols
6. If information is not explicitly stated, use null
7. Ensure output is valid JSON without markdown formatting

EMAIL TO ANALYZE:
${emailText}

OUTPUT (valid JSON only):`,
      });
    });

    let cleanText = response.text.trim();
    cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    res.json({ analysis: cleanText });
  } catch (err) {
    console.error("Error analyzing email:", err);
    res.status(500).json({
      error:
        err.status === 503
          ? "AI service is temporarily overloaded. Please try again in a moment."
          : "Failed to analyze email",
      details: err.message,
    });
  }
});

// --- ROUTE 2: Generate Questions for RFQ ---
app.post("/start", async (req, res) => {
  const { description } = req.body;

  if (!description?.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    console.log("📝 Generating questions for:", description);

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are helping a buyer create a quote request email to send to suppliers.

The buyer said: "${description}"

Generate exactly 6-8 specific questions to gather the information needed to write a complete quote request email.

QUESTION FOCUS AREAS (ask only what's relevant and not already mentioned):
- Exact product/service specifications (size, color, material, model, technical details)
- Quantity needed
- Quality requirements or certifications
- Delivery timeline (when do they need it?)
- Delivery location (where should it be shipped?)
- Budget range (if they have one)
- Payment preferences
- Any special requirements

RULES:
- Be specific and conversational
- Don't ask about information already clearly stated
- Keep questions short and clear
- Each question should gather ONE key piece of info
- Return EXACTLY between 6-8 questions

Output as a valid JSON array:
["Question 1?", "Question 2?", "Question 3?"]

Return ONLY the JSON array, nothing else.`,
      });
    });

    console.log("🤖 AI raw response:", response.text);

    let questions = [];

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log("⚠️  JSON parse failed, using fallback extraction");
    }

    if (!questions.length) {
      questions = response.text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line.length > 15 &&
            line.includes("?") &&
            !line.toLowerCase().startsWith("here") &&
            !line.toLowerCase().startsWith("sure") &&
            !line.toLowerCase().includes("json")
          );
        })
        .map((line) => {
          return line
            .replace(/^\d+[\.\)]\s*/, "")
            .replace(/^[-*]\s*/, "")
            .replace(/["']/g, "")
            .replace(/\*\*/g, "")
            .trim();
        });
    }

    questions = questions.slice(0, 8);

    const fallbackQuestions = [
      "What specific product or service do you need?",
      "What quantity do you need?",
      "When do you need it delivered?",
      "Where should it be delivered?",
      "Do you have any specific quality or technical requirements?",
      "What is your budget range for this?",
      "Do you have any preferred brands or specifications?",
      "Are there any other important details I should include?",
    ];

    while (questions.length < 6) {
      const fallback = fallbackQuestions[questions.length];
      if (fallback && !questions.includes(fallback)) {
        questions.push(fallback);
      }
    }

    console.log("✅ Final questions:", questions);

    res.json({
      message:
        "Great! Let me ask you a few questions to create the perfect quote request:",
      questions: questions,
    });
  } catch (error) {
    console.error("❌ Error generating questions:", error);
    res.status(500).json({
      error:
        error.status === 503
          ? "AI service is temporarily overloaded. Please try again in a moment."
          : "Failed to generate questions",
      details: error.message,
    });
  }
});

// --- ROUTE 3: Generate Quote Request Email ---
app.post("/compose-email", async (req, res) => {
  const { answers, initialDescription } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Answers array is required" });
  }

  if (answers.length === 0) {
    return res.status(400).json({ error: "At least one answer is required" });
  }

  try {
    console.log("📧 Generating email from answers:", answers);

    const response = await retryWithBackoff(
      async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are writing a professional quote request email to send to suppliers.

ANSWERS PROVIDED:
${answers.map((a, i) => `${i + 1}. ${a}`).join("\n")}

TASK:
Write a clear, professional email requesting a quote that includes ALL the information from the answers above.

EMAIL STRUCTURE:
1. Subject line (specific and clear)
2. Professional greeting
3. Brief introduction (1-2 sentences about what you need)
4. Detailed requirements section with:
   - Product/service description
   - Specifications (size, color, material, technical details)
   - Quantity
   - Quality requirements
   - Delivery timeline
   - Delivery location
   - Any other relevant details
5. What you need in their quote:
   - Price (unit and total)
   - Lead time
   - Payment terms
   - Warranty information
6. Professional closing with call to action

TONE & STYLE:
- Professional but friendly
- Clear and organized with bullet points where appropriate
- Direct and specific
- Natural sounding (like a real person wrote it)
- No placeholders like [Your Name] - leave signature blank for user to fill

FORMAT:
Subject: [write the subject line]

[email body]

Return ONLY the email text. No explanations, no markdown code blocks, no notes to the user.`,
        });
      },
      4,
      2000
    ); // 4 retries with 2 second base delay for email generation

    let email = response.text.trim();
    email = email.replace(/```[\s\S]*?\n/g, "").replace(/```/g, "");

    console.log("✅ Email generated successfully");

    res.json({
      email: email,
      message: "Email ready! You can copy and send it to suppliers.",
    });
  } catch (error) {
    console.error("❌ Error generating email:", error);
    res.status(500).json({
      error:
        error.status === 503
          ? "AI service is temporarily overloaded. Please wait a moment and try again."
          : "Failed to generate email",
      details: error.message,
    });
  }
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`📧 Analyze email: POST /api/analyze-email`);
  console.log(`❓ Start questions: POST /start`);
  console.log(`✉️  Compose email: POST /compose-email`);
});
