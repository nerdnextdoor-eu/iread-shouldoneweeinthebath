// Netlify Function at /api/count
// POST: records one visit (country from Netlify's geolocation, source from ?s=qr)
//       and returns the new total.
// GET:  returns the current counts (total, per country, per source) without
//       recording anything. Counts are aggregate numbers only.
import { getStore } from "@netlify/blobs";
import { recordVisit, readCounts } from "../../lib/tally.mjs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };

export default async (req, context) => {
  const store = getStore({ name: "reader-counts", consistency: "strong" });
  try {
    if (req.method === "POST") {
      const source = new URL(req.url).searchParams.get("s");
      // context.ip exists too, but is deliberately never read or stored.
      const counts = await recordVisit(store, { country: context.geo?.country?.code, source });
      return new Response(JSON.stringify({ total: counts.total }), { headers });
    }
    if (req.method === "GET") {
      const counts = await readCounts(store);
      return new Response(JSON.stringify(counts), { headers });
    }
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers });
  }
};

export const config = { path: "/api/count" };
