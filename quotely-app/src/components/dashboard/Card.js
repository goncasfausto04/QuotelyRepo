// Section card with an icon title, used across the dashboard.
export default function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />} {title}
      </h2>
      {children}
    </div>
  );
}

export const Empty = ({ children }) => <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4 w-full">{children}</p>;
