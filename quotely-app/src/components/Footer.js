export default function Footer() {
  const useCases = [
    "Placeholder text",
    "Placeholder text",
  ];
  const explore = [
    "Placeholder text",
    "Placeholder text",
  ];
  const resources = [
    "Placeholder text",
    "Placeholder text",
  ];

  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-12 mb-8">
          <div>
            <div className="text-xl font-bold mb-4">Quotely</div>
            <div className="flex gap-4">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                𝕏
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                📷
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                ▶
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                in
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Use cases</h3>
            <ul className="space-y-2">
              {useCases.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Explore</h3>
            <ul className="space-y-2">
              {explore.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {resources.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
