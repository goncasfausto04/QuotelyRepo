import { useState } from "react";
import { Upload } from "lucide-react";
import { primaryBtn } from "./inputs.js";

export default function PdfInput({ busy, onAnalyze }) {
  const [file, setFile] = useState(null);
  const disabled = busy || !file;
  return (
    <div className="space-y-4">
      <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-6 text-center cursor-pointer">
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} className="hidden" />
        <Upload size={48} className="text-gray-400 dark:text-gray-500 mb-2 mx-auto" />
        <p className="text-gray-600 dark:text-gray-300">{file ? file.name : "Click to upload PDF"}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Max 10MB</p>
      </label>
      <button onClick={async () => (await onAnalyze(file)) && setFile(null)} disabled={disabled} className={primaryBtn(disabled)}>
        {busy ? "Analyzing PDF..." : "🔍 Analyze PDF"}
      </button>
    </div>
  );
}
