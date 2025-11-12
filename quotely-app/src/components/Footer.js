export default function Footer() {
  const useCases = ["Placeholder text", "Placeholder text"];
  const explore = ["Placeholder text", "Placeholder text"];
  const resources = ["Placeholder text", "Placeholder text"];

  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
          {/* Logo and Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/whitelogo.jpg"
                alt="Quotely Logo"
                className="w-6 h-6 object-contain rounded-lg border border-gray-200"
              />
              <span className="text-xl font-bold">Quotely</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Turning briefings into smart decisions with AI-powered insights.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
              >
                𝕏
              </button>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
              >
                📷
              </button>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
              >
                ▶
              </button>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
              >
                in
              </button>
            </div>
          </div>

          {/* Use Cases Column */}
          <div>
            <h4 className="font-semibold mb-3">Use cases</h4>
            <ul className="space-y-2">
              {useCases.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="font-semibold mb-3">Explore</h4>
            <ul className="space-y-2">
              {explore.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-semibold mb-3">Resources</h4>
            <ul className="space-y-2">
              {resources.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Copyright */}
        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
          © 2025 Quotely. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
