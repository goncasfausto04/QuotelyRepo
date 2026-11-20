// Loading and not-found screens for the briefing page.

export function BriefingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading briefing...</p>
      </div>
    </div>
  );
}

export function BriefingNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Briefing not found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">It doesn't exist or has been deleted.</p>
        <a href="/briefings" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          ← Back to Briefings
        </a>
      </div>
    </div>
  );
}
