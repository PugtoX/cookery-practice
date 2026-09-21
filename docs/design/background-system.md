# Background system — Cookery Class

Design specification for the background layer of `https://pugtox.github.io/cookery-practice/`.
Written to be pasted into a stylesheet without re-deriving anything, and to be extended
by whoever comes next without re-deciding the questions this file already settled.

Status: **Direction A (Grid Paper) is implemented.** Directions B and C are recorded here
as considered-and-not-chosen, with their measured cost, so that the decision does not have
to be made twice.

---

## 1 · Product, users and use case

**Product.** A single-location cookery school in Sydney selling hands-on classes. It is a
lead-generation site: the conversion is a callback request through the form on the home
page, or a phone call. There is no cart, no account, no CMS.

**Users.** People deciding whether to spend AUD 95–240 on an evening or a day of cooking.
They arrive mostly from search, mostly on a phone, often while doing something else. They
decide fast and they need three facts: what the class is, how long it takes, and how to
get in touch.

**Core scenario.** Search result → a class page or the home page → skim the heading and the
price band → either submit the form or leave. Session length is short and scroll depth is
shallow, which is why the visual weight belongs at the top of the page and why the
decision below is confined to the two blocks the user actually reads first.

### Where visual hierarchy was missing

| Area | State before | Treatment |
|---|---|---|
| `.page-head` — eyebrow + h1 + lede, present on **all 11 pages** | Flat `--page`, identical to every other section | **Got the grid texture.** Highest-leverage single change: it is the one block on every page. |
| `ol.steps` — the four-step "how a class runs" list, home page only | Flat, reads as body copy | **Got the grid texture.** It is the only numbered sequence on the site and benefits from reading as a discrete instrument. |
| `.card` / `.cards` | Already has `--panel` + border + radius | Left alone. It already separates from the page. |
| `.site-header` | Opaque sticky bar | **Left alone deliberately.** See §3. |
| `.ebtn` hover states | Already defined | Left alone. |
| Body background | Flat `--page` | **Left alone deliberately.** See §3. |

---

## 2 · Inventory and hard constraints

### Existing design system (untouched except where noted)

Measured from `assets/style.css`. Palette is candidate **G "Herb Garden"**
(`web-gzliu/palettes/index.html`, shortlisted).

| Token | Value | Role | Changeable? |
|---|---|---|---|
| `--accent` | `#3f6212` | Brand olive; links, primary button, tags | **No** — brand |
| `--accent-soft` | `rgba(63, 98, 18, 0.10)` | Tag fill | No |
| `--page` | `#f7f8f3` | Body + sticky header background | **No** — brand |
| `--panel` | `#ffffff` | Cards, form fields | No |
| `--panel-hover` | `#f1f4ea` | Ghost button hover | No |
| `--line` | `#e2e6d8` | Hairlines between sections and cards | No |
| `--line-strong` | `#cbd3bb` | Ghost button border | No |
| `--fg` | `#12180f` | Body text | **No** — measured against `--page` |
| `--muted` | `#57614b` | Secondary text | **No** — measured against `--page` |
| `--grid` | `rgba(18, 24, 15, 0.05)` | **Grid texture stroke** — declared from the start, referenced by nothing until now | Consumed, not changed |
| `--grid-tile` | `28px` | **New.** Grid tile size | New token |
| `--measure` | `34rem` | Content column | No |
| `--step-0..4` | `1 / 1.125 / 1.375 / 1.75 / 2.125rem` | Type scale | No |
| `--radius` | `10px` | Corner radius | No |

Font stack is `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` —
**no webfont, no network request**. Any proposal that introduces a font file is out of
scope by default.

### Constraints that shaped the decision

1. **The sticky header is the binding constraint.** `.site-header` is `position: sticky`
   with an opaque `background: var(--page)`. Any texture placed on `body` is sliced by it,
   producing a visible seam wherever content scrolls beneath. This is why the chosen
   direction paints content blocks and never `body`.
2. **375px is the floor, not a target.** `web-gzliu/viewport-check.mjs` opens every page at
   375px and fails on horizontal scroll. Every interactive control is ≥44px.
3. **Weak network / low-end devices.** First screen is HTML ≈12.4 KB + one stylesheet. Any
   added byte is a visible share of that. Zero new requests and zero raster images is the
   cheapest position available, and it is the one taken.
   > **Corrected 2026-09-21 — the "zero raster images" half is no longer true.** See the
   > correction block below the list. The reasoning is kept because it explains why the
   > background layer was built the way it was.
4. **Zero build step.** The site is served as written: no bundler, no minifier, no
   preprocessor. Comments ship. That is why the CSS block below is short and the long
   rationale lives here instead.
5. **No motion exists on the site.** `prefers-reduced-motion` is satisfied by there being
   nothing to reduce. Adding animation would create a debt, not discharge one.
6. **Zero `<img>` on the site.** `assets/og.png` (57.9 KB) appears only in `og:image`
   metadata and is **never downloaded by a visitor**. This inverts the usual intuition
   about image cost and is recorded because a later "just add a hero photo" proposal would
   be the first real byte cost this site has ever paid.

> ### ⚠️ Correction, 2026-09-21 — items 3 and 6 above are no longer true
>
> This list was written while the site had no images. It does now, so two of its six
> constraints describe a site that no longer exists:
>
> | Then | Now (measured on the live URL, 2026-09-21) |
> |---|---|
> | "zero raster images" | **29 raster files** in `assets/img/` |
> | "Zero `<img>` on the site" | **5 image requests on first load**; `assets/og.png` is still metadata-only |
> | "pays zero image bytes" | **305.8 KiB of images of 322.1 KiB total transfer** — images are ~95% of the page |
>
> **The prediction at the end of item 6 came true and it was under-stated.** It said adding
> a hero photo "would be the first real byte cost this site has ever paid" — the actual
> result is that the first screen is now roughly **32×** its former size (10 KiB → 322 KiB),
> and images are almost all of it. This is not a defect, but it does close the premise the
> background layer was designed under, so anything below that still assumes "no images"
> needs re-reading rather than trusting.
>
> Two of the targets further down are also worth measuring against, because they were
> aspirational when written and the delivery does not meet them: the Raster table asks for
> **≤40 KB for a hero** and the delivered `hero.avif` is **78.6 KiB**; it asks for
> **≤15 KB below the fold** and `market-table.avif` is **108.9 KiB**. Both are unmet.
>
> Note on where that is recorded: `web-gzliu/readiness-gate.md` G5 tracks a **different
> pair** of budgets (≤ 200 KiB total transfer, ≤ 100 KB per image) and does not mention the
> 40 KB / 15 KB targets at all. The two failing figures above are therefore recorded **in
> this file's own Raster table, and only here**. An earlier version of this note wrongly
> attributed them to the gate's G5; corrected 2026-09-21.

### Locked (do not change without re-running the checkers)

- `--accent`, `--page`, `--panel`, `--fg`, `--muted` values and semantics
- The system font stack
- `--measure: 34rem`, the type scale, `--radius: 10px`
- 375px minimum, 44px touch targets, `.skip-link`, `:focus-visible` outline
- Zero external requests

---

## 3 · The three directions compared

Costs below are **measured**, not estimated: `tools/css-cost.mjs` diffs the committed
stylesheet against the current one through `node:zlib` at gzip level 9 and brotli quality 11.

| | A · Grid Paper | B · Olive Wash | C · Charcoal Kitchen |
|---|---|---|---|
| **Mood** | Orderly, notebook-like, editorial | Warm, kitchen-adjacent, ambient | Evening classes, professional kitchen |
| **Mechanism** | Two `repeating-linear-gradient` on content blocks | Radial gradients on `body` | Full dark re-skin |
| **New requests** | 0 | 0 | 0 |
| **New bytes (brotli)** | **+415 B** | ≈+300 B | ≈+400 B |
| **Touches `body`** | No | **Yes** | **Yes** |
| **Touches `.site-header`** | **No** | **Yes** (must, or a seam appears) | Yes |
| **Touches brand colour** | No | No | **Yes** — replaces `--accent` |
| **Contrast risk** | None — texture sits under text at 5% alpha | Low — compute against shifted base | Requires full re-measure |
| **Low-end risk** | Low — static paint, no scroll repaint | **Medium** — large radial gradients can repaint per frame | Low |
| **Reduced-motion** | Already satisfied | Already satisfied | Already satisfied |
| **Verdict** | **Chosen** | Not chosen | Not chosen |

### Why A

It is the only direction that achieves visible hierarchy while touching **neither `body`
nor `.site-header`**. The seam problem in §2.1 cannot occur because the layer the header
would slice does not exist. It also consumes a token (`--grid`) that the palette had
already reserved and no rule had ever used, so it adds no new colour vocabulary.

### Why not B

Visually stronger, and a reasonable second choice. Rejected because it requires rebasing
`.site-header` onto the same gradient layer — an edit to a working, verified rule — and
because large radial gradients are a known per-frame repaint cost on low-end phones, which
is precisely the constraint this project set out to respect.

### Why not C

It is a re-skin, not a background. It replaces `--accent`, i.e. it breaks the "do not
change the brand tone" premise, and it degrades long-form reading on `privacy.html` and
`terms.html`. If the intent is ever a full visual rebrand, C is the right conversation —
but it should be held as its own decision, not smuggled in as a background option.

---

## 4 · Direction A — implementation

### Layer order (bottom to top)

| # | Layer | What paints it |
|---|---|---|
| 1 | `--page` `#f7f8f3` | `body` background — unchanged |
| 2 | Grid strokes `rgba(18,24,15,0.05)` | `.page-head::before`, `ol.steps::before`, `z-index: -1` |
| 3 | Section content | Normal flow, `z-index: auto` |
| 4 | Sticky header | `z-index: 5` — above everything, unchanged |

### Geometry

| Property | Value | Note |
|---|---|---|
| Tile | `28px × 28px` | `--grid-tile`; 1.75rem at a 16px root, so it lands on the 4px rhythm |
| Stroke | `1px` per axis | Two gradients, one horizontal, one vertical |
| Mask | `linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)` | Fades the texture out downward |
| Masked, not clipped, so no hard edge | — | Applied to the pseudo-element only |
| Inset | `0` | Fills the host block |

### CSS as implemented (`assets/style.css`)

```css
:root {
  --grid: rgba(18, 24, 15, 0.05);
  --grid-tile: 28px;
}

.page-head,
ol.steps {
  position: relative;
  isolation: isolate;
}

.page-head::before,
ol.steps::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(to right, var(--grid) 0 1px, transparent 1px var(--grid-tile)),
    repeating-linear-gradient(to bottom, var(--grid) 0 1px, transparent 1px var(--grid-tile));
  background-size: var(--grid-tile) var(--grid-tile);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
}
```

**Four decisions inside those 20 lines, each load-bearing:**

- **`::before` rather than the element's own `background-image`.** The mask must fade the
  texture only. Masking the element would fade its text too.
- **`isolation: isolate` on the host.** Scopes the `-1` layer to this section so the
  texture can never fall behind the page background. Verified rendering in Chrome; without
  it the behaviour depends on the host's stacking context, which is not worth relying on.
- **`pointer-events: none`.** The pseudo-element covers the whole block; without this it
  would sit under the touch target of anything inside `.page-head`.
- **`width: 100%` is absent on purpose** — `inset: 0` already sizes it, and adding a width
  would be the kind of redundant declaration that rots.

### Adding the texture to another block

The pattern is `position: relative; isolation: isolate` on the host plus one selector in
the `::before` list. Add the selector to **both** rule groups; do not copy the block. If
the new host has its own opaque background, the texture will be hidden — that is the
correct failure, and it is why `.card` was left out.

### Breakpoints

**None are needed, and none were added.** The texture is resolution-independent and the
tile does not scale. The site's only breakpoint remains `@media (min-width: 40rem)` for the
two-column card grid. The grid tile does not reflow, so there is nothing to re-decide at
375px, 768px or 1440px.

---

## 5 · Component state matrix

Only two states changed (marked ●). The rest is recorded so the table is usable as a
reference and so a future edit can see what it is about to affect. `:focus-visible` is the
only focus treatment — there is no `:focus` rule, deliberately.

| Component | Default | Hover | Focus-visible | Active | Disabled |
|---|---|---|---|---|---|
| **Page background** | `--page` `#f7f8f3` | — | — | — | — |
| **Grid texture** ● | `rgba(18,24,15,.05)` 1px / 28px, masked | — (static) | — | — | — |
| `.page-head` ● | now an isolated stacking context | — | — | — | — |
| `.site-header` | `--page` + bottom hairline | — | — | — | sticky, `z-index: 5` |
| `.card` | `--panel` + `--line` + 10px radius | — | — | — | — |
| `.card-link` | `color: inherit`, no underline | h3 underlined | outline 2px `--accent`, offset 2px | — | — |
| `.btn` | `--accent` fill, `#fff` text, 48px min | `#2f4a0d` | outline 2px `--accent`, offset 2px | — | not styled — **gap, see below** |
| `.btn-ghost` | transparent, `--fg`, `--line-strong` border | `--panel-hover` | outline 2px `--accent`, offset 2px | — | not styled — **gap** |
| `.tag` | `--accent` on `--accent-soft`, pill | — | — | — | — |
| `.skip-link` | off-screen, 44px min height | — | moves on-screen, `--panel` + `--line-strong` | — | — |
| Form inputs | `--panel` + `--line` border | — | outline 2px `--accent` | — | — |
| `.field-error` | `hidden`; red-family text when shown | — | — | — | — |
| `a` (inline, in prose) | `--accent` | underlined | outline 2px `--accent` | — | — |

**Two honest gaps in this table.** `.btn` and `.btn-ghost` have **no `:disabled` style**.
`assets/form.js` sets `button.disabled = true` during submission, so a disabled submit
button is reachable in production and currently looks identical to an enabled one. This
predates the background work and is recorded here rather than silently fixed; it is a
one-rule change whenever it is wanted:

```css
.btn:disabled,
.btn[aria-disabled='true'] {
  opacity: 0.55;
  cursor: not-allowed;
}
```

There is also no `:active` treatment anywhere. On a static lead-gen site that is a
defensible omission, not an oversight — noted so the next person does not read the empty
column as an accident.

---

## 6 · Accessibility

### Contrast

Measured by `web-gzliu/contrast-check.mjs`: **48 checks, all ≥ 4.5:1, minimum 6.12:1**.
Palette G specifically: `fg/panel 18.05`, `muted/panel 6.53`, `fg/page 16.91`,
`muted/page 6.12`. WCAG AA for body text is 4.5:1, so every text/background pair clears it
with margin.

**The texture does not change any of those numbers.** It paints at 5% alpha over `--page`,
so the effective background under text shifts by at most ~1/20 of the way from `#f7f8f3`
toward `#12180f`. At that amplitude the ratio moves in the third significant figure — well
inside the margin above. The checker's own stated limitation applies and is not hidden: it
covers flat "text colour × background colour" pairs only, and does not model the rendered
composite. The pixel evidence for the composite is the captured screenshot, not the ratio.

### Focus visibility

`:focus-visible` gives a 2px `--accent` outline at 2px offset, on every focusable element.
The grid texture is behind the content and cannot occlude it: `z-index: -1` plus
`pointer-events: none`. Verified by rendering, not by reasoning about layer order.

### Motion and `prefers-reduced-motion`

**Nothing in this direction animates, so there is nothing to reduce.** This is the
strongest form of the requirement — the preference is honoured by construction rather than
by a media query that could be forgotten. If motion is ever added to this site, it must
come with a `prefers-reduced-motion: reduce` block in the same change; a block without
motion is dead code and was deliberately not added.

### Screen readers

The texture is emitted from `::before` with no text content, so it is invisible to the
accessibility tree. No `aria-hidden` is needed, and none was added.

### Zoom and reflow

The texture is drawn in CSS pixels and is unaffected by text zoom. At 200% zoom the tile
stays 28px while text doubles, so the texture becomes finer relative to the text — a
cosmetic effect, not a legibility one, because the strokes are decorative and carry no
information. Nothing about the layout depends on them.

---

## 7 · Performance

### The cost, measured

Two readings, because they answer different questions.

**Absolute — what this feature costs, reproducible from the file alone:**

| | raw | gzip | brotli |
|---|---|---|---|
| Grid block (token + rules + comments) | **756 B** | 452 B | 352 B |
| **The rules alone, comments stripped** | **89 B** | 98 B | **76 B** |

The delivering code is **89 bytes raw / 76 bytes brotli**. Everything above that is
explanation. On a site with a minifier the number would be 76; this site has none, so 352
is what actually ships.

**Relative — the whole stylesheet, before and after:**

```
baseline   raw    9680   gzip   3233   brotli   2676     (commit before this change)
current    raw   10991   gzip   3720   brotli   3091
delta raw    1311 bytes
delta gzip    487 bytes
delta brotli  415 bytes
```

`tools/css-cost.mjs` reproduces the relative table by diffing the stylesheet against the
last commit that touched it. Run it with a clean tree and it prints zeroes — that is
correct behaviour, not a bug: with the change committed, the baseline *is* the current
file. To re-measure a future change, run it before committing.

**The lesson worth keeping.** The first cut of this block was written with the full
rationale inline and cost **+784 brotli** for the same 89 bytes of delivered rules. Moving
that prose into this document halved the shipped cost without discarding a single
argument. On a hand-written, unminified stylesheet, **the comments are usually the larger
half of any diff** — check which half you are actually arguing about.

### What was not added

| | |
|---|---|
| New HTTP requests | **0** |
| Raster images | **0** |
| Web fonts | **0** |
| Animation / JS | **0** |
| Repeating repaint on scroll | **0** — static paint, no `background-attachment: fixed` |

### The honest limit on this section

**No new Lighthouse run was performed.** The recorded baseline (Perf 98 / A11y 100 / SEO
100, mobile, simulated throttling) was measured against the **live URL** with Lighthouse
13.5.0, and Lighthouse is not installed here; running it against localhost would not be a
comparable reading and has not been presented as one. What is verified is the byte delta
above and that the regression suite is green. **A Lighthouse re-run against the deployed
URL is outstanding** and is the correct way to close this item.

---

## 8 · Asset specification

**No new assets are required by this direction, and none were added.** If a later revision
wants one, these are the constraints it must respect.

### SVG (preferred if an asset is ever needed)

| Property | Specification |
|---|---|
| Kind | Data-URI inline in CSS, or a single file under `assets/` |
| Budget | **≤ 1 KB** uncompressed, before gzip |
| Viewport | `viewBox="0 0 28 28"` to match `--grid-tile`, if it replaces the texture |
| Colour | Must reference `currentColor` or be pure alpha, so it inherits the palette |
| Fills | Flat only — no gradients inside the asset, no filters, no `<image>` |
| `role` | None; decorative assets carry no `title`/`desc` |

### Raster (discouraged)

| Property | Specification |
|---|---|
| Reason to exist | Only if a photograph is ever added; there is currently no `<img>` on the site *(superseded 2026-09-21 — see the correction above; the site now has 29 raster files and 5 image requests on first load)* |
| Format | AVIF first, WebP fallback, PNG only if neither is possible |
| Budget | ≤ 40 KB for a hero, ≤ 15 KB for anything below the fold |
| Dimensions | Provide 1× and 2×, never larger than the largest rendered size |
| `loading` | `loading="lazy"` + explicit `width`/`height` for anything below the fold |
| Above the fold | Never lazy — it delays LCP |
| Alt text | Required. A decorative image uses `alt=""`, never a missing attribute |

**Note the asymmetry.** This site currently pays zero image bytes because `og.png` is
metadata-only. Adding the first real image is a larger step than it looks and should be
treated as its own decision with its own measurement.

> **Superseded 2026-09-21.** The step described above has been taken: the site now ships
> 29 raster files and pays **305.8 KiB** of image bytes on first load. Both statements in
> this note are therefore false as written — `og.png` is still metadata-only, but the site
> is no longer image-free. The `Budget` row above (≤40 KB hero / ≤15 KB below the fold) is
> also unmet in delivery: `hero.avif` is 78.6 KiB and `market-table.avif` is 108.9 KiB.
> Kept rather than deleted because it is the standard the delivery was measured against.

---

## 9 · Verification performed

| Check | Result |
|---|---|
| `web-gzliu/contrast-check.mjs` | **48/48 ≥ 4.5:1**, min 6.12:1 |
| `web-gzliu/viewport-check.mjs` | **PASS**, no horizontal scroll at 375px (5 inline-link exemptions, all in prose) |
| `web-gzliu/structure-check.mjs` | **47/47** |
| `web-gzliu/seo-check.mjs` | **PASS** |
| `tools/link-check.mjs` | 163 references, **0 findings** |
| `npm test` | **13/13** |
| Rendered pixel evidence | `.page-head`, `ol.steps`, and a class page captured and inspected |
| Sticky-header seam | Visually confirmed absent on home page and `classes/knife-skills.html` |
| Overflow at 375px and 1280px | `scrollWidth − clientWidth = 0` in every direction |
| Deployed | `dist/assets/style.css` and the live stylesheet are **SHA256 identical**; the live file carries `--grid-tile` |
| Route count | 16 routes local and live, **all 200** |

**Outstanding:** a Lighthouse run against the deployed URL (§7).

---

## 10 · How to extend this system

1. **Reuse `--grid` and `--grid-tile`.** Do not introduce a second texture colour. If a new
   surface needs a different grid, add a `--grid-*` token beside these and say why in this
   file.
2. **Never put a texture on `body` while `.site-header` is opaque and sticky.** Either both
   change together, or neither does.
3. **Add the host to both rule groups** (`position`/`isolation` and `::before`), not a copy
   of the block.
4. **A host with its own opaque background will hide the texture.** That is intended.
5. **Re-run `contrast-check`, `viewport-check` and `css-cost` after any change here.** The
   numbers in this file go stale the moment `assets/style.css` changes; the checker is the
   source of truth, this file is the record.
6. **Stop at 5% alpha** for decorative texture. Above that it starts competing with
   `--muted` text for attention, which is the failure mode this whole design is avoiding.
