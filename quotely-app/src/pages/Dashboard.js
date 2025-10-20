import BriefingChat from "../components/BriefingChat";
import QuoteUpload from "../components/QuoteUpload";
import ComparisonDashboard from "../components/ComparisonDashboard";

export default function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <BriefingChat />
      <QuoteUpload />
      <ComparisonDashboard />
    </div>
  );
}
