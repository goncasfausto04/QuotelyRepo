import express from "express";
import { sendEmail, getThreadMessages } from "../email_gmail.js";

export default function makeEmailRouter({ supabase }) {
  const router = express.Router();

  // POST /api/send-email (email is mounted at /api, so route here is /send-email)
  router.post("/send-email", async (req, res) => {
    const { subject, body, recipients, isHtml, briefingId } = req.body;
    const sender = process.env.GMAIL_API_SENDER || "me";

    // check if required fields are present body = message and recipients = array of email addresses (supplied by frontend)
    if (!body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "body and recipients[] required" });
    }

    try {
      // Default subject if not provided
      let sendSubject = subject || "Quote Request from Quotely";

      // Send via Gmail API
      const result = await sendEmail({
        from: sender,
        to: recipients,
        subject: sendSubject,
        body,
        isHtml: !!isHtml,
      });

      // Persist the gmail_thread_id to the briefing in the database
      // used when fetching thread messages in inbox
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
  // Fetch emails in the Gmail thread associated with the briefing
  // used in the briefing inbox 
  router.get("/briefings/:briefingId/emails", async (req, res) => {
    const { briefingId } = req.params;
    if (!briefingId) return res.status(400).json({ error: "briefingId required" });

    try {
      // Get the gmail_thread_id from the briefing
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

      // if there is no threadId, return empty array ( no emails )
      if (!threadId) {
        return res.json({ ok: true, threadId: null, emails: [] });
      }

      // fetch messages in the thread via Gmail API
      const messages = await getThreadMessages(threadId);
      
      // sort messages by date from oldest to newest
      messages.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      // filter out messages sent by own sender address (to avoid showing self-sent emails)
      const ownSender = (process.env.GMAIL_API_SENDER || "").toLowerCase().trim();
      // If GMAIL_API_SENDER is configured, filter out messages that come from that address
      let emailsToReturn = messages || [];
      if (ownSender) {
        emailsToReturn = emailsToReturn.filter((e) => {
          const from = (e.from || "").toLowerCase();
          return !from.includes(ownSender);
        });
      }

      return res.json({ ok: true, threadId, emails: emailsToReturn });
    } catch (err) {
      console.error("Error fetching briefing emails:", err);
      res.status(500).json({ error: "Failed to fetch briefing emails", details: err.message });
    }
  });

  return router;
}

