// Throwaway: verify the redesign layout and answer whether the serif display face is
// carrying its weight. Runs without the photographs — the layout must hold on its own,
// and if it only "works" because a photo is pretty, that is worth knowing now.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

const root = 'E:/AI/AI_Agent/workplace/cookery-practice'
const docRoot = join(root, 'docs')
const require = createRequire(join(root, 'package.json'))
const puppeteer = require('puppeteer-core')
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }

const server = createServer((q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '')
  const f = join(docRoot, rel)
  let b
  try { b = readFileSync(f) } catch { r.writeHead(404).end('nf'); return }
  r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }).end(b)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/redesign/index.html`

const browser = await puppeteer.launch({
  executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  headless: true,
  args: ['--no-sandbox'],
})

const rows = []
let bad = 0
for (const width of [375, 768, 1280]) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900 })
  await page.goto(url, { waitUntil: 'load' })
  for (const mode of ['wide', 'narrow', 'noserif']) {
    await page.click(`.lv-bar button[data-pick="${mode}"]`)
    await new Promise((r) => setTimeout(r, 200))
    const m = await page.evaluate(() => {
      const de = document.documentElement
      const wrap = document.querySelector('.hero .wrap').getBoundingClientRect()
      const h1 = document.querySelector('h1')
      const h1cs = getComputedStyle(h1)
      const h1r = h1.getBoundingClientRect()
      const ed = document.querySelector('.editorial')
      const cols = getComputedStyle(ed).gridTemplateColumns
      const card = document.querySelector('.card').getBoundingClientRect()
      return {
        mode: document.body.dataset.mode,
        wrapW: Math.round(wrap.width),
        pct: Math.round((wrap.width / window.innerWidth) * 100),
        h1Size: Math.round(parseFloat(h1cs.fontSize)),
        h1Family: h1cs.fontFamily.split(',')[0].replace(/"/g, ''),
        h1Lines: Math.round(h1r.height / parseFloat(h1cs.lineHeight)),
        // Does the h1 stay inside the container?
        h1Fits: h1r.right <= wrap.right + 1,
        cols: cols.split(' ').length,
        colWidths: cols,
        cardW: Math.round(card.width),
        overflow: de.scrollWidth - de.clientWidth,
        widest: (() => {
          let w = null
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect()
            if (r.width > window.innerWidth + 1 && (!w || r.width > w.w)) w = { w: Math.round(r.width), tag: el.tagName + '.' + (el.className || '') }
          }
          return w
        })(),
      }
    })
    if (m.overflow > 0) { bad += 1; console.error(`FAIL ${width}px ${mode}: overflow ${m.overflow}px widest=${m.widest ? m.widest.tag : '?'}`) }
    if (!m.h1Fits) { bad += 1; console.error(`FAIL ${width}px ${mode}: h1 escapes its container`) }
    rows.push({ vw: width, ...m })
  }
  await page.close()
}
await browser.close()
server.close()

console.table(rows.map((r) => ({
  vw: r.vw, mode: r.mode, wrapW: r.wrapW, pct: r.pct, h1: r.h1Size + 'px', face: r.h1Family,
  lines: r.h1Lines, cols: r.cols, cardW: r.cardW, overflow: r.overflow,
})))

console.log('')
console.log('Serif vs sans (1280px, wide):')
const wide = rows.filter((r) => r.vw === 1280 && (r.mode === 'wide' || r.mode === 'noserif'))
for (const r of wide) console.log(`  ${r.mode.padEnd(8)} face=${r.h1Family.padEnd(12)} size=${r.h1Size}px  lines=${r.h1Lines}  cards=${r.cardW}px`)
console.log(bad === 0 ? 'PASS: layout holds at every width and in every mode' : `FAIL: ${bad} case(s)`)
process.exitCode = bad === 0 ? 0 : 1
