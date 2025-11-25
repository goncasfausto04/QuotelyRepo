import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function CreateBriefing() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to create a briefing.");
      setLoading(false);
      return;
    }

    // Add .select() to get the inserted data back
    const { data, error: insertError } = await supabase
      .from("briefings")
      .insert([
        {
          user_auth_id: user.id,
          title,
          category,
        },
      ])
      .select(); // This returns the inserted record

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Get the ID from the inserted data
    if (data && data.length > 0) {
      const id = data[0].id;
      // Use backticks for template literals, not quotes
      navigate(`/briefingpage?briefing=${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Create New Briefing
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="e.g. Office Renovation"
            />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="e.g. Construction"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Briefing"}
          </button>
        </form>
      </div>
    </div>
  );
}
