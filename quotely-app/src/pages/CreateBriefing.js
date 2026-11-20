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
    <div className="px-4 py-10 sm:py-16">
      <div className="card w-full max-w-lg mx-auto p-6 sm:p-8">
        <h1 className="page-title">New request</h1>
        <p className="muted mb-6">Give it a name you'll recognise. Next, the assistant asks a few questions and writes the email to suppliers.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="title">
              Name
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="input" placeholder="e.g. T-shirts for the summer event" />
          </div>
          <div>
            <label className="label" htmlFor="category">
              Category <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="category"
              list="categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              placeholder="e.g. Printing"
            />
            <datalist id="categories">
              {["Printing", "Merchandise", "Construction", "Furniture", "IT equipment", "Catering", "Packaging", "Services"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
