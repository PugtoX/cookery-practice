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
// an env var is the boring fix. With LIVE_URL set the server is closed again before
// the browser opens, so this cannot collide with whatever already holds a port.
const live = process.env.LIVE_URL
if (live) server.close()
const url = live ?? `http://127.0.0.1:${server.address().port}${BASE}/`

const browser = await puppeteer.launch({
  executablePath: String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
// Against the live site, force everything through the network. Without this Chrome
// serves the previously-shoot files from its disk cache and the screenshots come back
// byte-identical to the local run — which looks like proof of a live render and is not.
if (live) await page.setCacheEnabled(false)
const seen = []
const failed = []
page.on('requestfailed', (r) => failed.push(r.url()))
page.on('response', (r) => {
  seen.push(`${r.status()} ${r.url()}`)
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
})
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await page.evaluate(() => new Promise((res) => setTimeout(res, 800)))

const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const box = (s) => {
    const e = q(s)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return { left: Math.round(b.left), width: Math.round(b.width) }
  }
  const heroImg = q('.hero__img')
  const headImg = q('.page-head figure img')
  const display = q('.hero h1') ?? q('.page-head h1')
  const h1cs = display ? getComputedStyle(display) : null
  const pic = heroImg ?? headImg
  const pcs = pic ? getComputedStyle(pic) : null
  return {
    heroPresent: !!heroImg,
    heroRendered: heroImg ? `${heroImg.naturalWidth}x${heroImg.naturalHeight}` : 'none',
    heroChosenSrc: heroImg ? heroImg.currentSrc.split('/').pop() : 'none',
    heroOpacity: heroImg ? getComputedStyle(heroImg).opacity : 'n/a',
    headFigure: !!headImg,
    headImgRendered: headImg ? `${headImg.naturalWidth}x${headImg.naturalHeight}` : 'none',
    headImgSrc: headImg ? headImg.currentSrc.split('/').pop() : 'none',
    headFigureBox: box('.page-head figure'),
    headImgBox: box('.page-head figure img'),
    h1Size: h1cs ? Math.round(parseFloat(h1cs.fontSize)) : 'n/a',
    h1Family: h1cs ? h1cs.fontFamily.split(',')[0] : 'n/a',
    container: box('.hero .wrap') ?? box('.page-head .wrap'),
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

// Shoot the home page and one class page at desktop width, then the class page again
// at 375px — the class pages are the only ones carrying a picture inside `.page-head`,
// and 375px is where a full-width figure is most likely to push the page sideways.
// Each file gets a distinct temp name: the old version wrote both shots to the same
// two names, so a failure on the second page silently left the first page's bytes in
// `live-class.png` and the result got read as a site defect rather than a script bug.
const shots = [
  ['index.html', 'live-home.png', { width: 1280, height: 900 }],
  ['classes/knife-skills.html', 'live-class.png', { width: 1280, height: 900 }],
  ['classes/knife-skills.html', 'live-class-375.png', { width: 375, height: 812 }],
  ['classes/market-table.html', 'live-class-market.png', { width: 1280, height: 900 }],
]
console.log(`target: ${url}${live ? '  (live, cache disabled)' : '  (local build)'}`)
for (const [path, name, viewport] of shots) {
  await page.setViewport(viewport)
  await page.goto(new URL(path, url).href, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => new Promise((res) => setTimeout(res, 300)))
  const probe = await page.evaluate(() => {
    const img = document.querySelector('.page-head figure img') ?? document.querySelector('.hero__img')
    return {
      title: document.title.slice(0, 40),
      img: img ? `${img.naturalWidth}x${img.naturalHeight} ${img.currentSrc.split('/').pop()}` : 'NO IMAGE',
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  console.log(`${path} @${viewport.width}px → ${JSON.stringify(probe)}`)
  writeFileSync(`${process.env.TEMP}/${name}`, await page.screenshot({ fullPage: false }))
}
console.log(`failed requests: ${failed.length ? failed.join(', ') : 'none'}`)

await browser.close()
server.close()
