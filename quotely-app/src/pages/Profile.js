import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { User, Phone, Building2, Mail, Camera, Check, X } from "lucide-react";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const channelsOptions = [
    { value: "Email", icon: "📧" },
    { value: "Phone", icon: "📞" },
    { value: "SMS", icon: "💬" },
    { value: "WhatsApp", icon: "💚" },
    { value: "Telegram", icon: "✈️" },
  ];

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
      } else {
        setUserData({
          ...data,
          communication_channels_selected: data.communication_channels
            ? data.communication_channels.split(",").filter(Boolean)
            : [],
        });
      }

      setLoading(false);
    }

    fetchUser();
  }, []);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old photo if exists
      if (userData.photo_url) {
        const oldPath = userData.photo_url.split("/").pop();
        await supabase.storage
          .from("profile-photos")
          .remove([`${user.id}/${oldPath}`]);
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ photo_url: publicUrl })
        .eq("auth_id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setUserData((prev) => ({ ...prev, photo_url: publicUrl }));
      alert("Photo updated successfully!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
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
        })
        .eq("auth_id", userData.auth_id);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <X className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your personal information and communication preferences
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Photo Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 px-8 py-12 text-center">
          <div className="relative inline-block">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
              {userData.photo_url ? (
                <img
                  src={userData.photo_url}
                  alt={userData.name || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <User size={48} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition border-2 border-blue-500"
              title="Change photo"
            >
              {uploadingPhoto ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <Camera size={20} className="text-blue-600" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <h2 className="text-2xl font-bold text-white mt-4">
            {userData.name || "User"}
          </h2>
          <p className="text-blue-100 mt-1">{userData.email}</p>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-8">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={userData.name || ""}
                  placeholder="John Doe"
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <Mail
                    size={18}
                    className="text-gray-400 dark:text-gray-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {userData.email}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={userData.phone || ""}
                  placeholder="+1 (555) 000-0000"
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={userData.location || ""}
                  placeholder="City, Country"
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Company Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
              Company Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                value={userData.company_name || ""}
                placeholder="Acme Corporation"
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </section>

          {/* Communication Preferences */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone size={20} className="text-blue-600 dark:text-blue-400" />
              Preferred Communication Channels
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the channels where you'd like to receive quote updates
            </p>
            <div className="flex flex-wrap gap-3">
              {channelsOptions.map((channel) => {
                const isSelected =
                  userData.communication_channels_selected.includes(
                    channel.value
                  );
                return (
                  <button
                    key={channel.value}
                    onClick={() => toggleChannel(channel.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelected
                        ? "bg-blue-600 dark:bg-blue-700 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{channel.icon}</span>
                    <span>{channel.value}</span>
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check size={20} />
                  <span className="font-medium">
                    Changes saved successfully!
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                saving
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 shadow-md hover:shadow-lg"
              }`}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-4xl mx-auto mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Tip:</strong> Keep your profile up to date to receive
          better-matched quotes from suppliers.
        </p>
      </div>
    </div>
  );
}
