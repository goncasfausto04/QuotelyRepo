// Email endpoints for a briefing:
//   GET  /api/email/status               is sending working? which mode?
//   POST /api/send-email                 new request (one email per supplier) or threaded reply
//   GET  /api/briefings/:id/emails       every message of the briefing's threads
//
// Sending goes through services/mail, which picks TEST or LIVE mode (see /admin).

import express from "express";
import { checkGmailAuth } from "../services/gmail.js";
import { getOwnedBriefing } from "../lib/auth.js";
import { asyncRoute, HttpError } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateSendRequest } from "../lib/emailInput.js";
import { sendBriefingEmail, getEmailMode } from "../services/mail/index.js";
import { withRefTag, listBriefingEmails, findBriefingMessage, replyFields } from "../services/emailThreads.js";
import { ensureSupplierToken, supplierLinkFor } from "../services/supplierLink.js";

const BRIEFING_COLUMNS = "id, gmail_thread_id";

async function appendSupplierLink(supabase, briefingId, body) {
  const link = supplierLinkFor(await ensureSupplierToken(supabase, briefingId));
  return `${body}\n\nYou can reply to this email, or submit your quote online here:\n${link}`;
}

// Send `message` to each recipient separately; collect successes and failures
async function sendToEach(supabase, recipients, message, options) {
  const sent = [];
  const failed = [];
  let first = null;
  for (const to of recipients) {
    try {
      const result = await sendBriefingEmail(supabase, { ...message, to }, options);
      first ||= result;
      sent.push(to);
    } catch (err) {
      // Config/auth problems fail for everyone: report them directly
      if (err?.status === 503 && sent.length === 0) throw err;
      console.error("❌ send failed for", to, err.message);
      failed.push({ to, error: err.message || "Send failed" });
      if (err?.status === 503) break;
    }
  }
  return { sent, failed, first };
}

export default function makeEmailRouter({ supabase, requireAuth }) {
  const router = express.Router();
  const sendLimiter = rateLimit({ max: 40, message: "Email limit reached (40 per hour). Try again later." });

  router.get(
    "/email/status",
    requireAuth,
    asyncRoute(async (req, res) => {
      const sender = process.env.GMAIL_API_SENDER || null;
      const mode = await getEmailMode(supabase);
      try {
        await checkGmailAuth();
        res.json({ ok: true, sender, mode });
      } catch (err) {
        res.json({ ok: false, sender, mode, error: err.message });
      }
    }),
  );

  router.post(
    "/send-email",
    requireAuth,
    sendLimiter,
    asyncRoute(async (req, res) => {
      const { briefingId, replyToMessageId, includeSupplierLink, isHtml } = req.body || {};
      const input = validateSendRequest(req.body || {});
      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id, BRIEFING_COLUMNS);

      const message = { from: process.env.GMAIL_API_SENDER || "me", subject: input.subject, body: input.body, isHtml: !!isHtml };
      let recipients = input.recipients;
      let options = {};

      if (replyToMessageId) {
        // Reply: one message, inside the supplier's existing thread
        const found = await findBriefingMessage(briefing, replyToMessageId);
        if (!found) throw new HttpError(404, "The email you're replying to was not found");
        Object.assign(message, replyFields(found.original, input.subject), { threadId: found.threadId });
        if (found.original.isDummy) {
          options = { forceMode: "test" };
          recipients = [found.original.intendedTo || recipients[0]];
        }
        recipients = [recipients.join(", ")];
      } else if (includeSupplierLink) {
        message.body = await appendSupplierLink(supabase, briefing.id, message.body);
      }
      message.subject = withRefTag(message.subject, briefing.id);

      const { sent, failed, first } = await sendToEach(supabase, recipients, message, options);
      if (!sent.length) throw new HttpError(502, `Email could not be sent: ${failed[0]?.error || "unknown error"}`);

      // Keep the legacy column populated (first thread wins) for older data
      if (first?.threadId && !briefing.gmail_thread_id) {
        await supabase.from("briefings").update({ gmail_thread_id: first.threadId }).eq("id", briefing.id);
      }

      res.json({
        ok: true,
        sent: sent.flatMap((s) => s.split(", ")),
        failed,
        mode: first.mode,
        dummyReplyInMs: first.dummyReplyInMs,
      });
    }),
  );

  router.get(
    "/briefings/:briefingId/emails",
    requireAuth,
    asyncRoute(async (req, res) => {
      const briefing = await getOwnedBriefing(supabase, req.params.briefingId, req.user.id, BRIEFING_COLUMNS);
      res.json({ ok: true, emails: await listBriefingEmails(briefing) });
    }),
  );

  return router;
}
