import express from "express";
import { randomBytes } from "crypto";
import { sendEmail, getThreadMessages, searchThreadIds, checkGmailAuth } from "../email_gmail.js";
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

const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/+$/, "");

// Public link where suppliers can submit their quote through a form (created on first use)
async function getSupplierLink(supabase, briefingId) {
  const { data, error } = await supabase
    .from("briefings")
    .select("supplier_link_token")
    .eq("id", briefingId)
    .single();
  if (error) throw new HttpError(500, `Failed to load briefing: ${error.message}`);
  let token = data?.supplier_link_token;
  if (!token) {
    token = randomBytes(32).toString("hex");
    const { error: upErr } = await supabase.from("briefings").update({ supplier_link_token: token }).eq("id", briefingId);
    if (upErr) throw new HttpError(500, `Failed to create supplier link: ${upErr.message}`);
  }
  return `${frontendUrl()}/supplier-response/${token}`;
}

export default function makeEmailRouter({ supabase, requireAuth }) {
  const router = express.Router();

  const sendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    keyFn: (req) => req.user.id,
    message: "Email limit reached (40 per hour). Try again later.",
  });

  // GET /api/email/status -> is sending configured and working?
  router.get(
    "/email/status",
    requireAuth,
    asyncRoute(async (req, res) => {
      const sender = process.env.GMAIL_API_SENDER || null;
      try {
        await checkGmailAuth();
        res.json({ ok: true, sender });
      } catch (err) {
        res.json({ ok: false, sender, error: err.message });
      }
    }),
  );

  // POST /api/send-email
  // body: { briefingId, subject, body, recipients[], isHtml, replyToMessageId?, includeSupplierLink? }
  // New requests are sent as ONE EMAIL PER RECIPIENT, so suppliers don't see
  // each other and every supplier gets their own thread in the inbox.
  router.post(
    "/send-email",
    requireAuth,
    sendLimiter,
    asyncRoute(async (req, res) => {
      const { subject, body, recipients, isHtml, briefingId, replyToMessageId, includeSupplierLink } = req.body || {};

      if (typeof body !== "string" || !body.trim()) throw new HttpError(400, "Email body is required");
      if (body.length > MAX_BODY) throw new HttpError(400, "Email body is too long");
      if (!Array.isArray(recipients) || recipients.length === 0)
        throw new HttpError(400, "At least one recipient is required");
      if (recipients.length > MAX_RECIPIENTS)
        throw new HttpError(400, `At most ${MAX_RECIPIENTS} recipients per send`);

      const addresses = recipients.map(extractAddress);
      const invalid = recipients.filter((_, i) => !addresses[i]);
      if (invalid.length) throw new HttpError(400, `Invalid email address: ${invalid.join(", ")}`);
      const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];

      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id, "id, gmail_thread_id");

      let sendSubject = (typeof subject === "string" && subject.trim().slice(0, 300)) || "Quote Request";
      let sendBody = body;
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
      } else if (includeSupplierLink) {
        const link = await getSupplierLink(supabase, briefing.id);
        sendBody += `\n\n---\nYou can reply to this email, or submit your quote online here:\n${link}`;
      }

      sendSubject = withRefTag(sendSubject, briefing.id);
      const from = process.env.GMAIL_API_SENDER || "me";

      // Replies go to everyone in one message; new requests are sent individually
      const batches = replyToMessageId ? [unique] : unique.map((a) => [a]);
      const sent = [];
      const failed = [];
      let firstThreadId = null;

      for (const to of batches) {
        try {
          const result = await sendEmail({ from, to, subject: sendSubject, body: sendBody, isHtml: !!isHtml, threadId, inReplyTo, references });
          firstThreadId ||= result?.threadId || null;
          sent.push(...to);
        } catch (err) {
          // Config/auth problems will fail for everyone: stop and report clearly
          if (err?.status === 503) {
            if (sent.length === 0) throw err;
            failed.push(...to.map((t) => ({ to: t, error: err.message })));
            break;
          }
          console.error("❌ send failed for", to.join(", "), err.message);
          failed.push(...to.map((t) => ({ to: t, error: err.message || "Send failed" })));
        }
      }

      if (sent.length === 0) {
        throw new HttpError(502, `Email could not be sent: ${failed[0]?.error || "unknown error"}`);
      }

      // Keep the legacy column populated (first thread wins) for older data
      if (firstThreadId && !briefing.gmail_thread_id) {
        const { error } = await supabase
          .from("briefings")
          .update({ gmail_thread_id: firstThreadId })
          .eq("id", briefing.id);
        if (error) console.warn("⚠️  Failed to persist gmail_thread_id:", error.message);
      }

      res.json({ ok: true, sent, failed, threadId: firstThreadId });
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
