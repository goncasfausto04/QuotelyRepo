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
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2 mb-8">
            <Sparkles className="text-yellow-600" size={16} />
            <span className="text-sm text-yellow-800 font-medium">
              AI-Powered Decision Intelligence
            </span>
          </div>

          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Turning Briefings Into
            <br />
            <span className="text-blue-600">Smart Decisions</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Transform complex briefings into actionable insights. Make
            data-driven decisions faster with AI-powered analysis and
            intelligent reporting.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link
              to="/briefings"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-semibold text-lg"
            >
              Start <ArrowRight size={20} />
            </Link>
            <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition font-semibold text-lg">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-12 max-w-3xl mx-auto mb-20">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">95%</div>
              <div className="text-sm text-gray-600">Time saved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">10x</div>
              <div className="text-sm text-gray-600">Better insights</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">100+</div>
              <div className="text-sm text-gray-600">Companies trust us</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto px-6 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Make
              <br />
              <span className="text-blue-600">Better Decisions</span>
            </h2>
            <p className="text-lg text-gray-600">
              Powerful features designed to transform how you work with business
              intelligence
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-20">
            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Smart Document Analysis
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Analyze any briefing format and let our AI extract key insights,
                trends, and actionable recommendations automatically.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <Sparkles className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                AI-Powered Intelligence
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Advanced machine learning algorithms analyze patterns and
                provide predictive insights for better decision-making.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <Zap className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Processing</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Get comprehensive analysis in seconds, not hours. Transform
                lengthy briefings into concise, actionable summaries.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Visual Dashboards</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Interactive charts and visualizations make complex data easy to
                understand and share with stakeholders.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Enterprise Security
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Bank-level encryption and compliance with international data
                protection standards keep your information secure.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-xl transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                <Users className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Share insights, annotate findings, and make decisions together
                with built-in collaboration tools.
              </p>
            </div>
          </div>

          {/* Process Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Simple Process,{" "}
              <span className="text-blue-600">Powerful Results</span>
            </h2>
            <p className="text-lg text-gray-600">
              From briefing to decision in three easy steps
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Upload className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Upload Your Briefing
              </h3>
              <p className="text-gray-600 text-sm">
                Simply upload your document, report, or data in any format. We
                support PDFs, Word docs, spreadsheets, and more.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
              <p className="text-gray-600 text-sm">
                Our advanced AI scrutinizes your briefing, extracting key
                insights, identifying trends, and generating actionable
                recommendations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Download className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Smart Insights</h3>
              <p className="text-gray-600 text-sm">
                Receive comprehensive analysis with visual dashboards, executive
                summaries, and data-driven recommendations in minutes.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Decision-Making?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join leading organizations using Quotely to turn briefings into
            smart decisions. Start your free trial today—no credit card
            required.
          </p>
          <div className="flex gap-4 justify-center mb-8">
            <Link
              to="/briefings"
              className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg hover:bg-yellow-300 transition font-semibold text-lg"
            >
              Start Now
            </Link>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-600 transition font-semibold text-lg">
              Schedule Demo
            </button>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-blue-100">
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
