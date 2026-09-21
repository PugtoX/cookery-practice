# Lighthouse — mobile, on the live URL

Measured on **https://pugtox.github.io/cookery-practice/** after the Pages deployment of
`40a8108`. Regenerate the raw JSON with:

```bash
npx lighthouse https://pugtox.github.io/cookery-practice/ \
  --form-factor=mobile --throttling-method=simulate \
  --output=json --output-path=docs/lighthouse/mobile.report.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox"
```

The `.json` and `.html` outputs are gitignored (500–900 kB each). This file is the record.
On Windows the run sometimes exits 1 inside `chrome-launcher`'s `destroyTmp` while it
deletes its own temp profile. The report is written before that step, so read the JSON
rather than trusting the exit code.

| | |
|---|---|
| Lighthouse | 13.5.0 |
| URL | `https://pugtox.github.io/cookery-practice/` (`finalDisplayedUrl`, checked) |
| form factor | mobile (emulated Moto G Power, DPR 2.625) |
| throttling | simulate, Slow 4G |
| run warnings | none |
| console errors | 0 |

## Scores

| Category | Score |
|---|---|
| Performance | **98** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

## Metrics

| Metric | Value |
|---|---|
| First Contentful Paint | 1.2 s |
| Largest Contentful Paint | 1.4 s |
| Total Blocking Time | 10 ms |
| Cumulative Layout Shift | 0 |
| Total transfer | 322 KiB in 9 requests (313 KiB of it images) |

**CLS 0 is the one that matters and it is not luck.** The four class pages declare
`width`/`height` on their figures and the home page cards declare them too, so the boxes
are reserved before the bytes arrive. It was 0 before the photographs existed, so this is
a measured zero rather than an absent one.

**Performance 98 is one number from a wide band.** Three runs of essentially the same
build produced 100, 98 and 98, and Speed Index moved 1.8 s → 3.9 s with no code change
behind it. Judge LCP, TBT and CLS — stable across every run — not the rounded score.

## What was fixed because of this audit

**`color-contrast` on `.tag` — Accessibility 96 → 100.** The tag painted `--accent` on
`--accent-soft`, a 10%-alpha accent wash over `--panel`. Lighthouse measured the
composited pair at **3.71:1** where 11px normal-weight text needs 4.5:1. The composited
background is the denominator that counts; against flat `--panel` the same colours read
4.19 and against flat `--page` 4.64, and both wrong numbers are close enough to look
fine. Fixed by painting the tag with `--accent-strong`, already a token in this palette:
**4.96:1**. The defect predated the class-page photographs — `.tag` is on `index.html`.

That gap is why `tools/contrast-audit.mjs` exists. It reads computed styles from a real
browser, composites translucent backgrounds, and covers all 11 pages (202 distinct
text/colour pairs). It was verified to fail: with `.tag` back on `--accent` it reports
4.09:1 on `index.html` and exits 1.

**Four 404s and a fake optimisation.** Adding a 400px candidate to the cards first
pointed `srcset` at `{name}-800.avif`, which does not exist — the 800px delivery file is
unsuffixed. Lighthouse caught it through `errors-in-console` (Best Practices 100 → 96).
Worse, while that file was 404ing the browser fell back to the 400px one, and a local run
reported image transfer of **85 KB against the live 320 KB**. That looked like a 235 KB
win and was entirely an artefact of the broken reference. Once fixed, the same
measurement returned 320 KB. Recorded in full in `change-requests.md` CR-10.

**Card alt text.** Three of the four home-page card alts were wrong — purple aubergines
described as "purple onions", tomatoes missing from the pasta image and baking paper
called a board, and a too-generic knife description. Rewritten after viewing each
photograph, to the standard applied to the class pages.

**The image directories had drifted.** Running the optimiser to build the 400px files
also re-encoded eight existing files, leaving `assets/img/` and `docs/redesign/img/`
disagreeing for the first time. Closed by syncing, and it was worth doing:
`hero-2560.avif` was 173 KB and is now 127 KB, `hero-2560.webp` 425 KB → 275 KB. Verified
in a browser at 375 / 1280 / 2560px that the re-encoded hero is valid and still selected
at the right breakpoint.

## What the image work does not buy

**The 400px candidate does not reduce bytes in this particular audit.** The cards measure
365 CSS px at a 1280px container, so at DPR 2 the browser needs about 690 physical px and
still picks the 800px file. Measured per-DPR with a fresh page each time:

| viewport | DPR | picked |
|---|---|---|
| 375px / 1280px | 1 | **400px** |
| 375px | 2, 2.625 | 800px |
| 1280px | 2 | 800px |

So the win is real on 1× displays (`market-table` 111 KB → 29 KB) and nothing on
high-density phones, which is what Lighthouse emulates. The audit's separate
`image-delivery-insight` figure (~87 KiB) is about an 800px file being served into a
660px display size; at DPR 2.625 that 800px is the physical pixels required, not waste.
Recorded, not chased.

## Baseline, for contrast (before the redesign, zero images)

| | then | first run on this build | now |
|---|---|---|---|
| Performance | 98 | 98 | 98 |
| Accessibility | 100 | 96 | **100** |
| Best Practices | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| LCP | 1.3 s | 1.4 s | 1.4 s |
| CLS | 0 | 0 | 0 |
| Total transfer | **10 KiB** | 329 KiB | 322 KiB |

The site now transfers roughly 32× what it did before it had any photographs. The old
number described a text-only page, and a better Performance score does not mean the
images were free.

## SEO 100 is not the acceptance for the SEO work

In Lighthouse 13.5 the `canonical`, `structured-data` and `robots-txt` audits all carry a
weight of 0 — they show as `null` / `notApplicable`, so a site missing all three still
scores 100. The acceptance for that work is `node ../web-gzliu/seo-check.mjs .`
(**232 checks, all passing**), not this score. Same trap recorded in
`web-gzliu/workflow.md` stage 4.

## Not yet measured

Real-device testing on an actual phone, and behaviour on a real slow mobile network.
Both are on the stage-9/10 checklist in `SPEC.md` and neither is claimed here. Lighthouse
throttling is a simulation, not a phone.
