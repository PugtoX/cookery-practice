#!/usr/bin/env node
// Render assets/og.png to assets/og.png at 1200x630.
//
// Why: og:image must be a raster format. Facebook, LinkedIn, Slack, iMessage and
// Twitter/X do not render SVG, so an SVG og:image produces a blank preview card
// everywhere it matters. The metadata was never wrong about the size — it was the
// format that made the whole Open Graph block do nothing.
//
// Puppeteer rather than an image library, for the same reason the other tools use it:
// it drives the Chrome already on the machine instead of adding a rasteriser
// dependency to a project that otherwise has none.
//
// Usage:
//   npm i -D --no-save puppeteer-core
//   node tools/make-og.mjs
// Output: assets/og.png (1200x630)

import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const svgPath = join(root, 'assets', 'og.svg')
const pngPath = join(root, 'assets', 'og.png')

if (!existsSync(svgPath)) {
  console.error(`[precondition] no ${svgPath}`)
  process.exit(2)
}

const require = createRequire(join(root, 'package.json'))
let puppeteer
try {
  puppeteer = require('puppeteer-core')
} catch {
  console.error(`[precondition] puppeteer-core not resolvable.\n  npm i -D --no-save puppeteer-core`)
  process.exit(2)
}
const chrome = process.env.CHROME_PATH ?? String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`
if (!existsSync(chrome)) {
  console.error(`[precondition] no Chrome at ${chrome}. Set CHROME_PATH.`)
  process.exit(2)
}

const WIDTH = 1200
const HEIGHT = 630
const svg = readFileSync(svgPath, 'utf8')

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })
  // Inline the SVG so the page has no external requests and no scrollbars can appear.
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<style>html,body{margin:0;padding:0;overflow:hidden;background:#f7f8f3}svg{display:block}</style>` +
      `</head><body>${svg}</body></html>`,
    { waitUntil: 'load' },
  )

  const size = await page.evaluate(() => {
    const el = document.querySelector('svg')
    const box = el.getBoundingClientRect()
    return { w: Math.round(box.width), h: Math.round(box.height) }
  })
  if (size.w !== WIDTH || size.h !== HEIGHT) {
    console.error(
      `[precondition] the SVG renders at ${size.w}x${size.h}, not ${WIDTH}x${HEIGHT}.\n` +
        `og:image:width/height in the HTML say ${WIDTH}x${HEIGHT} — fix the SVG before generating, ` +
        `or the metadata will misdescribe the image.`,
    )
    process.exit(2)
  }

  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
  writeFileSync(pngPath, buf)

  // Verify the bytes really are a PNG rather than trusting the extension.
  const head = readFileSync(pngPath).subarray(0, 8)
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!head.equals(PNG_MAGIC)) {
    console.error('[precondition] what was written is not a PNG')
    process.exit(2)
  }
  console.log(`make-og: wrote assets/og.png  ${WIDTH}x${HEIGHT}  ${(buf.length / 1024).toFixed(1)} KiB`)
} finally {
  await browser.close()
}

// Unused, but kept so the import list documents intent if this grows.
void pathToFileURL
