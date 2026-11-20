const LABELS = {
  thinking: "Thinking",
  writing: "Writing your email",
  revising: "Updating the email",
  searching: "Searching for suppliers",
};

export default function TypingIndicator({ kind }) {
  if (!kind) return null;
  return (
    <div className="flex justify-start">
      <div className="my-1.5 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
        {LABELS[kind] || "Working"}
        <span className="flex gap-1">
          {[0, 0.15, 0.3].map((d) => (
            <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
          ))}
        </span>
      </div>
    </div>
  );
}
