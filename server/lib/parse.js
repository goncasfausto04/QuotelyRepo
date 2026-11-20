// Sanitisers for untrusted form input.

export const str = (v, max = 500) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

export const parseNumber = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number.parseFloat(String(val).replace(",", "."));
  return Number.isFinite(num) && num >= 0 ? num : null;
};

export const parseIntSafe = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number.parseInt(val, 10);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

export const parseDate = (val) => {
  const s = str(val, 20);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
