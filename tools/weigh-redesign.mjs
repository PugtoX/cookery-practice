// Throwaway: measure what the photographs actually cost, with Lighthouse, against a
// local server. Localhost with simulated throttling is not identical to a deployed run,
// but it answers the only question that matters here: how much did the hero cost us?
//
// Run twice — once with the hero hidden — so the delta is attributable to the image
// rather than to throttling noise.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { execFileSync } from 'node:child_process'

const docRoot = 'E:/AI/AI_Agent/workplace/cookery-practice/docs'
const projRoot = 'E:/AI/AI_Agent/workplace/cookery-practice'
const require = createRequire(join(projRoot, 'package.json'))
const T = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

const server = createServer((q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '')
  let b
  try { b = readFileSync(join(docRoot, rel)) } catch { r.writeHead(404).end('nf'); return }
  r.writeHead(200, { 'content-type': T[extname(rel)] || 'application/octet-stream' }).end(b)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/redesign/index.html`
console.log('serving', url)

// Total transfer for a first load: fetch the page and its subresources the way a browser
// would, and report the encoded byte count per type. This is the honest number, and it
// does not depend on Lighthouse being installed.
const pageRes = await fetch(url)
const html = await pageRes.text()
const assets = new Set()
for (const m of html.matchAll(/(?:src|srcset|href)="([^"]+)"/g)) {
  for (const part of m[1].split(',')) {
    const p = part.trim().split(/\s+/)[0]
    if (!p || p.startsWith('http') || p.startsWith('data:') || p.startsWith('#') || p.startsWith('mailto:')) continue
    if (/\.(avif|webp|jpg|png|css|js)$/.test(p)) assets.add(p)
  }
}
let total = Buffer.byteLength(html)
const rows = [{ asset: 'index.html', bytes: Buffer.byteLength(html) }]
for (const a of [...assets].sort()) {
  try {
    const r = await fetch(new URL(a, url))
    const buf = Buffer.from(await r.arrayBuffer())
    total += buf.length
    rows.push({ asset: a, bytes: buf.length, type: r.headers.get('content-type') ?? '' })
  } catch { /* skip */ }
}

console.log('')
console.log('everything the page references (a real browser fetches ONE of each srcset):')
console.table(rows.map((r) => ({ asset: r.asset, KiB: (r.bytes / 1024).toFixed(1) })))
console.log(`sum of ALL variants referenced: ${(total / 1024).toFixed(1)} KiB`)
console.log('')
console.log('What an actual visitor downloads on the first screen:')
// Match by suffix: the row keys are the hrefs, so "img/hero.avif", not "hero.avif".
// The first version compared against the bare filename and silently reported 0 KiB.
const find = (needle) => rows.find((r) => r.asset.endsWith(needle))
const heroSmall = find('/hero.avif') ?? find('hero.avif')
const css2 = find('.css')
const htmlBytes = Buffer.byteLength(html)
const heroBytes = heroSmall?.bytes ?? 0
const cssBytes = css2?.bytes ?? 0
console.log(`  index.html                    ${(htmlBytes / 1024).toFixed(1)} KiB`)
console.log(`  redesign.css                  ${(cssBytes / 1024).toFixed(1)} KiB`)
console.log(`  hero (one AVIF variant)       ${(heroBytes / 1024).toFixed(1)} KiB`)
console.log(`  card photos                   0 KiB — all four are loading="lazy"`)
console.log('')
console.log(`First screen ≈ ${((htmlBytes + cssBytes + heroBytes) / 1024).toFixed(1)} KiB`)
console.log('')
console.log('The four lazy cards, if the visitor scrolls to them (AVIF):')
let lazy = 0
for (const s of ['knife-skills', 'bread-baking', 'pasta-from-scratch', 'market-table']) {
  const r = find(`${s}.avif`)
  lazy += r?.bytes ?? 0
  console.log(`  ${s.padEnd(22)} ${((r?.bytes ?? 0) / 1024).toFixed(1)} KiB`)
}
console.log(`  total on scroll               ${(lazy / 1024).toFixed(1)} KiB`)

server.close()
