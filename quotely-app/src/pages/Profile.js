// Profile: these details sign the quote request emails sent to suppliers.

import { useEffect, useState } from "react";
import { User, Building2, Phone, MapPin, Mail, Check } from "lucide-react";
import { loadProfile, saveProfile, uploadAvatar } from "../components/profile/profileApi.js";
import AvatarUpload from "../components/profile/AvatarUpload.js";
import Notice from "../components/ui/Notice.js";

const FIELDS = [
  ["name", "Full name", User, "e.g. Maria Silva"],
  ["company_name", "Company", Building2, "e.g. Silva Interiors Lda"],
  ["phone", "Phone", Phone, "e.g. +351 912 345 678"],
  ["location", "Location", MapPin, "e.g. Lisbon, Portugal"],
];

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .catch((err) => setNotice({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      setNotice({ type: "success", text: "Profile saved" });
    } catch (err) {
      setNotice({ type: "error", text: `Couldn't save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (file) => {
    try {
      const url = await uploadAvatar(profile.auth_id, file);
      setProfile((p) => ({ ...p, photo_url: url }));
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!profile) return <div className="max-w-2xl mx-auto p-8">{notice && <Notice type="error">{notice.text}</Notice>}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 flex items-center gap-5">
          <AvatarUpload url={profile.photo_url} onUpload={changePhoto} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{profile.name || "Your profile"}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
              <Mail className="w-4 h-4" /> {profile.email}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <Notice type="info">These details are used to sign the quote request emails sent to suppliers. Leave a field empty to keep it out of emails.</Notice>
          {FIELDS.map(([key, label, Icon, placeholder]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1">
                <Icon className="w-4 h-4" /> {label}
              </span>
              <input
                value={profile[key] || ""}
                onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}

          {notice && (
            <Notice type={notice.type} onClose={() => setNotice(null)}>
              {notice.text}
            </Notice>
          )}

          <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            <Check className="w-5 h-5" /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
