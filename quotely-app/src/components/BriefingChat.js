import { useState } from "react";

export default function BriefingChat() {
  const [messages, setMessages] = useState([
    { role: "AI", content: "Hi! What service do you need a quote for?" },
  ]);
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Clear input immediately
    const userInput = input; // Save the input first
    setInput(""); // Clear it right away

    setIsLoading(true);
    // Add user message immediately
    const userMessage = { role: "User", content: userInput }; // Use the saved input
    setMessages((prev) => [...prev, userMessage]);

    if (questions.length === 0) {
      // First message - send project description to get questions
      try {
        const response = await fetch("http://localhost:3001/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description: input }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Received questions from backend:", data.questions);

          if (!data.questions || data.questions.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                role: "AI",
                content: "Error: No questions received from the server.",
              },
            ]);
            setIsLoading(false);
            return;
          }

          // Filter out any empty or invalid questions
          const validQuestions = data.questions.filter(
            (q) =>
              q &&
              q.trim().length > 0 &&
              !q.includes("great start") &&
              !q.includes("personalized questions")
          );

          if (validQuestions.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                role: "AI",
                content:
                  "Error: Could not generate valid questions. Please try again.",
              },
            ]);
            setIsLoading(false);
            return;
          }

          // Set questions and show the first one
          setQuestions(validQuestions);
          setMessages((prev) => [
            ...prev,
            {
              role: "AI",
              content:
                data.message ||
                "Great! I have some questions to better understand your needs:",
            },
            { role: "AI", content: `1. ${validQuestions[0]}` }, // Show first question immediately
          ]);
          setCurrentQuestionIndex(1); // Next question index
        } else {
          const errorData = await response.json();
          setMessages((prev) => [
            ...prev,
            { role: "AI", content: `Error: ${errorData.error}` },
          ]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { role: "AI", content: `Error: ${error.message}` },
        ]);
      }
    } else {
      // Handle user answers to the generated questions
      const newAnswers = [...answers, input];
      setAnswers(newAnswers);

      console.log(
        `Answer ${newAnswers.length} of ${questions.length} questions`
      );

      // Check if all questions are answered
      if (currentQuestionIndex >= questions.length) {
        // All questions answered - generate briefing
        try {
          setMessages((prev) => [
            ...prev,
            {
              role: "AI",
              content:
                "Thank you for answering all the questions! Generating your briefing document...",
            },
          ]);

          const response = await fetch("http://localhost:3001/compose-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ answers: newAnswers }),
          });


          if (response.ok) {
            const data = await response.json();
            setMessages((prev) => [
              ...prev,
              {
                role: "AI",
                content: "Here's your generated supplier email draft:",
              },
              { role: "AI", content: data.email },
            ]);

            // Reset for new conversation (optional)
            setQuestions([]);
            setAnswers([]);
            setCurrentQuestionIndex(0);
          } else {
            const errorData = await response.json();
            setMessages((prev) => [
              ...prev,
              {
                role: "AI",
                content: `Error generating your email: ${errorData.error}, try again later may be the api that sucks.`,
              },
            ]);
          }
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            { role: "AI", content: `Error: ${error.message}` },
          ]);
        }
      } else {
        // Show next question
        const nextQuestion = questions[currentQuestionIndex];
        setMessages((prev) => [
          ...prev,
          {
            role: "AI",
            content: `${currentQuestionIndex + 1}. ${nextQuestion}`,
          },
        ]);
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
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
        {/* Loading indicator */}
        {isLoading && (
          <div className="my-1 p-2 rounded bg-blue-100 text-blue-900">
            <strong>AI: </strong>
            <span className="italic">Thinking...</span>
          </div>
        )}
      </div>
      <div className="flex">
        <input
          className="flex-1 border rounded-l p-2"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isLoading ? "Please wait..." : "Type your message here..."
          }
          disabled={isLoading}
        />
        <button
          className={`p-2 rounded-r ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white`}
          onClick={sendMessage}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
