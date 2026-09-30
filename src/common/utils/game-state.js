import streetScenes from '../data/streets.js'
import { poiList } from '../data/poi-list.js'
import { getLevelSnapshot } from './level.js'
import {
	STORAGE_KEYS,
	getStorage,
	getUserProfile,
	getUserProgress,
	patchStorageObject
} from './storage.js'
import {
	ensureJourneyQuest,
	getQuestJourneyCopy,
	getQuestNpcHint,
	getQuestProgressPercent,
	getQuestTargetPoi,
	getTrackedQuest
} from './quest-manager.js'
import { getJourneySummary } from './quest-manager.js'
import { getRedeemOrders } from '../data/shop-items.js'

const DEFAULT_SCENE_ID = streetScenes[0]?.id || 'bank-house'
const DEFAULT_RETURN_PAGE = '/street'

const sceneMap = streetScenes.reduce((map, item) => {
	map[item.id] = item
	return map
}, {})

const poiMap = poiList.reduce((map, item) => {
	map[item.id] = item
	return map
}, {})

function normalizeRoutePath(value = '') {
	return typeof value === 'string' && value.startsWith('/') ? value : DEFAULT_RETURN_PAGE
}

export function getRuntimeState() {
	const runtime = getStorage(STORAGE_KEYS.appRuntime, {})
	return {
		lastLaunchAt: Number(runtime.lastLaunchAt) || 0,
		lastShowAt: Number(runtime.lastShowAt) || 0,
		lastHideAt: Number(runtime.lastHideAt) || 0,
		platform: runtime.platform || 'unknown',
		hasEnteredStreet: Boolean(runtime.hasEnteredStreet),
		hasCompletedPrologue: Boolean(runtime.hasCompletedPrologue),
		hasSeenJourneyHubHint: Boolean(runtime.hasSeenJourneyHubHint),
		currentStreetScene: sceneMap[runtime.currentStreetScene] ? runtime.currentStreetScene : DEFAULT_SCENE_ID,
		lastStreetScene: sceneMap[runtime.lastStreetScene] ? runtime.lastStreetScene : DEFAULT_SCENE_ID,
		lastStreetSwitchAt: Number(runtime.lastStreetSwitchAt) || 0,
		currentPoiId: typeof runtime.currentPoiId === 'string' ? runtime.currentPoiId : '',
		lastPoiId: typeof runtime.lastPoiId === 'string' ? runtime.lastPoiId : '',
		lastNpcTopic: typeof runtime.lastNpcTopic === 'string' ? runtime.lastNpcTopic : '',
		lastPage: typeof runtime.lastPage === 'string' ? runtime.lastPage : 'splash',
		lastSceneMode: typeof runtime.lastSceneMode === 'string' ? runtime.lastSceneMode : 'story',
		lastQuestId: typeof runtime.lastQuestId === 'string' ? runtime.lastQuestId : '',
		lastQuestStageLine: typeof runtime.lastQuestStageLine === 'string' ? runtime.lastQuestStageLine : '',
		returnPage: normalizeRoutePath(runtime.returnPage),
		returnTab: typeof runtime.returnTab === 'string' ? runtime.returnTab : '',
		pendingArrivalScene: sceneMap[runtime.pendingArrivalScene] ? runtime.pendingArrivalScene : DEFAULT_SCENE_ID,
		pendingStoryBeat: typeof runtime.pendingStoryBeat === 'string' ? runtime.pendingStoryBeat : '',
		streetIntroSeen: Boolean(runtime.streetIntroSeen),
		menuHintDismissed: Boolean(runtime.menuHintDismissed)
	}
}

export function patchRuntimeState(patch = {}) {
	return patchStorageObject(STORAGE_KEYS.appRuntime, patch)
}

export function rememberReturnContext(page = DEFAULT_RETURN_PAGE, tab = '') {
	return patchRuntimeState({
		returnPage: normalizeRoutePath(page),
		returnTab: typeof tab === 'string' ? tab : ''
	})
}

export function markPageVisit(pageName = '', options = {}) {
	if (!pageName) return
	const patch = {
		lastPage: pageName
	}
	if (options.returnPage || options.returnTab !== undefined) {
		patch.returnPage = normalizeRoutePath(options.returnPage || DEFAULT_RETURN_PAGE)
		patch.returnTab = options.returnTab || ''
	}
	patchRuntimeState(patch)
}

export function setCurrentStreetScene(sceneId, options = {}) {
	const nextSceneId = sceneMap[sceneId] ? sceneId : DEFAULT_SCENE_ID
	return patchRuntimeState({
		currentStreetScene: nextSceneId,
		lastStreetScene: nextSceneId,
		lastStreetSwitchAt: Date.now(),
		lastSceneMode: options.sceneMode || getRuntimeState().lastSceneMode
	})
}

// 选中目的地不算到访：街景首帧画出来之后才记录抵达。
export function markStreetSceneVisited(sceneId) {
	if (!sceneMap[sceneId]) return null
	const progress = getUserProgress()
	if (!progress.visitedSceneIds.includes(sceneId)) {
		const saved = patchStorageObject(STORAGE_KEYS.userProgress, { visitedSceneIds: [...progress.visitedSceneIds, sceneId] })
		if (!saved) return null
	}
	if (!getRuntimeState().hasEnteredStreet) patchRuntimeState({ hasEnteredStreet: true })
	return getUserProgress()
}

/* 记录玩家当前所在点位。第二个参数（点位话题）仅为兼容旧调用方而保留、不再使用：
   走近点位不等于听过讲解，lastNpcTopic 只由 markNpcTalk 在讲解完成时写入。 */
export function setCurrentPoi(poiId = '', _npcTopic = '') {
	return patchRuntimeState({
		currentPoiId: poiId,
		lastPoiId: poiId || getRuntimeState().lastPoiId
	})
}

export function markPoiVisited(poiId = '') {
	if (!poiId) return getUserProgress()
	const progress = getUserProgress()
	const discoveredPoiIds = Array.isArray(progress.discoveredPoiIds) ? progress.discoveredPoiIds : []
	const visitedPoiIds = Array.isArray(progress.visitedPoiIds) ? progress.visitedPoiIds : []
	// 已记录则直接返回，省去同一 POI 反复进入（来回走动 / 重进半径）时的重复写盘。
	if (visitedPoiIds.includes(poiId) && discoveredPoiIds.includes(poiId)) {
		return progress
	}
	return patchStorageObject(STORAGE_KEYS.userProgress, {
		discoveredPoiIds: [...new Set([...discoveredPoiIds, poiId])],
		visitedPoiIds: [...new Set([...visitedPoiIds, poiId])]
	})
}

/* 听完一段晋小鸦讲解。同一个话题只计一次 npcTalkCount（「晋小鸦门生」按不同话题累计），
   反复点「继续讲解」不再刷计数；空话题不计数也不记录。lastNpcTopic 只在这里写入。
   返回 { ok, counted, count }：ok 为 false 表示存档写入失败，counted 表示本次是否为新话题。 */
export function markNpcTalk(topic = '') {
	const key = typeof topic === 'string' ? topic.trim() : ''
	const progress = getUserProgress()
	if (!key) return { ok: true, counted: false, count: progress.npcTalkCount }
	const counted = !progress.npcTalkTopics.includes(key)
	if (counted) {
		const saved = patchStorageObject(STORAGE_KEYS.userProgress, {
			npcTalkCount: progress.npcTalkCount + 1,
			npcTalkTopics: [...progress.npcTalkTopics, key]
		})
		if (!saved) return { ok: false, counted: false, count: progress.npcTalkCount }
	}
	const runtimeSaved = patchRuntimeState({ lastNpcTopic: key })
	return { ok: Boolean(runtimeSaved), counted, count: progress.npcTalkCount + (counted ? 1 : 0) }
}

export function markPrologueComplete(sceneId = DEFAULT_SCENE_ID) {
	return patchRuntimeState({
		hasCompletedPrologue: true,
		pendingArrivalScene: sceneId,
		currentStreetScene: sceneId
	})
}

export function getReturnToStreetTarget() {
	const runtime = getRuntimeState()
	return runtime.returnPage || DEFAULT_RETURN_PAGE
}

export function getCurrentStreetScene() {
	const runtime = getRuntimeState()
	return sceneMap[runtime.currentStreetScene] || streetScenes[0]
}

/* 点位状态统一规则（地图与街景小地图共用）：
   - 'quest' 只属于当前追踪任务的下一个到访目标；数据里写死的 'quest' 没有任务指向，按普通路线节点 'route' 处理；
   - 已到访 → 'completed'；仅被发现但数据态为 'discoverable' → 'route'；其余沿用数据态（hot/route/nearby/discoverable）。
   isVisited / isDiscovered 才是玩家真实的探索记录，统计「已探」时用它们，不要用 status。 */
export function getPoiStatusSnapshot(poi = {}, options = {}) {
	const progress = getUserProgress()
	const trackedQuest = options.trackedQuest || getTrackedQuest()
	const targetPoiId = trackedQuest ? getQuestTargetPoi(trackedQuest.id) : ''
	const discoveredPoiIds = Array.isArray(progress.discoveredPoiIds) ? progress.discoveredPoiIds : []
	const visitedPoiIds = Array.isArray(progress.visitedPoiIds) ? progress.visitedPoiIds : []
	const isVisited = visitedPoiIds.includes(poi.id)
	const isDiscovered = discoveredPoiIds.includes(poi.id)

	let status = poi.status || poi.baseStatus || 'discoverable'
	if (status === 'quest') status = 'route'
	if (targetPoiId && targetPoiId === poi.id) {
		status = 'quest'
	} else if (isVisited) {
		status = 'completed'
	} else if (isDiscovered && status === 'discoverable') {
		status = 'route'
	}

	return {
		...poi,
		status,
		isVisited,
		isDiscovered
	}
}

export function getScenePoiList(sceneId = '', options = {}) {
	const scene = sceneMap[sceneId] || getCurrentStreetScene()
	const overrides = scene.poiOverrides || {}
	return (scene.poiIds || [])
		.map((poiId) => {
			const basePoi = poiMap[poiId]
			if (!basePoi) return null
			const override = overrides[poiId] || {}
			return getPoiStatusSnapshot({
				...basePoi,
				distance: override.distance ?? basePoi.distance ?? 999,
				status: override.status || basePoi.baseStatus,
				mapPosition: override.mapPosition || basePoi.mapPosition
			}, options)
		})
		.filter(Boolean)
}

export function getGameSnapshot() {
	const profile = getUserProfile()
	const progress = getUserProgress()
	const runtime = getRuntimeState()
	const level = getLevelSnapshot(progress.exp || 0)
	const trackedQuest = getTrackedQuest() || ensureJourneyQuest()
	const currentStreet = sceneMap[runtime.currentStreetScene] || streetScenes[0]
	const currentPois = getScenePoiList(currentStreet?.id, { trackedQuest })
	const currentPoi = currentPois.find((item) => item.id === runtime.currentPoiId) || currentPois[0] || null
	// 「已探处」只数玩家真正到访或发现过的点位；hot/route/nearby 等数据态是编辑推荐，不代表已探。
	const unlockedPoiCount = currentPois.filter((item) => item.isVisited || item.isDiscovered).length
	const redeemOrders = getRedeemOrders()
	const latestOrder = redeemOrders[0] || null
	const journeyCopy = trackedQuest ? getQuestJourneyCopy(trackedQuest.id) : null
	const questHint = trackedQuest ? getQuestNpcHint(trackedQuest.id) : ''
	const questProgress = trackedQuest ? getQuestProgressPercent(trackedQuest.id) : 0

	return {
		profile,
		progress: {
			...progress,
			levelName: level.title
		},
		runtime,
		level,
		trackedQuest,
		journey: getJourneySummary(progress, profile),
		journeyCopy,
		targetPoiId: trackedQuest ? getQuestTargetPoi(trackedQuest.id) : '',
		currentStreet,
		currentPois,
		currentPoi,
		unlockedPoiCount,
		latestOrder,
		redeemOrderCount: redeemOrders.length,
		heroSceneTitle: currentStreet?.title || currentStreet?.name || '',
		heroNpcLine: questHint || runtime.lastQuestStageLine || journeyCopy?.approachLine || currentStreet?.playerHint || '',
		primaryActionLabel: !runtime.hasCompletedPrologue ? '进入古城'
			: trackedQuest?.type === 'main' ? '继续主线' : trackedQuest?.type === 'side' ? '继续支线' : '自由探索',
		questProgress
	}
}

export function getExploreDirectionLabel(snapshot = getGameSnapshot()) {
	if (snapshot.journeyCopy?.approachLine) {
		return snapshot.journeyCopy.approachLine
	}
	if (snapshot.trackedQuest?.progress?.objectives?.length) {
		const currentObjective = snapshot.trackedQuest.progress.objectives.find((item) => item.current < item.required)
		if (currentObjective?.targetName) {
			return `前往${currentObjective.targetName}`
		}
		if (currentObjective?.desc) {
			return currentObjective.desc
		}
	}
	return snapshot.currentStreet?.playerHint || '沿着街巷继续探索'
}

export function getRoleIdentity(profile = getUserProfile(), level = getLevelSnapshot(getUserProgress().exp || 0)) {
	if (!profile.roleName) {
		return `${level.title} · 待定身份`
	}
	return `${profile.roleName} · ${level.title}`
}

export function getLatestRedeemSummary() {
	const latestOrder = getRedeemOrders()[0]
	if (!latestOrder) return null
	return {
		orderId: latestOrder.orderId,
		itemName: latestOrder.itemName,
		merchantName: latestOrder.merchantName,
		status: latestOrder.status,
		expireAt: latestOrder.expireAt
	}
}
