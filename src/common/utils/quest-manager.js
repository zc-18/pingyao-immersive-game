import { questList, questMap, QUEST_STATUS, QUEST_TYPE } from '../data/quests.js'
import { STORAGE_KEYS, patchStorageObject, getStorage, getUserProgress, nonNegativeInteger, localDateString } from './storage.js'
import { getLevelMeta } from './level.js'
import { poiList } from '../data/poi-list.js'

const poiIds = new Set(poiList.map((poi) => poi.id))

// A multi-stop quest can have a conversation at each stop. Bind the dialogue to
// its explicit location, or the closest preceding visit in older definitions.
function objectivePoi(quest, objective) {
	if (objective.poiId) return objective.poiId
	if (poiIds.has(objective.target)) return objective.target
	if (objective.type !== 'talk') return null
	const index = quest.objectives.findIndex((item) => item.id === objective.id)
	return quest.objectives.slice(0, index).reverse().find((item) => item.type === 'visit')?.target
		|| quest.objectives.find((item) => item.type === 'visit')?.target || null
}

export const EVENT_TYPES = {
	sceneLoaded: 'scene_loaded',
	poiEntered: 'poi_entered',
	poiInteracted: 'poi_interacted',
	buildingInteracted: 'building_interacted',
	npcDialogCompleted: 'npc_dialog_completed',
	rewardClaimed: 'reward_claimed'
}

/* 每完成一个 objective 的小额节奏奖励（给玩家更频繁的正反馈） */
const OBJECTIVE_MICRO_REWARD = {
	silverKey: 5,
	exp: 8,
	score: 4
}

function getQuestData(progress = getUserProgress()) {
	const data = progress.questData
	// Recover malformed old saves from the authoritative objective definitions.
	data.activeQuests = data.activeQuests.filter((id) => questMap[id] && !data.completedQuests.includes(id))
	Object.keys(data.questProgress).forEach((id) => {
		if (!questMap[id]) { delete data.questProgress[id]; return }
	})
	for (const id of new Set([...data.activeQuests, ...Object.keys(data.questProgress)])) {
		const old = data.questProgress[id]
		const objectives = questMap[id].objectives.map((definition) => {
			const saved = Array.isArray(old?.objectives) ? old.objectives.find((item) => item?.id === definition.id) : null
			return { ...definition, current: Math.min(definition.required, nonNegativeInteger(saved?.current)) }
		})
		data.questProgress[id] = { objectives, stage: Math.min(objectives.filter((o) => o.current >= o.required).length, Math.max(0, objectives.length - 1)) }
	}
	return data
}

function saveQuestData(questData, patch = {}) {
	return patchStorageObject(STORAGE_KEYS.userProgress, { ...patch, questData })
}

function patchQuestRuntime(patch = {}) {
	patchStorageObject(STORAGE_KEYS.appRuntime, patch)
}

function cloneObjectives(objectives = []) {
	return objectives.map((objective) => ({
		...objective,
		current: 0
	}))
}

function checkDailyReset() {
	const questData = getQuestData()
	// 本地日历日（与 check-in.js 的签到口径统一）。原先用 new Date().toISOString() 取 UTC 日，
	// UTC+8 下每日任务要到本地 08:00 才重置，且会在 08:00 开出同一本地日二次发奖窗口。
	const today = localDateString()
	if (questData.dailyReset === today) return
	resetDailyQuestData(questData, today)
	saveQuestData(questData)
}

function resetDailyQuestData(questData, day) {
	questList.filter((quest) => quest.resetDaily).forEach((quest) => {
		delete questData.questProgress[quest.id]
		questData.activeQuests = questData.activeQuests.filter((id) => id !== quest.id)
		questData.completedQuests = questData.completedQuests.filter((id) => id !== quest.id)
	})

	questData.dailyReset = day
}

function checkTriggerCondition(quest, progress = getUserProgress(), questData = getQuestData(progress)) {
	const profile = getStorage(STORAGE_KEYS.userProfile, {})
	const runtime = getStorage(STORAGE_KEYS.appRuntime, {})
	const { trigger } = quest

	if (!trigger) return true
	const { type, condition = {} } = trigger

	if (type === 'auto') {
		if (condition.roleSelected) return !!profile.roleId
		if (condition.daily) return true
		return true
	}

	if (type === 'level') {
		return getLevelMeta(progress.exp || 0).level >= (condition.level || 1)
	}

	if (type === 'poi') {
		if (condition.roleId && condition.roleId !== profile.roleId) return false
		if (condition.completedQuests && !condition.completedQuests.every((id) => questData.completedQuests.includes(id))) {
			return false
		}
		if (condition.nearPoi) {
			const visitedPoiIds = Array.isArray(progress.visitedPoiIds) ? progress.visitedPoiIds : []
			const discoveredPoiIds = Array.isArray(progress.discoveredPoiIds) ? progress.discoveredPoiIds : []
			return runtime.currentPoiId === condition.nearPoi
				|| visitedPoiIds.includes(condition.nearPoi)
				|| discoveredPoiIds.includes(condition.nearPoi)
		}
		return true
	}

	if (type === 'npc') {
		if (condition.completedQuests) {
			return condition.completedQuests.every((id) => questData.completedQuests.includes(id))
		}
		return true
	}

	return true
}

export function getQuestStatus(questId) {
	checkDailyReset()
	const questData = getQuestData()

	if (questData.completedQuests.includes(questId)) return QUEST_STATUS.completed
	if (questData.activeQuests.includes(questId)) return QUEST_STATUS.active

	const quest = questMap[questId]
	if (!quest) return QUEST_STATUS.locked
	if (quest.prerequisite && !questData.completedQuests.includes(quest.prerequisite)) return QUEST_STATUS.locked
	return checkTriggerCondition(quest) ? QUEST_STATUS.available : QUEST_STATUS.locked
}

export function getActiveQuests() {
	checkDailyReset()
	const questData = getQuestData()

	return questData.activeQuests
		.map((id) => {
			const quest = questMap[id]
			if (!quest) return null
			const progress = questData.questProgress[id] || {
				objectives: cloneObjectives(quest.objectives),
				stage: 0
			}
			return {
				...quest,
				status: QUEST_STATUS.active,
				progress
			}
		})
		.filter(Boolean)
}

export function getAvailableQuests() {
	checkDailyReset()
	return questList
		.filter((quest) => getQuestStatus(quest.id) === QUEST_STATUS.available)
		.map((quest) => ({ ...quest, status: QUEST_STATUS.available }))
}

export function startQuest(questId) {
	const quest = questMap[questId]
	if (!quest || getQuestStatus(questId) !== QUEST_STATUS.available) return false

	const questData = getQuestData()
	if (!questData.activeQuests.includes(questId)) {
		questData.activeQuests.push(questId)
	}
	questData.questProgress[questId] = {
		objectives: cloneObjectives(quest.objectives),
		stage: 0
	}
	if (!saveQuestData(questData)) return false
	patchQuestRuntime({
		lastQuestId: questId,
		lastQuestStageLine: quest.introLine || quest.description
	})
	return true
}

export function ensureJourneyQuest() {
	const tracked = getTrackedQuest()
	// 已在追踪 main/side 时直接返回；但若只有 daily（如 daily-walk 被步数自动激活）占着追踪槽，
	// 不能让它挡住主线/角色支线的开启——继续向下挑选并启动，getTrackedQuest 的 main>side>daily 会自然顶上来。
	if (tracked && tracked.type !== QUEST_TYPE.daily) return tracked
	const available = getAvailableQuests()
	// 主线优先；主线走完后，优先开启与当前角色匹配的专属支线（第7轮角色分支），再退回普通支线 / 任意可接
	const roleId = getStorage(STORAGE_KEYS.userProfile, {}).roleId
	const firstQuest = available.find((item) => item.type === QUEST_TYPE.main)
		|| available.find((item) => item.trigger?.condition?.roleId && item.trigger.condition.roleId === roleId)
		|| available.find((item) => item.type === QUEST_TYPE.side)
		|| available[0]
	if (!firstQuest) return tracked || null
	startQuest(firstQuest.id)
	return getTrackedQuest()
}

export function updateObjective(questId, objectiveId, increment = 1, rewardPatch = {}) {
	checkDailyReset()
	increment = nonNegativeInteger(increment)
	if (!increment) return false
	const questData = getQuestData()
	const progress = questData.questProgress[questId]
	if (!progress || !questData.activeQuests.includes(questId)) return false

	const objective = progress.objectives.find((item) => item.id === objectiveId)
	if (!objective || objective.current >= objective.required) return false

	objective.current = Math.min(objective.required, objective.current + increment)
	const completedCount = progress.objectives.filter((item) => item.current >= item.required).length
	progress.stage = Math.min(completedCount, Math.max(progress.objectives.length - 1, 0))
	if (!saveQuestData(questData, rewardPatch)) return false
	return objective.current >= objective.required
}

export function checkQuestComplete(questId) {
	const progress = getQuestData().questProgress[questId]
	return !!progress && progress.objectives.every((item) => item.current >= item.required)
}

function shouldAdvanceObjective(objective, eventType, payload = {}, quest) {
	if (!objective || objective.current >= objective.required) return false
	const target = objective.target

	switch (eventType) {
		case EVENT_TYPES.poiEntered:
			return objective.type === 'visit' && payload.poiId === target
		case EVENT_TYPES.poiInteracted:
			return (objective.type === 'explore' || objective.type === 'collect')
				&& (payload.poiId === target || payload.hotspotId === target)
		case EVENT_TYPES.buildingInteracted:
			return objective.type === 'explore'
				&& (payload.buildingId === target || payload.buildingType === target || payload.poiId === target)
		case EVENT_TYPES.npcDialogCompleted: {
			// 对话只在本任务的到访点位上生效（同一点位可能出现在多条街景，如醋坊，所以按点位而非街景判定）。
			const location = objectivePoi(quest, objective)
			if (location && payload.poiId !== location) return false
			return objective.type === 'talk'
				&& (!target || target === 'npc-owl' || payload.poiId === target || payload.topic === target)
		}
		case EVENT_TYPES.sceneLoaded:
			return objective.type === 'explore' && payload.sceneId === target
		default:
			return false
	}
}

export function advanceQuestByEvent(eventType, payload = {}) {
	const quest = ensureJourneyQuest()
	if (!quest) return { quest: null, updated: false, completed: false, stageLine: '' }

	const progress = getQuestData().questProgress[quest.id]
	if (!progress) return { quest, updated: false, completed: false, stageLine: '' }
	// A previous reward write may have failed after the final objective was saved.
	// A later interaction must offer settlement again instead of stranding a full quest.
	if (progress.objectives.every((item) => item.current >= item.required)) {
		return { quest, updated: false, completed: true, stageLine: quest.completionLine || quest.description, microReward: null }
	}

	// 找到第一个「未完成且能被本事件推进」的目标，而非只取数组里第一个未完成目标，
	// 否则玩家乱序触发（如先建筑交互后对话）会被静默丢弃，造成"点了没反应"。
	const pendingObjective = progress.objectives.find(
		(item) => item.current < item.required && shouldAdvanceObjective(item, eventType, payload, quest)
	)
	if (!pendingObjective) {
		return {
			quest: getTrackedQuest(),
			updated: false,
			completed: false,
			stageLine: getQuestStageLine(quest.id)
		}
	}

	const objectiveCompleted = pendingObjective.current + 1 >= pendingObjective.required
	const completed = objectiveCompleted && progress.objectives.every((item) => item.id === pendingObjective.id || item.current >= item.required)
	const stageLine = completed ? (quest.completionLine || quest.description) : getQuestStageLine(quest.id)
	let microReward = null
	let rewardPatch = {}
	if (objectiveCompleted && !completed) {
		const profile = getStorage(STORAGE_KEYS.userProfile, {})
		const saved = getUserProgress()
		const bonus = quest.roleBonus?.[profile.roleId] || {}
		microReward = {
			silverKey: Math.floor(OBJECTIVE_MICRO_REWARD.silverKey * (bonus.silverKey || 1)),
			exp: Math.floor(OBJECTIVE_MICRO_REWARD.exp * (bonus.exp || 1)),
			score: Math.floor(OBJECTIVE_MICRO_REWARD.score * (bonus.score || 1))
		}
		rewardPatch = { exp: saved.exp + microReward.exp, silverKey: saved.silverKey + microReward.silverKey, score: saved.score + microReward.score }
	}
	updateObjective(quest.id, pendingObjective.id, 1, rewardPatch)
	const persisted = getQuestData().questProgress[quest.id]?.objectives.find((item) => item.id === pendingObjective.id)
	if (!persisted || persisted.current <= pendingObjective.current) {
		return { quest, updated: false, completed: false, stageLine: getQuestStageLine(quest.id), microReward: null, error: 'storage' }
	}
	patchQuestRuntime({ lastQuestId: quest.id, lastQuestStageLine: completed ? stageLine : getQuestStageLine(quest.id) })

	return {
		quest: getTrackedQuest(),
		updated: true,
		completed,
		objectiveCompleted,
		stageLine: completed ? stageLine : getQuestStageLine(quest.id),
		objective: pendingObjective,
		microReward
	}
}

export function completeQuest(questId) {
	checkDailyReset()
	const progress = getUserProgress()
	const questData = getQuestData(progress)
	const result = applyQuestCompletion(questId, progress, questData)
	if (!result || !saveQuestData(questData, progress)) return null
	return result
}

// 只修改待保存的同一份进度；普通任务与步数任务共用奖励和去重规则。
function applyQuestCompletion(questId, progress, questData) {
	const quest = questMap[questId]
	const objectives = questData.questProgress[questId]?.objectives
	if (!quest || !objectives?.length || !objectives.every((item) => item.current >= item.required)) return null
	// 幂等保护：已在 completedQuests 则不再发奖。completeQuest 仅在 checkQuestComplete 为真时发奖并移出 activeQuests，
	// 但 questProgress[questId] 仍保留满目标——若同一通关事件被二次派发（多事件处理器/竞态），第二次 checkQuestComplete
	// 仍为真而重复发奖。此守卫杜绝双倍 银钥/经验/积分。
	if (questData.completedQuests.includes(questId)) return null

	const profile = getStorage(STORAGE_KEYS.userProfile, {})
	const roleBonus = quest.roleBonus?.[profile.roleId] || {}
	const rewards = {
		exp: Math.floor(quest.rewards.exp * (roleBonus.exp || 1)),
		silver: Math.floor(quest.rewards.silver * (roleBonus.silver || 1)),
		silverKey: Math.floor(quest.rewards.silverKey * (roleBonus.silverKey || 1)),
		score: Math.floor(quest.rewards.score * (roleBonus.score || 1))
	}

	if (roleBonus.random && Math.random() < 0.3) {
		rewards.silverKey = Math.floor(rewards.silverKey * roleBonus.random)
	}

	questData.completedQuests = [...new Set([...questData.completedQuests, questId])]
	questData.activeQuests = questData.activeQuests.filter((id) => id !== questId)
	Object.assign(progress, {
		exp: progress.exp + rewards.exp,
		silver: progress.silver + rewards.silver,
		silverKey: progress.silverKey + rewards.silverKey,
		score: progress.score + rewards.score,
		totalQuestCompleted: progress.totalQuestCompleted + 1
	})

	return {
		quest,
		rewards,
		roleBonus: roleBonus.desc || ''
	}
}

export function completeQuestAndCollectFeedback(questId) {
	const result = completeQuest(questId)
	if (!result) return null

	const nextQuest = ensureJourneyQuest()
	const journey = getJourneySummary()
	const mainJustCompleted = result.quest.type === QUEST_TYPE.main && journey.mainComplete
	const nextLine = mainJustCompleted ? result.quest.completionLine
		: nextQuest?.introLine || nextQuest?.description || '这一程已圆满，去行旅册回望足迹，也可继续自由探索。'
	patchQuestRuntime({
		lastQuestId: nextQuest?.id || '',
		lastQuestStageLine: nextLine
	})

	return {
		...result,
		mainJustCompleted,
		nextQuest,
		nextLine
	}
}

/* 步数任务结算：把本次步数增量累加进所有「collect/steps」目标（如每日 daily-walk）。
   步数链路独立于 tracked-quest 事件流——原先 collect/steps 没有任何事件能推进，
   每日步数任务永远卡在 0/1000。这里自动激活可接的步数任务并按增量结算，满足后即时发奖。 */
export function recordSteps(delta = 0, recordedDay = localDateString()) {
	const inc = nonNegativeInteger(delta)
	if (inc <= 0) return { ok: true, accepted: 0, updated: false, completed: [] }
	const today = localDateString()
	if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedDay) || recordedDay > today) {
		return { ok: false, accepted: 0, updated: false, completed: [], error: 'date' }
	}
	const saved = getUserProgress()
	const questData = getQuestData(saved)
	if (questData.dailyReset < recordedDay || (recordedDay === today && questData.dailyReset !== today)) {
		resetDailyQuestData(questData, recordedDay)
	}
	// 昨天未落盘的移动仍计入总步数；如果日任务已经翻日，不把它补到今天。
	const acceptsSteps = (quest) => quest.objectives.some((o) => o.type === 'collect' && o.target === 'steps')
		&& (!quest.resetDaily || questData.dailyReset === recordedDay)

	// 激活、增量、达成奖励与总步数只写入一次，任一失败都可以重试整批。
	questList.forEach((quest) => {
		if (!acceptsSteps(quest) || questData.activeQuests.includes(quest.id) || questData.completedQuests.includes(quest.id)) return
		if (quest.prerequisite && !questData.completedQuests.includes(quest.prerequisite)) return
		if (!checkTriggerCondition(quest, saved, questData)) return
		questData.activeQuests.push(quest.id)
		questData.questProgress[quest.id] = { objectives: cloneObjectives(quest.objectives), stage: 0 }
	})

	let updated = false
	questData.activeQuests.forEach((qid) => {
		if (!acceptsSteps(questMap[qid])) return
		const progress = questData.questProgress[qid]
		if (!progress) return
		progress.objectives.forEach((o) => {
			if (o.type === 'collect' && o.target === 'steps' && o.current < o.required) {
				o.current = Math.min(o.required, o.current + inc)
				updated = true
			}
		})
		progress.stage = Math.min(progress.objectives.filter((o) => o.current >= o.required).length, Math.max(0, progress.objectives.length - 1))
	})

	const completed = []
	questData.activeQuests.forEach((qid) => {
		if (!acceptsSteps(questMap[qid])) return
		const result = applyQuestCompletion(qid, saved, questData)
		if (result) completed.push(result)
	})
	saved.steps = nonNegativeInteger(saved.steps + inc)
	if (!saveQuestData(questData, saved)) return { ok: false, accepted: 0, updated: false, completed: [], error: 'storage' }
	return { ok: true, accepted: inc, updated, completed }
}

export function getQuestNpcHint(questId) {
	const quest = questMap[questId]
	if (!quest) return null
	const progress = getQuestData().questProgress[questId]
	if (!progress) return quest.npcHints?.[0]?.text || quest.introLine || null
	const stage = Math.min(progress.stage, (quest.npcHints?.length || 1) - 1)
	return quest.npcHints?.[stage]?.text || quest.approachLine || quest.description
}

export function getQuestProgressPercent(questId) {
	const progress = getQuestData().questProgress[questId]
	if (!progress) return 0
	const totalRequired = progress.objectives.reduce((sum, item) => sum + item.required, 0)
	const totalCurrent = progress.objectives.reduce((sum, item) => sum + item.current, 0)
	return totalRequired ? Math.floor((totalCurrent / totalRequired) * 100) : 0
}

export function getTrackedQuest() {
	const activeQuests = getActiveQuests()
	return activeQuests.find((item) => item.type === QUEST_TYPE.main)
		|| activeQuests.find((item) => item.type === QUEST_TYPE.side)
		|| activeQuests.find((item) => item.type === QUEST_TYPE.daily)
		|| null
}

export function getQuestTargetPoi(questId) {
	const quest = questMap[questId]
	const progress = getQuestData().questProgress[questId]
	if (!quest || !progress) return null
	// Retain guidance after arrival: the next clue or dialogue still has a place.
	for (const objective of progress.objectives) {
		if (objective.current >= objective.required) continue
		const poiId = objectivePoi(quest, objective)
		if (poiId) return poiId
	}
	return null
}

export function getJourneySummary(progress = getUserProgress(), profile = getStorage(STORAGE_KEYS.userProfile, {})) {
	const completed = new Set(progress.questData?.completedQuests || [])
	const chapters = questList.filter((quest) => quest.type === QUEST_TYPE.main).map((quest, index) => ({
		id: quest.id, title: quest.title, sceneId: quest.sceneId, index,
		completed: completed.has(quest.id),
		available: !quest.prerequisite || completed.has(quest.prerequisite),
		description: completed.has(quest.id) ? quest.completionLine : quest.approachLine
	}))
	const sideQuests = questList.filter((quest) => quest.type === QUEST_TYPE.side
		&& (!quest.trigger?.condition?.roleId || quest.trigger.condition.roleId === profile.roleId))
	const mainCompleted = chapters.filter((chapter) => chapter.completed).length
	return { chapters, mainCompleted, mainTotal: chapters.length, mainComplete: mainCompleted === chapters.length,
		sideCompleted: sideQuests.filter((quest) => completed.has(quest.id)).length, sideTotal: sideQuests.length }
}

export function getQuestStageLine(questId) {
	const quest = questMap[questId]
	if (!quest) return ''
	const progress = getQuestData().questProgress[questId]
	if (!progress) return quest.introLine || quest.description
	const currentObjective = progress.objectives.find((item) => item.current < item.required)
	if (!currentObjective) return quest.completionLine || quest.description
	return currentObjective.storyLine || currentObjective.desc || quest.approachLine || quest.description
}

export function getQuestJourneyCopy(questId) {
	const quest = questMap[questId]
	if (!quest) return null
	return {
		introLine: quest.introLine || quest.description,
		approachLine: getQuestStageLine(questId),
		completionLine: quest.completionLine || quest.description
	}
}

export default {
	EVENT_TYPES,
	getQuestStatus,
	getActiveQuests,
	getAvailableQuests,
	startQuest,
	ensureJourneyQuest,
	updateObjective,
	advanceQuestByEvent,
	checkQuestComplete,
	completeQuest,
	completeQuestAndCollectFeedback,
	recordSteps,
	getQuestNpcHint,
	getQuestProgressPercent,
	getTrackedQuest,
	getQuestTargetPoi,
	getQuestJourneyCopy,
	getQuestStageLine
}
