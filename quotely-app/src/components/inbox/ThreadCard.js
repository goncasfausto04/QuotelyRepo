// A supplier conversation: collapsed summary, expandable to messages + reply.

import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { splitQuoted, timeAgo } from "./emailUtils.js";
import StatusBadge from "./StatusBadge.js";
import MessageItem from "./MessageItem.js";
import ReplyBox from "./ReplyBox.js";

export default function ThreadCard({ thread: t, open, onToggle, inbox }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden ${
        t.state === "pending" ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <button type="button" className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition" onClick={onToggle} aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-gray-900 dark:text-white truncate ${t.state === "pending" ? "font-bold" : "font-medium"}`}>
                {t.counterpart.name || "Unknown"}
              </span>
              {t.counterpart.name !== t.counterpart.address && <span className="text-xs text-gray-500 truncate">{t.counterpart.address}</span>}
              <StatusBadge kind={t.state} />
              {t.isTest && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300" title="Sent in test mode">
                  <FlaskConical size={12} /> test
                </span>
              )}
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
          {t.msgs.map((m) => (
            <MessageItem key={m.id} message={m} analyzingId={inbox.analyzingId} onApprove={inbox.approve} onStatus={inbox.updateStatus} />
          ))}
          <ReplyBox thread={t} onReply={inbox.reply} />
        </div>
      )}
    </div>
  );
}
