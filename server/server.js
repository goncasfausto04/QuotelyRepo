// Quotely API entry point: wiring only. Logic lives in routes/, services/, lib/.

import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

import { checkEnv } from "./lib/env.js";
import { makeCors } from "./lib/cors.js";
import { makeRequireAuth } from "./lib/auth.js";
import makeHealthRouter from "./routes/health.js";
import makeAdminRouter from "./routes/admin.js";
import makeEmailRouter from "./routes/email.js";
import makeConversationRouter from "./routes/conversation.js";
import makeAnalyzeRouter from "./routes/analyze.js";
import makeSupplierRouter from "./routes/supplier.js";
import makeSearchRouter from "./routes/search.js";

checkEnv();

// ---------- Clients ----------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const requireAuth = makeRequireAuth(supabase);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const deps = { ai, supabase, upload, requireAuth };

// ---------- App ----------
const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for req.ip

const cors = makeCors();
app.use(cors.middleware);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (!req.path.startsWith("/health") && req.path !== "/") console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use("/", makeHealthRouter(deps));
app.use("/api", makeAdminRouter(deps));
app.use("/api", makeEmailRouter(deps));
app.use("/api", makeAnalyzeRouter(deps));
app.use("/api", makeSearchRouter(deps));
app.use("/api", makeSupplierRouter(deps));
app.use("/", makeConversationRouter(deps));

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
  console.log(`   CORS origins: ${cors.origins.size ? [...cors.origins].join(", ") : "any (FRONTEND_URL not set)"}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
