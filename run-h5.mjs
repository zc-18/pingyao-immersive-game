// 本地 H5 预览启动器（不改动 HBuilderX 源码；源码目录仍是唯一真相来源）。
//
// 为什么这么绕：
//  1) @dcloudio/vite-plugin-uni 在非 HBuilderX 环境会把 vite root 钉死成 process.cwd()，
//     而真正的 uni 源码在 src/平遥古城沉浸式游戏 下 —— 必须把 VITE_ROOT_DIR / UNI_INPUT_DIR 指过去。
//  2) 仓库绝对路径含中文（平遥游戏 / 平遥古城沉浸式游戏）。Vite 7 的 import-analysis 在中文绝对路径下
//     解析无扩展名导入（如 `import App from './App'` → App.vue）会失败。junction 也救不了——会被 realpath 回中文。
//     唯一可靠解法：把【代码文件】真正拷到 ASCII 临时目录，让 vite 看到的全是纯 ASCII 真实路径。
//
// 方案：ASCII 工作目录 <tmp>/pingyao-h5-harness/app
//   - 代码（.vue/.js/.json/.scss/pages.json/manifest.json…）实体拷贝过去；
//   - static/（图片/Three.js 库，按原样静态服务，不参与模块解析）用 junction 指回源码，省去 76MB 拷贝；
//   - node_modules 用 junction 指回仓库依赖；
//   - 文件监听：源码改动实时镜像到 app/，保留 HMR。
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(repoRoot, 'src', '平遥古城沉浸式游戏')
const repoNodeModules = path.join(repoRoot, 'node_modules')

const mode = process.argv[2] === 'build' ? 'build' : 'serve'

const workDir = path.join(os.tmpdir(), 'pingyao-h5-harness')
const appDir = path.join(workDir, 'app')

const SKIP_TOP = new Set(['static', 'node_modules', 'unpackage', '.hbuilderx'])

function isSkipped(absSrc) {
  const rel = path.relative(srcDir, absSrc)
  if (!rel || rel.startsWith('..')) return false
  const top = rel.split(path.sep)[0]
  return SKIP_TOP.has(top)
}

function resetCode() {
  // 仅清理真实代码文件/目录；绝不碰 static / node_modules（它们是指向真实数据的 junction，
  // 递归删除会顺着 junction 把仓库 node_modules / 源码 static 一起删掉）。
  if (!fs.existsSync(appDir)) return
  for (const name of fs.readdirSync(appDir)) {
    if (name === 'static' || name === 'node_modules') continue
    try { fs.rmSync(path.join(appDir, name), { recursive: true, force: true }) } catch (_) {}
  }
}

function syncAll() {
  resetCode() // 先清旧拷贝，规避 Windows 下 fs.cpSync 覆盖既有文件时偶发的 ESRCH
  fs.mkdirSync(appDir, { recursive: true })
  fs.cpSync(srcDir, appDir, {
    recursive: true,
    force: true,
    filter: (src) => !isSkipped(src)
  })
}

function ensureJunction(linkPath, target) {
  try {
    fs.lstatSync(linkPath)
    let ok = false
    try { ok = path.resolve(fs.realpathSync(linkPath)) === path.resolve(fs.realpathSync(target)) } catch (_) { ok = false }
    if (ok) return
    fs.rmSync(linkPath, { recursive: true, force: true })
  } catch (_) { /* not present */ }
  fs.symlinkSync(target, linkPath, 'junction')
}

// 1) 实体拷贝代码
syncAll()
// 2) static 与 node_modules 用 junction（静态资源/依赖不参与模块解析，中文 realpath 无碍）
ensureJunction(path.join(appDir, 'static'), path.join(srcDir, 'static'))
ensureJunction(path.join(appDir, 'node_modules'), repoNodeModules)

// 3) 写入 vite.config（uni 会从 UNI_INPUT_DIR 读取它）。
// 关键：CLI 模式下 `uni` 命令本身不会注入插件——必须由 vite.config 调用 uni() 插件，它才会装上整条
// uni 处理链（.vue SFC 编译、pages.json 虚拟模块、easycom、resolve.extensions 含 .vue、vue→uni-h5-vue 重定向等）。
// 之前缺这一句，vite 把 .vue 当普通 JS、解析不到 App.vue / 依赖优化报 vue 缺导出，全是同一根因。
// 这就是官方 uni-preset 的标准 vite.config。写在 ASCII 临时 app/ 内，源码零污染。
fs.writeFileSync(
  path.join(appDir, 'vite.config.js'),
  `import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
export default defineConfig({
  // 专用端口（避开常见的 5173/5174，免得和机器上其他 vite 工程抢端口）；
  // strictPort:true → 端口被占就直接报错，不静默漂移，省得分不清在跑哪个工程。
  server: { host: 'localhost', port: 5219, strictPort: true },
  plugins: [uni()]
})
`,
  'utf8'
)

// uni 的 resolvePluginsByCliRoot 会 require(<UNI_INPUT_DIR>/package.json) 来发现各平台插件，
// 而 HBuilderX 源码目录本身没有 package.json。这里把脚手架依赖镜像一份到 app/，让 uni 能装上 H5 插件。
const harnessPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({
    name: 'pingyao-app-h5',
    private: true,
    dependencies: harnessPkg.dependencies || {},
    devDependencies: harnessPkg.devDependencies || {}
  }, null, 2),
  'utf8'
)

// 3) 源码改动 → 实时镜像到 app/（保 HMR）。static/node_modules 不镜像（junction 已实时）。
if (mode === 'serve') {
  try {
    fs.watch(srcDir, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const rel = String(filename)
      const top = rel.split(path.sep)[0]
      if (SKIP_TOP.has(top)) return
      const from = path.join(srcDir, rel)
      const to = path.join(appDir, rel)
      try {
        if (fs.existsSync(from)) {
          fs.mkdirSync(path.dirname(to), { recursive: true })
          fs.copyFileSync(from, to)
        } else {
          fs.rmSync(to, { force: true })
        }
      } catch (_) { /* 镜像失败不致命 */ }
    })
  } catch (_) { /* 某些平台不支持 recursive watch，忽略 */ }
}

const env = {
  ...process.env,
  VITE_ROOT_DIR: appDir,
  UNI_INPUT_DIR: appDir,
  UNI_OUTPUT_DIR: path.join(workDir, 'dist', mode === 'build' ? 'build' : 'dev', 'h5'),
  UNI_PLATFORM: 'h5'
}

const isWin = process.platform === 'win32'
const bin = path.join(appDir, 'node_modules', '.bin', isWin ? 'uni.cmd' : 'uni')
const args = mode === 'build' ? ['build', '-p', 'h5'] : ['-p', 'h5']

console.log(`[run-h5] app(ASCII) = ${appDir}`)
console.log(`[run-h5] mirrors    ← ${srcDir}`)

const child = spawn(bin, args, { cwd: appDir, env, stdio: 'inherit', shell: isWin })
child.on('exit', (code) => process.exit(code ?? 0))
