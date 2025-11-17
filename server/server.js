// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for backend
);

// Helper to save conversation to database
async function saveConversationToDb(briefingId, conversation) {
  const { error } = await supabase
    .from("briefings")
    .update({
      conversation_state: {
        history: conversation.history,
        description: conversation.description,
      },
    })
    .eq("id", briefingId);

  if (error) {
    console.error("Error saving conversation state:", error);
  }
}

// Helper to load conversation from database
async function loadConversationFromDb(briefingId) {
  const { data, error } = await supabase
    .from("briefings")
    .select("conversation_state")
    .eq("id", briefingId)
    .single();

  if (error || !data?.conversation_state) {
    return null;
  }

  return {
    history: data.conversation_state.history || [],
    description: data.conversation_state.description,
    briefingId: briefingId,
  };
}

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

// --- ROUTE 5: Email / Quote Analysis ---
app.post("/api/analyze-email", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText?.trim()) {
    return res.status(400).json({ error: "No email text provided" });
  }

  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        // In ALL your routes, change the model:
        model: "gemini-2.5-flash", // ← Changed from gemini-2.5-flash
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

// --- ROUTE 2: Generate Questions for RFQ (Smarter Conversation Flow) ---
// --- In-memory conversation state (temporary, during active chat) ---
const conversations = new Map();

app.post("/start", async (req, res) => {
  const { description, briefingId } = req.body;

  if (!description?.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }

  if (!briefingId) {
    return res.status(400).json({ error: "Briefing ID is required" });
  }

  try {
    console.log("🚀 Starting new conversation for briefing:", briefingId);

    // Initialize conversation state
    const newConversation = {
      history: [],
      description: description,
      briefingId: briefingId,
    };

    conversations.set(briefingId, newConversation);

    // Generate first question
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
A user wants to create an RFQ (Request for Quote) for: "${description}"

Generate ONE specific, conversational question to start gathering details for their quote request.
Be professional but friendly.

RETURN ONLY THE QUESTION AS PLAIN TEXT (no JSON, no formatting).
`,
      });
    });

    const firstQuestion = response.text.trim().replace(/["\[\]]/g, "");

    // Save question to conversation history
    conversations.get(briefingId).history.push({
      role: "assistant",
      content: firstQuestion,
    });

    // ✅ SAVE TO DATABASE
    await saveConversationToDb(briefingId, conversations.get(briefingId));

    console.log("✅ First question generated:", firstQuestion);

    res.json({
      question: firstQuestion,
      briefingId: briefingId,
    });
  } catch (error) {
    console.error("❌ Error starting conversation:", error);
    res.status(500).json({
      error: "Failed to start conversation",
      details: error.message,
    });
  }
});

// --- ROUTE 3: Get Next Question (Based on User Answer) ---
// --- ROUTE: Get Next Question (Based on User Answer) ---
app.post("/next-question", async (req, res) => {
  const { briefingId, userAnswer } = req.body;

  if (!briefingId) {
    return res.status(400).json({ error: "Briefing ID is required" });
  }

  if (!userAnswer?.trim()) {
    return res.status(400).json({ error: "User answer is required" });
  }

  try {
    // ✅ TRY TO GET FROM MEMORY FIRST, THEN FROM DATABASE
    let conversation = conversations.get(briefingId);

    if (!conversation) {
      console.log("⚠️ Conversation not in memory, loading from database...");
      conversation = await loadConversationFromDb(briefingId);

      if (!conversation) {
        // ❌ Still not found? Try to reconstruct from chat as fallback
        console.log(
          "⚠️ conversation_state not found, reconstructing from chat..."
        );

        const { data, error } = await supabase
          .from("briefings")
          .select("chat")
          .eq("id", briefingId)
          .single();

        if (error || !data?.chat || data.chat.length === 0) {
          return res.status(404).json({
            error: "Conversation not found. Please start a new conversation.",
          });
        }

        // Reconstruct conversation from chat messages
        const chatMessages = data.chat;
        const description =
          chatMessages.find((msg) => msg.role === "User")?.content || "";

        conversation = {
          history: chatMessages
            .filter((msg) => msg.role === "AI" || msg.role === "User")
            .map((msg) => ({
              role: msg.role === "User" ? "user" : "assistant",
              content: msg.content,
            })),
          description: description,
          briefingId: briefingId,
        };

        console.log("✅ Conversation reconstructed from chat messages");
      } else {
        console.log("✅ Conversation loaded from database");
      }

      // Restore to memory
      conversations.set(briefingId, conversation);
    }

    console.log("💬 Processing answer for briefing:", briefingId);

    // Add user's answer to history
    conversation.history.push({
      role: "user",
      content: userAnswer,
    });

    // Build conversation context
    const conversationContext = conversation.history
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    // Generate next question or check if complete
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
You are helping a buyer prepare an RFQ (Request for Quote).

INITIAL REQUEST: "${conversation.description}"

CONVERSATION SO FAR:
${conversationContext}

YOUR TASK:
1. Review the conversation history above carefully
2. Analyze if the user's last answer was clear and complete
3. Determine what critical information is still missing for a complete RFQ

REQUIRED INFORMATION CHECKLIST (must have ALL):
✓ Product/service name and specifications
✓ Quantity or volume needed
✓ Delivery timeline or deadline
✓ Delivery location/address
✓ Quality standards or technical requirements
✓ Budget range (if mentioned)
✓ Any other special requirements

DECISION LOGIC:
- If the last answer was vague, unclear, or off-topic → ask for clarification
- If the last answer was good but info is incomplete → ask the next most important missing detail
- If you have ALL essential information above → respond with exactly: COMPLETE

RULES:
- Generate ONLY ONE question at a time
- Be conversational and natural
- Never ask about information already clearly provided
- If ready to finish, return ONLY the word: COMPLETE

RETURN: Either ONE question as plain text, OR the word "COMPLETE" (no quotes, no formatting).
`,
      });
    });

    const aiResponse = response.text.trim().replace(/["\[\]]/g, "");
    console.log("🤖 AI Response:", aiResponse);

    // Check if conversation is complete
    if (aiResponse.toUpperCase().includes("COMPLETE")) {
      console.log("✅ Conversation complete for briefing:", briefingId);

      // Extract collected information
      const collectedInfo = {
        description: conversation.description,
        conversationHistory: conversation.history,
      };

      // Clean up temporary conversation state
      conversations.delete(briefingId);

      return res.json({
        done: true,
        message: "Great! I have all the information I need.",
        collectedInfo: collectedInfo,
      });
    }

    // Save next question to history
    conversation.history.push({
      role: "assistant",
      content: aiResponse,
    });

    // Update conversation in memory
    conversations.set(briefingId, conversation);

    // ✅ SAVE TO DATABASE
    await saveConversationToDb(briefingId, conversation);

    console.log("❓ Next question:", aiResponse);

    res.json({
      question: aiResponse,
      briefingId: briefingId,
    });
  } catch (error) {
    console.error("❌ Error generating next question:", error);
    res.status(500).json({
      error: "Failed to generate next question",
      details: error.message,
    });
  }
});

// --- ROUTE 4: Generate Quote Request Email ---
app.post("/compose-email", async (req, res) => {
  const { briefingId, collectedInfo } = req.body;

  if (!collectedInfo) {
    return res.status(400).json({ error: "Collected info is required" });
  }

  try {
    console.log("📧 Composing email for briefing:", briefingId);

    const conversationHistory = collectedInfo.conversationHistory
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const response = await retryWithBackoff(
      async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
Create a professional RFQ (Request for Quote) email based on this conversation:

INITIAL REQUEST: ${collectedInfo.description}

CONVERSATION:
${conversationHistory}

Generate a complete, professional email that includes:
1. A clear subject line (format: "Subject: ...")
2. Professional greeting
3. Brief introduction
4. Detailed requirements extracted from the conversation
5. Specific questions or clarifications needed
6. Request for quote with timeline
7. Professional closing with signature placeholder

Make it formal, clear, and ready to send to suppliers.

TONE & STYLE:
- Professional but friendly
- Clear and organized with bullet points where appropriate
- Direct and specific
- Natural sounding (like a real person wrote it)
- No placeholders like [Your Name] - leave signature blank for user to fill

RETURN THE COMPLETE EMAIL (including subject line). No markdown code blocks.
`,
        });
      },
      4,
      2000
    );

    let email = response.text.trim();
    email = email.replace(/``````/g, "");

    // Append a short AI-generation notice/footer to every generated email
    const footerNotice =
      "\n\n---\nThis email was AI-generated using Quotely: https://quotely-repo.vercel.app";
    if (!email.includes(footerNotice)) {
      email = `${email}${footerNotice}`;
    }

    console.log("✅ Email generated successfully (footer appended)");

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

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`📧 Analyze email: POST /api/analyze-email`);
  console.log(`❓ Start questions: POST /start`);
  console.log(`✉️  Compose email: POST /compose-email`);
});
