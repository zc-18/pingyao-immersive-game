import streetScenes from '../data/streets.js'
import { poiList } from '../data/poi-list.js'
import { getLevelSnapshot } from './level.js'
import {
	STORAGE_KEYS,
	getStorage,
	getUserProfile,
	getUserProgress,
	patchStorageObject,
	hasSelectedRole
} from './storage.js'
import {
	ensureJourneyQuest,
	getQuestJourneyCopy,
	getQuestNpcHint,
	getQuestProgressPercent,
	getQuestTargetPoi,
	getTrackedQuest
} from './quest-manager.js'
import { getRedeemOrders } from '../data/shop-items.js'

const DEFAULT_SCENE_ID = streetScenes[0]?.id || 'bank-house'
const DEFAULT_RETURN_PAGE = '/pages_game/street/street'

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
	const progress = getUserProgress()
	const visitedSceneIds = Array.isArray(progress.visitedSceneIds) ? progress.visitedSceneIds : []
	patchStorageObject(STORAGE_KEYS.userProgress, {
		visitedSceneIds: [...new Set([...visitedSceneIds, nextSceneId])]
	})
	return patchRuntimeState({
		currentStreetScene: nextSceneId,
		lastStreetScene: nextSceneId,
		lastStreetSwitchAt: Date.now(),
		lastSceneMode: options.sceneMode || getRuntimeState().lastSceneMode
	})
}

export function setCurrentPoi(poiId = '', npcTopic = '') {
	return patchRuntimeState({
		currentPoiId: poiId,
		lastPoiId: poiId || getRuntimeState().lastPoiId,
		lastNpcTopic: npcTopic || getRuntimeState().lastNpcTopic
	})
}

export function markPoiVisited(poiId = '') {
	if (!poiId) return getUserProgress()
	const progress = getUserProgress()
	const discoveredPoiIds = Array.isArray(progress.discoveredPoiIds) ? progress.discoveredPoiIds : []
	const visitedPoiIds = Array.isArray(progress.visitedPoiIds) ? progress.visitedPoiIds : []
	return patchStorageObject(STORAGE_KEYS.userProgress, {
		discoveredPoiIds: [...new Set([...discoveredPoiIds, poiId])],
		visitedPoiIds: [...new Set([...visitedPoiIds, poiId])]
	})
}

export function markNpcTalk(topic = '') {
	const progress = getUserProgress()
	patchStorageObject(STORAGE_KEYS.userProgress, {
		npcTalkCount: Math.max(0, Number(progress.npcTalkCount || 0)) + 1
	})
	if (topic) {
		patchRuntimeState({ lastNpcTopic: topic })
	}
}

export function markPrologueComplete(sceneId = DEFAULT_SCENE_ID) {
	return patchRuntimeState({
		hasEnteredStreet: true,
		hasCompletedPrologue: true,
		pendingArrivalScene: sceneId,
		currentStreetScene: sceneId
	})
}

export function resolveLaunchRoute() {
	const profile = getUserProfile()
	const runtime = getRuntimeState()

	if (!hasSelectedRole(profile)) {
		return '/pages_game/splash/splash'
	}

	return runtime.hasCompletedPrologue
		? '/pages_game/street/street'
		: '/pages_game/role-select/role-select'
}

export function getReturnToStreetTarget() {
	const runtime = getRuntimeState()
	return runtime.returnPage || DEFAULT_RETURN_PAGE
}

export function getCurrentStreetScene() {
	const runtime = getRuntimeState()
	return sceneMap[runtime.currentStreetScene] || streetScenes[0]
}

export function getPoiStatusSnapshot(poi = {}, options = {}) {
	const progress = getUserProgress()
	const trackedQuest = options.trackedQuest || getTrackedQuest()
	const targetPoiId = trackedQuest ? getQuestTargetPoi(trackedQuest.id) : ''
	const discoveredPoiIds = Array.isArray(progress.discoveredPoiIds) ? progress.discoveredPoiIds : []
	const visitedPoiIds = Array.isArray(progress.visitedPoiIds) ? progress.visitedPoiIds : []
	const isVisited = visitedPoiIds.includes(poi.id)
	const isDiscovered = discoveredPoiIds.includes(poi.id)

	let status = poi.status || poi.baseStatus || 'discoverable'
	if (targetPoiId && targetPoiId === poi.id) {
		status = 'quest'
	} else if (isVisited) {
		status = 'nearby'
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
	const unlockedPoiCount = currentPois.filter((item) => item.status !== 'discoverable').length
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
		primaryActionLabel: runtime.hasCompletedPrologue ? '继续主线' : '进入古城',
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
