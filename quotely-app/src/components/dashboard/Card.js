// Section card with an icon title, used across the dashboard.
export default function Card({ icon: Icon, title, children }) {
  return (
    <div className="card p-5">
      <h2 className="section-title mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />} {title}
      </h2>
      {children}
    </div>
  );
}

export const Empty = ({ children }) => <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4 w-full">{children}</p>;
