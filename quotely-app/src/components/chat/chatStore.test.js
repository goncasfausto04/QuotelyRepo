import { phaseFrom } from "./chatStore.js";

jest.mock("../../supabaseClient.js", () => ({ supabase: {} }));

test("phase follows the chat log", () => {
  expect(phaseFrom([{ role: "AI", content: "hi" }])).toBe("new");
  expect(phaseFrom([{ role: "User", content: "chairs" }])).toBe("interview");
  expect(phaseFrom([{ role: "User" }, { role: "Email", content: "x" }])).toBe("done");
});
