/**
 * 音效管理工具 —— 基于 uni.createInnerAudioContext 的真实音频引擎。
 *
 * 设计要点：
 * - 同一套导出 API（playBGM/stopBGM/playSFX/setVolume/getVolume + SFX/BGM 常量），调用方无需感知实现。
 * - 资源可选：音频文件统一放 /static/audio/（命名见该目录 README）。文件缺失时 onError 静默兜底，
 *   既不报错也不崩溃——先把"何时播什么"接好，美术/音频素材后补即可（与 static/libs 同一思路）。
 * - 受设置开关控制：统一读 gameSettings.enableMusic（"音效"总开关）。关闭时不创建任何音频上下文。
 * - 防泄漏：BGM 复用单一上下文；SFX 用小池子，播完/出错即 destroy，并限制并发数量。
 * - 仅依赖 storage.js 读取设置，无其它内部依赖，避免循环引用。
 */

import { STORAGE_KEYS, getStorage } from './storage.js'

const AUDIO_BASE = '/static/audio/'
const SFX_POOL_LIMIT = 6

const audioState = {
	bgmVolume: 0.55,
	sfxVolume: 0.8,
	currentBGM: null,   // 正在播放的 BGM 名
	desiredBGM: null,   // 最近一次请求的 BGM（开关重新打开 / 回到前台时据此恢复）
	bgmLoop: true
}

let bgmCtx = null
const sfxPool = new Set()

function audioSupported() {
	return typeof uni !== 'undefined' && typeof uni.createInnerAudioContext === 'function'
}

/* "音效"总开关：默认开启（仅显式 false 视为关闭），与 user.vue 设置抽屉口径一致 */
function isAudioEnabled() {
	const gs = getStorage(STORAGE_KEYS.gameSettings, {})
	return gs.enableMusic !== false
}

/* name 既可是 BGM/SFX 常量（如 'street_ambient' / 'coin'），也可是已经写好的完整路径/URL */
function resolveSrc(name, kind) {
	if (!name) return ''
	if (/^(https?:|blob:|\/)/.test(name)) return name
	return `${AUDIO_BASE}${kind}_${name}.mp3`
}

function destroyBgmCtx() {
	if (bgmCtx) {
		try { bgmCtx.stop() } catch (e) {}
		try { bgmCtx.destroy() } catch (e) {}
		bgmCtx = null
	}
	audioState.currentBGM = null
}

function clearSfxPool() {
	sfxPool.forEach((ctx) => {
		try { ctx.stop() } catch (e) {}
		try { ctx.destroy() } catch (e) {}
	})
	sfxPool.clear()
}

/**
 * 播放背景音乐（循环）。会记下 desiredBGM 以便开关/前后台恢复。
 * @param {string} name BGM 名（见 BGM 常量）
 * @param {boolean} loop 是否循环
 */
export function playBGM(name, loop = true) {
	audioState.desiredBGM = name
	audioState.bgmLoop = loop
	if (!name || !isAudioEnabled() || !audioSupported()) return

	// 同一首已在播：仅确保处于播放态，不重头重播
	if (audioState.currentBGM === name && bgmCtx) {
		try { bgmCtx.play() } catch (e) {}
		return
	}

	destroyBgmCtx()
	try {
		const ctx = uni.createInnerAudioContext()
		ctx.src = resolveSrc(name, 'bgm')
		ctx.loop = loop
		ctx.volume = audioState.bgmVolume
		ctx.obeyMuteSwitch = false
		ctx.onError(() => { /* 缺素材或解码失败：静默，不崩 */ })
		ctx.play()
		bgmCtx = ctx
		audioState.currentBGM = name
	} catch (e) {
		bgmCtx = null
		audioState.currentBGM = null
	}
}

/** 停止背景音乐并清空恢复目标 */
export function stopBGM() {
	audioState.desiredBGM = null
	destroyBgmCtx()
}

/** 暂停（保留 desiredBGM，便于恢复，如进入对话页/切到后台） */
export function pauseBGM() {
	if (bgmCtx) {
		try { bgmCtx.pause() } catch (e) {}
	}
}

/** 恢复播放：若上下文还在则续播；否则按最近一次 desiredBGM 重建 */
export function resumeBGM() {
	if (!isAudioEnabled()) return
	if (bgmCtx) {
		try { bgmCtx.play() } catch (e) {}
	} else if (audioState.desiredBGM) {
		playBGM(audioState.desiredBGM, audioState.bgmLoop)
	}
}

/**
 * 播放一次性音效（可重叠，自动回收）。
 * @param {string} name 音效名（见 SFX 常量）
 */
export function playSFX(name) {
	if (!name || !isAudioEnabled() || !audioSupported()) return
	if (sfxPool.size >= SFX_POOL_LIMIT) return // 并发上限，避免短时间狂点堆积
	try {
		const ctx = uni.createInnerAudioContext()
		ctx.src = resolveSrc(name, 'sfx')
		ctx.volume = audioState.sfxVolume
		ctx.obeyMuteSwitch = false
		const cleanup = () => {
			try { ctx.destroy() } catch (e) {}
			sfxPool.delete(ctx)
		}
		ctx.onEnded(cleanup)
		ctx.onError(cleanup)
		ctx.onStop(cleanup)
		sfxPool.add(ctx)
		ctx.play()
	} catch (e) { /* 忽略：音效失败不应影响主流程 */ }
}

/**
 * 设置音量并即时作用到当前 BGM。
 * @param {string} type 'bgm' | 'sfx'
 * @param {number} volume 0~1
 */
export function setVolume(type, volume) {
	const clamped = Math.max(0, Math.min(1, Number(volume) || 0))
	if (type === 'bgm') {
		audioState.bgmVolume = clamped
		if (bgmCtx) {
			try { bgmCtx.volume = clamped } catch (e) {}
		}
	} else if (type === 'sfx') {
		audioState.sfxVolume = clamped
	}
}

/** 获取当前音量 */
export function getVolume(type) {
	return type === 'bgm' ? audioState.bgmVolume : audioState.sfxVolume
}

/** 当前音效是否开启（供页面判断是否需要播放） */
export function isMusicEnabled() {
	return isAudioEnabled()
}

/**
 * 设置变更后调用：关闭→停掉全部音频；开启→不主动起播（由当前页面在自身生命周期里恢复，
 * 避免在"我的"等页面误起街景 BGM）。这样设置抽屉里的"音效"开关立刻生效。
 */
export function syncAudioSettings() {
	if (isAudioEnabled()) {
		// 若当前页已有 BGM 上下文（如就在街景里切开关），续播；否则交给页面自身恢复
		if (bgmCtx) {
			try { bgmCtx.play() } catch (e) {}
		}
	} else {
		destroyBgmCtx()
		clearSfxPool()
	}
}

/** 音效名称常量 */
export const SFX = {
	COIN: 'coin',
	LEVEL_UP: 'level_up',
	QUEST_COMPLETE: 'quest_complete',
	QUEST_START: 'quest_start',
	BUTTON_CLICK: 'button_click',
	REWARD: 'reward',
	ACHIEVEMENT: 'achievement',
	NPC_TALK: 'npc_talk',
	FOOTSTEP: 'footstep',
	DOOR_OPEN: 'door_open'
}

/** 背景音乐名称常量 */
export const BGM = {
	ANCIENT_CITY: 'ancient_city',
	STREET_AMBIENT: 'street_ambient',
	SHOP: 'shop',
	MENU: 'menu'
}

export default {
	playBGM,
	stopBGM,
	pauseBGM,
	resumeBGM,
	playSFX,
	setVolume,
	getVolume,
	isMusicEnabled,
	syncAudioSettings,
	SFX,
	BGM
}
