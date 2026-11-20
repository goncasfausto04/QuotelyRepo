// Briefing inbox: "Conversations" (send + replies) and "Find suppliers" (map).
// The sub-tab lives in the URL (?view=suppliers) so other pages can link to it.

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useInbox from "./useInbox.js";
import InboxViews from "./InboxViews.js";
import ConversationsView from "./ConversationsView.js";
import SupplierFinder from "../suppliers/SupplierFinder.js";

export default function BriefingInbox({ briefingId }) {
  const inbox = useInbox(briefingId);
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "suppliers" ? "suppliers" : "conversations";
  const [composerOpen, setComposerOpen] = useState(false);
  const [presetRecipients, setPresetRecipients] = useState(null);

  const setView = (v) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    setParams(next, { replace: true });
  };

  // From the map: open the composer with the chosen suppliers
  const sendTo = (suppliers) => {
    setPresetRecipients(suppliers.map((s) => s.email));
    setComposerOpen(true);
    inbox.reloadInfo();
    setView("conversations");
    window.scrollTo({ top: 0 });
  };

  if (inbox.loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-500"></div>
        Loading inbox…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InboxViews active={view} onChange={setView} pending={inbox.threads.filter((t) => t.state === "pending").length} />
      {view === "suppliers" ? (
        <SupplierFinder briefingId={briefingId} defaultLocation={inbox.info.spec?.delivery_location || ""} contacted={inbox.contacted} onSend={sendTo} />
      ) : (
        <ConversationsView
          briefingId={briefingId}
          inbox={inbox}
          composerOpen={composerOpen}
          setComposerOpen={setComposerOpen}
          presetRecipients={presetRecipients}
          onFindSuppliers={() => setView("suppliers")}
        />
      )}
    </div>
  );
}
