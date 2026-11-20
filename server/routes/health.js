// Health endpoints (no auth). The keep-alive GitHub Action pings
// /health/db (keeps Render awake + counts as Supabase activity) and
// /health/email (fails the workflow, so GitHub emails you, if Gmail broke).

import express from "express";
import { checkDb } from "../services/health.js";
import { checkGmailAuth } from "../services/gmail.js";

export default function makeHealthRouter({ supabase }) {
  const router = express.Router();

  router.get("/", (req, res) => res.json({ status: "ok", message: "Quotely API running" }));

  router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  router.get("/health/db", async (req, res) => {
    try {
      res.json({ status: "ok", db: "ok", ...(await checkDb(supabase)) });
    } catch (err) {
      console.error("❌ DB health check failed:", err.message);
      res.status(503).json({ status: "degraded", db: "unreachable", error: err.message });
    }
  });

  router.get("/health/email", async (req, res) => {
    try {
      await checkGmailAuth();
      res.json({ status: "ok", email: "ok" });
    } catch (err) {
      console.error("❌ Email health check failed:", err.message);
      res.status(503).json({ status: "degraded", email: "broken", error: err.message });
    }
  });

  return router;
}
