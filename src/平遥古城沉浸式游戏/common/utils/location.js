import { STORAGE_KEYS, getStorage, patchStorageObject } from './storage.js'

const DEFAULT_MAP_BOUNDS = {
	minLatitude: 36.0001,
	maxLatitude: 36.025,
	minLongitude: 112.16,
	maxLongitude: 112.2
}

function finiteNumber(value, fallback = 0) {
	const number = Number(value)
	return Number.isFinite(number) ? number : fallback
}

export function validateLocation(location) {
	if (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) {
		return null
	}

	const latitude = Number(location.latitude)
	const longitude = Number(location.longitude)
	if (latitude === 0 || longitude === 0 || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
		return null
	}

	return {
		latitude,
		longitude,
		accuracy: Math.max(0, finiteNumber(location.accuracy)),
		speed: Math.max(0, finiteNumber(location.speed)),
		heading: finiteNumber(location.heading),
		timestamp: Math.max(0, finiteNumber(location.timestamp)),
		source: 'device'
	}
}

export function projectLocationToMap(location, bounds = DEFAULT_MAP_BOUNDS) {
	const normalized = validateLocation(location)
	if (!normalized) return null

	const minLatitude = Number(bounds.minLatitude)
	const maxLatitude = Number(bounds.maxLatitude)
	const minLongitude = Number(bounds.minLongitude)
	const maxLongitude = Number(bounds.maxLongitude)
	if (!(maxLatitude > minLatitude) || !(maxLongitude > minLongitude)) return null

	const clamp = (value) => Math.min(100, Math.max(0, value))
	const roundPercentage = (value) => Math.round(clamp(value) * 100) / 100
	return {
		x: roundPercentage(((normalized.longitude - minLongitude) / (maxLongitude - minLongitude)) * 100),
		y: roundPercentage(((maxLatitude - normalized.latitude) / (maxLatitude - minLatitude)) * 100)
	}
}

export function resolvePlayerMapPosition(location, fallback, bounds = DEFAULT_MAP_BOUNDS) {
	return projectLocationToMap(location, bounds) || fallback
}

export function getCurrentLocation() {
	return new Promise((resolve, reject) => {
		if (!globalThis.uni || typeof globalThis.uni.getLocation !== 'function') {
			reject(new Error('uni.getLocation is unavailable'))
			return
		}
		const success = (result) => {
			const normalized = validateLocation(result)
			if (normalized) resolve(normalized)
			else reject(new Error('定位结果无效'))
		}
		const fail = (error) => reject(error instanceof Error ? error : new Error(error?.errMsg || '定位失败'))
		try {
			const result = globalThis.uni.getLocation({ type: 'gcj02', success, fail })
			if (result && typeof result.then === 'function') result.then(success).catch(fail)
		} catch (error) {
			fail(error)
		}
	})
}

export function saveLocationSnapshot(location) {
	const normalized = validateLocation(location)
	if (!normalized) return null
	try {
		patchStorageObject(STORAGE_KEYS.appRuntime, { locationSnapshot: normalized })
		return normalized
	} catch (_error) {
		return null
	}
}

export function getLocationSnapshot() {
	try {
		return validateLocation(getStorage(STORAGE_KEYS.appRuntime, {}).locationSnapshot)
	} catch (_error) {
		return null
	}
}

export { DEFAULT_MAP_BOUNDS }
