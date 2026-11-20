export const TABS = [
  { id: "chat", label: "💬 Chat", description: "Create quote request" },
  { id: "inbox", label: "📥 Inbox", description: "Send & manage replies" },
  { id: "analyze", label: "🔍 Analyze", description: "Add a quote manually" },
  { id: "compare", label: "📊 Compare", description: "Compare all quotes" },
];

export default function BriefingTabs({ active, onChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[57px] sm:top-[69px] z-10">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`px-5 py-3 font-medium transition-all border-b-4 whitespace-nowrap ${
                active === tab.id
                  ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <div className="text-base">{tab.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tab.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
