// App-wide settings that admins can change at runtime (from /admin).
//
// Stored in the Supabase table `app_settings` (see supabase/app_settings.sql)
// so they survive Render restarts. If that table doesn't exist yet, values
// live in memory only (reset to the defaults on restart) and the admin page
// shows a warning.

const CACHE_MS = 15_000;

// Every setting must be listed here with its default and allowed values.
export const SETTINGS = {
  // "test": emails go to the Quotely inbox + automatic dummy supplier reply
  // "live": emails really go to suppliers
  email_mode: {
    default: process.env.EMAIL_MODE === "live" ? "live" : "test",
    allowed: ["test", "live"],
  },
};

const memory = {}; // fallback store + cache
let cacheAt = 0;
let persisted = true;

const isMissingTable = (error) => error && (error.code === "42P01" || error.code === "PGRST205" || /app_settings/.test(error.message || ""));

async function refresh(supabase) {
  if (Date.now() - cacheAt < CACHE_MS) return;
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) {
    if (isMissingTable(error)) persisted = false;
    else console.warn("⚠️  Could not load app_settings:", error.message);
  } else {
    persisted = true;
    for (const row of data || []) if (SETTINGS[row.key]) memory[row.key] = row.value;
  }
  cacheAt = Date.now();
}

export async function getSetting(supabase, key) {
  if (!SETTINGS[key]) throw new Error(`Unknown setting ${key}`);
  await refresh(supabase);
  const value = memory[key];
  return SETTINGS[key].allowed.includes(value) ? value : SETTINGS[key].default;
}

export async function getAllSettings(supabase) {
  const values = {};
  for (const key of Object.keys(SETTINGS)) values[key] = await getSetting(supabase, key);
  return { values, persisted };
}

export async function setSetting(supabase, key, value, updatedBy) {
  const def = SETTINGS[key];
  if (!def) throw Object.assign(new Error(`Unknown setting ${key}`), { status: 400 });
  if (!def.allowed.includes(value)) throw Object.assign(new Error(`Invalid value for ${key}`), { status: 400 });

  memory[key] = value;
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_by: updatedBy || null, updated_at: new Date().toISOString() });
  if (error) {
    if (!isMissingTable(error)) throw error;
    persisted = false;
  } else {
    persisted = true;
  }
  cacheAt = Date.now();
  console.log(`⚙️  Setting ${key} = ${JSON.stringify(value)} by ${updatedBy}${persisted ? "" : " (memory only)"}`);
  return { value, persisted };
}
