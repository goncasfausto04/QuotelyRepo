import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAddress, validateSendRequest } from "../lib/emailInput.js";

test("extractAddress accepts bare and named addresses", () => {
  assert.equal(extractAddress("a@b.com"), "a@b.com");
  assert.equal(extractAddress("Acme <sales@acme.com>"), "sales@acme.com");
  assert.equal(extractAddress("not an email"), null);
});

test("validateSendRequest dedupes recipients and defaults the subject", () => {
  const r = validateSendRequest({ body: "hi", recipients: ["A@b.com", "a@b.com", "Name <c@d.com>"] });
  assert.deepEqual(r.recipients, ["a@b.com", "c@d.com"]);
  assert.equal(r.subject, "Request for quote");
});

test("validateSendRequest rejects bad input with 400", () => {
  assert.throws(() => validateSendRequest({ body: "", recipients: ["a@b.com"] }), { status: 400 });
  assert.throws(() => validateSendRequest({ body: "hi", recipients: [] }), { status: 400 });
  assert.throws(() => validateSendRequest({ body: "hi", recipients: ["nope"] }), /Invalid email address/);
});
