import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import {
  Mail,
  RefreshCw,
  Check,
  X,
  Reply,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
} from "lucide-react";

export default function BriefingInbox({ briefingId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // Fetch emails for this briefing
  const fetchEmails = useCallback(async () => {
    if (!briefingId) return;

    try {
      const res = await fetch(`${API_URL}/api/briefings/${briefingId}/emails`);
      if (!res.ok) {
        throw new Error(`Failed to fetch emails: ${res.status}`);
      }
      const data = await res.json();

      // Get email statuses from database
      const { data: statusData } = await supabase
        .from("email_statuses")
        .select("*")
        .eq("briefing_id", briefingId);

      const statusMap = {};
      (statusData || []).forEach((s) => {
        statusMap[s.message_id] = s;
      });

      // Merge status with emails
      const emailsWithStatus = (data.emails || []).map((email) => ({
        ...email,
        status: statusMap[email.id]?.status || "pending",
        notes: statusMap[email.id]?.notes || "",
      }));

      // Sort by date, newest first
      emailsWithStatus.sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );

      setEmails(emailsWithStatus);
    } catch (err) {
      console.error("Error fetching emails:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [briefingId, API_URL]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails();
  };

  const updateEmailStatus = async (messageId, status) => {
    try {
      const { error: upsertError } = await supabase
        .from("email_statuses")
        .upsert(
          {
            briefing_id: briefingId,
            message_id: messageId,
            status: status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "briefing_id,message_id" }
        );

      if (upsertError) throw upsertError;

      // Update local state
      setEmails((prev) =>
        prev.map((email) =>
          email.id === messageId ? { ...email, status } : email
        )
      );
    } catch (err) {
      console.error("Error updating email status:", err);
      alert("Failed to update status");
    }
  };

  const handleApprove = (messageId) => updateEmailStatus(messageId, "approved");
  const handleReject = (messageId) => updateEmailStatus(messageId, "rejected");

  const handleReply = async (email) => {
    if (!replyText.trim()) {
      alert("Please enter a reply message");
      return;
    }

    setSendingReply(true);
    try {
      const res = await fetch(`${API_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingId,
          subject: `Re: ${email.subject || "Quote Request"}`,
          body: replyText,
          recipients: [email.from],
          isHtml: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to send reply");
      }

      alert("Reply sent successfully!");
      setReplyingTo(null);
      setReplyText("");
      
      // Refresh to get the sent reply in the thread
      await fetchEmails();
    } catch (err) {
      console.error("Error sending reply:", err);
      alert(`Failed to send reply: ${err.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  const toggleExpand = (emailId) => {
    setExpandedEmail(expandedEmail === emailId ? null : emailId);
    if (replyingTo === emailId) {
      setReplyingTo(null);
      setReplyText("");
    }
  };

  const toggleReply = (emailId) => {
    setReplyingTo(replyingTo === emailId ? null : emailId);
    setReplyText("");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
            <Check size={12} /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
            <X size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  // approve -> analyze -> insert quote -> mark approved
  const approveAndAnalyze = async (email) => {
    if (!email || !briefingId) return;
    setRefreshing(true);
    try {
      // mark approved locally/UI first
      await updateEmailStatus(email.id, "approved");

      // call server analyze endpoint
      const res = await fetch(`${API_URL}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: email.body, briefingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("Analyze failed:", data);
        throw new Error(data.details || data.error || `Status ${res.status}`);
      }

      // parse analysis (server returns analysis as JSON string or object)
      let analysis = data.analysis || null;
      if (typeof analysis === "string") {
        try {
          analysis = JSON.parse(analysis);
        } catch (e) {
          // fallback: keep raw string
        }
      }

      // insert into quotes table
      const insertRow = {
        briefing_id: briefingId,
        raw_email_text: email.body,
        analysis_json: analysis,
        supplier_name: analysis?.supplier_name || null,
        contact_email: analysis?.contact_email || null,
        total_price: analysis?.total_price || null,
        currency: analysis?.currency || null,
        lead_time_days: analysis?.lead_time_days || null,
        input_method: "email",
        submitted_by: "supplier",
        message_id: email.id,
      };

      const { error: insertErr } = await supabase.from("quotes").insert(insertRow);
      if (insertErr) {
        console.warn("Failed to insert quote:", insertErr);
        throw insertErr;
      }

      // refresh inbox and quotes UI
      await fetchEmails();
    } catch (err) {
      console.error("Approve+analyze error:", err);
      alert("Failed to analyze and save quote: " + (err.message || err));
    } finally {
      setRefreshing(false);
    }
  };

  // delete rejected email status (permanent remove from statuses)
  const deleteRejected = async (messageId) => {
    if (!messageId || !briefingId) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("Permanently delete this rejected email from inbox records?")) return;
    try {
      const { error: delErr } = await supabase
        .from("email_statuses")
        .delete()
        .match({ briefing_id: briefingId, message_id: messageId });

      if (delErr) throw delErr;

      // remove from UI
      setEmails((prev) => prev.filter((e) => e.id !== messageId));
    } catch (err) {
      console.error("Failed to delete rejected email status:", err);
      alert("Delete failed: " + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-100">Error Loading Inbox</h3>
          <p className="text-red-700 dark:text-red-200 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={20} />
              Email Inbox
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {emails.length} email{emails.length !== 1 ? "s" : ""} in this thread
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              refreshing
                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Mail className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No emails yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            When suppliers reply to your quote requests, their emails will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <div
              key={email.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Email Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                onClick={() => toggleExpand(email.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {email.from || "Unknown Sender"}
                      </span>
                      {getStatusBadge(email.status)}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 truncate">
                      {email.subject || "(No subject)"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {email.date
                        ? new Date(email.date).toLocaleString()
                        : "Unknown date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedEmail === email.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Preview snippet when collapsed */}
                {expandedEmail !== email.id && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {email.snippet || email.body?.slice(0, 150) || "No preview available"}
                  </p>
                )}
              </div>

              {/* Expanded Content */}
              {expandedEmail === email.id && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {/* Email Body */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
                      {email.body || email.snippet || "No content"}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-gray-100 dark:bg-gray-700/50 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approveAndAnalyze(email);
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        email.status === "approved"
                          ? "bg-green-600 text-white"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                      }`}
                    >
                      <Check size={16} />
                      Approve
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(email.id);
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        email.status === "rejected"
                          ? "bg-red-600 text-white"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                      }`}
                    >
                      <X size={16} />
                      Reject
                    </button>

                    {email.status === "rejected" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRejected(email.id);
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300"
                      >
                        Delete
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReply(email.id);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                    >
                      <Reply size={16} />
                      Reply
                    </button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === email.id && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="mb-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                          Reply to: {email.from}
                        </label>
                        <textarea
                          className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(email)}
                          disabled={sendingReply || !replyText.trim()}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                            sendingReply || !replyText.trim()
                              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <Send size={16} />
                          {sendingReply ? "Sending..." : "Send Reply"}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          className="px-4 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
