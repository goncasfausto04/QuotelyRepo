// Toggle between TEST (simulated suppliers) and LIVE (real suppliers) email.

import { useState } from "react";
import { FlaskConical, Radio } from "lucide-react";
import Notice from "../ui/Notice.js";

const MODES = [
  {
    id: "test",
    icon: FlaskConical,
    title: "Test mode",
    text: "Emails go to the Quotely inbox instead of suppliers. A dummy supplier reply with 999 for every value arrives automatically a few seconds later.",
    active: "border-purple-500 bg-purple-50 dark:bg-purple-900/30",
  },
  {
    id: "live",
    icon: Radio,
    title: "Live mode",
    text: "Emails really go to the suppliers' addresses. Their real replies show up in each briefing's inbox.",
    active: "border-green-500 bg-green-50 dark:bg-green-900/30",
  },
];

export default function EmailModeCard({ mode, persisted, onChange }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const choose = async (id) => {
    if (id === mode || saving) return;
    if (id === "live" && !window.confirm("Switch to LIVE? Emails will be sent to real suppliers.")) return;
    setSaving(id);
    setError(null);
    try {
      await onChange(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white">Email sending</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Applies to every user, takes effect within ~15 seconds.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => choose(m.id)}
              disabled={!!saving}
              className={`text-left p-4 rounded-lg border-2 transition ${
                selected ? m.active : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
              }`}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <Icon size={18} /> {m.title}
                {selected && <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">ON</span>}
                {saving === m.id && <span className="ml-auto text-xs text-gray-500">Saving…</span>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{m.text}</p>
            </button>
          );
        })}
      </div>

      {!persisted && (
        <div className="mt-4">
          <Notice type="warning">
            Settings are only kept in memory and reset when the server restarts. Run <code>supabase/app_settings.sql</code> in the
            Supabase SQL editor to make them permanent. (Default comes from the <code>EMAIL_MODE</code> env var.)
          </Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice type="error">{error}</Notice>
        </div>
      )}
    </section>
  );
}
