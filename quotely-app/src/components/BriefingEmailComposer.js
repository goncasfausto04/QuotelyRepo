// used to write briefing email and send via API
// allows choosing generated or custom email body
// used in briefing inbox view

import { useState, useEffect } from "react";

export default function BriefingEmailComposer({ briefingId, getGeneratedEmail, onSent }) {
  const [sendOption, setSendOption] = useState("generated"); // user options: generated, custom ; starts with generated
  const [customEmailText, setCustomEmailText] = useState(""); // custom email body if user chooses that
  const [recipientsText, setRecipientsText] = useState(""); // comma-separated recipient emails
  const [sendLoading, setSendLoading] = useState(false); // loading state for sending email

  // Persist generated email so it doesn't vanish when toggling or sending
  const [generatedText, setGeneratedText] = useState(
    getGeneratedEmail ? getGeneratedEmail() : "" // either from prop if function provided or empty if no email generated yet
  );

  // run when getGeneratedEmail prop changes
  useEffect(() => {
    // Check if getGeneratedEmail is a function (passed as prop from parent)
    if (typeof getGeneratedEmail === "function") {
      // Call the function to get the latest generated email text
      const val = getGeneratedEmail();
      // Update the generatedText state with the value (or empty string if null/undefined)
      setGeneratedText(val || "");
    }
  }, [getGeneratedEmail]); // Re-run this effect whenever getGeneratedEmail changes

  // Send email via backend API
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // send through post to /api/send-email ( located in server/routes/email.js )
  const sendEmailForBriefing = async () => {
    if (sendLoading) return;
    const body =
      sendOption === "generated" ? generatedText : customEmailText || "";
    if (!body || !body.trim()) {
      alert("No email body to send. Choose generated or enter custom text.");
      return;
    }
    const recipients = (recipientsText || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      alert("Enter at least one recipient email (comma-separated).");
      return;
    }

    setSendLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingId,
          subject: `Quote Request from Quotely`,
          body,
          recipients,
          isHtml: false,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data.details || data.error || `Status ${res.status}`;
        throw new Error(errMsg);
      }

      if (typeof onSent === "function") onSent(recipients);
      // keep generatedText so it remains visible; clear custom only
      setRecipientsText("");
      setCustomEmailText("");
    } catch (err) {
      console.error("Send email error:", err);
      alert("Failed to send email: " + (err.message || String(err)));
    } finally {
      setSendLoading(false);
    }
  };

  // copy email body to clipboard
  const copyBody = () => {
    const body = sendOption === "generated" ? generatedText : customEmailText;
    if (body) {
      navigator.clipboard.writeText(body);
      alert("Email copied to clipboard");
    }
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900">
      <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Send email</h3>

      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name="sendOption"
            checked={sendOption === "generated"}
            onChange={() => setSendOption("generated")}
            className="accent-blue-600"
            aria-label="Use generated email"
          />
          <span>Use generated email</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name="sendOption"
            checked={sendOption === "custom"}
            onChange={() => setSendOption("custom")}
            className="accent-blue-600"
            aria-label="Use custom email"
          />
          <span>Use custom email</span>
        </label>
      </div>

      {sendOption === "generated" && (
        <div className="mb-3">
          <textarea
            className="w-full h-40 p-3 border rounded text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-700"
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            placeholder="Generated email will appear here..."
            aria-label="Generated email body"
          />
        </div>
      )}

      {sendOption === "custom" && (
        <div className="mb-3">
          <textarea
            className="w-full h-40 p-3 border rounded text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-700"
            value={customEmailText}
            onChange={(e) => setCustomEmailText(e.target.value)}
            placeholder="Write custom email here..."
            aria-label="Custom email body"
          />
        </div>
      )}

      <div className="mb-3">
        <label className="text-sm block mb-1 text-gray-700 dark:text-gray-300">Recipients (comma-separated)</label>
        <input
          className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-700"
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          placeholder="supplier@example.com, sales@vendor.com"
          aria-label="Recipients"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={sendEmailForBriefing}
          disabled={
            sendLoading ||
            (sendOption === "generated" && !(generatedText && generatedText.trim()))
          }
          className={`px-4 py-2 rounded font-semibold ${
            sendLoading
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {sendLoading ? "Sending..." : "Send email"}
        </button>

        <button
          onClick={copyBody}
          className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
        >
          Copy body
        </button>
      </div>
    </div>
  );
}