import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const channelsOptions = ["Email", "Phone", "SMS", "WhatsApp", "Telegram"];

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) console.log("Error fetching user:", error);
      else
        setUserData({
          ...data,
          budget_min: data.budget_ranges?.split("-")[0] || 0,
          budget_max: data.budget_ranges?.split("-")[1] || 1000,
          communication_channels_selected: data.communication_channels
            ? data.communication_channels.split(",")
            : [],
        });

      setLoading(false);
    }

    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!userData) return <div>No user found.</div>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleChannel = (channel) => {
    setUserData((prev) => {
      const selected = prev.communication_channels_selected;
      return {
        ...prev,
        communication_channels_selected: selected.includes(channel)
          ? selected.filter((c) => c !== channel)
          : [...selected, channel],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);

    const budget_ranges = `${userData.budget_min}-${userData.budget_max}`;
    const communication_channels =
      userData.communication_channels_selected.join(",");

    const { error } = await supabase
      .from("users")
      .update({
        name: userData.name,
        phone: userData.phone,
        location: userData.location,
        company_name: userData.company_name,
        communication_channels,
        budget_ranges,
      })
      .eq("auth_id", userData.auth_id);

    if (error) alert("Error saving: " + error.message);
    else alert("Profile updated!");

    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white shadow rounded p-6 space-y-6">
        <section className="space-y-2">
          <h2 className="font-semibold mb-2">Basic Info</h2>
          <input
            type="text"
            name="name"
            value={userData.name || ""}
            placeholder="Full Name"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
          <p>
            <strong>Email:</strong> {userData.email}
          </p>
          <input
            type="text"
            name="phone"
            value={userData.phone || ""}
            placeholder="Phone"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            name="location"
            value={userData.location || ""}
            placeholder="City / State / Country"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold mb-2">Profile</h2>
          <input
            type="text"
            name="company_name"
            value={userData.company_name || ""}
            placeholder="Company Name"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold mb-2">Preferences</h2>
          <div className="flex flex-wrap gap-2">
            {channelsOptions.map((channel) => (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={`px-3 py-1 rounded ${
                  userData.communication_channels_selected.includes(channel)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {channel}
              </button>
            ))}
          </div>

          <div className="space-y-2 mt-2">
            <label>
              Budget Range: {userData.budget_min} - {userData.budget_max}
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="50"
              value={userData.budget_min}
              onChange={(e) =>
                setUserData((prev) => ({
                  ...prev,
                  budget_min: Number(e.target.value),
                }))
              }
              className="w-full"
            />
            <input
              type="range"
              min="0"
              max="10000"
              step="50"
              value={userData.budget_max}
              onChange={(e) =>
                setUserData((prev) => ({
                  ...prev,
                  budget_max: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </section>

        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
