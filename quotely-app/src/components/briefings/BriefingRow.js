import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Edit2, Trash2, X, Check } from "lucide-react";

export default function BriefingRow({ briefing: b, onRename, onDelete }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(b.title || "");
  const open = () => navigate(`/briefingpage?briefing=${b.id}`);
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  const save = async () => {
    if (!title.trim()) return;
    if (await onRename(b.id, title.trim())) setEditing(false);
  };

  return (
    <tr onClick={() => !editing && open()} className={editing ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"}>
      <td className="px-6 py-4">
        {editing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button onClick={save} className="p-2 text-green-600 hover:bg-green-100 rounded-lg" title="Save">
              <Check size={18} />
            </button>
            <button onClick={() => setEditing(false)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg" title="Cancel">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
              <FileText className="text-blue-600 dark:text-blue-400" size={16} />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{b.title || "Untitled Briefing"}</span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(b.created_at).toLocaleDateString()}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold">
          {b.quoteCount}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-2">
          <button onClick={stop(open)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="Open">
            <Eye size={18} />
          </button>
          <button onClick={stop(() => setEditing(true))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Rename">
            <Edit2 size={18} />
          </button>
          <button onClick={stop(() => onDelete(b))} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
