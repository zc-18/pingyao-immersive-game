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
	validateLocation
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

test('wraps uni.getLocation with the GCJ02 option', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = {
		getLocation(options) {
			assert.equal(options.type, 'gcj02')
			assert.equal(options.isHighAccuracy, true)
			assert.equal(options.highAccuracyExpireTime, 5000)
			assert.equal(options.timeout, 10000)
			return Promise.resolve({ latitude: 37.2, longitude: 112.18, accuracy: 8 })
		}
	}

	try {
		const before = Date.now()
		const result = await getCurrentLocation()
		assert.deepEqual(result, {
			latitude: 37.2,
			longitude: 112.18,
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
