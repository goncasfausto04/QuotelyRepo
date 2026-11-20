// Sub-tabs of the inbox: conversations vs finding suppliers.
import { Mail, MapPin } from "lucide-react";

export const VIEWS = [
  ["conversations", "Conversations", Mail],
  ["suppliers", "Find suppliers", MapPin],
];

export default function InboxViews({ active, onChange, pending }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-full sm:w-fit">
      {VIEWS.map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            active === id ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
          }`}
        >
          <Icon size={16} /> {label}
          {id === "conversations" && pending > 0 && <span className="px-1.5 rounded-full bg-blue-600 text-white text-xs">{pending}</span>}
        </button>
      ))}
    </div>
  );
}
