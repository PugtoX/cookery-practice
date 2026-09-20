#!/usr/bin/env node
// End-to-end check of the callback form's real data flow, in a real browser,
// against a real HTTP endpoint.
//
// What this proves: the page loads as the browser will load it, the module wiring
// attaches, validation passes on good input, a genuine POST leaves the browser with
// every field the endpoint needs, the success state is shown, a failing endpoint
// produces an error rather than a fake success, and an empty form never reaches the
// network.
//
// What this does NOT prove: that a submission reaches the client's inbox. That needs a
// real Formspree id and a real mailbox, and it stays recorded as unverified until
// somebody submits once and sees the message arrive.
//
// How it intercepts without touching dist/: the built site is served verbatim, and
// request interception rewrites only the POST's destination to a local sink that
// records the body. The page under test is therefore the real artefact.
//
// Two traps already hit while writing this, both of which looked like form bugs:
//   * `page.waitForTimeout` does not exist in this puppeteer version — use sleep().
//   * injecting the module with `addScriptTag({type:'module'})` runs nothing, so the
//     form did a native POST and the test hung. Serve the real dist/ instead.
//
// Usage:
//   npm i -D --no-save puppeteer-core
//   npm run build
//   node tools/form-e2e.mjs
// Exits 0 when every case matches, 1 when one does not, 2 when preconditions are unmet.

import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const received = []
let respondWith = 200
// The form posts cross-origin, so the sink has to answer as a real endpoint would:
// Formspree returns CORS headers. Without them the browser blocks the response and the
// page correctly reports a failure — which is what happened on the first attempt here,
// and it looked like a form bug rather than a missing test-harness header.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
}
const sink = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    received.push({ method: req.method, contentType: req.headers['content-type'] ?? '', body })
    res.writeHead(respondWith, { ...CORS, 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: respondWith === 200 }))
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
// Mirror the deployed site: a GitHub Pages project site is served from a path prefix,
// and the page's relative asset paths depend on it.
//
// One deliberate edit, and only one: index.html is served with the form action aimed
// at a live-looking Formspree URL. Shipping the placeholder means the page takes its
// honest "not connected" branch and returns before any request is made, so the
// submission path could never be exercised. Everything else — the module, the CSS, the
// markup, the request interception — is the real artefact.
const PREFIX = 'https://formspree.io/f/'
const ARTIFICIAL_ENDPOINT = `${PREFIX}form-e2e-probe`
const BASE = '/cookery-practice/'
let servedAction = null

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
      const html = body.toString('utf8')
      servedAction = html.match(/<form[^>]*\saction="([^"]*)"/)?.[1] ?? null
      body = Buffer.from(html.replace(/action="[^"]*"/, `action="${ARTIFICIAL_ENDPOINT}"`))
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const pageUrl = `http://127.0.0.1:${server.address().port}${BASE}`

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${!pass && detail ? `  → ${detail}` : ''}`)
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log(`      page error: ${e.message}`))
  page.on('console', (m) => console.log(`      console.${m.type()}: ${m.text().slice(0, 200)}`))
  page.on('requestfailed', (r) =>
    console.log(`      request failed: ${r.method()} ${r.url().slice(0, 90)} ${r.failure()?.errorText ?? ''}`),
  )

  // Redirect only the form's POST to the sink. Everything else goes to the local
  // server, and the page itself is byte-for-byte the built artefact.
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('formspree.io')) {
      const headers = { ...request.headers() }
      delete headers['content-length']
      request.continue({ url: sinkUrl, headers }).catch(() => {})
    } else {
      request.continue().catch(() => {})
    }
  })

  const fillValid = async () => {
    await page.type('#name', 'Alex Example')
    await page.type('#contact', 'alex@example.com')
    await page.select('#interest', 'Pasta From Scratch')
    await page.type('#notes', 'Two of us, any Thursday.')
  }

  // ---------- green path ----------
  await page.goto(pageUrl, { waitUntil: 'networkidle0' })
  // The shipped action must be a real Formspree endpoint, not a placeholder. This
  // assertion used to check for the literal REPLACE_ME while the form was unconnected;
  // once the real id was pasted in, that assertion failed on a correct site. What
  // actually matters is that the shipped page points at a usable endpoint — the test
  // then redirects that endpoint to the sink, so it never posts to the live form.
  check(
    'the shipped page carries a real form endpoint',
    servedAction !== null && /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(servedAction),
    `shipped action = ${servedAction}`,
  )
  await fillValid()
  await page.click('button[type="submit"]')
  try {
    await page.waitForFunction(() => document.getElementById('form-status')?.dataset.state === 'ok', {
      timeout: 10000,
    })
  } catch {
    const state = await page.evaluate(() => ({
      state: document.getElementById('form-status')?.dataset.state ?? null,
      text: document.getElementById('form-status')?.textContent?.trim() ?? '',
    }))
    console.log(`      [diagnostic] status before timing out: ${JSON.stringify(state)}`)
    console.log(`      [diagnostic] sink received ${received.length} request(s)`)
    throw new Error('the form did not reach a success state')
  }

  check('a valid submission reaches the endpoint', received.length === 1, `received ${received.length}`)
  const req = received[0]
  if (req) {
    check('it is a POST', req.method === 'POST', req.method)
    check(
      'it is sent as form data, which Formspree reads',
      /multipart\/form-data|application\/x-www-form-urlencoded/.test(req.contentType),
      req.contentType,
    )
    for (const field of ['name', 'contact', 'interest', 'notes', 'website']) {
      check(`payload carries "${field}"`, req.body.includes(`name="${field}"`))
    }
    check('payload carries the typed value', req.body.includes('alex@example.com'))
  }
  const okText = await page.$eval('#form-status', (el) => el.textContent.trim())
  check('the visitor is told it succeeded', /with us|reply/i.test(okText), okText.slice(0, 60))
  check('the form is cleared afterwards', (await page.$eval('#name', (el) => el.value)) === '')

  // ---------- cooldown ----------
  await fillValid()
  await page.click('button[type="submit"]')
  await sleep(700)
  check('a second submission inside the cooldown is not sent', received.length === 1, `received ${received.length}`)

  // ---------- failing endpoint ----------
  respondWith = 500
  await page.evaluate(() => localStorage.removeItem('callback-last-sent'))
  await page.reload({ waitUntil: 'networkidle0' })
  await fillValid()
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => document.getElementById('form-status')?.dataset.state === 'error', {
    timeout: 10000,
  })
  const errText = await page.$eval('#form-status', (el) => el.textContent.trim())
  check('a failing endpoint shows an error, not a fake success', /did not send/i.test(errText), errText.slice(0, 70))
  check('the form is not cleared when it failed', (await page.$eval('#name', (el) => el.value)) !== '')

  // ---------- validation ----------
  respondWith = 200
  await page.evaluate(() => localStorage.removeItem('callback-last-sent'))
  await page.reload({ waitUntil: 'networkidle0' })
  const before = received.length
  await page.click('button[type="submit"]')
  await sleep(600)
  check('an empty form never reaches the network', received.length === before, `+${received.length - before}`)
  const fieldError = await page.$eval('#name-error', (el) => (el.hidden ? '' : el.textContent.trim()))
  check('the empty name is pointed at', fieldError.length > 0, fieldError)
  const invalid = await page.$$eval('[aria-invalid="true"]', (els) => els.map((e) => e.id))
  check('invalid fields are marked for assistive tech', invalid.includes('name'), invalid.join(','))
} finally {
  await browser.close()
  server.close()
  sink.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
process.exitCode = failed.length ? 1 : 0
