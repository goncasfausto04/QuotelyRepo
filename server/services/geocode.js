// Address -> coordinates with OpenStreetMap Nominatim (free, no key).
// Usage policy: max 1 request/second and an identifying User-Agent, so
// requests are queued and results cached in memory.

const USER_AGENT = "Quotely/1.0 (https://quotely-repo.vercel.app)";
const MIN_GAP_MS = 1100;
const cache = new Map(); // query -> { lat, lng, label } | null
let queue = Promise.resolve();
let last = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: "json", limit: "1" })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

export function geocode(query) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key));

  const job = queue.then(async () => {
    if (cache.has(key)) return cache.get(key);
    await wait(Math.max(0, last + MIN_GAP_MS - Date.now()));
    last = Date.now();
    try {
      const result = await fetchGeocode(key);
      cache.set(key, result);
      return result;
    } catch (err) {
      console.warn("⚠️  Geocode failed for", key, err.message);
      return null;
    }
  });
  queue = job;
  return job;
}

// Try the most precise query first: full address, then name + city, then city
export async function geocodeSupplier(s) {
  const place = [s.city, s.country].filter(Boolean).join(", ");
  const candidates = [
    s.address && [s.address, place].filter(Boolean).join(", "),
    place && `${s.name}, ${place}`,
    place,
  ].filter(Boolean);
  for (const q of candidates) {
    const hit = await geocode(q);
    if (hit) return { lat: hit.lat, lng: hit.lng, approximate: q === place };
  }
  return null;
}
