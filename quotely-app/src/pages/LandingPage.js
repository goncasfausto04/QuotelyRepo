import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Zap,
  Sparkles,
  BarChart3,
  PlayCircle,
} from "lucide-react";

export default function LandingPage() {
  // Optional: set REACT_APP_PROMO_VIDEO_URL in .env or place promo.mp4 in /public
  const promoUrl = "/landingvideo.mp4";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <main className="flex-1">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full px-4 py-2 mb-8">
            <Sparkles className="text-blue-600 dark:text-blue-400" size={16} />
            <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              AI-Powered Quote Analysis
            </span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
            Compare Supplier Quotes
            <br />
            <span className="text-blue-600 dark:text-blue-400">
              Make Smarter Decisions
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Analyze supplier quotes with AI, compare pricing and terms, and find
            the best value for your business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/briefings"
              className="w-full sm:w-auto bg-blue-600 dark:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition flex items-center gap-2 font-semibold text-lg justify-center"
            >
              Get Started <ArrowRight size={20} />
            </Link>
          </div>

          {/* Promo video (use REACT_APP_PROMO_VIDEO_URL or /promo.mp4 in public) */}
          <div className="max-w-4xl mx-auto mb-16">
            {promoUrl ? (
              <div className="relative aspect-video rounded-2xl border-2 border-gray-300 dark:border-gray-700 shadow-xl overflow-hidden">
                <video
                  className="w-full h-full object-cover bg-black"
                  controls
                  playsInline
                  src={promoUrl}
                />
              </div>
            ) : (
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-gray-300 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <PlayCircle
                    className="text-gray-400 dark:text-gray-600 mb-4"
                    size={64}
                  />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Promotional Video Coming Soon
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Powerful features for smarter quote analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <FileText
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                AI Quote Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Extract pricing, terms, and specifications from supplier emails
                automatically with AI-powered parsing.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <BarChart3
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Smart Comparison
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Compare quotes side-by-side with customizable weights to find
                the best value for your needs.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <Zap className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Instant Results
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Get comprehensive analysis in seconds. Save hours of manual
                comparison work.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-800 text-white py-16 sm:py-20">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 dark:text-blue-200 mb-10">
            Start analyzing supplier quotes and making better purchasing
            decisions today.
          </p>
          <Link
            to="/briefings"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-800 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-200 transition font-semibold text-lg"
          >
            Get Started <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
