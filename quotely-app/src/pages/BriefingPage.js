import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import BriefingChat from "../components/BriefingChat.js";
import ComparisonDashboard from "../components/ComparisonDashboard.js";
import QuoteAnalysis from "../components/QuoteAnalysis.js";

export default function BriefingPage() {
  // Get briefingId from URL params (you'll need to pass this as a prop or use your router)
  const briefingId = new URLSearchParams(window.location.search).get(
    "briefing"
  );

  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat"); // chat, analyze, compare

  useEffect(() => {
    async function fetchBriefing() {
      if (!briefingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("id", briefingId)
        .single();

      if (error) {
        console.error("Error fetching briefing:", error);
      } else {
        setBriefing(data);
      }
      setLoading(false);
    }

    fetchBriefing();
  }, [briefingId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading briefing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!briefingId || !briefing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Briefing Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The briefing you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => (window.location.href = "/briefings")}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            ← Back to Briefings
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "chat", label: "💬 Chat", description: "Create quote request" },
    { id: "analyze", label: "🔍 Analyze", description: "Extract quote data" },
    { id: "compare", label: "📊 Compare", description: "Compare all quotes" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => (window.location.href = "/briefings")}
              className="text-gray-600 hover:text-gray-900 transition flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
              Active
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {briefing.title || "Untitled Briefing"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ID: {briefingId.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition-all border-b-3 ${
                    isActive
                      ? "text-blue-600 border-b-4 border-blue-600 bg-blue-50"
                      : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-base">{tab.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div>
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-1">
                How it works:
              </h3>
              <p className="text-sm text-blue-800">
                1. Tell the AI what you need
                <br />
                2. Answer a few quick questions
                <br />
                3. Get a professional quote request email to send to suppliers
              </p>
            </div>
            <BriefingChat briefingId={briefing.id} />
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === "analyze" && (
          <div>
            <div className="bg-purple-50 border-l-4 border-purple-400 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-900 mb-1">
                How it works:
              </h3>
              <p className="text-sm text-purple-800">
                1. Paste the complete supplier quote email
                <br />
                2. AI extracts pricing, timelines, and specifications
                <br />
                3. Data is saved automatically for comparison
              </p>
            </div>
            <QuoteAnalysis briefingId={briefing.id} />
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === "compare" && (
          <div>
            <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 mb-1">
                Compare all quotes:
              </h3>
              <p className="text-sm text-green-800">
                View all analyzed quotes side-by-side. Best prices and fastest
                delivery times are highlighted in green.
              </p>
            </div>
            <ComparisonDashboard briefingId={briefing.id} />
          </div>
        )}
      </div>
    </div>
  );
}
