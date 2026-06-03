export const LEVELS = [
	{ level: 1, title: '票号学徒', threshold: 0 },
	{ level: 2, title: '柜台伙计', threshold: 600 },
	{ level: 3, title: '账房先生', threshold: 1600 },
	{ level: 4, title: '大掌柜', threshold: 3000 },
	{ level: 5, title: '晋商传人', threshold: 4800 }
]

export const LEVEL_TITLES = LEVELS.map((item) => item.title)
export const LEVEL_THRESHOLDS = LEVELS.map((item) => item.threshold)
export const FINAL_LEVEL_CAP = 6800

function clampExp(exp = 0) {
	const numericExp = Number(exp)
	if (!Number.isFinite(numericExp)) {
		return 0
	}

	return Math.max(0, Math.floor(numericExp))
}

function getLevelIndexByExp(exp = 0) {
	const safeExp = clampExp(exp)

	for (let index = LEVELS.length - 1; index >= 0; index -= 1) {
		if (safeExp >= LEVELS[index].threshold) {
			return index
		}
	}

	return 0
}

export function getLevelMeta(exp = 0) {
	const safeExp = clampExp(exp)
	const index = getLevelIndexByExp(safeExp)
	const currentLevel = LEVELS[index]
	const nextLevel = LEVELS[index + 1]

	return {
		level: currentLevel.level,
		title: currentLevel.title,
		currentExp: safeExp,
		currentLevelStartExp: currentLevel.threshold,
		nextLevelExp: nextLevel ? nextLevel.threshold : FINAL_LEVEL_CAP,
		isMaxLevel: !nextLevel,
		maxLevel: LEVELS[LEVELS.length - 1].level,
		maxLevelTitle: LEVELS[LEVELS.length - 1].title
	}
}

export function getLevelProgress(exp = 0) {
	const meta = getLevelMeta(exp)
	if (meta.isMaxLevel) {
		return 100
	}

	const currentRange = meta.nextLevelExp - meta.currentLevelStartExp
	if (currentRange <= 0) {
		return 0
	}

	const progress = ((meta.currentExp - meta.currentLevelStartExp) / currentRange) * 100
	return Math.min(100, Math.max(0, Math.round(progress)))
}

export function getExpToNextLevel(exp = 0) {
	const meta = getLevelMeta(exp)
	if (meta.isMaxLevel) {
		return 0
	}

	return Math.max(0, meta.nextLevelExp - meta.currentExp)
}

export function getLevelName(exp = 0) {
	return getLevelMeta(exp).title
}

export function getLevelSnapshot(exp = 0) {
	const meta = getLevelMeta(exp)
	const currentLevelIndex = LEVELS.findIndex((item) => item.level === meta.level)
	const nextLevel = LEVELS[currentLevelIndex + 1]
	const currentLevelExp = Math.max(0, meta.currentExp - meta.currentLevelStartExp)
	const currentLevelRangeExp = Math.max(0, meta.nextLevelExp - meta.currentLevelStartExp)
	return {
		...meta,
		currentLevelExp,
		currentLevelRangeExp,
		nextLevelTitle: meta.isMaxLevel ? meta.maxLevelTitle : nextLevel?.title || meta.maxLevelTitle,
		progress: getLevelProgress(exp),
		expToNextLevel: getExpToNextLevel(exp)
	}
}
