// Shared Gemini helpers: retries, JSON-mode generation and safe parsing.

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function errorStatus(error) {
  return error?.status ?? error?.code ?? error?.response?.status;
}

// Retry with exponential backoff + jitter on transient errors
// (rate limits, overloaded model, network hiccups).
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const status = errorStatus(error);
      const isNetwork = !status && /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(error?.message || "");
      const retriable = RETRIABLE_STATUS.has(Number(status)) || isNetwork;
      const isLastRetry = i === maxRetries - 1;

      console.log(`⚠️  AI error (attempt ${i + 1}/${maxRetries}):`, status || error.message);
      if (isLastRetry || !retriable) throw error;

      const delay = baseDelay * 2 ** i + Math.floor(Math.random() * 250);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Pull a JSON value out of model text even if it wrapped it in ``` fences
// or added chatter around it.
export function parseModelJson(text) {
  if (typeof text !== "string") throw new Error("AI returned an empty response");
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const match = t.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("AI response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

// Ask Gemini for JSON output and parse it.
export async function generateJson(ai, contents, { retries = 3, baseDelay = 1000 } = {}) {
  const response = await retryWithBackoff(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { responseMimeType: "application/json" },
      }),
    retries,
    baseDelay,
  );
  return parseModelJson(response.text);
}

export async function generateText(ai, contents, { retries = 3, baseDelay = 1000 } = {}) {
  const response = await retryWithBackoff(
    () => ai.models.generateContent({ model: GEMINI_MODEL, contents }),
    retries,
    baseDelay,
  );
  const text = (response.text || "").trim();
  if (!text) throw new Error("AI returned an empty response");
  return text;
}

// User-facing message for AI failures
export function aiErrorMessage(err, fallback) {
  const status = Number(errorStatus(err));
  if (status === 503) return "AI service is temporarily overloaded. Please try again in a moment.";
  if (status === 429) return "AI rate limit reached. Please wait a minute and try again.";
  if (status === 400 && /API key/i.test(err?.message || ""))
    return "AI API key is invalid or was revoked. Set a new GEMINI_API_KEY on the server.";
  if (status === 403) return "AI API key was rejected (possibly revoked). Set a new GEMINI_API_KEY on the server.";
  return fallback;
}
