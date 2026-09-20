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

### Where the no-JS submissions were filed, and why that answer is negative

An earlier revision of this file claimed a clean pattern — fallback submissions go to
spam, the JavaScript submission did not. Then the discriminating experiment was run: the
same complete, browser-driven, JavaScript-off submission, several times.

Every reading below comes from
`https://formspree.io/forms/xdekaddz/submissions` (the Inbox tab, then the `Spam (n)`
tab), read 2026-09-20 between 12:06 and 12:20 UTC. These counts are **not reproducible
from this repository** and they go stale the moment anyone submits again — every run of
`tools/nojs-post-check.mjs` adds two more records.

```
Inbox  Spam (5)

SPAM, all browser-driven, JavaScript off:
  12:15  No-JS Live Check   nojs-live@example.com   complete
  12:12  No-JS Live Check   nojs-live@example.com   complete
  12:11  No-JS Live Check   nojs-live@example.com   complete
  12:08  No-JS Live Check   nojs-live@example.com   complete
  12:06  No-JS Check        nojs@example.com        bare Node fetch, no Origin/Referer

INBOX:
  11:43  Verification Test  hugoyuan2004@gmail.com   JavaScript enabled, from the live site
  12:13  No-JS Partial      nojs-partial@example.com  no class selected
  12:13  No-JS Honeypot     nojs-hp@example.com     honeypot filled
  12:15  No-JS Live Check   nojs-live@example.com   complete
```

The two `12:13` inbox rows are an independent reviewer's probes: one partial, one with
the honeypot filled. Both were accepted into the inbox, and the honeypot one did not stop
the request at all.

**The claim is withdrawn, not softened.** The `12:15` rows are the same submission, form
for form, sent twice inside one run of the tool — one was filed inbox, one spam. So:

- Automation is not the discriminator: the reviewer's scripted probes reached the inbox.
- Completeness is not the discriminator: the complete no-JS submissions split across both
  buckets.
- The honeypot does not block at the request level; a filled `website` still received
  `302 → /thanks`.

What is left is a server-side classifier that returned different verdicts for
near-identical input. That is not something this repository can measure, predict, or fix,
and no further submission from here would settle it. The honest statement is:

> The no-JS fallback **submits** and the endpoint **accepts** it, verified in a real
> browser with JavaScript off. Where Formspree files any given submission — inbox or spam
> — is **non-deterministic as measured**, and must not be described as a property of the
> no-JS path. No human submission exists on record.

The one action that would settle it is the client's: send it once by hand from a real
browser with JavaScript off, and look at where it lands. That is a person, not a probe.

## What is still not verified

**That a real visitor using a real phone has used this form.** Every submission here was
automated. There is no human submission on record and no real-device test on any phone.

**Whether the honeypot suppresses anything downstream.** It demonstrably does not stop
the request reaching Formspree. Whether the service then discards a flagged submission is
not visible from here; the form exposes no spam settings.
