import test from 'node:test'
import assert from 'node:assert/strict'

import { getTencentLbsConfig, reverseGeocode, searchNearby, walkingRoute } from '../src/平遥古城沉浸式游戏/common/utils/tencent-lbs.js'

const LOCATION = { latitude: 36, longitude: 112 }
const DESTINATION = { latitude: 36.001, longitude: 112.001 }

function enableTencentLbs(overrides = {}) {
	globalThis.__PYGC_CONFIG__ = { tencentLbs: { key: 'test-key', proxyUrl: 'https://proxy.test/tencent', ...overrides } }
}

function respondWith(response) {
	globalThis.uni = { request: ({ success }) => success(response) }
}

test.afterEach(() => {
	delete globalThis.__PYGC_CONFIG__
	delete globalThis.uni
})

test('配置缺失时禁用腾讯服务', async () => {
	globalThis.__PYGC_CONFIG__ = {}
	assert.deepEqual(getTencentLbsConfig(), { enabled: false, key: '', proxyUrl: '' })
	assert.deepEqual(await reverseGeocode(LOCATION), { status: 'disabled' })
})

test('key 和代理齐全且 enabled 缺省时保持兼容启用', () => {
	enableTencentLbs()
	assert.deepEqual(getTencentLbsConfig(), { enabled: true, key: 'test-key', proxyUrl: 'https://proxy.test/tencent' })
})

test('enabled 显式为 false 时短路且不发请求', async () => {
	enableTencentLbs({ enabled: false })
	let requested = false
	globalThis.uni = { request: () => {
		requested = true
		throw new Error('显式关闭时不应发起请求')
	} }
	assert.equal(getTencentLbsConfig().enabled, false)
	assert.deepEqual(await reverseGeocode(LOCATION), { status: 'disabled' })
	assert.equal(requested, false)
})

test('缺少 key 时配置的 enabled 与实际禁用状态一致', () => {
	enableTencentLbs({ enabled: true, key: '' })
	assert.equal(getTencentLbsConfig().enabled, false)
})

test('规范化步行路线并保留腾讯压缩点串', async () => {
	enableTencentLbs()
	let requestOptions
	globalThis.uni = { request: (options) => {
		requestOptions = options
		options.success({ statusCode: 200, data: { status: 0, result: { routes: [{ distance: 420, duration: 7, polyline: [36, 112, 1, 2] }] } } })
	} }
	assert.deepEqual(await walkingRoute(LOCATION, DESTINATION), {
		status: 'success', data: { distance: 420, duration: 7, polyline: [36, 112, 1, 2] }
	})
	assert.match(requestOptions.url, /^https:\/\/proxy\.test\/tencent\/ws\/direction\/v1\/walking\?/)
	assert.match(requestOptions.url, /key=test-key/)
	assert.match(requestOptions.url, /from=36%2C112/)
})

test('按腾讯真实结构规范化逆地址和附近搜索响应', async () => {
	enableTencentLbs()
	const requests = []
	globalThis.uni = { request: (options) => {
		requests.push(options)
		if (options.url.includes('/geocoder/')) {
			options.success({ statusCode: 200, data: { status: 0, result: { address: '平遥古城', address_component: { city: '晋中市' } } } })
			return
		}
		options.success({ statusCode: 200, data: { status: 0, count: 1, data: [{ id: 'poi-1', title: '日升昌票号' }] } })
	} }
	assert.deepEqual(await reverseGeocode(LOCATION), {
		status: 'success', data: { address: '平遥古城', address_component: { city: '晋中市' } }
	})
	assert.deepEqual(await searchNearby('票号', LOCATION), {
		status: 'success', data: [{ id: 'poi-1', title: '日升昌票号' }]
	})
	assert.match(requests[1].url, /keyword=%E7%A5%A8%E5%8F%B7/)
})

test('拒绝 null、空串和布尔坐标', async () => {
	enableTencentLbs()
	let requestCount = 0
	globalThis.uni = { request: () => {
		requestCount += 1
		throw new Error('无效坐标不应发起请求')
	} }
	const invalidLocations = [
		{ latitude: null, longitude: 112 },
		{ latitude: '', longitude: 112 },
		{ latitude: false, longitude: 112 },
		{ latitude: 36, longitude: true }
	]
	for (const location of invalidLocations) {
		assert.equal((await reverseGeocode(location)).status, 'error')
		assert.equal((await searchNearby('票号', location)).status, 'error')
		assert.equal((await walkingRoute(location, DESTINATION)).status, 'error')
	}
	assert.equal(requestCount, 0)
})

test('拒绝超出腾讯限制或非有限的附近搜索选项', async () => {
	enableTencentLbs()
	let requestCount = 0
	globalThis.uni = { request: () => {
		requestCount += 1
		throw new Error('无效选项不应发起请求')
	} }
	const invalidOptions = [
		{ radius: 9 }, { radius: 1001 }, { radius: Infinity },
		{ pageSize: 0 }, { pageSize: 21 }, { pageSize: 1.5 }, { pageSize: NaN }
	]
	for (const options of invalidOptions) assert.equal((await searchNearby('票号', LOCATION, options)).status, 'error')
	assert.equal(requestCount, 0)
})

test('将请求 fail、同步抛错和缺失响应转换为稳定错误', async (t) => {
	enableTencentLbs()
	const cases = [
		{ name: 'fail', request: ({ fail }) => fail({ errMsg: 'network down' }) },
		{ name: 'throw', request: () => { throw new Error('request crashed') } },
		{ name: 'missing response', request: ({ success }) => success() }
	]
	for (const item of cases) await t.test(item.name, async () => {
		enableTencentLbs()
		globalThis.uni = { request: item.request }
		assert.equal((await reverseGeocode(LOCATION)).status, 'error')
	})
})

test('严格检查 HTTP 和腾讯状态', async (t) => {
	enableTencentLbs()
	const responses = [
		{ statusCode: '200', data: { status: 0, result: { address: '平遥古城' } } },
		{ statusCode: 500, data: {} },
		{ statusCode: 200, data: { status: '0', result: { address: '平遥古城' } } },
		{ statusCode: 200, data: { status: 1, message: 'invalid key' } }
	]
	for (const response of responses) await t.test(JSON.stringify(response), async () => {
		enableTencentLbs()
		respondWith(response)
		assert.equal((await reverseGeocode(LOCATION)).status, 'error')
	})
})

test('拒绝接口各自的畸形成功响应', async (t) => {
	enableTencentLbs()
	const cases = [
		{ name: '逆地址缺少 address', response: { statusCode: 200, data: { status: 0, result: {} } }, invoke: () => reverseGeocode(LOCATION) },
		{ name: '搜索误用 result.data', response: { statusCode: 200, data: { status: 0, result: { data: [] } } }, invoke: () => searchNearby('票号', LOCATION) },
		{ name: '路线缺少 routes', response: { statusCode: 200, data: { status: 0, result: {} } }, invoke: () => walkingRoute(LOCATION, DESTINATION) },
		{ name: '路线为空', response: { statusCode: 200, data: { status: 0, result: { routes: [] } } }, invoke: () => walkingRoute(LOCATION, DESTINATION) }
	]
	for (const item of cases) await t.test(item.name, async () => {
		enableTencentLbs()
		respondWith(item.response)
		assert.equal((await item.invoke()).status, 'error')
	})
})

test('拒绝无效路线数值和点串', async (t) => {
	enableTencentLbs()
	const invalidRoutes = [
		{ distance: -1, duration: 7, polyline: [36, 112] },
		{ distance: 1, duration: -1, polyline: [36, 112] },
		{ distance: '420', duration: 7, polyline: [36, 112] },
		{ distance: 420, duration: 7, polyline: [36, 112, 1] },
		{ distance: 420, duration: 7, polyline: [36, '112'] },
		{ distance: 420, duration: 7, polyline: [] }
	]
	for (const route of invalidRoutes) await t.test(JSON.stringify(route), async () => {
		enableTencentLbs()
		respondWith({ statusCode: 200, data: { status: 0, result: { routes: [route] } } })
		assert.equal((await walkingRoute(LOCATION, DESTINATION)).status, 'error')
	})
})
