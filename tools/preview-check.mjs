// Throwaway: render the background demo in all three directions and check the
// project's own hard constraint (no horizontal scroll at 375px) holds for each.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(join(root, 'package.json'))
const puppeteer = require('puppeteer-core')
const chrome = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' }
const server = createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'docs/backgrounds-preview.html'
  const file = join(root, rel)
  // Read first, then write headers once. Writing a 200 head before the read meant a
  // missing file threw ERR_HTTP_HEADERS_SENT on the 404 path.
  let body
  try {
    body = readFileSync(file)
  } catch {
    res.writeHead(404).end('nf')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/docs/backgrounds-preview.html`

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
let bad = 0
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage()
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: 'load' })
    for (const id of ['a', 'b', 'c']) {
      await page.click(`.pv-bar button[data-pick="${id}"]`)
      await new Promise((r) => setTimeout(r, 250))
      const m = await page.evaluate(() => {
        const de = document.documentElement
        const head = document.querySelector('.page-head')
        const header = document.querySelector('.site-header')
        return {
          attr: document.body.dataset.bg,
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          innerW: window.innerWidth,
          headerBg: getComputedStyle(header).backgroundColor,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyImg: getComputedStyle(document.body).backgroundImage.slice(0, 60),
          // Proves the ::before texture actually paints, rather than trusting the rule.
          headBeforeImg: getComputedStyle(head, '::before').backgroundImage.slice(0, 50),
          headerImg: getComputedStyle(header).backgroundImage.slice(0, 40),
        }
      })
      const overflow = m.scrollW - m.clientW
      const ok = overflow <= 0
      if (!ok) bad += 1
      console.log(
        `${width}px  bg=${m.attr}  scrollW=${m.scrollW} clientW=${m.clientW} overflow=${overflow} ${ok ? 'OK' : 'OVERFLOW'}`,
      )
      console.log(`        page=${m.bodyBg}  header=${m.headerBg}`)
      console.log(`        .page-head::before image: ${m.headBeforeImg || 'none'}`)
      if (id === 'b') console.log(`        header image: ${m.headerImg || 'none'}`)
    }
    await page.close()
  }
} finally {
  await browser.close()
  server.close()
}
console.log(bad === 0 ? 'PASS: no horizontal scroll in any direction at 375px or 1280px' : `FAIL: ${bad} overflowing combination(s)`)
process.exitCode = bad === 0 ? 0 : 1
