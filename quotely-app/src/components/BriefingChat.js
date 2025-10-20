import { useState } from "react";

export default function BriefingChat() {
  const [messages, setMessages] = useState([
    { role: "AI", content: "Hi! What service do you need a quote for?" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input) return;
    setMessages([...messages, { role: "User", content: input }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "AI", content: "Got it! Can you provide more details?" },
      ]);
    }, 1000);
    setInput("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 border rounded-lg shadow-lg mt-4">
      <h2 className="text-xl font-bold mb-4">AI-Guided Briefing</h2>
      <div className="mb-4 h-64 overflow-y-auto border p-2 rounded">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-1 p-2 rounded ${
              msg.role === "AI"
                ? "bg-blue-100 text-blue-900"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <strong>{msg.role}: </strong> {msg.content}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          className="flex-1 border rounded-l p-2"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white p-2 rounded-r"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
