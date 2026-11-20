import { Clock, DollarSign, Crown, Trophy, Zap, Star } from "lucide-react";
import { money } from "./scoring.js";

const THEMES = {
  green: ["from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800", "text-emerald-600 dark:text-emerald-400", "from-emerald-500 to-green-600"],
  purple: ["from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800", "text-purple-600 dark:text-purple-400", "from-purple-500 to-indigo-600"],
  sky: ["from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 border-sky-200 dark:border-sky-800", "text-sky-600 dark:text-sky-400", "from-sky-500 to-blue-600"],
};

function SummaryCard({ theme, icon: Icon, badge: Badge, label, value, sub, hint }) {
  const [box, accent, badgeBg] = THEMES[theme];
  return (
    <div className={`bg-gradient-to-br rounded-2xl p-6 border shadow ${box}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wide ${accent}`}>
            <Icon size={20} /> {label}
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 truncate">{value}</p>
          <p className={`font-semibold text-sm truncate ${accent}`}>{sub}</p>
          {hint && <p className={`text-xs mt-2 ${accent}`}>{hint}</p>}
        </div>
        <div className={`bg-gradient-to-br rounded-2xl p-4 shadow ${badgeBg}`}>
          <Badge className="text-white" size={32} />
        </div>
      </div>
    </div>
  );
}

const speed = (d) => (d < 7 ? "under a week" : d < 30 ? "under a month" : "over a month");

export default function SummaryCards({ best, fastest, average, topRanked, hasWeights }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard
        theme="green"
        icon={DollarSign}
        badge={Trophy}
        label="Best price"
        value={best ? money(best.value, best.currency) : "—"}
        sub={best?.supplier || "No data available"}
        hint={best && average > best.value ? `${((1 - best.value / average) * 100).toFixed(1)}% below average` : null}
      />
      <SummaryCard
        theme="purple"
        icon={Crown}
        badge={Star}
        label={hasWeights ? "Best match" : "Smart ranking"}
        value={hasWeights && topRanked ? `${Math.round(topRanked.score)}%` : "—"}
        sub={hasWeights && topRanked ? topRanked.supplier_name || "Unknown" : "Set priorities for smart ranking"}
        hint={hasWeights ? "Matches your priorities" : null}
      />
      <SummaryCard
        theme="sky"
        icon={Clock}
        badge={Zap}
        label="Fastest delivery"
        value={fastest ? `${fastest.value} days` : "—"}
        sub={fastest?.supplier || "No data available"}
        hint={fastest ? `Ready in ${speed(fastest.value)}` : null}
      />
    </div>
  );
}
