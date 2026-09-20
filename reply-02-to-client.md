# Reply 02 — the `method="POST"` warning

## The form already posts

`method="POST"` was there before your message, and I checked it in three places rather
than taking the file's word for it: the source, the built copy, and the HTML your browser
actually receives from the live site. All three say `POST`, and so does the browser's own
reading of the form.

So that warning is not describing this form. If your dashboard is still showing it, tell
me which screen and I will look at that screen.

## A real message did arrive

A real submission from the live site reached `hugoyuan2004@gmail.com`, with every field in
its own column on the dashboard. That chain — browser, endpoint, your mailbox — is now
closed end to end.

Test rows are accumulating in your dashboard. They all say they are tests in their notes
and every one is safe to delete.

## What I found, and one correction

I tested the form with JavaScript switched off. It does submit and the service does accept
it — but the sender is left on Formspree's own screen, in whatever language their browser
asks for, with no way back to your site.

I also have to correct myself. I first called this path "delivered" on the strength of a
redirect, and that submission had been filed as spam. I then said the fallback always
lands in spam. **That was wrong too.** The identical submission, sent twice, produced one
inbox and one spam. Keep an eye on the spam folder.

## Two questions

1. **A sender with JavaScript off gets no validation at all.** With the class unselected,
   the browser's own check is skipped and the empty answer is accepted. Fixing it is a
   small change. Want it?
2. **Should a JavaScript-off sender be sent back to your contact page** instead of being
   left on Formspree's screen? Also small.
