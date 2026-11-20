// Inline success / error / info message.

import { Check, AlertCircle, Info, X } from "lucide-react";

const STYLES = {
  success: ["bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800", Check],
  error: ["bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800", AlertCircle],
  info: ["bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800", Info],
  warning: ["bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800", AlertCircle],
};

export default function Notice({ type = "info", children, onClose, action }) {
  const [cls, Icon] = STYLES[type] || STYLES.info;
  return (
    <div role="status" className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${cls}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {action}
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
