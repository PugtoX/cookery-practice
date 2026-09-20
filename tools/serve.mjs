#!/usr/bin/env node
// Local preview server for `npm run dev`.
//
// Why not `python -m http.server` or `npx serve`: those serve files as they sit on
// disk. The deployed site serves extensionless URLs — /cookery-practice/about, not
// /cookery-practice/about.html — and a preview that does not reproduce that will let
// a broken link pass locally and fail in production. This resolves requests the same
// way GitHub Pages does, and the same way tools/link-check.mjs checks them.
//
// Zero dependencies, Node built-ins only.
//
// Usage: npm run dev          then open http://127.0.0.1:4173/cookery-practice/
// Port: set PORT to change it.

import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
// The directory that would be deployed. Serve sources when there is no build yet,
// so `npm run dev` works before the first `npm run build`.
const distDir = join(root, 'dist')
const serveDir = existsSync(join(distDir, 'index.html')) ? distDir : root

// Same single source of truth as the build: the site's own path prefix comes from
// site.config.yml, so changing the domain or sub-path does not need an edit here.
const origin = readFileSync(join(root, 'site.config.yml'), 'utf8').match(/^origin:\s*(\S+)\s*$/m)?.[1]
const base = origin ? new URL(origin).pathname.replace(/\/+$/, '/') : '/'

const PORT = Number(process.env.PORT ?? 4173)

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
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
}

// /about → about.html, /about/ → about/index.html, / → index.html
function resolveFile(rel) {
  const clean = rel === '' ? 'index.html' : rel
  for (const candidate of [clean, `${clean}.html`, join(clean, 'index.html')]) {
    const full = join(serveDir, candidate)
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

  if (!urlPath.startsWith(base) && urlPath !== base.replace(/\/$/, '')) {
    // Be explicit rather than rendering a confusing 404: on the real host this path
    // is simply not part of the site.
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Not part of this site. The site is served from ${base}\n`)
    return
  }

  const rel = urlPath.slice(base.length)
  const file = resolveFile(rel)

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(
      `<!doctype html><meta charset="utf-8"><title>404</title>` +
        `<h1>404</h1><p>No file for <code>${urlPath}</code> under <code>${serveDir}</code>.</p>`,
    )
    return
  }

  // Read before writing the header: a directory that slipped through would throw
  // EISDIR inside the handler, and an exception escaping it kills the process with
  // no output at all — the failure mode this workspace has already been bitten by.
  let body
  try {
    body = readFileSync(file)
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Could not read ${file}: ${error.message}\n`)
    return
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  res.end(body)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${serveDir}`)
  console.log(`open http://127.0.0.1:${PORT}${base}`)
  console.log('press Ctrl+C to stop')
})
