// Validation for email addresses / send requests.

import { HttpError } from "./http.js";

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;
export const MAX_RECIPIENTS = 20;
const MAX_BODY = 50_000;

// Accepts "a@b.com" or "Name <a@b.com>" and returns the bare address (or null)
export function extractAddress(value) {
  if (typeof value !== "string") return null;
  const angle = value.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : value).trim();
  return EMAIL_RE.test(addr) ? addr : null;
}

// -> { body, subject, recipients: [unique lowercase addresses] }
export function validateSendRequest({ subject, body, recipients }) {
  if (typeof body !== "string" || !body.trim()) throw new HttpError(400, "Email body is required");
  if (body.length > MAX_BODY) throw new HttpError(400, "Email body is too long");
  if (!Array.isArray(recipients) || recipients.length === 0) throw new HttpError(400, "At least one recipient is required");
  if (recipients.length > MAX_RECIPIENTS) throw new HttpError(400, `At most ${MAX_RECIPIENTS} recipients per send`);

  const addresses = recipients.map(extractAddress);
  const invalid = recipients.filter((_, i) => !addresses[i]);
  if (invalid.length) throw new HttpError(400, `Invalid email address: ${invalid.join(", ")}`);

  return {
    body,
    subject: (typeof subject === "string" && subject.trim().slice(0, 300)) || "Request for quote",
    recipients: [...new Set(addresses.map((a) => a.toLowerCase()))],
  };
}
