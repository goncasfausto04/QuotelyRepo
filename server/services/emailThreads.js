// Finding a briefing's emails in Gmail.
//
// Every email for a briefing carries "[Ref: <8 chars of the briefing id>]" in
// its subject, so all of its threads (one per supplier) can be found with a
// Gmail search, without storing thread ids.

import { getThreadMessages, searchThreadIds } from "./gmail.js";

export const briefingRef = (briefingId) => String(briefingId).replace(/-/g, "").slice(0, 8);
const refTag = (briefingId) => `[Ref: ${briefingRef(briefingId)}]`;

export function withRefTag(subject, briefingId) {
  const tag = refTag(briefingId);
  return subject.includes(tag) ? subject : `${subject} ${tag}`;
}

export async function findBriefingThreadIds(briefing) {
  const ids = new Set();
  if (briefing.gmail_thread_id) ids.add(briefing.gmail_thread_id); // older briefings
  (await searchThreadIds(`subject:${briefingRef(briefing.id)}`)).forEach((id) => ids.add(id));
  return [...ids];
}

// All messages of the briefing, oldest first, without duplicates
export async function listBriefingEmails(briefing) {
  const threadIds = await findBriefingThreadIds(briefing);
  const perThread = await Promise.all(threadIds.map((tid) => getThreadMessages(tid)));
  const seen = new Set();
  return perThread
    .flat()
    .filter((m) => (seen.has(m.id) ? false : seen.add(m.id)))
    .map(({ labelIds, references, messageIdHeader, ...m }) => ({
      ...m,
      // Dummy replies are sent from our own account but play the supplier
      fromMe: labelIds.includes("SENT") && !m.isDummy,
    }))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

// Locate a message of this briefing so a reply can be threaded under it
export async function findBriefingMessage(briefing, messageId) {
  for (const tid of await findBriefingThreadIds(briefing)) {
    const original = (await getThreadMessages(tid)).find((m) => m.id === messageId);
    if (original) return { threadId: tid, original };
  }
  return null;
}

// Threading headers + "Re:" subject for replying to `original`
export function replyFields(original, fallbackSubject) {
  const base = original.subject || fallbackSubject;
  return {
    subject: /^re:/i.test(base) ? base : `Re: ${base}`,
    inReplyTo: original.messageIdHeader || undefined,
    references: [original.references, original.messageIdHeader].filter(Boolean).join(" ") || undefined,
  };
}
