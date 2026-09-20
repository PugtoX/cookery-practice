// Throwaway: what does the added CSS actually cost on the wire?
// GitHub Pages serves gzip/br, so the uncompressed delta is not the number that
// matters. Compare the committed stylesheet with the current one at three levels.
import { readFileSync } from 'node:fs'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'
import { execFileSync } from 'node:child_process'

const root = 'E:/AI/AI_Agent/workplace/cookery-practice'
const now = readFileSync(`${root}/assets/style.css`)
const base = execFileSync('git', ['cat-file', '-p', 'HEAD:assets/style.css'], {
  cwd: root,
  maxBuffer: 8 * 1024 * 1024,
})

const gz = (b) => gzipSync(b, { level: 9 }).length
const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
const row = (name, b) =>
  `${name.padEnd(10)} raw ${String(b.length).padStart(7)}   gzip ${String(gz(b)).padStart(6)}   brotli ${String(br(b)).padStart(6)}`

console.log(row('baseline', base))
console.log(row('current', now))
console.log('')
console.log(`delta raw    ${now.length - base.length} bytes`)
console.log(`delta gzip   ${gz(now) - gz(base)} bytes`)
console.log(`delta brotli ${br(now) - br(base)} bytes`)
