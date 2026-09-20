Hosting — GitHub Pages. Your site is about 30 static files, so all three platforms you
listed would do the job. I would pick GitHub Pages because the deploy, the HTTPS
certificate and the repository live in one place, and because the deploy simply publishes
a folder of files: what the sitemap and canonical tags claim is what the server returns.
If you would rather stay on Cloudflare, that is fine — I have no dependency on the
platform, and I will check the canonical tags against whatever the host serves.

Email — Cloudflare Email Routing for receiving, forwarding anything@learntocook.au into
the Gmail account you already use. No mailbox to run, and the MX records sit beside the
DNS you are already touching. Sending *as* the domain is the part to get right:
forwarding alone will not do it, and it needs a real sending service. I will test send
and receive before calling it done, and tell you plainly if the plan you choose cannot
do both.

A static site I deployed — https://pugtox.github.io/cookery-practice/
Plain HTML and CSS, no framework, deployed from GitHub on every push. Eleven pages, each
with its own canonical URL, a reachable sitemap and robots.txt, no accidental noindex,
internal links and images all resolving, and measured at a 375px viewport. A real-device
check on that site is still outstanding and I will do one before handing yours over. Its
form is wired but not connected to a mailbox yet, and its script says so on submit
rather than pretending to send.

Technical SEO and indexing readiness — yes. I understand it is the deliverable, not an
extra. In practice for your site: every important page crawlable and indexable, one
canonical version of each URL, robots.txt and sitemap.xml correct and reachable, no
accidental noindex, internal links and images checked, titles and meta descriptions
sensible, heading structure sound, alt text where needed, mobile checked at real widths,
and Search Console verified with the sitemap submitted — that last step happens once your
domain is connected, and I will confirm it with you rather than assume it.

You will get a short written list of what I found and what I changed.

I will not rewrite page content or redesign anything without asking you first. If
something turns out to be substantially more work than the above implies, I will stop
and ask before doing it.
