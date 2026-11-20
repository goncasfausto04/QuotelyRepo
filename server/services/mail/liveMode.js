// LIVE mode: the real implementation. Emails go to the actual suppliers
// through the Quotely Gmail account, and their real replies show up in the
// inbox via Gmail search (see services/emailThreads.js).

import { sendEmail } from "../gmail.js";

export async function sendLive(message) {
  return sendEmail(message);
}
