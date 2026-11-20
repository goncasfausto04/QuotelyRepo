import { availableParameters, scoreQuotes, presetWeights, bestOf } from "./scoring.js";
import { standardizeAll, defaultCurrency, makeConverter } from "./standardize.js";
import { initialWeights, setAllWeights } from "./weights.js";

const RATES = { EUR: 1, USD: 1.25, GBP: 0.8 };
const raw = [
  { id: "a", supplier_name: "A", total_price: 100, shipping_cost: 20, lead_time_days: 10, currency: "EUR", quantity: 10 },
  { id: "b", supplier_name: "B", total_price: 125, shipping_cost: 0, lead_time_days: 5, currency: "USD" },
  { id: "c", supplier_name: "C", total_price: null, lead_time_days: 7 },
];

test("everything is converted to one currency and shipping is added", () => {
  const [a, b] = standardizeAll(raw, RATES, "EUR");
  expect(a.std.total).toBe(120);
  expect(a.std.unitPrice).toBe(10);
  expect(b.std.price).toBeCloseTo(100);
  expect(b.std.total).toBeCloseTo(100);
  expect(b.std.flags).toContain("converted from USD");
});

test("missing shipping and currency are flagged, unknown currencies aren't guessed", () => {
  const [q] = standardizeAll([{ id: "x", total_price: 50 }], RATES, "EUR");
  expect(q.std.flags).toEqual(expect.arrayContaining(["currency not stated, assumed EUR", "shipping not stated"]));
  expect(makeConverter(RATES, "EUR")(10, "JPY")).toBeNull();
});

test("default currency is the most common one", () => {
  expect(defaultCurrency(raw)).toBe("EUR");
  expect(defaultCurrency([{ total_price: 1, currency: "usd" }, { total_price: 2, currency: "USD" }, { total_price: 3, currency: "EUR" }])).toBe("USD");
});

test("lowest-cost preset ranks the cheapest total first", () => {
  const quotes = standardizeAll(raw, RATES, "EUR");
  const params = availableParameters(quotes);
  expect(params.map((p) => p.key)).toEqual(["total", "leadDays"]);
  const ranked = scoreQuotes(quotes, presetWeights("cheapest", params), params);
  expect(ranked[0].id).toBe("b"); // 100 EUR incl. shipping beats 120 EUR
});

test("bestOf needs at least two values", () => {
  expect(bestOf([5, null, 3], "lower")).toBe(3);
  expect(bestOf([5, null, 3], "higher")).toBe(5);
  expect(bestOf([5, null], "lower")).toBeNull();
});

test("old 0-100 weights are converted to the 0-5 scale", () => {
  const params = availableParameters(standardizeAll(raw, RATES, "EUR"));
  const w = initialWeights(params, { total: { enabled: true, weight: 100 } });
  expect(w.total.weight).toBe(5);
  expect(w.leadDays).toMatchObject({ enabled: true, weight: 1 });
});

test("setAllWeights does not mutate the original", () => {
  const original = { a: { enabled: true, weight: 3 }, b: { enabled: false, weight: 4 } };
  expect(setAllWeights(original, 1)).toEqual({ a: { enabled: true, weight: 1 }, b: { enabled: false, weight: 4 } });
  expect(original.a.weight).toBe(3);
});
