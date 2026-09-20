#!/usr/bin/env node
// Broken-link and missing-image check for the built site.
//
// Why this is a project tool and not part of web-gzliu's shared scripts: the brief
// asks for "no broken links or missing images" on this site, which is a per-project
// acceptance item. seo-check.mjs owns canonical/OG/sitemap/robots; this owns hrefs and
// srcs. Keeping them apart means neither has to grow a flag for the other's concern.
//
// What it resolves:
//   href="about.html"              → dist/about.html            must exist
//   href="/cookery-practice/about" → dist/about.html            must exist (extensionless)
//   href="classes/knife-skills.html"→ dist/classes/knife-skills.html
//   href="#book"                   → a matching id must exist in the same document
//   href="mailto:…" / "tel:…"      → skipped, not files
//   src="assets/style.css"         → dist/assets/style.css      must exist
//
// It does NOT fetch external URLs. A network check would make the acceptance result
// depend on someone else's uptime, and a flaky CI run that fails for a third-party
// reason teaches people to ignore the check.
//
// Usage: node tools/link-check.mjs [projectDir]      (default: the project root)
// Exits 0 when clean, 1 when something is broken, 2 when there is no dist/ to check.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(process.argv[2] ?? join(here, '..'))
const dist = join(root, 'dist')

if (!existsSync(dist)) {
  console.error(`[precondition] no ${dist}\nRun \`npm run build\` first — links are checked against the deployed artefact.`)
  process.exit(2)
}

// The configured origin, so absolute same-site URLs can be checked locally too.
const origin = readFileSync(join(root, 'site.config.yml'), 'utf8').match(/^origin:\s*(\S+)\s*$/m)?.[1]
if (!origin) {
  console.error('site.config.yml: no `origin:` line found.')
  process.exit(2)
}
const originPath = new URL(origin).pathname.replace(/\/+$/, '/')

const pages = readdirSync(dist, { recursive: true, encoding: 'utf8' })
  .map((p) => p.split(sep).join('/'))
  .filter((p) => /\.html$/i.test(p))
  .sort()

if (pages.length === 0) {
  console.error(`[precondition] no .html under ${dist}`)
  process.exit(2)
}

const ids = new Map() // page → Set of ids in that page
for (const page of pages) {
  const html = readFileSync(join(dist, page), 'utf8')
  ids.set(page, new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1])))
}

const exists = (p) => {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// Resolve an in-site URL to a file under dist/, mirroring how GitHub Pages serves a
// project site: /cookery-practice/about and /cookery-practice/about.html both land on
// about.html, and /cookery-practice/ lands on index.html.
function resolveHref(pageFile, href) {
  const baseDir = pageFile.includes('/') ? pageFile.slice(0, pageFile.lastIndexOf('/')) : ''
  let path = href

  // Absolute same-site URLs are checked as paths; anything on another host is skipped.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    const u = (() => {
      try {
        return new URL(path, `https://x${originPath}`)
      } catch {
        return null
      }
    })()
    if (!u || u.origin !== new URL(origin).origin) return { external: true }
    path = u.pathname
  }

  if (path.startsWith('/')) {
    if (!path.startsWith(originPath)) return { outside: true }
    path = path.slice(originPath.length)
  } else {
    path = baseDir ? `${baseDir}/${path}` : path
  }

  path = path.split('?')[0].split('#')[0]
  if (path === '' || path.endsWith('/')) path += 'index.html'
  return { candidates: [path, `${path}.html`, `${path}/index.html`] }
}

const problems = []
let checked = 0

for (const page of pages) {
  const html = readFileSync(join(dist, page), 'utf8')
  const refs = [
    ...[...html.matchAll(/<a\b[^>]*\shref=["']([^"']*)["']/gi)].map((m) => ({ kind: 'link', value: m[1] })),
    ...[...html.matchAll(/<(?:img|script|link)\b[^>]*\s(?:src|href)=["']([^"']*)["']/gi)].map((m) => ({
      kind: 'asset',
      value: m[1],
    })),
  ]

  for (const { kind, value } of refs) {
    const href = value.trim()
    if (!href) continue
    if (/^(mailto:|tel:|data:|javascript:)/i.test(href)) continue

    // Same-page anchors are checked against the ids we indexed for this page.
    if (href.startsWith('#')) {
      checked += 1
      const id = href.slice(1)
      if (id && !ids.get(page).has(id)) problems.push(`${page}: ${kind} "${href}" — no such id on this page`)
      continue
    }

    const r = resolveHref(page, href)
    if (r.external || r.outside) continue

    checked += 1
    if (!r.candidates.some((c) => exists(join(dist, c)))) {
      problems.push(`${page}: ${kind} "${href}" — not found (tried ${r.candidates.join(', ')})`)
    }

    // An anchor on a link to another page must exist there too.
    const frag = href.split('#')[1]
    if (frag && kind === 'link') {
      const target = r.candidates.find((c) => exists(join(dist, c)))
      if (target && target.endsWith('.html') && ids.has(target) && !ids.get(target).has(frag)) {
        problems.push(`${page}: link "${href}" — ${target} has no id "${frag}"`)
      }
    }
  }
}

console.log(`link-check: ${pages.length} page(s), ${checked} reference(s) resolved against dist/`)
if (problems.length === 0) {
  console.log('link-check: no broken links or missing assets')
  process.exitCode = 0
} else {
  for (const p of problems) console.log(`  FAIL  ${p}`)
  console.log(`\n${problems.length} problem(s)`)
  process.exitCode = 1
}
