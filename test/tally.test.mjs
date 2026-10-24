// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordEvent, readCounts, resetCounts, publicView, isBot, cleanCountry } from "../lib/tally.mjs";

// In-memory stand-in for a Netlify Blobs store, with ETag-based conditional
// writes and random delays to simulate readers arriving at the same time.
function fakeStore() {
  let value = null, etag = null, n = 0;
  const pause = () => new Promise((r) => setTimeout(r, Math.random() * 5));
  return {
    async getWithMetadata() { await pause(); return value === null ? null : { data: structuredClone(value), etag, metadata: {} }; },
    async get() { await pause(); return value === null ? null : structuredClone(value); },
    async setJSON(_k, data, opts = {}) {
      await pause();
      if (opts.onlyIfNew && value !== null) return { modified: false };
      if (opts.onlyIfMatch && opts.onlyIfMatch !== etag) return { modified: false };
      value = structuredClone(data); etag = `e${++n}`;
      return { modified: true, etag };
    },
  };
}

test("a QR load counts as a reader, with country", async () => {
  const s = fakeStore();
  const c = await recordEvent(s, { event: "load", source: "qr", country: "GB" });
  assert.deepEqual(publicView(c), { readers: 1, countries: { GB: 1 } });
});

test("typed visits are recorded but not shown as readers", async () => {
  const s = fakeStore();
  const c = await recordEvent(s, { event: "load", source: "direct", country: "NL" });
  assert.equal(c.direct.loads, 1);
  assert.deepEqual(publicView(c), { readers: 0, countries: {} });
});

test("human and bot events are tallied separately", async () => {
  const s = fakeStore();
  await recordEvent(s, { event: "load", source: "qr", country: "NL" });
  await recordEvent(s, { event: "human", source: "qr" });
  await recordEvent(s, { event: "human", source: "direct" });
  await recordEvent(s, { event: "bot" });
  const c = await readCounts(s);
  assert.deepEqual(c.humans, { qr: 1, direct: 1 });
  assert.equal(c.botsSkipped, 1);
  assert.equal(c.qr.loads, 1);
});

test("50 simultaneous QR scans are all counted", async () => {
  const s = fakeStore();
  const countries = ["GB", "NL", "US", "DE", "FR"];
  await Promise.all(Array.from({ length: 50 }, (_, i) =>
    recordEvent(s, { event: "load", source: "qr", country: countries[i % 5] }, { retries: 200 })));
  const c = await readCounts(s);
  assert.equal(c.qr.loads, 50);
  assert.deepEqual(c.qr.countries, { GB: 10, NL: 10, US: 10, DE: 10, FR: 10 });
});

test("reset zeroes everything", async () => {
  const s = fakeStore();
  await recordEvent(s, { event: "load", source: "qr", country: "GB" });
  await resetCounts(s);
  assert.equal((await readCounts(s)).qr.loads, 0);
});

test("bot detection catches self-declared bots, not normal phones", () => {
  assert.ok(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36"));
  assert.ok(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)"));
  assert.ok(isBot("WhatsApp/2.23"));
  assert.ok(isBot(""));
  assert.ok(!isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"));
  assert.ok(!isBot("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"));
});

test("bad country input is cleaned", () => {
  assert.equal(cleanCountry("<script>"), "XX");
  assert.equal(cleanCountry(undefined), "XX");
  assert.equal(cleanCountry("NL"), "NL");
});
