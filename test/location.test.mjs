import { installNavigator, installLocalStorage } from './helpers/browser-env.mjs'
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
} from '../src/common/utils/location.js'

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

test('浏览器定位返回本地转换的 GCJ02，并设置高精度选项', async (t) => {
	const restore = installNavigator({ geolocation: { getCurrentPosition(success, fail, options) {
		assert.equal(options.enableHighAccuracy, true)
		assert.equal(options.maximumAge, 5000)
		queueMicrotask(() => success({ coords: { latitude: 37.2, longitude: 112.18, accuracy: 8 } }))
	} } })
	t.after(restore)
	const result = await getCurrentLocation()
	assert.deepEqual({ latitude: result.latitude, longitude: result.longitude }, wgs84ToGcj02({ latitude: 37.2, longitude: 112.18 }))
	assert.equal(result.accuracy, 8)
	assert.ok(result.timestamp > 0)
})

test('定位错误码映射中文，缺失接口和畸形结果拒绝', async () => {
	for (const [code, message] of [[1, '定位权限被拒绝'], [2, '暂时无法获取位置'], [3, '定位超时']]) {
		const restore = installNavigator({ geolocation: { getCurrentPosition(success, fail) { fail({ code }) } } })
		try { await assert.rejects(getCurrentLocation(), { message }) } finally { restore() }
	}
	let restore = installNavigator()
	try { await assert.rejects(getCurrentLocation(), /不支持定位/) } finally { restore() }
	restore = installNavigator({ geolocation: { getCurrentPosition(success) { success({ coords: {} }) } } })
	try { await assert.rejects(getCurrentLocation(), /定位结果无效/) } finally { restore() }
})

test('永不回调时超时拒绝，迟到成功不会改变结果', async (t) => {
	let late
	const restore = installNavigator({ geolocation: { getCurrentPosition(success) { late = success } } })
	t.after(restore)
	await assert.rejects(getCurrentLocation({ timeoutMs: 10 }), /定位超时/)
	assert.doesNotThrow(() => late({ coords: { latitude: 37.2, longitude: 112.18 } }))
})

test('保存读取定位快照，写失败和不可用存储不抛错', (t) => {
	const env = installLocalStorage()
	t.after(() => env.uninstall())
	const location = { latitude: 37.2, longitude: 112.18, accuracy: 8 }
	assert.deepEqual(saveLocationSnapshot(location), validateLocation(location))
	assert.deepEqual(getLocationSnapshot(), validateLocation(location))
	env.state.failWrites = true
	assert.equal(saveLocationSnapshot({ ...location, accuracy: 9 }), null)
	assert.deepEqual(getLocationSnapshot(), validateLocation(location))
	assert.equal(saveLocationSnapshot({}), null)
	Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('blocked') } })
	assert.equal(getLocationSnapshot(), null)
	assert.equal(saveLocationSnapshot(location), null)
})
