// The generated RFQ email shown in the chat, with copy / regenerate / send.

import { useState } from "react";
import { Copy, Check, RotateCcw, Send } from "lucide-react";

export default function EmailCard({ text, faded, actions }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div
      className={`my-3 rounded-xl border bg-white dark:bg-gray-800 border-green-300 dark:border-green-700 shadow-sm ${
        faded ? "opacity-50" : ""
      }`}
    >
      <div className="px-4 py-2 border-b border-green-200 dark:border-green-800 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
        {faded ? "Previous version" : "Your quote request email"}
      </div>
      <pre className="px-4 py-3 whitespace-pre-wrap break-words font-sans text-sm text-gray-900 dark:text-gray-100">{text}</pre>
      {actions && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
          <button
            onClick={actions.onSend}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
          >
            <Send size={14} /> Send to suppliers
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={actions.onRegenerate}
            disabled={actions.busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <RotateCcw size={14} /> Rewrite
          </button>
        </div>
      )}
    </div>
  );
}
