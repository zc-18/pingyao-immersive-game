import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { installLocalStorage } from './helpers/browser-env.mjs'
import { clearGameStorage, STORAGE_KEYS, ensureStorageDefaults } from '../src/common/utils/storage.js'
import { createStepBuffer } from '../src/common/utils/step-buffer.js'

const env = installLocalStorage()
beforeEach(() => { env.reset(); ensureStorageDefaults() })
after(() => env.uninstall())
const source = fs.readFileSync(new URL('../src/pages/user/user.vue', import.meta.url), 'utf8')
const handler = source.match(/function confirmReset\(\) \{[\s\S]*?\n\}/)[0]

function fixture() {
  const buffer = createStepBuffer()
  buffer.add(8)
  const result = { modal: null, toasts: [], routes: [], buffer }
  const context = vm.createContext({ clearGameStorage, stepBuffer: buffer,
    showModal(options) { result.modal = options },
    showToast(options) { result.toasts.push(options.title) },
    reLaunch(options) { result.routes.push(options.url) }
  })
  vm.runInContext(handler + ';confirmReset()', context)
  return result
}

test('取消重置保留存档和尚未落盘的步数', () => {
  const f = fixture()
  const before = [...env.memory]
  f.modal.success({ confirm: false })
  assert.deepEqual([...env.memory], before)
  assert.equal(f.buffer.pending, 8)
  assert.deepEqual(f.routes, [])
})

test('重置成功只清本游戏键并清空步数，回到启动页', () => {
  env.seed('another-app-preferences', { keep: true })
  for (const key of Object.values(STORAGE_KEYS)) env.seed(key, { marker: key })
  const f = fixture()
  f.modal.success({ confirm: true })
  for (const key of Object.values(STORAGE_KEYS)) assert.equal(env.memory.has(key), false)
  assert.deepEqual(env.read('another-app-preferences'), { keep: true })
  assert.equal(f.buffer.pending, 0)
  assert.deepEqual(f.routes, ['/splash'])
})

test('删除失败不清步数、不跳转并显示失败提示，重试成功后才清空', () => {
  const f = fixture()
  const before = [...env.memory]
  env.state.failRemoves = true
  const warn = console.warn
  console.warn = () => {}
  try { f.modal.success({ confirm: true }) } finally { console.warn = warn }
  assert.deepEqual([...env.memory], before)
  assert.equal(f.buffer.pending, 8)
  assert.deepEqual(f.routes, [])
  assert.match(f.toasts[0], /未能清空/)
  env.state.failRemoves = false
  f.modal.success({ confirm: true })
  assert.equal(f.buffer.pending, 0)
  assert.deepEqual(f.routes, ['/splash'])
})
