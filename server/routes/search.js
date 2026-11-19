import express from "express";
import { GEMINI_MODEL, retryWithBackoff, parseModelJson, aiErrorMessage } from "../lib/ai.js";
import { getOwnedBriefing, rateLimit } from "../lib/auth.js";

export default function makeSearchRouter({ ai, supabase, requireAuth }) {
  const router = express.Router();

  const searchLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyFn: (req) => req.user.id,
    message: "Supplier search limit reached (20 per hour). Try again later.",
  });

  // Search suppliers
  router.post("/search-suppliers", requireAuth, searchLimiter, async (req, res) => {
    const { briefingId, collectedInfo, location } = req.body;

    // Validate required fields
    if (!briefingId) return res.status(400).json({ error: "briefingId required" });
    if (!collectedInfo || !collectedInfo.description) {
      return res.status(400).json({ error: "collectedInfo.description required" });
    }

    try {
      await getOwnedBriefing(supabase, briefingId, req.user.id);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }

    try {
      console.log("🔍 Searching suppliers for:", collectedInfo.description);

      // Step 1: Generate search queries with Gemini
      const queryPrompt = `
You are a search expert. Generate 3-5 specific search queries to find suppliers for this RFQ:

BRIEF: ${collectedInfo.description}
LOCATION: ${location || "unspecified"}

Return ONLY a JSON array of search query strings (no explanations):
["query 1", "query 2", "query 3"]
`;

      const queryResp = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: queryPrompt,
          config: { responseMimeType: "application/json" },
        })
      );

      let queries = [];
      try {
        queries = parseModelJson(queryResp.text);
        if (!Array.isArray(queries)) throw new Error("not an array");
        queries = queries.filter((q) => typeof q === "string" && q.trim()).slice(0, 5);
        if (!queries.length) throw new Error("empty");
      } catch (err) {
        console.warn("⚠️ Failed to parse queries, using defaults");
        queries = [collectedInfo.description, `${collectedInfo.description} supplier`];
      }

      console.log("📝 Generated search queries:", queries);

      // Step 2: Search using Google Custom Search API
      const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!googleApiKey || !googleSearchEngineId) {
        console.warn("⚠️ GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_ENGINE_ID not set");
        return res.status(503).json({
          error: "Supplier search is not configured on the server (missing Google Search API keys)",
        });
      }

      const searchOne = async (query) => {
        const searchQuery =
          location && location !== "any" ? `${query} supplier ${location}` : `${query} supplier`;
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`;
        try {
          const googleResponse = await fetch(googleUrl, { signal: AbortSignal.timeout(10000) });
          if (!googleResponse.ok) {
            console.warn(`⚠️ Google search failed (${googleResponse.status}) for: ${searchQuery}`);
            return [];
          }
          const googleData = await googleResponse.json();
          return (googleData.items || [])
            .filter((r) => r.title && r.link && r.snippet)
            .map((r) => ({ title: r.title, url: r.link, content: r.snippet }))
            .slice(0, 5);
        } catch (err) {
          console.warn(`⚠️ Error searching "${query}":`, err.message);
          return [];
        }
      };

      // Run the searches in parallel instead of one after another
      let allResults = (await Promise.all(queries.map(searchOne))).flat();

      // Remove duplicates by URL
      allResults = Array.from(
        new Map(allResults.map(r => [r.url, r])).values()
      ).slice(0, 20);

      console.log(`📄 Total unique results: ${allResults.length}`);

      // Nothing found: don't let the model invent suppliers out of thin air
      if (allResults.length === 0) {
        return res.json({ suppliers: [], queries, count: 0, note: "No search results" });
      }

      // Step 3: Extract suppliers from search results using Gemini
      const extractPrompt = `
You are a supplier extraction expert. Analyze these search results and extract legitimate supplier companies with contact info.

ORIGINAL REQUEST: ${collectedInfo.description}
LOCATION: ${location || "unspecified"}

SEARCH RESULTS:
${allResults.slice(0, 15).map((r) => `- ${r.title}\n  ${r.content}\n  ${r.url}`).join("\n\n")}

Extract suppliers and return ONLY valid JSON (no markdown, no extra text):
{
  "suppliers": [
    {
      "name": "Company Name",
      "website": "https://example.com",
      "contact_email": "email@example.com or null",
      "phone": "+1 555 1234 or null",
      "note": "Brief reason why relevant"
    }
  ]
}

Rules:
- Extract up to 7 suppliers
- Only include actual companies (not blogs, forums, irrelevant sites)
- Only include an email or phone if it literally appears in the search results; otherwise use null (never guess or invent contact details)
- Ensure relevance to the original request
`;

      const extractResp = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: extractPrompt,
          config: { responseMimeType: "application/json" },
        })
      );

      let suppliers = [];
      try {
        const parsed = parseModelJson(extractResp.text);
        suppliers = (parsed.suppliers || []).slice(0, 7).map((s) => ({
          name: s.name || "Unknown",
          website: s.website || null,
          contact_email: s.contact_email || null,
          phone: s.phone || null,
          note: s.note || "",
        }));
      } catch (err) {
        console.warn("⚠️ Failed to parse suppliers:", err.message);
      }

      console.log(`✅ Extracted ${suppliers.length} suppliers`);

      res.json({
        suppliers,
        queries,
        count: suppliers.length,
        note: "Suppliers found via Google Custom Search + AI analysis",
      });
    } catch (err) {
      console.error("❌ Error in /search-suppliers:", err);
      res.status(500).json({
        error: aiErrorMessage(err, "Failed to search suppliers"),
        details: err.message || String(err),
      });
    }
  });
  
  return router;
}