// Analyze tab: add a quote from a pasted email, a PDF, or by hand.

import { useCallback, useEffect, useState } from "react";
import { FileText, Upload, Link as LinkIcon } from "lucide-react";
import { apiFetch } from "../../api.js";
import { analyzeEmailText, analyzePdf, insertQuote, listQuotes, deleteQuote } from "../../lib/quotes.js";
import Notice from "../ui/Notice.js";
import EmailInput from "./EmailInput.js";
import PdfInput from "./PdfInput.js";
import ManualQuoteForm from "./ManualQuoteForm.js";
import SavedQuoteSummary from "./SavedQuoteSummary.js";
import QuoteList from "./QuoteList.js";
import SupplierLinkModal from "./SupplierLinkModal.js";

const MODES = [
  ["email", "Email", FileText],
  ["pdf", "PDF", Upload],
  ["manual", "Manual", null],
];

export default function QuoteAnalysis({ briefingId }) {
  const [mode, setMode] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [supplierLink, setSupplierLink] = useState(null);
  const compareHref = `/briefingpage?briefing=${briefingId}&tab=compare`;

  const refresh = useCallback(async () => {
    setLoadingQuotes(true);
    try {
      setQuotes(await listQuotes(briefingId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingQuotes(false);
    }
  }, [briefingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wraps a save action; returns true on success so inputs can clear themselves
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const quote = await fn();
      setSaved(quote);
      setQuotes((prev) => [quote, ...prev]);
      return true;
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const fromEmail = (text) =>
    run(async () => insertQuote(briefingId, await analyzeEmailText(text), { raw_email_text: text, input_method: "email", submitted_by: "user" }));

  const fromPdf = (file) =>
    run(async () => {
      const { analysis, pdfUrl } = await analyzePdf(briefingId, file);
      return insertQuote(briefingId, analysis, { pdf_file_url: pdfUrl, input_method: "pdf", submitted_by: "user" });
    });

  const manual = (quote) => run(() => insertQuote(briefingId, quote, { input_method: "manual_user", submitted_by: "user" }));

  const remove = async (q) => {
    if (!window.confirm(`Delete the quote from ${q.supplier_name || "this supplier"}?`)) return;
    try {
      await deleteQuote(q.id);
      setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  };

  const openSupplierLink = async () => {
    try {
      const data = await apiFetch("/api/generate-supplier-link", { method: "POST", json: { briefingId }, retry: true });
      setSupplierLink(data.supplierLink);
    } catch (err) {
      setError(`Couldn't create the supplier link: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {supplierLink && <SupplierLinkModal link={supplierLink} onClose={() => setSupplierLink(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">➕ Add a quote</h3>
            <button onClick={openSupplierLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700">
              <LinkIcon size={14} /> Supplier form link
            </button>
          </div>

          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {MODES.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex-1 py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 ${
                  mode === id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {Icon ? <Icon size={16} /> : "✍️"} {label}
              </button>
            ))}
          </div>

          {mode === "email" && <EmailInput busy={busy} onAnalyze={fromEmail} />}
          {mode === "pdf" && <PdfInput busy={busy} onAnalyze={fromPdf} />}
          {mode === "manual" && <ManualQuoteForm busy={busy} onSave={manual} />}

          {error && (
            <div className="mt-6">
              <Notice type="error" onClose={() => setError(null)}>
                {error}
              </Notice>
            </div>
          )}
          {saved && <SavedQuoteSummary quote={saved} compareHref={compareHref} />}
        </div>

        <QuoteList quotes={quotes} loading={loadingQuotes} onRefresh={refresh} onDelete={remove} compareHref={compareHref} />
      </div>
    </div>
  );
}
