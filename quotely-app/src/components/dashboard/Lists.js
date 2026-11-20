// Top suppliers, recent briefings, recent activity, quick actions.

import { Link } from "react-router-dom";
import { FileText, DollarSign, Users } from "lucide-react";
import { Empty } from "./Card.js";
import { relativeTime, money } from "./dashboardStats.js";

const RANK_COLORS = ["bg-yellow-500", "bg-gray-400", "bg-orange-600"];
const briefingHref = (id) => `/briefingpage?briefing=${id}`;

export function TopSuppliers({ suppliers }) {
  if (!suppliers.length) return <Empty>No supplier quotes yet</Empty>;
  return (
    <div className="space-y-3">
      {suppliers.map((s, i) => (
        <div key={s.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${RANK_COLORS[i] || "bg-blue-500"}`}>{i + 1}</div>
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
    <div className="space-y-3">
      {briefings.map((b) => (
        <Link key={b.id} to={briefingHref(b.id)} className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
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
            <div className={`p-2 rounded-lg ${isBriefing ? "bg-blue-100 dark:bg-blue-900 text-blue-600" : "bg-green-100 dark:bg-green-900 text-green-600"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{isBriefing ? "New briefing" : "Quote received"}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{a.title}</p>
              {!isBriefing && a.price != null && <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">{money(a.price, a.currency)}</p>}
              <p className="text-xs text-gray-500 mt-1">{relativeTime(a.created_at)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const ACTIONS = [
  ["/briefings/create-briefing", "Create new briefing", FileText, "bg-blue-600 hover:bg-blue-700 text-white"],
  ["/briefings", "View all briefings", FileText, "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"],
  ["/profile", "Edit profile", Users, "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"],
];

export function QuickActions() {
  return (
    <div className="space-y-3">
      {ACTIONS.map(([to, label, Icon, cls]) => (
        <Link key={to} to={to} className={`w-full font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${cls}`}>
          <Icon className="w-5 h-5" /> {label}
        </Link>
      ))}
    </div>
  );
}
