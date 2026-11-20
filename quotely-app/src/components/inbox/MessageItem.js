// One message inside a supplier conversation, with approve / reject actions.

import { useState } from "react";
import { Check, X, Clock, Send, Trash2, RefreshCw, FlaskConical } from "lucide-react";
import { parseAddress, splitQuoted } from "./emailUtils.js";
import StatusBadge from "./StatusBadge.js";

const btn = "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60";

export default function MessageItem({ message: m, analyzingId, onApprove, onStatus }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const { main, quoted } = splitQuoted(m.body || m.snippet || "");
  const analyzing = analyzingId === m.id;

  return (
    <div className={`p-4 border-b border-gray-100 dark:border-gray-700/60 ${m.fromMe ? "bg-gray-50 dark:bg-gray-900/40" : "bg-white dark:bg-gray-800"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {m.fromMe ? (
            <span className="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
              <Send size={14} /> You
            </span>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white truncate">{parseAddress(m.from).name}</span>
          )}
          {m.isDummy && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200">
              <FlaskConical size={12} /> Test reply
            </span>
          )}
          {!m.fromMe && m.status !== "pending" && <StatusBadge kind={m.status} />}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
          <Clock size={12} /> {m.date ? new Date(m.date).toLocaleString() : ""}
        </span>
      </div>

      <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 font-sans">{main || "No content"}</pre>
      {quoted && (
        <>
          <button onClick={() => setShowQuoted((s) => !s)} className="mt-2 text-xs text-gray-500 hover:text-blue-600">
            {showQuoted ? "Hide quoted text" : "··· Show quoted text"}
          </button>
          {showQuoted && (
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
            onClick={() => onApprove(m)}
            className={`${btn} ${
              m.status === "approved"
                ? "bg-green-600 text-white disabled:opacity-100 cursor-default"
                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
            }`}
            title="AI extracts price, lead time etc. and saves it for comparison"
          >
            {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {m.status === "approved" ? "Quote saved" : analyzing ? "Analysing…" : "Approve & save quote"}
          </button>
          {m.status !== "approved" && (
            <button
              onClick={() => onStatus(m, m.status === "rejected" ? "pending" : "rejected")}
              className={`${btn} ${
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
              onClick={() => window.confirm("Hide this email from the inbox? (It stays in Gmail.)") && onStatus(m, "deleted")}
              className={`${btn} bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`}
            >
              <Trash2 size={14} /> Hide
            </button>
          )}
        </div>
      )}
    </div>
  );
}
