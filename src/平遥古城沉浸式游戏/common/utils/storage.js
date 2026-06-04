export const STORAGE_KEYS = {
	appRuntime: 'pygc_runtime',
	userProfile: 'pygc_user_profile',
	userProgress: 'pygc_user_progress',
	gameSettings: 'pygc_game_settings',
	mockFlags: 'pygc_mock_flags',
	redeemOrders: 'pygc_shop_redeem_orders'
}

/**
 * 全项目统一的「本地日历日」字符串（YYYY-MM-DD，本地时区）。
 * 签到(check-in)、每日任务重置(quest-manager)、时辰(phase) 等"今天"口径必须一致：
 * 一律以本地午夜为日界，禁止再用 new Date().toISOString()（那是 UTC，UTC+8 下要到本地 08:00 才翻日）。
 */
export function localDateString(date = new Date()) {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

const defaultState = {
	[STORAGE_KEYS.userProfile]: {
		nickname: '\u5e73\u9065\u884c\u5ba2',
		roleId: '',
		roleName: '',
		roleSubtitle: '',
		roleMotto: '',
		avatarType: 'placeholder',
		roleSelectedAt: 0
	},
	[STORAGE_KEYS.userProgress]: {
		level: 1,
		levelName: '\u7968\u53f7\u5b66\u5f92',
		exp: 0,
		silver: 268,
		silverKey: 120,
		score: 0,
		steps: 0,
		lastCheckInDate: '',
		discoveredPoiIds: [],
		visitedPoiIds: [],
		visitedSceneIds: [],
		npcTalkCount: 0,
		totalQuestCompleted: 0,
		checkIn: {
			lastDate: '',
			streak: 0,
			totalDays: 0,
			stamps: []
		},
		unlockedAchievements: [],
		questData: {
			activeQuests: [],
			completedQuests: [],
			claimedQuests: [],
			questProgress: {},
			dailyReset: ''
		}
	},
	[STORAGE_KEYS.appRuntime]: {
		lastLaunchAt: 0,
		lastShowAt: 0,
		lastHideAt: 0,
		platform: 'unknown',
		hasEnteredStreet: false,
		hasCompletedPrologue: false,
		hasSeenJourneyHubHint: false,
		currentStreetScene: 'bank-house',
		lastStreetScene: 'bank-house',
		lastStreetSwitchAt: 0,
		currentPoiId: '',
		lastPoiId: '',
		lastNpcTopic: '',
		lastPage: 'splash',
		lastSceneMode: 'story',
		lastQuestId: '',
		lastQuestStageLine: '',
		returnPage: '/pages_game/street/street',
		returnTab: '',
		pendingArrivalScene: 'bank-house',
		pendingStoryBeat: '',
		streetIntroSeen: false,
		menuHintDismissed: false
	},
	[STORAGE_KEYS.gameSettings]: {
		enableMusic: true,
		enableEffect: true,
		preferredOrientation: 'landscape',
		useMockLocation: false
	},
	[STORAGE_KEYS.mockFlags]: {
		enableMockMap: false,
		enableMockShop: false,
		enableMockTask: false,
		enableMockRedeem: false
	}
}

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function cloneValue(value) {
	if (Array.isArray(value)) {
		return value.map((item) => cloneValue(item))
	}

	if (isPlainObject(value)) {
		return Object.keys(value).reduce((result, key) => {
			result[key] = cloneValue(value[key])
			return result
		}, {})
	}

	return value
}

function normalizeUserProfile(profile = {}) {
	const fallback = cloneValue(defaultState[STORAGE_KEYS.userProfile])
	if (!isPlainObject(profile)) {
		return fallback
	}

	return {
		...fallback,
		...profile,
		nickname:
			typeof profile.nickname === 'string' && profile.nickname.trim()
				? profile.nickname.trim()
				: fallback.nickname,
		roleId: typeof profile.roleId === 'string' ? profile.roleId.trim() : '',
		roleName: typeof profile.roleName === 'string' ? profile.roleName.trim() : '',
		roleSubtitle: typeof profile.roleSubtitle === 'string' ? profile.roleSubtitle.trim() : '',
		roleMotto: typeof profile.roleMotto === 'string' ? profile.roleMotto.trim() : '',
		avatarType:
			typeof profile.avatarType === 'string' && profile.avatarType.trim()
				? profile.avatarType.trim()
				: fallback.avatarType,
		roleSelectedAt: Number(profile.roleSelectedAt) || 0
	}
}

function normalizeUserProgress(progress = {}) {
	const fallback = cloneValue(defaultState[STORAGE_KEYS.userProgress])
	if (!isPlainObject(progress)) {
		return fallback
	}

	const questData = isPlainObject(progress.questData) ? progress.questData : fallback.questData
	const checkInRaw = isPlainObject(progress.checkIn) ? progress.checkIn : {}
	const checkIn = {
		lastDate: typeof checkInRaw.lastDate === 'string' ? checkInRaw.lastDate : fallback.checkIn.lastDate,
		streak: Math.max(0, Number(checkInRaw.streak) || 0),
		totalDays: Math.max(0, Number(checkInRaw.totalDays) || 0),
		stamps: Array.isArray(checkInRaw.stamps) ? [...new Set(checkInRaw.stamps.filter(Boolean))] : []
	}

	return {
		...fallback,
		...progress,
		level: Math.max(1, Number(progress.level) || fallback.level),
		levelName:
			typeof progress.levelName === 'string' && progress.levelName.trim()
				? progress.levelName.trim()
				: fallback.levelName,
		exp: Math.max(0, Number(progress.exp) || 0),
		silver: Math.max(0, Number(progress.silver) || 0),
		silverKey: Math.max(0, Number(progress.silverKey) || 0),
		score: Math.max(0, Number(progress.score) || 0),
		steps: Math.max(0, Number(progress.steps) || 0),
		discoveredPoiIds: Array.isArray(progress.discoveredPoiIds) ? [...new Set(progress.discoveredPoiIds.filter(Boolean))] : fallback.discoveredPoiIds,
		visitedPoiIds: Array.isArray(progress.visitedPoiIds) ? [...new Set(progress.visitedPoiIds.filter(Boolean))] : fallback.visitedPoiIds,
		visitedSceneIds: Array.isArray(progress.visitedSceneIds) ? [...new Set(progress.visitedSceneIds.filter(Boolean))] : fallback.visitedSceneIds,
		npcTalkCount: Math.max(0, Number(progress.npcTalkCount) || 0),
		totalQuestCompleted: Math.max(0, Number(progress.totalQuestCompleted) || 0),
		checkIn,
		unlockedAchievements: Array.isArray(progress.unlockedAchievements)
			? [...new Set(progress.unlockedAchievements.filter(Boolean))]
			: fallback.unlockedAchievements,
		questData: {
			...fallback.questData,
			...questData,
			activeQuests: Array.isArray(questData.activeQuests) ? [...new Set(questData.activeQuests.filter(Boolean))] : [],
			completedQuests: Array.isArray(questData.completedQuests) ? [...new Set(questData.completedQuests.filter(Boolean))] : [],
			claimedQuests: Array.isArray(questData.claimedQuests) ? [...new Set(questData.claimedQuests.filter(Boolean))] : [],
			questProgress: isPlainObject(questData.questProgress) ? questData.questProgress : {},
			dailyReset: typeof questData.dailyReset === 'string' ? questData.dailyReset : ''
		},
		lastCheckInDate:
			typeof progress.lastCheckInDate === 'string' ? progress.lastCheckInDate : fallback.lastCheckInDate
	}
}

export function hasSelectedRole(profile = {}) {
	return !!normalizeUserProfile(profile).roleId
}

export function getStorage(key, fallback = null) {
	try {
		const value = uni.getStorageSync(key)
		return value === '' || value === undefined ? fallback : value
	} catch (error) {
		console.warn('[storage] \u8bfb\u53d6\u5931\u8d25', key, error)
		return fallback
	}
}

export function setStorage(key, value) {
	try {
		uni.setStorageSync(key, value)
		return true
	} catch (error) {
		console.warn('[storage] \u5199\u5165\u5931\u8d25', key, error)
		return false
	}
}

export function removeStorage(key) {
	try {
		uni.removeStorageSync(key)
		return true
	} catch (error) {
		console.warn('[storage] \u5220\u9664\u5931\u8d25', key, error)
		return false
	}
}

function mergeDefaultState(currentValue, initialValue) {
	if (!isPlainObject(currentValue) || !isPlainObject(initialValue)) {
		return currentValue === null || currentValue === undefined || currentValue === ''
			? cloneValue(initialValue)
			: currentValue
	}

	return {
		...cloneValue(initialValue),
		...currentValue
	}
}

export function ensureStorageDefaults() {
	Object.keys(defaultState).forEach((key) => {
		const cachedValue = getStorage(key)
		const nextValue =
			key === STORAGE_KEYS.userProfile
				? normalizeUserProfile(mergeDefaultState(cachedValue, defaultState[key]))
				: key === STORAGE_KEYS.userProgress
					? normalizeUserProgress(mergeDefaultState(cachedValue, defaultState[key]))
				: mergeDefaultState(cachedValue, defaultState[key])

		if (JSON.stringify(cachedValue) !== JSON.stringify(nextValue)) {
			setStorage(key, nextValue)
		}
	})
}

export function resetPrototypeStorage() {
	Object.keys(defaultState).forEach((key) => {
		setStorage(key, cloneValue(defaultState[key]))
	})
}

export function getUserProfile() {
	return normalizeUserProfile(getStorage(STORAGE_KEYS.userProfile, {}))
}

export function getUserProgress() {
	return normalizeUserProgress(getStorage(STORAGE_KEYS.userProgress, {}))
}

export function patchStorageObject(key, patch = {}) {
	const current = getStorage(key, {})
	const base = isPlainObject(current) ? current : {}
	const nextValue = {
		...base,
		...(isPlainObject(patch) ? patch : {})
	}
	const normalizedValue =
		key === STORAGE_KEYS.userProfile
			? normalizeUserProfile(nextValue)
			: key === STORAGE_KEYS.userProgress
				? normalizeUserProgress(nextValue)
				: nextValue
	setStorage(key, normalizedValue)
	return normalizedValue
}

const storage = {
	keys: STORAGE_KEYS,
	defaultState,
	localDateString,
	get: getStorage,
	set: setStorage,
	remove: removeStorage,
	ensureDefaults: ensureStorageDefaults,
	resetPrototypeStorage,
	getUserProfile,
	getUserProgress,
	hasSelectedRole,
	patchObject: patchStorageObject
}

export default storage
