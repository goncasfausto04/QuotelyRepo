import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeSupabase } from "./fakeSupabase.js";

// Fresh module per test (settings keeps an in-memory cache)
const load = () => import(`../lib/settings.js?${Math.random()}`);

test("defaults to test mode and persists changes to the table", async () => {
  const s = await load();
  const db = fakeSupabase();
  assert.equal(await s.getSetting(db, "email_mode"), "test");
  const res = await s.setSetting(db, "email_mode", "live", "admin@x.com");
  assert.deepEqual(res, { value: "live", persisted: true });
  assert.equal(db.rows.get("email_mode").value, "live");
  assert.equal(await s.getSetting(db, "email_mode"), "live");
});

test("falls back to memory when the table is missing", async () => {
  const s = await load();
  const db = fakeSupabase({ missingTable: true });
  const res = await s.setSetting(db, "email_mode", "live", "admin@x.com");
  assert.equal(res.persisted, false);
  assert.equal(await s.getSetting(db, "email_mode"), "live");
  assert.equal((await s.getAllSettings(db)).persisted, false);
});

test("rejects unknown settings and invalid values", async () => {
  const s = await load();
  const db = fakeSupabase();
  await assert.rejects(s.setSetting(db, "nope", "x"), { status: 400 });
  await assert.rejects(s.setSetting(db, "email_mode", "maybe"), { status: 400 });
});
