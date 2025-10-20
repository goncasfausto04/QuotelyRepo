import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="text-center p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Quotely</h1>
      <p className="mb-6">
        Easily create briefings, collect quotes, and compare them intelligently.
      </p>
      <Link
        to="/dashboard"
        className="bg-blue-500 text-white px-6 py-3 rounded"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
