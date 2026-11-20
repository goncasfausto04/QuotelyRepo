import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConversation, interviewStep } from "../services/conversation.js";
import { MAX_QUESTIONS } from "../prompts/conversation.js";

// Fake Gemini client returning a fixed JSON answer
const fakeAi = (answer) => ({ models: { generateContent: async () => ({ text: JSON.stringify(answer) }) } });
const profile = { name: "Maria", company: "Acme", email: "m@acme.com", phone: null, location: "Lisbon" };

test("loadConversation rebuilds old briefings from the chat log", () => {
  const conv = loadConversation({ chat: [{ role: "AI", content: "Hi" }, { role: "User", content: "500 chairs" }, { role: "AI", content: "Colour?" }] });
  assert.equal(conv.description, "500 chairs");
  assert.equal(conv.history.length, 2);
  assert.equal(conv.done, false);
});

test("interviewStep asks the next question and keeps the spec", async () => {
  const conv = { description: "chairs", history: [{ role: "user", content: "500 chairs" }], spec: {}, done: false };
  await interviewStep(fakeAi({ status: "ask", message: "What colour?", spec: { item: "chairs", quantity: 500 }, language: "en" }), conv, profile);
  assert.equal(conv.done, false);
  assert.equal(conv.history.at(-1).content, "What colour?");
  assert.equal(conv.spec.quantity, "500");
  assert.equal(conv.language, "en");
});

test("interviewStep completes when the model says so, or after MAX_QUESTIONS", async () => {
  const conv = { description: "x", history: [{ role: "user", content: "x" }], spec: {}, done: false };
  await interviewStep(fakeAi({ status: "complete", message: "", spec: {} }), conv, profile);
  assert.equal(conv.done, true);

  const long = { description: "x", history: Array.from({ length: MAX_QUESTIONS }, () => [{ role: "user", content: "a" }, { role: "assistant", content: "q" }]).flat(), spec: {}, done: false };
  await interviewStep(fakeAi({ status: "ask", message: "one more?", spec: {} }), long, profile);
  assert.equal(long.done, true);
});
