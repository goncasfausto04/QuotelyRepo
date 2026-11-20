// Startup checks for environment variables.

const REQUIRED = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"];

const OPTIONAL = {
  "Email (Gmail)": ["GMAIL_API_CLIENT_ID", "GMAIL_API_CLIENT_SECRET", "GMAIL_API_REFRESH_TOKEN", "GMAIL_API_SENDER"],
  "Supplier search fallback (optional, Gemini web search is used first)": ["GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_ENGINE_ID"],
  "Admin dashboard": ["ADMIN_EMAILS"],
};

export function checkEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error("❌ Missing required environment variables:", missing.join(", "));
    process.exit(1);
  }
  for (const [feature, vars] of Object.entries(OPTIONAL)) {
    const absent = vars.filter((v) => !process.env[v]);
    if (absent.length) console.warn(`⚠️  ${feature} disabled/partial, missing: ${absent.join(", ")}`);
  }
}
