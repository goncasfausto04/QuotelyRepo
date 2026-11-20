import { MessageSquare, Inbox, FilePlus, Scale } from "lucide-react";

export const TABS = [
  { id: "chat", label: "Request", icon: MessageSquare },
  { id: "inbox", label: "Suppliers & inbox", icon: Inbox },
  { id: "analyze", label: "Add a quote", icon: FilePlus },
  { id: "compare", label: "Compare", icon: Scale },
];

export default function BriefingTabs({ active, onChange }) {
  return (
    <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active === id
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
