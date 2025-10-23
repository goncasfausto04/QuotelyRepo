import BriefingChat from "../components/BriefingChat.js";
import QuoteUpload from "../components/QuoteUpload.js";
import ComparisonDashboard from "../components/ComparisonDashboard.js";
import QuoteAnalysis from "./QuoteAnalysis.js";

export default function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <BriefingChat />
      <QuoteUpload />
      <QuoteAnalysis />
      <ComparisonDashboard />
    </div>
  );
}
