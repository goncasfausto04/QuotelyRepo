import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly instead of a blank page with a cryptic error
  throw new Error(
    "Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY. " +
      "Set them in quotely-app/.env (local) or in the Vercel project settings, then rebuild.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
