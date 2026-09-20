#!/usr/bin/env node
// Build the deployable site into dist/.
//
// This is the "no build process" case from the brief: the pages are plain HTML and the
// stylesheet is plain CSS, so there is nothing to compile. This script copies the
// sources and generates sitemap.xml. That is all it does — on purpose.
//
// What it is *not* doing: templating, minifying, bundling, fingerprinting. Each of
// those would be a new dependency and a new way for the deployed site to drift from
// the files the client edits by hand.
//
// Why a build step exists at all:
//   1. sitemap.xml has to carry absolute URLs, and hand-editing a domain into it is
//      the exact "changed half of it" mistake stage 9 of web-gzliu/workflow.md warns
//      about. Generating it from site.config.yml makes that impossible.
//   2. structure-check.mjs and viewport-check.mjs verify the *artefact* (dist/), not
//      the sources, so there has to be an artefact.
//
// Zero dependencies — Node built-ins only. CI needs no install step.
//
// Usage: npm run build

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')

// ---------- config ----------
// Deliberately not a YAML parser: this file has one scalar key, and pulling in a YAML
// dependency to read one line would be the tail wagging the dog. Fail loudly on a
// missing or malformed origin instead of silently emitting relative URLs into a
// sitemap, which is invalid and would be reported by Search Console weeks later.
const configText = readFileSync(join(root, 'site.config.yml'), 'utf8')
const originRaw = configText.match(/^origin:\s*(\S+)\s*$/m)?.[1]
if (!originRaw) {
  console.error('site.config.yml: no `origin:` line found. Cannot generate absolute URLs.')
  process.exit(1)
}
let origin
try {
  origin = new URL(originRaw)
} catch {
  console.error(`site.config.yml: origin is not a URL: ${originRaw}`)
  process.exit(1)
}
if (!/^https?:$/.test(origin.protocol)) {
  console.error(`site.config.yml: origin must be http(s), got ${origin.protocol}`)
  process.exit(1)
}
// Normalised: exactly one trailing slash, so `${origin}about` never becomes `//about`.
const base = origin.href.replace(/\/+$/, '/')

// ---------- copy ----------
rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

const isPage = (f) => f.endsWith('.html')
const pages = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isFile() && isPage(e.name))
  .map((e) => e.name)
  .sort()
// nested pages, e.g. classes/knife-skills.html — keep the directory shape
const nested = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory())
for (const dir of nested) {
  if (['assets', 'tools', 'tests', 'docs', 'public', 'dist', 'node_modules'].includes(dir.name)) continue
  const found = readdirSync(join(root, dir.name), { recursive: true, encoding: 'utf8' }).filter(isPage)
  for (const f of found) pages.push(`${dir.name}/${f.split('\\').join('/')}`)
}

if (pages.length === 0) {
  console.error('No .html files found at the project root — nothing to build.')
  process.exit(1)
}

for (const rel of pages) {
  const to = join(dist, rel)
  mkdirSync(join(to, '..'), { recursive: true })
  cpSync(join(root, rel), to)
}
cpSync(join(root, 'assets'), join(dist, 'assets'), { recursive: true })
cpSync(join(root, 'public'), dist, { recursive: true })

// ---------- sitemap ----------
// A page is in the sitemap when it is not noindex. seo-check.mjs asserts both
// directions of that rule, so this generator and that checker have to agree on the
// definition — this is where they do.
const urlFor = (page) => {
  const clean = page.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '')
  return clean === 'index' ? base : `${base}${clean}`
}

// No <lastmod>, deliberately.
//
// The obvious implementation is `new Date()` at build time, and it is wrong: every
// deploy then stamps every URL with today's date, including pages nobody touched.
// Search engines learn to ignore a lastmod that changes without the content changing,
// so a wrong one is worse than none.
//
// The honest alternative is the file's real modification date. Two reasons it is not
// used here: this repository was created in a single commit, so every page shares one
// date and the tag would carry no information; and CI checks out shallowly
// (actions/checkout fetches one commit by default), so `git log -1 -- <file>` would
// report the checkout time rather than the file's history. Revisit if the history
// ever becomes meaningful — `<lastmod>` is optional in the sitemap protocol.
const entries = []
for (const rel of pages) {
  const html = readFileSync(join(root, rel), 'utf8')
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i)?.[1] ?? ''
  if (/noindex/i.test(robots)) continue
  entries.push({ loc: urlFor(rel), priority: rel === 'index.html' ? '1.0' : '0.8' })
}

if (entries.length === 0) {
  console.error('Every page is noindex — the sitemap would be empty. That is almost certainly a mistake.')
  process.exit(1)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), sitemap)

// robots.txt is copied verbatim from public/, but its Sitemap: line must point at the
// configured origin. Rewriting it here is what keeps `origin` the single source of
// truth; the alternative is editing two files at stage 9 and forgetting one.
const robotsPath = join(dist, 'robots.txt')
const robotsSrc = readFileSync(robotsPath, 'utf8')
const robotsOut = robotsSrc.replace(/^Sitemap:.*$/m, `Sitemap: ${base}sitemap.xml`)
writeFileSync(robotsPath, robotsOut)

console.log(`build: ${pages.length} pages + assets + public/ → dist/`)
console.log(`build: origin ${base}`)
console.log(`build: sitemap has ${entries.length} url(s); ${pages.length - entries.length} page(s) noindex`)
