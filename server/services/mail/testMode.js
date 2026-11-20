// TEST mode: nothing reaches real suppliers.
//
// 1. The email is sent to the Quotely inbox itself (GMAIL_API_SENDER) instead
//    of the supplier. The intended recipient is kept in a header and in the body.
// 2. A few seconds later a dummy supplier reply (all values 999) is sent into
//    the same thread, so the inbox -> approve -> compare flow can be tested.
//
// Toggle at /admin (setting "email_mode").

import { sendEmail } from "../gmail.js";
import { dummyReplyBody, DUMMY_SUPPLIER_NAME } from "./dummyReply.js";

export const DUMMY_REPLY_DELAY_MS = Number(process.env.DUMMY_REPLY_DELAY_MS) || 5000;

const ownAddress = () => process.env.GMAIL_API_SENDER || "me";

export async function sendTest(message) {
  const intendedTo = [].concat(message.to).join(", ");
  const sent = await sendEmail({
    ...message,
    to: ownAddress(),
    body: `[TEST MODE: this would have been sent to ${intendedTo}]\n\n${message.body}`,
    extraHeaders: { "X-Quotely-Intended-To": intendedTo },
  });

  scheduleDummyReply({ sent, message, intendedTo });
  return sent;
}

function scheduleDummyReply({ sent, message, intendedTo }) {
  setTimeout(async () => {
    try {
      const subject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;
      await sendEmail({
        from: `${DUMMY_SUPPLIER_NAME} <${ownAddress()}>`,
        to: ownAddress(),
        subject,
        body: dummyReplyBody({ intendedTo, isFollowUp: !!message.threadId }),
        threadId: sent.threadId,
        extraHeaders: { "X-Quotely-Dummy": "1", "X-Quotely-Intended-To": intendedTo },
      });
      console.log(`🧪 Dummy reply sent for ${intendedTo}`);
    } catch (err) {
      console.error("❌ Dummy reply failed:", err.message);
    }
  }, DUMMY_REPLY_DELAY_MS).unref?.();
}
