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
// Launched inside the try below. Launching it before the try meant that a Chrome which
// is installed but refuses to start threw from the finally block instead ("Cannot access
// 'browser' before initialization"), hiding the real reason and leaving the two servers
// listening.
let browser = null

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

// Derived from the markup, so it can silently resolve to nothing if the regex stops
// matching (a quote-style edit does it). An empty list would make every field assertion
// below pass vacuously, so refuse to run rather than report a green that means nothing.
if (expectedFields.length < 5) {
  console.error(`[precondition] read only ${expectedFields.length} field name(s) from ${join(dist, 'index.html')}: ${JSON.stringify(expectedFields)}`)
  server.close()
  sink.close()
  process.exit(2)
}

// One native submit to the real endpoint with JavaScript off, so we can see where a
// JavaScript-off visitor is actually taken. `fields` decides how much gets typed.
async function liveSubmit(label, fields) {
  const page = await browser.newPage()
  await page.setJavaScriptEnabled(false)
  const traffic = []
  page.on('response', (r) => {
    const u = r.url()
    if (u.startsWith('https://formspree.io/')) traffic.push(`${r.status()} ${u}`)
  })
  await page.goto(LIVE_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const hasForm = (await page.$('#callback')) !== null
  if (!hasForm) {
    record(`${label}: form present on deployed page`, false, 'no #callback on the live page')
    await page.close()
    return null
  }
  if (fields.name) await page.type('#name', 'No-JS Live Check')
  if (fields.contact) await page.type('#contact', 'nojs-live@example.com')
  if (fields.interest) await page.select('#interest', 'Pasta From Scratch')
  if (fields.notes) await page.type('#notes', 'Deployed-site native submit, JavaScript disabled. Safe to delete.')
  const method = await page.$eval('#callback', (f) => f.getAttribute('method'))
  record(`${label}: deployed form method is POST`, (method ?? '').toUpperCase() === 'POST', `method=${method}`)
  // index.html carries novalidate, so the browser's own required-field check will NOT
  // stop a partial submission. Measured here rather than assumed.
  const nativeWouldBlock = await page.$eval('#callback', (f) => !f.checkValidity())
  const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).then(() => true).catch(() => false)
  await page.click('button[type="submit"]')
  await nav
  await sleep(1500)
  const landed = page.url()
  const body = await page.evaluate(() => (document.body?.innerText ?? '').slice(0, 400)).catch(() => '')
  console.log(`      ${label}: ${traffic.join(' | ') || '(no formspree request seen)'}`)
  console.log(`      ${label}: landed on ${landed}`)
  record(`${label}: submission left the browser for formspree`, traffic.length > 0, traffic.join(' | ') || 'no request observed')
  record(
    `${label}: endpoint accepted it`,
    /formspree\.io\/thanks/.test(landed) || /submitted successfully/i.test(body),
    /formspree\.io\/thanks/.test(landed) ? landed : body.replace(/\s+/g, ' ').slice(0, 80),
  )
  await page.close()
  return { landed, body, traffic, nativeWouldBlock }
}

try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  // ---- LOCAL: JavaScript disabled, native submit, body recorded
  const off = await browser.newPage()
  await off.setJavaScriptEnabled(false)
  await off.goto(localUrl, { waitUntil: 'domcontentloaded' })
  // Fill and submit through native input, not page.evaluate(). Using an injected script
  // to fill a form whose whole point is that scripts are off would make the harness
  // itself the thing under test. evaluate() is used below only to *read* attributes.
  const hasForm = (await off.$('#callback')) !== null
  record('no-JS: form is present on the served page', hasForm, hasForm ? '' : 'no #callback')
  await off.type('#name', 'No-JS Check')
  await off.type('#contact', 'nojs@example.com')
  await off.select('#interest', 'Pasta From Scratch')
  await off.type('#notes', 'Native submit with JavaScript disabled.')
  const typed = await off.evaluate(() => {
    const f = document.getElementById('callback')
    return {
      method: f.getAttribute('method'),
      buttonType: f.querySelector('button[type="submit"]')?.getAttribute('type') ?? null,
      name: f.querySelector('#name').value,
    }
  })
  record('no-JS: native typing reached the field', typed.name === 'No-JS Check', `name=${JSON.stringify(typed.name)}`)
  record('no-JS: method attribute is POST', (typed.method ?? '').toUpperCase() === 'POST', `method=${typed.method}`)
  record('no-JS: submit button defaults to submit', typed.buttonType === 'submit', `type=${typed.buttonType}`)

  const attempted = off
    .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  await off.click('button[type="submit"]')
  const navigated = await attempted
  await sleep(500)

  record('no-JS: browser navigated (native submit happened)', navigated, navigated ? '' : 'no navigation')
  // Count POSTs only. The sink also receives the browser's automatic GET /favicon.ico,
  // because the form's action points at it and Chrome asks that origin for an icon.
  // An earlier comment here claimed the extra request was requestSubmit() resolving the
  // action with a GET — it is not, and requestSubmit() never GETs the action. Measured
  // by logging req.url at the sink.
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
  //
  // Two probes, because they are the experiment that separates two explanations for the
  // spam filing observed earlier: "the submission came from automation" versus "the
  // submission was incomplete". The complete one matches Submission 1 in
  // docs/form-submission.md, which was accepted — so if the complete no-JS probe is also
  // accepted, automation alone is not what the service objects to.
  const liveFull = await liveSubmit('live-full', { name: true, contact: true, interest: true, notes: true })
  const livePartial = await liveSubmit('live-partial', { name: true, contact: true, interest: false, notes: false })
  if (livePartial) {
    // Not a site defect by itself — novalidate is deliberate so form.js can own the error
    // messages. It IS a real gap for a JavaScript-off visitor, and it is recorded so the
    // person deciding whether to keep novalidate can see the cost. See change-requests.md.
    console.log(
      `      live-partial: browser's own validity check would have blocked that submit: ${livePartial.nativeWouldBlock}`,
    )
  }
} finally {
  if (browser) await browser.close()
  server.close()
  sink.close()
}

console.log('')
console.log(`${results.length - failures}/${results.length} checks passed`)
console.log('Note: whether formspree files this as inbox or spam is decided server-side and')
console.log('can only be read from the form dashboard, not from this process.')
process.exitCode = failures === 0 ? 0 : 1
