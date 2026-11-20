const fmtUptime = (s) => (s > 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m`);

export default function StatsCard({ stats, uptime }) {
  const items = [
    ["Users", stats?.users],
    ["Briefings", stats?.briefings],
    ["Quotes", stats?.quotes],
    ["Server uptime", uptime != null ? fmtUptime(uptime) : null],
  ];
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="card p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1 num">{value ?? "–"}</div>
        </div>
      ))}
    </section>
  );
}
