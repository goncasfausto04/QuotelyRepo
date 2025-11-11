// BriefingChat.js
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

export default function BriefingChat({
  briefingId: initialBriefingId,
  onSuppliersFound,
}) {
  const [briefingId, setBriefingId] = useState(initialBriefingId || null);
  const [messages, setMessages] = useState([
    {
      role: "AI",
      content: "Hi! What product or service do you need to request quotes for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialDescription, setInitialDescription] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [needsLocation, setNeedsLocation] = useState(false);

  useEffect(() => {
    const initBriefing = async () => {
      if (initialBriefingId) {
        const { data, error } = await supabase
          .from("briefings")
          .select("chat")
          .eq("id", initialBriefingId)
          .single();

        if (!error && data && data.chat?.length > 0) {
          setMessages(data.chat);
        }
        setBriefingId(initialBriefingId);
      } else {
        const { data, error } = await supabase
          .from("briefings")
          .insert([{ title: "New Briefing", status: "draft" }])
          .select()
          .single();

        if (!error) {
          setBriefingId(data.id);
        }
      }
    };

    initBriefing();
  }, [initialBriefingId]);

  const saveChatToSupabase = async (newMessages) => {
    if (!briefingId) return;
    const { error } = await supabase
      .from("briefings")
      .update({ chat: newMessages })
      .eq("id", briefingId);

    if (error) console.error("Error saving chat:", error.message);
  };

  const appendMessage = (newMsg) => {
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveChatToSupabase(updated);
      return updated;
    });
  };

  const appendMessages = (newMsgs) => {
    if (!Array.isArray(newMsgs) || newMsgs.length === 0) return;
    setMessages((prev) => {
      const updated = [...prev, ...newMsgs];
      saveChatToSupabase(updated);
      return updated;
    });
  };

  const resetConversation = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setInitialDescription("");
    setLastAnswer("");
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    appendMessage({ role: "User", content: userInput });
    setLastAnswer(userInput);

    try {
      if (needsLocation) {
        setUserLocation(userInput);
        setNeedsLocation(false);

        const response = await fetch("http://localhost:3001/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: initialDescription,
            previousAnswer: "",
          }),
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
          appendMessage({
            role: "AI",
            content:
              "I couldn't generate questions. Please try rephrasing your request.",
          });
          setIsLoading(false);
          return;
        }

        const validQuestions = data.questions.filter(
          (q) =>
            typeof q === "string" && q.trim().length > 10 && q.includes("?")
        );

        if (validQuestions.length === 0) {
          appendMessage({
            role: "AI",
            content:
              "Sorry, I had trouble understanding. Could you describe what you need more specifically?",
          });
          setIsLoading(false);
          return;
        }

        setQuestions(validQuestions);
        appendMessage({
          role: "AI",
          content:
            data.message ||
            "Perfect! I have some questions to help create your quote request:",
        });
        appendMessage({
          role: "AI",
          content: `Question 1: ${validQuestions[0]}`,
        });
        setCurrentQuestionIndex(1);
        setIsLoading(false);
        return;
      }

      if (questions.length === 0) {
        setInitialDescription(userInput);
        setNeedsLocation(true);
        appendMessage({
          role: "AI",
          content:
            "Thanks! Now, which city and country are you located in? (e.g., Lisbon, Portugal)",
        });
        setIsLoading(false);
        return;
      }

      const newAnswers = [...answers, userInput];
      setAnswers(newAnswers);

      const response = await fetch("http://localhost:3001/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: initialDescription,
          previousAnswer: userInput,
        }),
      });

      const data = await response.json();

      if (data.questions && data.questions.length === 1) {
        appendMessage({ role: "AI", content: data.message });
        appendMessage({ role: "AI", content: data.questions[0] });
        setIsLoading(false);
        return;
      }

      if (currentQuestionIndex >= questions.length) {
        appendMessage({
          role: "AI",
          content:
            "Perfect! Let me create a professional quote request email for you...",
        });

        const emailRes = await fetch("http://localhost:3001/compose-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: newAnswers,
            initialDescription,
            location: userLocation,
          }),
        });

        if (!emailRes.ok) throw new Error(`Server error: ${emailRes.status}`);

        const emailData = await emailRes.json();

        appendMessage({
          role: "AI",
          content: "✅ Here's your professional quote request email:",
        });
        appendMessage({
          role: "Email",
          content: emailData.email,
          isEmail: true,
        });

        if (typeof onSuppliersFound === "function") {
          onSuppliersFound(initialDescription, userLocation);
        }
      } else {
        const nextQuestion = questions[currentQuestionIndex];
        appendMessage({
          role: "AI",
          content: `Question ${currentQuestionIndex + 1}: ${nextQuestion}`,
        });
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      appendMessage({
        role: "AI",
        content: `❌ Something went wrong: ${error.message}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Email copied to clipboard!");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 border rounded-lg shadow-lg mt-8 bg-white">
      <h2 className="text-2xl font-bold mb-2">📧 Quote Request Assistant</h2>
      <p className="text-gray-600 text-sm mb-4">
        Tell me what you need, and I'll help you create a professional quote
        request email
      </p>

      <div className="mb-4 h-96 overflow-y-auto border rounded p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-2 p-3 rounded-lg ${
              msg.role === "AI"
                ? "bg-blue-50 text-blue-900 border-l-4 border-blue-400"
                : msg.role === "Email"
                ? "bg-green-50 text-gray-900 border border-green-300 font-mono text-sm whitespace-pre-wrap"
                : "bg-white text-gray-900 border border-gray-200 ml-8"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <strong className="text-xs uppercase tracking-wide">
                  {msg.role}:
                </strong>
                <div className="mt-1">{msg.content}</div>
              </div>
              {msg.isEmail && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="ml-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="my-2 p-3 rounded-lg bg-blue-50 text-blue-900">
            <strong className="text-xs">AI:</strong>
            <div className="mt-1 flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 focus:outline-none"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isLoading
              ? "Please wait..."
              : questions.length === 0
              ? "e.g., I need 100 custom t-shirts with my logo"
              : "Type your answer..."
          }
          disabled={isLoading}
        />
        <button
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isLoading || !input.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
