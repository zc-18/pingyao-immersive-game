/**
 * 晋小鸦情境对白选择器 —— 第7轮新增
 *
 * 统一入口：按 (角色 × 时辰 × POI × 任务阶段 × 触发场景) 选一句晋小鸦台词，
 * 强化"它一直在你身边"的陪伴感。数据见 common/data/npc-cues.js。
 *
 * 设计：纯函数 + 轻量轮换（不依赖 Math.random，便于测试），由页面调用，只返回字符串。
 */

import { PHASE_CUES, ROLE_CUES, POI_CUES, SCENE_CUES } from '../data/npc-cues.js'

/* 每个类别维护一个递增游标，轮流取句，避免每次都同一条 */
const rotation = {}
function pickRotating(arr, key) {
	if (!Array.isArray(arr) || arr.length === 0) return ''
	const next = (rotation[key] = (rotation[key] || 0) + 1)
	return arr[next % arr.length]
}

const FALLBACK = '客官，慢些走，古城的故事都在你脚下。'

/**
 * @param {Object} ctx
 * @param {string} ctx.kind   'enter' | 'approach' | 'scene' | 'phase' | 'ambient'
 * @param {string} ctx.roleId 当前角色 id（study/treasure/encounter/checkin/helper）
 * @param {string} ctx.phaseKey 当前时辰 key（dawn/noon/dusk/night）
 * @param {string} ctx.poiId  目标 POI id
 * @param {Object} ctx.poi    POI 对象（用其 npcTopic 兜底）
 * @param {string} ctx.sceneId 当前街景 id
 * @param {string} ctx.questHint 任务阶段台词（最高优先，用于 enter/ambient）
 * @returns {string}
 */
export function getContextualNpcCue(ctx = {}) {
	const {
		kind = 'ambient',
		roleId = '',
		phaseKey = '',
		poiId = '',
		poi = null,
		sceneId = '',
		questHint = ''
	} = ctx

	const poiCue = poiId ? POI_CUES[poiId] : null

	if (kind === 'enter') {
		// 进入 POI：任务流优先（保持主线引导），再到角色化 POI 台词，再 POI 默认/静态
		if (questHint) return questHint
		if (poiCue) {
			if (roleId && poiCue[roleId]) return poiCue[roleId]
			if (poiCue.default) return poiCue.default
		}
		if (poi && poi.npcTopic) return poi.npcTopic
		return FALLBACK
	}

	if (kind === 'approach') {
		// 由远及近的预告：不掺任务推进，纯角色/POI 氛围短句
		if (poiCue) {
			if (roleId && poiCue[roleId]) return poiCue[roleId]
			if (poiCue.default) return poiCue.default
		}
		if (poi && poi.npcTopic) return poi.npcTopic
		if (roleId && ROLE_CUES[roleId]) return pickRotating(ROLE_CUES[roleId], 'role-' + roleId)
		return FALLBACK
	}

	if (kind === 'scene') {
		// 进入街景开场白
		if (sceneId && SCENE_CUES[sceneId]) return SCENE_CUES[sceneId]
		if (phaseKey && PHASE_CUES[phaseKey]) return pickRotating(PHASE_CUES[phaseKey], 'phase-' + phaseKey)
		return FALLBACK
	}

	if (kind === 'phase') {
		// 换幕（时辰切换）问候：以时辰氛围为主（呼应 phase.caption），角色口吻兜底
		if (phaseKey && PHASE_CUES[phaseKey]) {
			const pc = pickRotating(PHASE_CUES[phaseKey], 'phgreet-' + phaseKey)
			if (pc) return pc
		}
		if (roleId && ROLE_CUES[roleId]) return pickRotating(ROLE_CUES[roleId], 'phgreet-role-' + roleId)
		return FALLBACK
	}

	// ambient（默认）：任务线索 > 角色寒暄 > 时辰寒暄
	if (questHint) return questHint
	if (roleId && ROLE_CUES[roleId]) {
		const rc = pickRotating(ROLE_CUES[roleId], 'amb-role-' + roleId)
		if (rc) return rc
	}
	if (phaseKey && PHASE_CUES[phaseKey]) return pickRotating(PHASE_CUES[phaseKey], 'amb-phase-' + phaseKey)
	if (poi && poi.npcTopic) return poi.npcTopic
	return FALLBACK
}

export default { getContextualNpcCue }
