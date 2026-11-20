// Recipient chips: type/paste addresses, Enter or comma to add.

import { X } from "lucide-react";
import { EMAIL_RE, lower } from "./emailUtils.js";

// Turns free text into { good: [...], bad: [...] }
export function parseRecipients(text) {
  const parts = String(text)
    .split(/[\s,;]+/)
    .map((p) => p.replace(/^.*<([^>]+)>.*$/, "$1").trim())
    .filter(Boolean);
  return { good: parts.filter((p) => EMAIL_RE.test(p)), bad: parts.filter((p) => !EMAIL_RE.test(p)) };
}

export default function RecipientInput({ recipients, draft, setDraft, onAdd, onRemove, contactedSet, onInvalid }) {
  const commit = (text) => {
    const { good, bad } = parseRecipients(text);
    if (good.length) onAdd(good);
    setDraft(bad.join(", "));
    onInvalid(bad);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500"
      onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
    >
      {recipients.map((r) => {
        const again = contactedSet.has(lower(r));
        return (
          <span
            key={r}
            className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${
              again ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200" : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
            }`}
            title={again ? "Already emailed for this briefing" : undefined}
          >
            {r}
            <button type="button" onClick={() => onRemove(r)} aria-label={`Remove ${r}`}>
              <X size={14} />
            </button>
          </span>
        );
      })}
      <input
        className="flex-1 min-w-[180px] p-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (["Enter", ",", ";", "Tab"].includes(e.key) && draft.trim()) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && recipients.length) {
            onRemove(recipients[recipients.length - 1]);
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[\s,;]/.test(text.trim())) {
            e.preventDefault();
            commit(`${draft} ${text}`);
          }
        }}
        placeholder={recipients.length ? "Add another…" : "supplier@example.com (press Enter to add)"}
        aria-label="Recipient email"
      />
    </div>
  );
}
