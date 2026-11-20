// New quote request: subject + body (prefilled from the AI email), recipient
// chips with supplier suggestions. Each supplier gets their own private email.

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, RotateCcw, Copy, Link2 } from "lucide-react";
import Notice from "../ui/Notice.js";
import RecipientInput, { parseRecipients } from "./RecipientInput.js";
import SupplierSuggestions from "./SupplierSuggestions.js";
import EmailModeBanner from "./EmailModeBanner.js";
import { splitSubject, lower } from "./emailUtils.js";
import { sendEmail } from "./inboxApi.js";

const inputCls =
  "w-full p-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EmailComposer({ briefingId, briefingTitle, generatedEmail = "", suggestions = [], contacted = [], emailStatus, presetRecipients, onSent }) {
  const generated = useMemo(() => splitSubject(generatedEmail), [generatedEmail]);
  const defaultSubject = generated.subject || (briefingTitle ? `Request for quote: ${briefingTitle}` : "Request for quote");

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(generated.body);
  const [recipients, setRecipients] = useState([]);
  const [includeLink, setIncludeLink] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const touched = useRef({ subject: false, body: false });
  const [draft, setDraft] = useState(""); // address typed but not yet turned into a chip

  // Fill fields from the generated email until the user edits them
  useEffect(() => {
    if (!touched.current.body) setBody(generated.body);
    if (!touched.current.subject) setSubject(defaultSubject);
  }, [generated.body, defaultSubject]);

  const contactedSet = useMemo(() => new Set(contacted.map(lower)), [contacted]);
  const recipientSet = useMemo(() => new Set(recipients.map(lower)), [recipients]);

  const add = (list) =>
    setRecipients((prev) => {
      const seen = new Set(prev.map(lower));
      return [...prev, ...list.filter((a) => !seen.has(lower(a)) && seen.add(lower(a)))];
    });

  // Suppliers picked in "Find suppliers"
  useEffect(() => {
    if (presetRecipients?.length) add(presetRecipients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRecipients]);

  const allRecipients = () => {
    const typed = parseRecipients(draft).good.filter((a) => !recipientSet.has(lower(a)));
    return [...recipients, ...typed];
  };

  const emailBroken = emailStatus && !emailStatus.ok;
  const canSend = !sending && !emailBroken && body.trim() && subject.trim() && (recipients.length > 0 || parseRecipients(draft).good.length > 0);

  const send = async () => {
    const to = allRecipients();
    if (!canSend || !to.length) return;
    const again = to.filter((r) => contactedSet.has(lower(r)));
    if (again.length && !window.confirm(`You already emailed ${again.join(", ")} for this briefing. Send again?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await sendEmail({ briefingId, subject: subject.trim(), body, recipients: to, includeSupplierLink: includeLink });
      const failed = res.failed || [];
      setRecipients(failed.map((f) => f.to)); // keep failures for a retry
      setDraft("");
      const n = res.sent?.length || to.length;
      const testNote = res.mode === "test" ? " (test mode: the dummy reply will appear in a few seconds)" : ". Replies will show up above.";
      setResult(
        failed.length
          ? { type: "error", text: `Sent to ${n}, failed for ${failed.map((f) => f.to).join(", ")}. You can retry.` }
          : { type: "success", text: `Sent to ${n} supplier${n === 1 ? "" : "s"}${testNote}` },
      );
      onSent?.(res);
    } catch (err) {
      setResult({ type: "error", text: err.message || "Failed to send" });
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    touched.current = { subject: false, body: false };
    setBody(generated.body);
    setSubject(defaultSubject);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Send size={18} /> New quote request
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {emailStatus?.sender ? <>Sending from <b>{emailStatus.sender}</b>. </> : null}
            Each supplier receives their own private email.
          </p>
        </div>
        {generated.body && (
          <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 shrink-0">
            <RotateCcw size={14} /> Reset to generated
          </button>
        )}
      </div>

      <EmailModeBanner status={emailStatus} />

      <label className="text-sm font-medium block mb-1 text-gray-700 dark:text-gray-300">To</label>
      <RecipientInput
        recipients={recipients}
        draft={draft}
        setDraft={setDraft}
        onAdd={add}
        onRemove={(r) => setRecipients((prev) => prev.filter((x) => x !== r))}
        contactedSet={contactedSet}
        onInvalid={(bad) => setResult(bad.length ? { type: "error", text: `Not a valid email: ${bad.join(", ")}` } : null)}
      />
      <SupplierSuggestions suggestions={suggestions} recipientSet={recipientSet} contactedSet={contactedSet} onAdd={add} />

      <label className="text-sm font-medium block mt-4 mb-1 text-gray-700 dark:text-gray-300">Subject</label>
      <input
        className={inputCls}
        value={subject}
        maxLength={300}
        onChange={(e) => {
          touched.current.subject = true;
          setSubject(e.target.value);
        }}
        aria-label="Subject"
      />

      <label className="text-sm font-medium block mt-4 mb-1 text-gray-700 dark:text-gray-300">Message</label>
      <textarea
        className={`${inputCls} h-64 font-sans leading-relaxed`}
        value={body}
        onChange={(e) => {
          touched.current.body = true;
          setBody(e.target.value);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && send()}
        placeholder={generated.body ? "" : "Write your quote request here, or finish the chat in the Chat tab to have one written for you."}
        aria-label="Email body"
      />

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
        <input type="checkbox" checked={includeLink} onChange={(e) => setIncludeLink(e.target.checked)} className="accent-blue-600" />
        <Link2 size={14} /> Include a link so suppliers can submit their quote through a form
      </label>

      {result && (
        <div className="mt-4">
          <Notice type={result.type} onClose={() => setResult(null)}>
            {result.text}
          </Notice>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          {sending ? "Sending…" : recipients.length > 1 ? `Send to ${recipients.length} suppliers` : "Send"}
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`Subject: ${subject}\n\n${body}`).then(() => setResult({ type: "success", text: "Copied to clipboard" }))}
          disabled={!body.trim()}
          className="flex items-center gap-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <Copy size={14} /> Copy
        </button>
        <span className="text-xs text-gray-400 ml-auto hidden sm:inline">Ctrl+Enter to send</span>
      </div>
    </div>
  );
}
