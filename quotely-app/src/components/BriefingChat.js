// BriefingChat.js
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";
// import BriefingEmailComposer from "./BriefingEmailComposer.js";

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
  // New: track whether an email has been generated (does not end the conversation)
  const [emailGenerated, setEmailGenerated] = useState(false);

  // minimal email-send state (keeps legacy helper from Composer usable if called)
  const [sendLoading, setSendLoading] = useState(false);
  const [sendOption, setSendOption] = useState("generated"); // 'generated' | 'custom'
  const [customEmailText, setCustomEmailText] = useState("");
  const [recipientsText, setRecipientsText] = useState("");

// Supplier search states (chat-driven)
  const [awaitingSupplierChoice, setAwaitingSupplierChoice] = useState(false); // waiting for yes/no
  const [askingLocation, setAskingLocation] = useState(false); // waiting for location text (unified name)
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [supplierResults, setSupplierResults] = useState([]);
  const [lastCollectedInfo, setLastCollectedInfo] = useState(null);
  const [showSupplierPrompt, setShowSupplierPrompt] = useState(false); // kept for backward compatibility in some logic, but not rendered
  const [locationInput, setLocationInput] = useState("");
  // UI state for supplier-to-email action
  const [applyingSupplier, setApplyingSupplier] = useState(null);
  // ref for chat scroll container
  const chatContainerRef = useRef(null);

  // auto-scroll to bottom whenever messages (or loading) change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // use smooth behavior for nicer UX; change to 'auto' if you prefer instant jump
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } catch (e) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

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
            // mark that an email exists without marking the conversation as "over"
            setEmailGenerated(true);
            console.log("✅ Loaded briefing with generated email");
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
    if (!input.trim() || isLoading) return;

    // allow user to reply to supplier prompts even after an email was generated
    if (emailGenerated && !awaitingSupplierChoice && !askingLocation && !searchingSuppliers) {
      // if an email exists and there is no active supplier flow, still allow normal chat;
      // do not treat email generation as conversation end — so do NOT block here.
    }

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    appendMessage({ role: "User", content: userInput });

    // If we're waiting for a simple yes/no supplier choice
    if (awaitingSupplierChoice) {
      const normalized = userInput.toLowerCase().trim();
      if (["yes", "y"].includes(normalized)) {
        await handleSupplierSearch("yes");
      } else if (["no", "n"].includes(normalized)) {
        await handleSupplierSearch("no");
      } else {
        appendMessage({ role: "AI", content: "Please reply with 'yes' or 'no'." });
      }
      setIsLoading(false);
      return;
    }

    // If we're waiting for a location input from the user
    if (askingLocation) {
      const locationText = userInput;
      await handleSupplierSearch("location-submitted", locationText);
      setIsLoading(false);
      return;
    }

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

        // mark that an email has been generated (conversation remains open)
        setEmailGenerated(true);
        setLastCollectedInfo(data.collectedInfo);
        // Ask supplier question inside the chat (users reply in-chat)
        appendMessage({
          role: "AI",
          content:
            "Would you like me to search for potential suppliers that match this request? Reply with 'yes' or 'no'.",
        });
        setAwaitingSupplierChoice(true);
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
    setEmailGenerated(false);
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
  // (duplicate declarations removed — states are declared above)

  // Apply selected supplier to the most recent generated Email message.
  // This will prepend a "To: Name <email>" header and try to personalise the greeting.
  const applySupplierToEmail = (supplier) => {
    if (!supplier) return;
    // find last Email message index
    const lastEmailIndex = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "Email") return i;
      }
      return -1;
    })();

    if (lastEmailIndex === -1) {
      alert("No generated email found. Generate the email first and then apply a supplier.");
      return;
    }

    setApplyingSupplier(supplier.contact_email || supplier.name || "applying");

    setMessages((prev) => {
      const updated = [...prev];
      const original = updated[lastEmailIndex].content || "";

      // Build header
      const headerParts = [];
      if (supplier.name) headerParts.push(supplier.name);
      if (supplier.contact_email) headerParts.push(`<${supplier.contact_email}>`);
      const header = headerParts.length ? `To: ${headerParts.join(" ")}\n\n` : "";

      // Try to personalise greeting: replace common salutations or insert after first newline
      let newEmail = original;
      // replace "Dear Sir/Madam" or "Dear," with "Dear {Name},"
      if (supplier.name) {
        newEmail = newEmail.replace(/Dear\s+([A-Za-z'\- ]+)?[,:\n]/i, `Dear ${supplier.name},\n`);
        if (newEmail === original) {
          // if no greeting replaced, insert a personalised greeting after any subject line
          const afterSubject = newEmail.replace(/^Subject:[^\n]*\n+/i, (m) => m + `Dear ${supplier.name},\n\n`);
          if (afterSubject !== newEmail) newEmail = afterSubject;
        }
      }

      // Prepend header if not already present
      if (!original.startsWith("To:") && header) {
        newEmail = `${header}${newEmail}`;
      }

      updated[lastEmailIndex] = {
        ...updated[lastEmailIndex],
        content: newEmail,
      };

      // persist
      saveChatToSupabase(updated);
      return updated;
    });

    setTimeout(() => setApplyingSupplier(null), 800);
  };

  // NEW: send the generated email (with optional supplier metadata) to a fixed inbox
  const sendGeneratedEmailToQuotely = async (supplier) => {
    if (!briefingId) {
      alert("Briefing not initialized");
      return;
    }
    const body = getGeneratedEmail();
    if (!body || !body.trim()) {
      alert("No generated email found. Generate the email first.");
      return;
    }

    setApplyingSupplier(supplier?.contact_email || supplier?.name || "sending");
    try {
      const payload = {
        briefingId,
        subject: `Quote Request${supplier?.name ? ` — ${supplier.name}` : ""}`,
        // include selected supplier info at top for context
        body:
          `${supplier?.name || ""}${supplier?.contact_email ? ` <${supplier.contact_email}>` : ""}${supplier?.phone ? ` • ${supplier.phone}` : ""}\n\n` +
          body,
        recipients: ["quotelybriefings@gmail.com"],
        isHtml: false,
      };

      const res = await fetch(`${API_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.details || `Status ${res.status}`);
      }

      appendMessage({
        role: "AI",
        content: `✅ Sent generated request to quotelybriefings@gmail.com for ${supplier?.name || supplier?.contact_email || "selected supplier"}.`,
      });
    } catch (err) {
      console.error("Send to quotely failed:", err);
      appendMessage({
        role: "AI",
        content: `❌ Failed to send to quotelybriefings@gmail.com: ${err.message || String(err)}`,
      });
    } finally {
      setApplyingSupplier(null);
    }
  };

  // --- NEW: handle supplier search
  const handleSupplierSearch = async (choice, locationInputFromUser = null) => {
    // choice: "yes" | "no" | "location-submitted"
    // locationInputFromUser: optional free-text location supplied by the user
    setShowSupplierPrompt(false);
    if (!lastCollectedInfo) return;

    // If user declines
    if (choice === "no") {
      appendMessage({ role: "AI", content: "Okay — not searching for suppliers right now." });
      setAwaitingSupplierChoice(false);
      setAskingLocation(false);
      setLastCollectedInfo(null);
      return;
    }

    // If user accepted but we don't have a delivery location yet, ask for it in chat
    if (choice === "yes" && !lastCollectedInfo.location && !locationInputFromUser) {
      appendMessage({
        role: "AI",
        content:
          "Where should I look for suppliers? Please provide a city, region, or postal code (or type 'any').",
      });
      setAwaitingSupplierChoice(false);
      setAskingLocation(true);
      return;
    }

    // Determine location to search
    const location = locationInputFromUser || lastCollectedInfo.location || null;

    setSearchingSuppliers(true);
    try {
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

      // parse queries into usable entries for send boxes
      const parseQueryItem = (q) => {
        if (!q) return { name: null, contact_email: null, phone: null, website: null, note: null };
        if (typeof q === "object") {
          return {
            name: q.name || q.title || null,
            contact_email: q.contact_email || q.email || null,
            phone: q.phone || null,
            website: q.website || null,
            note: q.note || null,
          };
        }
        // q is a string — try to extract email, name, phone, website
        const emailMatch = q.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
        const nameMatch = q.match(/name["']?\s*[:=]\s*["']?([^"|,]+)/i) || q.match(/"name":\s*"([^"]+)"/i);
        const websiteMatch = q.match(/https?:\/\/[^\s,|"]+/i);
        const phoneMatch = q.match(/(\+\d[\d\s-]{6,}|\d{7,})/);
        return {
          name: nameMatch ? nameMatch[1].trim() : null,
          contact_email: emailMatch ? emailMatch[1].trim() : null,
          phone: phoneMatch ? phoneMatch[1].trim() : null,
          website: websiteMatch ? websiteMatch[0] : null,
          note: q,
        };
      };

      const parsedQueries = (queries || [])
        .map(parseQueryItem)
        // keep only entries that have at least one useful value
        .filter((q) => q.name || q.contact_email || q.phone || q.website);

      // populate supplierResults from parsed queries (this drives the UI send boxes)
      setSupplierResults(parsedQueries);

      // DO NOT append the queries text into the chat — only show the boxes
      // (supplierResults contains the parsed query entries)
      if (typeof onSuppliersFound === "function") {
        try {
          onSuppliersFound({ suppliers, queries, collectedInfo: lastCollectedInfo });
        } catch (e) {
          console.warn("onSuppliersFound handler error:", e);
        }
      }
    } catch (err) {
      console.error("Supplier search failed:", err);
      appendMessage({ role: "AI", content: `❌ Supplier search failed: ${err.message || String(err)}` });
    } finally {
      setSearchingSuppliers(false);
      setAskingLocation(false);
      setAwaitingSupplierChoice(false);
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

      <div
        ref={chatContainerRef}
        className="mb-4 h-64 sm:h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900"
      >
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

        {/* Render supplier results as small cards with "Apply to Email" action */}
        {supplierResults && supplierResults.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {supplierResults.map((s, i) => {
              return (
                <div
                  key={i}
                  className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white break-words">
                        {s.name || "Unnamed"}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        {/* render only non-null contact fields */}
                        {s.contact_email && (
                          <div>
                            <strong className="text-xs text-gray-500">Email:</strong>{" "}
                            <span className="break-words">{s.contact_email}</span>
                          </div>
                        )}
                        {s.phone && (
                          <div>
                            <strong className="text-xs text-gray-500">Phone:</strong>{" "}
                            <span className="break-words">{s.phone}</span>
                          </div>
                        )}
                        {s.website && (
                          <div>
                            <strong className="text-xs text-gray-500">Website:</strong>{" "}
                            <span className="break-words">{s.website}</span>
                          </div>
                        )}
                        {s.note && (
                          <div>
                            <strong className="text-xs text-gray-500">Note:</strong>{" "}
                            <span className="break-words">{s.note}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={() => sendGeneratedEmailToQuotely(s)}
                        className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                        disabled={applyingSupplier !== null}
                        title="Send generated email to quotelybriefings@gmail.com with this supplier context"
                      >
                        {applyingSupplier === (s.contact_email || s.name) ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              : emailGenerated
              ? "Email generated — reply 'yes' or 'no' for supplier search, or continue the conversation"
              : "Type your answer..."
          }
          // only disable while loading (allow free chat after email generated)
          disabled={isLoading}
        />
        <button
          className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors ${
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

      {emailGenerated && (
        <button
          onClick={resetConversation}
          className="mt-4 w-full px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-semibold"
        >
          🔄 Start New Request
        </button>
      )}

    </div>
  );
}
