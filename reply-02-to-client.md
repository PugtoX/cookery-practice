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
closed end to end. There is nothing left for you to check.

Test rows are accumulating in your dashboard. They all say they are tests in their notes
and every one is safe to delete.

## Two corrections I owe you

I got this wrong twice, both times by saying more than I had measured.

First I called the no-JavaScript path "delivered" when the service answered with a
redirect. That submission had actually been filed as spam.

Then I said that path always lands in spam. **Also wrong.** Early submissions were filed as
spam; later ones with the same field values went to your inbox. Something changed on the
service's side during those minutes and I cannot tell what.

So nothing in your site needs changing. If a message ever seems to go missing, check the
spam folder first. Filtering is the only thing I have seen get in the way, and not since.

## What is genuinely worth fixing

**A visitor with JavaScript turned off gets no validation at all.** The form tells the
browser to skip its own checks, and the script that would replace them never runs. I
confirmed it: with the class left unselected the form still sends, and you get a request
with a blank class.

Two small changes, your call:

1. Let the browser validate when the script is not there.
2. Send a JavaScript-off visitor back to your contact page afterwards. Right now they end
   up on the form service's own screen, with no way back to your site.
