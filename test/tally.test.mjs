// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordVisit, readCounts, cleanVisit } from "../lib/tally.mjs";

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

test("first visit creates the counts", async () => {
  const s = fakeStore();
  const c = await recordVisit(s, { country: "GB", source: "qr" });
  assert.equal(c.total, 1);
  assert.deepEqual(c.countries, { GB: 1 });
  assert.deepEqual(c.sources, { qr: 1 });
});

test("50 simultaneous visits are all counted", async () => {
  const s = fakeStore();
  const countries = ["GB", "NL", "US", "DE", "FR"];
  await Promise.all(Array.from({ length: 50 }, (_, i) =>
    recordVisit(s, { country: countries[i % 5], source: i % 2 ? "qr" : "direct" }, { retries: 200 })));
  const c = await readCounts(s);
  assert.equal(c.total, 50);
  assert.equal(Object.values(c.countries).reduce((a, b) => a + b, 0), 50);
  assert.deepEqual(c.sources, { qr: 25, direct: 25 });
});

test("bad input is cleaned", () => {
  assert.deepEqual(cleanVisit({ country: "<script>", source: "spam" }), { country: "XX", source: "direct" });
  assert.deepEqual(cleanVisit({}), { country: "XX", source: "direct" });
});

test("empty store reads as zero", async () => {
  assert.equal((await readCounts(fakeStore())).total, 0);
});
