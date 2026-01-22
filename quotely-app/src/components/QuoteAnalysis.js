import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import {
  CheckCircle,
  AlertCircle,
  Eye,
  Copy,
  Trash2,
  RefreshCw,
  Upload,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

export default function QuoteAnalysis({ briefingId, onQuoteAdded }) {
  const [inputMode, setInputMode] = useState("email"); // 'email', 'pdf', 'manual'
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [manualData, setManualData] = useState({
    supplier_name: "",
    contact_email: "",
    contact_phone: "",
    total_price: "",
    currency: "USD",
    lead_time_days: "",
    warranty_months: "",
    payment_terms: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL;
  const [savedQuote, setSavedQuote] = useState(null);
  const [existingQuotes, setExistingQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [supplierLink, setSupplierLink] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Only insert known DB columns; keep everything else in analysis_json
  const ALLOWED_DB_FIELDS = new Set([
    "supplier_name",
    "contact_email",
    "contact_phone",
    "total_price",
    "currency",
    "unit_price",
    "quantity",
    "lead_time_days",
    "delivery_date",
    "payment_terms",
    "warranty_period",
    "warranty_months",
    "shipping_cost",
    "notes",
  ]);

  const pickDbFields = (obj) => {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    for (const key of ALLOWED_DB_FIELDS) {
      if (obj[key] !== undefined) out[key] = obj[key];
    }
    return out;
  };

  // Fetch existing quotes
  useEffect(() => {
    const fetchExistingQuotes = async () => {
      if (!briefingId) return;

      setLoadingQuotes(true);
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("*")
          .eq("briefing_id", briefingId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setExistingQuotes(data || []);
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    fetchExistingQuotes();
  }, [briefingId, savedQuote]);

  // Handle Email Analysis
  const handleAnalyzeEmail = async () => {
    if (!text.trim()) {
      alert("Please paste an email to analyze");
      return;
    }

    if (!briefingId) {
      alert("No briefing selected");
      return;
    }

    setLoading(true);
    setFeedback(null);
    setSavedQuote(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: text }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const analysisResult =
        typeof data.analysis === "string"
          ? JSON.parse(data.analysis)
          : data.analysis;

      setFeedback(analysisResult);

      // Save to database
      const dbFields = pickDbFields(analysisResult);
      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          briefing_id: briefingId,
          ...dbFields,
          raw_email_text: text,
          analysis_json: analysisResult,
          input_method: "email",
          submitted_by: "user",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedQuote(insertedQuote);
      if (onQuoteAdded) onQuoteAdded(insertedQuote);
      setText("");
    } catch (err) {
      console.error("Analysis error:", err);
      setFeedback({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle PDF Analysis
  const handleAnalyzePDF = async () => {
    if (!pdfFile) {
      alert("Please select a PDF file");
      return;
    }

    if (!briefingId) {
      alert("No briefing selected");
      return;
    }

    setLoading(true);
    setFeedback(null);
    setSavedQuote(null);

    try {
      const formData = new FormData();
      formData.append("pdfFile", pdfFile);
      formData.append("briefingId", briefingId);

      const res = await fetch(`${API_URL}/api/analyze-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const analysisResult =
        typeof data.analysis === "string"
          ? JSON.parse(data.analysis)
          : data.analysis;

      setFeedback(analysisResult);

      // Save to database
      const dbFields = pickDbFields(analysisResult);
      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          briefing_id: briefingId,
          ...dbFields,
          pdf_file_url: data.pdfUrl,
          analysis_json: analysisResult,
          input_method: "pdf",
          submitted_by: "user",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedQuote(insertedQuote);
      if (onQuoteAdded) onQuoteAdded(insertedQuote);
      setPdfFile(null);
    } catch (err) {
      console.error("PDF analysis error:", err);
      setFeedback({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Entry
  const handleManualSubmit = async () => {
    if (!manualData.supplier_name || !manualData.total_price) {
      alert("Please fill in at least supplier name and total price");
      return;
    }

    if (!briefingId) {
      alert("No briefing selected");
      return;
    }

    setLoading(true);
    setFeedback(null);
    setSavedQuote(null);

    try {
      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          briefing_id: briefingId,
          supplier_name: manualData.supplier_name,
          contact_email: manualData.contact_email,
          contact_phone: manualData.contact_phone,
          total_price: parseFloat(manualData.total_price) || null,
          currency: manualData.currency,
          lead_time_days: parseInt(manualData.lead_time_days) || null,
          warranty_months: parseInt(manualData.warranty_months) || null,
          payment_terms: manualData.payment_terms,
          notes: manualData.notes,
          input_method: "manual_user",
          submitted_by: "user",
          analysis_json: manualData,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedQuote(insertedQuote);
      if (onQuoteAdded) onQuoteAdded(insertedQuote);

      // Reset form
      setManualData({
        supplier_name: "",
        contact_email: "",
        contact_phone: "",
        total_price: "",
        currency: "USD",
        lead_time_days: "",
        warranty_months: "",
        payment_terms: "",
        notes: "",
      });
    } catch (err) {
      console.error("Manual entry error:", err);
      setFeedback({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Generate Supplier Link
  const generateSupplierLink = async () => {
    if (!briefingId) {
      alert("No briefing selected");
      return;
    }

    try {
      setGeneratingLink(true);
      const res = await fetch(`${API_URL}/api/generate-supplier-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingId }),
      });

      if (!res.ok) throw new Error("Failed to generate link");

      const data = await res.json();
      setSupplierLink(data.supplierLink);
      setShowLinkModal(true);
    } catch (error) {
      console.error("Error generating link:", error);
      alert("Failed to generate supplier link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copySupplierLink = () => {
    navigator.clipboard.writeText(supplierLink);
    alert("Link copied to clipboard!");
  };

  const qrCodeUrl = supplierLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        supplierLink,
      )}`
    : null;

  // Rest of your existing functions (resetForm, copyToClipboard, confirmDelete, deleteQuote, refreshQuotes)
  const resetForm = () => {
    setText("");
    setPdfFile(null);
    setFeedback(null);
    setSavedQuote(null);
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert("Copied to clipboard!");
  };

  const confirmDelete = (quoteId, supplierName) => {
    setShowDeleteConfirm({ quoteId, supplierName });
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const deleteQuote = async () => {
    if (!showDeleteConfirm) return;

    const { quoteId } = showDeleteConfirm;

    try {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quoteId);

      if (error) throw error;

      setExistingQuotes((prev) => prev.filter((quote) => quote.id !== quoteId));
      setShowDeleteConfirm(null);
      alert("Quote deleted successfully!");
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("Failed to delete quote");
      setShowDeleteConfirm(null);
    }
  };

  const refreshQuotes = async () => {
    if (!briefingId) return;

    setLoadingQuotes(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("briefing_id", briefingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExistingQuotes(data || []);
    } catch (error) {
      console.error("Error refreshing quotes:", error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              Delete Quote?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete the quote from{" "}
              <strong>
                {showDeleteConfirm.supplierName || "Unknown Supplier"}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteQuote}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition"
              >
                Delete Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              🔗 Supplier Response Link
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this link with suppliers. They can submit quotes directly
              without logging in.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600 mb-4 break-all text-sm text-gray-900 dark:text-gray-100">
              {supplierLink}
            </div>
            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <img
                  src={qrCodeUrl}
                  alt="Supplier link QR code"
                  className="w-48 h-48 border border-gray-200 dark:border-gray-600 rounded-lg bg-white"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Scan to open the supplier submission link.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={copySupplierLink}
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition"
              >
                <Copy size={16} className="inline mr-2" />
                Copy Link
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
              📧 Quote Analysis
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Upload quotes via email, PDF, manual entry, or share a link with
              suppliers
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {briefingId && (
              <>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  📎 Briefing: {briefingId.slice(0, 8)}...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {existingQuotes.length} quote
                  {existingQuotes.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={generateSupplierLink}
                  disabled={generatingLink}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition ${
                    generatingLink
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800"
                  }`}
                >
                  {generatingLink ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon size={14} />
                      Generate Supplier Link
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Add New Quote */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              ➕ Add New Quote
            </h3>

            {/* Input Mode Selector */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <button
                onClick={() => setInputMode("email")}
                className={`flex-1 py-2 px-4 rounded-lg transition ${
                  inputMode === "email"
                    ? "bg-blue-600 dark:bg-blue-700 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                Email
              </button>
              <button
                onClick={() => setInputMode("pdf")}
                className={`flex-1 py-2 px-4 rounded-lg transition ${
                  inputMode === "pdf"
                    ? "bg-blue-600 dark:bg-blue-700 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Upload size={16} className="inline mr-2" />
                PDF
              </button>
              <button
                onClick={() => setInputMode("manual")}
                className={`flex-1 py-2 px-4 rounded-lg transition ${
                  inputMode === "manual"
                    ? "bg-blue-600 dark:bg-blue-700 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                ✍️ Manual
              </button>
            </div>

            {/* Email Input */}
            {inputMode === "email" && (
              <div className="space-y-4">
                <textarea
                  rows={8}
                  placeholder="Paste the complete email from the supplier here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <button
                  onClick={handleAnalyzeEmail}
                  disabled={loading || !text.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                    loading || !text.trim()
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                  }`}
                >
                  {loading ? "Analyzing..." : "🔍 Analyze Email"}
                </button>
              </div>
            )}

            {/* PDF Input */}
            {inputMode === "pdf" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload
                      size={48}
                      className="text-gray-400 dark:text-gray-500 mb-2"
                    />
                    <p className="text-gray-600 dark:text-gray-300">
                      {pdfFile ? pdfFile.name : "Click to upload PDF"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Max 10MB
                    </p>
                  </label>
                </div>
                <button
                  onClick={handleAnalyzePDF}
                  disabled={loading || !pdfFile}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                    loading || !pdfFile
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                  }`}
                >
                  {loading ? "Analyzing PDF..." : "🔍 Analyze PDF"}
                </button>
              </div>
            )}

            {/* Manual Input */}
            {inputMode === "manual" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Supplier Name *"
                  value={manualData.supplier_name}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      supplier_name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={manualData.contact_email}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        contact_email: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={manualData.contact_phone}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        contact_phone: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Total Price *"
                    value={manualData.total_price}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        total_price: e.target.value,
                      })
                    }
                    className="col-span-2 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <select
                    value={manualData.currency}
                    onChange={(e) =>
                      setManualData({ ...manualData, currency: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Lead Time (days)"
                    value={manualData.lead_time_days}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        lead_time_days: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <input
                    type="number"
                    placeholder="Warranty (months)"
                    value={manualData.warranty_months}
                    onChange={(e) =>
                      setManualData({
                        ...manualData,
                        warranty_months: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Payment Terms"
                  value={manualData.payment_terms}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      payment_terms: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <textarea
                  rows={3}
                  placeholder="Notes"
                  value={manualData.notes}
                  onChange={(e) =>
                    setManualData({ ...manualData, notes: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={
                    loading ||
                    !manualData.supplier_name ||
                    !manualData.total_price
                  }
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                    loading ||
                    !manualData.supplier_name ||
                    !manualData.total_price
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
                  }`}
                >
                  {loading ? "Saving..." : "💾 Save Quote"}
                </button>
              </div>
            )}

            {/* Feedback Messages */}
            {feedback && !feedback.error && !savedQuote && (
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                  👀 Analysis Preview
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <span className="font-medium">Supplier:</span>{" "}
                    {feedback.supplier_name || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span>{" "}
                    {feedback.total_price
                      ? `${feedback.currency || "USD"} ${feedback.total_price}`
                      : "—"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Business Rating:</span>{" "}
                    {feedback.business_rating_value
                      ? `${feedback.business_rating_value}/${feedback.business_rating_scale || 5}`
                      : "—"}
                    {feedback.business_reviews_count
                      ? ` • ${feedback.business_reviews_count} reviews`
                      : ""}
                    {feedback.business_rating_source
                      ? ` • ${feedback.business_rating_source}`
                      : ""}
                  </div>
                </div>
              </div>
            )}

            {savedQuote && (
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle
                    className="text-green-600 dark:text-green-400 flex-shrink-0"
                    size={20}
                  />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200">
                      Quote Saved Successfully!
                    </h4>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="mt-3 w-full py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 transition"
                >
                  Add Another Quote
                </button>
              </div>
            )}

            {feedback?.error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle
                    className="text-red-600 dark:text-red-400 flex-shrink-0"
                    size={20}
                  />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200">
                      Error
                    </h4>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      {feedback.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Existing Quotes (keep your existing code) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              📋 Analyzed Quotes ({existingQuotes.length})
            </h3>
            <button
              onClick={refreshQuotes}
              disabled={loadingQuotes}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
            >
              <RefreshCw
                size={16}
                className={loadingQuotes ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loadingQuotes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : existingQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📭</div>
              <p>No quotes analyzed yet</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {existingQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white">
                        {quote.supplier_name || "Unknown Supplier"}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(quote.created_at).toLocaleDateString()} •
                        {quote.input_method === "email" && " 📧 Email"}
                        {quote.input_method === "pdf" && " 📄 PDF"}
                        {quote.input_method === "manual_user" &&
                          " ✍️ Manual (User)"}
                        {quote.input_method === "manual_supplier" &&
                          " 🔗 Supplier Link"}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        confirmDelete(quote.id, quote.supplier_name)
                      }
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="font-medium">Price:</span>{" "}
                      {quote.total_price
                        ? `${quote.currency} ${quote.total_price}`
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium">Lead Time:</span>{" "}
                      {quote.lead_time_days
                        ? `${quote.lead_time_days} days`
                        : "—"}
                    </div>
                    {quote?.analysis_json?.business_rating_value && (
                      <div className="col-span-2">
                        <span className="font-medium">Business Rating:</span>{" "}
                        {quote.analysis_json.business_rating_value}/
                        {quote.analysis_json.business_rating_scale || 5}
                        {quote.analysis_json.business_reviews_count
                          ? ` • ${quote.analysis_json.business_reviews_count} reviews`
                          : ""}
                        {quote.analysis_json.business_rating_source
                          ? ` • ${quote.analysis_json.business_rating_source}`
                          : ""}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(quote.analysis_json, null, 2),
                        )
                      }
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                    <button
                      onClick={() => (window.location.href = "/briefingpage")}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                    >
                      <Eye size={12} />
                      Compare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {existingQuotes.length > 0 && (
            <button
              onClick={() => (window.location.href = "/briefingpage")}
              className="w-full mt-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition font-semibold"
            >
              📊 Go to Comparison Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
