# Cookery Class — static site

A multi-page static website: plain HTML, one hand-written stylesheet, no framework and
no bundler. It is built to be handed over — the client edits `.html` files by hand and
pushes, and nothing else has to be installed to keep it running.

Deployed at **https://pugtox.github.io/cookery-practice/**.

---

## Install

There is nothing to install. The build and the checks use only Node's standard
library, and there are no runtime dependencies:

```bash
git clone <this repository> cookery-practice
cd cookery-practice
```

Node 20 or newer is needed for the build and the tests (they use `node --test` and
ES modules). Node 24 is what CI uses and what this has actually been run on — pin to 24
if you want the version the results in `docs/lighthouse/` came from.

## Develop

```bash
npm run dev
```

Serves the site at **http://127.0.0.1:4173/cookery-practice/** and prints the URL it
is actually serving, so there is no guessing. Set `PORT` to use a different port.

The preview resolves the same URLs the deployed site does — `/about` as well as
`/about.html` — because a preview that only understands file paths will happily pass
a link that 404s in production.

If `dist/` exists the preview serves that; otherwise it serves the sources, so `dev`
works before your first build.

## Build

```bash
npm run build
```

Writes the deployable site to `dist/`. There is no compilation — the pages are already
HTML. The build does two things:

1. copies the pages, `assets/` and `public/` into `dist/`;
2. generates `dist/sitemap.xml` and rewrites the `Sitemap:` line in
   `dist/robots.txt` from **`site.config.yml`**.

That second point is the reason a build step exists at all. Absolute URLs have to
appear in the sitemap and in robots.txt, and hand-editing a domain into them is how a
site ends up pointing half its SEO at the old address. One file owns the domain.

Pages that declare `noindex` are excluded from the sitemap automatically — releasing
both signals at once is contradictory.

---

## Point it at a different domain

Edit `site.config.yml`:

```yaml
origin: https://example.com/
```

Then rebuild. Every canonical link, `og:url`, `og:image`, the sitemap and the
robots.txt `Sitemap:` line are derived from it.

If the site moves from a **sub-path** to a **root domain**, nothing else needs editing —
`tools/serve.mjs` reads the prefix from the same file. Note only that the old
sub-path URLs stop working, so anything already indexed there will need redirects that
GitHub Pages cannot issue for you.

## Checks

```bash
npm test                        # validation rules, Node's built-in runner
npm run build && node tools/link-check.mjs   # broken links and missing assets in dist/
npm run build && node tools/form-e2e.mjs     # the form's real submission path, in a browser
npm run build && node tools/nojs-post-check.mjs  # the fallback when JavaScript is blocked
```

`form-e2e` drives a headless Chrome: it serves `dist/`, points the form at a local sink,
and asserts that a valid submission produces a real POST carrying every field, that the
success state appears, that the cooldown blocks a second send, that a 500 produces an
error rather than a fake success, and that an empty form never reaches the network. It
needs `npm i -D --no-save puppeteer-core` first.

`nojs-post-check` also drives Chrome, but with JavaScript switched off, because
`assets/form.js` calls `preventDefault()` — a native form POST only happens when the
module never loads, so this path cannot be tested any other way. It checks the
`method="POST"` attribute, that the native POST leaves with all five fields and an empty
honeypot, and then submits to the real endpoint twice — once complete, once partial — to
see where a JavaScript-off visitor actually ends up. **It is not a delivery test**, and it
cannot tell you where the service filed anything: as measured, the same endpoint filed
early submissions to spam and later ones carrying the same field values to the inbox. Why
that changed is not identifiable from here, and this README will not guess. Read
`docs/form-submission.md` for the timeline and for the constraints on it. This tool sends
three submissions each run — two to the live endpoint and one to a local sink it starts
itself — and adds records to the form's dashboard.

**A real delivery was verified separately.** A submission made from the live site reached
`hugoyuan2004@gmail.com` and the notification was read back out of the mailbox. That is
the claim that matters, and it does not come from any test in this repository.

To regenerate the social preview image after editing `assets/og.svg`:

```bash
npm i -D --no-save puppeteer-core
node tools/make-og.mjs      # writes assets/og.png at 1200x630
```

Two more checks live in the workflow this project came from and are run from there,
because they are shared across projects rather than owned by this one:

```bash
node ../web-gzliu/structure-check.mjs .      # one h1 per page, header/main/footer, static output
node ../web-gzliu/seo-check.mjs .            # canonical, OG, JSON-LD, sitemap, robots, noindex
node ../web-gzliu/viewport-check.mjs .       # 375px: no horizontal scroll, targets >= 44px
```

`viewport-check` needs Chrome on the machine and its one dependency installed
without saving it:

```bash
npm i -D --no-save puppeteer-core
```

---

## The callback form

The form on the home page posts to **Formspree**. Every field is validated in the
browser first, but that is not what makes it work — the `action` attribute is. Even
with JavaScript switched off, a submission goes to whatever that attribute names.

**It is connected.** The action is:

```
https://formspree.io/f/xdekaddz
```

Submissions arrive at the account that owns that form. To point it somewhere else:

1. Create a form in that Formspree account (50 submissions a month on the free tier)
   and add the destination inbox under Linked Emails.
2. Replace the form id in the `action` attribute in `index.html` — the id is the last
   path segment, `xdekaddz` in the URL above.
3. Submit it once for real and confirm the message arrives. Do not skip this — a form
   that looks like it worked but goes nowhere is worse than no form at all, because
   the visitor believes they have been in touch.

The form id is not a secret: it ships in the HTML of every page that posts to it. It is
the live endpoint, not a placeholder.

Spam and duplicate protection: a honeypot field, plus a 60-second per-browser
cooldown. Neither is a security control; they stop bots and double-taps.

---

## Adding or editing a page

Edit the `.html` file directly. The header, footer and `<head>` are duplicated in
every page on purpose — there is no templating engine to learn and no build step
between the file and the browser.

When you add a page:

1. copy an existing page as the starting point, and give it its own `<title>`,
   `description` and **self-referencing canonical** (`<link rel="canonical">` must
   point at that page, not at the home page);
2. update the `<lastmod>` situation by rebuilding — the sitemap is generated;
3. add the link to the `<nav>` in every page if it belongs in the main navigation;
4. run `node tools/link-check.mjs` afterwards, which is what catches a link to a file
   you have not created yet or an anchor id you renamed.

Notes for the `.html` files:

- **One `<h1>` per page.** `structure-check.mjs` fails otherwise.
- **Interactive controls need 44px of height.** Buttons, nav links, footer links and
  form inputs. Links inside a sentence are exempt (WCAG's inline exception) and are
  reported separately rather than failed.
- `privacy.html` and `terms.html` carry `<meta name="robots" content="noindex, follow">`
  and are deliberately left out of the sitemap. If you want them indexed, remove that
  tag — the sitemap will pick them up on the next build.

## Layout

```
index.html  classes.html  recipes.html  about.html  contact.html
privacy.html  terms.html                 the pages
classes/*.html                           one page per class
assets/style.css                         the whole stylesheet
assets/form.js  assets/validate.js       form wiring, and the rules on their own
assets/og.png                            social preview image (1200x630, raster)
assets/og.svg                            the source it is rendered from — see make-og
public/robots.txt                        copied to the site root at build time
site.config.yml                          the domain — the only place it appears
tools/                                   build, preview, link check, form e2e, generators
tools/emit-page.mjs                      shared shell for the generated pages
tools/gen-*.mjs                          one-off generators (see below)
tools/form-e2e.mjs                       drives a browser through the form's real path
tools/nojs-post-check.mjs                the same form with JavaScript disabled
tools/css-cost.mjs                       bytes added to the stylesheet, raw / gzip / brotli
tools/preview-check.mjs                  renders the background preview; 375px overflow check
tools/serve-docs.mjs                     serves the design previews under docs/ (port 4211)
tools/redesign-check.mjs                 asserts the redesign layout at 375 / 768 / 1280px
tools/weigh-redesign.mjs                 first-screen vs on-scroll transfer for the preview
tools/fetch-photos.mjs                   downloads the Wikimedia photos via the Commons API
tools/optimize-photos.mjs                emits jpg/webp/avif at display widths
tools/burst-photos.mjs                   downloads the Burst photos, crops to 3:2, encodes
docs/design/background-system.md         the background/UI design specification
docs/redesign/index.html                 the redesign proposal (A direction)
docs/redesign/redesign.css               its stylesheet, token-for-token against style.css
docs/redesign/photos.md                  photo sources, licences, and rejected candidates
docs/backgrounds-preview.html            the three background directions side by side
tests/validate.test.js                   13 tests for the form rules
.github/workflows/deploy-pages.yml       push to main -> build -> deploy
```

The four `docs/` entries above are design material, not part of the site: `tools/build.mjs`
skips `docs/`, and the deploy workflow uploads only `dist/`, so none of it is ever
published. Run `node tools/serve-docs.mjs` and open <http://127.0.0.1:4211/> for an index
of them — `npm run dev` cannot serve these, because it serves `dist/` when a build exists
and `docs/` is deliberately not in `dist/`.

**Encoding the photographs needs `ffmpeg` on PATH.** This project has no `sharp`, no
ImageMagick and no `cwebp`; `libwebp` and `libaom-av1` were verified available. See
`docs/redesign/photos.md` for the licences and for two traps worth not rediscovering.
Open the preview straight from disk — `docs/backgrounds-preview.html` — because
`npm run dev` serves `dist/`, which does not contain it. It loads `../assets/style.css`, so
it always shows the real stylesheet.

`tools/gen-class-pages.mjs` and `tools/gen-content-pages.mjs` produced the class and
content pages from data tables, so that five near-identical pages could not drift
apart in their heads or footers. **The HTML files are the source now.** They are not
run by the build. Re-run one only when a structural change has to reach several pages
at once, and expect to lose any hand edits to those pages when you do.

## What this deliberately does not have

- No framework, no bundler, no TypeScript.
- No CSS framework. The stylesheet is about 485 lines and is meant to be read.
- No analytics, no cookies, no tracking.
- No CMS. Editing the site means editing the files.
- No redirects. GitHub Pages cannot issue them; that needs a different host or a
  Cloudflare rule in front.

---

## Handover answers

For whoever maintains this next:

| Question | Answer |
|---|---|
| Where is it hosted? | GitHub Pages, from the `main` branch of this repository. Push to `main` and it deploys. |
| Where is DNS managed? | Currently nothing to manage — the site is on a `github.io` sub-path. Pointing a real domain at it means editing `site.config.yml`, adding the domain in the repository's Pages settings, and adding a `CNAME` record. |
| Where is the form managed? | Formspree. Submissions arrive by email; the account also keeps 30 days of history. |
| Who manages Search Console? | Nobody yet. Verify the property after the domain is connected, then submit `/sitemap.xml`. |
| Which accounts must be kept? | The GitHub account that owns this repository, and the Formspree account. Losing either means losing the ability to deploy or to receive enquiries. |
| How do I update a page? | Edit the `.html` file, commit, push. Roughly a minute to go live. |
| How do I change a colour? | Edit the custom properties at the top of `assets/style.css`. Check contrast before committing — see below. |

### Before changing a colour

The palette was chosen by measuring, not by eye. Text contrast was verified with
`../web-gzliu/contrast-check.mjs`. A colour that looks fine on your monitor can fall
below the 4.5:1 ratio that makes text readable, so if you change `--fg`, `--muted`,
`--page` or `--panel`, re-run that check before you trust it.
