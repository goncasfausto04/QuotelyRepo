// One chat bubble. The generated email gets its own card with actions.

import EmailCard from "./EmailCard.js";

const STYLES = {
  AI: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-8",
  User: "bg-blue-700 text-white ml-8",
  error: "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 mr-8",
};

export default function ChatMessage({ message, isLatestEmail, emailActions }) {
  if (message.role === "Email") {
    return <EmailCard text={message.content} faded={!isLatestEmail} actions={isLatestEmail ? emailActions : null} />;
  }
  const style = message.isError ? STYLES.error : STYLES[message.role] || STYLES.AI;
  return (
    <div className={`flex ${message.role === "User" ? "justify-end" : "justify-start"}`}>
      <div className={`my-1.5 px-4 py-2.5 rounded-lg whitespace-pre-wrap text-sm leading-relaxed max-w-[85%] ${style}`}>
        {message.content}
      </div>
    </div>
  );
}
