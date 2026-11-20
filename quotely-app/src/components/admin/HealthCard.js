import { CheckCircle2, XCircle } from "lucide-react";

const ROWS = [
  ["db", "Database (Supabase)", (h) => (h.ok ? `${h.latencyMs} ms` : h.error)],
  ["email", "Gmail", (h) => (h.ok ? h.sender : h.error)],
  ["ai", "AI (Gemini)", (h) => (h.ok ? h.model : "GEMINI_API_KEY missing")],
  ["search", "Supplier search", (h) => (h.ok ? h.detail : "Needs GEMINI_API_KEY")],
];

export default function HealthCard({ health }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-3">System health</h2>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {ROWS.map(([key, label, detail]) => {
          const h = health?.[key] || { ok: false };
          return (
            <li key={key} className="py-2.5 flex items-start gap-3">
              {h.ok ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{detail(h) || ""}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
