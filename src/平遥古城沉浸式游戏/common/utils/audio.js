/**
 * 音效管理工具（占位实现）
 * 当前仅打印日志，后续可接入真实音频文件
 */

const audioState = {
	bgmVolume: 0.6,
	sfxVolume: 0.8,
	currentBGM: null
}

/**
 * 播放背景音乐
 * @param {string} name - 音乐名称（如 'ancient_city', 'street_ambient'）
 * @param {boolean} loop - 是否循环播放
 */
export function playBGM(name, loop = true) {
	console.log(`[Audio] 播放背景音乐: ${name}, 循环: ${loop}, 音量: ${audioState.bgmVolume}`)
	audioState.currentBGM = name
}

/**
 * 停止背景音乐
 */
export function stopBGM() {
	if (audioState.currentBGM) {
		console.log(`[Audio] 停止背景音乐: ${audioState.currentBGM}`)
		audioState.currentBGM = null
	}
}

/**
 * 播放音效
 * @param {string} name - 音效名称（如 'coin', 'level_up', 'quest_complete', 'button_click'）
 */
export function playSFX(name) {
	console.log(`[Audio] 播放音效: ${name}, 音量: ${audioState.sfxVolume}`)
}

/**
 * 设置音量
 * @param {string} type - 'bgm' 或 'sfx'
 * @param {number} volume - 音量 0-1
 */
export function setVolume(type, volume) {
	const clampedVolume = Math.max(0, Math.min(1, volume))
	if (type === 'bgm') {
		audioState.bgmVolume = clampedVolume
		console.log(`[Audio] 设置背景音乐音量: ${clampedVolume}`)
	} else if (type === 'sfx') {
		audioState.sfxVolume = clampedVolume
		console.log(`[Audio] 设置音效音量: ${clampedVolume}`)
	}
}

/**
 * 获取当前音量
 * @param {string} type - 'bgm' 或 'sfx'
 * @returns {number}
 */
export function getVolume(type) {
	return type === 'bgm' ? audioState.bgmVolume : audioState.sfxVolume
}

/**
 * 音效名称常量
 */
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

/**
 * 背景音乐名称常量
 */
export const BGM = {
	ANCIENT_CITY: 'ancient_city',
	STREET_AMBIENT: 'street_ambient',
	SHOP: 'shop',
	MENU: 'menu'
}
