import { Globe, Mail, Phone, MapPin, Check } from "lucide-react";

export default function SupplierItem({ supplier: s, selected, focused, contacted, onToggle, onFocus }) {
  const canSend = !!s.contact_email;
  return (
    <div
      onClick={onFocus}
      className={`p-3 rounded-lg border cursor-pointer transition ${
        focused ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" : "border-gray-200 dark:border-gray-700"
      } ${selected ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-800"}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          disabled={!canSend}
          className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center ${
            selected ? "bg-green-600 border-green-600 text-white" : "border-gray-300 dark:border-gray-500"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label={selected ? `Remove ${s.name}` : `Add ${s.name}`}
          title={canSend ? undefined : "No email address found"}
        >
          {selected && <Check size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{s.name}</span>
            {contacted && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">already emailed</span>}
          </div>
          {s.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.note}</p>}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
            {canSend ? (
              <span className="flex items-center gap-1">
                <Mail size={12} /> {s.contact_email}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">No email found</span>
            )}
            {s.phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {s.phone}
              </span>
            )}
            {(s.address || s.city) && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {s.address || s.city}
              </span>
            )}
            {s.website && (
              <a href={s.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                <Globe size={12} /> Website
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
