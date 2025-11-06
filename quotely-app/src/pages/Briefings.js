import React from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { useEffect, useState } from "react";


const Briefings = () => {
  // Sample data - will be replaced with real data later

  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("user_auth_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching briefings:", error);
      else setBriefings(data);
      setLoading(false);
    };

    fetchBriefings();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border border-green-100";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border border-yellow-100";
      case "completed":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      case "archived":
        return "bg-gray-50 text-gray-700 border border-gray-100";
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Briefings</h1>
          <p className="text-gray-500">Manage and track all your briefings</p>
        </div>
        <Link to="/briefings/create-briefing">
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Briefing
          </button>
        </Link>
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">All Briefings</h2>
          <p className="text-sm text-gray-500">
            View and manage your briefing requests
          </p>
        </div>
        <div className="p-6">
          {briefings.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No briefings yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first briefing to start receiving quotes from
                suppliers
              </p>
              <Link to="/briefings/create-briefing">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Create Briefing
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-600">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Quotes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {briefings.map((briefing) => (
                    <tr key={briefing.id} className="border-t">
                      <td className="px-4 py-3 font-medium">
                        {briefing.title}
                      </td>
                      <td className="px-4 py-3">{briefing.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusColor(
                            briefing.status
                          )}`}
                        >
                          {briefing.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(briefing.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {" "}
                        <span className="font-semibold">
                          {briefing.quotesReceived}
                        </span>{" "}
                        quotes
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/briefingpage?briefing=${briefing.id}`}>
                            <button
                              className="p-2 rounded hover:bg-gray-100"
                              title="View"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </button>
                          </Link>
                          <button
                            className="p-2 rounded hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            className="p-2 rounded hover:bg-gray-100"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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
    </div>
  );
};

export default Briefings;
