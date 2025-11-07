import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import {
  FileText,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

const Briefings = () => {
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [quoteCounts, setQuoteCounts] = useState({});

  useEffect(() => {
    fetchBriefings();
  }, []);

  const fetchBriefings = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch briefings
      const { data: briefingsData, error: briefingsError } = await supabase
        .from("briefings")
        .select("*")
        .eq("user_auth_id", user.id)
        .order("created_at", { ascending: false });

      if (briefingsError) throw briefingsError;

      setBriefings(briefingsData || []);

      // Fetch quote counts for each briefing
      if (briefingsData && briefingsData.length > 0) {
        const counts = {};
        for (const briefing of briefingsData) {
          const { count, error } = await supabase
            .from("quotes")
            .select("*", { count: "exact", head: true })
            .eq("briefing_id", briefing.id);

          if (!error) {
            counts[briefing.id] = count || 0;
          }
        }
        setQuoteCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching briefings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (briefing) => {
    setEditingId(briefing.id);
    setEditingTitle(briefing.title || "");
  };

  const handleSaveEdit = async (id) => {
    if (!editingTitle.trim()) {
      alert("Title cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("briefings")
        .update({ title: editingTitle.trim() })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setBriefings(
        briefings.map((b) =>
          b.id === id ? { ...b, title: editingTitle.trim() } : b
        )
      );

      setEditingId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Error updating title:", error);
      alert("Failed to update title: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDeleteClick = (briefing) => {
    setDeleteConfirm(briefing);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from("briefings")
        .delete()
        .eq("id", deleteConfirm.id);

      if (error) throw error;

      // Update local state
      setBriefings(briefings.filter((b) => b.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting briefing:", error);
      alert("Failed to delete briefing: " + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "archived":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleViewBriefing = (id) => {
    window.location.href = `/briefingpage?briefing=${id}`;
  };

  const handleCreateBriefing = () => {
    window.location.href = "/briefings/create-briefing";
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading briefings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Briefings</h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your quote requests
            </p>
          </div>
          <button
            onClick={handleCreateBriefing}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            New Briefing
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Briefings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {briefings.length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <FileText className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">
                  {briefings.filter((b) => b.status === "active").length}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Check className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Quotes</p>
                <p className="text-3xl font-bold text-purple-600">
                  {Object.values(quoteCounts).reduce(
                    (sum, count) => sum + count,
                    0
                  )}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Briefings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Briefings
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View, edit, and manage your briefing requests
            </p>
          </div>

          {briefings.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No briefings yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Create your first briefing to start receiving quotes from
                suppliers. The AI will help you craft the perfect request.
              </p>
              <button
                onClick={handleCreateBriefing}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create Your First Briefing
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quotes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {briefings.map((briefing) => (
                    <tr
                      key={briefing.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {editingId === briefing.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-1 px-3 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveEdit(briefing.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit(briefing.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {briefing.title || "Untitled Briefing"}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            briefing.status || "draft"
                          )}`}
                        >
                          {briefing.status || "draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(briefing.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {quoteCounts[briefing.id] || 0}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          quotes
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewBriefing(briefing.id)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="View briefing"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(briefing)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                            title="Edit title"
                            disabled={editingId !== null}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(briefing)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete briefing"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Delete Briefing?
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete "
                  {deleteConfirm.title || "this briefing"}"? This action cannot
                  be undone and will also delete all associated quotes.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Briefings;
