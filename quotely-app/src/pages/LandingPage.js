import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Zap,
  Clock,
  Shield,
  Users,
  Upload,
  Sparkles,
  Download,
  BarChart3,
} from "lucide-react";
import { useEffect } from "react";
import { supabase } from "../supabaseClient.js";

export default function LandingPage() {
  // const [user, setUser] = useState(null);

  useEffect(() => {
    // supabase.auth.getUser().then(({ data }) => {
    //   setUser(data?.user || null);
    // });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Session state available if needed
        console.log("Auth state changed:", session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <main className="flex-1">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-full px-4 py-2 mb-8">
            <Sparkles
              className="text-yellow-600 dark:text-yellow-400"
              size={16}
            />
            <span className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
              AI-Powered Decision Intelligence
            </span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
            Turning Briefings Into
            <br />
            <span className="text-blue-600 dark:text-blue-400">
              Smart Decisions
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Transform complex briefings into actionable insights. Make
            data-driven decisions faster with AI-powered analysis and
            intelligent reporting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/briefings"
              className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-semibold text-lg justify-center"
            >
              Start <ArrowRight size={20} />
            </Link>
            <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition font-semibold text-lg">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto mb-12">
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                95%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Time saved
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                10x
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Better insights
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                100+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Companies trust us
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Everything You Need to Make
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                Better Decisions
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Powerful features designed to transform how you work with business
              intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <FileText
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Smart Document Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Analyze any briefing format and let our AI extract key insights,
                trends, and actionable recommendations automatically.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <Sparkles
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                AI-Powered Intelligence
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Advanced machine learning algorithms analyze patterns and
                provide predictive insights for better decision-making.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <Zap className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Instant Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Get comprehensive analysis in seconds, not hours. Transform
                lengthy briefings into concise, actionable summaries.
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
                Visual Dashboards
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Interactive charts and visualizations make complex data easy to
                understand and share with stakeholders.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <Shield
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Enterprise Security
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Bank-level encryption and compliance with international data
                protection standards keep your information secure.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl dark:hover:shadow-blue-900/20 transition">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-5">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Team Collaboration
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Share insights, annotate findings, and make decisions together
                with built-in collaboration tools.
              </p>
            </div>
          </div>

          {/* Process Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Simple Process,{" "}
              <span className="text-blue-600 dark:text-blue-400">
                Powerful Results
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              From briefing to decision in three easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Upload
                  className="text-blue-600 dark:text-blue-400"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Upload Your Briefing
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Simply upload your document, report, or data in any format. We
                support PDFs, Word docs, spreadsheets, and more.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles
                  className="text-blue-600 dark:text-blue-400"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                AI Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Our advanced AI scrutinizes your briefing, extracting key
                insights, identifying trends, and generating actionable
                recommendations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Download
                  className="text-blue-600 dark:text-blue-400"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Get Smart Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Receive comprehensive analysis with visual dashboards, executive
                summaries, and data-driven recommendations in minutes.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-800 text-white py-20">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Decision-Making?
          </h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-10">
            Join leading organizations using Quotely to turn briefings into
            smart decisions. Start your free trial today—no credit card
            required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to="/briefings"
              className="w-full sm:w-auto bg-yellow-400 text-gray-900 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-yellow-300 transition font-semibold text-lg text-center"
            >
              Start Now
            </Link>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-600 dark:hover:text-blue-800 transition font-semibold text-lg">
              Schedule Demo
            </button>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-blue-100 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
