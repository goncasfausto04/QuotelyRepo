import BriefingChat from "../components/BriefingChat.js";
import QuoteUpload from "../components/QuoteUpload.js";
import ComparisonDashboard from "../components/ComparisonDashboard.js";
import QuoteAnalysis from "../components/QuoteAnalysis.js";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          Your <span className="text-blue-500">Dashboard</span>
        </h1>
        <p className="text-gray-600 text-lg">
          Manage your briefings, quotes, and analysis in one place.
        </p>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto grid gap-8">
        {/* Briefing Chat */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            🧠 Briefing Chat
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Describe your needs and let AI help you create detailed quote
            requests.
          </p>
          <BriefingChat />
        </div>

        {/* Quote Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            📎 Upload Supplier Quotes
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Add supplier proposals in PDF, DOCX, or image format for comparison.
          </p>
          <QuoteUpload />
        </div>

        {/* Quote Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            🔍 Quote Analysis
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            AI will extract, summarize, and highlight key differences across
            quotes.
          </p>
          <QuoteAnalysis />
        </div>

        {/* Comparison Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            📊 Compare Quotes
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            View all proposals side-by-side and make data-driven decisions.
          </p>
          <ComparisonDashboard />
        </div>
      </div>
    </div>
  );
}
