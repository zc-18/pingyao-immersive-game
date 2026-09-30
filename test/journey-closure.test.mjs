import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { installLocalStorage } from './helpers/browser-env.mjs'
import { STORAGE_KEYS as K, ensureStorageDefaults, getUserProgress, patchStorageObject } from '../src/common/utils/storage.js'
import { questList } from '../src/common/data/quests.js'
import streetScenes from '../src/common/data/streets.js'
import * as q from '../src/common/utils/quest-manager.js'
import { syncAchievementUnlocks } from '../src/common/utils/achievements.js'

const env = installLocalStorage()
beforeEach(() => { env.reset(); ensureStorageDefaults(); patchStorageObject(K.userProfile, { roleId: 'study' }) })
after(() => env.uninstall())
const main = questList.filter(quest => quest.type === 'main')

function eventsFor(quest) {
  return quest.objectives.map(o => [o.type === 'visit' ? q.EVENT_TYPES.poiEntered : o.type === 'talk' ? q.EVENT_TYPES.npcDialogCompleted : o.target === quest.sceneId ? q.EVENT_TYPES.sceneLoaded : q.EVENT_TYPES.poiInteracted,
    { poiId: o.type === 'talk' ? o.poiId || quest.objectives.find(x => x.type === 'visit')?.target : o.target, sceneId: quest.sceneId }])
}

test('five chapters lead through all scenes, settle once, unlock the finale and continue into role stories', () => {
  assert.deepEqual(new Set(main.map(quest => quest.sceneId)), new Set(streetScenes.map(scene => scene.id)))
  for (const quest of main) {
    assert.equal(q.ensureJourneyQuest().id, quest.id)
    for (const [event, payload] of eventsFor(quest)) {
      assert.equal(q.advanceQuestByEvent(event, payload).updated, true, `${quest.id}/${payload.poiId}`)
    }
    const feedback = q.completeQuestAndCollectFeedback(quest.id)
    assert.equal(feedback.mainJustCompleted, quest === main.at(-1))
    const saved = getUserProgress()
    assert.equal(q.completeQuest(quest.id), null)
    assert.deepEqual(getUserProgress(), saved)
  }
  assert.equal(q.getJourneySummary().mainComplete, true)
  assert.equal(q.getJourneySummary().mainCompleted, 5)
  assert.equal(q.getTrackedQuest().type, 'side')
  assert.ok(syncAchievementUnlocks().newlyUnlocked.some(a => a.id === 'five-chapters'))
  assert.ok(!syncAchievementUnlocks().newlyUnlocked.some(a => a.id === 'five-chapters'))
})

test('arrival retains the dialogue/clue guide; multi-stop finale talks belong at the wall', () => {
  q.ensureJourneyQuest()
  q.advanceQuestByEvent(q.EVENT_TYPES.poiEntered, { poiId: 'rishengchang' })
  assert.equal(q.getQuestTargetPoi(main[0].id), 'rishengchang')
  q.advanceQuestByEvent(q.EVENT_TYPES.npcDialogCompleted, { poiId: 'rishengchang' })
  assert.equal(q.getQuestTargetPoi(main[0].id), 'rishengchang')
  patchStorageObject(K.userProgress, { questData: { completedQuests: main.slice(0, -1).map(x => x.id), activeQuests: [] } })
  const finale = q.ensureJourneyQuest()
  assert.equal(finale.id, 'main-lantern-finale')
  assert.equal(q.advanceQuestByEvent(q.EVENT_TYPES.npcDialogCompleted, { poiId: 'lantern-square' }).updated, false)
  for (const [event, payload] of eventsFor(finale).slice(0, 3)) q.advanceQuestByEvent(event, payload)
  assert.equal(q.getQuestTargetPoi(finale.id), 'city-wall')
  assert.equal(q.advanceQuestByEvent(q.EVENT_TYPES.npcDialogCompleted, { poiId: 'city-wall' }).updated, true)
  assert.equal(q.advanceQuestByEvent(q.EVENT_TYPES.npcDialogCompleted, { poiId: 'city-wall' }).updated, false)
})

test('an old three-chapter save opens chapter four without replaying paid rewards; failed finale is retryable', () => {
  patchStorageObject(K.userProgress, { questData: { completedQuests: main.slice(0, 3).map(x => x.id) } })
  const before = getUserProgress()
  assert.equal(q.ensureJourneyQuest().id, 'main-academy-lane')
  assert.equal(getUserProgress().silver, before.silver)
  assert.equal(q.getJourneySummary().mainComplete, false)
  for (const quest of main.slice(3)) {
    for (const [event, payload] of eventsFor(quest)) q.advanceQuestByEvent(event, payload)
    if (quest === main.at(-1)) {
      const pending = getUserProgress()
      env.state.failWrites = true
      assert.equal(q.completeQuestAndCollectFeedback(quest.id), null)
      assert.deepEqual(getUserProgress(), pending)
      assert.equal(q.getJourneySummary().mainComplete, false)
      env.state.failWrites = false
    }
    assert.ok(q.completeQuestAndCollectFeedback(quest.id))
  }
  assert.equal(q.getJourneySummary().mainComplete, true)
})
