// Settings: appearance and a quick server status check.

import { useState } from "react";
import { Moon, Sun, CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext.js";
import { apiFetch, API_URL } from "../api.js";

function Section({ title, description, children }) {
  return (
    <section className="card p-5 sm:flex sm:items-start sm:justify-between gap-6">
      <div className="mb-3 sm:mb-0">
        <h2 className="section-title">{title}</h2>
        <p className="muted max-w-md">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [status, setStatus] = useState(null); // null | "checking" | { ok, text }

  const check = async () => {
    setStatus("checking");
    const started = Date.now();
    try {
      const res = await apiFetch("/health/db", { timeoutMs: 90000 });
      setStatus({ ok: true, text: `Server and database are up (${Date.now() - started} ms, database ${res.latencyMs} ms)` });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <h1 className="page-title mb-2">Settings</h1>

      <Section title="Appearance" description="Switch between the light and dark theme. Saved in this browser.">
        <button onClick={toggleTheme} className="btn-secondary">
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} {isDarkMode ? "Use light theme" : "Use dark theme"}
        </button>
      </Section>

      <Section
        title="Server status"
        description="The server runs on a free plan and may take up to a minute to wake up after a quiet period. Check whether it's reachable."
      >
        <button onClick={check} disabled={status === "checking"} className="btn-secondary">
          {status === "checking" ? "Checking…" : "Check now"}
        </button>
      </Section>

      {status && status !== "checking" && (
        <p className={`flex items-start gap-2 text-sm ${status.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {status.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <XCircle size={16} className="mt-0.5" />}
          <span>
            {status.text} <span className="text-gray-500">· {API_URL}</span>
          </span>
        </p>
      )}
    </div>
  );
}
