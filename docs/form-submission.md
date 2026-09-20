# Callback form — real submission record

This file exists because "the form is wired up" and "a message arrived" are different
claims, and only the second one matters to a client. `tools/form-e2e.mjs` proves the
submission path with a test sink; this page records the submissions that went to the
real endpoint, and what each one actually proved.

## Question that started this: `method="POST"`

Formspree refuses a form without `method="POST"`, because the browser's default form
method is GET and a GET carries no body. The markup has carried it since the form was
written:

```html
<form id="callback" method="POST" action="https://formspree.io/f/xdekaddz" novalidate>
```

Verified in three places rather than one, because "the file has it" and "the visitor's
browser has it" are different claims:

| Checked | Result |
|---|---|
| `index.html` source | `method="POST"` present |
| Byte-for-byte, after build | present in `dist/index.html` |
| `https://pugtox.github.io/cookery-practice/` (live HTML) | present |
| `form.method` as the browser parses it | `POST` |

## Submission 1 — JavaScript enabled (the normal path)

| | |
|---|---|
| Date | 2026-09-20, 11:43 |
| Submitted from | `https://pugtox.github.io/cookery-practice/` (the live site) |
| Endpoint | `https://formspree.io/f/xdekaddz` |
| HTTP response | **200** |
| Page state after submit | success message shown, form cleared |
| Payload used | name `Verification Test`, contact `hugoyuan2004@gmail.com`, interest `Pasta From Scratch`, notes "Automated end-to-end check of the callback form on the live site. Safe to delete." |

Read back from the Formspree dashboard at
`https://formspree.io/forms/xdekaddz/submissions` (not from this project's own files).
This is one reading, taken 2026-09-20 shortly after 11:43 UTC; the `Spam (0)` is a count
at that instant, not a property of this submission — later test submissions raised it, and
the section below records what happened when they did.

```
Inbox   Spam (0)          <- count at the time of this reading, 2026-09-20 ~11:50 UTC
_date                    Sep 20, 11:43
name                     Verification Test
contact                  hugoyuan2004@gmail.com
interest                 Pasta From Scratch
notes                    Automated end-to-end check of the callback form on the live
                         site. Safe to delete.
website                  (empty)
```

This establishes that the endpoint accepted the real payload and parsed every field
into the right column — a field-name typo would show up here as a mangled column, and
did not — and that the honeypot arrived empty.

### The notification email

Read back from `hugoyuan2004@gmail.com`, message
`New submission from A New Form`, sender `noreply@formspree.io`, dated
20 September 2026 19:43 (+08:00) = 11:43 AM UTC:

> New form submission on A New Form
>
> Someone just submitted a form on **pugtox.github.io/**. Here's what they had to say:
>
> name: Verification Test
> contact: hugoyuan2004@gmail.com
> interest: Pasta From Scratch
> notes: Automated end-to-end check of the callback form on the live site. Safe to delete.
> website: (empty)

**This closes the end-to-end chain: browser → endpoint → client mailbox.** It was the
last unverified link, and it needed the mailbox owner, which is why it was left open
rather than asserted.

## Submission 2 — JavaScript disabled (the fallback path)

The form comment used to claim that a no-JS submission "still delivers". That claim was
unbacked, so it was tested. `tools/nojs-post-check.mjs` now drives a real Chrome with
JavaScript switched off.

What it proves: the native POST leaves the browser with `Content-Type:
application/x-www-form-urlencoded` and all five fields — `name`, `contact`, `interest`,
`notes`, `website` — with the honeypot empty. The typing and the submit themselves go
through native browser input, not an injected script: filling a form with `page.evaluate`
while claiming JavaScript is off would put the harness, not the fallback, under test.
17/17 checks pass.

What it also found, and this was **not** what the comment claimed:

- A native submit cannot be answered in place. Formspree responds `302` to
  `https://formspree.io/thanks?language=zh` and the visitor lands on **Formspree's own
  success page**, in whatever language their browser asks for — not on ours. Our page
  never gets to render its confirmation, and there is no link back to the site.
- `index.html` carries `novalidate`, so on the no-JS path the browser's own
  `required`-field check does **not** run. Measured: with only the name and contact
  filled and no class selected, `form.checkValidity()` is `false` and the click still
  submits — the endpoint accepted it and recorded a submission with an empty class
  column. `novalidate` is deliberate so `form.js` can own the error messages, but for a
  visitor without JavaScript it means no validation at all. Logged as a change request;
  not fixed here.

### Where the no-JS submissions were filed

Two earlier revisions of this section were wrong, in opposite directions, and both times
the error was the same: a conclusion stated more strongly than the measurements allowed.
The first called a `302` a delivery. The second claimed the no-JS path goes to spam. What
follows is the third version, and it is written as a timeline because the answer moved.

Everything below is read from `https://formspree.io/forms/xdekaddz/submissions`, from the
Inbox tab and the `Spam (n)` tab, on 2026-09-20 between 11:50 and 12:25 UTC. **None of it
is reproducible from this repository**, and every run of `tools/nojs-post-check.mjs` adds
records to both lists.

```
INBOX                                    SPAM
11:43  Verification Test  (JS enabled)   ——— nothing before 12:06 ———
12:13  No-JS Partial                    12:06  No-JS Check   (bare Node fetch)
12:13  No-JS Honeypot                   12:08  No-JS Live Check
12:15  No-JS Live Check                 12:11  No-JS Live Check
12:17  No-JS Live Check                 12:12  No-JS Live Check
12:20  No-JS Live Check                 12:15  No-JS Live Check
12:21  SEG-COMPLETE                     12:17  No-JS Live Check
12:21  SEG-PARTIAL
12:22  DEDUP-IDENTICAL  (two sent, one row)
```

The **inbox and spam lists are separate snapshots that never move.** A record filed to
spam stays there when a later submission from the same page is accepted, so the two lists
are not two views of one queue — they are two frozen verdicts. That is why the same
timestamp, `12:17`, appears in both: two submissions, seconds apart, same payload, split
across the buckets.

Four things are actually established, and one of them is the answer:

1. **Every submission was accepted** — `302` to `/thanks` in all cases. Acceptance never
   varied. Acceptance is also not delivery.
2. **Very early submissions were filed to spam**: six of them, `12:06` through `12:17`,
   all from `nojs-live@example.com`, all complete.
3. **From `12:17` onward, none were.** Six consecutive submissions all landed in the
   inbox: `12:17`, `12:20`, `12:21` twice, and `12:22` twice-sent-but-stored-once. The
   `12:17` one is the interesting one, arriving at the same moment as the last spam row.
4. **The same payload got both verdicts.** A complete submission with the same field values
   was filed to spam at `12:15` and `12:17`, and reached the inbox at `12:15` and `12:17`,
   so there is no payload-level rule to find. The dashboard shows minutes, not seconds, so
   "the same minute" is as close as these readings get.

Two things are **suggested but not established**, and are labelled that way on purpose:

- **The boundary is not clean.** The partial and honeypot submissions that reached the
  inbox were at `12:13`, *before* the `12:17` line, which is why the spam and inbox lists
  overlap in time rather than splitting at a single instant. The honest reading is a
  transition spread over roughly `12:13`–`12:17`, not a switch that flipped.
- **Completeness is not the discriminator.** A partial submission at `12:13` reached the
  inbox while complete ones were still being filed to spam around it. But that partial
  came from a different submitter, so it is one observation, not a controlled comparison.

The reading that fits all of this is that the service's filter **changed its mind about
this form during the window**. **Other explanations are not excluded by this data** and it
would be another overclaim to name one as the mechanism. A per-IP or per-device rate limit
that tripped and then reset, a reputation change triggered by the accepted submissions
themselves, or a time-based threshold would all fit the same table. What can be said
without reaching is the consequence:

> A submission filed as spam is a normal event for a form the service has not learned yet,
> and it stopped happening. It is **not** a property of the JavaScript-off path, and it is
> not something to fix in the markup. Nothing in this repository can predict it.

One incidental finding, measured twice: **identical payloads are deduplicated.** Two
byte-identical submissions sent back to back produced one dashboard row, not two — once
with the `Identical Pair Probe` payload and once with `DEDUP-IDENTICAL`. That is worth
knowing before reading any submission count in this file as a count of requests.

The one thing still worth doing is the client's: send it once by hand from a real browser
with JavaScript off. Not because it will fail, but because nothing here substitutes for a
real visitor.

## What is still not verified

**That a real visitor using a real phone has used this form.** Every submission here was
automated. There is no human submission on record and no real-device test on any phone.

**Whether the honeypot suppresses anything downstream.** It demonstrably does not stop
the request reaching Formspree. Whether the service then discards a flagged submission is
not visible from here; the form exposes no spam settings.
