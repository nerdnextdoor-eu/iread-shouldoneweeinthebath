// Netlify Function at /api/count
//
// POST /api/count?s=qr|direct           record a page load, return { readers, countries }
// POST /api/count?s=qr|direct&e=human   record a likely-human visit (reader scrolled)
// GET  /api/count                       all counts, without recording anything
// POST /api/count?e=reset               zero everything; needs header
//                                       "x-reset-token: <RESET_TOKEN>" (set in Netlify)
//
// Country comes from Netlify's geolocation. context.ip exists too, but is
// deliberately never read or stored.
import { getStore } from "@netlify/blobs";
import { recordEvent, readCounts, resetCounts, publicView, isBot } from "../../lib/tally.mjs";

const headers = { "content-type": "application/json", "cache-control": "no-store" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export default async (req, context) => {
  const store = getStore({ name: "reader-counts", consistency: "strong" });
  const url = new URL(req.url);
  const event = url.searchParams.get("e");
  const source = url.searchParams.get("s");

  try {
    if (req.method === "GET") return json(await readCounts(store));
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });

    if (event === "reset") {
      const token = process.env.RESET_TOKEN;
      if (!token || req.headers.get("x-reset-token") !== token) return json({ error: "forbidden" }, 403);
      return json(await resetCounts(store));
    }

    if (isBot(req.headers.get("user-agent"))) {
      const counts = await recordEvent(store, { event: "bot" });
      return json(publicView(counts));
    }

    const counts = await recordEvent(store, {
      event: event === "human" ? "human" : "load",
      source,
      country: context.geo?.country?.code,
    });
    return json(publicView(counts));
  } catch (err) {
    console.error(err);
    return json({ error: "unavailable" }, 503);
  }
};

export const config = { path: "/api/count" };
