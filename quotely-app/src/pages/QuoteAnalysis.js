// src/components/QuoteAnalysis.js
import { useState } from "react";

export default function QuoteAnalysis() {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    setFeedback("");

    try {
      const res = await fetch("/api/analyze-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailText: text }),
      });

      const data = await res.json();

      if (data.error) setFeedback("Error: " + data.error);
      else setFeedback(data.analysis || "No feedback returned.");
    } catch (err) {
      console.error(err);
      setFeedback("Error analyzing text.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white shadow rounded space-y-4">
      <h2 className="text-xl font-bold">Quote / Email Analysis</h2>

      <textarea
        rows={6}
        placeholder="Paste the email or quote text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {feedback && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">AI Feedback:</h3>
          <p>{feedback}</p>
        </div>
      )}
    </div>
  );
}
