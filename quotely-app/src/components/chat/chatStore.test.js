import { phaseFrom, suppliersFrom } from "./chatStore.js";

jest.mock("../../supabaseClient.js", () => ({ supabase: {} }));

test("phase follows the chat log", () => {
  expect(phaseFrom([{ role: "AI", content: "hi" }])).toBe("new");
  expect(phaseFrom([{ role: "User", content: "chairs" }])).toBe("interview");
  expect(phaseFrom([{ role: "User" }, { role: "Email", content: "x" }])).toBe("done");
});

test("suppliersFrom reads the latest results and survives bad JSON", () => {
  expect(suppliersFrom([{ role: "SupplierResults", content: "[1]" }, { role: "SupplierResults", content: '[{"name":"B"}]' }])).toEqual([{ name: "B" }]);
  expect(suppliersFrom([{ role: "SupplierResults", content: "nope" }])).toEqual([]);
});
