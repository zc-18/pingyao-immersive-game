import { STORAGE_KEYS, getStorage } from './storage.js'

const state = { bgmVolume: 0.32, sfxVolume: 0.65, desired: null, current: null, loop: true }
let bgm = null
let suspended = false
let gestureBound = false
const pool = new Set()
const isBrowser = () => typeof window !== 'undefined' && typeof window.Audio === 'function'
export function isMusicEnabled() { return getStorage(STORAGE_KEYS.gameSettings, {}).enableMusic !== false }

function resolveSrc(name, kind) {
	if (/^(https?:|blob:|file:|\/)/.test(name)) return name
	const relative = 'static/audio/' + kind + '_' + name + '.wav'
	if (isBrowser()) return new URL(relative, document.baseURI).href
	return '/' + relative
}

// 浏览器 Audio 元素：自动播放被拒绝时等待下一次用户手势再恢复。
function createContext() {
	if (!isBrowser()) throw new Error('Audio unavailable')
	const audio = new window.Audio()
	return {
		set src(value) { audio.src = value },
		set loop(value) { audio.loop = value },
		set volume(value) { audio.volume = value },
		play: () => audio.play(),
		pause: () => audio.pause(),
		destroy() { audio.pause(); audio.removeAttribute('src'); audio.load() },
		onEnded: (fn) => audio.addEventListener('ended', fn),
		onError: (fn) => audio.addEventListener('error', fn)
	}
}
function safePlay(ctx, rejected = () => {}) {
	try { ctx.play()?.catch?.(rejected) } catch (error) { rejected(error) }
}
function destroy(ctx) {
	try { ctx.pause() } catch (error) {}
	try { ctx.destroy() } catch (error) {}
}
function clearBgm() {
	const ctx = bgm
	bgm = null
	state.current = null
	if (ctx) destroy(ctx)
}
function clearSfx() {
	for (const ctx of [...pool]) { pool.delete(ctx); destroy(ctx) }
}
function unbindGesture() {
	if (!gestureBound || typeof document === 'undefined') return
	document.removeEventListener('pointerdown', unlockAudio)
	document.removeEventListener('keydown', unlockAudio)
	gestureBound = false
}
function unlockAudio() {
	if (!suspended && isMusicEnabled()) { unbindGesture(); resumeBGM() }
}
function waitForGesture() {
	if (gestureBound || !isBrowser() || suspended || !bgm || !state.desired) return
	gestureBound = true
	document.addEventListener('pointerdown', unlockAudio)
	document.addEventListener('keydown', unlockAudio)
}
export function playBGM(name, loop = true) {
	state.desired = name
	state.loop = loop
	if (!name || suspended || !isMusicEnabled()) return
	if (bgm && state.current === name) { safePlay(bgm, waitForGesture); return }
	clearBgm()
	try {
		const ctx = createContext()
		bgm = ctx
		state.current = name
		ctx.src = resolveSrc(name, 'bgm')
		ctx.loop = loop
		ctx.volume = state.bgmVolume
		ctx.onError(() => { if (bgm === ctx) clearBgm() })
		safePlay(ctx, waitForGesture)
	} catch (error) { clearBgm() }
}
export function stopBGM() { state.desired = null; unbindGesture(); clearBgm(); clearSfx() }
export function pauseBGM() {
	suspended = true
	unbindGesture()
	try { bgm?.pause() } catch (error) {}
	clearSfx()
}
export function resumeBGM() {
	suspended = false
	if (isMusicEnabled() && state.desired) playBGM(state.desired, state.loop)
}
export function playSFX(name) {
	if (!name || suspended || !isMusicEnabled() || pool.size >= 6) return
	let ctx
	const cleanup = () => { if (pool.delete(ctx)) destroy(ctx) }
	try {
		ctx = createContext()
		pool.add(ctx)
		ctx.src = resolveSrc(name, 'sfx')
		ctx.volume = state.sfxVolume
		ctx.onEnded(cleanup)
		ctx.onError(cleanup)
		safePlay(ctx, cleanup)
	} catch (error) { cleanup() }
}
export function setVolume(type, volume) {
	const value = Math.max(0, Math.min(1, Number(volume) || 0))
	if (type === 'bgm') { state.bgmVolume = value; if (bgm) bgm.volume = value }
	else if (type === 'sfx') state.sfxVolume = value
}
export function getVolume(type) { return type === 'bgm' ? state.bgmVolume : state.sfxVolume }
export function syncAudioSettings() {
	if (!isMusicEnabled()) { clearBgm(); clearSfx(); unbindGesture() }
	else if (!suspended && state.desired) resumeBGM()
}
export const SFX = {
	COIN: 'coin', LEVEL_UP: 'level_up', QUEST_COMPLETE: 'quest_complete', QUEST_START: 'quest_start',
	BUTTON_CLICK: 'button_click', REWARD: 'reward', ACHIEVEMENT: 'achievement', NPC_TALK: 'npc_talk',
	FOOTSTEP: 'footstep', DOOR_OPEN: 'door_open'
}
export const BGM = { ANCIENT_CITY: 'ancient_city', STREET_AMBIENT: 'street_ambient', SHOP: 'shop', MENU: 'menu' }
export default { playBGM, stopBGM, pauseBGM, resumeBGM, playSFX, setVolume, getVolume, isMusicEnabled, syncAudioSettings, SFX, BGM }
