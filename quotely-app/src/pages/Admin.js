// /admin: email mode switch, system health and usage stats (ADMIN_EMAILS only).

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { fetchOverview, updateSettings } from "../components/admin/adminApi.js";
import EmailModeCard from "../components/admin/EmailModeCard.js";
import HealthCard from "../components/admin/HealthCard.js";
import StatsCard from "../components/admin/StatsCard.js";
import Notice from "../components/ui/Notice.js";

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchOverview());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeMode = async (email_mode) => {
    const res = await updateSettings({ email_mode });
    setData((d) => ({ ...d, settings: res.settings }));
  };

  if (error?.status === 403) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ShieldAlert className="mx-auto text-red-500 mb-3" size={40} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admins only</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Your account isn't an admin. Add your email to <code>ADMIN_EMAILS</code> in the server's environment (Render) to get access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Admin</h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && <Notice type="error">{error.message}</Notice>}

        {data && (
          <>
            <EmailModeCard mode={data.settings.values.email_mode} persisted={data.settings.persisted} onChange={changeMode} />
            <StatsCard stats={data.stats} uptime={data.uptime} />
            <HealthCard health={data.health} />
          </>
        )}
      </div>
    </div>
  );
}
