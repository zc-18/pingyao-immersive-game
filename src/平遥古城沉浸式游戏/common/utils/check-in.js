/**
 * 每日签到 / 旅程节奏奖励
 *
 * - 一天一次签到，按连续天数发放阶梯奖励
 * - 签到记录保存在 userProgress.checkIn
 * - 提供 hasCheckedInToday() / claimDailyCheckIn() / getCheckInPreview()
 *
 * 奖励阶梯（连续日 → 当日奖励）：
 *   1 → 银钥 8、银两 30、exp 20
 *   2 → 银钥 10、银两 40、exp 25
 *   3 → 银钥 14、银两 60、exp 40
 *   4 → 银钥 18、银两 80、exp 55
 *   5 → 银钥 24、银两 100、exp 80（连续 5 日额外送印章）
 *   6 → 银钥 28、银两 120、exp 100
 *   7 → 银钥 36、银两 200、exp 160（满周收尾，附"古城七日章"成就）
 *   ≥8 → 循环回到第 1 天
 */

import { STORAGE_KEYS, getUserProgress, patchStorageObject, localDateString } from './storage.js'

const REWARD_TABLE = [
	{ silverKey: 8, silver: 30, exp: 20, label: '初步入城', stamp: false },
	{ silverKey: 10, silver: 40, exp: 25, label: '续绪游历', stamp: false },
	{ silverKey: 14, silver: 60, exp: 40, label: '渐入佳境', stamp: false },
	{ silverKey: 18, silver: 80, exp: 55, label: '熟门熟路', stamp: false },
	{ silverKey: 24, silver: 100, exp: 80, label: '半月书签', stamp: true },
	{ silverKey: 28, silver: 120, exp: 100, label: '行旅渐稳', stamp: false },
	{ silverKey: 36, silver: 200, exp: 160, label: '七日章成', stamp: true }
]

function todayIso(date = new Date()) {
	return localDateString(date)
}

function diffDays(prevIso, todayStr) {
	if (!prevIso) return Infinity
	const a = new Date(prevIso)
	const b = new Date(todayStr)
	if (Number.isNaN(a.valueOf()) || Number.isNaN(b.valueOf())) return Infinity
	return Math.floor((b - a) / 86400000)
}

function getCheckInState(progress = getUserProgress()) {
	const data = progress.checkIn && typeof progress.checkIn === 'object' ? progress.checkIn : {}
	return {
		lastDate: typeof data.lastDate === 'string' ? data.lastDate : '',
		streak: Math.max(0, Number(data.streak) || 0),
		totalDays: Math.max(0, Number(data.totalDays) || 0),
		stamps: Array.isArray(data.stamps) ? data.stamps.filter(Boolean) : []
	}
}

export function hasCheckedInToday(progress = getUserProgress()) {
	const state = getCheckInState(progress)
	return state.lastDate === todayIso()
}

export function getCheckInPreview(progress = getUserProgress()) {
	const state = getCheckInState(progress)
	const today = todayIso()
	const days = diffDays(state.lastDate, today)
	let nextStreak = state.streak
	if (state.lastDate === today) {
		nextStreak = state.streak
	} else if (days === 1) {
		nextStreak = state.streak + 1
	} else {
		nextStreak = 1
	}
	const slot = (nextStreak - 1) % REWARD_TABLE.length
	const reward = REWARD_TABLE[slot]
	return {
		state,
		alreadyCheckedIn: state.lastDate === today,
		nextStreak: Math.max(1, nextStreak),
		nextSlotIndex: slot,
		nextReward: reward,
		rewardTable: REWARD_TABLE
	}
}

export function claimDailyCheckIn() {
	const progress = getUserProgress()
	const state = getCheckInState(progress)
	const today = todayIso()
	if (state.lastDate === today) {
		return { ok: false, reason: 'already', preview: getCheckInPreview(progress) }
	}

	const days = diffDays(state.lastDate, today)
	const newStreak = days === 1 ? state.streak + 1 : 1
	const slot = (newStreak - 1) % REWARD_TABLE.length
	const reward = REWARD_TABLE[slot]

	const stamps = [...state.stamps]
	if (reward.stamp) {
		// 把里程碑章 key 细化到「周期 + 该周第几日」，否则第5日(半月书签)与第7日(七日章成)
		// 都算出 week-N 而被 includes 去重吞掉，"七日章"永远不会单独记录。
		const stampKey = `week-${Math.ceil(newStreak / 7)}-d${((newStreak - 1) % 7) + 1}`
		if (!stamps.includes(stampKey)) {
			stamps.push(stampKey)
		}
	}

	const next = patchStorageObject(STORAGE_KEYS.userProgress, {
		exp: (Number(progress.exp) || 0) + reward.exp,
		silver: (Number(progress.silver) || 0) + reward.silver,
		silverKey: (Number(progress.silverKey) || 0) + reward.silverKey,
		score: (Number(progress.score) || 0) + Math.floor(reward.exp * 0.4),
		checkIn: {
			lastDate: today,
			streak: newStreak,
			totalDays: state.totalDays + 1,
			stamps
		}
	})

	return {
		ok: true,
		reward,
		streak: newStreak,
		totalDays: state.totalDays + 1,
		progress: next,
		stamp: reward.stamp,
		slotIndex: slot
	}
}

export const CHECK_IN_REWARD_TABLE = REWARD_TABLE
