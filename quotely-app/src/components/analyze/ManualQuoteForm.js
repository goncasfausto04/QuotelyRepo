import { useState } from "react";
import { fieldCls, primaryBtn } from "./inputs.js";

const EMPTY = {
  supplier_name: "", contact_email: "", contact_phone: "", total_price: "", currency: "EUR",
  lead_time_days: "", warranty_months: "", payment_terms: "", notes: "",
};

const toNumber = (v, int = false) => {
  const n = int ? parseInt(v, 10) : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function ManualQuoteForm({ busy, onSave }) {
  const [d, setD] = useState(EMPTY);
  const set = (key) => (e) => setD({ ...d, [key]: e.target.value });
  const disabled = busy || !d.supplier_name.trim() || toNumber(d.total_price) == null;

  const save = async () => {
    const quote = {
      ...d,
      total_price: toNumber(d.total_price),
      lead_time_days: toNumber(d.lead_time_days, true),
      warranty_months: toNumber(d.warranty_months, true),
    };
    if (await onSave(quote)) setD(EMPTY);
  };

  return (
    <div className="space-y-3">
      <input placeholder="Supplier name *" value={d.supplier_name} onChange={set("supplier_name")} className={fieldCls} />
      <div className="grid grid-cols-2 gap-3">
        <input type="email" placeholder="Email" value={d.contact_email} onChange={set("contact_email")} className={fieldCls} />
        <input type="tel" placeholder="Phone" value={d.contact_phone} onChange={set("contact_phone")} className={fieldCls} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input type="number" placeholder="Total price *" value={d.total_price} onChange={set("total_price")} className={`${fieldCls} col-span-2`} />
        <select value={d.currency} onChange={set("currency")} className={fieldCls}>
          {["EUR", "USD", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="number" placeholder="Lead time (days)" value={d.lead_time_days} onChange={set("lead_time_days")} className={fieldCls} />
        <input type="number" placeholder="Warranty (months)" value={d.warranty_months} onChange={set("warranty_months")} className={fieldCls} />
      </div>
      <input placeholder="Payment terms" value={d.payment_terms} onChange={set("payment_terms")} className={fieldCls} />
      <textarea rows={3} placeholder="Notes" value={d.notes} onChange={set("notes")} className={fieldCls} />
      <button onClick={save} disabled={disabled} className={primaryBtn(disabled)}>
        {busy ? "Saving..." : "Save quote"}
      </button>
    </div>
  );
}
