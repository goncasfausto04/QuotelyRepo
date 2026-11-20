import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SampleComparison from "../components/landing/SampleComparison.js";

const STEPS = [
  ["Describe what you need", "Answer a few questions in plain language. Quotely turns it into a clear request for quote, signed with your details."],
  ["Find and contact suppliers", "Search for suppliers near you on a map and send each one a private email in one go."],
  ["Collect the replies", "Answers land in one inbox. Approve a reply and the price, delivery time and terms are pulled out for you."],
  ["Compare like for like", "Every quote in one currency, shipping included, with the best value in each row marked."],
];

export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-gray-950">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-4">For small teams that buy from suppliers</p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] text-gray-900 dark:text-white">
            Get three quotes.
            <br />
            Pick the right one.
          </h1>
          <p className="mt-5 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
            Quotely writes your quote request, sends it to suppliers, reads their replies and lines the offers up side by side, so you're not
            comparing PDFs and email threads by hand.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/briefings/create-briefing" className="btn-primary px-5 py-2.5 text-base">
              Start a request <ArrowRight size={18} />
            </Link>
            <Link to="/auth" className="btn-secondary px-5 py-2.5 text-base">
              Sign in
            </Link>
          </div>
        </div>
        <SampleComparison />
      </section>

      <section className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-10">How it works</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <div className="text-sm font-mono text-gray-400 mb-2">0{i + 1}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">One-minute demo</h2>
        <video className="w-full aspect-video rounded-lg border border-gray-200 dark:border-gray-800 bg-black" controls playsInline preload="metadata" src="/landingvideo.mp4" />
      </section>
    </div>
  );
}
