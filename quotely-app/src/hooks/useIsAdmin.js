// Is the signed-in user an admin? (server decides, via ADMIN_EMAILS)

import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

let cached = { userId: null, value: false };

export default function useIsAdmin(user) {
  const [isAdmin, setIsAdmin] = useState(cached.userId === user?.id ? cached.value : false);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    if (cached.userId === user.id) return setIsAdmin(cached.value);
    let cancelled = false;
    apiFetch("/api/admin/me")
      .then((res) => {
        cached = { userId: user.id, value: !!res.isAdmin };
        if (!cancelled) setIsAdmin(!!res.isAdmin);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}
