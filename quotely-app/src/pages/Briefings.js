// My briefings: list, rename, delete.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Check, BarChart3 } from "lucide-react";
import { loadBriefings, renameBriefing, deleteBriefing } from "../components/briefings/briefingsApi.js";
import BriefingRow from "../components/briefings/BriefingRow.js";
import StatCard from "../components/dashboard/StatCard.js";
import ConfirmDialog from "../components/ui/ConfirmDialog.js";
import Notice from "../components/ui/Notice.js";

const NewButton = ({ children }) => (
  <Link to="/briefings/create-briefing" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-md">
    <Plus size={20} /> {children}
  </Link>
);

export default function Briefings() {
  const [briefings, setBriefings] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBriefings()
      .then(setBriefings)
      .catch((err) => setError(err.message));
  }, []);

  const rename = async (id, title) => {
    try {
      await renameBriefing(id, title);
      setBriefings((list) => list.map((b) => (b.id === id ? { ...b, title } : b)));
      return true;
    } catch (err) {
      setError(`Rename failed: ${err.message}`);
      return false;
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteBriefing(toDelete.id);
      setBriefings((list) => list.filter((b) => b.id !== toDelete.id));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    } finally {
      setToDelete(null);
    }
  };

  if (!briefings && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const list = briefings || [];
  const totalQuotes = list.reduce((s, b) => s + b.quoteCount, 0);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My briefings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">All your quote requests</p>
          </div>
          <NewButton>New briefing</NewButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
        {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total briefings" value={list.length} icon={FileText} color="blue" />
          <StatCard label="With quotes" value={list.filter((b) => b.quoteCount > 0).length} icon={Check} color="green" />
          <StatCard label="Total quotes" value={totalQuotes} icon={BarChart3} color="purple" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {list.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No briefings yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">Create a briefing and the assistant will help you write a quote request for suppliers.</p>
              <NewButton>Create your first briefing</NewButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Title</th>
                    <th className="px-6 py-3 text-left">Created</th>
                    <th className="px-6 py-3 text-left">Quotes</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {list.map((b) => (
                    <BriefingRow key={b.id} briefing={b} onRename={rename} onDelete={setToDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toDelete && (
        <ConfirmDialog title="Delete briefing?" confirmLabel="Delete briefing" onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
          Delete <b>"{toDelete.title || "this briefing"}"</b> and all its quotes? This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
