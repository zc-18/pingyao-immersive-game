import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { STORAGE_KEYS as K, ensureStorageDefaults, getUserProgress, patchStorageObject, resetPrototypeStorage, localDateString } from '../src/common/utils/storage.js'
import * as quest from '../src/common/utils/quest-manager.js'
import { questList } from '../src/common/data/quests.js'
import { claimDailyCheckIn, getCheckInPreview } from '../src/common/utils/check-in.js'
import { redeemShopItem, getRedeemOrders, updateRedeemOrderStatus, getOrderStatus } from '../src/common/data/shop-items.js'
import { COSTUMES, purchaseCostume, equipCostume, getEquippedCostumeId } from '../src/common/data/costumes.js'
import { syncAchievementUnlocks, evaluateAchievements } from '../src/common/utils/achievements.js'
import { toggleFavoritePoi, setJournalNote, getJournalEntries } from '../src/common/utils/journal.js'
import { setCurrentStreetScene, markStreetSceneVisited, markPrologueComplete, getRuntimeState } from '../src/common/utils/game-state.js'

import { installLocalStorage } from './helpers/browser-env.mjs'
const env = installLocalStorage()
const { state, seed } = env
const RealDate = Date
let now = new RealDate(2026, 8, 10, 23, 59).valueOf()
globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
beforeEach(() => { env.reset(); now = new RealDate(2026, 8, 10, 23, 59).valueOf(); ensureStorageDefaults(); patchStorageObject(K.userProfile, { roleId: 'study' }); state.writes = [] })
after(() => { globalThis.Date = RealDate; env.uninstall() })

test('selecting an unrendered scene cannot unlock a visit achievement', () => {
  markPrologueComplete('bank-house')
  for (const id of ['bank-house','south-avenue','market-crossing']) setCurrentStreetScene(id)
  assert.deepEqual(getUserProgress().visitedSceneIds, [])
  assert.equal(getRuntimeState().hasEnteredStreet, false)
  assert.equal(syncAchievementUnlocks().newlyUnlocked.length, 0)
  markStreetSceneVisited('bank-house')
  markStreetSceneVisited('bank-house')
  markStreetSceneVisited('unknown-scene')
  assert.deepEqual(getUserProgress().visitedSceneIds, ['bank-house'])
  assert.equal(getRuntimeState().hasEnteredStreet, true)
  assert.deepEqual(syncAchievementUnlocks().newlyUnlocked.map(a=>a.id), ['first-step'])
  state.failWrites=true
  assert.equal(markStreetSceneVisited('south-avenue'), null)
  assert.deepEqual(getUserProgress().visitedSceneIds, ['bank-house'])
})

test('finite integer state, defaults, and malformed objective recovery', () => {
  seed(K.userProgress, { exp: Infinity, silver: -1, silverKey: 3.9, steps: NaN, questData: { activeQuests: ['main-rishengchang'], questProgress: { 'main-rishengchang': { objectives: null } } } })
  assert.equal(getUserProgress().exp, 0)
  assert.equal(getUserProgress().silver, 0)
  assert.equal(getUserProgress().silverKey, 3)
  assert.equal(quest.getActiveQuests()[0].progress.objectives.length, 3)
  assert.ok(getCheckInPreview().nextReward)
})

test('sign-in is once per local day; 7-day stamps and missed-day restart', () => {
  let totalSilver = 268
  for (let day = 1; day <= 8; day++) {
    const result = claimDailyCheckIn()
    assert.equal(result.ok, true)
    assert.equal(result.streak, day)
    totalSilver += result.reward.silver
    assert.equal(claimDailyCheckIn().ok, false)
    assert.equal(getUserProgress().silver, totalSilver)
    now += 86400000
  }
  assert.deepEqual(getUserProgress().checkIn.stamps, ['week-1-d5', 'week-1-d7'])
  now += 86400000
  assert.equal(claimDailyCheckIn().streak, 1)
})

test('write failure returns no sign-in or costume success and no money change', () => {
  const before = getUserProgress()
  state.failWrites = true
  assert.equal(claimDailyCheckIn().reason, 'storage')
  const item = COSTUMES.find((c) => c.unlock.type === 'silverKey')
  assert.equal(purchaseCostume(item.id).ok, false)
  assert.equal(equipCostume('commoner').ok, true) // unchanged value needs no disk write
  assert.deepEqual(getUserProgress(), before)
  state.failWrites = false
  assert.equal(claimDailyCheckIn().ok, true)
})

test('purchase deducts once; locked costumes cannot be equipped', () => {
  patchStorageObject(K.userProgress, { silverKey: 500 })
  const item = COSTUMES.find((c) => c.unlock.type === 'silverKey')
  assert.equal(purchaseCostume(item.id).ok, true)
  assert.equal(getEquippedCostumeId(), item.id)
  assert.equal(getUserProgress().silverKey, 500 - item.unlock.cost)
  purchaseCostume(item.id)
  assert.equal(getUserProgress().silverKey, 500 - item.unlock.cost)
  assert.equal(equipCostume(COSTUMES.find((c) => c.unlock.type === 'level' && c.unlock.level > 1).id).ok, false)
})

test('redeeming charges and grants a coupon/outfit in one write, including legacy migration', () => {
  seed(K.redeemOrders, [{ orderId: 'legacy', currency: 'silver', status: 'unused' }])
  state.writes = []
  const result = redeemShopItem('exp-dress-005')
  assert.equal(result.ok, true)
  assert.deepEqual(state.writes, [K.userProgress])
  assert.equal(getUserProgress().silver, 180)
  assert.ok(getUserProgress().ownedCostumes.includes(result.grantedCostume.id))
  assert.equal(getRedeemOrders().length, 2)
  assert.equal(updateRedeemOrderStatus(result.order.orderId, 'used'), true)
  assert.equal(updateRedeemOrderStatus(result.order.orderId, 'used'), false)
  now += 200 * 3600000
  assert.equal(getOrderStatus(getRedeemOrders()[0]).key, 'used')
})

test('failed redemption is atomic; stale balances cannot spend below zero; expired ticket cannot be used', () => {
  const before = getUserProgress()
  state.failWrites = true
  assert.equal(redeemShopItem('exp-dress-005').ok, false)
  assert.deepEqual(getUserProgress(), before)
  assert.equal(getRedeemOrders().length, 0)
  state.failWrites = false
  const result = redeemShopItem('exp-dress-005')
  patchStorageObject(K.userProgress, { silver: 0 })
  assert.equal(redeemShopItem('exp-dress-005').ok, false)
  now += 74 * 3600000
  assert.equal(getOrderStatus(result.order).key, 'expired')
  assert.equal(updateRedeemOrderStatus(result.order.orderId, 'used'), false)
  resetPrototypeStorage()
  assert.equal(getRedeemOrders().length, 0)
})

test('wrong-place dialog cannot advance quest and micro reward shares objective write', () => {
  quest.ensureJourneyQuest()
  assert.equal(quest.advanceQuestByEvent(quest.EVENT_TYPES.npcDialogCompleted, { poiId: 'county-office', sceneId: 'south-avenue' }).updated, false)
  state.writes = []
  const result = quest.advanceQuestByEvent(quest.EVENT_TYPES.poiEntered, { poiId: 'rishengchang' })
  assert.equal(result.updated, true)
  assert.equal(state.writes.filter((key) => key === K.userProgress).length, 1)
  const before = getUserProgress()
  assert.equal(quest.advanceQuestByEvent(quest.EVENT_TYPES.poiEntered, { poiId: 'rishengchang' }).updated, false)
  assert.deepEqual(getUserProgress(), before)
})

test('quest reward and completion are one write and retry safely after storage failure', () => {
  quest.startQuest('main-rishengchang')
  const definition = questList.find((q) => q.id === 'main-rishengchang')
  definition.objectives.forEach((o) => quest.updateObjective(definition.id, o.id))
  const before = getUserProgress()
  state.failWrites = true
  assert.equal(quest.completeQuest(definition.id), null)
  assert.deepEqual(getUserProgress(), before)
  state.failWrites = false
  state.writes = []
  assert.equal(quest.advanceQuestByEvent(quest.EVENT_TYPES.npcDialogCompleted, { poiId: 'rishengchang' }).completed, true)
  state.writes = []
  const result = quest.completeQuest(definition.id)
  assert.ok(result)
  assert.deepEqual(state.writes, [K.userProgress])
  const after = getUserProgress()
  assert.equal(quest.completeQuest(definition.id), null)
  assert.deepEqual(getUserProgress(), after)
})

test('all role quest definitions can be completed through the event API', () => {
  for (const roleId of ['study', 'treasure', 'encounter', 'checkin', 'helper']) {
    resetPrototypeStorage()
    patchStorageObject(K.userProfile, { roleId })
    patchStorageObject(K.userProgress, { exp: 5000, discoveredPoiIds: questList.flatMap((q) => q.objectives.filter((o) => o.type === 'visit').map((o) => o.target)) })
    for (let attempt = 0; attempt < questList.length + 2; attempt++) {
      const active = quest.ensureJourneyQuest()
      if (!active) break
      const poiId = active.objectives.find((o) => o.type === 'visit')?.target
      for (const o of active.objectives) {
        const E = quest.EVENT_TYPES
        if (o.target === 'steps') { quest.recordSteps(o.required); continue }
        const event = o.type === 'visit' ? E.poiEntered : o.type === 'talk' ? E.npcDialogCompleted : o.target === active.sceneId ? E.sceneLoaded : E.poiInteracted
        for (let n = 0; n < o.required; n++) quest.advanceQuestByEvent(event, { poiId: o.type === 'talk' ? o.poiId || poiId : o.target, topic: o.target, sceneId: active.sceneId, hotspotId: o.target })
      }
      if (quest.getQuestStatus(active.id) === 'active') assert.ok(quest.completeQuest(active.id), roleId + '/' + active.id)
    }
    for (const q of questList.filter((q) => q.type === 'main' || q.trigger?.condition?.roleId === roleId)) assert.ok(getUserProgress().questData.completedQuests.includes(q.id), roleId + '/' + q.id)
  }
})

test('a failed final objective reports the persisted quest stage rather than completion text', () => {
  quest.ensureJourneyQuest()
  quest.advanceQuestByEvent(quest.EVENT_TYPES.poiEntered,{poiId:'rishengchang'})
  quest.advanceQuestByEvent(quest.EVENT_TYPES.npcDialogCompleted,{poiId:'rishengchang'})
  const before=getUserProgress(), stage=quest.getQuestStageLine('main-rishengchang')
  state.failWrites=true
  const result=quest.advanceQuestByEvent(quest.EVENT_TYPES.buildingInteracted,{poiId:'rishengchang'})
  assert.equal(result.error,'storage')
  assert.equal(result.completed,false)
  assert.equal(result.stageLine,stage)
  assert.deepEqual(getUserProgress(),before)
  state.failWrites=false
  assert.equal(quest.advanceQuestByEvent(quest.EVENT_TYPES.buildingInteracted,{poiId:'rishengchang'}).completed,true)
})

test('daily steps reset at local midnight and reject nonfinite increments', () => {
  assert.equal(quest.recordSteps(Infinity).updated, false)
  assert.equal(quest.recordSteps(1000).completed.length, 1)
  const silver = getUserProgress().silver
  assert.equal(quest.recordSteps(1000).completed.length, 0)
  assert.equal(getUserProgress().silver, silver)
  now += 120000
  assert.equal(quest.recordSteps(1000).completed.length, 1)
  assert.equal(getUserProgress().questData.dailyReset, localDateString())
})

test('daily walking retries an already-full objective after reward storage failure', () => {
  const daily = questList.find((q) => q.objectives.some((o) => o.target === 'steps'))
  quest.startQuest(daily.id)
  const objective = daily.objectives.find((o) => o.target === 'steps')
  quest.updateObjective(daily.id, objective.id, objective.required)
  state.failWrites = true
  assert.equal(quest.completeQuest(daily.id), null)
  state.failWrites = false
  assert.equal(quest.recordSteps(1).completed.length, 1)
  assert.equal(quest.recordSteps(1).completed.length, 0)
})

test('achievement remains complete after spending; rewards do not repeat', () => {
  patchStorageObject(K.userProgress, { silverKey: 200 })
  assert.ok(syncAchievementUnlocks().newlyUnlocked.some((a) => a.id === 'silver-collector'))
  patchStorageObject(K.userProgress, { silverKey: 0 })
  const achievement = evaluateAchievements().find((a) => a.id === 'silver-collector')
  assert.equal(achievement.progress, 100)
  assert.equal(achievement.unlocked, true)
  assert.equal(syncAchievementUnlocks().newlyUnlocked.length, 0)
})

test('journal validates POIs, persists edits and reports storage failures', () => {
  assert.equal(toggleFavoritePoi('nonexistent').ok, false)
  assert.equal(setJournalNote('nonexistent', 'test'), null)
  assert.equal(toggleFavoritePoi('rishengchang').favorited, true)
  assert.equal(setJournalNote('rishengchang', '  汇通天下  '), '汇通天下')
  assert.equal(getJournalEntries()[0].note, '汇通天下')
  state.failWrites = true
  assert.equal(setJournalNote('rishengchang', 'not saved'), null)
  assert.equal(toggleFavoritePoi('rishengchang').favorited, true)
  assert.equal(getJournalEntries()[0].note, '汇通天下')
  state.failWrites = false
  assert.equal(setJournalNote('rishengchang', ''), '')
  assert.equal(toggleFavoritePoi('rishengchang').favorited, false)
  assert.equal(getJournalEntries().length, 0)
})
