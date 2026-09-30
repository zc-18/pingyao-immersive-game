import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { installLocalStorage } from './helpers/browser-env.mjs'
import { STORAGE_KEYS as K, ensureStorageDefaults, getUserProgress, patchStorageObject } from '../src/common/utils/storage.js'
import { markNpcTalk, setCurrentPoi, getRuntimeState, getPoiStatusSnapshot, getGameSnapshot } from '../src/common/utils/game-state.js'
import { ensureJourneyQuest, advanceQuestByEvent, EVENT_TYPES, getQuestStatus, recordSteps } from '../src/common/utils/quest-manager.js'
import { createStepBuffer } from '../src/common/utils/step-buffer.js'
import { claimDailyCheckIn, getCheckInPreview } from '../src/common/utils/check-in.js'
import { getLevelSnapshot } from '../src/common/utils/level.js'
import { evaluateAchievements } from '../src/common/utils/achievements.js'

const env = installLocalStorage()
const RealDate = Date
let now
// 固定本地日期，模拟系统时钟向前/向后调整。
globalThis.Date = class extends RealDate {
	constructor(...args) { super(...(args.length ? args : [now])) }
	static now() { return now }
}
beforeEach(() => {
	now = new RealDate(2026, 8, 10, 12).valueOf()
	env.reset()
	ensureStorageDefaults()
	patchStorageObject(K.userProfile, { roleId: 'study' })
})
after(() => { env.uninstall(); globalThis.Date = RealDate })

test('同话题只计一次，走近点位不点亮夜话，空话题不计数', () => {
	setCurrentPoi('rishengchang', '票号故事')
	assert.equal(getRuntimeState().lastNpcTopic, '')
	for (const topic of ['', ' ', null, 5]) markNpcTalk(topic)
	assert.equal(getUserProgress().npcTalkCount, 0)
	for (let i = 0; i < 10; i++) markNpcTalk(' 票号故事 ')
	assert.equal(getUserProgress().npcTalkCount, 1)
	assert.deepEqual(getUserProgress().npcTalkTopics, ['票号故事'])
	assert.equal(getRuntimeState().lastNpcTopic, '票号故事')
	assert.equal(evaluateAchievements().find(a => a.id === 'owl-friend').unlocked, false)
	for (const topic of ['县衙', '文庙', '茶铺', '城墙']) markNpcTalk(topic)
	assert.equal(evaluateAchievements().find(a => a.id === 'owl-friend').unlocked, true)
})

test('旧计数保留，话题规范化，失败后重试不重复计数', () => {
	env.seed(K.userProgress, { npcTalkCount: 3 })
	assert.deepEqual(getUserProgress().npcTalkTopics, [])
	assert.equal(getUserProgress().npcTalkCount, 3)
	env.state.failWrites = true
	assert.equal(markNpcTalk('票号').ok, false)
	assert.equal(getUserProgress().npcTalkCount, 3)
	assert.equal(getRuntimeState().lastNpcTopic, '')
	env.state.failWrites = false
	assert.equal(markNpcTalk('票号').count, 4)
	assert.equal(markNpcTalk('票号').counted, false)
	patchStorageObject(K.userProgress, { npcTalkTopics: [' 票号 ', '票号', '', null, 5] })
	assert.deepEqual(getUserProgress().npcTalkTopics, ['票号'])
})

test('只有任务目标标 quest，数据热点不算已探', () => {
	ensureJourneyQuest()
	assert.equal(getPoiStatusSnapshot({ id: 'rishengchang', baseStatus: 'hot' }).status, 'quest')
	assert.equal(getPoiStatusSnapshot({ id: 'vinegar-workshop', status: 'quest' }).status, 'route')
	assert.equal(getGameSnapshot().unlockedPoiCount, 0)
	patchStorageObject(K.userProgress, { visitedPoiIds: ['rishengchang'], discoveredPoiIds: ['mingqing-street'] })
	assert.equal(getGameSnapshot().unlockedPoiCount, 2)
	advanceQuestByEvent(EVENT_TYPES.poiEntered, { poiId: 'rishengchang' })
	// Arrival is recorded, while the remaining dialogue/clue keeps its guidance.
	assert.equal(getPoiStatusSnapshot({ id: 'rishengchang' }).status, 'quest')
	assert.equal(getPoiStatusSnapshot({ id: 'rishengchang' }).isVisited, true)
})

test('未来批次并入今天，写失败保留，恢复后只记一次且不挡后续', () => {
	const buffer = createStepBuffer()
	buffer.add(600)
	now -= 86400000
	buffer.add(400)
	env.state.failWrites = true
	assert.equal(buffer.flush().ok, false)
	assert.equal(buffer.pending, 1000)
	assert.equal(getUserProgress().steps, 0)
	env.state.failWrites = false
	const result = buffer.flush()
	assert.equal(result.accepted, 1000)
	assert.equal(result.completed.length, 1)
	assert.equal(buffer.pending, 0)
	assert.equal(buffer.flush().accepted, 0)
	buffer.add(3)
	assert.equal(buffer.flush().accepted, 3)
	assert.equal(getUserProgress().steps, 1003)
	assert.equal(recordSteps(1, '2099-01-01').error, 'date')
})

test('回拨系统日期拒绝签到，不发奖、不改变连签，日期恢复后正常续签', () => {
	assert.equal(claimDailyCheckIn().ok, true)
	const before = getUserProgress()
	now -= 86400000
	assert.equal(claimDailyCheckIn().reason, 'clock')
	assert.match(claimDailyCheckIn().message, /校准系统时间/)
	assert.equal(getCheckInPreview().clockBehind, true)
	assert.deepEqual(getUserProgress(), before)
	now += 86400000
	assert.equal(claimDailyCheckIn().reason, 'already')
	now += 86400000
	assert.equal(claimDailyCheckIn().streak, 2)
})

test('未满级经验条不提前满格，满级快照明确 isMaxLevel', () => {
	for (const exp of [597, 598, 599, 1599, 2999, 4799]) {
		const snapshot = getLevelSnapshot(exp)
		assert.equal(snapshot.progress, 99)
		assert.equal(snapshot.isMaxLevel, false)
	}
	assert.equal(getLevelSnapshot(600).progress, 0)
	assert.equal(getLevelSnapshot(4800).progress, 100)
	assert.equal(getLevelSnapshot(4800).isMaxLevel, true)
})

test('旧领奖记录迁入完成状态，不能再次领取同任务', () => {
	env.seed(K.userProgress, { questData: { claimedQuests: ['main-rishengchang'] } })
	assert.equal(getQuestStatus('main-rishengchang'), 'completed')
	assert.equal('claimedQuests' in getUserProgress().questData, false)
})

test('对话以点位匹配，跨场景复用的醋坊讲解可完成', () => {
	patchStorageObject(K.userProgress, { questData: { completedQuests: ['main-rishengchang', 'main-county-office', 'main-market-crossing'] }, visitedPoiIds: ['vinegar-workshop'] })
	// 低等级不会抢先开启书院支线；研学角色专属支线优先，因此改用无角色存档。
	patchStorageObject(K.userProfile, { roleId: '' })
	assert.equal(ensureJourneyQuest().id, 'side-vinegar-workshop')
	assert.equal(advanceQuestByEvent(EVENT_TYPES.npcDialogCompleted, { poiId: 'tea-house' }).updated, false)
	assert.equal(advanceQuestByEvent(EVENT_TYPES.npcDialogCompleted, { poiId: 'vinegar-workshop', sceneId: 'market-crossing' }).updated, true)
})
