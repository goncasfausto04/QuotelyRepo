import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

/**
 * Send an email using Gmail API (OAuth2 refresh token).
 * @param {{from:string, to:string|string[], subject?:string, body?:string, isHtml?:boolean}} opts
 */
export async function sendEmail({ from, to, subject = "", body = "", isHtml = false }) {
  const CLIENT_ID = process.env.GMAIL_API_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_API_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GMAIL_API_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Missing Gmail OAuth env vars (GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN)"
    );
  }

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  const toHeader = Array.isArray(to) ? to.join(", ") : to;

  const mimeLines = [
    `From: ${from}`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    isHtml
      ? 'Content-Type: text/html; charset="UTF-8"'
      : 'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ];

  const raw = Buffer.from(mimeLines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return res.data;
}

function decodeBase64Url(input = "") {
  // Gmail returns base64url strings
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  return Buffer.from(s + "=".repeat(pad), "base64").toString("utf8");
}

function findPartWithMime(parts, mimeType) {
  if (!parts) return null;
  for (const p of parts) {
    if (p.mimeType === mimeType && p.body && p.body.data) return p;
    if (p.parts) {
      const nested = findPartWithMime(p.parts, mimeType);
      if (nested) return nested;
    }
  }
  return null;
}

async function getAuthClient() {
  const CLIENT_ID = process.env.GMAIL_API_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_API_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GMAIL_API_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Missing Gmail OAuth env vars (GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN)"
    );
  }

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return oAuth2Client;
}

// Search for a message with a subject containing the briefing token and return its threadId
export async function findThreadIdByBriefingToken(token) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Search for messages with the token in the subject
  const q = `subject:"${token}"`;
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 5 });
  const messages = res.data.messages || [];
  if (!messages.length) return null;

  // Get the first message to obtain threadId
  const msg = await gmail.users.messages.get({ userId: "me", id: messages[0].id, format: "metadata" });
  return msg.data.threadId || null;
}

// Fetch all messages in a thread and return parsed info (headers + body plaintext/html snippet)
export async function getThreadMessages(threadId) {
  if (!threadId) return [];
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
  const thread = res.data;
  const out = [];

  for (const msg of thread.messages || []) {
    const headers = {};
    (msg.payload.headers || []).forEach((h) => (headers[h.name.toLowerCase()] = h.value));

    // Try to extract plain text first, then HTML
    let body = "";
    if (msg.payload.body && msg.payload.body.data) {
      body = decodeBase64Url(msg.payload.body.data);
    } else {
      const plainPart = findPartWithMime(msg.payload.parts, "text/plain");
      if (plainPart && plainPart.body && plainPart.body.data) {
        body = decodeBase64Url(plainPart.body.data);
      } else {
        const htmlPart = findPartWithMime(msg.payload.parts, "text/html");
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
          body = decodeBase64Url(htmlPart.body.data);
        }
      }
    }

    out.push({
      id: msg.id,
      threadId: msg.threadId,
      from: headers["from"] || null,
      to: headers["to"] || null,
      subject: headers["subject"] || null,
      date: headers["date"] || null,
      snippet: msg.snippet || null,
      body,
    });
  }

  return out;
}
