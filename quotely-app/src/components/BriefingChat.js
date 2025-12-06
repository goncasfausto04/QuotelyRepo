// BriefingChat.js
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";

export default function BriefingChat({
  briefingId: initialBriefingId,
  onSuppliersFound,
  onEmailGenerated,
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
  const [emailGenerated, setEmailGenerated] = useState(false);

  // Supplier search states (chat-driven)
  const [awaitingSupplierChoice, setAwaitingSupplierChoice] = useState(false); // waiting for yes/no
  const [askingLocation, setAskingLocation] = useState(false); // waiting for location text (unified name)
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [supplierResults, setSupplierResults] = useState([]);
  const [locationInput, setLocationInput] = useState("");
  // UI state for supplier-to-email action
  const [applyingSupplier, setApplyingSupplier] = useState(null);
  // ref for chat scroll container
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Add this state to store collectedInfo from email generation:
  const [collectedInfo, setCollectedInfo] = useState(null);

  // Prompts for supplier flow
  const SUPPLIER_PROMPT_YESNO = {
    role: "SupplierSearchPrompt",
    content:
      "Would you like me to search for potential suppliers that match this request? Reply 'yes' or 'no'.",
    askingLocation: false,
    retryMode: false,
  };

  const SUPPLIER_PROMPT_RETRY = {
    role: "SupplierSearchPrompt",
    content:
      "Would you like to try searching again? Reply 'yes' to try again or 'no' to skip.",
    askingLocation: false,
    retryMode: true,
  };

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

  // Auto-focus input when not loading and not in special states
  useEffect(() => {
    // Auto-focus input when not loading and not in special states
    if (!isLoading && !awaitingSupplierChoice && !askingLocation && !emailGenerated && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading, awaitingSupplierChoice, askingLocation, emailGenerated]);

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

          // Check if conversation is complete (email was generated)
          const hasEmail = data.chat.some((msg) => msg.role === "Email");
          if (hasEmail) {
            // mark that an email exists without marking the conversation as "over"
            setEmailGenerated(true);
            console.log("✅ Loaded briefing with generated email");
          }

          // Load supplier results from chat messages
          const supplierMessages = data.chat.filter((msg) => msg.role === "SupplierResults");
          if (supplierMessages.length > 0) {
            // Use the most recent supplier results
            const latestSuppliers = supplierMessages[supplierMessages.length - 1];
            try {
              const suppliers = JSON.parse(latestSuppliers.content);
              setSupplierResults(suppliers);
              console.log("✅ Restored supplier results from chat");
            } catch (e) {
              console.warn("Failed to parse saved supplier results:", e);
            }
          }

          // if has email but no supplier results, show supplier prompt
          if (hasEmail && supplierMessages.length === 0) {
            setAwaitingSupplierChoice(true);
            appendMessage(SUPPLIER_PROMPT_YESNO);
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

  // Helpers for sending email
  const getGeneratedEmail = () => {
    // find last message with role === 'Email'
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "Email" && messages[i].content) return messages[i].content;
    }
    return "";
  };

  // Main message sending function
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // If email was generated, only allow supplier search interactions
    if (emailGenerated && !awaitingSupplierChoice && !askingLocation && !searchingSuppliers) {
      appendMessage({ role: "User", content: input.trim() });
      setInput("");
      appendMessage({ 
        role: "AI", 
        content: "The briefing is complete and email has been generated. Use the 'Start New Request' button to create a new quote request, or use the supplier search options above." 
      });
      return;
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

    // ✅ ADDITIONAL SAFETY: If somehow email is generated but we're not in supplier flow, block
    if (emailGenerated) {
      appendMessage({ 
        role: "AI", 
        content: "This briefing is complete. Please use 'Start New Request' to create a new quote request." 
      });
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
        
        // ✅ SAVE collectedInfo for later use in supplier search
        setCollectedInfo(data.collectedInfo);

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

          if (typeof onEmailGenerated === "function") {
            try {
              onEmailGenerated(emailPayload.email, data.collectedInfo);
            } catch (e) {
              console.warn("onEmailGenerated error:", e);
            }
          }
        } catch (err) {
          console.error("Email generation failed:", err);
          appendMessage({
            role: "AI",
            content: `❌ Email generation failed: ${err.message || String(err)}`,
          });
        }

        // mark that an email has been generated (conversation remains open for supplier search only)
        setEmailGenerated(true);
        // Show the supplier choice buttons and save state to chat
        setAwaitingSupplierChoice(true);
        
        // ✅ UPDATE database flag
        await supabase
          .from("briefings")
          .update({ conversation_finished: true })
          .eq("id", briefingId);

        // Persist supplier search prompt state to chat
        appendMessage({
          ...SUPPLIER_PROMPT_YESNO,
          // This message won't be visible in the UI - it's just for state persistence
        });
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
    // ✅ UPDATE database flag when resetting
    supabase
      .from("briefings")
      .update({ conversation_finished: false })
      .eq("id", briefingId);

    setIsConversationStarted(false);
    setEmailGenerated(false);
    setCollectedInfo(null);
    // ✅ RESET: Clear supplier search states
    setAwaitingSupplierChoice(false);
    setAskingLocation(false);
    setSearchingSuppliers(false);
    setSupplierResults([]);
    // Clear any persisted search retry state
    setMessages((prev) => {
      const updated = prev.filter(msg => msg.role !== "SupplierSearchPrompt");
      saveChatToSupabase(updated);
      return updated;
    });
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

  // Apply selected supplier to the most recent generated Email message.
  // This will prepend a "To: Name <email>" header and try to personalise the greeting.

  // not used for now since we are auto sending to quotely but wll be used later
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

  // send the generated email to a fixed inbox
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

  // handle supplier search
  const handleSupplierSearch = async (choice, locationInputFromUser = null) => {
    // choice: "yes" | "no" | "location-submitted"

    if (choice === "no") {
      appendMessage({ role: "AI", content: "Okay — not searching for suppliers right now." });
      setAwaitingSupplierChoice(false);
      setAskingLocation(false);
      return;
    }

    // If user said "yes" but hasn't provided location yet, ask for it
    if (choice === "yes" && !locationInputFromUser) {
      appendMessage({
        role: "AI",
        content: "Where should I look for suppliers? Please provide a city, region, or postal code (or type 'any').",
      });
      setAwaitingSupplierChoice(false);
      setAskingLocation(true);
      return;
    }

    // Now we have location, proceed with search
    const location = locationInputFromUser || "any";
    setSearchingSuppliers(true);
    setAwaitingSupplierChoice(false);
    setAskingLocation(false);

    try {
      appendMessage({ 
        role: "AI", 
        content: `🔎 Searching for suppliers${location !== "any" ? ` near ${location}` : ""}...` 
      });

      // ✅ Use saved collectedInfo from email generation, or reconstruct from chat
      let effectiveCollectedInfo = collectedInfo;
      
      // If no collectedInfo, fetch conversation_state from database
      if (!effectiveCollectedInfo) {
        console.log("📂 Fetching conversation_state from database...");
        
        const { data, error } = await supabase
          .from("briefings")
          .select("conversation_state")
          .eq("id", briefingId)
          .single();

        if (error || !data?.conversation_state) {
          throw new Error("No briefing data available. Please complete the conversation first.");
        }

        effectiveCollectedInfo = {
          description: data.conversation_state.description,
          conversationHistory: data.conversation_state.history,
        };

        console.log("✅ Loaded conversation_state from database");
      }

      if (!effectiveCollectedInfo?.description) {
        throw new Error("No briefing data available");
      }

      // ✅ NOW search suppliers with collectedInfo
      const res = await fetch(`${API_URL}/search-suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingId,
          collectedInfo: effectiveCollectedInfo,
          location: location !== "any" ? location : "",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      const results = Array.isArray(payload.suppliers) ? payload.suppliers : [];

      // Normalize results
      const mapped = results
        .map((r) => ({
          name: r.name || r.title || null,
          contact_email: r.contact_email || r.email || null,
          phone: r.phone || null,
          website: r.website || r.url || r.link || null,
          note: r.note || r.content || "",
        }))
        .filter((s) => s.name || s.contact_email || s.website || s.phone);

      if (mapped.length === 0) {
        appendMessage({ 
          role: "AI", 
          content: "❌ No suppliers found. Would you like to try again with different criteria?" 
        });
        setAwaitingSupplierChoice(true);
        return;
      }

      appendMessage({ 
        role: "AI", 
        content: `✅ Found ${mapped.length} potential suppliers:` 
      });
      setSupplierResults(mapped);

      // Persist supplier results for reloads
      appendMessage({
        role: "SupplierResults",
        content: JSON.stringify(mapped),
      });

      if (typeof onSuppliersFound === "function") {
        try {
          onSuppliersFound(mapped);
        } catch (e) {
          console.warn("onSuppliersFound error:", e);
        }
      }
    } catch (err) {
      console.error("Supplier search failed:", err);
      appendMessage({ 
        role: "AI", 
        content: `❌ Search failed: ${err.message}. Try again?` 
      });
      setAwaitingSupplierChoice(true);
    } finally {
      setSearchingSuppliers(false);
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
        {messages
          .filter((msg) => {
            // Always hide SupplierResults (they're shown as cards below)
            if (msg.role === "SupplierResults") return false;
            // Hide SupplierSearchPrompt UNLESS we're actively waiting for a choice
            // (this keeps the state but makes it invisible until needed)
            if (msg.role === "SupplierSearchPrompt") return false;
            return true;
          })
          .map((msg, idx) => (
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

        {/* Render supplier results as small cards with "Send" action */}
        {supplierResults && supplierResults.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {/* Header with Search Again button */}
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                ✅ Found {supplierResults.length} supplier{supplierResults.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setSupplierResults([]);
                  setAwaitingSupplierChoice(true);
                  appendMessage({ ...SUPPLIER_PROMPT_RETRY });
                  handleSupplierSearch("yes");
                }}
                disabled={searchingSuppliers || awaitingSupplierChoice}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                🔍 Search Again
              </button>
            </div>

            {/* Supplier cards - vertical boxes */}
            {supplierResults.map((s, i) => (
              <div
                key={i}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 hover:shadow-md transition-shadow"
              >
                {/* Supplier name */}
                <div className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                  {s.name || "Unnamed Supplier"}
                </div>

                {/* Email/Website and Send button in one row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400 break-words flex-1">
                    {s.contact_email ? (
                      s.contact_email
                    ) : s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {s.website}
                      </a>
                    ) : (
                      "No contact info"
                    )}
                  </div>
                  <button
                    onClick={() => sendGeneratedEmailToQuotely(s)}
                    disabled={applyingSupplier !== null}
                    className={`px-4 py-2 text-sm rounded font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                      applyingSupplier === (s.contact_email || s.name)
                        ? "bg-green-700 text-white cursor-wait"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } ${applyingSupplier !== null ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Send generated email to quotelybriefings@gmail.com"
                  >
                    {applyingSupplier === (s.contact_email || s.name) ? "Sending..." : "Send"}
                  </button>
                </div>

                {/* Optional: show note or phone if available */}
                {(s.note || s.phone) && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {s.note && <div>{s.note}</div>}
                    {s.phone && <div>📞 {s.phone}</div>}
                  </div>
                )}
              </div>
            ))}
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

        {/* YES/NO buttons for supplier search prompt - ALWAYS SHOW when awaiting choice */}
        {awaitingSupplierChoice && (
          <div className="my-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
            <p className="text-blue-900 dark:text-blue-100 mb-3 font-medium">
              {/* Check if we have a retry prompt persisted */}
              {messages.some(m => m.role === "SupplierSearchPrompt" && m.retryMode)
                ? "Would you like to try searching for suppliers again with different criteria?"
                : "Would you like me to search for potential suppliers that match this request?"
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSupplierSearch("yes")}
                disabled={searchingSuppliers}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Yes, search
              </button>
              <button
                onClick={() => handleSupplierSearch("no")}
                disabled={searchingSuppliers}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                No, thanks
              </button>
            </div>
          </div>
        )}

        {/* LOCATION INPUT BOX: appears after user accepts supplier search */}
        {askingLocation && (
          <div className="my-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
            <p className="text-green-900 dark:text-green-100 mb-2 font-medium">
              Where should I look for suppliers? Enter a city, region, or postal code (or type "any").
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g., Lisbon, Benfica or type 'any'"
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => {
                  const loc = (locationInput || "any").trim() || "any";
                  // submit location and clear input
                  handleSupplierSearch("location-submitted", loc);
                  setLocationInput("");
                }}
                disabled={searchingSuppliers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
              <button
                onClick={() => {
                  // cancel location entry and return to Yes/No prompt
                  setAskingLocation(false);
                  setAwaitingSupplierChoice(true);
                  setLocationInput("");
                  // persist state change to avoid stale askingLocation flag
                  setMessages((prev) => {
                    const updated = prev.map(msg =>
                      msg.role === "SupplierSearchPrompt" ? { ...msg, askingLocation: false } : msg
                    );
                    saveChatToSupabase(updated);
                    return updated;
                  });
                }}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          className="w-full sm:flex-1 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none mb-2 sm:mb-0"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isLoading
              ? "Please wait..."
              : emailGenerated
              ? "Conversation complete. Use 'Start New Request' to begin again."
              : !isConversationStarted
              ? "e.g., I need 100 custom t-shirts with my logo"
              : awaitingSupplierChoice
              ? "Use the buttons above to choose supplier search"
              : askingLocation
              ? "Enter location for supplier search..."
              : "Type your answer..."
          }
          // not allow input when loading, email generated, or in supplier choice flow
          disabled={isLoading || emailGenerated || awaitingSupplierChoice || askingLocation}
        />
        <button
          className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors ${
            isLoading || !input.trim() || emailGenerated || awaitingSupplierChoice || askingLocation
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
           }`}
           onClick={sendMessage}
           // ✅ KEEP !input.trim() here — only disable Send button if input is empty
           disabled={isLoading || !input.trim() || emailGenerated || awaitingSupplierChoice || askingLocation}
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
