#!/usr/bin/env node
// Page shell renderer for the pages that are structurally identical.
//
// Every page in this site shares one head block (canonical, OG, twitter:card,
// JSON-LD) and one header/footer. That is roughly 60 lines repeated per page, and
// repeating it by hand is how a page ends up with a canonical that points somewhere
// else or a footer link that 404s. Those are precisely the defects this project
// exists to check for, so the shell is rendered and only the body differs.
//
// Scope: shell + section list. Page-specific markup (the form, the recipe list) is
// passed through as raw HTML per page. If a page needs anything more exotic, write
// that page by hand — do not grow this file into a static site generator.
//
// The OUTPUT is the source. Edit dist-page HTML by hand afterwards; re-run a
// generator only when a structural change has to reach several pages at once.
//
// Usage (as a library): import { renderPage, writePage } from './tools/emit-page.mjs'

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const ORIGIN = 'https://pugtox.github.io/cookery-practice'
export const SITE_NAME = 'Cookery Class'

const NAV = [
  ['index.html', 'Home'],
  ['classes.html', 'Classes'],
  ['recipes.html', 'Recipes'],
  ['about.html', 'About'],
  ['contact.html', 'Contact'],
]

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%233f6212'/%3E%3Ctext x='16' y='22' font-family='monospace' font-size='14' font-weight='700' fill='%23ffffff' text-anchor='middle'%3ECC%3C/text%3E%3C/svg%3E"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * @param {object} page
 * @param {string} page.file        path from the site root, e.g. 'recipes.html' or 'classes/knife-skills.html'
 * @param {string} page.slug        URL path after the origin, without a leading slash; '' for the home page
 * @param {string} page.title       <title>
 * @param {string} page.description meta description (also used for og:description unless ogDescription is given)
 * @param {string} page.ogTitle
 * @param {string} [page.ogDescription]
 * @param {string} page.robots      '' or e.g. 'noindex, follow'
 * @param {object} page.jsonLd      object serialised into the ld+json script
 * @param {string} page.eyebrow
 * @param {string} page.h1
 * @param {string} page.lede
 * @param {Array<{id:string,heading:string,html:string}>} page.sections
 * @param {string} [page.extra]     raw HTML after the sections (forms, lists)
 * @param {string} [page.scripts]   raw HTML script tags
 */
export function renderPage(page) {
  const depth = page.file.split('/').length - 1
  const up = '../'.repeat(depth)
  const url = `${ORIGIN}/${page.slug}`

  const navItems = NAV.map(([href, label]) => {
    const current = href === page.file ? ' aria-current="page"' : ''
    return `            <li><a href="${up}${href}"${current}>${label}</a></li>`
  }).join('\n')

  const robotsTag = page.robots ? `\n    <meta name="robots" content="${page.robots}" />` : ''

  const sections = (page.sections ?? [])
    .map(
      (s) => `      <section aria-labelledby="${s.id}">
        <div class="wrap">
          <h2 id="${s.id}">${s.heading}</h2>
${s.html}
        </div>
      </section>`,
    )
    .join('\n\n')

  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />${robotsTag}
    <link rel="canonical" href="${url}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_AU" />
    <meta property="og:title" content="${esc(page.ogTitle)}" />
    <meta property="og:description" content="${esc(page.ogDescription ?? page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ORIGIN}/assets/og.svg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="stylesheet" href="${up}assets/style.css" />
    <link rel="icon" href="${FAVICON}" />

    <script type="application/ld+json">
${JSON.stringify(page.jsonLd, null, 2)
  .split('\n')
  .map((l) => `      ${l}`)
  .join('\n')}
    </script>
  </head>

  <body>
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="${up}index.html">${SITE_NAME}</a>
        <nav class="site-nav" aria-label="Main">
          <ul>
${navItems}
          </ul>
        </nav>
      </div>
    </header>

    <main id="main">
      <section class="page-head">
        <div class="wrap">
          <p class="eyebrow">${page.eyebrow}</p>
          <h1>${page.h1}</h1>
          <p class="lede">${page.lede}</p>
        </div>
      </section>

${sections}
${page.extra ? `\n${page.extra}\n` : ''}    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p class="brand">${SITE_NAME}</p>
        <address>12 Example Lane, Sydney NSW 2000</address>
        <ul>
          <li><a href="mailto:hello@example.com">hello@example.com</a></li>
          <li><a href="tel:+61200000000">(02) 0000 0000</a></li>
          <li><a href="${up}contact.html">Contact and opening hours</a></li>
        </ul>
        <div class="legal">
          <a href="${up}privacy.html">Privacy</a>
          <a href="${up}terms.html">Terms</a>
        </div>
      </div>
    </footer>
${page.scripts ? `\n${page.scripts}\n` : ''}  </body>
</html>
`
}

export function writePage(root, page) {
  const out = join(root, page.file)
  mkdirSync(join(out, '..'), { recursive: true })
  writeFileSync(out, renderPage(page))
  return out
}
