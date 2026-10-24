# Decisions and time log

For the project report and the pro-bono invoice. Fill in the time column as you go.

| Date | Decision or step | Why | Time (h) |
|---|---|---|---|
| 2026-10-08 to 10-23 | Research and design (hosting, counter, guestbook options) | See the design doc in NND Projects: `claude/book-qr-guestbook-design.md` | |
| 2026-10-23 | Three iterations, each tested with Caroline: 1 poem + counter, 2 country display, 3 guestbook | Keep each step small and showable | |
| 2026-10-23 | Host on Netlify (legacy free plan) | Keeps everything in one place; counter on the same address so ad blockers leave it alone | |
| 2026-10-23 | Own counter (Netlify Function + Blobs), not GoatCounter | GoatCounter is likely blocked by ad blockers | |
| 2026-10-24 | Record country from iteration 1, display it in iteration 2 | Data starts accumulating from the first scan | |
| 2026-10-24 | Count every page load; nothing stored on readers' devices | Simplest; avoids the cookie-consent question | |
| 2026-10-24 | QR URL carries `?s=qr` | Tells QR scans apart from typed visits | |
| 2026-10-24 | Poem text only, original spelling, "you" underlined | Caroline's choice; the photo can come in a later iteration | |
| 2026-10-24 | Fonts self-hosted instead of loaded from Google Fonts | Readers' phones never contact Google; same fonts | |
| 2026-10-24 | Subdomain `iread.shouldoneweeinthebath.stream`, DNS only at Cloudflare | Caroline owns the domain; proxy would break the country count | |
| 2026-10-24 | Iteration 1 scaffold built and tested (4 counter tests; screenshot at 390px) | | |
| 2026-10-24 | First deploy live at iread.shouldoneweeinthebath.stream | | |
| 2026-10-24 | Found: count rose with no one visiting (3 NL = Clare's refreshes, 6 US = likely automated browsers) | Counter counted every page load, including bots | |
| 2026-10-24 | Show only QR loads (`?s=qr`); skip self-declared bots; keep a separate "humans" tally (visitor scrolled) | Bots don't know the QR URL; scrolling is a strong human signal | |
| 2026-10-24 | Show country names under the caption (most readers first) | Caroline's "worldwide count"; brought forward from iteration 2 | |
| 2026-10-24 | Country display changed to one line per country with counts ("4 from the UK"), max 8 lines + "elsewhere" | Clare's request | |
| 2026-10-24 | Reset endpoint protected by a `RESET_TOKEN` environment variable | Zero the count before the book goes to print | |
| 2026-10-24 | New storage key `counts-v2`; the old test counts are left behind | Clean start; old data was all test visits | |
