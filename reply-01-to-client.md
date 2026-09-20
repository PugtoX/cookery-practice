Hosting — GitHub Pages. Your site is about 30 static files with no build step, so all
three platforms you listed would work. I would pick GitHub Pages for one reason above
the others: every URL is served as a real file, which is exactly what your sitemap and
canonical URLs have to agree with. Cloudflare Pages and Netlify both do clean-URL
rewrites by default, so a request for `/about` renders `about.html` while the canonical
tag says something else — a duplicate-version problem by construction. GitHub Pages
avoids the rewrite entirely. If you would rather stay on Cloudflare, we can, and I will
make the canonical tags match whatever it actually serves.

Email — Cloudflare Email Routing for receiving, forwarding anything@learntocook.au into
the Gmail account you already use. No mailbox to run, and the MX records sit in the same
panel as the DNS you are already touching. Sending *as* the domain is the part to be
careful about: forwarding alone will not do it, and it needs a real sending service.
I will test send and receive before calling it done, and tell you plainly if the setup
you have chosen cannot do both.

A static site I deployed — https://pugtox.github.io/cookery-practice/
Plain HTML and CSS, no framework, deployed from GitHub on every push. It has one
canonical version of every URL, a sitemap and robots.txt that are reachable, no
accidental noindex, internal links and images all resolving, and it was checked on a
real phone at 375px. There is a callback form on the home page.

Technical SEO and indexing readiness — yes. I understand it is the deliverable, not an
extra. In practice: every important page crawlable and indexable, one canonical version
of each URL, robots.txt and sitemap.xml correct and reachable, no accidental noindex,
internal links and images checked, titles and meta descriptions present and sensible,
heading structure sound, alt text where it is needed, mobile checked at real widths,
and Search Console verified with the sitemap submitted. You will get a short written
list of what I found and what I changed, so you can re-check it yourself afterwards.

I will not rewrite page content or redesign anything without asking you first. If
something turns out to be substantially more work than the above implies, I will stop
and ask before doing it.
