// Entry point for sending briefing emails. Picks the implementation based on
// the "email_mode" setting (changeable at /admin):
//
//   test -> mail/testMode.js  (to Quotely's own inbox + automatic 999 dummy reply)
//   live -> mail/liveMode.js  (real suppliers)
//
// To add another provider (e.g. SendGrid), add a file with a send(message)
// function and register it in MODES.

import { getSetting } from "../../lib/settings.js";
import { sendLive } from "./liveMode.js";
import { sendTest, DUMMY_REPLY_DELAY_MS } from "./testMode.js";

const MODES = { live: sendLive, test: sendTest };

export const getEmailMode = (supabase) => getSetting(supabase, "email_mode");

// message: { from, to, subject, body, isHtml, threadId?, inReplyTo?, references? }
// forceMode: replies to a dummy (test) message always stay in test mode,
// so switching to live never emails a real supplier about fake data.
export async function sendBriefingEmail(supabase, message, { forceMode } = {}) {
  const mode = forceMode || (await getEmailMode(supabase));
  const result = await MODES[mode](message);
  return { ...result, mode, dummyReplyInMs: mode === "test" ? DUMMY_REPLY_DELAY_MS : null };
}
