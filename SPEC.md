# SPEC — Static Site Deployment + Technical SEO (practice run)

**Stage 0 of the ten-stage workflow.** This file exists to turn a vague brief into an
**acceptance-checkable scope**. Four sections must be present or this SPEC is not
final: deliverables, exclusions, revision limit, slip clause.

> **Practice declaration.** The brief below is a real job posting, used here as the
> requirement source for a practice run. There is no paying client and no external
> confirmation yet, so the "client confirmation" block at the end is **unsigned**.
> That is why `readiness-gate.md` still records **G4 as partial** — a signed scope
> needs a real client, and this file cannot substitute for one.

---

## 1. Client's brief (verbatim, unpurged)

**Source**: Upwork job posting `~022101521596705938026`
("Deploy Static HTML Website - Web Development"), fixed price US$100.

> Static website launch, domain setup, email setup and technical SEO
>
> I have a simple HTML/CSS website completed for a small Sydney business and need an
> experienced freelancer to get it live, configure the domain and email, and make
> sure the site is technically ready to be crawled and indexed by Google.
>
> The site is already built: 1 home page, 4 blog pages, terms/privacy policy, images,
> roughly 30 files. No CMS, no database, no build process. I will maintain it myself
> after handover.
>
> This is primarily a deployment + technical SEO + QA job, not a redesign.
>
> **1. Hosting** — deploy existing HTML/CSS site to free static hosting (Netlify,
> Cloudflare Pages, Vercel). Set up on my own accounts so I keep full control. Ensure
> the site loads reliably over HTTPS.
>
> **2. Domain and DNS** — connect the learntocook.au domain. Configure HTTPS/SSL
> correctly. Redirect www to the preferred non-www version. Ensure there is only one
> clear canonical version of the site. Check for redirects or DNS issues that could
> affect crawling or indexing. Ensure sitemap.xml and robots.txt are reachable.
>
> **3. Technical SEO / Google readiness** — check the completed site for the minimum
> technical requirements that could affect Google's ability to crawl and index it. At
> minimum: confirm important pages are crawlable and indexable · check robots.txt ·
> check sitemap.xml · check canonical URLs · check for accidental noindex or other
> index-blocking settings · check internal linking between pages · check for broken
> links or missing images · check page titles and meta descriptions are present and
> sensible · check heading structure for obvious technical problems · check image alt
> text is added where missing or necessary · ensure it works on mobile · check page
> speed and fix obvious performance issues · ensure there are no obvious duplicate
> URL/version issues. Connect/verify Google Search Console and submit the sitemap if
> appropriate.
>
> **Important**: I do not require full SEO marketing, keyword research, link building
> or copywriting. I want the existing website technically correct so Google can crawl,
> understand and index it. Please do not rewrite content or substantially redesign
> pages without asking first.
>
> **4. Email** — configure two domain email addresses delivering into my existing
> Gmail account. Configure Gmail so I can send from those two addresses. Recommend the
> most practical low-cost setup and briefly explain why. Configure SPF and DKIM
> correctly. Test sending and receiving.
>
> **5. Callback form** — connect the existing home page form using Netlify Forms,
> Formspree or another simple reliable option. Do one test submission. Confirm the
> submission reaches the main email address.
>
> **6. Site-wide QA** — test the site thoroughly on desktop and mobile. Check: every
> page loads · navigation and internal links work · images load · no horizontal scroll
> or mobile overflow · sticky call button works · FAQ accordion works · form works ·
> HTTPS and redirects work · no obvious console errors or broken resources · no
> obvious technical SEO problems.
>
> This is a checks-and-fixes job, not a redesign. If you find anything that would
> improve the site or SEO but is not listed above, tell me separately before changing it.
>
> **7. Handover** — provide a brief handover note covering: where the site is hosted ·
> where the domain/DNS is managed · where the form is managed · who manages Google
> Search Console if set up · which accounts/permissions I need to keep · how to update
> pages myself in future.
>
> **Access**: I will provide a ZIP of the site and appropriate account access. Where
> possible I will invite you to accounts rather than share passwords.
>
> **Budget / timing**: $100 fixed price for the work above. If you discover something
> that requires substantial additional work, stop and ask before doing it. Additional
> work can be quoted separately. Would like it completed within a week.

**How to apply (verbatim)**: *"Keep proposals short. Answer three questions: 1. Which
hosting platform will you choose and why? 2. What email setup will you use and why?
3. Share a link to a static HTML site you have personally deployed. Please also briefly
confirm you understand the technical SEO and Google indexing readiness requirement. No
agencies or long proposals."*

---

## 2. Deliverables (what this practice run will produce)

The practice build substitutes for the client's ZIP. Scope is the same shape as the
brief: **a multi-page static site that is already built, then deployed and made
technically indexable.**

| # | Deliverable | How specific | Accepted by |
|---|---|---|---|
| 1 | Multi-page static site, **11 pages**: home, classes, recipes, about, contact, privacy, terms, plus `classes/{knife-skills,bread-baking,pasta-from-scratch,market-table}` | Plain HTML/CSS, no framework. **30 files** to match the brief's shape, but there *is* a small build: `npm run build` copies the files and generates `sitemap.xml` from `site.config.yml`. No templating, no bundling, no minification — see `README.md` for why the sitemap is generated rather than hand-written | `structure-check.mjs` green (47/47) |
| 2 | Callback form on the home page, wired to a Formspree endpoint | Native HTML POST, no JS required to submit; JS adds validation and error states only. **Status: live and connected** (`https://formspree.io/f/xdekaddz`); a real submission is recorded in `docs/form-submission.md` | `tools/form-e2e.mjs` green (18/18) **and a real submission confirmed at the receiving end** |
| 3 | Client-side validation + spam protection | Required fields, length caps, honeypot, honest failure message | `npm test` green, and proven able to go red |
| 4 | Technical SEO on **every** page | Canonical (self-referential, one per page), OG, twitter:card, JSON-LD, no accidental noindex | `seo-check.mjs` green |
| 5 | `sitemap.xml` + `robots.txt` reachable | Absolute URLs on the canonical origin, one `<loc>` per indexable page | `seo-check.mjs` green |
| 6 | No broken links or missing images | Every internal `href`/`src` resolves to a real file | `tools/link-check.mjs` 0 findings |
| 7 | Mobile at 375px | No horizontal scroll; touch targets ≥ 44px | `viewport-check.mjs` green (run twice) |
| 8 | Performance baseline | Lighthouse mobile, measured on the live URL | Performance ≥ 90 |
| 9 | Deployment | GitHub Pages, HTTPS, public URL | URL returns 200; served HTML has real content |
| 10 | Handover note | `README.md` covering hosting, DNS, form, where things live, how to edit a page | Clean-environment test: instructions only, no source reading |
| 11 | Domain / email runbook | Exact DNS records + the ordered swap steps, written down | Documented; **execution recorded as unverified** (no domain owned) |

### Delivery budget (numbers agreed before the build, not measured after it)

The client's visitors open this on a phone, so size and stability are part of the
scope rather than a post-launch observation. Agreed limits:

| Measure | Budget | Why this number |
|---|---|---|
| First-load transfer | **≤ 200 KiB** | Under a second on a slow mobile connection; the sibling project measures 125 KiB, so this leaves room without being aspirational |
| Single image | **≤ 100 KB** | A larger one is a defect unless someone writes down why |
| Total Blocking Time | **≤ 200 ms** | Above this the page feels unresponsive on a mid-range Android |
| Cumulative Layout Shift | **≤ 0.1** | Below this, content does not visibly jump as it loads |

A page that breaks one of these is not finished, and the measurement is taken on the
live URL rather than locally — local results and deployed results differ.

### Substitutions and gaps against the brief — stated, not omitted

The practice build is not a one-to-one clone of the client's site. Every difference is
listed here rather than left implicit, because a scope document that stays silent about
a missing feature is worse than one that names it:

| The brief has | This build has | Why |
|---|---|---|
| 4 blog pages | 4 **class** pages | The brief's blog content does not exist and writing it is out of scope. Class pages give the same thing the exercise needs: several real pages for internal linking, per-page canonicals and a sitemap with more than one entry. |
| A sticky call button | **Not built** | It is in the client's QA list. Adding it here would be a layout change to a site that is already through stage 5 acceptance; noted as a gap instead of quietly skipped. |
| An FAQ accordion | **Not built** | Same reasoning as the sticky button. |
| Real business content and prices | Placeholder content, AUD figures | The site is public; the workspace rule is that previews carry no real names, brands or prices. |
| Images, with alt text | 29 raster images, with alt text | **This row is a later correction.** When first written the build had no images and the alt-text check was recorded as vacuously satisfied. Photographs were added afterwards, so the check now has real material — and it immediately produced three defects that no code review would have caught: three home-page card alts described the wrong picture (purple aubergines written as "purple onions"), the declared `width`/`height` matched the JPEG fallback rather than the AVIF actually served, and the `srcset` named an `-800` file that does not exist. All three are recorded in `change-requests.md` CR-9/CR-10. |
| A live domain | A `github.io` sub-path | Stage 9 is not executed; see `readiness-gate.md` G2. |

### Explicitly out of scope for the client's money (matches his "important" note)

- Keyword research, link building, copywriting, SEO marketing
- Redesign or content rewrite of any page
- Anything not in section 2 without a written change order (see §5)

---

## 3. Not included (the section that prevents scope creep)

- [x] Domain purchase or renewal fee — **client owns `learntocook.au`; the practice run owns no domain**
- [x] Third-party service fees (form service, mailboxes, CDN)
- [x] Email mailbox hosting — **practice run cannot execute this without DNS control; recorded as unverified**
- [x] CMS / admin panel — the client maintains the files himself
- [x] Content writing, copywriting, translation
- [x] Logo, photography, image sourcing or retouching
- [x] Blog authoring — the 4 blog pages are imported as-is
- [x] E-commerce, payments, booking calendar, CRM
- [x] Multi-language version
- [x] Ongoing maintenance after handover
- [x] Google Search Console verification — needs the real domain's DNS or HTML file; practice run documents the step only
- [x] Revisions beyond the limit in §4

**If any of these is requested later**: it goes through §5, not done on the side.

---

## 4. Revision rounds and timing

| Item | Agreed |
|---|---|
| Revision rounds | **2** (one round = all of the client's comments delivered in a single message) |
| After the limit | Hourly, or a separate small contract |
| Definition of "revision" | Adjusting the look or wording of a delivered item. **A new page or a new feature is a change, not a revision.** |
| Delivery window | **5 working days** from written scope confirmation |
| Client feedback window | **2 working days** per round; delay extends the schedule day for day |
| If the client goes quiet | More than **7 days** with no reply: pause, or invoice work already completed |
| Acceptance | Client confirms on the live URL within **3 working days**; no comments in that window means accepted |

> On the "within a week" the client asked for: **the condition is on his side of the
> critical path.** Five working days is achievable **only if** the domain, the hosting
> account invitation and the form endpoint decision arrive before work starts. That
> dependency gets stated in writing rather than absorbed silently.

---

## 5. Change process (every new request goes here)

1. **Restate in writing** — "I understand you want X added, is that right?"
2. **Impact assessment** — extra working days, extra fee, whether the agreed launch
   date moves
3. **Written confirmation before starting** — no verbal go-ahead is enough

> Template reply:
> "Got it. That is outside the agreed scope. I have assessed it: it needs an extra X
> working days and Y in fees. If you confirm, I will schedule it — or it can go into a
> later phase. Which works better for you?"

**Slippage is announced before the deadline, not explained after it.** Missing a date
and explaining afterwards is the single most clearly attributable cause of the six-month
suspension case recorded in `workflow.md` §二·五.

---

## 6. Client confirmation

```
I have read and confirm the scope and terms above.

Client:
Date:
```

**Status: unsigned.** Practice run, no external client. See the declaration at the top.

---

## 7. Stage 1 — keyword, and how it was chosen

**Primary keyword: `cooking classes sydney`** (home page title + the single `<h1>`).
**Secondary: `knife skills class`**, `bread baking class`, `pasta making class`,
`market to table` — one per class page, each with its own `<title>` and `<h1>`.

### Evidence (reproducible — raw output, not a paraphrase)

Google's autocomplete endpoint, queried with a browser user agent:

```
https://suggestqueries.google.com/complete/search?client=firefox&q=cooking+classes+sydney
```

```json
["cooking classes sydney",["cooking classes sydney fish market","cooking classes sydney",
"cooking classes sydney cbd","cooking classes sydney for beginners","cooking classes sydney for adults",
"cooking classes sydney reddit","cooking classes sydney ns","cooking classes sydney australia",
"cooking classes sydney for couples","cooking classes sydney team building"],[],
{"google:suggestsubtypes":[[512],[512],[30],[30],[30],[30],[30],[30],[30],[30]]}]
```

Same endpoint, `q=knife+skills`:

```json
["knife skills",["knife skills list with pictures","knife skills","knife skills class near me",
"knife skills class","knife skills for beginners","knife skills class nyc","knife skills course",
"knife skills class london","knife skills classes near me","knife skills for beginners book"]]
```

### What that actually establishes — and what it does not

**Does establish:** the phrase completes to itself as the top suggestion, and the
variants that come back are *city modifiers* (`cbd`, `fish market`), *audience
modifiers* (`for beginners`, `for adults`, `for couples`) and *occasion modifiers*
(`team building`). "Near me" and "for beginners" appear across the class-level queries.
That is a demand signature for a **local, browseable, class-level** site rather than a
single brochure page — which is why this site has four class pages and internal links
between them.

**Does not establish:** any search volume, difficulty, or ranking forecast.
Autocomplete reflects which completions exist, not how many people use them, and no
keyword tool is available here. **No number in this file is a volume estimate.** The
only honest volume evidence available is Search Console, after the site is live and
verified — that is recorded in the handover note as the next step, and until then this
keyword is an *unverified assumption*, not a validated one.

---

## Appendix — Practice-run decisions I made on the client's behalf

These are guesses standing in for answers a real client would give. They are listed so
that nothing pretends to be confirmed:

| Question | Practice answer | Why it matters |
|---|---|---|
| Primary keyword / search intent | Chosen in stage 1 from observable signals | Decides `<title>`, `<h1>` and page structure |
| Language | English (single) | The brief's domain is `.au` and the brief is in English |
| Currency / prices shown | AUD, placeholder values | Practice pages carry no real brand or pricing |
| Form endpoint | Formspree free tier | Brief item 5 explicitly allows Formspree |
| Hosting | GitHub Pages | Free, HTTPS, already in use elsewhere in this workspace |
| Domain | **None.** Canonical origin = `https://pugtox.github.io/cookery-practice/` | Sets up stage 9 as a single-swap exercise |
| Legal pages indexable? | **No** — `noindex` on privacy/terms, listed as such in sitemap or omitted | Test-drives the brief's "accidental noindex" check in both directions |
