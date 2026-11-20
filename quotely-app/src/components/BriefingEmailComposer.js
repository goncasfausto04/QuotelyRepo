// Compose and send a quote request to one or more suppliers.
// - Prefills subject + body from the AI-generated email (splits off "Subject: ...")
// - Recipients as chips, with one-click suggestions from the supplier search
// - Each supplier gets their own private email (and their own inbox thread)

import { useState, useEffect, useMemo, useRef } from "react";
import { Send, X, Plus, RotateCcw, Copy, Link2, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { apiFetch } from "../api.js";

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

// "Subject: Foo\n\nDear..." -> { subject: "Foo", body: "Dear..." }
export function splitSubject(text = "") {
  const m = String(text).match(/^\s*(?:subject|assunto|asunto)\s*:\s*(.+)\r?\n+/i);
  if (!m) return { subject: "", body: String(text).trim() };
  return { subject: m[1].trim(), body: String(text).slice(m[0].length).trim() };
}

const lower = (s) => String(s || "").toLowerCase();

export default function BriefingEmailComposer({
  briefingId,
  briefingTitle,
  generatedEmail = "",
  suggestions = [], // [{ name, email }]
  contacted = [], // addresses already emailed for this briefing
  emailStatus, // { ok, sender, error } | null while loading
  onSent,
}) {
  const generated = useMemo(() => splitSubject(generatedEmail), [generatedEmail]);
  const defaultSubject = generated.subject || (briefingTitle ? `Quote request: ${briefingTitle}` : "Quote request");

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(generated.body);
  const [recipients, setRecipients] = useState([]);
  const [draft, setDraft] = useState("");
  const [includeLink, setIncludeLink] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { type: "success"|"error", text }
  const touched = useRef({ subject: false, body: false });

  // When the generated email arrives/changes, fill the fields the user hasn't edited
  useEffect(() => {
    if (!touched.current.body) setBody(generated.body);
    if (!touched.current.subject) setSubject(defaultSubject);
  }, [generated.body, defaultSubject]);

  const contactedSet = useMemo(() => new Set(contacted.map(lower)), [contacted]);
  const recipientSet = useMemo(() => new Set(recipients.map(lower)), [recipients]);
  const openSuggestions = suggestions.filter((s) => s.email && !recipientSet.has(lower(s.email)));

  const addRecipients = (text) => {
    const parts = String(text)
      .split(/[\s,;]+/)
      .map((p) => p.replace(/^.*<([^>]+)>.*$/, "$1").trim())
      .filter(Boolean);
    const bad = parts.filter((p) => !EMAIL_RE.test(p));
    const good = parts.filter((p) => EMAIL_RE.test(p));
    if (good.length) {
      setRecipients((prev) => {
        const seen = new Set(prev.map(lower));
        return [...prev, ...good.filter((g) => !seen.has(lower(g)) && seen.add(lower(g)))];
      });
    }
    setDraft(bad.join(", "));
    if (bad.length) setResult({ type: "error", text: `Not a valid email: ${bad.join(", ")}` });
    else if (result?.type === "error") setResult(null);
  };

  const onDraftKey = (e) => {
    if (["Enter", ",", ";", "Tab"].includes(e.key) && draft.trim()) {
      e.preventDefault();
      addRecipients(draft);
    } else if (e.key === "Backspace" && !draft && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  const removeRecipient = (r) => setRecipients((prev) => prev.filter((x) => x !== r));

  const resetToGenerated = () => {
    touched.current = { subject: false, body: false };
    setBody(generated.body);
    setSubject(defaultSubject);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setResult({ type: "success", text: "Copied to clipboard" });
    } catch {
      setResult({ type: "error", text: "Couldn't access the clipboard" });
    }
  };

  // Any address still typed in the box counts too
  const pendingDraft = draft.trim() && EMAIL_RE.test(draft.trim()) ? [draft.trim()] : [];
  const finalRecipients = [...recipients, ...pendingDraft.filter((d) => !recipientSet.has(lower(d)))];
  const alreadyContacted = finalRecipients.filter((r) => contactedSet.has(lower(r)));
  const emailBroken = emailStatus && !emailStatus.ok;
  const canSend = !sending && !emailBroken && body.trim() && subject.trim() && finalRecipients.length > 0;

  const send = async () => {
    if (!canSend) return;
    if (
      alreadyContacted.length &&
      !window.confirm(`You already emailed ${alreadyContacted.join(", ")} for this briefing. Send again?`)
    )
      return;

    setSending(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/send-email", {
        method: "POST",
        json: {
          briefingId,
          subject: subject.trim(),
          body,
          recipients: finalRecipients,
          isHtml: false,
          includeSupplierLink: includeLink,
        },
      });
      const sent = res.sent || finalRecipients;
      const failed = res.failed || [];
      setRecipients(failed.map((f) => f.to)); // keep only the ones that failed, for a retry
      setDraft("");
      setResult(
        failed.length
          ? { type: "error", text: `Sent to ${sent.length}, failed for ${failed.map((f) => f.to).join(", ")}. You can retry.` }
          : { type: "success", text: `Sent to ${sent.length} supplier${sent.length === 1 ? "" : "s"}. Replies will show up in the inbox above.` },
      );
      onSent?.(sent);
    } catch (err) {
      setResult({ type: "error", text: err.message || "Failed to send" });
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    "w-full p-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500";

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
          <button
            type="button"
            onClick={resetToGenerated}
            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 shrink-0"
            title="Restore the AI-generated subject and text"
          >
            <RotateCcw size={14} /> Reset to generated
          </button>
        )}
      </div>

      {emailBroken && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200 flex gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>Email sending is not working right now: {emailStatus.error}</span>
        </div>
      )}

      {/* Recipients */}
      <label className="text-sm font-medium block mb-1 text-gray-700 dark:text-gray-300">To</label>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500"
        onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
      >
        {recipients.map((r) => (
          <span
            key={r}
            className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${
              contactedSet.has(lower(r))
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
            }`}
            title={contactedSet.has(lower(r)) ? "Already emailed for this briefing" : undefined}
          >
            {r}
            <button type="button" onClick={() => removeRecipient(r)} aria-label={`Remove ${r}`}>
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[180px] p-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onDraftKey}
          onBlur={() => draft.trim() && addRecipients(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[\s,;]/.test(text.trim())) {
              e.preventDefault();
              addRecipients(draft + " " + text);
            }
          }}
          placeholder={recipients.length ? "Add another…" : "supplier@example.com (press Enter to add)"}
          aria-label="Recipient email"
        />
      </div>

      {openSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Users size={14} /> Found suppliers:
          </span>
          {openSuggestions.map((s) => (
            <button
              key={s.email}
              type="button"
              onClick={() => addRecipients(s.email)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={s.email}
            >
              <Plus size={12} /> {s.name || s.email}
              {contactedSet.has(lower(s.email)) && <span className="text-amber-600">(emailed)</span>}
            </button>
          ))}
          {openSuggestions.length > 1 && (
            <button
              type="button"
              onClick={() => addRecipients(openSuggestions.filter((s) => !contactedSet.has(lower(s.email))).map((s) => s.email).join(","))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Add all new
            </button>
          )}
        </div>
      )}

      {/* Subject */}
      <label className="text-sm font-medium block mt-4 mb-1 text-gray-700 dark:text-gray-300">Subject</label>
      <input
        className={inputCls}
        value={subject}
        onChange={(e) => {
          touched.current.subject = true;
          setSubject(e.target.value);
        }}
        maxLength={300}
        aria-label="Subject"
      />

      {/* Body */}
      <label className="text-sm font-medium block mt-4 mb-1 text-gray-700 dark:text-gray-300">Message</label>
      <textarea
        className={`${inputCls} h-64 font-sans leading-relaxed`}
        value={body}
        onChange={(e) => {
          touched.current.body = true;
          setBody(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
        }}
        placeholder={
          generated.body
            ? ""
            : "Write your quote request here, or finish the chat in the Chat tab to have one generated for you."
        }
        aria-label="Email body"
      />

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeLink}
          onChange={(e) => setIncludeLink(e.target.checked)}
          className="accent-blue-600"
        />
        <Link2 size={14} /> Include a link so suppliers can submit their quote through a form
      </label>

      {result && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm flex gap-2 ${
            result.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
          role="status"
        >
          {result.type === "success" ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <span>{result.text}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition ${
            canSend ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Send size={16} />
          {sending
            ? "Sending…"
            : finalRecipients.length > 1
              ? `Send to ${finalRecipients.length} suppliers`
              : "Send"}
        </button>
        <button
          type="button"
          onClick={copyAll}
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
