// Prompt for the RFQ email sent to suppliers.

export function rfqEmailPrompt({ spec, history, profile, language }) {
  return `Write a Request for Quote (RFQ) email from a buyer to suppliers.

LANGUAGE: ${language || "same language as the buyer used in the conversation"}

SENDER (use these REAL details in the signature; omit any line that is missing):
${profile}

REQUIREMENTS (JSON):
${JSON.stringify(spec)}

ORIGINAL CONVERSATION (for context and nuance only):
${history.map((m) => `${m.role === "user" ? "BUYER" : "ASSISTANT"}: ${m.content}`).join("\n")}

EMAIL REQUIREMENTS
- Subject: short and specific, e.g. "Request for quote: 500 branded cotton t-shirts".
- Greeting that works for any supplier (no names, e.g. "Dear Sir or Madam," / "Hello,").
- 1-2 sentences introducing the sender (company if known) and the need.
- A clear bullet list ("- ") of the requirements: item, specifications, quantity, delivery location, deadline, and any extras. Skip items that are unknown; write "flexible" ones as flexible.
- Ask the supplier to include in their quote: unit price, total price and currency, shipping cost, lead time / delivery date, payment terms, warranty, and how long the quote is valid.
- If there is a deadline, ask for the quote within a reasonable time before it.
- Polite closing and a signature with the sender's name, company, email and phone (only those that exist).

STRICT RULES
- NEVER use placeholders like [Your Name], [Company], <phone>, XXX. If a detail is unknown, leave it out.
- Do not invent facts, numbers, brands or dates that are not in the requirements or conversation.
- Do not mention the budget unless the buyer explicitly gave one.
- Plain text, no markdown other than "- " bullets. Under 250 words.

Return ONLY JSON: { "subject": "...", "body": "..." }`;
}

// Revise an existing RFQ email following the buyer's instructions.
export function reviseEmailPrompt({ currentEmail, instructions, profile }) {
  return `You are editing a Request for Quote email the buyer is about to send to suppliers.

SENDER (real details; never use placeholders):
${profile}

CURRENT EMAIL:
"""
${currentEmail}
"""

BUYER'S REQUESTED CHANGES:
"""
${instructions}
"""

Apply the requested changes and keep everything else. Keep the same language unless asked otherwise.
Same rules as before: no placeholders like [Your Name], no invented facts, plain text with "- " bullets, under 250 words.

Return ONLY JSON: { "subject": "...", "body": "...", "summary": "one short sentence describing what you changed" }`;
}
