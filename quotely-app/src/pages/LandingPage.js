import { Link } from "react-router-dom";
import { ArrowRight, FileText, DollarSign, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user from Supabase Auth
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-6xl font-bold mb-6">
            Simplify Your Quote{" "}
            <span className="text-blue-500">Management</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Create briefings, collect quotes, and compare proposals all in one
            place. Make better decisions faster.
          </p>

          <div className="flex gap-4 justify-center">
            {user ? (
              // Logged in: Show Create Briefing button
              <Link
                to="/dashboard"
                className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition flex items-center gap-2 font-medium"
              >
                Create Briefing <ArrowRight size={20} />
              </Link>
            ) : (
              // Not logged in: Show Start Free Trial and Sign In
              <>
                <Link
                  to="/dashboard"
                  className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition flex items-center gap-2 font-medium"
                >
                  Start Free Trial <ArrowRight size={20} />
                </Link>
                <Link
                  to="/auth"
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition font-medium"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Briefings</h3>
              <p className="text-gray-600 text-sm">
                Define your project requirements and share them with vendors
                instantly.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Collect Quotes</h3>
              <p className="text-gray-600 text-sm">
                Receive and organize quotes from multiple vendors in one central
                location.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Compare & Decide</h3>
              <p className="text-gray-600 text-sm">
                Analyze proposals side-by-side and make informed decisions
                quickly.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
