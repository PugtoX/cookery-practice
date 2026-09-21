// Throwaway: does the proposed layout survive EVERY page, not just the home page?
// The proposal has only ever been rendered on index.html and a preview page. The real
// risk is a dense page (classes, privacy, terms) overflowing at 375px or looking wrong
// at 1280px once the container widens.
//
// It injects the proposed rules into the real pages rather than editing style.css, so
// nothing ships from this run.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const root = 'E:/AI/AI_Agent/workplace/cookery-practice'
const require = createRequire(join(root, 'package.json'))
const puppeteer = require('puppeteer-core')
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }

// Every page the build produces.
const pages = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => e.name)
for (const dir of ['classes']) {
  try {
    for (const f of readdirSync(join(root, dir))) if (f.endsWith('.html')) pages.push(`${dir}/${f}`)
  } catch { /* not present */ }
}

const server = createServer((q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '')
  let b
  try { b = readFileSync(join(root, rel)) } catch { r.writeHead(404).end('nf'); return }
  r.writeHead(200, { 'content-type': T[extname(rel)] || 'application/octet-stream' }).end(b)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`

// The exact proposal, as it would appear in style.css.
const PROPOSAL = `
:root { --measure: 52rem; --measure-text: 34rem; --gutter: clamp(1rem, 4vw, 2.5rem); --step-block: var(--step-2); }
.wrap { padding-left: var(--gutter); padding-right: var(--gutter); }
.wrap > p { max-width: var(--measure-text); }
section { padding-top: var(--step-3); padding-bottom: var(--step-block); }
`

const browser = await puppeteer.launch({
  executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  headless: true,
  args: ['--no-sandbox'],
})

const rows = []
let failures = 0
for (const file of pages) {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage()
    await page.setViewport({ width, height: 900 })
    await page.goto(base + file, { waitUntil: 'load' })
    await page.addStyleTag({ content: PROPOSAL })
    const m = await page.evaluate(() => {
      const de = document.documentElement
      const wrap = document.querySelector('.wrap')
      const w = wrap ? wrap.getBoundingClientRect() : null
      // Any element wider than the viewport, which is the usual cause of overflow.
      let widest = null
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width > window.innerWidth + 1 && (!widest || r.width > widest.w)) {
          widest = { w: Math.round(r.width), tag: el.tagName + '.' + (el.className || '') }
        }
      }
      return {
        overflow: de.scrollWidth - de.clientWidth,
        wrapW: w ? Math.round(w.width) : null,
        wrapLeft: w ? Math.round(w.left) : null,
        wrapRight: w ? Math.round(window.innerWidth - w.right) : null,
        widest,
      }
    })
    if (m.overflow > 0) {
      failures += 1
      console.error(`FAIL ${file} @${width}px  overflow ${m.overflow}px  widest=${m.widest ? m.widest.tag + ' ' + m.widest.w + 'px' : '?'}`)
    }
    rows.push({ page: file, vw: width, overflow: m.overflow, wrapW: m.wrapW, left: m.wrapLeft, right: m.wrapRight })
    await page.close()
  }
}
await browser.close()
server.close()

// Summarise: one line per page at 1280, plus the overflow verdict.
const at1280 = rows.filter((r) => r.vw === 1280)
console.log(`pages checked: ${pages.length}`)
console.table(at1280.map((r) => ({ page: r.page, wrapW: r.wrapW, left: r.left, right: r.right, overflow: r.overflow })))
const overflows = rows.filter((r) => r.overflow > 0)
console.log(overflows.length === 0
  ? `PASS: no overflow on any of ${pages.length} pages at 375 / 768 / 1280px`
  : `FAIL: ${overflows.length} overflow case(s)`)
process.exitCode = failures === 0 ? 0 : 1
