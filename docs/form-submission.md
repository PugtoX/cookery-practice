# Callback form — real submission record

This file exists because "the form is wired up" and "a message arrived" are different
claims, and only the second one matters to a client. `tools/form-e2e.mjs` proves the
submission path with a test sink; this page records the one submission that went to the
real endpoint.

## The submission

| | |
|---|---|
| Date | 2026-09-20, 11:43 |
| Submitted from | `https://pugtox.github.io/cookery-practice/` (the live site) |
| Endpoint | `https://formspree.io/f/xdekaddz` |
| HTTP response | **200** |
| Page state after submit | success message shown, form cleared |
| Payload used | name `Verification Test`, contact `hugoyuan2004@gmail.com`, interest `Pasta From Scratch`, notes "Automated end-to-end check of the callback form on the live site. Safe to delete." |

## What was confirmed, and where

Read back from the Formspree dashboard at
`https://formspree.io/forms/xdekaddz/submissions` (not from this project's own files):

```
Inbox   Spam (0)
_date                    Sep 20, 11:43
name                     Verification Test
contact                  hugoyuan2004@gmail.com
interest                 Pasta From Scratch
notes                    Automated end-to-end check of the callback form on the live
                         site. Safe to delete.
website                  (empty)
```

Two things this establishes that the automated test could not:

1. **The endpoint accepted the real payload** and parsed every field into the right
   column — a field-name typo on the form would show up here as a mangled column, and
   did not.
2. **The honeypot field arrived empty** on a genuine submission, which is what the
   spam guard depends on.

The `Spam (0)` count also shows the submission was not silently filed as spam.

## What is still not verified, and who has to close it

**That the notification email landed in `hugoyuan2004@gmail.com`.** Reading that mailbox
needs the account owner's credentials, which this session does not have and should not.
Formspree recorded the submission and reports no spam filtering, so the remaining step is
checking the inbox — including the spam folder, since a first message from a new sender
often lands there.

**Do that once and this item is closed.** Until then, treat it as "accepted by the
service, delivery to the mailbox unconfirmed".
