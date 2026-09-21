# Photography — sources, licences, and why each was chosen

Six images were sourced and then **opened and looked at** before being accepted. That step
is the whole point of this file: a previous round of six candidates all had correct
licences and four were unusable on sight — a commercial restaurant line standing in for a
home kitchen, a photographer's watermark burned into a corner, dry pasta dumped on a white
tray, and a stainless-steel industrial kitchen. Metadata alone would have passed all four.

## First screen vs on scroll

| | Size |
|---|---|
| `index.html` | 15.2 KiB |
| `redesign.css` | 14.5 KiB |
| **hero, AVIF 1600** | **82.1 KiB** |
| **first screen total** | **≈ 112 KiB** |
| four card photos (all `loading="lazy"`) | 229.6 KiB, only on scroll |

Before the redesign the whole first screen was about 23 KiB with zero images. This is the
price of the direction: **~5× the first screen, and the site's first ever image bytes.**

## Accepted

| slot | file | source |
|---|---|---|
| `hero` | `hero.jpg` / `.webp` / `.avif` (+ 2560 variants) | Burst by Shopify — `rustic-cooking-flatlay-in-kitchen` |
| `bread-baking` | `bread-baking.*` | Burst by Shopify — `bread-loaf-on-a-wooden-cutting-board` |
| `pasta-from-scratch` | `pasta-from-scratch.*` | Burst by Shopify — `pizza-dough-ready-to-roll` |
| `knife-skills` | `knife-skills.*` | Wikimedia Commons — *Chef prepares fresh ingredients by chopping red vegetables*, Shixart1985 |
| `market-table` | `market-table.*` | Wikimedia Commons — *Produce at the Queen Victoria Market 03*, Aliceinthealice |

### Burst by Shopify licence

Read directly at
<https://www.shopify.com/stock-photos/licenses/shopify-some-rights-reserved>, verbatim:

> This Photo ("Licensed Photo") is made available for use under a nonexclusive license …
> to download, copy, modify, distribute, perform, display and use … You are free to adapt
> and use this Licensed Photo **for free for commercial and noncommercial purposes**,
> provided that you are not permitted to sell any License Photos as digital photo files or
> in any other form. **You do not need to provide attribution** to the photographer,
> Shopify or Burst …

Commercial use: **yes**. Cropping and resizing: **yes**. Attribution: **not required** —
the site credits Burst as a courtesy only.

**Burst mixes licences per photo.** Each photo page carries its own `License:` link, and one
candidate during sourcing pointed at a different licence entirely. Every accepted Burst
photo above was checked on its own page.

**The one restriction to remember:** the files must not be resold as stock photography.
Hosting them as part of this site is fine.

### Wikimedia Commons licences

| slot | licence | author | credit required |
|---|---|---|---|
| `knife-skills` | CC BY 2.0 | Shixart1985 | **yes** |
| `market-table` | CC0 1.0 | Aliceinthealice | no (credited as courtesy) |

Two rows in the site's credits block exist solely for `knife-skills`' CC BY obligation.

## Rejected, and why — keep this list

| candidate | licence was fine | rejected because |
|---|---|---|
| Wikimedia `Kitchen_setup_showcasing_grilling_equipment…` | CC BY 2.0 | A commercial restaurant line with heat lamps and an espresso machine, cluttered. Wrong subject, and unusable under large white type. |
| Wikimedia `Nine-Grain_Sourdough_Bread…` (Thad Zajdowicz) | CC BY 2.0 | The photographer's **name is watermarked into the bottom-left corner**. Found by cropping and enlarging that corner, not by eye. |
| Wikimedia `Making_of_Tagliatelle…` | CC BY-SA 4.0 | Dry noodles on a white plastic tray, flat grey overhead light. Also copyleft — cropping it would force the derivative under CC BY-SA. |
| Wikimedia `Cooking_Class_at_Mozaic…` | CC BY 2.0 | Stainless-steel industrial kitchen, people in the background. Cold and busy. |
| Burst, 6 of the first 8 opened | Burst | Failed the hard gates on sight. Same lesson: metadata would have passed them. |

**The recurring cause was the source, not the search.** Wikimedia Commons is a
documentation archive whose food photography is mostly snapshots. Curated libraries
(Burst, and to a lesser extent Pexels/Unsplash) produce deliberately lit, styled frames.

## Platform notes — measured, not recalled

- **Unsplash** — search and photo pages are behind an anti-bot wall (307 → 401). The
  licence page returns 200 but renders title-only, so its terms could **not be read**. Not
  used, and its terms are not described from memory anywhere in this project.
- **Pexels** — `/license/`, `help.pexels.com` and every photo page return 403; the API
  returns 401. Wayback refuses content replay from this host; archive.today is
  CAPTCHA-walled; r.jina.ai returns 403. The CDN works if a photo id is already known, but
  the licence is unreadable, so **no Pexels candidate is usable**.
- **Pixabay** — 403.
- **StockSnap** — licence read, genuine CC0, but its CDN serves a maximum of **960px**, so
  it fails the size requirement.
- **Openverse** — reachable, but does not index Unsplash or Pexels, and its usable hits are
  ≤1024px. **Its reported `width`/`height` describe the original, not the `url` it
  returns** — a 960px thumbnail was reported as 5184×3456. Verify bytes, never metadata.
- **Wikimedia Commons** — API works well; byte checks hit 429 rate limits, so dimensions
  were cross-checked against two independent Wikimedia APIs, and all human-viewable pages
  returned 200.

## Reproducing the files

The original downloads are 1.6–5.1 MB each and were **deleted** from the repo after
processing, to keep the demo at 3.9 MB instead of 14.1 MB. Re-fetch from the two source
URLs above, then:

```bash
node tools/burst-photos.mjs      # Burst slots: download, crop to 3:2, emit jpg/webp/avif
node tools/fetch-photos.mjs      # Wikimedia slots, via the Commons API thumburl
node tools/optimize-photos.mjs   # sizes and byte costs
node tools/weigh-redesign.mjs    # first-screen vs on-scroll transfer
```

**Encoding requires `ffmpeg` on PATH** (this project has no `sharp`, no ImageMagick, no
`cwebp`). Verified encoders: `libwebp`, `libaom-av1`.

## Two traps found while building this

1. **Do not compose Wikimedia thumbnail URLs yourself.** Hand-built
   `upload.wikimedia.org/thumb/<md5>/…` URLs returned **HTTP 400 for all six** images. The
   MD5 path was correct; the host was not the one the API uses, and the width did not match
   what the API returns. Read `imageurl`/`thumburl` from the API instead — do not
   re-implement a platform's own rules.
2. **Cropping to a ratio from a portrait source fails if you crop by height.**
   `crop=ih*3/2:ih` asks for an 8640px width on a 3840×5760 source and ffmpeg rejects it.
   Crop by width: `crop=iw:iw*2/3`. An earlier `crop=iw:ih*2/3` instead produced 800×800
   and 800×356 — it cropped vertically and let the source aspect through.

## Still to do before this goes live

- **A Lighthouse run against the deployed URL.** The budget above is measured transfer, not
  a Lighthouse score. The recorded pre-redesign baseline is Perf 98 / A11y 100 / SEO 100,
  and the image weight will move the first number down.
- **Replace the photography with the school's own.** These are licence-clean placeholders.
  Real photographs of the actual kitchen and classes would be better on every axis and
  would remove the attribution obligation entirely.
