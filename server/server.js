import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { randomBytes } from "crypto";
import { LinkupClient } from 'linkup-sdk';

// Import route handlers
import makeEmailRouter from "./routes/email.js";
import makeConversationRouter from "./routes/conversation.js";
import makeAnalyzeRouter from "./routes/analyze.js";
import makeSupplierRouter from "./routes/supplier.js";

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

// --- add Brave Search client ---
const braveClient = {
  apiKey: process.env.BRAVE_API_KEY || "",
  
  async search(query, opts = {}) {
    if (!this.apiKey) {
      throw new Error("BRAVE_API_KEY not set in environment variables");
    }
    
    // Brave API correct parameters - note the parameter names are different
    const params = new URLSearchParams({ 
      q: query,
      count: String(opts.size || 20),
      search_lang: "en",
      country: "us",  // lowercase
      safesearch: "moderate",
      freshness: "pm"
    });
    
    const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;
    
    console.log(`🦁 Calling Brave API: ${query.substring(0, 50)}...`);
    
    const res = await fetch(url, {
      headers: { 
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
    });
    
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`❌ Brave API error details:`, txt);
      throw new Error(`Brave search failed: ${res.status} ${res.statusText} ${txt.slice(0, 200)}`);
    }
    
    const data = await res.json();
    console.log(`📊 Brave raw response keys:`, Object.keys(data));
    
    // Brave API structure varies - check for different possible structures
    let items = [];
    if (data.web && data.web.results) {
      items = data.web.results;
      console.log(`✅ Found results in data.web.results: ${items.length} items`);
    } else if (data.results) {
      items = data.results;
      console.log(`✅ Found results in data.results: ${items.length} items`);
    } else if (data.query && data.query.web && data.query.web.results) {
      items = data.query.web.results;
      console.log(`✅ Found results in data.query.web.results: ${items.length} items`);
    } else {
      console.log(`⚠️ No results found in expected Brave API structure`);
      // Try to find any array in the response
      for (const key in data) {
        if (Array.isArray(data[key])) {
          items = data[key];
          console.log(`🔍 Found array in data.${key}: ${items.length} items`);
          break;
        }
      }
    }
    
    return items.map(item => ({
      title: item.title || "",
      url: item.url || item.link || "",
      content: item.description || item.snippet || item.content || "",
    }));
  }
};

console.log("✅ Brave client initialized (requires BRAVE_API_KEY env var)");
// --- end add ---

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
  braveClient, // pass the Brave client into the router
});
app.use("/", conversationRouter);

// mount supplier routes (generate link, public briefing and submit quote)
const supplierRouter = makeSupplierRouter({ supabase, randomBytes });
app.use("/api", supplierRouter);

// mount email routes with a service-role (admin) Supabase client so routes can read/update briefings.gmail_thread_id
app.use("/api", makeEmailRouter({ supabase }));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Quotely API running" });
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
