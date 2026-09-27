import test from 'node:test'
import assert from 'node:assert/strict'

import {
	DEFAULT_MAP_BOUNDS,
	getCurrentLocation,
	getLocationSnapshot,
	isLocationWithinMapBounds,
	projectLocationToMap,
	resolvePlayerMapPosition,
	saveLocationSnapshot,
	validateLocation,
	wgs84ToGcj02
} from '../src/平遥古城沉浸式游戏/common/utils/location.js'

test('rejects invalid coordinates and normalizes valid location', () => {
	assert.equal(validateLocation({ latitude: 0, longitude: 112 }), null)
	for (const latitude of [null, '', true]) {
		assert.equal(validateLocation({ latitude, longitude: 112.18 }), null)
	}
	for (const longitude of [null, '', false]) {
		assert.equal(validateLocation({ latitude: 37.2, longitude }), null)
	}
	assert.deepEqual(
		validateLocation({ latitude: 37.2, longitude: 112.18, accuracy: 12 }),
		{ latitude: 37.2, longitude: 112.18, accuracy: 12, speed: 0, heading: 0, timestamp: 0, source: 'device' }
	)
})

test('uses a coarse Pingyao old city bounding box', () => {
	assert.deepEqual(DEFAULT_MAP_BOUNDS, {
		minLatitude: 37.195,
		maxLatitude: 37.219,
		minLongitude: 112.17,
		maxLongitude: 112.2
	})
})

test('projects coordinates into the map percentage bounds and clamps GPS drift', () => {
	const bounds = { minLatitude: 37.19, maxLatitude: 37.21, minLongitude: 112.16, maxLongitude: 112.18 }
	assert.deepEqual(projectLocationToMap({ latitude: 37.2, longitude: 112.17 }, bounds), { x: 50, y: 50 })
	assert.deepEqual(projectLocationToMap({ latitude: 37.5, longitude: 111 }, bounds), { x: 0, y: 0 })
	assert.equal(projectLocationToMap({ latitude: 37.2, longitude: 112.17 }, null), null)
	assert.equal(projectLocationToMap({ latitude: 37.2, longitude: 112.17 }, { ...bounds, minLatitude: NaN }), null)
})

test('prefers in-city GPS position and falls back for invalid or out-of-city snapshots', () => {
	const bounds = { minLatitude: 37.19, maxLatitude: 37.21, minLongitude: 112.16, maxLongitude: 112.18 }
	assert.deepEqual(
		resolvePlayerMapPosition({ latitude: 37.2, longitude: 112.17 }, { x: 12, y: 88 }, bounds),
		{ x: 50, y: 50 }
	)
	assert.deepEqual(resolvePlayerMapPosition(null, { x: 12, y: 88 }, bounds), { x: 12, y: 88 })
	assert.deepEqual(resolvePlayerMapPosition({ latitude: 39.9, longitude: 116.4 }, { x: 12, y: 88 }, bounds), { x: 12, y: 88 })
	assert.equal(isLocationWithinMapBounds({ latitude: 37.2, longitude: 112.17 }, bounds), true)
	assert.equal(isLocationWithinMapBounds({ latitude: 39.9, longitude: 116.4 }, bounds), false)
	assert.equal(isLocationWithinMapBounds({ latitude: 37.2, longitude: 112.17 }, null), false)
})

function distanceMeters(a, b) {
	const rad = Math.PI / 180
	const dLat = (b.latitude - a.latitude) * rad
	const dLng = (b.longitude - a.longitude) * rad
	const h = Math.sin(dLat / 2) ** 2 +
		Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2
	return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

test('converts WGS84 to GCJ02 inside China and leaves foreign coordinates unchanged', () => {
	const wgs = { latitude: 37.2, longitude: 112.18 }
	const gcj = wgs84ToGcj02(wgs)
	// 国测局偏移在平遥一带为数百米量级，且纬度、经度均向东北偏移。
	const offset = distanceMeters(wgs, gcj)
	assert.ok(offset > 100 && offset < 800, `offset=${offset}`)
	assert.ok(gcj.latitude > wgs.latitude && gcj.longitude > wgs.longitude)
	// 回归锚点：锁定当前算法输出，防止常量或公式被误改。
	assert.ok(Math.abs(gcj.latitude - 37.200606) < 0.000001, `lat=${gcj.latitude}`)
	assert.ok(Math.abs(gcj.longitude - 112.186502) < 0.000001, `lng=${gcj.longitude}`)

	assert.deepEqual(wgs84ToGcj02({ latitude: 51.5, longitude: -0.12 }), { latitude: 51.5, longitude: -0.12 })
	assert.deepEqual(wgs84ToGcj02({ latitude: 35.68, longitude: 139.76 }), { latitude: 35.68, longitude: 139.76 })
})

test('requests WGS84 from the device and returns locally converted GCJ02', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = {
		getLocation(options) {
			assert.equal(options.type, 'wgs84')
			assert.equal(options.isHighAccuracy, true)
			assert.equal(options.highAccuracyExpireTime, 5000)
			return Promise.resolve({ latitude: 37.2, longitude: 112.18, accuracy: 8 })
		}
	}

	try {
		const before = Date.now()
		const result = await getCurrentLocation()
		const expected = wgs84ToGcj02({ latitude: 37.2, longitude: 112.18 })
		assert.deepEqual(result, {
			latitude: expected.latitude,
			longitude: expected.longitude,
			accuracy: 8,
			speed: 0,
			heading: 0,
			timestamp: result.timestamp,
			source: 'device'
		})
		assert.ok(result.timestamp >= before && result.timestamp <= Date.now())
	} finally {
		globalThis.uni = previousUni
	}
})

test('supports the callback style of uni.getLocation', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = {
		getLocation({ success }) {
			setTimeout(() => success({ latitude: 37.2, longitude: 112.18, accuracy: 8 }), 0)
		}
	}
	try {
		const result = await getCurrentLocation()
		assert.deepEqual(
			{ latitude: result.latitude, longitude: result.longitude },
			wgs84ToGcj02({ latitude: 37.2, longitude: 112.18 })
		)
	} finally {
		globalThis.uni = previousUni
	}
})

test('rejects with the platform error message when location fails', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = {
		getLocation({ fail }) {
			fail({ errMsg: 'getLocation:fail auth deny' })
		}
	}
	try {
		await assert.rejects(getCurrentLocation(), /auth deny/)
	} finally {
		globalThis.uni = previousUni
	}
})

test('rejects instead of hanging when the platform never answers', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = { getLocation() {} }
	try {
		await assert.rejects(getCurrentLocation({ timeoutMs: 20 }), /定位超时/)
	} finally {
		globalThis.uni = previousUni
	}
})

test('saves and reads a validated location snapshot without throwing', () => {
	const previousUni = globalThis.uni
	const storage = new Map()
	globalThis.uni = {
		getStorageSync(key) {
			return storage.get(key)
		},
		setStorageSync(key, value) {
			storage.set(key, value)
		}
	}
	const location = { latitude: 37.2, longitude: 112.18, accuracy: 8 }

	try {
		assert.deepEqual(saveLocationSnapshot(location), {
			latitude: 37.2,
			longitude: 112.18,
			accuracy: 8,
			speed: 0,
			heading: 0,
			timestamp: 0,
			source: 'device'
		})
		assert.deepEqual(getLocationSnapshot(), {
			latitude: 37.2,
			longitude: 112.18,
			accuracy: 8,
			speed: 0,
			heading: 0,
			timestamp: 0,
			source: 'device'
		})
	} finally {
		globalThis.uni = previousUni
	}
})
