// Briefing inbox: one conversation per supplier (Gmail thread), with
// approve (AI analyse -> save quote) / reject, threaded replies, and the
// composer for new quote requests. Auto-refreshes while the tab is visible.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import {
  Mail,
  RefreshCw,
  Check,
  X,
  Reply,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
  Trash2,
  Hourglass,
  Sparkles,
  Plus,
} from "lucide-react";
import BriefingEmailComposer from "./BriefingEmailComposer.js";
import { apiFetch } from "../api.js";

// Columns of the quotes table we fill from an AI analysis (everything else stays in analysis_json)
const QUOTE_DB_FIELDS = [
  "supplier_name",
  "contact_email",
  "contact_phone",
  "total_price",
  "currency",
  "unit_price",
  "quantity",
  "lead_time_days",
  "delivery_date",
  "payment_terms",
  "warranty_period",
  "warranty_months",
  "shipping_cost",
  "notes",
];

const AUTO_REFRESH_MS = 60_000;

// "Acme Sales <sales@acme.com>" -> { name: "Acme Sales", address: "sales@acme.com" }
function parseAddress(value = "") {
  const m = String(value).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || m[2].trim(), address: m[2].trim() };
  const addr = String(value).split(",")[0].trim();
  return { name: addr, address: addr };
}

const cleanSubject = (s = "") => String(s).replace(/\s*\[Ref:\s*[0-9a-f]{8}\]/gi, "").trim() || "(No subject)";

// Split a reply into the new text and the quoted previous email
function splitQuoted(body = "") {
  const lines = String(body).split(/\r?\n/);
  const markers = [
    /^On .+wrote:\s*$/i,
    /^(Em|El|Le|Am) .+(escreveu|escribió|a écrit|schrieb)\s*:?\s*$/i,
    /^-{2,}\s*(Original Message|Mensagem original|Mensaje original)\s*-{2,}/i,
    /^From: .+/i,
    /^De: .+/i,
  ];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const quoteRun = line.startsWith(">") && (lines[i + 1] || "").trim().startsWith(">");
    if (quoteRun || markers.some((re) => re.test(line))) {
      const main = lines.slice(0, i).join("\n").trim();
      if (main) return { main, quoted: lines.slice(i).join("\n").trim() };
    }
  }
  return { main: String(body).trim(), quoted: "" };
}

function timeAgo(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

const STATUS_BADGE = {
  approved: { cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", icon: Check, label: "Quote saved" },
  rejected: { cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300", icon: X, label: "Rejected" },
  pending: { cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", icon: Sparkles, label: "New reply" },
  awaiting: { cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", icon: Hourglass, label: "Awaiting reply" },
};

function Badge({ kind }) {
  const b = STATUS_BADGE[kind] || STATUS_BADGE.pending;
  const Icon = b.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${b.cls}`}>
      <Icon size={12} /> {b.label}
    </span>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs review" },
  { id: "awaiting", label: "Awaiting reply" },
  { id: "approved", label: "Quotes saved" },
  { id: "rejected", label: "Rejected" },
];

export default function BriefingInbox({ briefingId, generatedEmail: generatedEmailProp }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expanded, setExpanded] = useState(null); // threadId
  const [showQuoted, setShowQuoted] = useState({}); // messageId -> bool
  const [replyText, setReplyText] = useState({}); // threadId -> text
  const [sendingReply, setSendingReply] = useState(null); // threadId
  const [analyzingId, setAnalyzingId] = useState(null);
  const [notice, setNotice] = useState(null); // { type, text }
  const [filter, setFilter] = useState("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [briefingInfo, setBriefingInfo] = useState({ title: "", generatedEmail: "", suppliers: [] });
  const inFlight = useRef(false);

  const flash = (type, text) => {
    setNotice({ type, text });
    if (type === "success") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 5000);
  };

  // ---------- Loading ----------
  const fetchEmails = useCallback(
    async ({ silent = false } = {}) => {
      if (!briefingId || inFlight.current) return;
      inFlight.current = true;
      if (!silent) setRefreshing(true);
      try {
        const [data, statusRes] = await Promise.all([
          apiFetch(`/api/briefings/${briefingId}/emails`),
          supabase.from("email_statuses").select("message_id, status, notes").eq("briefing_id", briefingId),
        ]);
        const statusMap = {};
        (statusRes.data || []).forEach((s) => (statusMap[s.message_id] = s));

        setEmails(
          (data.emails || [])
            .map((e) => ({ ...e, status: statusMap[e.id]?.status || "pending" }))
            .filter((e) => e.status !== "deleted"),
        );
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching emails:", err);
        if (!silent) setError(err.message || "Failed to load emails");
      } finally {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [briefingId],
  );

  // Briefing title, generated email and found suppliers (from the chat)
  const loadBriefingInfo = useCallback(async () => {
    if (!briefingId) return;
    const { data, error: err } = await supabase.from("briefings").select("title, chat").eq("id", briefingId).single();
    if (err || !data) return;
    const chat = Array.isArray(data.chat) ? data.chat : [];
    const emailMsg = [...chat].reverse().find((m) => m.role === "Email" && m.content);
    const supplierMsg = [...chat].reverse().find((m) => m.role === "SupplierResults" && m.content);
    let suppliers = [];
    try {
      suppliers = (JSON.parse(supplierMsg?.content || "[]") || [])
        .filter((s) => s?.contact_email)
        .map((s) => ({ name: s.name, email: String(s.contact_email).trim() }));
    } catch {
      /* ignore bad JSON */
    }
    setBriefingInfo({ title: data.title || "", generatedEmail: emailMsg?.content || "", suppliers });
  }, [briefingId]);

  useEffect(() => {
    fetchEmails();
    loadBriefingInfo();
    apiFetch("/api/email/status")
      .then(setEmailStatus)
      .catch(() => setEmailStatus(null));
  }, [fetchEmails, loadBriefingInfo]);

  // Auto refresh while the page is visible, and when coming back to the tab
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && fetchEmails({ silent: true });
    const id = setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fetchEmails]);

  // ---------- Derived: threads ----------
  const threads = useMemo(() => {
    const byThread = new Map();
    for (const e of emails) {
      const key = e.threadId || e.id;
      if (!byThread.has(key)) byThread.set(key, []);
      byThread.get(key).push(e);
    }
    return [...byThread.entries()]
      .map(([threadId, msgs]) => {
        msgs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const supplierMsgs = msgs.filter((m) => !m.fromMe);
        const firstOut = msgs.find((m) => m.fromMe);
        const counterpart = parseAddress(supplierMsgs[0]?.from || firstOut?.to || msgs[0].from || "");
        const latestSupplier = supplierMsgs[supplierMsgs.length - 1];
        const state = !latestSupplier
          ? "awaiting"
          : supplierMsgs.some((m) => m.status === "approved")
            ? "approved"
            : latestSupplier.status;
        const last = msgs[msgs.length - 1];
        return { threadId, msgs, counterpart, state, last, subject: cleanSubject(msgs[0].subject), latestSupplier };
      })
      .sort((a, b) => new Date(b.last.date || 0) - new Date(a.last.date || 0));
  }, [emails]);

  const counts = useMemo(() => {
    const c = { all: threads.length };
    threads.forEach((t) => (c[t.state] = (c[t.state] || 0) + 1));
    return c;
  }, [threads]);

  const visibleThreads = filter === "all" ? threads : threads.filter((t) => t.state === filter);
  const contacted = useMemo(() => threads.map((t) => t.counterpart.address).filter(Boolean), [threads]);
  const showComposer = composerOpen || (!loading && threads.length === 0);

  // ---------- Actions ----------
  const setStatus = async (messageId, status) => {
    const { error: upsertError } = await supabase.from("email_statuses").upsert(
      { briefing_id: briefingId, message_id: messageId, status, updated_at: new Date().toISOString() },
      { onConflict: "briefing_id,message_id" },
    );
    if (upsertError) throw upsertError;
    setEmails((prev) =>
      status === "deleted" ? prev.filter((e) => e.id !== messageId) : prev.map((e) => (e.id === messageId ? { ...e, status } : e)),
    );
  };

  const reject = async (email) => {
    try {
      await setStatus(email.id, email.status === "rejected" ? "pending" : "rejected");
    } catch (err) {
      flash("error", `Couldn't update status: ${err.message}`);
    }
  };

  const remove = async (email) => {
    if (!window.confirm("Hide this email from the inbox? (It stays in Gmail.)")) return;
    try {
      await setStatus(email.id, "deleted");
    } catch (err) {
      flash("error", `Delete failed: ${err.message}`);
    }
  };

  // approve -> AI analyse -> insert quote -> mark approved
  const approve = async (email) => {
    if (analyzingId || email.status === "approved") return;
    setAnalyzingId(email.id);
    try {
      const { data: existing } = await supabase
        .from("quotes")
        .select("id")
        .eq("briefing_id", briefingId)
        .eq("message_id", email.id)
        .limit(1);

      if (!existing?.length) {
        const data = await apiFetch("/api/analyze-email", {
          method: "POST",
          json: { emailText: email.body || email.snippet || "" },
          retry: true,
        });
        let analysis = data.analysis;
        if (typeof analysis === "string") {
          try {
            analysis = JSON.parse(analysis);
          } catch {
            /* handled below */
          }
        }
        if (!analysis || typeof analysis !== "object") throw new Error("Could not read the AI analysis");

        const row = {
          briefing_id: briefingId,
          raw_email_text: email.body,
          analysis_json: analysis,
          input_method: "email",
          submitted_by: "supplier",
          message_id: email.id,
        };
        for (const key of QUOTE_DB_FIELDS) if (analysis[key] !== undefined) row[key] = analysis[key];
        const sender = parseAddress(email.from);
        if (!row.contact_email && sender.address) row.contact_email = sender.address;
        if (!row.supplier_name && sender.name && sender.name !== sender.address) row.supplier_name = sender.name;

        const { error: insertErr } = await supabase.from("quotes").insert(row);
        if (insertErr) throw insertErr;
      }

      await setStatus(email.id, "approved");
      flash("success", "Quote analysed and saved. See it in the Compare tab.");
    } catch (err) {
      console.error("Approve+analyze error:", err);
      flash("error", `Couldn't analyse this email: ${err.message || err}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const sendReply = async (thread) => {
    const text = (replyText[thread.threadId] || "").trim();
    if (!text || sendingReply) return;
    const target = thread.latestSupplier || thread.last;
    setSendingReply(thread.threadId);
    try {
      await apiFetch("/api/send-email", {
        method: "POST",
        json: {
          briefingId,
          subject: target.subject || thread.subject,
          body: text,
          recipients: [thread.counterpart.address],
          isHtml: false,
          replyToMessageId: target.id,
        },
      });
      setReplyText((r) => ({ ...r, [thread.threadId]: "" }));
      flash("success", `Reply sent to ${thread.counterpart.name}`);
      fetchEmails({ silent: true });
    } catch (err) {
      flash("error", `Reply failed: ${err.message}`);
    } finally {
      setSendingReply(null);
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-500"></div>
        Loading inbox…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={20} /> Supplier conversations
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {threads.length} conversation{threads.length !== 1 ? "s" : ""}
              {counts.pending ? ` · ${counts.pending} need${counts.pending === 1 ? "s" : ""} review` : ""}
              {lastUpdated ? ` · updated ${timeAgo(lastUpdated)}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setComposerOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
            >
              <Plus size={18} /> New request
            </button>
            <button
              onClick={() => fetchEmails()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
              title="Refresh (also refreshes automatically every minute)"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {threads.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {FILTERS.filter((f) => f.id === "all" || counts[f.id]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filter === f.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {f.label} ({counts[f.id] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${
            notice.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          {notice.type === "success" ? <Check size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-100">Couldn't load emails</h3>
            <p className="text-red-700 dark:text-red-200 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => fetchEmails()}
            className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {showComposer && (
        <BriefingEmailComposer
          briefingId={briefingId}
          briefingTitle={briefingInfo.title}
          generatedEmail={briefingInfo.generatedEmail || generatedEmailProp || ""}
          suggestions={briefingInfo.suppliers}
          contacted={contacted}
          emailStatus={emailStatus}
          onSent={() => {
            fetchEmails({ silent: true });
            setFilter("all");
          }}
        />
      )}

      {/* Conversations */}
      {!error && threads.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Mail className="mx-auto text-gray-400 dark:text-gray-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No conversations yet</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Send a quote request above. Supplier replies will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleThreads.map((t) => {
            const open = expanded === t.threadId;
            return (
              <div
                key={t.threadId}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden ${
                  t.state === "pending" ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  onClick={() => setExpanded(open ? null : t.threadId)}
                  aria-expanded={open}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-gray-900 dark:text-white truncate ${t.state === "pending" ? "font-bold" : "font-medium"}`}>
                          {t.counterpart.name || "Unknown"}
                        </span>
                        {t.counterpart.name !== t.counterpart.address && (
                          <span className="text-xs text-gray-500 truncate">{t.counterpart.address}</span>
                        )}
                        <Badge kind={t.state} />
                        <span className="text-xs text-gray-400">
                          {t.msgs.length} message{t.msgs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 truncate">{t.subject}</p>
                      {!open && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {t.last.fromMe ? "You: " : ""}
                          {t.last.snippet || splitQuoted(t.last.body).main.slice(0, 150)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400" title={new Date(t.last.date).toLocaleString()}>
                        {timeAgo(t.last.date)}
                      </span>
                      {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {t.msgs.map((m) => {
                      const { main, quoted } = splitQuoted(m.body || m.snippet || "");
                      return (
                        <div
                          key={m.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-700/60 ${
                            m.fromMe ? "bg-gray-50 dark:bg-gray-900/40" : "bg-white dark:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              {m.fromMe ? (
                                <span className="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                                  <Send size={14} /> You
                                </span>
                              ) : (
                                <span className="font-medium text-gray-900 dark:text-white truncate">{parseAddress(m.from).name}</span>
                              )}
                              {!m.fromMe && m.status !== "pending" && <Badge kind={m.status} />}
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                              <Clock size={12} /> {m.date ? new Date(m.date).toLocaleString() : ""}
                            </span>
                          </div>

                          <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 font-sans">
                            {main || "No content"}
                          </pre>
                          {quoted && (
                            <>
                              <button
                                onClick={() => setShowQuoted((s) => ({ ...s, [m.id]: !s[m.id] }))}
                                className="mt-2 text-xs text-gray-500 hover:text-blue-600"
                              >
                                {showQuoted[m.id] ? "Hide quoted text" : "··· Show quoted text"}
                              </button>
                              {showQuoted[m.id] && (
                                <pre className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-wrap break-words text-xs text-gray-500 dark:text-gray-400 font-sans">
                                  {quoted}
                                </pre>
                              )}
                            </>
                          )}

                          {!m.fromMe && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                disabled={analyzingId !== null || m.status === "approved"}
                                onClick={() => approve(m)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                  m.status === "approved"
                                    ? "bg-green-600 text-white cursor-default"
                                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-60"
                                }`}
                                title="AI extracts price, lead time etc. and saves it for comparison"
                              >
                                {analyzingId === m.id ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                {m.status === "approved" ? "Quote saved" : analyzingId === m.id ? "Analysing…" : "Approve & save quote"}
                              </button>
                              {m.status !== "approved" && (
                                <button
                                  onClick={() => reject(m)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                    m.status === "rejected"
                                      ? "bg-red-600 text-white"
                                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                                  }`}
                                >
                                  <X size={14} /> {m.status === "rejected" ? "Rejected (undo)" : "Reject"}
                                </button>
                              )}
                              {m.status === "rejected" && (
                                <button
                                  onClick={() => remove(m)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  <Trash2 size={14} /> Hide
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Reply */}
                    <div className="p-4 bg-white dark:bg-gray-800">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Reply size={14} /> Reply to {t.counterpart.name}
                        {!t.latestSupplier && <span className="text-xs text-gray-500 font-normal">(follow-up)</span>}
                      </label>
                      <textarea
                        className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={replyText[t.threadId] || ""}
                        onChange={(e) => setReplyText((r) => ({ ...r, [t.threadId]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(t);
                        }}
                        placeholder={
                          t.latestSupplier
                            ? "Ask a follow-up question, negotiate, or confirm the order…"
                            : "No reply yet. Send a friendly reminder…"
                        }
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => sendReply(t)}
                          disabled={sendingReply !== null || !(replyText[t.threadId] || "").trim()}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                          {sendingReply === t.threadId ? "Sending…" : "Send reply"}
                        </button>
                        <span className="text-xs text-gray-400 hidden sm:inline">Ctrl+Enter to send</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {visibleThreads.length === 0 && threads.length > 0 && (
            <p className="text-sm text-center text-gray-500 py-6">Nothing in this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
