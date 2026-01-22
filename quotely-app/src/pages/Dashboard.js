import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Clock,
  Users,
  Award,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBriefings: 0,
    activeBriefings: 0,
    totalQuotes: 0,
    avgQuotesPerBriefing: 0,
    recentBriefings: [],
    quoteTrends: [],
    avgResponseTime: 0,
    bestQuote: null,
    recentActivity: [],
    categoryDistribution: {},
    avgPriceByCategory: {},
    topSuppliers: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all briefings
      const { data: briefingsData, error: briefingsError } = await supabase
        .from("briefings")
        .select("*")
        .eq("user_auth_id", user.id)
        .order("created_at", { ascending: false });

      if (briefingsError) throw briefingsError;

      // Fetch all quotes for user's briefings
      const briefingIds = briefingsData?.map((b) => b.id) || [];
      let quotesData = [];
      if (briefingIds.length > 0) {
        const { data: quotes, error: quotesError } = await supabase
          .from("quotes")
          .select("*")
          .in("briefing_id", briefingIds)
          .order("created_at", { ascending: false });

        if (quotesError) throw quotesError;
        quotesData = quotes || [];
      }

      // Calculate statistics
      const totalBriefings = briefingsData?.length || 0;
      // Treat 'activeBriefings' as number of briefings that have at least one quote
      const activeBriefings =
        briefingsData?.filter((b) =>
          quotesData.some((q) => q.briefing_id === b.id)
        ).length || 0;
      const totalQuotes = quotesData.length;
      const avgQuotesPerBriefing =
        totalBriefings > 0 ? (totalQuotes / totalBriefings).toFixed(1) : 0;

      // Recent briefings (last 5)
      const recentBriefings = briefingsData?.slice(0, 5) || [];

      // Calculate average response time (days between briefing creation and first quote)
      let totalResponseTime = 0;
      let responseCount = 0;
      briefingsData?.forEach((briefing) => {
        const briefingQuotes = quotesData.filter(
          (q) => q.briefing_id === briefing.id
        );
        if (briefingQuotes.length > 0) {
          const briefingDate = new Date(briefing.created_at);
          const firstQuoteDate = new Date(briefingQuotes[0].created_at);
          const diffDays = Math.floor(
            (firstQuoteDate - briefingDate) / (1000 * 60 * 60 * 24)
          );
          totalResponseTime += diffDays;
          responseCount++;
        }
      });
      const avgResponseTime =
        responseCount > 0 ? (totalResponseTime / responseCount).toFixed(1) : 0;

      // Find best quote (lowest total_price)
      const validQuotes = quotesData.filter(
        (q) => q.total_price && !isNaN(q.total_price)
      );
      const bestQuote =
        validQuotes.length > 0
          ? validQuotes.reduce((prev, current) =>
              prev.total_price < current.total_price ? prev : current
            )
          : null;

      // Quote trends (last 7 days)
      const quoteTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const count = quotesData.filter(
          (q) => q.created_at.split("T")[0] === dateStr
        ).length;
        quoteTrends.push({ date: dateStr, count });
      }

      // Recent activity (last 10 items)
      const recentActivity = [
        ...briefingsData.map((b) => ({
          type: "briefing",
          title: b.title || "Untitled Briefing",
          created_at: b.created_at,
          id: b.id,
        })),
        ...quotesData.map((q) => ({
          type: "quote",
          supplier: q.supplier_name || "Unknown Supplier",
          price: q.total_price,
          created_at: q.created_at,
          briefing_id: q.briefing_id,
        })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

      // Category distribution
      const categoryDistribution = {};
      briefingsData?.forEach((briefing) => {
        const category = briefing.category || "Uncategorized";
        categoryDistribution[category] =
          (categoryDistribution[category] || 0) + 1;
      });

      // Average price by category
      const avgPriceByCategory = {};
      const categoryPrices = {};
      briefingsData?.forEach((briefing) => {
        const category = briefing.category || "Uncategorized";
        const briefingQuotes = quotesData.filter(
          (q) => q.briefing_id === briefing.id
        );

        if (briefingQuotes.length > 0) {
          if (!categoryPrices[category]) {
            categoryPrices[category] = { total: 0, count: 0 };
          }
          briefingQuotes.forEach((quote) => {
            if (quote.total_price && !isNaN(quote.total_price)) {
              categoryPrices[category].total += quote.total_price;
              categoryPrices[category].count += 1;
            }
          });
        }
      });

      Object.keys(categoryPrices).forEach((category) => {
        avgPriceByCategory[category] =
          categoryPrices[category].count > 0
            ? (
                categoryPrices[category].total / categoryPrices[category].count
              ).toFixed(0)
            : 0;
      });

      // Top suppliers (by quote count)
      const supplierCounts = {};
      quotesData.forEach((quote) => {
        const supplier = quote.supplier_name || "Unknown";
        supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
      });
      const topSuppliers = Object.entries(supplierCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        totalBriefings,
        activeBriefings,
        totalQuotes,
        avgQuotesPerBriefing,
        recentBriefings,
        quoteTrends,
        avgResponseTime,
        bestQuote,
        recentActivity,
        categoryDistribution,
        avgPriceByCategory,
        topSuppliers,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Status is no longer used for briefings in the UI

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's an overview of your briefings and quotes.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Briefings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Briefings
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalBriefings}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Activity className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                {stats.activeBriefings} active
              </span>
            </div>
          </div>

          {/* Total Quotes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Quotes
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalQuotes}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Target className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-gray-600 dark:text-gray-400">
                {stats.avgQuotesPerBriefing} avg per briefing
              </span>
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Response Time
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.avgResponseTime}
                  <span className="text-lg text-gray-500 ml-1">days</span>
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Faster is better
              </span>
            </div>
          </div>

          {/* Best Quote */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Best Quote Value
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.bestQuote
                    ? `$${stats.bestQuote.total_price.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <DollarSign className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-gray-600 dark:text-gray-400">
                {stats.bestQuote
                  ? stats.bestQuote.supplier_name || "Unknown"
                  : "No quotes yet"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status UI removed: briefings no longer have state */}

            {/* Quote Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Quote Activity (Last 7 Days)
              </h2>
              <div className="flex items-end justify-between h-48 space-x-2">
                {stats.quoteTrends.map((trend, index) => {
                  const maxCount = Math.max(
                    ...stats.quoteTrends.map((t) => t.count),
                    1
                  );
                  const height = (trend.count / maxCount) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div className="w-full flex items-end h-40">
                        <div
                          className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                          style={{ height: `${height}%` }}
                          title={`${trend.count} quotes`}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {new Date(trend.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {trend.count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Categories Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Most Requested Service Categories
              </h2>
              <div className="flex items-end justify-between h-48 space-x-2">
                {stats.categoryDistribution &&
                  Object.entries(stats.categoryDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count], index) => {
                      const maxCount = Math.max(
                        ...Object.values(stats.categoryDistribution),
                        1
                      );
                      const height = (count / maxCount) * 100;
                      return (
                        <div
                          key={category}
                          className="flex-1 flex flex-col items-center"
                        >
                          <div className="w-full flex items-end h-40">
                            <div
                              className="w-full bg-gradient-to-t from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-t transition-all hover:from-purple-600 hover:to-blue-600 dark:hover:from-purple-500 dark:hover:to-blue-500"
                              style={{ height: `${height}%` }}
                              title={`${count} ${
                                count === 1 ? "briefing" : "briefings"
                              }`}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center truncate w-full px-1">
                            {category}
                          </p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            {count}
                          </p>
                        </div>
                      );
                    })}
                {(!stats.categoryDistribution ||
                  Object.keys(stats.categoryDistribution).length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4 w-full">
                    No categories yet
                  </p>
                )}
              </div>
            </div>

            {/* Average Price by Category */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Average Quote Price by Category
              </h2>
              <div className="space-y-4">
                {stats.avgPriceByCategory &&
                  Object.entries(stats.avgPriceByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, avgPrice]) => {
                      const maxPrice = Math.max(
                        ...Object.values(stats.avgPriceByCategory).map((p) =>
                          parseFloat(p)
                        ),
                        1
                      );
                      const percentage =
                        (parseFloat(avgPrice) / maxPrice) * 100;
                      return (
                        <div key={category}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {category}
                            </span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${parseFloat(avgPrice).toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                {(!stats.avgPriceByCategory ||
                  Object.keys(stats.avgPriceByCategory).length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No pricing data available yet
                  </p>
                )}
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Top Responding Suppliers
              </h2>
              <div className="space-y-3">
                {stats.topSuppliers &&
                  stats.topSuppliers.length > 0 &&
                  stats.topSuppliers.map((supplier, index) => (
                    <div
                      key={supplier.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : index === 2
                              ? "bg-orange-600"
                              : "bg-blue-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {supplier.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {supplier.count}{" "}
                        {supplier.count === 1 ? "quote" : "quotes"}
                      </span>
                    </div>
                  ))}
                {(!stats.topSuppliers || stats.topSuppliers.length === 0) && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No supplier quotes yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent Briefings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Recent Briefings
              </h2>
              <div className="space-y-3">
                {stats.recentBriefings.map((briefing) => (
                  <div
                    key={briefing.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/briefingpage?briefing=${briefing.id}`)
                    }
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {briefing.title || "Untitled Briefing"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Created {formatDate(briefing.created_at)}
                      </p>
                    </div>
                    {/* status removed */}
                  </div>
                ))}
                {stats.recentBriefings.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No briefings yet.{" "}
                    <button
                      onClick={() => navigate("/briefings/create-briefing")}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create your first briefing
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === "briefing"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "bg-green-100 dark:bg-green-900"
                      }`}
                    >
                      {activity.type === "briefing" ? (
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      {activity.type === "briefing" ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            New Briefing
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {activity.title}
                          </p>
                          {/* status removed from activity */}
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Quote Received
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {activity.supplier}
                          </p>
                          {activity.price && (
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                              ${activity.price.toLocaleString()}
                            </p>
                          )}
                        </>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/briefings/create-briefing")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Create New Briefing
                </button>
                <button
                  onClick={() => navigate("/briefings")}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View All Briefings
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
