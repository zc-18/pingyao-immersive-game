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

/*
 * WGS84 → GCJ02（国测局坐标）本地换算。
 * 浏览器 navigator.geolocation 只输出 WGS84，地图与腾讯位置服务使用 GCJ02。
 * 这里取 WGS84 后在本地换算，无需任何 Key。
 * 公式为公开的 GCJ02 偏移近似算法，误差在米级，足够用于古城范围内的位置估算。
 */
const GCJ_A = 6378245.0
const GCJ_EE = 0.00669342162296594323

function isOutsideChina(latitude, longitude) {
	return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function transformLatitude(x, y) {
	let result = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
	result += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
	result += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0
	result += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0
	return result
}

function transformLongitude(x, y) {
	let result = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
	result += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0
	result += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0
	result += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0
	return result
}

export function wgs84ToGcj02({ latitude, longitude }) {
	if (isOutsideChina(latitude, longitude)) return { latitude, longitude }
	let dLat = transformLatitude(longitude - 105.0, latitude - 35.0)
	let dLng = transformLongitude(longitude - 105.0, latitude - 35.0)
	const radLat = latitude / 180.0 * Math.PI
	let magic = Math.sin(radLat)
	magic = 1 - GCJ_EE * magic * magic
	const sqrtMagic = Math.sqrt(magic)
	dLat = (dLat * 180.0) / ((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic) * Math.PI)
	dLng = (dLng * 180.0) / (GCJ_A / sqrtMagic * Math.cos(radLat) * Math.PI)
	return { latitude: latitude + dLat, longitude: longitude + dLng }
}

const LOCATION_TIMEOUT_MS = 15000
const GEOLOCATION_ERRORS = { 1: '定位权限被拒绝', 2: '暂时无法获取位置', 3: '定位超时' }

export function getCurrentLocation({ timeoutMs = LOCATION_TIMEOUT_MS } = {}) {
	return new Promise((resolve, reject) => {
		const geolocation = globalThis.navigator?.geolocation
		if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
			reject(new Error('当前浏览器不支持定位'))
			return
		}
		let settled = false
		// 授权弹窗被忽略或系统定位关闭时，浏览器可能既不成功也不失败；兜底超时避免界面一直“定位中”。
		const timer = setTimeout(() => {
			if (settled) return
			settled = true
			reject(new Error('定位超时'))
		}, timeoutMs)
		const success = (position) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			const wgs = validateLocation(position?.coords)
			if (!wgs) {
				reject(new Error('定位结果无效'))
				return
			}
			const gcj = wgs84ToGcj02(wgs)
			resolve(validateLocation({ ...wgs, ...gcj, timestamp: Date.now() }))
		}
		// GeolocationPositionError 不是 Error 子类：按错误码换成中文提示。
		const fail = (error) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			reject(error instanceof Error ? error : new Error(GEOLOCATION_ERRORS[error?.code] || error?.message || '定位失败'))
		}
		try {
			// 浏览器定位输出 WGS84，需 HTTPS 或 localhost。
			geolocation.getCurrentPosition(success, fail, { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 })
		} catch (error) {
			fail(error)
		}
	})
}

/* 保存最近一次定位；坐标无效或存档写入失败时返回 null，不抛错。 */
export function saveLocationSnapshot(location) {
	const normalized = validateLocation(location)
	if (!normalized) return null
	try {
		return patchStorageObject(STORAGE_KEYS.appRuntime, { locationSnapshot: normalized }) ? normalized : null
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
