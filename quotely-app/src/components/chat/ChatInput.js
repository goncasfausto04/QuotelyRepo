import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

const PLACEHOLDERS = {
  new: "e.g. 500 cotton t-shirts with our logo, delivered to Lisbon by March",
  interview: "Type your answer…",
  done: "Ask for changes, e.g. \"make it shorter\" or \"also ask for samples\"",
};

export default function ChatInput({ phase, disabled, onSend }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, phase]);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={disabled ? "Please wait…" : PLACEHOLDERS[phase]}
        disabled={disabled}
        className="input flex-1 resize-none max-h-40 py-3 disabled:opacity-60"
        aria-label="Message"
      />
      <button
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="btn-primary h-12 px-5"
        aria-label="Send"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
