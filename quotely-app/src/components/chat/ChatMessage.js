// One chat bubble. The generated email gets its own card with actions.

import EmailCard from "./EmailCard.js";

const STYLES = {
  AI: "bg-blue-50 dark:bg-blue-900/30 text-blue-950 dark:text-blue-50 mr-8",
  User: "bg-blue-600 text-white ml-8",
  error: "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 mr-8",
};

export default function ChatMessage({ message, isLatestEmail, emailActions }) {
  if (message.role === "Email") {
    return <EmailCard text={message.content} faded={!isLatestEmail} actions={isLatestEmail ? emailActions : null} />;
  }
  const style = message.isError ? STYLES.error : STYLES[message.role] || STYLES.AI;
  return (
    <div className={`flex ${message.role === "User" ? "justify-end" : "justify-start"}`}>
      <div className={`my-1.5 px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed max-w-[85%] ${style}`}>
        {message.content}
      </div>
    </div>
  );
}
