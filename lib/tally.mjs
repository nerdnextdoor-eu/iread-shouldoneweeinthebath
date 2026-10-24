// Counting logic, kept separate from Netlify so it can be tested locally.
// Stores only totals: overall, per country code, and per source (qr/direct).
// No IP addresses, no device identifiers.

export const KEY = "counts";

export function emptyCounts(now = new Date()) {
  return { total: 0, countries: {}, sources: {}, since: now.toISOString() };
}

export function cleanVisit({ country, source } = {}) {
  const code = typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "XX"; // XX = unknown
  const src = source === "qr" ? "qr" : "direct";
  return { country: code, source: src };
}

export function applyVisit(counts, visit) {
  const { country, source } = cleanVisit(visit);
  return {
    ...counts,
    total: (counts.total || 0) + 1,
    countries: { ...counts.countries, [country]: (counts.countries?.[country] || 0) + 1 },
    sources: { ...counts.sources, [source]: (counts.sources?.[source] || 0) + 1 },
  };
}

// Read-modify-write with conditional writes, so two readers scanning at the
// same moment can't overwrite each other's visit. Retries on conflict.
export async function recordVisit(store, visit, { retries = 10 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const entry = await store.getWithMetadata(KEY, { type: "json" });
    const next = applyVisit(entry?.data ?? emptyCounts(), visit);
    const result = entry
      ? await store.setJSON(KEY, next, { onlyIfMatch: entry.etag })
      : await store.setJSON(KEY, next, { onlyIfNew: true });
    if (result.modified) return next;
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
  }
  throw new Error("Too much contention");
}

export async function readCounts(store) {
  return (await store.get(KEY, { type: "json" })) ?? emptyCounts();
}
