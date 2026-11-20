// One-click recipients from the chat's supplier search.

import { Plus, Users } from "lucide-react";
import { lower } from "./emailUtils.js";

export default function SupplierSuggestions({ suggestions, recipientSet, contactedSet, onAdd }) {
  const open = suggestions.filter((s) => s.email && !recipientSet.has(lower(s.email)));
  if (!open.length) return null;
  const fresh = open.filter((s) => !contactedSet.has(lower(s.email)));

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Users size={14} /> Found suppliers:
      </span>
      {open.map((s) => (
        <button
          key={s.email}
          type="button"
          onClick={() => onAdd([s.email])}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={s.email}
        >
          <Plus size={12} /> {s.name || s.email}
          {contactedSet.has(lower(s.email)) && <span className="text-amber-600">(emailed)</span>}
        </button>
      ))}
      {fresh.length > 1 && (
        <button type="button" onClick={() => onAdd(fresh.map((s) => s.email))} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Add all new
        </button>
      )}
    </div>
  );
}
