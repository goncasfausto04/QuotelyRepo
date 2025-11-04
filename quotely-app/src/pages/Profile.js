import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { User, Phone, MapPin, Building2, Settings } from "lucide-react";

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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading profile...
      </div>
    );

  if (!userData)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No user found.
      </div>
    );

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
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          Your <span className="text-blue-500">Profile</span>
        </h1>
        <p className="text-gray-600 text-lg">
          Manage your personal info, preferences, and communication settings.
        </p>
      </div>

      {/* Profile Form */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-8 space-y-8">
        {/* Basic Info */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800 mb-2">
            <User className="text-blue-500" size={20} /> Basic Info
          </h2>

          <input
            type="text"
            name="name"
            value={userData.name || ""}
            placeholder="Full Name"
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p className="text-gray-700">
            <strong>Email:</strong> {userData.email}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="phone"
              value={userData.phone || ""}
              placeholder="Phone"
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="location"
              value={userData.location || ""}
              placeholder="City / State / Country"
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Company Info */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800 mb-2">
            <Building2 className="text-blue-500" size={20} /> Company Info
          </h2>

          <input
            type="text"
            name="company_name"
            value={userData.company_name || ""}
            placeholder="Company Name"
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>

        {/* Preferences */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800 mb-2">
            <Settings className="text-blue-500" size={20} /> Preferences
          </h2>

          {/* Channels */}
          <div className="flex flex-wrap gap-2">
            {channelsOptions.map((channel) => (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  userData.communication_channels_selected.includes(channel)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {channel}
              </button>
            ))}
          </div>

          {/* Budget */}
          <div className="mt-4">
            <label className="block text-gray-700 font-medium mb-2">
              Budget Range:{" "}
              <span className="text-blue-600">
                ${userData.budget_min} - ${userData.budget_max}
              </span>
            </label>

            <div className="flex flex-col gap-2">
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
                className="w-full accent-blue-500"
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
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="text-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 rounded-md font-medium text-white transition ${
              saving
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
