import { test } from "node:test";
import assert from "node:assert/strict";
import { dummyReplyBody } from "../services/mail/dummyReply.js";
import { withRefTag, briefingRef, replyFields } from "../services/emailThreads.js";

test("dummy reply uses 999 for every value and says it's a test", () => {
  const body = dummyReplyBody({ intendedTo: "s@x.com" });
  for (const field of ["Unit price: 999", "Total price: 999", "Lead time: 999", "Warranty: 999", "Shipping cost: 999"]) {
    assert.ok(body.includes(field), field);
  }
  assert.match(body, /TEST MODE/);
  assert.match(body, /s@x\.com/);
});

test("ref tag is added once", () => {
  const id = "1a2b3c4d-0000-4000-8000-000000000000";
  assert.equal(briefingRef(id), "1a2b3c4d");
  const tagged = withRefTag("RFQ", id);
  assert.equal(tagged, "RFQ [Ref: 1a2b3c4d]");
  assert.equal(withRefTag(tagged, id), tagged);
});

test("replyFields builds threading headers", () => {
  const r = replyFields({ subject: "RFQ", messageIdHeader: "<m1>", references: "<m0>" }, "x");
  assert.deepEqual(r, { subject: "Re: RFQ", inReplyTo: "<m1>", references: "<m0> <m1>" });
  assert.equal(replyFields({ subject: "Re: RFQ" }, "x").subject, "Re: RFQ");
});
