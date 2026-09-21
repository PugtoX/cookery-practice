// Measure the REAL computed contrast of every text node on every built page,
// including backgrounds that are translucent or inherited.
//
// Why this exists: web-gzliu/contrast-check.mjs checks the six palette candidates in
// palettes/index.html against hardcoded hex pairs. It says so itself (its line 117:
// "未覆盖 accent 文字叠在 accent 光晕上的渲染态"). It is therefore not evidence about
// this site. Lighthouse's color-contrast audit is, and it found `.tag` at 3.71:1 —
// versus the 4.5:1 that 11px normal-weight text needs.
//
// This closes that gap here: it reads computed styles out of a real browser, so a
// translucent background is composited rather than assumed opaque, and it covers every
// page instead of one URL. Verified to fail: with `.tag` back on `--accent` it reports
// index.html `span.tag` at 4.09:1 and exits 1.
//
// Run: node tools/contrast-audit.mjs        (needs npm run build first)
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const require = createRequire('E:/AI/AI_Agent/workplace/cookery-practice/package.json')
const puppeteer = require('puppeteer-core')
const dist = 'E:/AI/AI_Agent/workplace/cookery-practice/dist'
const BASE = '/cookery-practice'
const T = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}
const server = createServer((q, r) => {
  const p = decodeURIComponent((q.url || '/').split('?')[0])
  if (!p.startsWith(BASE)) { r.writeHead(404).end('nf'); return }
  const rel = p.slice(BASE.length).replace(/^\/+/, '') || 'index.html'
  let b
  try { b = readFileSync(join(dist, rel)) } catch {
    try { b = readFileSync(join(dist, rel) + '.html') } catch { r.writeHead(404).end('nf'); return }
  }
  r.writeHead(200, { 'content-type': T[extname(rel)] || 'application/octet-stream' }).end(b)
})
await new Promise((res) => server.listen(0, '127.0.0.1', res))
const origin = `http://127.0.0.1:${server.address().port}${BASE}`

const PAGES = [
  'index.html', 'classes.html', 'recipes.html', 'about.html', 'contact.html',
  'privacy.html', 'terms.html',
  'classes/knife-skills.html', 'classes/bread-baking.html',
  'classes/pasta-from-scratch.html', 'classes/market-table.html',
]

const browser = await puppeteer.launch({
  executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

const findings = []
for (const path of PAGES) {
  await page.goto(`${origin}/${path}`, { waitUntil: 'networkidle2' })
  const rows = await page.evaluate(() => {
    // Walk up until an element actually paints a background. A translucent colour is
    // kept as-is and composited later — assuming it is opaque is exactly the mistake
    // that would fake a pass here.
    const bgOf = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c
        n = n.parentElement
      }
      return getComputedStyle(document.body).backgroundColor
    }
    const out = []
    document.querySelectorAll('body *').forEach((el) => {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!direct) return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const cs = getComputedStyle(el)
      out.push({
        sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/).join('.') : ''),
        text: (el.textContent || '').trim().slice(0, 24),
        fg: cs.color,
        bg: bgOf(el),
        fontSize: parseFloat(cs.fontSize),
        bold: parseInt(cs.fontWeight, 10) >= 700,
      })
    })
    const seen = new Set()
    return out.filter((x) => {
      const k = `${x.sel}|${x.fg}|${x.bg}|${x.fontSize}|${x.bold}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  })
  for (const row of rows) findings.push({ page: path, ...row })
}
await browser.close()
server.close()

// --- WCAG maths -------------------------------------------------------------
const parse = (c) => {
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1].split(',').map((x) => parseFloat(x))
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
}
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
})
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
const ratio = (a, b) => {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

let fails = 0
for (const f of findings) {
  let fg = parse(f.fg)
  let bg = parse(f.bg)
  if (!fg || !bg) continue
  // Composite the translucent text colour and the translucent background in order:
  // text over bg, bg over the page. An opaque bg is already final.
  let base = bg
  if (bg.a < 1) base = over(bg, { r: 253, g: 253, b: 253, a: 1 }) // --page
  const compositedFg = fg.a < 1 ? over(fg, base) : fg
  if (bg.a < 1 || fg.a < 1) {
    // transparent background: cannot know what is behind it
  }
  const need = f.fontSize >= 24 || (f.fontSize >= 18.66 && f.bold) ? 3 : 4.5
  const r = ratio(compositedFg, base)
  const pass = r >= need
  if (!pass) fails++
  if (!pass || process.env.SHOW_ALL) {
    console.log(
      `${pass ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1 (need ${need})  ${f.page}  ${f.sel}` +
      `  fg=${hex(compositedFg)} bg=${hex(base)}${bg.a < 1 ? ' [bg was translucent]' : ''} ${f.fontSize}px${f.bold ? ' bold' : ''}  "${f.text}"`,
    )
  }
}
console.log(`\n${findings.length} distinct text/colour pairs across ${PAGES.length} pages; ${fails} below threshold`)
process.exit(fails ? 1 : 0)
