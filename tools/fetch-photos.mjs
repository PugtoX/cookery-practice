// Download the six candidate photographs at production width and verify them properly:
// real pixel dimensions, real file size, real format by magic bytes — not by extension.
//
// The originals are 13-15 MB, far too heavy for a web page. Wikimedia serves scaled
// thumbnails from /thumb/<path>/<width>px-<name>, so that is what this fetches.
import { writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'E:/AI/AI_Agent/workplace/cookery-practice/docs/redesign/img'
mkdirSync(OUT, { recursive: true })

// Wikimedia asks for a descriptive UA; a bare default gets rate-limited.
const UA = 'cookery-practice-redesign/0.1 (https://github.com/PugtoX/cookery-practice)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Slot -> [Commons path, requested width, credit]
const IMAGES = [
  {
    slot: 'hero',
    file: 'Kitchen_setup_showcasing_grilling_equipment_and_cooking_tools_at_a_busy_restaurant_undefined.jpg',
    width: 2400,
    credit: 'Shixart1985 / Wikimedia Commons, CC BY 2.0',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    slot: 'knife-skills',
    file: 'Chef_prepares_fresh_ingredients_by_chopping_red_vegetables.jpg',
    width: 1200,
    credit: 'Shixart1985 / Wikimedia Commons, CC BY 2.0',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    slot: 'bread-baking',
    file: 'Nine-Grain_Sourdough_Bread_-_HMM_-_Explored_22_Aug_2017_-_Flickr_-_Thad_Zajdowicz.jpg',
    width: 1200,
    credit: 'Thad Zajdowicz / Wikimedia Commons, CC BY 2.0',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    slot: 'pasta-from-scratch',
    file: 'Making_of_Tagliatelle%2CToskanischer_Markt_RT_05.jpg',
    width: 1200,
    credit: 'Vux / Wikimedia Commons, CC BY-SA 4.0',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    slot: 'market-table',
    file: 'Produce_at_the_Queen_Victoria_Market_03.jpg',
    width: 1200,
    credit: 'Aliceinthealice / Wikimedia Commons, CC0 1.0',
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    slot: 'about',
    file: 'Cooking_Class_at_Mozaic_%288056044088%29.jpg',
    width: 1600,
    credit: 'Sally May Mills / Ubud Writers & Readers Festival, CC BY 2.0',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
]

// Ask the Wikimedia API for the thumbnail URL rather than composing it.
//
// Composing it produced HTTP 400 for all six: the MD5 path was correct (verified against
// the direct file path), but upload.wikimedia.org/thumb/ rejected the request at these
// widths and the API actually points at thumb.wikimedia.org. The lesson is the same one
// this project keeps relearning: read the value the platform gives you instead of
// reimplementing its rules.
async function apiThumb(file, width) {
  const name = decodeURIComponent(file).replace(/^.*\//, '')
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    `&iiprop=url|size|extmetadata&iiurlwidth=${width}&titles=${encodeURIComponent('File:' + name)}`
  const res = await fetch(api, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`api HTTP ${res.status}`)
  const json = await res.json()
  const page = Object.values(json.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  if (!info) throw new Error('no imageinfo')
  const meta = info.extmetadata ?? {}
  return {
    name,
    thumbUrl: info.thumburl,
    thumbSize: [info.thumbwidth, info.thumbheight],
    originalSize: [info.width, info.height],
    licence: meta.LicenseShortName?.value ?? null,
    attributionRequired: meta.AttributionRequired?.value ?? null,
    artist: (meta.Artist?.value ?? '').replace(/<[^>]*>/g, '').trim() || null,
  }
}

const results = []
for (const img of IMAGES) {
  try {
    const info = await apiThumb(img.file, img.width)
    await sleep(700)
    const res = await fetch(info.thumbUrl, { headers: { 'user-agent': UA } })
    if (!res.ok) {
      results.push({ slot: img.slot, status: `HTTP ${res.status}`, bytes: 0, magic: '-', note: info.thumbUrl })
      await sleep(700)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const out = join(OUT, `${img.slot}.jpg`)
    writeFileSync(out, buf)
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    const isPng = buf[0] === 0x89 && buf[1] === 0x50
    results.push({
      slot: img.slot,
      status: 'ok',
      bytes: buf.length,
      magic: isJpeg ? 'jpeg' : isPng ? 'png' : 'UNKNOWN',
      thumb: info.thumbSize.join('x'),
      original: info.originalSize.join('x'),
      licence: info.licence,
      attribution: info.attributionRequired,
      artist: info.artist,
    })
  } catch (e) {
    results.push({ slot: img.slot, status: `ERR ${String(e.message).slice(0, 50)}`, bytes: 0, magic: '-' })
  }
  await sleep(700)
}

const fs = await import('node:fs')
console.log('slot'.padEnd(20), 'status'.padEnd(10), 'bytes'.padStart(10), 'magic')
for (const r of results) {
  console.log(r.slot.padEnd(20), r.status.padEnd(10), String(r.bytes).padStart(10), r.magic)
}
console.log('')
console.log('files on disk:')
for (const f of fs.readdirSync(OUT)) {
  const p = join(OUT, f)
  console.log(' ', f.padEnd(28), statSync(p).size.toLocaleString(), 'bytes')
}
console.log('')
console.log('CREDITS (write into the site):')
for (const img of IMAGES) {
  console.log(` ${img.slot.padEnd(20)} ${img.credit}  —  ${img.licenceUrl}`)
}
