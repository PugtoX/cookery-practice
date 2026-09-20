#!/usr/bin/env node
// Checks the no-JavaScript fallback of the callback form, which index.html's form
// comment describes. Three separate questions, because they have different answers:
//   1. Does a native submit actually leave the browser with every field?  (LOCAL)
//   2. What does a real no-JS visitor on the deployed site end up looking at?  (LIVE)
//   3. Was the submission filed as inbox or spam?  NOT ANSWERABLE HERE — that is
//      decided server-side; read it from the form dashboard. Recorded in
//      docs/form-submission.md.
//
// Why this is a browser test and not a fetch(): form.js calls preventDefault(), so a
// native POST only happens when the module never loads. A bare Node fetch() is NOT an
// equivalent probe — it sends no Origin and no Referer, which is the shape Formspree's
// spam filter treats as a bot. The first version of this file did that, got a
// 302 -> /thanks, and was recorded as a pass. The submission had in fact been filed as
// spam. A 302 proves routing, never delivery.
//
// Exit codes: 0 = both halves pass, 1 = one failed, 2 = precondition unmet.

import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIVE_ORIGIN = 'https://pugtox.github.io/cookery-practice/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('[precondition] no dist/. Run `npm run build` first.')
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

// ---------------------------------------------------------------- local harness
const received = []
const sink = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    received.push({
      method: req.method,
      contentType: req.headers['content-type'] ?? '',
      origin: req.headers.origin ?? null,
      body,
    })
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<p id="outcome">SINK-ACCEPTED</p>')
  })
})
await new Promise((r) => sink.listen(0, '127.0.0.1', r))
const sinkUrl = `http://127.0.0.1:${sink.address().port}/f/test`

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}
const BASE = '/cookery-practice/'
const server = createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0])
  if (!p.startsWith(BASE)) {
    res.writeHead(404).end('outside base')
    return
  }
  const rel = p.slice(BASE.length) || 'index.html'
  let file = join(dist, rel)
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`
  try {
    let body = readFileSync(file)
    if (rel === 'index.html' || rel === '') {
      // Point the form at the recording sink. This is the only edit to the artefact.
      body = Buffer.from(
        body.toString('utf8').replace(/action="[^"]*"/, `action="${sinkUrl}"`),
      )
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const localUrl = `http://127.0.0.1:${server.address().port}${BASE}`

// ------------------------------------------------------------------- browser
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const results = []
let failures = 0
function record(name, ok, detail) {
  results.push({ name, ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// Fields the endpoint is expected to receive, read from the shipped markup so a form
// edit that drops one fails here instead of silently shipping a shorter submission.
const shipped = readFileSync(join(dist, 'index.html'), 'utf8')
const expectedFields = [
  ...shipped.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="([^"]+)"/g),
].map((m) => m[1])

try {
  // ---- LOCAL: JavaScript disabled, native submit, body recorded
  const off = await browser.newPage()
  await off.setJavaScriptEnabled(false)
  await off.goto(localUrl, { waitUntil: 'domcontentloaded' })
  const typed = await off.evaluate(() => {
    const f = document.getElementById('callback')
    if (!f) return { error: 'no #callback form' }
    f.querySelector('#name').value = 'No-JS Check'
    f.querySelector('#contact').value = 'nojs@example.com'
    f.querySelector('#interest').value = 'Pasta From Scratch'
    f.querySelector('#notes').value = 'Native submit with JavaScript disabled.'
    return {
      method: f.getAttribute('method'),
      action: f.getAttribute('action'),
      buttonType: f.querySelector('button[type="submit"]')?.getAttribute('type') ?? null,
    }
  })
  record('no-JS: form is present and typed into', !typed.error, typed.error ?? `method=${typed.method}`)
  record('no-JS: method attribute is POST', (typed.method ?? '').toUpperCase() === 'POST', `method=${typed.method}`)
  record('no-JS: submit button defaults to submit', typed.buttonType === 'submit', `type=${typed.buttonType}`)

  const attempted = off
    .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  await off.evaluate(() => document.getElementById('callback').requestSubmit())
  const navigated = await attempted
  await sleep(500)

  record('no-JS: browser navigated (native submit happened)', navigated, navigated ? '' : 'no navigation')
  // Count POSTs only: the browser also GETs the action URL while loading the form,
  // because requestSubmit() resolves the action. Counting the whole array made a
  // correct submission look like a double-send the first time this ran.
  const posts = received.filter((r) => r.method === 'POST')
  record('no-JS: sink received exactly one POST', posts.length === 1, `posts=${posts.length} of ${received.length} requests`)
  if (posts.length > 0) {
    const got = posts[0]
    record('no-JS: POST was form-urlencoded', /application\/x-www-form-urlencoded/.test(got.contentType), got.contentType)
    const params = new URLSearchParams(got.body)
    const keys = [...params.keys()]
    const missing = expectedFields.filter((f) => !keys.includes(f))
    record('no-JS: every field reached the endpoint', missing.length === 0, missing.length ? `missing=${missing.join(',')}` : `fields=${keys.join(',')}`)
    record('no-JS: honeypot travelled, empty', params.get('website') === '', `website=${JSON.stringify(params.get('website'))}`)
    record('no-JS: values are the typed ones', params.get('name') === 'No-JS Check', `name=${params.get('name')}`)
  }
  const outcome = await off.evaluate(() => document.getElementById('outcome')?.textContent ?? null).catch(() => null)
  record('no-JS: endpoint response was rendered', outcome === 'SINK-ACCEPTED', `outcome=${outcome}`)
  await off.close()

  // ---- LIVE: the deployed site, JavaScript disabled, real endpoint
  const live = await browser.newPage()
  await live.setJavaScriptEnabled(false)
  const liveText = []
  live.on('response', (r) => {
    const u = r.url()
    if (u.startsWith('https://formspree.io/')) liveText.push(`${r.status()} ${u}`)
  })
  await live.goto(LIVE_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const liveForm = await live.evaluate(() => {
    const f = document.getElementById('callback')
    if (!f) return { error: 'no #callback form on the live page' }
    f.querySelector('#name').value = 'No-JS Live Check'
    f.querySelector('#contact').value = 'nojs-live@example.com'
    f.querySelector('#interest').value = 'Pasta From Scratch'
    f.querySelector('#notes').value = 'Deployed-site native submit, JavaScript disabled. Safe to delete.'
    return { method: f.getAttribute('method'), action: f.getAttribute('action') }
  })
  if (liveForm.error) {
    record('live: form present on deployed page', false, liveForm.error)
  } else {
    record('live: deployed form method is POST', (liveForm.method ?? '').toUpperCase() === 'POST', `method=${liveForm.method}`)
    const liveNav = live
      .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    await live.evaluate(() => document.getElementById('callback').requestSubmit())
    await liveNav
    await sleep(1500)
    const landed = live.url()
    const body = await live.evaluate(() => (document.body?.innerText ?? '').slice(0, 400)).catch(() => '')
    console.log(`      formspree responses: ${liveText.join(' | ') || '(none seen)'}`)
    console.log(`      landed on: ${landed}`)
    record('live: submission left the browser for formspree', liveText.length > 0, liveText.join(' | ') || 'no request observed')
    record('live: landed on the service success page', /formspree\.io\/thanks/.test(landed), landed)
    // A native submit cannot be answered in-place, so the service takes the visitor to
    // its own /thanks page. This site does not get to render the confirmation, and with
    // no custom redirect configured the visitor has no way back except the back button.
    // Recorded as a measured fact; see docs/form-submission.md.
    record(
      'live: no-JS visitor is shown a success page',
      /submitted successfully/i.test(body),
      body.replace(/\s+/g, ' ').slice(0, 80),
    )
  }
  await live.close()
} finally {
  await browser.close()
  server.close()
  sink.close()
}

console.log('')
console.log(`${results.length - failures}/${results.length} checks passed`)
console.log('Note: whether formspree files this as inbox or spam is decided server-side and')
console.log('can only be read from the form dashboard, not from this process.')
process.exitCode = failures === 0 ? 0 : 1
