import test from 'node:test'
import assert from 'node:assert/strict'

import {
	getCurrentLocation,
	getLocationSnapshot,
	projectLocationToMap,
	resolvePlayerMapPosition,
	saveLocationSnapshot,
	validateLocation
} from '../src/平遥古城沉浸式游戏/common/utils/location.js'

test('rejects invalid coordinates and normalizes valid location', () => {
	assert.equal(validateLocation({ latitude: 0, longitude: 112 }), null)
	assert.deepEqual(
		validateLocation({ latitude: 36.01, longitude: 112.18, accuracy: 12 }),
		{ latitude: 36.01, longitude: 112.18, accuracy: 12, speed: 0, heading: 0, timestamp: 0, source: 'device' }
	)
})

test('projects coordinates into the map percentage bounds and clamps GPS drift', () => {
	const bounds = { minLatitude: 36, maxLatitude: 36.02, minLongitude: 112.16, maxLongitude: 112.18 }
	assert.deepEqual(projectLocationToMap({ latitude: 36.01, longitude: 112.17 }, bounds), { x: 50, y: 50 })
	assert.deepEqual(projectLocationToMap({ latitude: 36.5, longitude: 111 }, bounds), { x: 0, y: 0 })
})

test('prefers projected GPS position and falls back when no valid snapshot exists', () => {
	const bounds = { minLatitude: 36, maxLatitude: 36.02, minLongitude: 112.16, maxLongitude: 112.18 }
	assert.deepEqual(
		resolvePlayerMapPosition({ latitude: 36.01, longitude: 112.17 }, { x: 12, y: 88 }, bounds),
		{ x: 50, y: 50 }
	)
	assert.deepEqual(resolvePlayerMapPosition(null, { x: 12, y: 88 }, bounds), { x: 12, y: 88 })
})

test('wraps uni.getLocation with the GCJ02 option', async () => {
	const previousUni = globalThis.uni
	globalThis.uni = {
		getLocation(options) {
			assert.equal(options.type, 'gcj02')
			return Promise.resolve({ latitude: 36.01, longitude: 112.18, accuracy: 8 })
		}
	}

	try {
		assert.deepEqual(await getCurrentLocation(), {
			latitude: 36.01,
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
	const location = { latitude: 36.01, longitude: 112.18, accuracy: 8 }

	try {
		assert.deepEqual(saveLocationSnapshot(location), {
			latitude: 36.01,
			longitude: 112.18,
			accuracy: 8,
			speed: 0,
			heading: 0,
			timestamp: 0,
			source: 'device'
		})
		assert.deepEqual(getLocationSnapshot(), {
			latitude: 36.01,
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
