// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { randomBytes } from "crypto";
import makeAnalyzeRouter from "./routes/analyze.js";
import makeConversationRouter from "./routes/conversation.js";
import makeSupplierRouter from "./routes/supplier.js";
import makeEmailRouter from "./routes/email.js";

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
      const isRetriableError = error?.status === 503 || error?.status === 429;

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

// mount analyze routes (email + pdf)
// Initialize Google AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
console.log("✅ Google AI client initialized");

const analyzeRouter = makeAnalyzeRouter({
  ai,
  retryWithBackoff,
  supabase,
  upload,
});
app.use("/api", analyzeRouter);

// In-memory conversation state and mount conversation routes
const conversations = new Map();
console.log("💬 Conversation manager initialized");
const conversationRouter = makeConversationRouter({
  ai,
  retryWithBackoff,
  saveConversationToDb,
  loadConversationFromDb,
  conversations,
  supabase,
});
app.use("/", conversationRouter);

// mount supplier routes (generate link, public briefing and submit quote)
const supplierRouter = makeSupplierRouter({ supabase, randomBytes });
app.use("/api", supplierRouter);

// mount routes email
const emailRouter = makeEmailRouter({ supabase });
app.use("/", emailRouter);

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
