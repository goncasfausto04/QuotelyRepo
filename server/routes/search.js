// POST /api/search-suppliers { briefingId, location? }
// Uses the briefing's own conversation (server side), not client-sent data.

import express from "express";
import { aiErrorMessage } from "../lib/ai.js";
import { getOwnedBriefing } from "../lib/auth.js";
import { HttpError, asyncRoute } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { loadConversation } from "../services/conversation.js";
import { searchSuppliers } from "../services/supplierSearch.js";

export default function makeSearchRouter({ ai, supabase, requireAuth }) {
  const router = express.Router();
  const limiter = rateLimit({ max: 20, message: "Supplier search limit reached (20 per hour). Try again later." });

  router.post(
    "/search-suppliers",
    requireAuth,
    limiter,
    asyncRoute(async (req, res) => {
      const { briefingId, location } = req.body || {};
      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id, "id, conversation_state, chat");
      const conv = loadConversation(briefing);
      if (!conv) throw new HttpError(400, "Describe what you need in the chat first");

      const where = typeof location === "string" && !/^any$/i.test(location.trim()) ? location.trim().slice(0, 100) : "";
      try {
        const { suppliers, queries } = await searchSuppliers(ai, {
          spec: conv.spec,
          description: conv.description,
          location: where || conv.spec.delivery_location || "",
        });
        console.log(`🔍 ${suppliers.length} suppliers for briefing ${briefing.id}`);
        res.json({ suppliers, queries, count: suppliers.length });
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw new HttpError(502, aiErrorMessage(err, "Supplier search failed, please try again"));
      }
    }),
  );

  return router;
}
