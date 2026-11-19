import express from "express";
import { generateText, aiErrorMessage } from "../lib/ai.js";
import { getOwnedBriefing, asyncRoute, rateLimit, HttpError } from "../lib/auth.js";

const MAX_INPUT = 4000;
const MAX_HISTORY_FOR_PROMPT = 40;

const cleanQuestion = (text) => text.trim().replace(/^["'\s]+|["'\s]+$/g, "");
const isComplete = (text) => /^\W*COMPLETE\W*$/i.test(text.trim());

const formatHistory = (history) =>
  history
    .slice(-MAX_HISTORY_FOR_PROMPT)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

// The database is the single source of truth for conversation state.
// (The old in-memory Map was lost on every Render restart / cold start.)
async function saveConversation(supabase, briefingId, conversation) {
  const { error } = await supabase
    .from("briefings")
    .update({
      conversation_state: { history: conversation.history, description: conversation.description },
    })
    .eq("id", briefingId);
  if (error) throw new HttpError(500, `Failed to save conversation: ${error.message}`);
}

function conversationFromBriefing(briefing) {
  const state = briefing.conversation_state;
  if (state?.history?.length) {
    return { history: state.history, description: state.description || "" };
  }
  // Fall back to reconstructing from the UI chat log
  const chat = Array.isArray(briefing.chat) ? briefing.chat : [];
  const history = chat
    .filter((m) => m.role === "AI" || m.role === "User")
    .map((m) => ({ role: m.role === "User" ? "user" : "assistant", content: m.content }));
  if (!history.length) return null;
  return { history, description: chat.find((m) => m.role === "User")?.content || "" };
}

export default function makeConversationRouter({ ai, supabase, requireAuth }) {
  const router = express.Router();

  const chatLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 150,
    keyFn: (req) => req.user.id,
    message: "Chat limit reached. Try again later.",
  });

  router.post(
    "/start",
    requireAuth,
    chatLimiter,
    asyncRoute(async (req, res) => {
      const { description, briefingId } = req.body || {};
      if (typeof description !== "string" || !description.trim()) throw new HttpError(400, "Description is required");
      if (description.length > MAX_INPUT) throw new HttpError(400, "Description is too long");

      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id);
      console.log("🚀 Starting conversation for briefing:", briefing.id);

      let firstQuestion;
      try {
        firstQuestion = cleanQuestion(
          await generateText(
            ai,
            `A user wants to create an RFQ (Request for Quote) for: """${description}"""

Generate ONE specific, conversational question to start gathering details for their quote request.
Be professional but friendly. Reply in the same language the user wrote in.

RETURN ONLY THE QUESTION AS PLAIN TEXT (no JSON, no formatting).`,
          ),
        );
      } catch (err) {
        throw new HttpError(502, aiErrorMessage(err, "Failed to start conversation"));
      }

      const conversation = {
        description,
        history: [
          { role: "user", content: description },
          { role: "assistant", content: firstQuestion },
        ],
      };
      await saveConversation(supabase, briefing.id, conversation);

      res.json({ question: firstQuestion, briefingId: briefing.id });
    }),
  );

  router.post(
    "/next-question",
    requireAuth,
    chatLimiter,
    asyncRoute(async (req, res) => {
      const { briefingId, userAnswer } = req.body || {};
      if (typeof userAnswer !== "string" || !userAnswer.trim()) throw new HttpError(400, "User answer is required");
      if (userAnswer.length > MAX_INPUT) throw new HttpError(400, "Answer is too long");

      const briefing = await getOwnedBriefing(
        supabase,
        briefingId,
        req.user.id,
        "id, conversation_state, chat",
      );

      const conversation = conversationFromBriefing(briefing);
      if (!conversation) throw new HttpError(404, "Conversation not found. Please start a new conversation.");

      conversation.history.push({ role: "user", content: userAnswer });

      let aiResponse;
      try {
        aiResponse = cleanQuestion(
          await generateText(
            ai,
            `You are helping a buyer prepare an RFQ (Request for Quote).

INITIAL REQUEST: """${conversation.description}"""

CONVERSATION SO FAR:
${formatHistory(conversation.history)}

YOUR TASK:
1. Review the conversation history above carefully
2. Analyze if the user's last answer was clear and complete
3. Determine what critical information is still missing for a complete RFQ

REQUIRED INFORMATION CHECKLIST:
- Product/service name and specifications
- Quantity or volume needed
- Delivery timeline or deadline
- Delivery location/address
- Quality standards or technical requirements
- Budget range (only if the user wants to share it)
- Any other special requirements

DECISION LOGIC:
- If the last answer was vague, unclear, or off-topic -> ask for clarification
- If the last answer was good but info is incomplete -> ask the next most important missing detail
- If the user says they have nothing more to add, or you have all essential information -> respond with exactly: COMPLETE

RULES:
- Generate ONLY ONE question at a time
- Be conversational and natural, in the same language the user writes in
- Never ask about information already clearly provided
- Do not ask more than about 8 questions in total

RETURN: Either ONE question as plain text, OR the single word COMPLETE.`,
          ),
        );
      } catch (err) {
        throw new HttpError(502, aiErrorMessage(err, "Failed to generate next question"));
      }

      if (isComplete(aiResponse)) {
        await saveConversation(supabase, briefing.id, conversation);
        console.log("✅ Conversation complete for briefing:", briefing.id);
        return res.json({
          done: true,
          message: "Great! I have all the information I need.",
          collectedInfo: { description: conversation.description, conversationHistory: conversation.history },
        });
      }

      conversation.history.push({ role: "assistant", content: aiResponse });
      await saveConversation(supabase, briefing.id, conversation);
      res.json({ question: aiResponse, briefingId: briefing.id });
    }),
  );

  router.post(
    "/compose-email",
    requireAuth,
    chatLimiter,
    asyncRoute(async (req, res) => {
      const { briefingId } = req.body || {};
      const briefing = await getOwnedBriefing(
        supabase,
        briefingId,
        req.user.id,
        "id, conversation_state, chat",
      );

      // Use the server-side conversation, not whatever the client sends
      const conversation = conversationFromBriefing(briefing);
      if (!conversation) throw new HttpError(400, "Finish the conversation before generating the email");

      let email;
      try {
        email = await generateText(
          ai,
          `Create a professional RFQ (Request for Quote) email based on this conversation:

INITIAL REQUEST: ${conversation.description}

CONVERSATION:
${formatHistory(conversation.history)}

Generate a complete, professional email (in the same language the user wrote in) that includes:
1. A clear subject line (format: "Subject: ...")
2. Professional greeting
3. Brief introduction
4. Detailed requirements extracted from the conversation
5. Specific questions or clarifications needed
6. Request for quote with timeline
7. Professional closing with signature placeholder

Make it formal, clear, and ready to send to suppliers. Plain text only, no markdown.`,
          { retries: 4, baseDelay: 2000 },
        );
      } catch (err) {
        throw new HttpError(502, aiErrorMessage(err, "Failed to generate email"));
      }

      email = email.replace(/^```[a-z]*\s*|\s*```$/g, "").trim();
      const footerNotice = "\n\n---\nThis email was AI-generated using Quotely: https://quotely-repo.vercel.app";
      if (!email.includes(footerNotice.trim())) email += footerNotice;

      res.json({ email, message: "Email ready! You can copy and send it to suppliers." });
    }),
  );

  return router;
}
