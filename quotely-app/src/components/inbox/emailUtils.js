// Pure helpers for the inbox (no React).

export const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;
export const lower = (s) => String(s || "").toLowerCase();

// "Acme Sales <sales@acme.com>" -> { name: "Acme Sales", address: "sales@acme.com" }
export function parseAddress(value = "") {
  const m = String(value).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || m[2].trim(), address: m[2].trim() };
  const addr = String(value).split(",")[0].trim();
  return { name: addr, address: addr };
}

export const cleanSubject = (s = "") => String(s).replace(/\s*\[Ref:\s*[0-9a-f]{8}\]/gi, "").trim() || "(No subject)";

// "Subject: Foo\n\nDear..." -> { subject: "Foo", body: "Dear..." }
export function splitSubject(text = "") {
  const m = String(text).match(/^\s*(?:subject|assunto|asunto)\s*:\s*(.+)\r?\n+/i);
  if (!m) return { subject: "", body: String(text).trim() };
  return { subject: m[1].trim(), body: String(text).slice(m[0].length).trim() };
}

// Split a reply into the new text and the quoted previous email
export function splitQuoted(body = "") {
  const lines = String(body).split(/\r?\n/);
  const markers = [
    /^On .+wrote:\s*$/i,
    /^(Em|El|Le|Am) .+(escreveu|escribió|a écrit|schrieb)\s*:?\s*$/i,
    /^-{2,}\s*(Original Message|Mensagem original|Mensaje original)\s*-{2,}/i,
  ];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const quoteRun = line.startsWith(">") && (lines[i + 1] || "").trim().startsWith(">");
    if (quoteRun || markers.some((re) => re.test(line))) {
      const main = lines.slice(0, i).join("\n").trim();
      if (main) return { main, quoted: lines.slice(i).join("\n").trim() };
    }
  }
  return { main: String(body).trim(), quoted: "" };
}

export function timeAgo(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

// Group messages into one conversation per Gmail thread, newest first
export function groupThreads(emails) {
  const byThread = new Map();
  for (const e of emails) {
    const key = e.threadId || e.id;
    if (!byThread.has(key)) byThread.set(key, []);
    byThread.get(key).push(e);
  }
  return [...byThread.entries()]
    .map(([threadId, msgs]) => {
      msgs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      const supplierMsgs = msgs.filter((m) => !m.fromMe);
      const firstOut = msgs.find((m) => m.fromMe);
      // Test mode: our own address stands in for the supplier, so prefer the intended recipient
      const intended = firstOut?.intendedTo || supplierMsgs[0]?.intendedTo;
      const counterpart = intended
        ? { ...parseAddress(intended), name: parseAddress(supplierMsgs[0]?.from || "").name || intended }
        : parseAddress(supplierMsgs[0]?.from || firstOut?.to || msgs[0].from || "");
      const latestSupplier = supplierMsgs[supplierMsgs.length - 1];
      const state = !latestSupplier ? "awaiting" : supplierMsgs.some((m) => m.status === "approved") ? "approved" : latestSupplier.status;
      return {
        threadId,
        msgs,
        counterpart,
        state,
        isTest: msgs.some((m) => m.isDummy || m.intendedTo),
        last: msgs[msgs.length - 1],
        subject: cleanSubject(msgs[0].subject),
        latestSupplier,
      };
    })
    .sort((a, b) => new Date(b.last.date || 0) - new Date(a.last.date || 0));
}
