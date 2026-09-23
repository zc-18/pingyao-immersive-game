import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(repoRoot, '.cache/pingyao-h5-harness/dist/build/h5')
const target = path.resolve(repoRoot, process.argv[2] || `output/deploy/pingyao-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`)
const relativeTarget = path.relative(repoRoot, target)
if (!relativeTarget || relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
  throw new Error('Release staging directory must be inside this project')
}
if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('Run the H5 production build first')
fs.mkdirSync(target, { recursive: true })
if (fs.readdirSync(target).length) throw new Error('Release staging directory must be empty')
const records = []
function visit(from, dir) {
  for (const name of fs.readdirSync(from)) {
    const original = path.join(from, name), file = path.join(dir, name)
    if (fs.statSync(original).isDirectory()) { fs.mkdirSync(file); visit(original, file); continue }
    const data = fs.readFileSync(original)
    fs.writeFileSync(file, data)
    const relative = path.relative(target, file).replaceAll(path.sep, '/')
    records.push(`${createHash('sha256').update(data).digest('hex')}  ${relative}`)
    if (/\.(js|css|html|json|svg)$/.test(name) && data.length > 1024) {
      const packed = gzipSync(data, { level: 9 })
      fs.writeFileSync(file + '.gz', packed)
      records.push(`${createHash('sha256').update(packed).digest('hex')}  ${relative}.gz`)
    }
  }
}
visit(source, target)
if (records.length < 10 || !fs.existsSync(path.join(target, 'index.html'))) throw new Error('Incomplete release staging')
fs.writeFileSync(path.join(target, 'SHA256SUMS'), records.join('\n') + '\n')
console.log(JSON.stringify({ target, files: records.length }))
