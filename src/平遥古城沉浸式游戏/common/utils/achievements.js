/**
 * 成就触发系统
 *
 * - 监听玩家进度，自动判定可解锁成就
 * - 为每个成就配置一个 evaluator 纯函数：(progress, profile) => { unlocked: boolean, progress: 0~100, hint }
 * - 调用 evaluateAchievements() 返回最新成就清单
 * - 调用 syncAchievementUnlocks() 把解锁结果写入 storage 并返回新解锁的列表
 */

import { STORAGE_KEYS, getUserProgress, getUserProfile, patchStorageObject } from './storage.js'
import { getLevelMeta } from './level.js'

export const ACHIEVEMENTS = [
	{
		id: 'first-step',
		name: '青石第一脚',
		desc: '踏入古城，开启你的行旅。',
		icon: '步',
		accent: '#D4A574',
		evaluate: ({ progress }) => {
			const visitedSceneCount = (progress.visitedSceneIds || []).length
			const unlocked = visitedSceneCount >= 1
			return {
				unlocked,
				progress: unlocked ? 100 : 0,
				hint: unlocked ? '入城已完成' : '先入城，再点亮此章'
			}
		}
	},
	{
		id: 'rishengchang-open',
		name: '日升昌启卷',
		desc: '完成日升昌票号的入城主线。',
		icon: '票',
		accent: '#C41E3A',
		evaluate: ({ progress }) => {
			const completed = progress?.questData?.completedQuests || []
			const unlocked = completed.includes('main-rishengchang')
			return {
				unlocked,
				progress: unlocked ? 100 : 0,
				hint: unlocked ? '入城首线已记入卷' : '先听完日升昌讲解'
			}
		}
	},
	{
		id: 'three-streets',
		name: '三街连珠',
		desc: '走完票号、县衙、市集三条街。',
		icon: '街',
		accent: '#8B4513',
		evaluate: ({ progress }) => {
			const visited = progress.visitedSceneIds || []
			const need = ['bank-house', 'south-avenue', 'market-crossing']
			const hit = need.filter((id) => visited.includes(id)).length
			return {
				unlocked: hit >= need.length,
				progress: Math.min(100, Math.round((hit / need.length) * 100)),
				hint: `${hit}/${need.length} 街已点亮`
			}
		}
	},
	{
		id: 'poi-five',
		name: '五处掌纹',
		desc: '点亮五处古城点位。',
		icon: '处',
		accent: '#B7854D',
		evaluate: ({ progress }) => {
			const count = (progress.discoveredPoiIds || []).length
			return {
				unlocked: count >= 5,
				progress: Math.min(100, Math.round((count / 5) * 100)),
				hint: `${count}/5 处掌纹`
			}
		}
	},
	{
		id: 'owl-friend',
		name: '晋小鸦门生',
		desc: '与晋小鸦完成 5 次对话。',
		icon: '鸦',
		accent: '#6E5541',
		evaluate: ({ progress }) => {
			const count = Number(progress.npcTalkCount) || 0
			return {
				unlocked: count >= 5,
				progress: Math.min(100, Math.round((count / 5) * 100)),
				hint: `${count}/5 次对谈`
			}
		}
	},
	{
		id: 'long-walk',
		name: '千步丈量',
		desc: '在街景中累计走出 1000 步。',
		icon: '丈',
		accent: '#A6A29A',
		evaluate: ({ progress }) => {
			const steps = Number(progress.steps) || 0
			return {
				unlocked: steps >= 1000,
				progress: Math.min(100, Math.round((steps / 1000) * 100)),
				hint: `${steps}/1000 步`
			}
		}
	},
	{
		id: 'silver-collector',
		name: '银钥半囊',
		desc: '攒下 200 把银钥。',
		icon: '钥',
		accent: '#D4A574',
		evaluate: ({ progress }) => {
			const sk = Number(progress.silverKey) || 0
			return {
				unlocked: sk >= 200,
				progress: Math.min(100, Math.round((sk / 200) * 100)),
				hint: `${sk}/200 把银钥`
			}
		}
	},
	{
		id: 'check-in-week',
		name: '七日续卷',
		desc: '连续签到 7 天。',
		icon: '签',
		accent: '#C41E3A',
		evaluate: ({ progress }) => {
			const streak = Number(progress?.checkIn?.streak) || 0
			return {
				unlocked: streak >= 7,
				progress: Math.min(100, Math.round((streak / 7) * 100)),
				hint: `连签 ${streak}/7 日`
			}
		}
	},
	{
		id: 'level-shopkeeper',
		name: '柜台伙计章',
		desc: '等阶达到柜台伙计 (Lv.2)。',
		icon: '伙',
		accent: '#8B4513',
		evaluate: ({ progress }) => {
			const level = getLevelMeta(progress.exp || 0).level
			return {
				unlocked: level >= 2,
				progress: Math.min(100, Math.round((level / 2) * 100)),
				hint: `Lv.${level} → Lv.2`
			}
		}
	},
	{
		id: 'level-master',
		name: '大掌柜印',
		desc: '等阶达到大掌柜 (Lv.4)。',
		icon: '印',
		accent: '#A6A29A',
		evaluate: ({ progress }) => {
			const level = getLevelMeta(progress.exp || 0).level
			return {
				unlocked: level >= 4,
				progress: Math.min(100, Math.round((level / 4) * 100)),
				hint: `Lv.${level} → Lv.4`
			}
		}
	}
]

/**
 * 成就解锁奖励（银钥 / 经验）。此前成就只点亮印章、无任何奖励，循环偏弱；
 * 这里给每个成就配一份解锁奖励，按难度递增。「银钥半囊」不再发银钥（避免反哺自身达成条件）。
 */
const ACHIEVEMENT_REWARDS = {
	'first-step': { silverKey: 8, exp: 15 },
	'rishengchang-open': { silverKey: 20, exp: 40 },
	'three-streets': { silverKey: 30, exp: 60 },
	'poi-five': { silverKey: 24, exp: 40 },
	'owl-friend': { silverKey: 20, exp: 35 },
	'long-walk': { silverKey: 18, exp: 30 },
	'silver-collector': { silverKey: 0, exp: 40 },
	'check-in-week': { silverKey: 30, exp: 60 },
	'level-shopkeeper': { silverKey: 15, exp: 30 },
	'level-master': { silverKey: 40, exp: 80 }
}
const DEFAULT_ACHIEVEMENT_REWARD = { silverKey: 12, exp: 24 }

export function getAchievementReward(id) {
	return ACHIEVEMENT_REWARDS[id] || DEFAULT_ACHIEVEMENT_REWARD
}

export function evaluateAchievements(snapshot = {}) {
	const progress = snapshot.progress || getUserProgress()
	const profile = snapshot.profile || getUserProfile()
	const unlockedSet = new Set(progress.unlockedAchievements || [])

	return ACHIEVEMENTS.map((achv) => {
		const result = achv.evaluate({ progress, profile }) || { unlocked: false, progress: 0 }
		const persistedUnlocked = unlockedSet.has(achv.id)
		return {
			id: achv.id,
			name: achv.name,
			desc: achv.desc,
			icon: achv.icon,
			accent: achv.accent,
			unlocked: result.unlocked || persistedUnlocked,
			progress: result.unlocked || persistedUnlocked ? 100 : Math.max(0, Math.min(100, Math.round(result.progress || 0))),
			hint: persistedUnlocked && !result.unlocked ? '已达成并留章' : result.hint || ''
		}
	})
}

export function syncAchievementUnlocks() {
	const progress = getUserProgress()
	const previously = new Set(progress.unlockedAchievements || [])
	const list = evaluateAchievements({ progress })
	const newlyUnlocked = list.filter((item) => item.unlocked && !previously.has(item.id))
	if (newlyUnlocked.length === 0) {
		return { newlyUnlocked: [], list, grantedReward: { silverKey: 0, exp: 0 } }
	}
	const merged = [...new Set([...(progress.unlockedAchievements || []), ...newlyUnlocked.map((item) => item.id)])]
	// 累计本批解锁奖励，与 unlockedAchievements 同一次写入——保证「记录解锁」与「发奖」原子；
	// 因解锁记录立即持久化，已解锁成就不会再次进入 newlyUnlocked，故发奖天然幂等、不会重复。
	const grantedReward = newlyUnlocked.reduce((acc, item) => {
		const reward = getAchievementReward(item.id)
		acc.silverKey += reward.silverKey || 0
		acc.exp += reward.exp || 0
		return acc
	}, { silverKey: 0, exp: 0 })
	const saved = patchStorageObject(STORAGE_KEYS.userProgress, {
		unlockedAchievements: merged,
		silverKey: (Number(progress.silverKey) || 0) + grantedReward.silverKey,
		exp: (Number(progress.exp) || 0) + grantedReward.exp
	})
	if (!saved) return { newlyUnlocked: [], list, grantedReward: { silverKey: 0, exp: 0 }, error: 'storage' }
	return {
		newlyUnlocked: newlyUnlocked.map((item) => ({ ...item, reward: getAchievementReward(item.id) })),
		list,
		grantedReward
	}
}

export function getAchievementSummary() {
	const list = evaluateAchievements()
	return {
		list,
		unlockedCount: list.filter((item) => item.unlocked).length,
		total: list.length
	}
}
