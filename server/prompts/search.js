// Prompts for the supplier search (Google Custom Search + AI extraction).

const describe = (spec) =>
  [spec.item, spec.quantity && `quantity ${spec.quantity}`, ...(spec.specifications || [])].filter(Boolean).join(", ");

export function searchQueriesPrompt({ spec, description, location }) {
  return `Generate 3-5 Google search queries that find COMPANIES that can supply this (manufacturers, wholesalers, distributors or service providers, not marketplaces or blogs).

NEED: ${describe(spec) || description}
LOCATION: ${location || "anywhere"}

- Use the language most suppliers in that location would use for their websites.
- Mix generic ("<product> supplier <city>") and specific (key specification) queries.

Return ONLY a JSON array of strings.`;
}

export function extractSuppliersPrompt({ spec, description, location, results }) {
  return `From these search results, pick the companies that could actually supply this need.

NEED: ${describe(spec) || description}
LOCATION: ${location || "anywhere"}

SEARCH RESULTS:
${results.map((r) => `- ${r.title}\n  ${r.content}\n  ${r.url}`).join("\n\n")}

Rules:
- Up to 7 suppliers, most relevant first. Only real companies (no directories, blogs, forums, news).
- Only include an email or phone if it literally appears in the results; otherwise null. Never guess.
- "note": one short sentence on why it is relevant.

Return ONLY JSON:
{ "suppliers": [ { "name": "", "website": "", "contact_email": null, "phone": null, "note": "" } ] }`;
}

// Used with Gemini's Google Search tool: the model searches the web itself.
export function groundedSuppliersPrompt({ spec, description, location }) {
  return `Use Google Search to find real companies that can supply this need.

NEED: ${describe(spec) || description}
LOCATION: ${location || "anywhere (prefer suppliers that ship internationally)"}

Find up to 8 suppliers (manufacturers, wholesalers, distributors or service providers), closest to the location first.
For each one give its official details as shown on its website or business listing:
- name, website
- contact_email: a public sales/contact email ONLY if you actually found it, otherwise null
- phone, address (street address), city, country
- note: one short sentence on why it fits

Never invent companies, emails, phones or addresses. Use null for anything you didn't find.

Return ONLY JSON, no other text:
{ "suppliers": [ { "name": "", "website": null, "contact_email": null, "phone": null, "address": null, "city": null, "country": null, "note": "" } ] }`;
}
