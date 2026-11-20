// Dashboard: overview of the user's briefings and quotes.

import { useEffect, useState } from "react";
import { FileText, BarChart3, Clock, Award, TrendingUp, DollarSign, Activity } from "lucide-react";
import { loadDashboardData, computeStats, money } from "../components/dashboard/dashboardStats.js";
import Card from "../components/dashboard/Card.js";
import StatCard from "../components/dashboard/StatCard.js";
import { VerticalBars, HorizontalBars } from "../components/dashboard/Charts.js";
import { TopSuppliers, RecentBriefings, RecentActivity, QuickActions } from "../components/dashboard/Lists.js";
import Notice from "../components/ui/Notice.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData()
      .then((data) => setStats(computeStats(data)))
      .catch((err) => {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load dashboard");
      });
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Notice type="error">{error}</Notice>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    );
  }

  const best = stats.bestQuote;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">An overview of your briefings and quotes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total briefings" value={stats.totalBriefings} icon={FileText} color="blue" footer={`${stats.activeBriefings} with quotes`} />
          <StatCard label="Total quotes" value={stats.totalQuotes} icon={BarChart3} color="purple" footer={`${stats.avgQuotesPerBriefing} per briefing on average`} />
          <StatCard label="Avg time to first quote" value={stats.avgResponseTime} unit="days" icon={Clock} color="orange" />
          <StatCard
            label="Lowest quote"
            value={best ? money(best.total_price, best.currency) : "N/A"}
            icon={Award}
            color="green"
            footer={best ? best.supplier_name || "Unknown" : "No quotes yet"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card icon={TrendingUp} title="Quotes received (last 7 days)">
              <VerticalBars data={stats.quoteTrends} empty="No quotes yet" />
            </Card>
            <Card icon={BarChart3} title="Briefings by category">
              <VerticalBars data={stats.categories} empty="No categories yet" barClass="bg-gradient-to-t from-purple-500 to-blue-500" />
            </Card>
            <Card icon={DollarSign} title="Average quote price by category">
              <HorizontalBars data={stats.avgPriceByCategory} empty="No pricing data yet" format={(v) => v.toLocaleString()} />
            </Card>
            <Card icon={Award} title="Top responding suppliers">
              <TopSuppliers suppliers={stats.topSuppliers} />
            </Card>
            <Card icon={FileText} title="Recent briefings">
              <RecentBriefings briefings={stats.recentBriefings} />
            </Card>
          </div>
          <div className="space-y-6">
            <Card icon={Activity} title="Recent activity">
              <RecentActivity items={stats.recentActivity} />
            </Card>
            <Card title="Quick actions">
              <QuickActions />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
