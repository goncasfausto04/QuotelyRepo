export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-6 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/whitelogo.jpg"
              alt="Quotely Logo"
              className="w-6 h-6 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Quotely
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 Quotely. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
