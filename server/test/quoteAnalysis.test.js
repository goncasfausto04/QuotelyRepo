import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnalysis, withRatings } from "../services/quoteAnalysis.js";

test("numbers become numbers, bad dates and currencies are cleaned", () => {
  const a = normalizeAnalysis({ total_price: "1,200.50", lead_time_days: "14.4", currency: "eur", delivery_date: "next week" });
  assert.equal(a.total_price, 1200.5);
  assert.equal(a.lead_time_days, 14);
  assert.equal(a.currency, "EUR");
  assert.equal(a.delivery_date, null);
});

test("ratings in the text fill missing fields only", () => {
  const a = withRatings({ business_rating_value: null }, "We are rated 4.8/5 on Trustpilot with 120 reviews");
  assert.equal(a.business_rating_value, 4.8);
  assert.equal(a.business_reviews_count, 120);
  assert.equal(a.business_rating_source, "Trustpilot");
});
