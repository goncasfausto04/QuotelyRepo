// Prompt for extracting a structured quote from a supplier email or PDF.

const OUTPUT_SCHEMA = `{
  "supplier_name": "string or null",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "total_price": number or null,
  "currency": "ISO 4217 code string or null",
  "unit_price": number or null,
  "quantity": number or null,
  "lead_time_days": number or null,
  "delivery_date": "YYYY-MM-DD or null",
  "materials_included": ["array of strings"],
  "specifications": ["array of key specs mentioned"],
  "payment_terms": "string or null",
  "warranty_period": "string or null",
  "warranty_months": number or null,
  "shipping_cost": number or null,
  "additional_fees": [{"description": "string", "amount": number}],
  "certifications": ["array of certifications mentioned"],
  "business_rating_value": number or null,
  "business_rating_scale": number or null,
  "business_reviews_count": number or null,
  "business_rating_source": "string or null",
  "business_profile_url": "string or null",
  "notes": "string with any additional relevant observations"
}`;

export const quoteExtractionPrompt = (sourceLabel) => `You extract a supplier's quote from a ${sourceLabel}. Only report facts that are stated; no opinions.

Return a single JSON object with exactly this shape:
${OUTPUT_SCHEMA}

RULES
1. Use ONLY information present in the ${sourceLabel}. If something is not stated, use null (or [] for lists).
2. If the ${sourceLabel} is a reply that quotes the buyer's original request, ignore the quoted request: extract the SUPPLIER's offer.
3. If only a unit price and quantity are given, total_price = unit_price * quantity. Otherwise never compute values.
4. Convert durations to days for lead_time_days ("2 weeks" = 14) and to months for warranty_months ("1 year" = 12).
5. Numbers are plain numbers: no currency symbols, no thousands separators.
6. Business ratings (e.g. "4.7/5 on Trustpilot, 120 reviews") only if explicitly present.`;
