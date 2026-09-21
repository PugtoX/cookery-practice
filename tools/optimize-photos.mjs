// Produce the delivery variants for the six photographs and report the real byte cost.
//
// ffmpeg is used because it is the only encoder on this machine (no sharp, no ImageMagick,
// no cwebp). Verified available: libwebp, libaom-av1.
//
// The demo loads the .jpg files, so those stay untouched. The .webp and .avif files are
// what a production build would ship via <picture>, and the numbers below are what the
// first screen would actually cost.
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const FF =
  'C:/Users/hugoy/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe'
const DIR = 'E:/AI/AI_Agent/workplace/cookery-practice/docs/redesign/img'

// Width per slot, matching how wide the image is actually displayed.
// hero is full-bleed, so it gets a 2x variant as well.
const PLAN = [
  { slot: 'hero', widths: [1600, 2560] },
  { slot: 'knife-skills', widths: [800] },
  { slot: 'bread-baking', widths: [800] },
  { slot: 'pasta-from-scratch', widths: [800] },
  { slot: 'market-table', widths: [800] },
  { slot: 'about', widths: [1200] },
]

const run = (args) => execFileSync(FF, args, { stdio: ['ignore', 'ignore', 'pipe'] })
const kb = (n) => (n / 1024).toFixed(1) + ' KiB'

const rows = []
for (const { slot, widths } of PLAN) {
  const src = join(DIR, `${slot}.jpg`)
  if (!existsSync(src)) {
    rows.push({ slot, width: '-', jpg: 'MISSING', webp: '-', avif: '-', best: '-' })
    continue
  }
  for (const w of widths) {
    const base = w === 1600 || widths.length === 1 ? slot : `${slot}-${w}`
    const outWebp = join(DIR, `${base}.webp`)
    const outAvif = join(DIR, `${base}.avif`)
    const scale = `scale=${w}:-2`
    try {
      run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', scale, '-c:v', 'libwebp', '-quality', '80', outWebp])
    } catch { /* leave the file absent; reported below */ }
    try {
      run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', scale, '-c:v', 'libaom-av1', '-crf', '32', '-b:v', '0', '-still-picture', '1', outAvif])
    } catch { /* ditto */ }
    const size = (p) => (existsSync(p) ? statSync(p).size : null)
    const w1 = size(outWebp)
    const a1 = size(outAvif)
    rows.push({
      slot: base,
      width: w + 'px',
      jpg: kb(statSync(src).size),
      webp: w1 ? kb(w1) : 'FAIL',
      avif: a1 ? kb(a1) : 'FAIL',
      best: a1 && w1 ? (a1 < w1 ? 'avif' : 'webp') : '-',
    })
  }
}
console.table(rows)

console.log('')
console.log('Files now in docs/redesign/img:')
let totalJpg = 0
let totalWebp = 0
let totalAvif = 0
for (const f of readdirSync(DIR).sort()) {
  const s = statSync(join(DIR, f)).size
  if (f.endsWith('.jpg')) totalJpg += s
  if (f.endsWith('.webp')) totalWebp += s
  if (f.endsWith('.avif')) totalAvif += s
  console.log(`  ${f.padEnd(30)} ${s.toLocaleString().padStart(12)} bytes`)
}
console.log('')
console.log(`all jpg  : ${kb(totalJpg)}`)
console.log(`all webp : ${kb(totalWebp)}`)
console.log(`all avif : ${kb(totalAvif)}`)
