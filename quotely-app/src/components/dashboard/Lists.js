// Top suppliers, recent briefings, recent activity, quick actions.

import { Link } from "react-router-dom";
import { FileText, DollarSign, Users } from "lucide-react";
import { Empty } from "./Card.js";
import { relativeTime, money } from "./dashboardStats.js";

const briefingHref = (id) => `/briefingpage?briefing=${id}`;

export function TopSuppliers({ suppliers }) {
  if (!suppliers.length) return <Empty>No supplier quotes yet</Empty>;
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {suppliers.map((s, i) => (
        <div key={s.name} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-5 text-sm text-gray-400 num">{i + 1}</span>
            <span className="font-medium text-gray-900 dark:text-white truncate">{s.name}</span>
          </div>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {s.count} {s.count === 1 ? "quote" : "quotes"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RecentBriefings({ briefings }) {
  if (!briefings.length) {
    return (
      <Empty>
        No briefings yet.{" "}
        <Link to="/briefings/create-briefing" className="text-blue-600 dark:text-blue-400 hover:underline">
          Create your first briefing
        </Link>
      </Empty>
    );
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {briefings.map((b) => (
        <Link key={b.id} to={briefingHref(b.id)} className="block py-2.5 hover:text-blue-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{b.title || "Untitled Briefing"}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Created {new Date(b.created_at).toLocaleDateString()}</p>
        </Link>
      ))}
    </div>
  );
}

export function RecentActivity({ items }) {
  if (!items.length) return <Empty>No recent activity</Empty>;
  return (
    <div className="space-y-4">
      {items.map((a, i) => {
        const isBriefing = a.type === "briefing";
        const Icon = isBriefing ? FileText : DollarSign;
        return (
          <Link key={i} to={briefingHref(a.id)} className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{isBriefing ? "New briefing" : "Quote received"}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{a.title}</p>
              {!isBriefing && a.price != null && <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 num">{money(a.price, a.currency)}</p>}
              <p className="text-xs text-gray-500 mt-1">{relativeTime(a.created_at)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const ACTIONS = [
  ["/briefings/create-briefing", "New request", FileText, "btn-primary"],
  ["/briefings", "All briefings", FileText, "btn-secondary"],
  ["/profile", "Edit profile", Users, "btn-secondary"],
];

export function QuickActions() {
  return (
    <div className="space-y-2">
      {ACTIONS.map(([to, label, Icon, cls]) => (
        <Link key={to} to={to} className={`${cls} w-full`}>
          <Icon className="w-5 h-5" /> {label}
        </Link>
      ))}
    </div>
  );
}
