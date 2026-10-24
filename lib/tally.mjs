// Counting logic, kept separate from Netlify so it can be tested locally.
// Stores only totals. No IP addresses, no device identifiers, nothing on
// the reader's phone.
//
// Shape of the stored counts:
// {
//   since: "2026-10-24T...",          // when counting started (or was reset)
//   qr:     { loads: 0, countries: {} }, // page loads from the book's QR code
//   direct: { loads: 0 },             // page loads without ?s=qr
//   humans: { qr: 0, direct: 0 },     // visits where the reader scrolled (likely human)
//   botsSkipped: 0                    // loads from self-declared bots, not counted
// }
// The page shows qr.loads and the countries in qr.countries.

export const KEY = "counts-v2";

export function emptyCounts(now = new Date()) {
  return {
    since: now.toISOString(),
    qr: { loads: 0, countries: {} },
    direct: { loads: 0 },
    humans: { qr: 0, direct: 0 },
    botsSkipped: 0,
  };
}

// Browsers that announce themselves as bots, crawlers, link previews or
// automated ("headless") browsers. Only catches the honest ones.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|scanner|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python|httpclient|go-http|java\//i;

export function isBot(userAgent) {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function cleanSource(source) {
  return source === "qr" ? "qr" : "direct";
}

export function cleanCountry(country) {
  return typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "XX"; // XX = unknown
}

// event: "load" | "human" | "bot"
export function applyEvent(counts, { event, source, country }) {
  const next = structuredClone(counts);
  const src = cleanSource(source);
  if (event === "bot") {
    next.botsSkipped += 1;
  } else if (event === "human") {
    next.humans[src] += 1;
  } else if (src === "qr") {
    next.qr.loads += 1;
    const code = cleanCountry(country);
    next.qr.countries[code] = (next.qr.countries[code] || 0) + 1;
  } else {
    next.direct.loads += 1;
  }
  return next;
}

// What the page needs: the QR reader count and their countries.
export function publicView(counts) {
  return { readers: counts.qr.loads, countries: counts.qr.countries };
}

// Read-modify-write with conditional writes, so two readers scanning at the
// same moment can't overwrite each other. Retries on conflict.
export async function update(store, change, { retries = 10 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const entry = await store.getWithMetadata(KEY, { type: "json" });
    const next = change(entry?.data ?? emptyCounts());
    const result = entry
      ? await store.setJSON(KEY, next, { onlyIfMatch: entry.etag })
      : await store.setJSON(KEY, next, { onlyIfNew: true });
    if (result.modified) return next;
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
  }
  throw new Error("Too much contention");
}

export function recordEvent(store, event, options) {
  return update(store, (counts) => applyEvent(counts, event), options);
}

export async function readCounts(store) {
  return (await store.get(KEY, { type: "json" })) ?? emptyCounts();
}

export async function resetCounts(store) {
  const fresh = emptyCounts();
  await store.setJSON(KEY, fresh);
  return fresh;
}
