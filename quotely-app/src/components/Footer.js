export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <span>© {new Date().getFullYear()} Quotely</span>
        <a href="/privacy.html" className="hover:text-gray-900 dark:hover:text-gray-200">
          Privacy
        </a>
      </div>
    </footer>
  );
}
