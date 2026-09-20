#!/usr/bin/env node
// One-off generator for the three remaining class detail pages.
//
// Why this exists: the class pages share a header, a footer, a head block and a
// detail list. Hand-writing three near-identical 250-line files is how a footer link
// silently ends up wrong on one of them — which already happened once on index.html
// during this build. Generating them from one data table makes that class of defect
// impossible, and `node tools/link-check.mjs` then checks the result.
//
// The OUTPUT is the source. Edit classes/<slug>.html by hand afterwards; this script
// is only re-run when a structural change (not a wording change) has to reach all
// three at once. It is deliberately not wired into `npm run build` — that would make
// hand edits get overwritten, which is the opposite of the point.
//
// Usage: node tools/gen-class-pages.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const ORIGIN = 'https://pugtox.github.io/cookery-practice'
const SHOP = 'Cookery Class'

const classes = [
  {
    slug: 'bread-baking',
    title: 'Bread Baking Class in Sydney — Starter, Shaping, Proofing | Cookery Class',
    metaTitle: 'Bread Baking Class in Sydney — 5 Hours, Small Group',
    description:
      'A five-hour bread baking class in Sydney. Build a starter you keep, shape and proof a loaf, and find out why your last one was dense. Eight people, AUD 150.',
    h1: 'Bread baking class in Sydney',
    lede: 'A starter you take home, a loaf you shape yourself, and an honest answer to why the last one came out dense.',
    eyebrow: 'Five hours',
    price: '150',
    workload: 'PT5H',
    jsonDescription:
      'A five-hour hands-on bread baking class in Sydney covering starter, shaping, proofing and baking.',
    who: 'People who have baked at home and been disappointed, and people who have never baked at all. No experience needed — the class assumes you have never made a starter.',
    covers: [
      'Building and keeping a starter you can actually maintain in a normal kitchen.',
      'What gluten is doing during kneading, and how to tell when it is ready by feel.',
      'Shaping: the difference between a boule and a batard, and why shape affects crumb.',
      'Proofing by touch rather than by timer, including in a Sydney summer.',
      'Baking with steam in a domestic oven, and why your crust was pale.',
      'Reading a failed loaf — dense, gummy, flat — and knowing which step caused it.',
    ],
    after:
      'You leave with a jar of starter, a proofing basket and a written schedule you can follow at home. We bake two loaves together and eat one of them warm.',
    facts: [
      ['Length', 'Five hours'],
      ['Class size', 'Eight people maximum'],
      ['Price', 'AUD 150 per person'],
      ['Bring', 'Closed shoes and a container; we provide everything else'],
    ],
    dates: 'This class runs on Saturdays and Sundays, starting at 9am. Ask us for the next available date and we will reply within one working day.',
    next: { href: '../classes/pasta-from-scratch.html', label: 'See the pasta class' },
  },
  {
    slug: 'pasta-from-scratch',
    title: 'Pasta Making Class in Sydney — Egg Dough by Hand | Cookery Class',
    metaTitle: 'Pasta Making Class in Sydney — 3 Hours, Small Group',
    description:
      'A three-hour pasta making class in Sydney. Egg dough by hand, two shapes, and a sauce built in the same pan. No machine needed at home. Eight people, AUD 120.',
    h1: 'Pasta from scratch class in Sydney',
    lede: 'Egg dough made by hand — no machine to buy afterwards — rolled into two shapes and finished with a sauce built in the same pan.',
    eyebrow: 'Three hours',
    price: '120',
    workload: 'PT3H',
    jsonDescription:
      'A three-hour hands-on pasta class in Sydney covering hand-rolled egg dough, two shapes and a pan sauce.',
    who: 'Anyone who has bought dried pasta and wondered what the fresh version is like. If you have never made dough before, this is a good first dough — it is far more forgiving than bread.',
    covers: [
      'Egg dough by hand: flour well, ratios, and what to do when it is too wet.',
      'Resting and why the dough changes after twenty minutes.',
      'Rolling by hand and reading thickness by feel rather than by setting.',
      'Two shapes: tagliatelle and one filled shape.',
      'Repairing torn dough, which happens to everyone in the first hour.',
      'A sauce built in the pan the pasta finishes in, using the cooking water.',
    ],
    after:
      'We cook everything we make and eat it at the long table, with a glass of wine. You take home the recipe card and a portion of dry pasta.',
    facts: [
      ['Length', 'Three hours'],
      ['Class size', 'Eight people maximum'],
      ['Price', 'AUD 120 per person'],
      ['Bring', 'Closed shoes and a container for leftovers'],
    ],
    dates: 'This class runs on Wednesday and Friday evenings at 6pm. Ask us for the next available date and we will reply within one working day.',
    next: { href: '../classes/market-table.html', label: 'See the market table class' },
  },
  {
    slug: 'market-table',
    title: 'Market to Table Cooking Class in Sydney — Full Day | Cookery Class',
    metaTitle: 'Market to Table Cooking Class in Sydney — Full Day',
    description:
      'A full-day market to table class in Sydney. Shop the market with a budget in the morning, cook a shared table by the afternoon. Eight people, AUD 240.',
    h1: 'Market to table class in Sydney',
    lede: 'We shop the market in the morning with a budget, decide the menu from what is actually good, then cook it as a shared table.',
    eyebrow: 'One day',
    price: '240',
    workload: 'P1D',
    jsonDescription:
      'A full-day market to table cooking class in Sydney: market shopping in the morning, a shared cooked table in the afternoon.',
    who: 'People who can follow a recipe but freeze in front of a market stall. This is the class for learning to decide what to cook from what is available, rather than shopping for a list.',
    covers: [
      'Shopping a market with a budget and no fixed menu.',
      'Judging produce: what is in season, what is good value, what to leave behind.',
      'Building a menu from five or six things that work together.',
      'Cooking several dishes to land at the same time, without a written recipe.',
      'Seasoning and tasting as you go, which is the part recipes cannot teach.',
      'Using the whole ingredient — stems, trim, bones — so the budget goes further.',
    ],
    after:
      'We cook and eat a shared table of five or six dishes, matched with wine. You leave with the menu we built and the reasoning behind each choice.',
    facts: [
      ['Length', 'One full day, 9am to 4pm'],
      ['Class size', 'Eight people maximum'],
      ['Price', 'AUD 240 per person, including market spend'],
      ['Bring', 'Closed shoes, a hat, and a bag for market shopping'],
    ],
    dates: 'This class runs on Saturdays, meeting at the market at 9am. Ask us for the next available date and we will reply within one working day.',
    next: { href: '../classes/bread-baking.html', label: 'See the bread class' },
  },
]

const page = (c) => `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${c.title}</title>
    <meta name="description" content="${c.description}" />
    <link rel="canonical" href="${ORIGIN}/classes/${c.slug}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SHOP}" />
    <meta property="og:locale" content="en_AU" />
    <meta property="og:title" content="${c.metaTitle}" />
    <meta property="og:description" content="${c.lede}" />
    <meta property="og:url" content="${ORIGIN}/classes/${c.slug}" />
    <meta property="og:image" content="${ORIGIN}/assets/og.svg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="stylesheet" href="../assets/style.css" />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%233f6212'/%3E%3Ctext x='16' y='22' font-family='monospace' font-size='14' font-weight='700' fill='%23ffffff' text-anchor='middle'%3ECC%3C/text%3E%3C/svg%3E"
    />

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": ${JSON.stringify(c.h1)},
        "description": ${JSON.stringify(c.jsonDescription)},
        "url": "${ORIGIN}/classes/${c.slug}",
        "provider": {
          "@type": "CookingSchool",
          "name": "${SHOP}",
          "url": "${ORIGIN}/"
        },
        "offers": {
          "@type": "Offer",
          "price": "${c.price}",
          "priceCurrency": "AUD",
          "availability": "https://schema.org/InStock",
          "url": "${ORIGIN}/classes/${c.slug}"
        },
        "hasCourseInstance": {
          "@type": "CourseInstance",
          "courseMode": "onsite",
          "courseWorkload": "${c.workload}",
          "location": {
            "@type": "Place",
            "name": "${SHOP}",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "12 Example Lane",
              "addressLocality": "Sydney",
              "addressRegion": "NSW",
              "postalCode": "2000",
              "addressCountry": "AU"
            }
          }
        }
      }
    </script>
  </head>

  <body>
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="../index.html">${SHOP}</a>
        <nav class="site-nav" aria-label="Main">
          <ul>
            <li><a href="../index.html">Home</a></li>
            <li><a href="../classes.html" aria-current="page">Classes</a></li>
            <li><a href="../recipes.html">Recipes</a></li>
            <li><a href="../about.html">About</a></li>
            <li><a href="../contact.html">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <main id="main">
      <section class="page-head">
        <div class="wrap">
          <p class="eyebrow"><a href="../classes.html">Classes</a> · ${c.eyebrow}</p>
          <h1>${c.h1}</h1>
          <p class="lede">${c.lede}</p>
        </div>
      </section>

      <section aria-labelledby="who">
        <div class="wrap">
          <h2 id="who">Who this class is for</h2>
          <p>${c.who}</p>
        </div>
      </section>

      <section aria-labelledby="covers">
        <div class="wrap">
          <h2 id="covers">What we cover</h2>
          <ul>
${c.covers.map((x) => `            <li>${x}</li>`).join('\n')}
          </ul>
          <p>${c.after}</p>
        </div>
      </section>

      <section aria-labelledby="detail">
        <div class="wrap">
          <h2 id="detail">Class details</h2>
          <dl class="facts">
${c.facts
  .map(
    ([k, v]) => `            <div>
              <dt>${k}</dt>
              <dd>${v}</dd>
            </div>`,
  )
  .join('\n')}
          </dl>

          <h3>Dates</h3>
          <p class="muted">${c.dates}</p>

          <div class="actions">
            <a class="btn" href="../index.html#book">Ask us to call you back</a>
            <a class="btn btn-ghost" href="${c.next.href}">${c.next.label}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p class="brand">${SHOP}</p>
        <address>12 Example Lane, Sydney NSW 2000</address>
        <ul>
          <li><a href="mailto:hello@example.com">hello@example.com</a></li>
          <li><a href="tel:+61200000000">(02) 0000 0000</a></li>
          <li><a href="../contact.html">Contact and opening hours</a></li>
        </ul>
        <div class="legal">
          <a href="../privacy.html">Privacy</a>
          <a href="../terms.html">Terms</a>
        </div>
      </div>
    </footer>
  </body>
</html>
`

mkdirSync(join(root, 'classes'), { recursive: true })
for (const c of classes) {
  const out = join(root, 'classes', `${c.slug}.html`)
  writeFileSync(out, page(c))
  console.log(`wrote classes/${c.slug}.html`)
}
