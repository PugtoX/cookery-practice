#!/usr/bin/env node
// Static server for the design previews under docs/.
//
// Why this exists separately from tools/serve.mjs: serve.mjs serves the *site* — it
// mirrors GitHub Pages, including extensionless URLs and the /cookery-practice/ prefix.
// `npm run dev` also serves dist/ when a build exists, and docs/ is deliberately not in
// dist/. So the previews need their own server whose document root is the repo, so that
// redesign.css and the img/ folder resolve the way the HTML expects.
//
// Usage: node tools/serve-docs.mjs      then open http://127.0.0.1:4211/
// Port: set PREVIEW_PORT to change it.
//
// Zero dependencies, Node built-ins only.

import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
// Serve from docs/ only. The previews live there and nothing else needs to be reachable;
// a narrower root is one less thing to get wrong.
const docRoot = join(root, 'docs')
const PORT = Number(process.env.PREVIEW_PORT ?? 4211)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

// Paths are relative to docs/, which is the document root.
const CANDIDATES = [
  { href: 'redesign/index.html', label: 'Redesign A — warm editorial (the proposal)' },
  { href: 'backgrounds-preview.html', label: 'Background directions A / B / C' },
  { href: 'layout-preview.html', label: 'Layout: 34 / 44 / 52 / 60rem' },
]

function indexPage() {
  const items = CANDIDATES.filter((c) => existsSync(join(docRoot, c.href)))
    .map((c) => `      <li><a href="/${c.href}">${c.label}</a></li>`)
    .join('\n')
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Design previews</title>
    <style>
      body { font: 16px/1.6 system-ui, sans-serif; margin: 0; padding: 40px 24px; color: #12180f; background: #f7f8f3; }
      main { max-width: 40rem; margin: 0 auto; }
      h1 { font-size: 1.75rem; margin: 0 0 6px; }
      p { color: #57614b; margin: 0 0 24px; }
      ul { list-style: none; padding: 0; margin: 0; }
      li { margin: 0 0 12px; }
      a { display: block; padding: 14px 16px; background: #fff; border: 1px solid #e2e6d8; border-radius: 10px; color: #3f6212; text-decoration: none; font-weight: 600; }
      a:hover { background: #f1f4ea; }
      code { background: rgba(18,24,15,.06); padding: 1px 5px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Design previews</h1>
      <p>Not part of the published site — <code>docs/</code> is skipped by the build.</p>
      <ul>
${items}
      </ul>
    </main>
  </body>
</html>
`
}

function resolveFile(rel) {
  // The first version of this used normalize() + startsWith(root). It leaked: normalize
  // collapses "/../package.json" to "/package.json", which resolves back INSIDE the repo,
  // so the containment check passed and the file was served. Verified with curl.
  //
  // Reject any traversal segment outright — decoding is already done by the caller, so a
  // literal ".." here means the URL asked to climb, whichever way it was encoded. Then
  // resolve to an absolute path and confirm containment against the separator, so that a
  // sibling directory sharing a name prefix ("docs-private" vs "docs") cannot slip through
  // a bare startsWith.
  const parts = rel.split(/[/\\]+/)
  if (parts.some((p) => p === '..')) return null
  const safe = parts.filter((p) => p && p !== '.').join('/')
  const candidates = [safe, `${safe}.html`, safe ? `${safe}/index.html` : 'index.html']
  for (const candidate of candidates) {
    const full = resolve(docRoot, candidate)
    if (full !== docRoot && !full.startsWith(docRoot + sep)) continue
    try {
      if (statSync(full).isFile()) return full
    } catch {
      /* try the next shape */
    }
  }
  return null
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])

  if (urlPath === '/' || urlPath === '') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(indexPage())
    return
  }

  const file = resolveFile(urlPath.replace(/^\/+/, ''))
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`404 — no file for ${urlPath}\n`)
    return
  }

  // Read before writing the header, so a read failure cannot throw after a 200 head.
  let body
  try {
    body = readFileSync(file)
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Could not read ${file}: ${error.message}\n`)
    return
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  res.end(body)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`design previews: http://127.0.0.1:${PORT}/`)
  console.log(`root: ${docRoot}`)
  for (const c of CANDIDATES) {
    if (existsSync(join(docRoot, c.href))) console.log(`  /${c.href}`)
  }
  console.log('press Ctrl+C to stop')
})
