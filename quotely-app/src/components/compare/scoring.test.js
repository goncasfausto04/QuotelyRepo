import { availableParameters, scoreQuotes, bestPrice, averagePrice } from "./scoring.js";
import { initialWeights, setAllWeights } from "./weights.js";

const quotes = [
  { id: "a", supplier_name: "A", total_price: 100, lead_time_days: 10, currency: "EUR" },
  { id: "b", supplier_name: "B", total_price: 200, lead_time_days: 5, currency: "EUR" },
  { id: "c", supplier_name: "C", total_price: null, lead_time_days: 7 },
];

test("only criteria present in 2+ quotes can be scored", () => {
  expect(availableParameters(quotes).map((p) => p.key)).toEqual(["lead_time_days", "total_price"]);
});

test("price-only weights rank the cheapest first with 100%", () => {
  const params = availableParameters(quotes);
  const weights = { total_price: { enabled: true, weight: 1, direction: "lower" } };
  const ranked = scoreQuotes(quotes, weights, params);
  expect(ranked[0].id).toBe("a");
  expect(Math.round(ranked[0].score)).toBe(100);
  expect(Math.round(ranked.find((q) => q.id === "b").score)).toBe(0);
});

test("best and average price ignore missing prices", () => {
  expect(bestPrice(quotes)).toMatchObject({ value: 100, supplier: "A", currency: "EUR" });
  expect(averagePrice(quotes)).toBe(150);
});

test("old 0-100 weights are converted to the 0-5 scale", () => {
  const params = availableParameters(quotes);
  const w = initialWeights(params, { total_price: { enabled: true, weight: 100 } });
  expect(w.total_price.weight).toBe(5);
  expect(w.lead_time_days).toMatchObject({ enabled: true, weight: 1 });
});

test("setAllWeights does not mutate the original", () => {
  const original = { a: { enabled: true, weight: 3 }, b: { enabled: false, weight: 4 } };
  const next = setAllWeights(original, 1);
  expect(next).toEqual({ a: { enabled: true, weight: 1 }, b: { enabled: false, weight: 4 } });
  expect(original.a.weight).toBe(3);
});
