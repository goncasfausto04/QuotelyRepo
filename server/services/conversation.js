// Briefing interview + RFQ email generation.
//
// conversation_state (briefings column) is the single source of truth:
// { description, history: [{role, content}], spec, language, done }

import { generateJson, aiErrorMessage } from "../lib/ai.js";
import { HttpError } from "../lib/http.js";
import { profileForPrompt } from "../lib/profile.js";
import { interviewPrompt, EMPTY_SPEC, MAX_QUESTIONS } from "../prompts/conversation.js";
import { rfqEmailPrompt, reviseEmailPrompt } from "../prompts/email.js";

const MAX_HISTORY = 40;
const QUOTELY_FOOTER = "\n\n---\nSent with Quotely: https://quotely-repo.vercel.app";

const str = (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, 20) : []);

function cleanSpec(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    item: str(s.item),
    quantity: str(s.quantity != null ? String(s.quantity) : null),
    specifications: list(s.specifications),
    delivery_location: str(s.delivery_location),
    deadline: str(s.deadline),
    budget: str(s.budget),
    extras: list(s.extras),
  };
}

// Load from the briefing; falls back to the UI chat log for old briefings
export function loadConversation(briefing) {
  const state = briefing.conversation_state;
  if (state?.history?.length) {
    return {
      description: state.description || state.history[0]?.content || "",
      history: state.history,
      spec: { ...EMPTY_SPEC, ...(state.spec || {}) },
      language: state.language || null,
      done: !!state.done,
    };
  }
  const chat = Array.isArray(briefing.chat) ? briefing.chat : [];
  const history = chat
    .filter((m) => m.role === "AI" || m.role === "User")
    .map((m) => ({ role: m.role === "User" ? "user" : "assistant", content: m.content }));
  const firstUser = history.findIndex((m) => m.role === "user");
  if (firstUser < 0) return null;
  return {
    description: history[firstUser].content,
    history: history.slice(firstUser),
    spec: { ...EMPTY_SPEC },
    language: null,
    done: false,
  };
}

export async function saveConversation(supabase, briefingId, conv) {
  const { error } = await supabase
    .from("briefings")
    .update({ conversation_state: conv }) // conv.done marks a finished interview
    .eq("id", briefingId);
  if (error) throw new HttpError(500, `Failed to save conversation: ${error.message}`);
}

// One interview step. Mutates and returns conv.
export async function interviewStep(ai, conv, profile) {
  const questionsAsked = conv.history.filter((m) => m.role === "assistant").length;
  let result;
  try {
    result = await generateJson(
      ai,
      interviewPrompt({
        history: conv.history.slice(-MAX_HISTORY),
        spec: conv.spec,
        profile: profileForPrompt(profile),
        questionsAsked,
      }),
    );
  } catch (err) {
    throw new HttpError(502, aiErrorMessage(err, "The assistant couldn't reply, please try again"));
  }

  conv.spec = cleanSpec(result.spec);
  conv.language = str(result.language) || conv.language;
  const question = str(result.message);
  conv.done = result.status === "complete" || !question || questionsAsked >= MAX_QUESTIONS;
  if (!conv.done) conv.history.push({ role: "assistant", content: question });
  return conv;
}

const stripFooter = (text) => text.replace(QUOTELY_FOOTER.trim(), "").replace(/\n*---\s*$/, "").trim();

// -> { subject, body, text, summary } where text = "Subject: ...\n\nbody" (what the UI shows)
// With instructions + currentEmail, the existing email is revised instead.
export async function composeRfqEmail(ai, conv, profile, { instructions, currentEmail } = {}) {
  const revising = !!(instructions && currentEmail);
  const prompt = revising
    ? reviseEmailPrompt({ currentEmail: stripFooter(currentEmail), instructions, profile: profileForPrompt(profile) })
    : rfqEmailPrompt({
        spec: conv.spec,
        history: conv.history.slice(-MAX_HISTORY),
        profile: profileForPrompt(profile),
        language: conv.language,
      });

  let result;
  try {
    result = await generateJson(ai, prompt, { retries: 4, baseDelay: 2000 });
  } catch (err) {
    throw new HttpError(502, aiErrorMessage(err, "Failed to generate the email, please try again"));
  }
  const subject = str(result.subject) || `Request for quote: ${conv.spec.item || conv.description.slice(0, 60)}`;
  const rawBody = typeof result.body === "string" ? stripFooter(result.body) : "";
  if (rawBody.length < 50) throw new HttpError(502, "The generated email was empty, please try again");
  const body = rawBody + QUOTELY_FOOTER;
  return { subject, body, text: `Subject: ${subject}\n\n${body}`, summary: str(result.summary) };
}
