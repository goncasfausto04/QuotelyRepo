import { useState } from "react";
import { Reply, Send } from "lucide-react";

export default function ReplyBox({ thread, onReply }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await onReply(thread, text.trim());
      setText("");
    } catch (err) {
      setError(err.message || "Reply failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
        <Reply size={14} /> Reply to {thread.counterpart.name}
        {!thread.latestSupplier && <span className="text-xs text-gray-500 font-normal">(follow-up)</span>}
      </label>
      <textarea
        className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && send()}
        placeholder={thread.latestSupplier ? "Ask a follow-up question, negotiate, or confirm the order…" : "No reply yet. Send a friendly reminder…"}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          <Send size={14} /> {sending ? "Sending…" : "Send reply"}
        </button>
        <span className="text-xs text-gray-400 hidden sm:inline">Ctrl+Enter to send</span>
      </div>
    </div>
  );
}
