import express from "express";
import { sendEmail, getThreadMessages, searchThreadIds } from "../email_gmail.js";
import { getOwnedBriefing, asyncRoute, rateLimit, HttpError } from "../lib/auth.js";

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;
const MAX_RECIPIENTS = 20;
const MAX_BODY = 50_000;

// Accepts "a@b.com" or "Name <a@b.com>" and returns the bare address (or null)
function extractAddress(value) {
  if (typeof value !== "string") return null;
  const angle = value.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : value).trim();
  return EMAIL_RE.test(addr) ? addr : null;
}

// Every email for a briefing carries this tag in its subject, so we can find
// all of its Gmail threads (one per supplier) without storing thread ids.
const briefingRef = (briefingId) => String(briefingId).replace(/-/g, "").slice(0, 8);
const refTag = (briefingId) => `[Ref: ${briefingRef(briefingId)}]`;

function withRefTag(subject, briefingId) {
  const tag = refTag(briefingId);
  return subject.includes(tag) ? subject : `${subject} ${tag}`;
}

async function findBriefingThreadIds(briefingId, legacyThreadId) {
  const ids = new Set();
  if (legacyThreadId) ids.add(legacyThreadId);
  const found = await searchThreadIds(`subject:${briefingRef(briefingId)}`);
  found.forEach((id) => ids.add(id));
  return [...ids];
}

export default function makeEmailRouter({ supabase, requireAuth }) {
  const router = express.Router();

  const sendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    keyFn: (req) => req.user.id,
    message: "Email limit reached (40 per hour). Try again later.",
  });

  // POST /api/send-email
  // body: { briefingId, subject, body, recipients[], isHtml, replyToMessageId? }
  router.post(
    "/send-email",
    requireAuth,
    sendLimiter,
    asyncRoute(async (req, res) => {
      const { subject, body, recipients, isHtml, briefingId, replyToMessageId } = req.body || {};

      if (typeof body !== "string" || !body.trim()) throw new HttpError(400, "Email body is required");
      if (body.length > MAX_BODY) throw new HttpError(400, "Email body is too long");
      if (!Array.isArray(recipients) || recipients.length === 0)
        throw new HttpError(400, "At least one recipient is required");
      if (recipients.length > MAX_RECIPIENTS)
        throw new HttpError(400, `At most ${MAX_RECIPIENTS} recipients per email`);

      const addresses = recipients.map(extractAddress);
      const invalid = recipients.filter((_, i) => !addresses[i]);
      if (invalid.length) throw new HttpError(400, `Invalid email address: ${invalid.join(", ")}`);

      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id, "id, gmail_thread_id");

      let sendSubject = (typeof subject === "string" && subject.trim()) || "Quote Request from Quotely";
      let threadId, inReplyTo, references;

      // Replying from the inbox: keep the reply inside the supplier's thread
      if (replyToMessageId) {
        const threadIds = await findBriefingThreadIds(briefing.id, briefing.gmail_thread_id);
        for (const tid of threadIds) {
          const msgs = await getThreadMessages(tid);
          const original = msgs.find((m) => m.id === replyToMessageId);
          if (original) {
            threadId = tid;
            inReplyTo = original.messageIdHeader || undefined;
            references = [original.references, original.messageIdHeader].filter(Boolean).join(" ") || undefined;
            const base = original.subject || sendSubject;
            sendSubject = /^re:/i.test(base) ? base : `Re: ${base}`;
            break;
          }
        }
      }

      sendSubject = withRefTag(sendSubject, briefing.id);

      const result = await sendEmail({
        from: process.env.GMAIL_API_SENDER || "me",
        to: addresses,
        subject: sendSubject,
        body,
        isHtml: !!isHtml,
        threadId,
        inReplyTo,
        references,
      });

      const newThreadId = result?.threadId || null;
      // Keep the legacy column populated (first thread wins) for older data
      if (newThreadId && !briefing.gmail_thread_id) {
        const { error } = await supabase
          .from("briefings")
          .update({ gmail_thread_id: newThreadId })
          .eq("id", briefing.id);
        if (error) console.warn("⚠️  Failed to persist gmail_thread_id:", error.message);
      }

      res.json({ ok: true, threadId: newThreadId, messageId: result?.id || null });
    }),
  );

  // GET /api/briefings/:briefingId/emails
  // All emails across every Gmail thread belonging to the briefing
  router.get(
    "/briefings/:briefingId/emails",
    requireAuth,
    asyncRoute(async (req, res) => {
      const briefing = await getOwnedBriefing(
        supabase,
        req.params.briefingId,
        req.user.id,
        "id, gmail_thread_id",
      );

      const threadIds = await findBriefingThreadIds(briefing.id, briefing.gmail_thread_id);
      if (threadIds.length === 0) return res.json({ ok: true, emails: [] });

      const perThread = await Promise.all(threadIds.map((tid) => getThreadMessages(tid)));
      const seen = new Set();
      const emails = perThread
        .flat()
        .filter((m) => (seen.has(m.id) ? false : seen.add(m.id)))
        .map(({ labelIds, references, ...m }) => ({ ...m, fromMe: labelIds.includes("SENT") }));

      emails.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      res.json({ ok: true, threadId: briefing.gmail_thread_id || null, emails });
    }),
  );

  return router;
}
