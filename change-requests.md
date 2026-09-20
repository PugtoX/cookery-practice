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
form `action` at the server, because the shipped placeholder makes the page take its
honest "not connected" branch and return before any request. So the assertion is "a
submission to a *working* endpoint carries the right things", not "the shipped page
currently sends" — and the file asserts that the shipped action is still the placeholder.

**What is still not proved:** that a message reaches a mailbox. The endpoint is one the
test starts itself. Formspree needs an account confirmation that arrives by email, and
that mailbox belongs to the operator, not to this session. **Recorded as unverified.**

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
| No real inbox confirmation for the form | Needs the operator's mailbox. |
| Stage 9 (custom domain) not executed | Needs a purchased domain. |
| No image compression evidence on this site | The site ships no raster images. That acceptance item is covered by `portfolio` (486 KB → 44.8 KB), not here. |
