import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";

export default function AvatarUpload({ url, onUpload }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="relative w-24 h-24 shrink-0">
      {url ? (
        <img src={url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <User className="w-10 h-10 text-blue-600" />
        </div>
      )}
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="absolute bottom-0 right-0 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60"
        title="Change photo"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      </button>
      <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}
