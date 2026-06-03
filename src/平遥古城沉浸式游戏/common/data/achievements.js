import { LEVEL_TITLES } from '../utils/level.js'

export const USER_GROWTH_STORAGE_KEY = 'pygc_user_growth_panel'

export const GROWTH_SKILL_STATE = {
	locked: '未解锁',
	growing: '修习中',
	mastery: '熟练',
	advanced: '精进'
}

export const userGrowthMock = {
	profile: {
		name: '平遥行客',
		identity: '日升昌外账线见习',
		signature: '跟着晋小鸦走街入巷，把每一段故事都记进账本。',
		exp: 2680,
		avatarText: '角色立绘占位',
		npcPartner: '晋小鸦'
	},
	progress: {
		silver: 2480,
		credit: 92,
		tasksCompleted: 18,
		spotsExplored: 11,
		totalSpots: 18,
		npcTasksCompleted: 5,
		mainStoryFinished: true
	},
	stats: [
		{ key: 'silver', label: '银两', unit: '两', icon: '银', sourceKey: 'silver', trend: '本周跑商 +180' },
		{ key: 'credit', label: '信誉', unit: '分', icon: '誉', sourceKey: 'credit', trend: '掌柜评价稳中有升' },
		{ key: 'tasks', label: '完成任务', unit: '件', icon: '务', sourceKey: 'tasksCompleted', trend: '今日新增 2 件' },
		{ key: 'spots', label: '探索景点', unit: '处', icon: '游', sourceKey: 'spotsExplored', trend: '距全城点亮还差 7 处' }
	],
	skills: [
		{ id: 'ledger', name: '票号识账', tag: '核心技能', desc: '与票号场景互动时，可更快识别关键线索与账册信息。', unlockLevel: 1 },
		{ id: 'negotiation', name: '商路议价', tag: '经营技能', desc: '线下核销与兑换环节显示额外优惠提示，当前阶段为原型模拟效果。', unlockLevel: 2 },
		{ id: 'guide', name: '古城导览', tag: '探索技能', desc: '晋小鸦会优先推荐尚未探索的文化点位与任务入口。', unlockLevel: 3 },
		{ id: 'reputation', name: '票号威望', tag: '高阶技能', desc: '达到大掌柜后解锁更高阶的商帮身份展示与称号特效。', unlockLevel: 4 }
	],
	achievements: [
		{ id: 'rishengchang', name: '日升昌启卷', desc: '首次完成票号主线导览', icon: '票', accent: '#D4A574', requirement: { type: 'story', key: 'mainStoryFinished' } },
		{ id: 'citywalk', name: '城门丈量者', desc: '累计探索 10 处景点', icon: '城', accent: '#8B4513', requirement: { type: 'count', key: 'spotsExplored', target: 10, unit: '处' } },
		{ id: 'npc', name: '晋小鸦门生', desc: '完成 5 次 NPC 叙事任务', icon: '鸦', accent: '#C41E3A', requirement: { type: 'count', key: 'npcTasksCompleted', target: 5, unit: '次' } },
		{ id: 'ledger-master', name: '账房试印', desc: '达到账房先生等级', icon: '印', accent: '#B7854D', requirement: { type: 'level', target: 3, title: LEVEL_TITLES[2] } },
		{ id: 'merchant-road', name: '商路风云', desc: '完成 30 件任务后解锁', icon: '商', accent: '#A6A29A', requirement: { type: 'count', key: 'tasksCompleted', target: 30, unit: '件' } },
		{ id: 'legend', name: '晋商传灯', desc: `达到 ${LEVEL_TITLES[4]} 后解锁`, icon: '传', accent: '#A6A29A', requirement: { type: 'level', target: 5, title: LEVEL_TITLES[4] } }
	],
	entries: [
		{ key: 'redeem', label: '我的兑换', desc: '查看核销券与兑换记录', icon: '兑' },
		{ key: 'footprint', label: '行走足迹', desc: '回看已探索街巷与打卡轨迹', icon: '迹' },
		{ key: 'medal', label: '成就徽章', desc: '整理已点亮的晋商荣誉', icon: '徽' },
		{ key: 'about', label: '关于我们', desc: '项目说明与预留接口信息', icon: '问' }
	]
}

export function getGrowthProgressSnapshot(state = {}) {
	const fallback = userGrowthMock.progress
	const stats = Array.isArray(state.stats) ? state.stats : []
	const progress = state?.progress || {}

	const getStatValue = (key, defaultValue = 0) => {
		const statValue = stats.find((item) => item.key === key)?.value
		const numericValue = Number(statValue)
		return Number.isFinite(numericValue) ? numericValue : defaultValue
	}

	return {
		silver: toSafeNumber(progress.silver, getStatValue('silver', fallback.silver)),
		credit: toSafeNumber(progress.credit, getStatValue('credit', fallback.credit)),
		tasksCompleted: toSafeNumber(progress.tasksCompleted, getStatValue('tasks', fallback.tasksCompleted)),
		spotsExplored: toSafeNumber(progress.spotsExplored, getStatValue('spots', fallback.spotsExplored)),
		totalSpots: toSafeNumber(progress.totalSpots, fallback.totalSpots),
		npcTasksCompleted: toSafeNumber(progress.npcTasksCompleted, fallback.npcTasksCompleted),
		mainStoryFinished: Boolean(progress.mainStoryFinished ?? fallback.mainStoryFinished)
	}
}

export function buildGrowthStats(stats = [], progress = {}) {
	return stats.map((item) => {
		const value = toSafeNumber(progress[item.sourceKey], item.value)
		let trend = item.trend || ''

		if (item.key === 'spots') {
			const remaining = Math.max(0, toSafeNumber(progress.totalSpots, 0) - value)
			trend = remaining > 0 ? `距全城点亮还差 ${remaining} 处` : '全城点位已点亮'
		}

		return {
			...item,
			value,
			trend
		}
	})
}

export function buildSkillList(skills = [], levelInfo = {}) {
	return skills.map((item) => {
		const unlockLevel = Number(item.unlockLevel) || 1
		const unlocked = Number(levelInfo.level || 1) >= unlockLevel
		return {
			...item,
			unlocked,
			levelText: getSkillStageText(levelInfo.level, unlockLevel),
			lockText: `Lv.${unlockLevel} 解锁`
		}
	})
}

export function buildAchievementList(achievements = [], progress = {}, levelInfo = {}) {
	return achievements.map((item) => {
		const requirement = item.requirement || {}
		const result = resolveAchievementRequirement(requirement, progress, levelInfo)
		return {
			...item,
			unlocked: result.unlocked,
			progressText: result.progressText,
			stateText: result.stateText,
			progressRate: result.progressRate
		}
	})
}

function resolveAchievementRequirement(requirement, progress, levelInfo) {
	if (requirement.type === 'story') {
		const unlocked = Boolean(progress[requirement.key])
		return {
			unlocked,
			progressText: unlocked ? '主线已存卷' : '尚未完成主线导览',
			stateText: unlocked ? '已点亮' : '未解锁',
			progressRate: unlocked ? 100 : 0
		}
	}

	if (requirement.type === 'level') {
		const currentLevel = Number(levelInfo.level || 1)
		const targetLevel = Number(requirement.target || 1)
		const unlocked = currentLevel >= targetLevel
		return {
			unlocked,
			progressText: unlocked ? `已达到 ${requirement.title}` : `Lv.${currentLevel} / Lv.${targetLevel}`,
			stateText: unlocked ? '可领取' : '继续历练',
			progressRate: Math.min(100, Math.round((currentLevel / targetLevel) * 100))
		}
	}

	const currentValue = toSafeNumber(progress[requirement.key], 0)
	const targetValue = Math.max(1, toSafeNumber(requirement.target, 1))
	const unlocked = currentValue >= targetValue
	return {
		unlocked,
		progressText: `${currentValue} / ${targetValue}${requirement.unit || ''}`,
		stateText: unlocked ? '已点亮' : '未解锁',
		progressRate: Math.min(100, Math.round((currentValue / targetValue) * 100))
	}
}

function getSkillStageText(currentLevel = 1, unlockLevel = 1) {
	if (currentLevel < unlockLevel) {
		return GROWTH_SKILL_STATE.locked
	}

	const stage = currentLevel - unlockLevel
	if (stage >= 2) {
		return GROWTH_SKILL_STATE.advanced
	}
	if (stage >= 1) {
		return GROWTH_SKILL_STATE.mastery
	}
	return GROWTH_SKILL_STATE.growing
}

function toSafeNumber(value, fallback = 0) {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : fallback
}
