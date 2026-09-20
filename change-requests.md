# Change record — internal

Not sent to anyone. The client-facing drafts are `reply-NN-to-client.md`; this file holds
the decisions, the impact assessments and the mistakes, so the replies can stay short.

---

## Where this project's scope came from

Upwork job `~022101521596705938026`, "Deploy Static HTML Website", US$100 fixed. The
posting is quoted verbatim in `SPEC.md` §1 and is used as the requirement source because
it is a real brief with real acceptance criteria. **There is no paying client and the
signature block in `SPEC.md` §6 is empty.** That is deliberate and is why
`web-gzliu/readiness-gate.md` records G1 as *partial* rather than passed.

Not bid on: it costs 18 Connects and the account holds 10.

---

## CR-1 · The build was not including `sitemap.xml` where the checker looked

**Requested by:** nothing — found while running stage 4 acceptance.

**What was wrong:** `seo-check.mjs` only looked for `public/sitemap.xml` and
`public/robots.txt`. This project *generates* both into `dist/`. On a real 11-page site
that produced 12 failures that were all false.

**Impact:** none on the client's scope. It did mean the shared checker had only ever been
exercised against one shape of project, so its "pass" was narrower than it looked.

**Before touching it**, the actual layout of all three projects was measured rather than
assumed: `spt-site` keeps them in `dist/`, this project generates them into `dist/`, and
`portfolio` has neither at all — so its failure was genuine, not a path problem. The fix
tries both locations, artefact first. `portfolio` still reports 1/12 and `spt-site` still
reports 28/28. Recorded in `workflow.md`-adjacent history as commit `56c35c0`.

---

## CR-2 · Two "per-page" judgements were not actually per-page

**What was wrong:** `structure-check.mjs` counted `<h1>` across every file at once, so a
fully compliant 11-page site failed with "found 11". `seo-check.mjs` compared a page's
canonical against its path *relative to the build directory*, which is only the same
thing as the site path when the site is served from a domain root — correct for both
existing projects by coincidence, wrong for every page of a sub-path site.

**Why it took two passes to notice:** the first version of the canonical check passed on
both existing projects. A check that has only ever seen one shape of input has not been
tested; it has been fitted. The 6-scenario fixture
(`web-gzliu/tools/seo-multipage-fixture.mjs`) exists so this cannot recur quietly.

---

## CR-3 · The form's submission path was verified, then the claim was cut back

`tools/form-e2e.mjs` drives a real browser through a real submission: 18 assertions
covering the request method, the encoding, every payload field, the success state, the
cooldown, the 500 case and the empty-form case.

While writing it, three separate problems looked like bugs in the form and were not:
`page.waitForTimeout` does not exist in this puppeteer version, `addScriptTag` with
`type: module` silently runs nothing, and a cross-origin test sink without CORS headers
makes the browser reject a POST that did arrive. All three are recorded in the file.

**Deviation to be explicit about:** the test serves the real `dist/` but rewrites the
form `action` at the server, pointing it at a sink the test starts itself. So the
assertion is "a submission to a working endpoint carries the right things", not "the
shipped page currently sends". That distinction stopped mattering once the real endpoint
was wired in and a real submission was made (CR-6), but the test still uses a sink,
because a test that writes to a live inbox on every run is a test nobody runs.

**Superseded:** the paragraph that used to sit here said the assertion was that the
shipped action is "still the placeholder". That was true before 2026-09-20 and false
after — the shipped action is now the real endpoint, and the assertion was changed to
require a usable absolute URL. Left visible so the stale claim is not silently dropped.

**What was not proved here, and how it was closed:** that a message reaches a mailbox.
`tools/form-e2e.mjs` cannot prove it — it posts to its own sink. It was closed on
2026-09-20 by submitting to the real endpoint from the live site and reading the
notification back out of `hugoyuan2004@gmail.com`. See `docs/form-submission.md`.

---

## CR-6 · A `302` was recorded as a delivery, and it had been filed as spam

**Found by:** a bare Node `fetch()` POST to the real endpoint, run as a quick no-JS probe.

**What was wrong:** it returned `302 → /thanks`, which was written up as "the endpoint
accepted the no-JS POST — PASS". Formspree answers `302` for a native submit and `200` for
a `fetch()`, and the submission had in fact been **filed as spam**. A redirect proves
routing. It never proves delivery.

Two further errors came out of the same revision:

1. The comment in `tools/nojs-post-check.mjs` justified counting only POSTs by claiming
   the browser "GETs the action URL because `requestSubmit()` resolves the action".
   Instrumenting the sink showed the extra request is `GET /favicon.ico`. The stated
   reason was simply false.
2. The file asserted "submitting with JavaScript disabled still **delivers**". Delivery
   was never tested — `assets/form.js` calls `preventDefault()`, so with the module
   loaded no native POST happens at all, and every earlier test had exercised the AJAX
   path.

**Then the replacement claim was also wrong.** The first corrected version said the
fallback goes to spam while the JavaScript path does not. The discriminating experiment —
the same complete browser-driven no-JS submission, repeated — split across **both**
buckets inside a single run: `12:15` inbox, `12:15` spam, with identical payloads. An
independent reviewer's scripted probes landed in the inbox; a partial one landed in the
inbox; a honeypot-filled one landed in the inbox and was not blocked at all.

**Lesson, which is the reason this entry exists:** the project's recurring failure is not
a wrong measurement, it is a **conclusion stated more strongly than the measurement
supports** — twice in a row here, in opposite directions. `302` is not delivery, and one
spam filing is not a property of a code path. The classifier gave different verdicts for
near-identical input, so the honest record is that filing is non-deterministic as
measured, and the only way to learn what a real visitor gets is for a real visitor to
send one.

**Impact on scope:** none. The form works; the endpoint accepts; the client's mailbox
received a real message.

---

## CR-7 · The no-JS path has no validation at all (`novalidate`) — OPEN, needs the client

**Found by:** the independent review of CR-6.

**What is wrong:** `index.html` carries `novalidate` deliberately, so `form.js` can render
its own error messages and wire them to fields with `aria-describedby`. But `novalidate`
is a static attribute, and `form.js` never runs for a visitor without JavaScript. So on
that path nothing validates:

- Measured: with only the name and contact filled and **no class selected**,
  `form.checkValidity()` returns `false` and the click still submits. The endpoint
  accepted it and the dashboard shows a submission with an empty class column.
- A fully empty form is rejected by Formspree itself (`400 Can't send an empty form`), so
  that case is covered by the service rather than by us.
- The partial case is not covered by anyone.

**Smallest fix:** let the script opt *out* of native validation instead of the markup
opting out for everyone — drop `novalidate` from the HTML and add it in `form.js` at
startup. One line each way, no behaviour change for JavaScript users, and a no-JS visitor
gets the browser's own `required` check.

**Why it is not done here:** it changes what a visitor sees on a path the client has not
asked about, and the brief is a practice run against a real brief. It goes in the reply as
a question with a price of "small change", not as a silent edit.

---

## CR-4 · The chosen keyword was not in the title or the h1

**Found by:** the stage-1 acceptance criterion, which is "the primary keyword appears in
the title and the single h1".

Four of five pages failed it. `Cooking Classes in Sydney` is not
`cooking classes sydney`, and `pasta from scratch` is not `pasta making class`. Both read
perfectly well and both break an exact-phrase match. Fixed; the check is now written down
in `SPEC.md` §7 rather than being a thing somebody remembers to look at.

**Scope impact:** three `<title>`s, three `<h1>`s, one generator data row. No structural
change.

---

## CR-5 · A claim was written into the gate before it was true

While updating `readiness-gate.md` for G5, a sentence was written saying this project's
SPEC carried the performance budget. It did not — the grep came back empty.

The budget was then actually written into `SPEC.md` §2, and the gate sentence corrected
to describe what is there. Noting it because the failure mode is the one this project
keeps hitting: **a plausible-sounding completion claim is the most expensive kind of
error, because it is the one nobody re-checks.**

---

## Findings deliberately left open

| Finding | Why it is not fixed here |
|---|---|
| `spt-site`'s canonical points at `saiyingpunpt.com`, which does not resolve (NXDOMAIN, verified) | It is a separate live site. Changing it is the owner's call, and the fix is either buying the domain or repointing three URLs. It also changes what that project can honestly claim, so it should not happen silently. |
| Stage 9 (custom domain) not executed | Needs a purchased domain. |
| No image compression evidence on this site | The site ships no raster images. That acceptance item is covered by `portfolio` (486 KB → 44.8 KB), not here. |
| `novalidate` leaves the no-JS path unvalidated (CR-7) | It changes what a visitor sees on a path nobody asked about. Offered to the client instead. |
| Where Formspree files a submission (CR-6) | Not measurable from here, and non-deterministic as measured. Only a human no-JS submission settles it. |
| No real-device test on a phone | The 375px checks run in a browser with an emulated viewport. That is not a phone, and it is not described as one. |
| ~~No real inbox confirmation for the form~~ | **Closed 2026-09-20** — the notification was read back from `hugoyuan2004@gmail.com`. See `docs/form-submission.md`. |
