import { useState, useEffect, useCallback } from "react";
import { Activity, Server, Zap } from "lucide-react";

export default function Settings() {
  const [keepAlive, setKeepAlive] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const [pingStatus, setPingStatus] = useState("idle"); // idle | success | error
  const API_URL = process.env.REACT_APP_API_URL;

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("quotely_keep_alive");
    if (saved === "true") {
      setKeepAlive(true);
    }
  }, []);

  // Ping function (memoized to prevent useEffect re-runs)
  const pingBackend = useCallback(async () => {
    try {
      setPingStatus("pinging");
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
      });

      if (response.ok) {
        setPingStatus("success");
        setLastPing(new Date().toLocaleTimeString());
        console.log("✅ Backend ping successful");
      } else {
        setPingStatus("error");
        console.warn("⚠️ Backend ping returned non-OK status");
      }
    } catch (error) {
      setPingStatus("error");
      console.error("❌ Backend ping failed:", error);
    }

    // Reset status after 2 seconds
    setTimeout(() => setPingStatus("idle"), 2000);
  }, [API_URL]);

  // Set up interval when keepAlive is enabled
  useEffect(() => {
    if (!keepAlive) return;

    // Ping immediately when enabled
    pingBackend();

    // Then ping every 10 minutes (600000ms) to keep server awake
    const interval = setInterval(() => {
      pingBackend();
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [keepAlive, pingBackend]);

  // Handle toggle
  const handleToggle = () => {
    const newValue = !keepAlive;
    setKeepAlive(newValue);
    localStorage.setItem("quotely_keep_alive", newValue.toString());

    if (newValue) {
      setPingStatus("idle");
      setLastPing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Server className="text-blue-600 dark:text-blue-400" size={32} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Configure application preferences and server settings
          </p>
        </div>

        {/* Keep Alive Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-green-600 dark:text-green-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Keep Backend Alive
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Prevent backend cold starts by sending periodic health checks.
                When enabled, the app will ping the server every 10 minutes to
                keep it active.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>ℹ️ Note:</strong> This is useful for free-tier hosting
                  services that spin down after inactivity. When disabled, the
                  backend will work normally but may experience cold starts
                  after periods of inactivity (typically 15-30 second delay on
                  first request).
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  keepAlive
                    ? "bg-green-600 dark:bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    keepAlive ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {keepAlive ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          {keepAlive && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity
                    className={`${
                      pingStatus === "success"
                        ? "text-green-600 dark:text-green-400"
                        : pingStatus === "error"
                          ? "text-red-600 dark:text-red-400"
                          : pingStatus === "pinging"
                            ? "text-blue-600 dark:text-blue-400 animate-pulse"
                            : "text-gray-400 dark:text-gray-500"
                    }`}
                    size={20}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Status:{" "}
                      {pingStatus === "success" && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Active
                        </span>
                      )}
                      {pingStatus === "error" && (
                        <span className="text-red-600 dark:text-red-400">
                          ✗ Error
                        </span>
                      )}
                      {pingStatus === "pinging" && (
                        <span className="text-blue-600 dark:text-blue-400">
                          ⟳ Pinging...
                        </span>
                      )}
                      {pingStatus === "idle" && (
                        <span className="text-gray-600 dark:text-gray-400">
                          Waiting
                        </span>
                      )}
                    </p>
                    {lastPing && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last ping: {lastPing}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={pingBackend}
                  disabled={pingStatus === "pinging"}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Test Now
                </button>
              </div>

              <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Next ping:</strong> in ~10 minutes
                  <br />
                  <strong>Backend URL:</strong>{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                    {API_URL}
                  </code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>Tip:</strong> This setting is saved locally and will
            persist across browser sessions. You can safely close this tab and
            the pinging will continue in the background as long as at least one
            browser tab with the app is open.
          </p>
        </div>
      </div>
    </div>
  );
}
