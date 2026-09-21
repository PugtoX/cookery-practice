// Replace hero, bread and pasta with the Burst selections, and regenerate every variant.
//
// Burst by Shopify, licence read by the sourcing agent at
// https://www.shopify.com/stock-photos/licenses/shopify-some-rights-reserved :
// commercial use, modification and cropping permitted, attribution NOT required, the only
// bar being that the file is not resold as a stock photo. Each photo page carries its own
// "License:" link and Burst mixes licences per photo, so the link on each page below was
// checked individually.
import { execFileSync } from 'node:child_process'
import { writeFileSync, statSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const FF =
  'C:/Users/hugoy/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe'
const DIR = 'E:/AI/AI_Agent/workplace/cookery-practice/docs/redesign/img'
const UA = 'cookery-practice-redesign/0.1'

// slot -> Burst slug, plus the widths to emit. Cropping is done here rather than with the
// CDN's crop parameter so the card aspect ratio is exact and reproducible.
const BURST = [
  { slot: 'hero', slug: 'rustic-cooking-flatlay-in-kitchen', widths: [1600, 2560], ratio: null },
  { slot: 'bread-baking', slug: 'bread-loaf-on-a-wooden-cutting-board', widths: [800], ratio: '3:2' },
  { slot: 'pasta-from-scratch', slug: 'pizza-dough-ready-to-roll', widths: [800], ratio: '3:2' },
]

const run = (args) => execFileSync(FF, args, { stdio: ['ignore', 'ignore', 'pipe'] })

for (const { slot, slug, widths, ratio } of BURST) {
  const url = `https://burst.shopifycdn.com/photos/${slug}.jpg`
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) {
    console.log(`${slot}: HTTP ${res.status} — left unchanged`)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const src = join(DIR, `${slot}.src.jpg`)
  writeFileSync(src, buf)
  console.log(`${slot}: downloaded ${buf.length.toLocaleString()} bytes`)

  for (const w of widths) {
    const base = widths.length > 1 && w !== widths[0] ? `${slot}-${w}` : slot
    // Crop to 3:2 from the FULL width and a derived height. This is portrait-safe: the
    // bread source is 3840x5760, and cropping by height instead (ih*3/2 : ih) asked for a
    // 8640px width that does not exist, which ffmpeg rejected outright.
    const vf = ratio === '3:2' ? `crop=iw:iw*2/3,scale=${w}:-2` : `scale=${w}:-2`
    run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', vf, '-q:v', '3', join(DIR, `${base}.jpg`)])
    run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', vf, '-c:v', 'libwebp', '-quality', '80', join(DIR, `${base}.webp`)])
    run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', vf, '-c:v', 'libaom-av1', '-crf', '32', '-b:v', '0', '-still-picture', '1', join(DIR, `${base}.avif`)])
  }
  renameSync(src, join(DIR, `${slot}.burst-source.jpg`))
}

console.log('')
console.log('files and sizes:')
const { readdirSync } = await import('node:fs')
let first = 0
for (const f of readdirSync(DIR).sort()) {
  const s = statSync(join(DIR, f)).size
  if (f.endsWith('.avif') && !f.includes('-2560')) first += s
  console.log(`  ${f.padEnd(32)} ${s.toLocaleString().padStart(12)}`)
}
console.log('')
console.log(`AVIF used on the first screen (hero 1600): ${(statSync(join(DIR, 'hero.avif')).size / 1024).toFixed(1)} KiB`)
