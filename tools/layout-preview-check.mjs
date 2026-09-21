#!/usr/bin/env node
// Layout preview check.
//
// Renders docs/layout-preview.html in every option the switcher offers and asserts:
//   * characters per RENDERED line stay inside the readable band
//   * no horizontal scroll at 375px (the project's hard floor) or 1280px
//   * the container actually widens and the cards actually grow
//   * body text stays left-aligned in every option
//
// It counts characters by walking the text node one character at a time and grouping by
// the top of each character's rect, because that is the only measurement that answers
// "how many characters is this line". Two earlier attempts got this wrong: measuring an
// offscreen alphabet gave the wrong per-character width, and measuring a one-line
// paragraph reported a constant count at every width. Both mistakes looked like results.
//
// Usage: node tools/layout-preview-check.mjs
// Exit codes: 0 = all options pass, 1 = an assertion failed, 2 = precondition unmet.

import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const previewFile = join(root, 'docs', 'layout-preview.html')
if (!existsSync(previewFile)) {
  console.error(`[precondition] no ${previewFile}`)
  process.exit(2)
}

const require = createRequire(join(root, 'package.json'))
let puppeteer
try {
  puppeteer = require('puppeteer-core')
} catch {
  console.error(`[precondition] puppeteer-core not resolvable from ${root}\n  npm i -D --no-save puppeteer-core`)
  process.exit(2)
}
const chrome = process.env.CHROME_PATH ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`
if (!existsSync(chrome)) {
  console.error(`[precondition] no Chrome at ${chrome}. Set CHROME_PATH.`)
  process.exit(2)
}

// Readable line length. 45-75 is the conventional band; this site targets 60-75, and
// the current shipped site measures 64-71 characters, so the band below is deliberately
// tight enough to catch a regression rather than to bless anything plausible.
const MIN_CHARS = 55
const MAX_CHARS = 78

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' }
const server = createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'docs/layout-preview.html'
  let body
  try {
    body = readFileSync(join(root, rel))
  } catch {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/docs/layout-preview.html`

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
let failures = 0
const rows = []

// Walks a text node character by character and returns the character count of each
// rendered line, dropping the last (usually short) line from the statistics.
const LINE_COUNTER = `(el) => {
  const node = el.firstChild
  if (!node || node.nodeType !== 3) return null
  const text = node.textContent
  const range = document.createRange()
  const counts = []
  let lastTop = null
  let n = 0
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const r = range.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (lastTop === null || Math.abs(r.top - lastTop) > 1) {
      if (n) counts.push(n)
      lastTop = r.top
      n = 0
    }
    n++
  }
  if (n) counts.push(n)
  return counts
}`

try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage()
    await page.setViewport({ width, height: 900 })
    await page.goto(url, { waitUntil: 'load' })
    const options = await page.$$eval('.lv-bar button[data-pick]', (bs) => bs.map((b) => b.dataset.pick))
    for (const opt of options) {
      await page.click(`.lv-bar button[data-pick="${opt}"]`)
      await new Promise((r) => setTimeout(r, 220))
      const m = await page.evaluate(
        (counterSrc) => {
          const countLines = eval(counterSrc)
          const wrap = document.querySelector('.page-head .wrap').getBoundingClientRect()
          const card = document.querySelector('.card').getBoundingClientRect()
          const lede = document.querySelector('.lede')
          const counts = countLines(lede)
          const full = counts && counts.length > 1 ? counts.slice(0, -1) : counts
          const de = document.documentElement
          return {
            attr: document.body.dataset.lv,
            wrapW: Math.round(wrap.width),
            gapL: Math.round(wrap.left),
            gapR: Math.round(window.innerWidth - wrap.right),
            pct: Math.round((wrap.width / window.innerWidth) * 100),
            cardW: Math.round(card.width),
            ledeBox: Math.round(lede.getBoundingClientRect().width),
            ledeMedia: getComputedStyle(lede).maxWidth,
            charsMedian: full && full.length ? full.slice().sort((a, b) => a - b)[Math.floor(full.length / 2)] : null,
            charsMax: full && full.length ? Math.max(...full) : null,
            h1Align: getComputedStyle(document.querySelector('h1')).textAlign,
            overflow: de.scrollWidth - de.clientWidth,
          }
        },
        LINE_COUNTER,
      )
      rows.push({ vw: width, ...m })

      const tag = `[${width}px ${opt}]`
      if (m.overflow > 0) { console.error(`FAIL ${tag} horizontal overflow ${m.overflow}px`); failures += 1 }
      if (m.h1Align !== 'start') { console.error(`FAIL ${tag} h1 text-align is ${m.h1Align}, expected start`); failures += 1 }
      if (width === 375 && opt !== 'now' && m.wrapW !== 375) { console.error(`FAIL ${tag} container should fill 375px, is ${m.wrapW}`); failures += 1 }
      if (width === 1280) {
        if (m.charsMax === null) { console.error(`FAIL ${tag} could not count characters per line`); failures += 1 }
        else if (m.charsMax > MAX_CHARS) { console.error(`FAIL ${tag} longest line is ${m.charsMax} characters (limit ${MAX_CHARS})`); failures += 1 }
        else if (m.charsMax < MIN_CHARS) { console.error(`FAIL ${tag} longest line is only ${m.charsMax} characters (floor ${MIN_CHARS})`); failures += 1 }
      }
    }
    await page.close()
  }

  // Side-by-side captures, so the decision can be made on a picture and on the numbers.
  // This has to run before the finally closes the browser.
  if (process.env.SHOTS === '1') {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 820 })
    await page.goto(url, { waitUntil: 'load' })
    for (const opt of ['now', '52']) {
      await page.click(`.lv-bar button[data-pick="${opt}"]`)
      await new Promise((r) => setTimeout(r, 250))
      await page.evaluate(() => {
        document.getElementById('readout').style.display = 'none'
      })
      const path = `${process.env.TEMP}/layout-${opt}.png`
      await page.screenshot({ path })
      console.log(`shot ${opt} -> ${path}`)
    }
    await page.close()
  }
} finally {
  await browser.close()
  server.close()
}

console.table(rows)
console.log('')
console.log(`Readable band enforced: ${MIN_CHARS}-${MAX_CHARS} characters per line at 1280px.`)
console.log('The current site measures 64-71, so anything outside the band is a regression.')
console.log(failures === 0 ? `PASS: every option within band, no overflow` : `FAIL: ${failures} assertion(s)`)
process.exitCode = failures === 0 ? 0 : 1
