// Current Supabase user (null when signed out), kept in sync with auth changes.

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function useAuthUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);
  return user;
}
