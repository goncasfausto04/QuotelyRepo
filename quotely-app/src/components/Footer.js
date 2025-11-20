export default function Footer() {
  const useCases = ["Placeholder text", "Placeholder text"];
  const explore = ["Placeholder text", "Placeholder text"];
  const resources = ["Placeholder text", "Placeholder text"];

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-8 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
          {/* Logo and Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/whitelogo.jpg"
                alt="Quotely Logo"
                className="w-6 h-6 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Quotely
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Turning briefings into smart decisions with AI-powered insights.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                𝕏
              </button>
              <button
                type="button"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                📷
              </button>
              <button
                type="button"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ▶
              </button>
              <button
                type="button"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                in
              </button>
            </div>
          </div>

          {/* Use Cases Column */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Use cases
            </h4>
            <ul className="space-y-2">
              {useCases.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Explore
            </h4>
            <ul className="space-y-2">
              {explore.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Resources
            </h4>
            <ul className="space-y-2">
              {resources.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Copyright */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          © 2025 Quotely. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
