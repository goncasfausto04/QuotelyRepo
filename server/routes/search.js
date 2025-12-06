import express from "express";

export default function makeSearchRouter({
  ai,
  retryWithBackoff,
}) {
  const router = express.Router();

  // Search suppliers
  router.post("/search-suppliers", async (req, res) => {
    const { briefingId, collectedInfo, location } = req.body;

    // Validate required fields
    if (!briefingId) return res.status(400).json({ error: "briefingId required" });
    if (!collectedInfo || !collectedInfo.description) {
      return res.status(400).json({ error: "collectedInfo.description required" });
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
          model: "gemini-2.5-flash",
          contents: queryPrompt,
        })
      );

      let queries = [];
      try {
        const queryText = queryResp.text.trim();
        const start = queryText.indexOf("[");
        const end = queryText.lastIndexOf("]") + 1;
        queries = JSON.parse(queryText.slice(start, end));
      } catch (err) {
        console.warn("⚠️ Failed to parse queries, using defaults");
        queries = [collectedInfo.description, `${collectedInfo.description} supplier`];
      }

      console.log("📝 Generated search queries:", queries);

      // Step 2: Search using Google Custom Search API
      const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!googleApiKey || !googleSearchEngineId) {
        console.warn("⚠️ Google Search API keys not set, using mock data");
        const allResults = [
          {
            title: "Acme Industrial Fasteners - Stainless Steel Suppliers",
            url: "https://acmefasteners.com/stainless-steel",
            content: "Leading supplier of grade 8.8 stainless steel hex head fasteners for industrial machinery. Bulk orders available.",
          },
          {
            title: "California Bolt & Screw Company",
            url: "https://caboltscrew.com/products/hex-fasteners",
            content: "Wholesale distributor of stainless steel hex bolts, grade 8.8, serving California and nationwide.",
          },
          {
            title: "West Coast Industrial Supply",
            url: "https://westcoastsupply.net/fasteners",
            content: "Specialty fastener distributor. Stainless steel 8.8 hex head bolts in bulk quantities.",
          },
        ];
        return res.json({
          suppliers: allResults.map((r) => ({
            name: r.title.split(" - ")[0],
            website: r.url,
            contact_email: null,
            phone: null,
            note: r.content.substring(0, 100),
          })),
          queries,
          count: allResults.length,
          note: "Mock data - API keys not configured",
        });
      }

      let allResults = [];

      for (const query of queries) {
        try {
          const searchQuery = location && location !== "any" 
            ? `${query} supplier ${location}`
            : `${query} supplier`;

          console.log(`🔎 Searching Google for: ${searchQuery}`);

          const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`;

          const googleResponse = await fetch(googleUrl);

          if (!googleResponse.ok) {
            console.warn(`⚠️ Google search failed: ${googleResponse.status}`);
            continue;
          }

          const googleData = await googleResponse.json();
          const results = googleData.items || [];

          console.log(`✅ Got ${results.length} results for: ${query}`);

          const filtered = results
            .filter(r => r.title && r.link && r.snippet)
            .map(r => ({
              title: r.title,
              url: r.link,
              content: r.snippet,
            }))
            .slice(0, 5);

          allResults = [...allResults, ...filtered];
        } catch (err) {
          console.warn(`⚠️ Error searching "${query}":`, err.message);
        }
      }

      // Remove duplicates by URL
      allResults = Array.from(
        new Map(allResults.map(r => [r.url, r])).values()
      ).slice(0, 20);

      console.log(`📄 Total unique results: ${allResults.length}`);

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
- Infer email/phone from URLs and search results if possible
- Ensure relevance to the original request
`;

      const extractResp = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: extractPrompt,
        })
      );

      let suppliers = [];
      try {
        const extractText = extractResp.text.trim();
        const start = extractText.indexOf("{");
        const end = extractText.lastIndexOf("}") + 1;
        const parsed = JSON.parse(extractText.slice(start, end));
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
        error: "Failed to search suppliers",
        details: err.message || String(err),
      });
    }
  });
  
  return router;
}