import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ncxchpmtfjbejciucken.supabase.co";
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeGNocG10ZmpiZWpjaXVja2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzQxNTEsImV4cCI6MjA3NjIxMDE1MX0.9rFxNW-1s-KHfQMMYHOWMN2SjvPln6Xkr4S5vts3tks";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
