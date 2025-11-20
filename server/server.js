// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { randomBytes } from "crypto";

dotenv.config();
console.log("🔍 FRONTEND_URL:", process.env.FRONTEND_URL);
console.log(
  "🔍 All env vars:",
  Object.keys(process.env).filter((k) => k.includes("FRONTEND"))
);

// Validate environment variables
const requiredEnvVars = [
  "GEMINI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingVars.join(", ")
  );
  process.exit(1);
}

console.log("✅ Environment variables loaded");

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
console.log("✅ Supabase client initialized");

// Configure multer for file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
console.log("✅ File upload middleware configured");

// Helper to save conversation to database
async function saveConversationToDb(briefingId, conversation) {
  console.log(`💾 Saving conversation state for briefing: ${briefingId}`);

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
    console.error("❌ Error saving conversation state:", error.message);
  } else {
    console.log(
      `✅ Conversation saved (${conversation.history.length} messages)`
    );
  }
}

// Helper to load conversation from database
async function loadConversationFromDb(briefingId) {
  console.log(`📂 Loading conversation state for briefing: ${briefingId}`);

  const { data, error } = await supabase
    .from("briefings")
    .select("conversation_state")
    .eq("id", briefingId)
    .single();

  if (error || !data?.conversation_state) {
    console.log(`⚠️  No conversation state found in database`);
    return null;
  }

  console.log(
    `✅ Conversation loaded from database (${
      data.conversation_state.history?.length || 0
    } messages)`
  );

  return {
    history: data.conversation_state.history || [],
    description: data.conversation_state.description,
    briefingId: briefingId,
  };
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isRetriableError = error.status === 503 || error.status === 429;

      console.log(
        `⚠️  API Error (attempt ${i + 1}/${maxRetries}):`,
        error.status || error.message
      );

      if (isLastRetry || !isRetriableError) {
        console.error(`❌ Max retries reached or non-retriable error`);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Health check route
app.get("/", (req, res) => {
  console.log("🏥 Health check requested");
  res.json({
    status: "✅ AI Backend is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      analyze: "POST /api/analyze-email",
      analyzePdf: "POST /api/analyze-pdf",
      start: "POST /start",
      nextQuestion: "POST /next-question",
      compose: "POST /compose-email",
      generateLink: "POST /api/generate-supplier-link",
      getBriefing: "GET /api/supplier-briefing/:token",
      submitQuote: "POST /api/supplier-submit-quote",
    },
  });
});

// Initialize Google AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
console.log("✅ Google AI client initialized");

// ROUTE 1: Email Quote Analysis
app.post("/api/analyze-email", async (req, res) => {
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

// In-memory conversation state (temporary storage during active chat sessions)
const conversations = new Map();
console.log("💬 Conversation manager initialized");

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

// --- ROUTE 3: Get Next Question (Based on User Answer)
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

// ROUTE 6: PDF Quote Analysis
app.post("/api/analyze-pdf", upload.single("pdfFile"), async (req, res) => {
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

    // Upload PDF to Gemini API
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
1. Extract ONLY factual data present in the PDF
2. Do NOT make assumptions or infer information
3. Convert time periods to days (e.g., "2 weeks" = 14)
4. Convert warranty to months (e.g., "12 months" = 12, "1 year" = 12)
5. Extract ALL numerical values without currency symbols
6. If information is not explicitly stated, use null
7. Ensure output is valid JSON without markdown formatting

OUTPUT (valid JSON only):`,
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

// ROUTE 7: Generate Supplier Response Link
app.post("/api/generate-supplier-link", async (req, res) => {
  const { briefingId } = req.body;

  console.log("🔗 Supplier link generation requested");
  console.log(`🆔 Briefing ID: ${briefingId}`);

  if (!briefingId) {
    console.log("❌ No briefing ID provided");
    return res.status(400).json({ error: "Briefing ID is required" });
  }

  try {
    // Generate unique token
    const token = randomBytes(32).toString("hex");
    console.log("🎫 Generated token:", token.substring(0, 16) + "...");

    // Store token linked to briefing
    const { data, error } = await supabase
      .from("briefings")
      .update({ supplier_link_token: token })
      .eq("id", briefingId)
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error.message);
      throw error;
    }

    const supplierLink = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/supplier-response/${token}`;
    console.log("✅ Supplier link generated:", supplierLink);

    res.json({
      token,
      supplierLink,
      briefingId,
    });
  } catch (error) {
    console.error("❌ Error generating supplier link:", error.message);
    res.status(500).json({ error: "Failed to generate link" });
  }
});

// ROUTE 8: Get Briefing Info by Token (Public)
app.get("/api/supplier-briefing/:token", async (req, res) => {
  const { token } = req.params;

  console.log("🔍 Supplier briefing lookup requested");
  console.log("🎫 Token:", token.substring(0, 16) + "...");

  try {
    const { data, error } = await supabase
      .from("briefings")
      .select("id, title, chat")
      .eq("supplier_link_token", token)
      .single();

    if (error || !data) {
      console.log("❌ Briefing not found for token");
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    // Extract description from chat if available
    const userMessages = data.chat?.filter((msg) => msg.role === "User") || [];
    const description =
      userMessages.length > 0
        ? userMessages[0].content
        : "No description available";

    console.log("✅ Found briefing:", data.id);
    console.log("📋 Title:", data.title || "Quote Request");

    res.json({
      id: data.id,
      title: data.title || "Quote Request",
      description: description,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching briefing:", error.message);
    res.status(500).json({ error: "Failed to load briefing" });
  }
});

// ROUTE 9: Submit Quote via Supplier Link (Public)
app.post("/api/supplier-submit-quote", async (req, res) => {
  const { token, quoteData } = req.body;

  console.log("📥 Supplier quote submission received");
  console.log("🎫 Token:", token?.substring(0, 16) + "...");
  console.log("🏢 Supplier:", quoteData?.supplier_name);

  if (!token || !quoteData) {
    console.log("❌ Missing token or quote data");
    return res.status(400).json({ error: "Token and quote data required" });
  }

  try {
    // Verify token and get briefing ID
    console.log("🔍 Verifying token...");
    const { data: briefing, error: briefingError } = await supabase
      .from("briefings")
      .select("id")
      .eq("supplier_link_token", token)
      .single();

    if (briefingError || !briefing) {
      console.log("❌ Invalid or expired token");
      return res.status(404).json({ error: "Invalid or expired link" });
    }

    console.log("✅ Token verified, briefing ID:", briefing.id);
    console.log("💾 Inserting quote into database...");

    // ✅ FIX: Safely parse numbers and handle empty strings
    const parseNumber = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const parseInt = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number.parseInt(val);
      return isNaN(num) ? null : num;
    };

    // Insert quote with safe parsing
    const { data: insertedQuote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        briefing_id: briefing.id,
        supplier_name: quoteData.supplier_name || null,
        contact_email: quoteData.contact_email || null,
        contact_phone: quoteData.contact_phone || null,
        total_price: parseNumber(quoteData.total_price),
        currency: quoteData.currency || "USD",
        unit_price: parseNumber(quoteData.unit_price),
        quantity: parseInt(quoteData.quantity),
        lead_time_days: parseInt(quoteData.lead_time_days),
        delivery_date: quoteData.delivery_date || null,
        payment_terms: quoteData.payment_terms || null,
        warranty_period: quoteData.warranty_period || null,
        warranty_months: parseInt(quoteData.warranty_months),
        shipping_cost: parseNumber(quoteData.shipping_cost),
        notes: quoteData.notes || null,
        input_method: "manual_supplier",
        submitted_by: "supplier",
        analysis_json: quoteData,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      console.error("❌ Insert error details:", JSON.stringify(insertError, null, 2));
      throw insertError;
    }

    console.log("✅ Quote submitted successfully, ID:", insertedQuote.id);

    res.json({
      success: true,
      message: "Quote submitted successfully",
      quoteId: insertedQuote.id,
    });
  } catch (error) {
    console.error("❌ Error submitting supplier quote:", error.message);
    console.error("❌ Full error:", error);
    res.status(500).json({ 
      error: "Failed to submit quote",
      details: error.message 
    });
  }
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Quotely AI Backend Server");
  console.log("=".repeat(60));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/`);
  console.log("\n📡 Available Endpoints:");
  console.log("  POST /api/analyze-email - Analyze quote emails");
  console.log("  POST /api/analyze-pdf - Analyze quote PDFs");
  console.log("  POST /start - Start RFQ conversation");
  console.log("  POST /next-question - Get next question");
  console.log("  POST /compose-email - Generate RFQ email");
  console.log("  POST /api/generate-supplier-link - Create supplier link");
  console.log("  GET  /api/supplier-briefing/:token - Get briefing info");
  console.log("  POST /api/supplier-submit-quote - Submit supplier quote");
  console.log("=".repeat(60) + "\n");
});
