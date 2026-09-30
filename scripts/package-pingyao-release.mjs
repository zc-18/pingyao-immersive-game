import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

// 把 `npm run build` 的 Vite 产物（仓库根 dist/）复制到项目内的发布暂存目录，
// 为文本资源生成 .gz（Nginx gzip_static 直接使用），并写出 SHA256SUMS 供服务器端校验。
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(repoRoot, 'dist')
const target = path.resolve(repoRoot, process.argv[2] || `output/deploy/pingyao-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`)
const relativeTarget = path.relative(repoRoot, target)
if (!relativeTarget || relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
  throw new Error('Release staging directory must be inside this project')
}
if (relativeTarget === 'dist' || relativeTarget.startsWith(`dist${path.sep}`)) throw new Error('Release staging directory must not be inside dist/')
// Vite 产物：index.html 引用 /assets/ 下带内容哈希的入口脚本；public/static 原样拷贝为 static/。
const indexFile = path.join(source, 'index.html')
if (!fs.existsSync(indexFile)) throw new Error('dist/index.html not found: run `npm run build` first')
const indexHtml = fs.readFileSync(indexFile, 'utf8')
if (/\/src\/main\.js|@vite\/client/.test(indexHtml)) throw new Error('dist/index.html is not a production build: run `npm run build`')
const entry = indexHtml.match(/<script\b[^>]*\bsrc="\/(assets\/[^"]+\.js)"/)?.[1]
if (!entry || !fs.existsSync(path.join(source, entry))) throw new Error('dist/index.html does not reference an existing /assets/*.js entry')
for (const required of ['static/libs/three.min.js', 'static/libs/UnrealBloomPass.js']) {
  if (!fs.existsSync(path.join(source, required))) throw new Error(`dist/${required} missing: public/static was not copied`)
}
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
console.log(JSON.stringify({ target, files: records.length, entry }))
