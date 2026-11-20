// Inbox > Conversations: composer (optional) + one card per supplier thread.

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import Notice from "../ui/Notice.js";
import InboxHeader from "./InboxHeader.js";
import ThreadCard from "./ThreadCard.js";
import EmailComposer from "./EmailComposer.js";

export default function ConversationsView({ briefingId, inbox, composerOpen, setComposerOpen, presetRecipients, onFindSuppliers }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const counts = useMemo(() => {
    const c = { all: inbox.threads.length };
    inbox.threads.forEach((t) => (c[t.state] = (c[t.state] || 0) + 1));
    return c;
  }, [inbox.threads]);

  const visible = filter === "all" ? inbox.threads : inbox.threads.filter((t) => t.state === filter);
  const showComposer = composerOpen || (inbox.threads.length === 0 && !inbox.error);

  return (
    <div className="space-y-4">
      <InboxHeader
        total={inbox.threads.length}
        counts={counts}
        lastUpdated={inbox.lastUpdated}
        refreshing={inbox.refreshing}
        filter={filter}
        onFilter={setFilter}
        onNew={() => setComposerOpen((o) => !o)}
        onRefresh={() => inbox.refresh()}
      />

      {inbox.notice && (
        <Notice type={inbox.notice.type} onClose={() => inbox.setNotice(null)}>
          {inbox.notice.text}
        </Notice>
      )}
      {inbox.error && (
        <Notice
          type="error"
          action={
            <button onClick={() => inbox.refresh()} className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 shrink-0">
              Retry
            </button>
          }
        >
          <b>Couldn't load emails.</b> {inbox.error}
        </Notice>
      )}

      {showComposer && (
        <>
          {!presetRecipients?.length && (
            <Notice type="info">
              Don't know who to send it to?{" "}
              <button onClick={onFindSuppliers} className="underline font-medium">
                Find suppliers on the map
              </button>
            </Notice>
          )}
          <EmailComposer
            briefingId={briefingId}
            briefingTitle={inbox.info.title}
            generatedEmail={inbox.info.generatedEmail}
            suggestions={inbox.info.suppliers}
            contacted={inbox.contacted}
            emailStatus={inbox.emailStatus}
            presetRecipients={presetRecipients}
            onSent={(res) => {
              inbox.afterSend(res);
              setFilter("all");
            }}
          />
        </>
      )}

      {!inbox.error && inbox.threads.length === 0 ? (
        <div className="card p-8 text-center">
          <Mail className="mx-auto text-gray-400 dark:text-gray-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No conversations yet</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Send a quote request above. Supplier replies appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <ThreadCard key={t.threadId} thread={t} open={expanded === t.threadId} onToggle={() => setExpanded(expanded === t.threadId ? null : t.threadId)} inbox={inbox} />
          ))}
          {visible.length === 0 && inbox.threads.length > 0 && <p className="text-sm text-center text-gray-500 py-6">Nothing in this filter.</p>}
        </div>
      )}
    </div>
  );
}
