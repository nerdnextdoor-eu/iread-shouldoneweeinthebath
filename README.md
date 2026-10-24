# iread.shouldoneweeinthebath.stream

The page the QR code at the back of *Should One Wee In The Bath?* (by Caroline) points to: a bonus poem and a count of readers.

- **Client:** Caroline (pro bono, Nerd Next Door)
- **Live URL:** https://iread.shouldoneweeinthebath.stream
- **URL in the book's QR code:** https://iread.shouldoneweeinthebath.stream/?s=qr
- **Hosting:** Netlify (page + one serverless function + Netlify Blobs for the counts)
- **Code:** this GitHub repo; Netlify deploys it automatically

## What's where

| Path | What it is |
|---|---|
| `public/index.html` | The whole page: poem, counter, styles and script |
| `public/fonts/` | Special Elite and Architects Daughter, stored on this site (licences included) |
| `netlify/functions/count.mjs` | The counter, at `/api/count` |
| `lib/tally.mjs` | Counting logic (kept separate so it can be tested) |
| `test/tally.test.mjs` | Tests for the counting logic |
| `netlify.toml` | Netlify settings: publish `public/`, no build step |
| `docs/LOG.md` | Decisions and time log for the project report |

## Editing

- **The poem:** in `public/index.html`, each line is a `<span class="l">`. Indents are classes: `i1`, `i2`, `i3` (one, two, three steps). Stanzas are `<p class="stanza">`. Keep Caroline's original spelling ("embarassment") and the underlined "you".
- **Colours, fonts, sizes:** the `:root` block at the top of the `<style>` in `public/index.html`. Change a value there and it updates everywhere.
- **Wording above the poem or under the number:** search for "Here's your bonus poem" or "readers who like to wee in the bath".

## How the counter works

1. When the page loads, its script sends one request to `/api/count`.
2. The function adds 1 to the total, to the reader's country, and to the source (`qr` if the URL has `?s=qr`, otherwise `direct`), then returns the total.
3. The page shows the total. If anything fails, the counter section stays hidden and the poem is unaffected.

**Privacy:** only totals are stored: overall, per two-letter country code, and per source. The country comes from Netlify's own geolocation. No IP addresses, cookies, browser storage or third-party services. The fonts are served from this site, so readers' phones never contact Google.

**Ad blockers:** the counter is on the page's own address, not a third-party analytics service, so ad blockers have no reason to block it.

**See the counts:** open https://iread.shouldoneweeinthebath.stream/api/count in a browser. It shows the totals without adding a visit. `XX` means the country was unknown.

**Known limits (fine for now):**
- Every page load counts, including reloads.
- Readers with JavaScript switched off aren't counted.
- Anyone who finds `/api/count` could add fake visits. If that ever happens, add rate limiting.

## Deploying

Netlify deploys every push to `main` to the live site. Test changes on another branch first: Netlify builds a preview for it, and the live site doesn't change until you merge.

Run the tests before merging: `npm install`, then `npm test`.

## Domain

- `shouldoneweeinthebath.stream` is owned by Caroline. DNS is at Cloudflare.
- `iread` is a `CNAME` record pointing to the Netlify site's `.netlify.app` address, with Cloudflare's proxy **off** ("DNS only", grey cloud). With the proxy on, Netlify would see Cloudflare's servers instead of readers, which breaks the country count.
- The QR code is printed in the book, so the URL `https://iread.shouldoneweeinthebath.stream/?s=qr` must keep working for as long as copies exist. Renew the domain every year.

## Logins (never put passwords here)

| Service | Used for | Owner | Where the login lives |
|---|---|---|---|
| GitHub | This repo | Clare (Nerd Next Door) | *(password manager entry: fill in)* |
| Netlify | Hosting, function, counts | Clare (Nerd Next Door) | *(password manager entry: fill in)* |
| Cloudflare | DNS for shouldoneweeinthebath.stream | Caroline | *(fill in)* |
| Domain registrar | Renewal of shouldoneweeinthebath.stream | Caroline | *(fill in)* |

## Maintenance

- **Yearly:** renew the domain (Caroline).
- **Now and then:** check `/api/count` still answers, and check Netlify's usage page stays well inside the free plan.
