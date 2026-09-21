import { STORAGE_KEYS, getStorage, patchStorageObject } from './storage.js'

const DEFAULT_MAP_BOUNDS = {
	// 仅用于首版地图估算，尚未通过实测轨迹校准。
	minLatitude: 37.195,
	maxLatitude: 37.219,
	minLongitude: 112.17,
	maxLongitude: 112.2
}

function finiteNumber(value, fallback = 0) {
	if (value === null || value === '' || typeof value === 'boolean') return fallback
	const number = Number(value)
	return Number.isFinite(number) ? number : fallback
}

function coordinateNumber(value) {
	if (value === null || value === '' || typeof value === 'boolean') return null
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

function normalizeBounds(bounds) {
	if (!bounds || typeof bounds !== 'object') return null
	const minLatitude = coordinateNumber(bounds.minLatitude)
	const maxLatitude = coordinateNumber(bounds.maxLatitude)
	const minLongitude = coordinateNumber(bounds.minLongitude)
	const maxLongitude = coordinateNumber(bounds.maxLongitude)
	if (minLatitude === null || maxLatitude === null || minLongitude === null || maxLongitude === null) return null
	if (!(maxLatitude > minLatitude) || !(maxLongitude > minLongitude)) return null
	return { minLatitude, maxLatitude, minLongitude, maxLongitude }
}

export function validateLocation(location) {
	if (!location || typeof location !== 'object') return null
	const latitude = coordinateNumber(location.latitude)
	const longitude = coordinateNumber(location.longitude)
	if (latitude === null || longitude === null) return null
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

	const normalizedBounds = normalizeBounds(bounds)
	if (!normalizedBounds) return null
	const { minLatitude, maxLatitude, minLongitude, maxLongitude } = normalizedBounds

	const clamp = (value) => Math.min(100, Math.max(0, value))
	const roundPercentage = (value) => Math.round(clamp(value) * 100) / 100
	return {
		x: roundPercentage(((normalized.longitude - minLongitude) / (maxLongitude - minLongitude)) * 100),
		y: roundPercentage(((maxLatitude - normalized.latitude) / (maxLatitude - minLatitude)) * 100)
	}
}

export function isLocationWithinMapBounds(location, bounds = DEFAULT_MAP_BOUNDS) {
	const normalized = validateLocation(location)
	const normalizedBounds = normalizeBounds(bounds)
	if (!normalized || !normalizedBounds) return false
	return normalized.latitude >= normalizedBounds.minLatitude && normalized.latitude <= normalizedBounds.maxLatitude &&
		normalized.longitude >= normalizedBounds.minLongitude && normalized.longitude <= normalizedBounds.maxLongitude
}

export function resolvePlayerMapPosition(location, fallback, bounds = DEFAULT_MAP_BOUNDS) {
	if (!isLocationWithinMapBounds(location, bounds)) return fallback
	return projectLocationToMap(location, bounds) || fallback
}

export function getCurrentLocation() {
	return new Promise((resolve, reject) => {
		if (!globalThis.uni || typeof globalThis.uni.getLocation !== 'function') {
			reject(new Error('uni.getLocation is unavailable'))
			return
		}
		let settled = false
		const success = (result) => {
			if (settled) return
			const normalized = validateLocation({ ...result, timestamp: Date.now() })
			settled = true
			if (normalized) resolve(normalized)
			else reject(new Error('定位结果无效'))
		}
		const fail = (error) => {
			if (settled) return
			settled = true
			reject(error instanceof Error ? error : new Error(error?.errMsg || '定位失败'))
		}
		try {
			const result = globalThis.uni.getLocation({
				type: 'gcj02',
				isHighAccuracy: true,
				highAccuracyExpireTime: 5000,
				timeout: 10000,
				success,
				fail
			})
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
