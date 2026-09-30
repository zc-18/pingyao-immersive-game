import { STORAGE_KEYS, getStorage, patchStorageObject } from './storage.js'
import { syncAudioSettings } from './audio.js'

export function getGameplaySettings() {
	const saved = getStorage(STORAGE_KEYS.gameSettings, {})
	return { enableMusic: saved.enableMusic !== false, enableEffect: saved.enableEffect !== false }
}

export function updateGameplaySetting(key, enabled) {
	if (!['enableMusic', 'enableEffect'].includes(key) || typeof enabled !== 'boolean') return { ok: false, settings: getGameplaySettings() }
	const saved = patchStorageObject(STORAGE_KEYS.gameSettings, { [key]: enabled })
	if (!saved) return { ok: false, settings: getGameplaySettings() }
	if (key === 'enableMusic') syncAudioSettings()
	return { ok: true, settings: getGameplaySettings() }
}
