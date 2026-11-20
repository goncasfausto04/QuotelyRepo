import { parseAddress, cleanSubject, splitSubject, splitQuoted, groupThreads } from "./emailUtils.js";

test("parseAddress handles display names and bare addresses", () => {
  expect(parseAddress('"Acme Sales" <sales@acme.com>')).toEqual({ name: "Acme Sales", address: "sales@acme.com" });
  expect(parseAddress("a@b.com")).toEqual({ name: "a@b.com", address: "a@b.com" });
});

test("cleanSubject removes the briefing ref tag", () => {
  expect(cleanSubject("Re: Quote for chairs [Ref: 1a2b3c4d]")).toBe("Re: Quote for chairs");
});

test("splitSubject pulls out the AI subject line (EN/PT)", () => {
  expect(splitSubject("Subject: RFQ chairs\n\nHello")).toEqual({ subject: "RFQ chairs", body: "Hello" });
  expect(splitSubject("Assunto: Pedido\nOlá")).toEqual({ subject: "Pedido", body: "Olá" });
  expect(splitSubject("Hello")).toEqual({ subject: "", body: "Hello" });
});

test("splitQuoted separates the reply from the quoted request", () => {
  const { main, quoted } = splitQuoted("Price is 500.\n\nOn Mon, 1 Jan 2026, Quotely <q@g.com> wrote:\n> please quote");
  expect(main).toBe("Price is 500.");
  expect(quoted).toMatch(/^On Mon/);
});

test("groupThreads: test-mode thread shows the intended supplier and its state", () => {
  const threads = groupThreads([
    { id: "1", threadId: "t", fromMe: true, from: "q@g.com", to: "q@g.com", intendedTo: "supplier@x.com", date: "2026-01-01T10:00:00Z", subject: "RFQ [Ref: 1a2b3c4d]" },
    { id: "2", threadId: "t", fromMe: false, isDummy: true, from: "Dummy Supplier 999 <q@g.com>", intendedTo: "supplier@x.com", date: "2026-01-01T10:01:00Z", status: "pending" },
  ]);
  expect(threads).toHaveLength(1);
  expect(threads[0].counterpart.address).toBe("supplier@x.com");
  expect(threads[0].counterpart.name).toBe("Dummy Supplier 999");
  expect(threads[0].state).toBe("pending");
  expect(threads[0].isTest).toBe(true);
  expect(threads[0].subject).toBe("RFQ");
});

test("groupThreads: no supplier reply yet means awaiting", () => {
  const [t] = groupThreads([{ id: "1", threadId: "t", fromMe: true, to: "s@x.com", date: "2026-01-01" }]);
  expect(t.state).toBe("awaiting");
  expect(t.counterpart.address).toBe("s@x.com");
});
