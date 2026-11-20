// POST /api/search-suppliers { briefingId, location? }
// Uses the briefing's own requirements (server side) and saves the results in
// conversation_state.suppliers so the inbox can show them again later.

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
      if (!conv) throw new HttpError(400, "Describe what you need in the Chat tab first");

      const where = typeof location === "string" && !/^any(where)?$/i.test(location.trim()) ? location.trim().slice(0, 100) : "";
      let result;
      try {
        result = await searchSuppliers(ai, { spec: conv.spec, description: conv.description, location: where });
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw new HttpError(502, aiErrorMessage(err, "Supplier search failed, please try again"));
      }

      const saved = { location: where, ...result, searchedAt: new Date().toISOString() };
      const { error } = await supabase
        .from("briefings")
        .update({ conversation_state: { ...(briefing.conversation_state || conv), suppliers: saved } })
        .eq("id", briefing.id);
      if (error) console.warn("⚠️  Could not save supplier results:", error.message);

      console.log(`🔍 ${result.suppliers.length} suppliers (${result.source}) for briefing ${briefing.id}`);
      res.json(saved);
    }),
  );

  return router;
}
