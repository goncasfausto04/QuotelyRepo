import express from "express";
import { sendEmail, getThreadMessages, findThreadIdByBriefingToken } from "../email_send.js";

export default function makeEmailRouter({ supabase }) {
  const router = express.Router();

  // POST /api/send-email (mounted at /api, so route is /send-email)
  router.post("/send-email", async (req, res) => {
    const { subject, body, recipients, isHtml, briefingId } = req.body;
    const sender = process.env.GMAIL_API_SENDER || "me";

    // Validate request
    if (!body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "body and recipients[] required" });
    }

    try {
      // Append briefing token to subject for threading
      let sendSubject = subject || "Quote Request from Quotely";
      if (briefingId) {
        sendSubject = `${sendSubject} [Quotely Briefing #${briefingId}]`;
      }

      // Send via Gmail API
      const result = await sendEmail({
        from: sender,
        to: recipients,
        subject: sendSubject,
        body,
        isHtml: !!isHtml,
      });

      // Persist gmail_thread_id to briefings table
      const threadId = result?.threadId || null;
      if (threadId && supabase && briefingId) {
        try {
          await supabase
            .from("briefings")
            .update({ gmail_thread_id: threadId })
            .eq("id", briefingId);
          console.log("✅ Persisted gmail_thread_id:", threadId);
        } catch (dbErr) {
          console.warn("Failed to persist gmail_thread_id:", dbErr.message || dbErr);
        }
      }

      res.json({ ok: true, threadId, result });
    } catch (err) {
      console.error("Error sending email:", err);
      res.status(500).json({ error: "Failed to send email", details: err.message || String(err) });
    }
  });

  // GET /api/briefings/:briefingId/emails
  router.get("/briefings/:briefingId/emails", async (req, res) => {
    const { briefingId } = req.params;
    if (!briefingId) return res.status(400).json({ error: "briefingId required" });

    try {
      let threadId = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from("briefings")
            .select("gmail_thread_id")
            .eq("id", briefingId)
            .single();
          if (data && data.gmail_thread_id) threadId = data.gmail_thread_id;
        } catch (err) {
          console.warn("Error reading gmail_thread_id from DB:", err.message || err);
        }
      }

      if (!threadId) {
        const token = `[Quotely Briefing #${briefingId}]`;
        threadId = await findThreadIdByBriefingToken(token);
      }

      if (!threadId) return res.json({ ok: true, emails: [] });

      const messages = await getThreadMessages(threadId);
      messages.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      res.json({ ok: true, threadId, emails: messages });
    } catch (err) {
      console.error("Error fetching briefing emails:", err);
      res.status(500).json({ error: "Failed to fetch briefing emails", details: err.message });
    }
  });

  return router;
}

// --- to send an email through powershell for test --- DELETE LATER

// $payload = @{
//  subject    = "Quotely test email"
//  body       = "This is a test email from Quotely - ignore."
//  recipients = @("test@example.com") -- change to your email
//  isHtml     = $false
//}
// Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/send-email -ContentType 'application/json' -Body ($payload | ConvertTo-Json)

