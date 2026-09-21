# Lighthouse — mobile, on the live URL

Measured on **https://pugtox.github.io/cookery-practice/** after the Pages deployment of
`bbd0b7b`. Regenerate the raw JSON with:

```bash
npx lighthouse https://pugtox.github.io/cookery-practice/ \
  --form-factor=mobile --throttling-method=simulate \
  --output=json --output-path=docs/lighthouse/mobile.report.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox"
```

The `.json` and `.html` outputs are gitignored (500–900 kB each). This file is the record.

| | |
|---|---|
| Lighthouse | 13.5.0 |
| URL | `https://pugtox.github.io/cookery-practice/` (`finalDisplayedUrl`, checked) |
| form factor | mobile (emulated Moto G Power) |
| throttling | simulate, Slow 4G |
| run warnings | none |

## Scores

| Category | Score |
|---|---|
| Performance | **100** |
| Accessibility | **96** |
| Best Practices | **100** |
| SEO | **100** |

## Metrics

| Metric | Value |
|---|---|
| First Contentful Paint | 1.2 s |
| Largest Contentful Paint | 1.4 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.8 s |
| Total transfer | 336 KiB in 9 requests |

**CLS 0** is the one that matters most here and it is not luck: the four class pages
declare `width`/`height` on their figures, so the box is reserved before the bytes
arrive. It was 0 before the photographs existed too, so it is a real measurement rather
than an absent one.

## Accessibility 96 — one real defect, and it is pre-existing

The only failing audit is `color-contrast`:

```
span.tag  "3 HOURS"  foreground #a8622f  background #ede3d6
insufficient contrast of 3.71 (font size 11px, weight normal). Expected 4.5:1
```

`.tag` painted `--accent` text on `--accent-soft`, a 10%-alpha accent wash over
`--panel`. The composited background is what counts, and the arithmetic that matters is
`--accent` against **that**: **3.72:1**, not the 4.19 you get against flat `--panel`
nor the 4.64 against flat `--page`. Both of those wrong denominators are how this
survived review.

**This defect predates the class-page photographs** — `.tag` is on `index.html`, which
the photograph change never touched. Lighthouse had simply never been run on this build.

Fixed by painting `.tag` with `--accent-strong` (already a token in this palette):
**4.96:1**. Re-verified by redeploying and re-running this audit — Accessibility is
**100** in the run recorded below.

## Why the SEO score is not the acceptance for SEO work

In Lighthouse 13.5 the `canonical`, `structured-data` and `robots-txt` audits all carry
a weight of 0 — they show as `null` / `notApplicable`, so a site missing all three still
scores 100. The acceptance for that work is
`node ../web-gzliu/seo-check.mjs .` (**232 checks, all passing**), not this score. Same
trap recorded in `web-gzliu/workflow.md` stage 4.

## Two things the scores do not show

**Cache lifetime is a platform property, not ours.** `cache-insight` scores 0 and flags
all 8 subresources at a 600 s TTL. That is the GitHub Pages default; nothing in this
repository can change it. It is recorded so it is not mistaken for a build defect.

**On mobile, all five photographs load, and that is a design assumption that does not
hold.** Total image transfer is 320 KiB of the 336 KiB. The home page hero is lazy-free
by design, but the four card images carry `loading="lazy"` on the assumption that cards
sit below the fold — true at 1280px, false at the 412px emulated viewport, where the
cards stack to one column and every one of them is near the first screen. The
photographs cost 10 KiB → 336 KiB against the zero-image baseline below.

`image-delivery-insight` also reports ~87 KiB of avoidable bytes: `market-table.avif`
(800px wide, displayed 660px) wastes 56.8 kB, `bread-baking.avif` 19.8 kB,
`pasta-from-scratch.avif` 12.8 kB. The home page hero already uses `srcset`; the card
images do not. Not fixed here — record only.

## Baseline, for contrast (before the redesign, zero images)

| | then | now |
|---|---|---|
| Performance | 98 | 100 |
| Accessibility | 100 | 96 → **100** after the `.tag` fix |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| LCP | 1.3 s | 1.4 s |
| CLS | 0 | 0 |
| Total transfer | **10 KiB** | **336 KiB** |

Performance rose while the site gained 320 KiB of images. Read that as evidence the
score is not a contract, not as evidence the images were free: per visit the site now
transfers roughly 33× what it did. The old number described a text-only page.

## Not yet measured

Real-device testing on an actual phone, and behaviour on a real slow mobile network.
Both are on the stage-9/10 checklist in `SPEC.md` and neither is claimed here. Lighthouse
throttling is a simulation, not a phone.
