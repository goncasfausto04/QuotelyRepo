import { useState } from "react";
import { fieldCls, primaryBtn } from "./inputs.js";

export default function EmailInput({ busy, onAnalyze }) {
  const [text, setText] = useState("");
  const disabled = busy || !text.trim();
  return (
    <div className="space-y-4">
      <textarea
        rows={8}
        placeholder="Paste the complete email from the supplier here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`${fieldCls} p-3 font-mono text-sm`}
      />
      <button onClick={async () => (await onAnalyze(text)) && setText("")} disabled={disabled} className={primaryBtn(disabled)}>
        {busy ? "Analyzing..." : "🔍 Analyze email"}
      </button>
    </div>
  );
}
