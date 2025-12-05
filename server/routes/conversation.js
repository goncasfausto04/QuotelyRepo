import express from "express";

export default function makeConversationRouter({
  ai,
  retryWithBackoff,
  saveConversationToDb,
  loadConversationFromDb,
  conversations,
  supabase,
  braveClient, // <- injected from server.js
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

  // Search suppliers (SearxNG)
  router.post("/search-suppliers", async (req, res) => {
    const { description, collectedInfo, location } = req.body || {};

    // Build description from multiple possible fields
    let searchDescription = description || collectedInfo?.description;
    if (!searchDescription && collectedInfo?.conversationHistory?.length) {
      const firstUser = collectedInfo.conversationHistory.find((m) => m.role === "user");
      searchDescription = firstUser?.content || collectedInfo.conversationHistory[0]?.content;
    }

    if (!searchDescription || !searchDescription.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }

    // Prepare SearxNG URL
    const SEARXNG_URL = (process.env.SEARXNG_API_URL || "http://localhost:8080/search").replace(/\/+$/, "");

    // Build and sanitize query (Searx expects q param)
    const locationPart = location ? `${location} ` : "";
    const rawQuery = `${locationPart}${searchDescription} suppliers contact email`;
    const searchQuery = rawQuery.replace(/[^\w\s@.-]/g, " ").replace(/\s+/g, " ").trim().substring(0, 400);

    console.log(`🔍 Searching SearxNG: "${searchQuery}" via ${SEARXNG_URL}`);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        language: "en",
        categories: "general",
      });

      const resp = await fetch(`${SEARXNG_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { "User-Agent": "Quotely/1.0" },
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        console.error("❌ SearxNG returned non-ok:", resp.status, txt.slice(0, 200));
        return res.status(502).json({ error: "Search backend error", details: txt });
      }

      const data = await resp.json().catch(() => ({}));
      const rawResults = data?.results || data?.response || [];

      const results = (rawResults || []).map((it) => ({
        title: it?.title || it?.headline || "",
        url: it?.url || it?.link || it?.source || null,
        content: it?.content || it?.snippet || it?.excerpt || it?.description || "",
      })).slice(0, 60);

      console.log(`✅ SearxNG returned ${results.length} results`);
      return res.json({ suppliers: results, queries: [searchQuery] });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("❌ Error performing SearxNG search:", err?.message || err);
      if (err.name === "AbortError") {
        return res.status(504).json({ error: "Search request timed out" });
      }
      return res.status(500).json({ error: "Supplier search failed", details: err?.message || String(err) });
    }
  });
  
  return router;
}
