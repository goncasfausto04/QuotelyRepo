import { Check, X, Sparkles, Hourglass } from "lucide-react";

const BADGES = {
  approved: ["bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", Check, "Quote saved"],
  rejected: ["bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300", X, "Rejected"],
  pending: ["bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", Sparkles, "New reply"],
  awaiting: ["bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", Hourglass, "Awaiting reply"],
};

export default function StatusBadge({ kind }) {
  const [cls, Icon, label] = BADGES[kind] || BADGES.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}
