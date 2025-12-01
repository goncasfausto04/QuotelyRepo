// BriefingChat.js
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import BriefingEmailComposer from "./BriefingEmailComposer.js";

export default function BriefingChat({
  briefingId: initialBriefingId,
  onSuppliersFound,
}) {
  const [briefingId, setBriefingId] = useState(initialBriefingId || null);
  const API_URL = process.env.REACT_APP_API_URL;
  const [messages, setMessages] = useState([
    {
      role: "AI",
      content: "Hi! What product or service do you need to request quotes for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationStarted, setIsConversationStarted] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);

  // --- NEW: send email UI state ---
  const [sendOption, setSendOption] = useState("generated"); // 'generated' | 'custom'
  const [customEmailText, setCustomEmailText] = useState("");
  const [recipientsText, setRecipientsText] = useState(""); // comma-separated
  const [sendLoading, setSendLoading] = useState(false);

  // Initialize briefing from Supabase or create new one
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

          // Check if conversation was already started
          const hasUserMessages = data.chat.some((msg) => msg.role === "User");
          setIsConversationStarted(hasUserMessages);

          // ✅ NEW: Check if conversation is complete (email was generated)
          const hasEmail = data.chat.some((msg) => msg.role === "Email");
          if (hasEmail) {
            setConversationComplete(true);
            console.log("✅ Loaded completed conversation with email");
          }
        }
        setBriefingId(initialBriefingId);
      } else {
        const { data, error } = await supabase
          .from("briefings")
          .insert([{ title: "New Briefing" }])
          .select()
          .single();

        if (!error) {
          setBriefingId(data.id);
        }
      }
    };

    initBriefing();
  }, [initialBriefingId]);

  // Save chat messages to Supabase
  const saveChatToSupabase = async (newMessages) => {
    if (!briefingId) return;
    const { error } = await supabase
      .from("briefings")
      .update({ chat: newMessages })
      .eq("id", briefingId);

    if (error) console.error("Error saving chat:", error.message);
  };

  // Append single message and save
  const appendMessage = (newMsg) => {
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveChatToSupabase(updated);
      return updated;
    });
  };

  // --- NEW: Helpers for sending email ---
  const getGeneratedEmail = () => {
    // find last message with role === 'Email'
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "Email" && messages[i].content) return messages[i].content;
    }
    return "";
  };

  const sendEmailForBriefing = async () => {
    if (sendLoading) return;
    const body =
      sendOption === "generated" ? getGeneratedEmail() : customEmailText || "";
    if (!body || !body.trim()) {
      alert("No email body to send. Choose generated or enter custom text.");
      return;
    }
    const recipients = (recipientsText || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      alert("Enter at least one recipient email (comma-separated).");
      return;
    }

    setSendLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingId,
          subject: `Quote Request from Quotely`,
          body,
          recipients,
          isHtml: false,
        }),
      });

      // Read response body regardless of status
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Show server error details
        const errMsg = data.details || data.error || `Status ${res.status}`;
        throw new Error(errMsg);
      }

      appendMessage({
        role: "AI",
        content: `✅ Email sent to ${recipients.join(", ")}.`,
      });

      if (data?.threadId) {
        console.log("Gmail threadId:", data.threadId);
      }
    } catch (err) {
      console.error("Send email error:", err);
      appendMessage({
        role: "AI",
        content: `❌ Failed to send email: ${err.message || String(err)}`,
      });
    } finally {
      setSendLoading(false);
    }
  };

  // Main message sending function
  const sendMessage = async () => {
    if (!input.trim() || isLoading || conversationComplete) return;

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    appendMessage({ role: "User", content: userInput });

    try {
      // CASE 1: Starting a new conversation (first user message)
      if (!isConversationStarted) {
        console.log("Starting new conversation with:", userInput);

        const response = await fetch(`${API_URL}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: userInput,
            briefingId: briefingId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }

        const data = await response.json();
        setIsConversationStarted(true);

        // Display the first question
        appendMessage({
          role: "AI",
          content: data.question,
        });

        setIsLoading(false);
        return;
      }

      // CASE 2: Continuing the conversation (subsequent answers)
      console.log("Sending answer:", userInput);

      const response = await fetch(`${API_URL}/next-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingId: briefingId,
          userAnswer: userInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // CASE 2A: Conversation is complete - generate email THEN prompt for supplier search
      if (data.done) {
        console.log("Conversation complete! Generating email...");

        // Generate the email now
        appendMessage({
          role: "AI",
          content: "Perfect! Let me create a professional quote request email for you...",
        });

        try {
          const emailRes = await fetch(`${API_URL}/compose-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              briefingId: briefingId,
              collectedInfo: data.collectedInfo,
            }),
          });

          const emailPayload = await emailRes.json().catch(() => ({}));
          if (!emailRes.ok) {
            throw new Error(emailPayload.error || `Status ${emailRes.status}`);
          }

          appendMessage({
            role: "AI",
            content: "✅ Here's your professional quote request email:",
          });
          appendMessage({
            role: "Email",
            content: emailPayload.email,
            isEmail: true,
          });
        } catch (err) {
          console.error("Email generation failed:", err);
          appendMessage({
            role: "AI",
            content: `❌ Email generation failed: ${err.message || String(err)}`,
          });
        }

        // Mark conversation complete and prompt about supplier search (after email)
        setConversationComplete(true);
        setLastCollectedInfo(data.collectedInfo);

        setShowSupplierPrompt(true);
      }
      // CASE 2B: Ask next question
      else {
        appendMessage({
          role: "AI",
          content: data.question,
        });
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

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Copy email to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Email copied to clipboard!");
  };

  // Reset conversation to start over
  const resetConversation = () => {
    setIsConversationStarted(false);
    setConversationComplete(false);
    setMessages([
      {
        role: "AI",
        content:
          "Hi! What product or service do you need to request quotes for?",
      },
    ]);
    saveChatToSupabase([
      {
        role: "AI",
        content:
          "Hi! What product or service do you need to request quotes for?",
      },
    ]);
  };

  // --- NEW: Supplier search handling ---
  const [lastCollectedInfo, setLastCollectedInfo] = useState(null);
  const [showSupplierPrompt, setShowSupplierPrompt] = useState(false);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [askingLocation, setAskingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);

  // --- NEW: handle supplier search
  const handleSupplierSearch = async (choice) => {
    setShowSupplierPrompt(false);
    if (!lastCollectedInfo) return;

    // If user wants search but we don't have a location, ask for it
    if (choice === "yes" && !lastCollectedInfo.location && !askingLocation) {
      setAskingLocation(true);
      appendMessage({ role: "AI", content: "Where should I look for suppliers? Please provide city, region or postal code (or type 'any')." });
      return;
    }

    // If we're asking for location and user provided it via UI, ensure it's set
    const location = choice === "location-submitted" ? locationInput.trim() : (lastCollectedInfo.location || (choice === "yes" ? null : null));

    setSearchingSuppliers(true);
    try {
      if (choice !== "yes" && choice !== "location-submitted") {
        appendMessage({ role: "AI", content: "Okay — not searching for suppliers right now." });
        setAskingLocation(false);
        setLastCollectedInfo(null);
        return;
      }

      appendMessage({ role: "AI", content: `🔎 Searching for suppliers${location ? ` near ${location}` : ""}...` });

      const payloadBody = { collectedInfo: lastCollectedInfo };
      if (location) payloadBody.location = location;

      const res = await fetch(`${API_URL}/search-suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Status ${res.status}`);

      const suppliers = payload.suppliers || [];
      const queries = payload.queries || [];

      if (suppliers.length) {
        // render suppliers in chat with clear labeled fields and separators
        const formatted = suppliers
          .map((s, i) => {
            const name = s.name || "Unknown";
            const email = s.contact_email || "—";
            const phone = s.phone || "—";
            const website = s.website || "—";
            const note = (s.note || "").trim() || "—";
            return (
              `${i + 1}. ${name}\n` +
              `   • Email: ${email}\n` +
              `   • Phone: ${phone}\n` +
              `   • Website: ${website}\n` +
              `   • Note: ${note}`
            );
          })
          .join("\n\n---\n\n");

        const header = "I found the following potential suppliers:\n\n";
        appendMessage({ role: "AI", content: header + formatted });
        setSupplierResults(suppliers);
        if (typeof onSuppliersFound === "function") {
          try {
            onSuppliersFound({ suppliers, queries, collectedInfo: lastCollectedInfo });
          } catch (e) {
            console.warn("onSuppliersFound handler error:", e);
          }
        }
      } else if (payload.raw_text) {
        appendMessage({ role: "AI", content: "AI returned (raw):\n\n" + payload.raw_text });
      } else {
        appendMessage({ role: "AI", content: "No suppliers were returned." });
      }

      if (queries && queries.length) {
        appendMessage({ role: "AI", content: "Useful search queries: " + queries.join(" | ") });
      }
    } catch (err) {
      console.error("Supplier search failed:", err);
      appendMessage({ role: "AI", content: `❌ Supplier search failed: ${err.message || err}` });
    } finally {
      setSearchingSuppliers(false);
      setAskingLocation(false);
      setLocationInput("");
      setLastCollectedInfo(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-6 bg-white dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        📧 Quote Request Assistant
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        Tell me what you need, and I'll help you create a professional quote
        request email
      </p>

      <div className="mb-4 h-64 sm:h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-2 p-3 rounded-lg ${
              msg.role === "AI"
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-l-4 border-blue-400 dark:border-blue-500"
                : msg.role === "Email"
                ? "bg-green-50 dark:bg-green-900/30 text-gray-900 dark:text-gray-100 border border-green-300 dark:border-green-700 font-mono text-sm whitespace-pre-wrap"
                : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 sm:ml-8"
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
          <div className="my-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100">
            <strong className="text-xs">AI:</strong>
            <div className="mt-1 flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full animate-bounce"
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

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="w-full sm:flex-1 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none mb-2 sm:mb-0"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isLoading
              ? "Please wait..."
              : !isConversationStarted
              ? "e.g., I need 100 custom t-shirts with my logo"
              : conversationComplete
              ? "Conversation complete"
              : "Type your answer..."
          }
          disabled={isLoading || conversationComplete}
        />
        <button
          className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors ${
            isLoading || !input.trim() || conversationComplete
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          onClick={sendMessage}
          disabled={isLoading || !input.trim() || conversationComplete}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>

      {conversationComplete && (
        <button
          onClick={resetConversation}
          className="mt-4 w-full px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-semibold"
        >
          🔄 Start New Request
        </button>
      )}

      {/* Email composer (extracted) */}
      <BriefingEmailComposer
        briefingId={briefingId}
        getGeneratedEmail={getGeneratedEmail}
        onSent={(recipients) =>
          appendMessage({
            role: "AI",
            content: `✅ Email sent to ${recipients.join(", ")}.`,
          })
        }
      />

      {/* --- NEW: Supplier search prompt --- */}
      {showSupplierPrompt && (
        <div className="mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 border-l-4 border-yellow-400 dark:border-yellow-500">
          <p className="text-sm">Would you like me to search for potential suppliers that match this request?</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleSupplierSearch("yes")} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white">Yes, find suppliers</button>
            <button onClick={() => handleSupplierSearch("no")} className="flex-1 px-4 py-2 rounded-lg bg-gray-300 text-gray-700">No, thanks</button>
          </div>
        </div>
      )}

      {askingLocation && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700">
          <p className="text-sm mb-2">Enter location to search nearby suppliers (city, region, or postal code):</p>
          <div className="flex gap-2">
            <input value={locationInput} onChange={(e)=>setLocationInput(e.target.value)} className="flex-1 p-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="e.g., Seattle, WA or 94107" />
            <button onClick={()=>handleSupplierSearch("location-submitted")} className="px-4 py-2 bg-blue-600 text-white rounded">Search</button>
          </div>
        </div>
      )}

      {/* --- NEW: Searching suppliers state --- */}
      {searchingSuppliers && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100">
          <div className="flex items-center gap-2">
            <div className="animate-pulse">Searching for suppliers...</div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full animate-bounce"
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
  );
}
