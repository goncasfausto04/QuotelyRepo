// Nudges the user to fill in their profile so emails are signed properly.

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.js";

export default function ProfileHint() {
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase.from("users").select("name, company_name, phone").eq("auth_id", auth.user.id).maybeSingle();
      const gaps = [!data?.name && "your name", !data?.company_name && "company", !data?.phone && "phone"].filter(Boolean);
      if (!cancelled) setMissing(gaps);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!missing.length) return null;
  return (
    <div className="mb-3 p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800">
      Emails are signed with your profile. Add {missing.join(", ")} in your{" "}
      <a href="/profile" className="underline font-medium">
        Profile
      </a>{" "}
      so suppliers know who's asking.
    </div>
  );
}
