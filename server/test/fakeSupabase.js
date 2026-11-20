// Minimal stand-in for the Supabase client used by lib/settings.js
export function fakeSupabase({ missingTable = false } = {}) {
  const rows = new Map();
  const missing = { code: "PGRST205", message: "Could not find the table 'public.app_settings'" };
  return {
    rows,
    from() {
      return {
        select: async () => (missingTable ? { data: null, error: missing } : { data: [...rows.values()], error: null }),
        upsert: async (row) => {
          if (missingTable) return { error: missing };
          rows.set(row.key, row);
          return { error: null };
        },
      };
    },
  };
}
