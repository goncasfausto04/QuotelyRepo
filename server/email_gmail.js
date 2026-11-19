// Gmail API helpers: send emails and fetch messages in a thread.
// Used by server/routes/email.js

import { google } from "googleapis";

let cachedClient = null;

// Reuse one OAuth2 client so the access token is cached and refreshed
// automatically instead of being re-fetched on every request.
function getAuthClient() {
  if (cachedClient) return cachedClient;

  const { GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN } = process.env;
  if (!GMAIL_API_CLIENT_ID || !GMAIL_API_CLIENT_SECRET || !GMAIL_API_REFRESH_TOKEN) {
    throw new GmailConfigError(
      "Email is not configured on the server (missing GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET or GMAIL_API_REFRESH_TOKEN)",
    );
  }

  const client = new google.auth.OAuth2(GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET);
  client.setCredentials({ refresh_token: GMAIL_API_REFRESH_TOKEN });
  cachedClient = client;
  return client;
}

export class GmailConfigError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
  }
}

// Turn Google's cryptic "invalid_grant" into something actionable.
function wrapGmailError(err) {
  const msg = err?.response?.data?.error || err?.message || "";
  if (/invalid_grant/i.test(msg)) {
    cachedClient = null;
    return new GmailConfigError(
      "Gmail refresh token expired or was revoked. Run `npm run gmail:token` in /server and update GMAIL_API_REFRESH_TOKEN. " +
        "If this keeps happening every ~7 days, publish your OAuth consent screen (Testing -> In production).",
    );
  }
  return err;
}

const stripNewlines = (s = "") => String(s).replace(/[\r\n]+/g, " ").trim();

// RFC 2047 encode headers containing non-ASCII characters (e.g. Portuguese accents)
function encodeHeader(value) {
  const clean = stripNewlines(value);
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

const toBase64Url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Send an email. Pass threadId + inReplyTo/references to keep it in an existing thread.
export async function sendEmail({
  from,
  to,
  subject = "",
  body = "",
  isHtml = false,
  threadId,
  inReplyTo,
  references,
}) {
  const auth = getAuthClient();
  const recipients = (Array.isArray(to) ? to : [to]).map(stripNewlines).filter(Boolean);

  const headers = [
    `From: ${stripNewlines(from)}`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${stripNewlines(inReplyTo)}`);
  if (references) headers.push(`References: ${stripNewlines(references)}`);

  // Body is base64 encoded so long lines / UTF-8 survive intact
  const bodyB64 = Buffer.from(body, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  const raw = toBase64Url(Buffer.from(headers.join("\r\n") + "\r\n\r\n" + bodyB64, "utf8"));

  const gmail = google.gmail({ version: "v1", auth });
  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: threadId ? { raw, threadId } : { raw },
    });
    return res.data;
  } catch (err) {
    throw wrapGmailError(err);
  }
}

// Health check: proves the refresh token still works (no email is sent or read).
// Access tokens are cached ~1h by the client, so calling this often is cheap.
export async function checkGmailAuth() {
  const client = getAuthClient();
  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("No access token returned");
    return true;
  } catch (err) {
    throw wrapGmailError(err);
  }
}

// Search threads (Gmail query syntax) and return their ids
export async function searchThreadIds(q, maxResults = 25) {
  const gmail = google.gmail({ version: "v1", auth: getAuthClient() });
  try {
    const res = await gmail.users.threads.list({ userId: "me", q, maxResults });
    return (res.data.threads || []).map((t) => t.id);
  } catch (err) {
    throw wrapGmailError(err);
  }
}

// Decode a base64url-encoded string from Gmail API responses
function decodeBase64Url(input = "") {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  return Buffer.from(s + "=".repeat(pad), "base64").toString("utf8");
}

// Find a part with a specific MIME type in the message parts (recursive)
function findPartWithMime(parts, mimeType) {
  if (!parts) return null;
  for (const p of parts) {
    if (p.mimeType === mimeType && p.body?.data) return p;
    if (p.parts) {
      const nested = findPartWithMime(p.parts, mimeType);
      if (nested) return nested;
    }
  }
  return null;
}

// Fetch all messages in a thread (headers + plaintext/html body)
export async function getThreadMessages(threadId) {
  if (!threadId) return [];
  const auth = getAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  let thread;
  try {
    const res = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
    thread = res.data;
  } catch (err) {
    if (err?.code === 404 || err?.response?.status === 404) return [];
    throw wrapGmailError(err);
  }

  return (thread.messages || []).map((msg) => {
    const headers = {};
    (msg.payload?.headers || []).forEach((h) => (headers[h.name.toLowerCase()] = h.value));

    let body = "";
    if (msg.payload?.body?.data) {
      body = decodeBase64Url(msg.payload.body.data);
    } else {
      const part =
        findPartWithMime(msg.payload?.parts, "text/plain") ||
        findPartWithMime(msg.payload?.parts, "text/html");
      if (part) body = decodeBase64Url(part.body.data);
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      messageIdHeader: headers["message-id"] || null,
      references: headers["references"] || null,
      from: headers["from"] || null,
      to: headers["to"] || null,
      subject: headers["subject"] || null,
      date: headers["date"] || null,
      snippet: msg.snippet || null,
      labelIds: msg.labelIds || [],
      body,
    };
  });
}
