const COLORS = {
  blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
  green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
};

export default function StatCard({ label, value, unit, icon: Icon, color, footer }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 truncate">
            {value}
            {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${COLORS[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {footer && <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 truncate">{footer}</div>}
    </div>
  );
}
