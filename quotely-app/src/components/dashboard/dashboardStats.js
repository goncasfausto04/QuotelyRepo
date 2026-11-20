// Loads the user's briefings + quotes and computes dashboard statistics.

import { supabase } from "../../supabaseClient.js";

const DAY = 86_400_000;
const validPrice = (q) => Number.isFinite(Number(q.total_price)) && Number(q.total_price) > 0;

export async function loadDashboardData() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { briefings: [], quotes: [] };

  const { data: briefings, error } = await supabase
    .from("briefings")
    .select("id, title, category, created_at")
    .eq("user_auth_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (briefings || []).map((b) => b.id);
  if (!ids.length) return { briefings: [], quotes: [] };
  const { data: quotes, error: qErr } = await supabase
    .from("quotes")
    .select("id, briefing_id, supplier_name, total_price, currency, created_at")
    .in("briefing_id", ids)
    .order("created_at", { ascending: false });
  if (qErr) throw qErr;
  return { briefings: briefings || [], quotes: quotes || [] };
}

const countBy = (items, keyFn) =>
  items.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

export function computeStats({ briefings, quotes }) {
  const quotesByBriefing = {};
  for (const q of quotes) (quotesByBriefing[q.briefing_id] ||= []).push(q);

  // Days from briefing creation to its FIRST quote
  const responseDays = briefings
    .filter((b) => quotesByBriefing[b.id])
    .map((b) => {
      const first = Math.min(...quotesByBriefing[b.id].map((q) => new Date(q.created_at).getTime()));
      return Math.max(0, (first - new Date(b.created_at).getTime()) / DAY);
    });

  const priced = quotes.filter(validPrice);
  const bestQuote = priced.length ? priced.reduce((a, b) => (Number(b.total_price) < Number(a.total_price) ? b : a)) : null;

  const quoteTrends = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * DAY).toISOString().slice(0, 10);
    return { label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: quotes.filter((q) => q.created_at.startsWith(date)).length };
  });

  const categoryOf = Object.fromEntries(briefings.map((b) => [b.id, b.category || "Uncategorized"]));
  const priceSums = {};
  for (const q of priced) {
    const c = categoryOf[q.briefing_id];
    priceSums[c] ||= { total: 0, count: 0 };
    priceSums[c].total += Number(q.total_price);
    priceSums[c].count += 1;
  }

  const recentActivity = [
    ...briefings.map((b) => ({ type: "briefing", title: b.title || "Untitled Briefing", created_at: b.created_at, id: b.id })),
    ...quotes.map((q) => ({ type: "quote", title: q.supplier_name || "Unknown supplier", price: q.total_price, currency: q.currency, created_at: q.created_at, id: q.briefing_id })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  return {
    totalBriefings: briefings.length,
    activeBriefings: Object.keys(quotesByBriefing).length,
    totalQuotes: quotes.length,
    avgQuotesPerBriefing: briefings.length ? (quotes.length / briefings.length).toFixed(1) : 0,
    avgResponseTime: responseDays.length ? (responseDays.reduce((a, b) => a + b, 0) / responseDays.length).toFixed(1) : 0,
    bestQuote,
    quoteTrends,
    categories: Object.entries(countBy(briefings, (b) => b.category || "Uncategorized"))
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    avgPriceByCategory: Object.entries(priceSums)
      .map(([label, s]) => ({ label, value: Math.round(s.total / s.count) }))
      .sort((a, b) => b.value - a.value),
    topSuppliers: Object.entries(countBy(quotes, (q) => q.supplier_name || "Unknown"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    recentBriefings: briefings.slice(0, 5),
    recentActivity,
  };
}

export function relativeTime(dateString) {
  const mins = Math.floor((Date.now() - new Date(dateString)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export const money = (amount, currency) => `${currency ? `${currency} ` : ""}${Number(amount).toLocaleString()}`;
