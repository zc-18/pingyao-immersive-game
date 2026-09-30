import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { STORAGE_KEYS as K, ensureStorageDefaults, getUserProgress, patchStorageObject, localDateString } from '../src/common/utils/storage.js'
import { recordSteps, getActiveQuests } from '../src/common/utils/quest-manager.js'
import { createStepBuffer } from '../src/common/utils/step-buffer.js'
import { installLocalStorage, decodeStoredValue } from './helpers/browser-env.mjs'
import { questMap } from '../src/common/data/quests.js'

const source = fs.readFileSync(new URL('../src/pages_game/street/street.vue', import.meta.url), 'utf8')
const env = installLocalStorage(), memory = env.memory, writes = env.state.writes, attempts = []
const RealDate = Date
let now, reject = () => false
globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
const originalSetItem = env.storage.setItem
 env.storage.setItem = (key, raw) => {
  const value = decodeStoredValue(raw)
  attempts.push({ key, value: structuredClone(value) })
  if (reject(key, value)) throw new Error('injected step write failure')
  originalSetItem(key, raw)
}
beforeEach(() => {
  now = new RealDate(2026, 8, 10, 23, 59, 59, 700).valueOf()
  memory.clear(); reject = () => false
  ensureStorageDefaults(); patchStorageObject(K.userProfile, { roleId: 'study' })
  writes.length = 0; attempts.length = 0
})
after(() => { globalThis.Date = RealDate; env.uninstall() })
const dailySteps = () => getUserProgress().questData.questProgress['daily-walk']?.objectives.find(o => o.target === 'steps')?.current ?? 0

function pageFixture(buffer = createStepBuffer()) {
  let id = 0
  const timers = new Map(), toasts = []
  const context = vm.createContext({
    Date, Number, Math, stepBuffer: buffer, STORAGE_KEYS: K,
    userProgress: { value: { steps: 0 } }, playerWorldPos: { value: { x: 0, z: 0 } }, playerHeading: { value: 0 },
    getStorage: () => getUserProgress(), refreshRuntimeState() {}, refreshProgressFeedback() {}, showToast(t) { toasts.push(t) },
    setTimeout(fn, ms) { const key = ++id; timers.set(key, { at: now + ms, fn }); return key },
    clearTimeout(key) { timers.delete(key) }
  })
  vm.runInContext(`let renderCommandDisposed=false;
    ${source.slice(source.indexOf('// 步数批量写入'), source.indexOf('function playEntranceAnimation'))}
    this.api={handlePlayerMove,flushSteps,
      hide(){stepSavingSuspended=true;flushSteps(true)},
      show(){stepSavingSuspended=false;flushSteps(true)},
      dispose(){renderCommandDisposed=true;stepSavingSuspended=true;flushSteps(true)}};`, context)
  const advance = ms => {
    const end = now + ms
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0]
      if (!next) break
      now = next[1].at; timers.delete(next[0]); next[1].fn()
    }
    now = end
  }
  return { ...context.api, context, buffer, timers, toasts, advance }
}

test('first movement, daily activation and total steps commit once; invalid movement writes nothing', () => {
  for (const delta of [Infinity, NaN, -1, undefined, 0]) assert.equal(recordSteps(delta).accepted, 0)
  assert.equal(writes.length, 0)
  const result = recordSteps(7)
  assert.equal(result.ok, true)
  assert.equal(result.accepted, 7)
  assert.equal(getUserProgress().steps, 7)
  assert.equal(dailySteps(), 7)
  assert.deepEqual(writes, [K.userProgress])
})

test('failure at the reward boundary cannot save steps without daily progress or reward', () => {
  recordSteps(999)
  const before = getUserProgress()
  writes.length = 0
  reject = (key, value) => key === K.userProgress && value.questData.completedQuests.includes('daily-walk')
  const failed = recordSteps(1)
  assert.equal(failed.ok, false)
  assert.equal(failed.accepted, 0)
  assert.equal(failed.completed.length, 0)
  assert.deepEqual(getUserProgress(), before)
  assert.deepEqual(writes, [])
  reject = () => false
  const retry = recordSteps(1)
  assert.equal(retry.completed.length, 1)
  assert.equal(getUserProgress().steps, 1000)
  assert.equal(dailySteps(), 1000)
  assert.equal(getUserProgress().silver, before.silver + questMap['daily-walk'].rewards.silver)
  assert.deepEqual(writes, [K.userProgress])
  const silver = getUserProgress().silver
  assert.equal(recordSteps(9).completed.length, 0)
  assert.equal(getUserProgress().steps, 1009)
  assert.equal(getUserProgress().silver, silver)
})

test('a stopped player flushes a small remainder without another movement event', () => {
  now -= 60000
  const f = pageFixture()
  f.handlePlayerMove({ steps: 1, x: 0, z: -1 })
  f.advance(100); f.handlePlayerMove({ steps: 1, x: 0, z: -2 })
  assert.equal(getUserProgress().steps, 1)
  assert.equal(f.buffer.pending, 1)
  f.advance(700)
  assert.equal(getUserProgress().steps, 2)
  assert.equal(dailySteps(), 2)
  assert.equal(f.buffer.pending, 0)
  assert.equal(f.timers.size, 0)
})

test('quota failures retain all movement, back off, and recover once against the latest save', () => {
  now -= 60000
  const f = pageFixture()
  patchStorageObject(K.userProgress, { steps: 40, silver: 500 })
  reject = () => true
  f.handlePlayerMove({ steps: 2, x: 0, z: -1 })
  const firstAttempts = attempts.length
  for (let i = 0; i < 10; i++) { f.advance(140); f.handlePlayerMove({ steps: 1, x: 0, z: -2 }) }
  assert.equal(attempts.length, firstAttempts, 'movement must not hammer synchronous storage')
  assert.equal(f.toasts.length, 1)
  assert.equal(f.buffer.pending, 12)
  assert.equal(getUserProgress().steps, 40)
  reject = () => false
  patchStorageObject(K.userProgress, { steps: 45, silver: 480, journalNotes: { rishengchang: '保留札记' } })
  f.advance(1600)
  assert.equal(getUserProgress().steps, 57, 'stale page snapshot must not overwrite committed progress')
  assert.equal(dailySteps(), 12)
  assert.equal(getUserProgress().silver, 480)
  assert.equal(getUserProgress().journalNotes.rishengchang, '保留札记')
  assert.equal(f.buffer.pending, 0)
  f.flushSteps(true); f.advance(10000)
  assert.equal(getUserProgress().steps, 57)
  assert.equal(f.timers.size, 0)
})

test('unmount clears retries without discarding failed steps; another street instance restores them', () => {
  const f = pageFixture()
  reject = () => true
  f.handlePlayerMove({ steps: 4 })
  f.hide(); f.dispose()
  assert.equal(f.timers.size, 0)
  assert.equal(f.buffer.pending, 4)
  reject = () => false
  const next = pageFixture(f.buffer)
  next.show(); next.show()
  assert.equal(getUserProgress().steps, 4)
  assert.equal(dailySteps(), 4)
  assert.equal(next.buffer.pending, 0)
})

test('cross-midnight batches settle the retained previous day before starting the new daily quest', () => {
  recordSteps(999)
  const before = getUserProgress().silver
  const buffer = createStepBuffer()
  buffer.add(1)
  now += 500
  buffer.add(3)
  const result = buffer.flush()
  assert.equal(result.completed.length, 1)
  assert.equal(getUserProgress().silver, before + questMap['daily-walk'].rewards.silver)
  assert.equal(getUserProgress().steps, 1003)
  assert.equal(dailySteps(), 3)
  assert.equal(getUserProgress().questData.dailyReset, localDateString())
  assert.equal(getUserProgress().questData.completedQuests.includes('daily-walk'), false)
})

test('old pending steps cannot replay a new daily quest after another page has reset the day', () => {
  recordSteps(8)
  const buffer = createStepBuffer()
  buffer.add(5)
  now += 500
  getActiveQuests()
  buffer.add(2)
  assert.equal(buffer.flush().ok, true)
  assert.equal(getUserProgress().steps, 15)
  assert.equal(dailySteps(), 2)
})

test('partial multi-day flush retries only the uncommitted batch', () => {
  const buffer = createStepBuffer()
  buffer.add(5); now += 500; buffer.add(2)
  reject = (key, value) => key === K.userProgress && value.steps === 7
  const partial = buffer.flush()
  assert.equal(partial.ok, false)
  assert.equal(partial.accepted, 5)
  assert.equal(getUserProgress().steps, 5)
  assert.equal(buffer.pending, 2)
  reject = () => false
  assert.equal(buffer.flush().accepted, 2)
  assert.equal(getUserProgress().steps, 7)
  assert.equal(dailySteps(), 2)
})

test('malformed bridge values cannot poison position, create fake steps or leave a retry timer', () => {
  const f = pageFixture()
  for (const detail of [undefined, {}, { steps: Infinity, x: Infinity, z: 1 }, { steps: NaN, x: 1, z: NaN }, { steps: -4 }, { steps: 0 }]) f.handlePlayerMove(detail)
  assert.equal(getUserProgress().steps, 0)
  assert.equal(f.buffer.pending, 0)
  assert.equal(f.timers.size, 0)
  assert.equal(f.context.playerWorldPos.value.x, 0)
  assert.equal(f.context.playerWorldPos.value.z, 0)
  assert.deepEqual(writes, [])
})

test('a late render flush after page hide is saved immediately without keeping a timer alive', () => {
  const f = pageFixture()
  f.handlePlayerMove({ steps: 1 })
  f.hide()
  f.handlePlayerMove({ steps: 1, flush: true })
  assert.equal(getUserProgress().steps, 2)
  assert.equal(f.buffer.pending, 0)
  assert.equal(f.timers.size, 0)
})

test('render pause and scene disposal deliver whole steps before clearing the old player, only once', () => {
  const sent = []
  const render = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  const context = vm.createContext({ console, cancelAnimationFrame() {}, window: {},
    callback(message) { sent.push(message.detail) } })
  vm.runInContext(render.replace('export default', 'const component =') + ';this.api=component.methods;', context)
  vm.runInContext('messageCallback=callback;player={position:{x:1,z:2},traverse(){}};moveStepAccum=1;', context)
  context.api.pauseRendering()
  context.api.pauseRendering()
  assert.equal(sent.length, 1)
  assert.equal(sent[0].data.steps, 1)
  assert.equal(sent[0].data.flush, true)
  vm.runInContext('moveStepAccum=2;', context)
  context.api.clearScene()
  context.api.clearScene()
  assert.equal(sent.length, 2)
  assert.equal(sent[1].data.steps, 2)
})
