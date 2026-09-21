// Throwaway: screenshot the redesign so it can be judged before the photographs land.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const docRoot = 'E:/AI/AI_Agent/workplace/cookery-practice/docs'
const require = createRequire('E:/AI/AI_Agent/workplace/cookery-practice/package.json')
const puppeteer = require('puppeteer-core')
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' }

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
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.goto(url, { waitUntil: 'load' })
await page.evaluate(() => { document.querySelector('.lv-readout').style.display = 'none' })
const fs = await import('node:fs')
fs.writeFileSync(`${process.env.TEMP}/redesign-wide.png`, await page.screenshot({ fullPage: true }))
await page.click('.lv-bar button[data-pick="noserif"]')
await new Promise((r) => setTimeout(r, 300))
fs.writeFileSync(`${process.env.TEMP}/redesign-noserif.png`, await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 700 } }))
console.log('written')
await browser.close()
server.close()
