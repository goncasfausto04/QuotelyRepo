import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function SupplierLinkModal({ link, onClose }) {
  const [copied, setCopied] = useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`;

  const copy = async () => {
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Supplier quote form</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Suppliers can submit a quote here without an account. It's also added to emails sent from the Inbox.</p>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600 mb-4 break-all text-sm text-gray-900 dark:text-gray-100">{link}</div>
        <img src={qr} alt="QR code for the supplier link" className="w-48 h-48 mx-auto mb-4 border border-gray-200 rounded-lg bg-white" />
        <div className="flex gap-3">
          <button onClick={copy} className="btn-primary flex-1">
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy link"}
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
