import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { getCheckInPreview } from '../src/common/utils/check-in.js'
import { localDateString } from '../src/common/utils/storage.js'

const source = fs.readFileSync(new URL('../src/components/DailyCheckIn.vue', import.meta.url), 'utf8')
  .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
function fixture(initial) {
  let progress = initial
  let today = localDateString()
  let tick
  let exposed
  const events = []
  const context = vm.createContext({
    ref: (value) => ({ value }), computed: (fn) => ({ get value() { return fn() } }),
    onMounted: (fn) => fn(), onActivated() {}, onDeactivated() {}, onBeforeUnmount() {},
    setInterval: (fn) => { tick = fn; return 1 }, clearInterval() {},
    localDateString: () => today,
    getCheckInPreview: () => getCheckInPreview(progress),
    claimDailyCheckIn: () => ({ ok: true, reward: { silverKey: 8, silver: 30, exp: 20 } }),
    syncAchievementUnlocks: () => ({ newlyUnlocked: [{ name: '古城七日章' }] }),
    showToast: (value) => events.push(['toast', value.title]),
    defineEmits: () => (...args) => events.push(args),
    defineExpose: (value) => { exposed = value }
  })
  vm.runInContext(source + ';this.api={ isFilled, handleClaim, hintText };', context)
  return { api: context.api, events, refresh: () => exposed.refresh(), nextDay() { today = '2099-01-01'; tick() } }
}
function dateAgo(days) { const date = new Date(); date.setDate(date.getDate() - days); return localDateString(date) }

test('断签后从第一格重新开始，昨天连签才保留已盖格', () => {
  const broken = fixture({ checkIn: { lastDate: dateAgo(2), streak: 4 } })
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => broken.api.isFilled(i)), Array(7).fill(false))
  const continuing = fixture({ checkIn: { lastDate: dateAgo(1), streak: 4 } })
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => continuing.api.isFilled(i)), [true, true, true, true, false, false, false])
})

test('今日已签展示明天的奖励，刷新与跨日清除上次领取提示', () => {
  const checked = fixture({ checkIn: { lastDate: dateAgo(0), streak: 1 } })
  assert.match(checked.api.hintText.value, /\+10 银钥/)
  const f = fixture({})
  f.api.handleClaim()
  assert.match(f.api.hintText.value, /已记入/)
  assert.equal(f.events.at(-1)[0], 'claimed', '成就事件在普通奖励提示后，避免被覆盖')
  f.refresh()
  assert.doesNotMatch(f.api.hintText.value, /已记入/)
  f.api.handleClaim()
  f.nextDay()
  assert.doesNotMatch(f.api.hintText.value, /已记入/)
})
