// Throwaway: screenshot the real rebuilt site (not the preview) at two widths so the
// result can be judged, and confirm the hero image actually paints.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const dist = 'E:/AI/AI_Agent/workplace/cookery-practice/dist'
const require = createRequire('E:/AI/AI_Agent/workplace/cookery-practice/package.json')
const puppeteer = require('puppeteer-core')
const T = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

const BASE = '/cookery-practice'
const server = createServer((q, r) => {
  let p = decodeURIComponent((q.url || '/').split('?')[0])
  if (!p.startsWith(BASE)) { r.writeHead(404).end('nf'); return }
  let rel = p.slice(BASE.length).replace(/^\/+/, '') || 'index.html'
  let f = join(dist, rel)
  let b
  try { b = readFileSync(f) } catch {
    try { b = readFileSync(f + '.html') } catch { r.writeHead(404).end('nf'); return }
  }
  r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }).end(b)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
// Set LIVE_URL to shoot the deployed site instead of the local build. This exists
// because passing a Chrome path into an inline `node -e` script through PowerShell
// needs three levels of nested quoting and failed every single time it was tried;
// an env var is the boring fix.
const url = process.env.LIVE_URL ?? `http://127.0.0.1:${server.address().port}${BASE}/`

const browser = await puppeteer.launch({
  executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
const failed = []
page.on('requestfailed', (r) => failed.push(r.url()))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => new Promise((res) => setTimeout(res, 800)))

const m = await page.evaluate(() => {
  const img = document.querySelector('.hero__img')
  const cs = img ? getComputedStyle(img) : null
  return {
    heroPresent: !!img,
    heroRendered: img ? `${img.naturalWidth}x${img.naturalHeight}` : 'none',
    heroChosenSrc: img ? img.currentSrc.split('/').pop() : 'none',
    heroOpacity: cs?.opacity,
    h1Size: Math.round(parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)),
    h1Family: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
    wrapW: Math.round(document.querySelector('.hero .wrap').getBoundingClientRect().width),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cards: document.querySelectorAll('.card').length,
    cardImgs: [...document.querySelectorAll('.card__media')].filter((i) => i.naturalWidth > 0).length,
  }
})
console.log(JSON.stringify(m, null, 2))

// Where does each horizontal band actually start? The hero looked right-shifted in the
// screenshot; measure rather than guess.
const bands = await page.evaluate(() => {
  const g = (sel) => {
    const e = document.querySelector(sel)
    if (!e) return null
    const b = e.getBoundingClientRect()
    const c = getComputedStyle(e)
    return { left: Math.round(b.left), width: Math.round(b.width), right: Math.round(b.right), margin: `${c.marginLeft}/${c.marginRight}`, maxW: c.maxWidth, display: c.display, position: c.position }
  }
  return {
    viewport: window.innerWidth,
    headerWrap: g('.site-header .wrap'),
    heroSection: g('.hero'),
    heroPicture: g('.hero > picture'),
    heroInner: g('.hero__inner'),
    h1: g('.hero h1'),
    eyebrow: g('.hero .eyebrow'),
    aboutWrap: g('main > section:nth-of-type(2) .wrap'),
  }
})
console.log('horizontal bands:')
console.log(JSON.stringify(bands, null, 2))

writeFileSync(`${process.env.TEMP}/live-home.png`, await page.screenshot({ fullPage: false }))

// A class page: no hero, page-head texture, wide container.
// Trailing slash on LIVE_URL would otherwise produce a doubled "//" path.
await page.goto(new URL('classes/knife-skills/', url).href, { waitUntil: 'networkidle2' })
writeFileSync(`${process.env.TEMP}/live-class.png`, await page.screenshot({ fullPage: false }))

await browser.close()
server.close()
