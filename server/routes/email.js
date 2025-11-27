import express from "express";
import { sendEmail, getThreadMessages, findThreadIdByBriefingToken } from "../email_send.js";

export default function makeEmailRouter({ supabase }) {
  const router = express.Router();

  router.post("/api/send-email", async (req, res) => {
    const { subject, body, recipients, isHtml } = req.body;
    const { briefingId } = req.body;
    const sender = process.env.GMAIL_API_SENDER || "me";

    if (!body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "body and recipients[] required" });
    }

    try {
      // If briefingId is provided, append a token to the subject so replies can be grouped
      let sendSubject = subject || "Quote Request from Quotely";
      if (briefingId) {
        sendSubject = `${sendSubject} [Quotely Briefing #${briefingId}]`;
      }

      // send the email via Gmail helper (returns gmail response.data)
      const result = await sendEmail({
        from: sender,
        to: recipients,
        subject: sendSubject,
        body,
        isHtml: !!isHtml,
      });

      // --- NEW: persist thread id to briefings table if available ---
      try {
        const threadId = result?.threadId || result?.data?.threadId || null;
        if (threadId && supabase && briefingId) {
          await supabase
            .from("briefings")
            .update({ gmail_thread_id: threadId })
            .eq("id", briefingId);
        }
      } catch (dbErr) {
        console.warn("Failed to persist gmail_thread_id to briefings:", dbErr.message || dbErr);
      }
      // --- end new code ---

      // Persist threadId to Supabase if available and briefingId provided
      try {
        const threadId = result?.threadId || result?.id || null;
        if (briefingId && threadId && supabase) {
          // Attempt to write gmail_thread_id into the briefings table
          const { error } = await supabase
            .from("briefings")
            .update({ gmail_thread_id: threadId })
            .eq("id", briefingId);
          if (error) console.warn("Failed to persist gmail_thread_id:", error.message);
        }
      } catch (err) {
        console.warn("Error persisting threadId to Supabase:", err.message || err);
      }

      res.json({ ok: true, result });
    } catch (err) {
      console.error("Error sending email:", err);
      res.status(500).json({ error: "Failed to send email", details: err.message });
    }
  });

  // --- Get emails (thread) for a briefing ---
  router.get("/api/briefings/:briefingId/emails", async (req, res) => {
    const { briefingId } = req.params;
    if (!briefingId) return res.status(400).json({ error: "briefingId required" });

    try {
      // Try to read stored gmail_thread_id from Supabase first (more reliable)
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

      // Fallback: search by subject token if no stored threadId
      if (!threadId) {
        const token = `[Quotely Briefing #${briefingId}]`;
        threadId = await findThreadIdByBriefingToken(token);
      }

      if (!threadId) return res.json({ ok: true, emails: [] });

      const messages = await getThreadMessages(threadId);
      // Return messages sorted by date ascending
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

