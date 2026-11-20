const COLORS = {
  purple: "bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-100",
  green: "bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-green-900 dark:text-green-100",
  blue: "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100",
};

export default function TabIntro({ color = "blue", title, children }) {
  return (
    <div className={`border-l-4 rounded-r-lg p-4 mb-6 ${COLORS[color]}`}>
      <h3 className="font-semibold mb-1">{title}</h3>
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}
