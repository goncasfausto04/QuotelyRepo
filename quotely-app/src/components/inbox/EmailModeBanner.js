// Shows whether emails really go out (live) or are simulated (test).

import { FlaskConical, AlertCircle } from "lucide-react";

export default function EmailModeBanner({ status }) {
  if (!status) return null;
  if (!status.ok) {
    return (
      <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200 flex gap-2">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <span>Email sending is not working right now: {status.error}</span>
      </div>
    );
  }
  if (status.mode !== "test") return null;
  return (
    <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-sm text-purple-900 dark:text-purple-100 flex gap-2">
      <FlaskConical size={18} className="shrink-0 mt-0.5" />
      <span>
        <b>Test mode:</b> nothing reaches real suppliers. Emails go to {status.sender || "the Quotely inbox"} and an automatic
        reply with 999 values arrives a few seconds later.
      </span>
    </div>
  );
}
