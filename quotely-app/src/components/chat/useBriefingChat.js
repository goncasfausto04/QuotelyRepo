// State machine for the briefing chat:
//   new -> interview (one question at a time) -> done (email written)
// In "done", typed messages revise the email ("make it shorter").

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../api.js";
import { GREETING, loadChat, makeChatSaver, resetBriefingConversation, lastOfRole, suppliersFrom, phaseFrom } from "./chatStore.js";

const errorText = (err) => `❌ ${(err?.message || "Something went wrong").replace(/[.\s]+$/, "")}.`;

export default function useBriefingChat(briefingId) {
  const [messages, setMessages] = useState([GREETING]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(null); // null | "thinking" | "writing" | "revising" | "searching"
  const [spec, setSpec] = useState(null);
  const [retry, setRetry] = useState(null); // function to retry the last failed action
  const save = useMemo(() => makeChatSaver(briefingId), [briefingId]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (!briefingId) return;
    let cancelled = false;
    loadChat(briefingId)
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
        setSpec(res.spec);
      })
      .catch((err) => console.error("Failed to load chat:", err))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [briefingId]);

  const append = useCallback(
    (...msgs) => {
      setMessages((prev) => {
        const next = [...prev, ...msgs];
        save(next);
        return next;
      });
    },
    [save],
  );

  const phase = phaseFrom(messages);
  const email = lastOfRole(messages, "Email")?.content || "";
  const suppliers = suppliersFrom(messages);

  // Runs an async step with busy state + friendly error + retry button
  const run = useCallback(
    async (kind, fn) => {
      setBusy(kind);
      setRetry(null);
      try {
        await fn();
      } catch (err) {
        console.error(err);
        append({ role: "AI", content: errorText(err), isError: true });
        setRetry(() => () => run(kind, fn));
      } finally {
        setBusy(null);
      }
    },
    [append],
  );

  const writeEmail = useCallback(
    (options = {}) =>
      run(options.instructions ? "revising" : "writing", async () => {
        const res = await apiFetch("/compose-email", {
          method: "POST",
          json: { briefingId, ...options },
          retry: true, // nothing is sent, safe to repeat
        });
        const note = options.instructions
          ? `✏️ ${res.summary || "Updated the email."}`
          : "✅ Here's your quote request. Review it, then send it to suppliers from the Inbox tab.";
        append({ role: "AI", content: note }, { role: "Email", content: res.email, isEmail: true });
      }),
    [run, append, briefingId],
  );

  const handleStep = useCallback(
    async (res) => {
      if (res.spec) setSpec(res.spec);
      if (!res.done) return append({ role: "AI", content: res.question });
      append({ role: "AI", content: "Great, I have everything I need. Writing your email…" });
      await writeEmail();
    },
    [append, writeEmail],
  );

  const send = useCallback(
    async (text) => {
      const input = text.trim();
      if (!input || busy) return;
      append({ role: "User", content: input });

      if (phase === "done") {
        return writeEmail({ instructions: input, currentEmail: lastOfRole(messagesRef.current, "Email")?.content || "" });
      }
      return run("thinking", async () => {
        const res =
          phase === "new"
            ? await apiFetch("/start", { method: "POST", json: { description: input, briefingId }, retry: true })
            : await apiFetch("/next-question", { method: "POST", json: { briefingId, userAnswer: input } });
        await handleStep(res);
      });
    },
    [busy, phase, append, run, writeEmail, handleStep, briefingId],
  );

  // "That's all" button: let the assistant wrap up with what it has
  const finishNow = useCallback(() => send("That's all the information I have, please write the email now."), [send]);

  const searchSuppliers = useCallback(
    (location) =>
      run("searching", async () => {
        const res = await apiFetch("/api/search-suppliers", {
          method: "POST",
          json: { briefingId, location },
          retry: true,
        });
        const found = res.suppliers || [];
        append(
          {
            role: "AI",
            content: found.length
              ? `🔎 Found ${found.length} supplier${found.length === 1 ? "" : "s"}${location ? ` near ${location}` : ""}. The ones with an email can be added with one click in the Inbox tab.`
              : "🔎 No suppliers found. Try a broader location or different wording.",
          },
          { role: "SupplierResults", content: JSON.stringify(found) },
        );
      }),
    [run, append, briefingId],
  );

  const reset = useCallback(async () => {
    await resetBriefingConversation(briefingId);
    setMessages([GREETING]);
    setSpec(null);
    setRetry(null);
  }, [briefingId]);

  return { messages, loaded, busy, phase, spec, email, suppliers, retry, send, finishNow, writeEmail, searchSuppliers, reset };
}
