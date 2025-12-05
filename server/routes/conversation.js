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
    const { collectedInfo, location } = req.body;
    if (!collectedInfo || !collectedInfo.description) {
      return res.status(400).json({ error: "collectedInfo.description required" });
    }

    try {
      const locationNote = location ? ` near "${location}"` : "";
      const prompt = `
You are an assistant that finds suppliers for a buyer's RFQ.

BRIEF: ${collectedInfo.description}
LOCATION: ${location || "unspecified"}

Task:
1) Return JSON ONLY with a key "suppliers" that is an array (up to 7) of supplier objects.
Each supplier object must include these keys: "name", "contact_email" (if known or null), "phone" (if known or null), "website" (if known or null), "note" (one-line about relevance/why recommended).
2) Also include "queries": an array of short search queries (3-6 words) useful to find more suppliers.

Example output:
{
  "suppliers": [
    {"name":"Acme Supplies","contact_email":"sales@acme.com","phone":"+1 555 1111","website":"https://acme.com","note":"Specializes in ..."}
  ],
  "queries":["stainless fastener supplier","hex head fastener manufacturer"]
}

Return only valid JSON. Prefer local/specialist suppliers if a location is provided. Do NOT include extraneous text.
`;

      const aiResp = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config,
        })
      );

      const aiText = (aiResp && (aiResp.text || aiResp.outputText)) ? (aiResp.text || aiResp.outputText).trim() : "";
      let parsed = { suppliers: [], queries: [] };

      // Try strict JSON parse first
      try {
        const start = aiText.indexOf("{");
        parsed = start !== -1 ? JSON.parse(aiText.slice(start)) : JSON.parse(aiText);
      } catch (err) {
        // Fallback parsing: extract supplier-like lines
        const lines = aiText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const suppliers = [];
        const queries = [];
        for (const line of lines) {
          // simple supplier line heuristics
          const domainMatch = line.match(/([a-z0-9.-]+\.[a-z]{2,6})/i);
          const emailMatch = line.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
          const phoneMatch = line.match(/(\+?\d[\d\-\s()]{6,}\d)/);
          if (/supplier|inc|ltd|company|co\./i.test(line) && suppliers.length < 7) {
            // create best-effort object
            suppliers.push({
              name: line.replace(/^[\-\d.\s]*/,'').slice(0,120),
              contact_email: emailMatch ? emailMatch[1] : null,
              phone: phoneMatch ? phoneMatch[1].trim() : null,
              website: domainMatch ? domainMatch[1] : null,
              note: "",
            });
          } else {
            // treat as possible query if short
            const wc = line.split(/\s+/).length;
            if (wc >= 2 && wc <= 6 && queries.length < 10) queries.push(line.replace(/["'.]$/,''));
          }
        }
        parsed.suppliers = suppliers;
        parsed.queries = queries;
      }

      // Normalize suppliers (ensure expected keys)
      parsed.suppliers = (parsed.suppliers || []).slice(0,7).map((s) => ({
        name: s.name || s.title || null,
        contact_email: s.contact_email || s.email || null,
        phone: s.phone || s.tel || null,
        website: s.website || s.url || null,
        note: s.note || "",
      }));

      res.json({
        suppliers: parsed.suppliers,
        queries: parsed.queries || [],
        raw_text: aiText || null,
        note: "AI supplier suggestions (location-aware)",
      });
    } catch (err) {
      console.error("Error in /search-suppliers:", err);
      res.status(500).json({ error: "Failed to search suppliers", details: err.message || String(err) });
    }
  });
  
  return router;
}
