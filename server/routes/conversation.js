// Briefing chat: /start, /next-question, /compose-email
// The assistant interviews the buyer, keeps a structured spec, and writes the
// RFQ email signed with the buyer's real profile details.

import express from "express";
import { getOwnedBriefing } from "../lib/auth.js";
import { HttpError, asyncRoute } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { getSenderProfile } from "../lib/profile.js";
import { EMPTY_SPEC } from "../prompts/conversation.js";
import { loadConversation, saveConversation, interviewStep, composeRfqEmail } from "../services/conversation.js";

const MAX_INPUT = 4000;
const STATE_COLUMNS = "id, conversation_state, chat";

const requireText = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${name} is required`);
  if (value.length > MAX_INPUT) throw new HttpError(400, `${name} is too long`);
  return value.trim();
};

// What the chat UI receives after every step
const stepResponse = (conv) =>
  conv.done
    ? { done: true, spec: conv.spec, message: "Great, I have everything I need." }
    : { done: false, question: conv.history[conv.history.length - 1].content, spec: conv.spec };

export default function makeConversationRouter({ ai, supabase, requireAuth }) {
  const router = express.Router();
  router.use(["/start", "/next-question", "/compose-email"], requireAuth, rateLimit({ max: 150, message: "Chat limit reached. Try again later." }));

  router.post(
    "/start",
    asyncRoute(async (req, res) => {
      const description = requireText(req.body?.description, "Description");
      const briefing = await getOwnedBriefing(supabase, req.body?.briefingId, req.user.id);
      const profile = await getSenderProfile(supabase, req.user);

      const conv = { description, history: [{ role: "user", content: description }], spec: { ...EMPTY_SPEC }, language: null, done: false };
      await interviewStep(ai, conv, profile);
      await saveConversation(supabase, briefing.id, conv);
      res.json(stepResponse(conv));
    }),
  );

  router.post(
    "/next-question",
    asyncRoute(async (req, res) => {
      const answer = requireText(req.body?.userAnswer, "Answer");
      const briefing = await getOwnedBriefing(supabase, req.body?.briefingId, req.user.id, STATE_COLUMNS);
      const conv = loadConversation(briefing);
      if (!conv) throw new HttpError(404, "Conversation not found. Please start a new request.");
      if (conv.done) return res.json(stepResponse(conv));

      conv.history.push({ role: "user", content: answer });
      await interviewStep(ai, conv, await getSenderProfile(supabase, req.user));
      await saveConversation(supabase, briefing.id, conv);
      res.json(stepResponse(conv));
    }),
  );

  router.post(
    "/compose-email",
    asyncRoute(async (req, res) => {
      const briefing = await getOwnedBriefing(supabase, req.body?.briefingId, req.user.id, STATE_COLUMNS);
      const conv = loadConversation(briefing);
      if (!conv) throw new HttpError(400, "Finish the conversation before generating the email");

      // Optional: revise the current email ("make it shorter", "ask for samples"...)
      const instructions = typeof req.body?.instructions === "string" ? req.body.instructions.trim().slice(0, MAX_INPUT) : "";
      const currentEmail = typeof req.body?.currentEmail === "string" ? req.body.currentEmail.slice(0, 20_000) : "";

      const email = await composeRfqEmail(ai, conv, await getSenderProfile(supabase, req.user), { instructions, currentEmail });
      res.json({ email: email.text, subject: email.subject, body: email.body, summary: email.summary });
    }),
  );

  return router;
}
