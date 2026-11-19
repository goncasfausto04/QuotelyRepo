import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { randomBytes } from "crypto";

import makeEmailRouter from "./routes/email.js";
import makeConversationRouter from "./routes/conversation.js";
import makeAnalyzeRouter from "./routes/analyze.js";
import makeSupplierRouter from "./routes/supplier.js";
import makeSearchRouter from "./routes/search.js";
import { makeRequireAuth } from "./lib/auth.js";
import { checkGmailAuth } from "./email_gmail.js";

// ---------- Environment ----------
const requiredEnvVars = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
const missingVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars.join(", "));
  process.exit(1);
}

const optionalGroups = {
  "Email (Gmail)": ["GMAIL_API_CLIENT_ID", "GMAIL_API_CLIENT_SECRET", "GMAIL_API_REFRESH_TOKEN", "GMAIL_API_SENDER"],
  "Supplier search": ["GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_ENGINE_ID"],
};
for (const [feature, vars] of Object.entries(optionalGroups)) {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length) console.warn(`⚠️  ${feature} disabled/partial, missing: ${missing.join(", ")}`);
}

// ---------- Clients ----------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const requireAuth = makeRequireAuth(supabase);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// ---------- App ----------
const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for req.ip

// CORS: only allow our frontend(s). FRONTEND_URL may be a comma separated list.
// Localhost is always allowed for development.
// Vercel deployment/preview URLs (e.g. https://quotely-repo-abc123-team.vercel.app)
// are allowed via ALLOWED_ORIGIN_SUFFIXES, e.g. "-goncasfausto04s-projects.vercel.app".
// Only use suffixes that belong to YOUR Vercel account/team.
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
);
const allowedSuffixes = (process.env.ALLOWED_ORIGIN_SUFFIXES || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const matchesSuffix = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && allowedSuffixes.some((s) => hostname.toLowerCase().endsWith(s));
  } catch {
    return false;
  }
};
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl, health checks, server-to-server
      const normalized = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.size === 0 ||
        allowedOrigins.has(normalized) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized) ||
        matchesSuffix(normalized)
      ) {
        return cb(null, true);
      }
      console.warn(`🚫 CORS blocked origin: ${origin} (add it to FRONTEND_URL or ALLOWED_ORIGIN_SUFFIXES)`);
      cb(null, false);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.path !== "/health" && req.path !== "/") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ---------- Health ----------
app.get("/", (req, res) => res.json({ status: "ok", message: "Quotely API running" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Touches the database too. Pinging this regularly keeps both the Render
// server awake AND counts as Supabase activity (free projects pause after
// ~7 days without any).
app.get("/health/db", async (req, res) => {
  const started = Date.now();
  try {
    const { error } = await supabase.from("briefings").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    res.json({ status: "ok", db: "ok", latencyMs: Date.now() - started });
  } catch (err) {
    console.error("❌ DB health check failed:", err.message);
    res.status(503).json({ status: "degraded", db: "unreachable", error: err.message });
  }
});

// Checks the Gmail refresh token is still valid. The keep-alive GitHub Action
// calls this, so a dead token makes the workflow fail and GitHub emails you.
app.get("/health/email", async (req, res) => {
  try {
    await checkGmailAuth();
    res.json({ status: "ok", email: "ok" });
  } catch (err) {
    console.error("❌ Email health check failed:", err.message);
    res.status(503).json({ status: "degraded", email: "broken", error: err.message });
  }
});

// ---------- Routes ----------
app.use("/api", makeEmailRouter({ supabase, requireAuth }));
app.use("/api", makeAnalyzeRouter({ ai, supabase, upload, requireAuth }));
app.use("/api", makeSearchRouter({ ai, supabase, requireAuth }));
app.use("/api", makeSupplierRouter({ supabase, randomBytes, requireAuth }));
app.use("/", makeConversationRouter({ ai, supabase, requireAuth }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler: every thrown error becomes a JSON response
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
  if (status >= 500) console.error(`❌ ${req.method} ${req.path}:`, err);
  res.status(status).json({ error: status >= 500 && !err?.status ? "Internal server error" : err.message });
});

process.on("unhandledRejection", (reason) => console.error("❌ Unhandled rejection:", reason));

// ---------- Start ----------
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Quotely API listening on port ${PORT}`);
  console.log(`   CORS origins: ${allowedOrigins.size ? [...allowedOrigins].join(", ") : "any (FRONTEND_URL not set)"}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
