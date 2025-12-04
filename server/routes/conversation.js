import express from "express";
// Note: Node 18+ has native fetch. If on older Node, uncomment: import fetch from "node-fetch";

export default function makeConversationRouter({
  ai,
  retryWithBackoff,
  saveConversationToDb,
  loadConversationFromDb,
  conversations,
  supabase,
}) {
  const router = express.Router();

  router.post("/start", async (req, res) => {
    const { description, briefingId } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }

    if (!briefingId) {
      return res.status(400).json({ error: "Briefing ID is required" });
    }

    try {
      console.log("🚀 Starting new conversation for briefing:", briefingId);

      const newConversation = {
        history: [],
        description: description,
        briefingId: briefingId,
      };

      conversations.set(briefingId, newConversation);

      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
A user wants to create an RFQ (Request for Quote) for: "${description}"

Generate ONE specific, conversational question to start gathering details for their quote request.
Be professional but friendly.

RETURN ONLY THE QUESTION AS PLAIN TEXT (no JSON, no formatting).
`,
        });
      });

      const firstQuestion = response.text.trim().replace(/["\[\]]/g, "");

      conversations.get(briefingId).history.push({
        role: "assistant",
        content: firstQuestion,
      });

      await saveConversationToDb(briefingId, conversations.get(briefingId));

      console.log("✅ First question generated:", firstQuestion);

      res.json({
        question: firstQuestion,
        briefingId: briefingId,
      });
    } catch (error) {
      console.error("❌ Error starting conversation:", error);
      res.status(500).json({
        error: "Failed to start conversation",
        details: error.message,
      });
    }
  });

  router.post("/next-question", async (req, res) => {
    const { briefingId, userAnswer } = req.body;

    if (!briefingId)
      return res.status(400).json({ error: "Briefing ID is required" });
    if (!userAnswer?.trim())
      return res.status(400).json({ error: "User answer is required" });

    try {
      let conversation = conversations.get(briefingId);

      if (!conversation) {
        console.log("⚠️ Conversation not in memory, loading from database...");
        conversation = await loadConversationFromDb(briefingId);

        if (!conversation) {
          console.log(
            "⚠️ conversation_state not found, reconstructing from chat..."
          );

          const { data, error } = await supabase
            .from("briefings")
            .select("chat")
            .eq("id", briefingId)
            .single();

          if (error || !data?.chat || data.chat.length === 0) {
            return res
              .status(404)
              .json({
                error:
                  "Conversation not found. Please start a new conversation.",
              });
          }

          const chatMessages = data.chat;
          const description =
            chatMessages.find((msg) => msg.role === "User")?.content || "";

          conversation = {
            history: chatMessages
              .filter((msg) => msg.role === "AI" || msg.role === "User")
              .map((msg) => ({
                role: msg.role === "User" ? "user" : "assistant",
                content: msg.content,
              })),
            description: description,
            briefingId: briefingId,
          };

          console.log("✅ Conversation reconstructed from chat messages");
        } else {
          console.log("✅ Conversation loaded from database");
        }

        conversations.set(briefingId, conversation);
      }

      console.log("💬 Processing answer for briefing:", briefingId);

      conversation.history.push({ role: "user", content: userAnswer });

      const conversationContext = conversation.history
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n");

      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
You are helping a buyer prepare an RFQ (Request for Quote).

INITIAL REQUEST: "${conversation.description}"

CONVERSATION SO FAR:
${conversationContext}

YOUR TASK:
1. Review the conversation history above carefully
2. Analyze if the user's last answer was clear and complete
3. Determine what critical information is still missing for a complete RFQ

REQUIRED INFORMATION CHECKLIST (must have ALL):
✓ Product/service name and specifications
✓ Quantity or volume needed
✓ Delivery timeline or deadline
✓ Delivery location/address
✓ Quality standards or technical requirements
✓ Budget range (if mentioned)
✓ Any other special requirements

DECISION LOGIC:
- If the last answer was vague, unclear, or off-topic → ask for clarification
- If the last answer was good but info is incomplete → ask the next most important missing detail
- If you have ALL essential information above → respond with exactly: COMPLETE

RULES:
- Generate ONLY ONE question at a time
- Be conversational and natural
- Never ask about information already clearly provided
- If ready to finish, return ONLY the word: COMPLETE

RETURN: Either ONE question as plain text, OR the word "COMPLETE" (no quotes, no formatting).
`,
        });
      });

      const aiResponse = response.text.trim().replace(/["\[\]]/g, "");
      console.log("🤖 AI Response:", aiResponse);

      if (aiResponse.toUpperCase().includes("COMPLETE")) {
        console.log("✅ Conversation complete for briefing:", briefingId);
        const collectedInfo = {
          description: conversation.description,
          conversationHistory: conversation.history,
        };
        conversations.delete(briefingId);
        return res.json({
          done: true,
          message: "Great! I have all the information I need.",
          collectedInfo,
        });
      }

      conversation.history.push({ role: "assistant", content: aiResponse });
      conversations.set(briefingId, conversation);

      await saveConversationToDb(briefingId, conversation);

      console.log("❓ Next question:", aiResponse);

      res.json({ question: aiResponse, briefingId: briefingId });
    } catch (error) {
      console.error("❌ Error generating next question:", error);
      res
        .status(500)
        .json({
          error: "Failed to generate next question",
          details: error.message,
        });
    }
  });

  router.post("/compose-email", async (req, res) => {
    const { briefingId, collectedInfo } = req.body;

    if (!collectedInfo)
      return res.status(400).json({ error: "Collected info is required" });

    try {
      console.log("📧 Composing email for briefing:", briefingId);

      const conversationHistory = collectedInfo.conversationHistory
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n");

      const response = await retryWithBackoff(
        async () => {
          return await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
Create a professional RFQ (Request for Quote) email based on this conversation:

INITIAL REQUEST: ${collectedInfo.description}

CONVERSATION:
${conversationHistory}

Generate a complete, professional email that includes:
1. A clear subject line (format: "Subject: ...")
2. Professional greeting
3. Brief introduction
4. Detailed requirements extracted from the conversation
5. Specific questions or clarifications needed
6. Request for quote with timeline
7. Professional closing with signature placeholder

Make it formal, clear, and ready to send to suppliers.
`,
          });
        },
        4,
        2000
      );

      let email = response.text.trim();
      email = email.replace(/``````/g, "");

      const footerNotice =
        "\n\n---\nThis email was AI-generated using Quotely: https://quotely-repo.vercel.app";
      if (!email.includes(footerNotice)) email = `${email}${footerNotice}`;

      console.log("✅ Email generated successfully (footer appended)");

      res.json({
        email,
        message: "Email ready! You can copy and send it to suppliers.",
      });
    } catch (error) {
      console.error("❌ Error generating email:", error);
      res
        .status(500)
        .json({
          error:
            error.status === 503
              ? "AI service is temporarily overloaded. Please wait a moment and try again."
              : "Failed to generate email",
          details: error.message,
        });
    }
  });

  // Search suppliers
  router.post("/search-suppliers", async (req, res) => {
    const { collectedInfo, location } = req.body;
    if (!collectedInfo || !collectedInfo.description) {
      return res.status(400).json({ error: "collectedInfo.description required" });
    }

    try {
      // 1. Configure SearXNG URL (Default to a public instance if not set)
      // Recommended: Host your own or use a reliable one from https://searx.space/
      const SEARXNG_URL = process.env.SEARXNG_API_URL || "https://searx.be/search";
      
      // 2. Construct Query
      // We explicitly ask for "@" to find email patterns in snippets
      const searchQuery = `${collectedInfo.description} ${location || ""} "@" OR "email" -site:pinterest.* -site:instagram.*`;
      
      console.log(`🔍 Searching SearXNG: ${searchQuery} via ${SEARXNG_URL}`);

      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        language: "en",
        categories: "general", 
      });

      // 3. Fetch Results
      const searchRes = await fetch(`${SEARXNG_URL}?${params.toString()}`);
      
      if (!searchRes.ok) {
        throw new Error(`SearXNG request failed: ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      const results = searchData.results || [];

      if (results.length === 0) {
        console.log("ℹ️ SearXNG returned no results.");
        return res.json({ suppliers: [], queries: [] });
      }

      // 4. Prepare Context for AI (RAG)
      // We feed the top 15 snippets to Gemini to extract structured data
      const searchContext = results.slice(0, 15).map((r, i) => `
Result ${i + 1}:
Title: ${r.title}
URL: ${r.url}
Snippet: ${r.content}
`).join("\n---\n");

      const prompt = `
You are a procurement assistant.
BRIEF: ${collectedInfo.description}
LOCATION: ${location || "unspecified"}

I have performed a web search. Here are the results:

${searchContext}

YOUR TASK:
1. Analyze the search results above.
2. Identify real suppliers relevant to the brief.
3. Extract their Name, Website, and specifically a Contact Email.
4. CRITICAL: Only include suppliers if you find a valid email address (e.g. info@domain.com) in the snippet.
5. If a snippet does not contain an email, ignore it.

Return a JSON object:
{
  "suppliers": [
    {
      "name": "Supplier Name",
      "contact_email": "email@example.com",
      "phone": "Phone (or null)",
      "website": "URL",
      "note": "Why this supplier is relevant"
    }
  ],
  "queries": ["suggested follow-up search query"]
}
`;

      // 5. Call AI (No tools needed, just context)
      const aiResp = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        })
      );

      const raw = (aiResp.text || "").trim();

      // 6. Parse JSON (Reuse your existing robust parsing logic)
      const tryExtractJson = (text) => {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          return text.substring(jsonStart, jsonEnd);
        }
        return null;
      };

      let suppliers = [];
      let queries = [];

      const maybeJson = tryExtractJson(raw);
      if (maybeJson) {
        try {
          const parsed = JSON.parse(maybeJson);
          if (Array.isArray(parsed.suppliers)) {
            suppliers = parsed.suppliers.map((s) => ({
              name: s.name || s.title || null,
              contact_email: s.contact_email || s.email || null,
              phone: s.phone || null,
              website: s.website || null,
              note: s.note || null,
            }));
          }
          if (Array.isArray(parsed.queries)) queries = parsed.queries;
        } catch (e) {}
      }

      // 7. Fallback Regex Extraction (if AI failed to format JSON)
      if (!suppliers.length) {
        // Fixed typo in regex: A-ZaZ -> A-Za-z
        const emailRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
        const emails = [...new Set(raw.match(emailRegex) || [])];
        suppliers = emails.slice(0, 7).map(e => ({
            name: "Supplier (from search)",
            contact_email: e,
            phone: null,
            website: null,
            note: "Extracted from search results"
        }));
      }

      // 8. Final Filter
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      suppliers = suppliers
        .map((s) => ({
          ...s,
          contact_email: s.contact_email && emailRegex.test(s.contact_email) ? s.contact_email : null,
        }))
        .filter((s) => s.contact_email) // Only return suppliers with emails
        .slice(0, 7);

      if (!suppliers.length) {
        console.log("ℹ️ No suppliers with valid emails found in search snippets.");
        return res.json({ suppliers: [], queries: queries || [] });
      }

      return res.json({ suppliers, queries });

    } catch (error) {
      console.error("❌ Error searching suppliers:", error);
      return res.status(500).json({ error: "Failed to search suppliers", details: error.message });
    }
  });

  return router;
}
