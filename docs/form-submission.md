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
`https://formspree.io/forms/xdekaddz/submissions` (not from this project's own files):

```
Inbox   Spam (0)          <- count at the time of this reading
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
`notes`, `website` — with the honeypot empty. 14/14 checks pass.

What it also found, and this was **not** what the comment claimed:

- A native submit cannot be answered in place. Formspree responds `302` to
  `https://formspree.io/thanks?language=zh` and the visitor lands on **Formspree's own
  success page**, in whatever language their browser asks for — not on ours. Our page
  never gets to render its confirmation, and there is no link back to the site.
- The dashboard's `Spam` count went `0 → 1` after a bare Node `fetch()` POST and
  `1 → 2` after the browser no-JS runs: **the fallback submissions were filed as spam**,
  while the JavaScript-enabled submission at 11:43 was not.

The second point has a known cause for the Node case (no `Origin`, no `Referer` — a
signature no real browser produces) and no confirmed cause for the browser case. The
browser runs were automated and headless, which is itself a plausible trigger. So the
honest statement is narrow:

> The no-JS fallback **submits** and the endpoint **accepts** it, verified in a real
> browser. Whether Formspree files a genuine no-JS visitor's submission to the inbox or
> to spam is **not established** — automated submissions were filed as spam, and there
> is no human no-JS submission on record.

Two fixes are available and neither is applied, because both are the client's call:
configure a custom redirect so a no-JS sender returns to this site after sending, and
send one real no-JS submission by hand from a browser with JavaScript off to see where
it lands.

## What is still not verified

**That a real visitor using a real phone has used this form.** Every submission here was
automated. There is no human submission on record and no real-device test on any phone.
