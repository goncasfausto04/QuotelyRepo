// Inbox state: emails grouped per supplier, auto refresh, and actions.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupThreads } from "./emailUtils.js";
import * as api from "./inboxApi.js";

const AUTO_REFRESH_MS = 60_000;

export default function useInbox(briefingId) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notice, setNotice] = useState(null); // { type, text }
  const [analyzingId, setAnalyzingId] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [info, setInfo] = useState({ title: "", generatedEmail: "", suppliers: [], spec: null });
  const inFlight = useRef(false);

  const flash = useCallback((type, text) => {
    setNotice({ type, text });
    if (type === "success") setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 6000);
  }, []);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!briefingId || inFlight.current) return;
      inFlight.current = true;
      if (!silent) setRefreshing(true);
      try {
        setEmails(await api.fetchEmails(briefingId));
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching emails:", err);
        if (!silent) setError(err.message || "Failed to load emails");
      } finally {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [briefingId],
  );

  useEffect(() => {
    if (!briefingId) return;
    refresh();
    api.fetchBriefingInfo(briefingId).then(setInfo);
    api.fetchEmailStatus().then(setEmailStatus).catch(() => setEmailStatus(null));
  }, [briefingId, refresh]);

  // Auto refresh while visible, and when coming back to the tab
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && refresh({ silent: true });
    const id = setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  // After a send: refresh now, and again once the test-mode dummy reply should be there
  const afterSend = useCallback(
    (res) => {
      refresh({ silent: true });
      if (res?.dummyReplyInMs) {
        setTimeout(() => refresh({ silent: true }), res.dummyReplyInMs + 4000);
        setTimeout(() => refresh({ silent: true }), res.dummyReplyInMs + 15000);
      }
    },
    [refresh],
  );

  const updateStatus = useCallback(
    async (email, status) => {
      try {
        await api.setEmailStatus(briefingId, email.id, status);
        setEmails((prev) =>
          status === "deleted" ? prev.filter((e) => e.id !== email.id) : prev.map((e) => (e.id === email.id ? { ...e, status } : e)),
        );
      } catch (err) {
        flash("error", `Couldn't update status: ${err.message}`);
      }
    },
    [briefingId, flash],
  );

  const approve = useCallback(
    async (email) => {
      if (analyzingId || email.status === "approved") return;
      setAnalyzingId(email.id);
      try {
        await api.saveQuoteFromEmail(briefingId, email);
        await updateStatus(email, "approved");
        flash("success", "Quote analysed and saved. See it in the Compare tab.");
      } catch (err) {
        console.error("Approve error:", err);
        flash("error", `Couldn't analyse this email: ${err.message || err}`);
      } finally {
        setAnalyzingId(null);
      }
    },
    [analyzingId, briefingId, updateStatus, flash],
  );

  const reply = useCallback(
    async (thread, text) => {
      const target = thread.latestSupplier || thread.last;
      const res = await api.sendEmail({
        briefingId,
        subject: target.subject || thread.subject,
        body: text,
        recipients: [thread.counterpart.address],
        replyToMessageId: target.id,
      });
      flash("success", `Reply sent to ${thread.counterpart.name}`);
      afterSend(res);
    },
    [briefingId, flash, afterSend],
  );

  const threads = useMemo(() => groupThreads(emails), [emails]);
  const contacted = useMemo(() => threads.map((t) => t.counterpart.address).filter(Boolean), [threads]);

  const reloadInfo = useCallback(() => api.fetchBriefingInfo(briefingId).then(setInfo), [briefingId]);

  return {
    reloadInfo,
    threads, contacted, loading, refreshing, error, lastUpdated, notice, setNotice, analyzingId,
    emailStatus, info, refresh, afterSend, approve, updateStatus, reply,
  };
}
