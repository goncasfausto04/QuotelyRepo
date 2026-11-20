// Briefing chat: interview -> generated email -> supplier search.

import { useEffect, useRef } from "react";
import { RotateCcw, CheckCheck } from "lucide-react";
import useBriefingChat from "./useBriefingChat.js";
import ChatMessage from "./ChatMessage.js";
import ChatInput from "./ChatInput.js";
import TypingIndicator from "./TypingIndicator.js";
import RequirementsCard from "./RequirementsCard.js";
import ProfileHint from "./ProfileHint.js";

export default function BriefingChat({ briefingId, onGoToInbox }) {
  const chat = useBriefingChat(briefingId);
  const scrollRef = useRef(null);
  const visible = chat.messages.filter((m) => m.role !== "SupplierResults");
  const lastEmailIndex = visible.map((m) => m.role).lastIndexOf("Email");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.busy]);

  const startOver = () => {
    if (window.confirm("Start over? The current conversation and email will be cleared.")) chat.reset();
  };

  if (!chat.loaded) {
    return <div className="h-64 flex items-center justify-center text-sm text-gray-500">Loading conversation…</div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quote request assistant</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {chat.phase === "done"
              ? "Your email is ready. Ask for changes below, or find suppliers to send it to."
              : "Answer a few quick questions and I'll write a professional quote request."}
          </p>
        </div>
        {chat.phase !== "new" && (
          <button onClick={startOver} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 shrink-0">
            <RotateCcw size={14} /> Start over
          </button>
        )}
      </div>

      <ProfileHint />
      {chat.phase === "interview" && <RequirementsCard spec={chat.spec} />}

      <div ref={scrollRef} className="mb-3 h-[22rem] sm:h-[28rem] overflow-y-auto rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
        {visible.map((m, i) => (
          <ChatMessage
            key={i}
            message={m}
            isLatestEmail={i === lastEmailIndex}
            emailActions={{ onFind: () => onGoToInbox("suppliers"), onSend: () => onGoToInbox("conversations"), onRegenerate: () => chat.writeEmail(), busy: !!chat.busy }}
          />
        ))}
        <TypingIndicator kind={chat.busy} />
        {chat.retry && !chat.busy && (
          <button onClick={chat.retry} className="ml-1 mt-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Try again
          </button>
        )}
      </div>

      <ChatInput phase={chat.phase} disabled={!!chat.busy} onSend={chat.send} />

      {chat.phase === "interview" && !chat.busy && (
        <button onClick={chat.finishNow} className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
          <CheckCheck size={14} /> That's all, write the email
        </button>
      )}

    </div>
  );
}
