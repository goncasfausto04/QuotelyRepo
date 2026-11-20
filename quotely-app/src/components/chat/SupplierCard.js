import { Globe, Mail, Phone } from "lucide-react";

export default function SupplierCard({ supplier: s }) {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{s.name || "Unnamed supplier"}</div>
      {s.note && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.note}</div>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {s.contact_email ? (
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Mail size={12} /> {s.contact_email}
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">No email found, check the website</span>
        )}
        {s.phone && (
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Phone size={12} /> {s.phone}
          </span>
        )}
        {s.website && (
          <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
            <Globe size={12} /> Website
          </a>
        )}
      </div>
    </div>
  );
}
