// Admin API (users listed in ADMIN_EMAILS):
//   GET /api/admin/me         { isAdmin }   (any signed-in user)
//   GET /api/admin/overview   settings + health + stats
//   PUT /api/admin/settings   { email_mode: "test" | "live" }

import express from "express";
import { isAdmin, requireAdmin } from "../lib/auth.js";
import { asyncRoute } from "../lib/http.js";
import { getAllSettings, setSetting } from "../lib/settings.js";
import { fullHealth } from "../services/health.js";

async function count(supabase, table) {
  const { count: n, error } = await supabase.from(table).select("*", { head: true, count: "exact" });
  return error ? null : n;
}

export default function makeAdminRouter({ supabase, requireAuth }) {
  const router = express.Router();

  router.get("/admin/me", requireAuth, (req, res) => res.json({ isAdmin: isAdmin(req.user) }));

  router.get(
    "/admin/overview",
    requireAuth,
    requireAdmin,
    asyncRoute(async (req, res) => {
      const [settings, health, users, briefings, quotes] = await Promise.all([
        getAllSettings(supabase),
        fullHealth(supabase),
        count(supabase, "users"),
        count(supabase, "briefings"),
        count(supabase, "quotes"),
      ]);
      res.json({ settings, health, stats: { users, briefings, quotes }, uptime: process.uptime() });
    }),
  );

  router.put(
    "/admin/settings",
    requireAuth,
    requireAdmin,
    asyncRoute(async (req, res) => {
      const results = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        results[key] = await setSetting(supabase, key, value, req.user.email);
      }
      res.json({ ok: true, results, settings: await getAllSettings(supabase) });
    }),
  );

  return router;
}
