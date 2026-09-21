import test from 'node:test'
import assert from 'node:assert/strict'

import {
	getTencentLbsConfig,
	reverseGeocode,
	searchNearby,
	walkingRoute
} from '../src/平遥古城沉浸式游戏/common/utils/tencent-lbs.js'

test.afterEach(() => {
	delete globalThis.__PYGC_CONFIG__
	delete globalThis.uni
})

test('does not request Tencent services when configuration is absent', async () => {
	globalThis.__PYGC_CONFIG__ = {}
	assert.deepEqual(getTencentLbsConfig(), { enabled: false, key: '', proxyUrl: '' })
	assert.deepEqual(await reverseGeocode({ latitude: 36.01, longitude: 112.18 }), { status: 'disabled' })
})

test('normalizes a walking route response', async () => {
	globalThis.__PYGC_CONFIG__ = { tencentLbs: { key: 'test-key', proxyUrl: 'https://proxy.test/tencent' } }
	let requestOptions
	globalThis.uni = {
		request: (options) => {
			requestOptions = options
			options.success({
				statusCode: 200,
				data: { status: 0, result: { routes: [{ distance: 420, duration: 7, polyline: [36, 112] }] } }
			})
		}
	}

	const result = await walkingRoute({ latitude: 36, longitude: 112 }, { latitude: 36.001, longitude: 112.001 })
	assert.deepEqual(result, { status: 'success', data: { distance: 420, duration: 7, polyline: [36, 112] } })
	assert.match(requestOptions.url, /^https:\/\/proxy\.test\/tencent\/ws\/direction\/v1\/walking\?/)
	assert.match(requestOptions.url, /key=test-key/)
	assert.match(requestOptions.url, /from=36%2C112/)
})

test('normalizes reverse geocoding and nearby search results', async () => {
	globalThis.__PYGC_CONFIG__ = { tencentLbs: { key: 'test-key', proxyUrl: 'https://proxy.test/tencent/' } }
	const requests = []
	globalThis.uni = {
		request: (options) => {
			requests.push(options)
			if (options.url.includes('/geocoder/')) {
				options.success({ statusCode: 200, data: { status: 0, result: { address: '平遥古城', address_component: { city: '晋中市' } } } })
			} else {
				options.success({ statusCode: 200, data: { status: 0, result: { data: [{ id: 'poi-1', title: '日升昌票号' }] } } })
			}
		}
	}

	assert.deepEqual(await reverseGeocode({ latitude: 36, longitude: 112 }), {
		status: 'success',
		data: { address: '平遥古城', address_component: { city: '晋中市' } }
	})
	assert.deepEqual(await searchNearby('票号', { latitude: 36, longitude: 112 }), {
		status: 'success',
		data: { data: [{ id: 'poi-1', title: '日升昌票号' }] }
	})
	assert.match(requests[1].url, /keyword=%E7%A5%A8%E5%8F%B7/)
})

test('returns stable errors for HTTP, Tencent and malformed route responses', { concurrency: false }, async (t) => {
	globalThis.__PYGC_CONFIG__ = { tencentLbs: { key: 'test-key', proxyUrl: 'https://proxy.test/tencent' } }
	const cases = [
		{ response: { statusCode: 500, data: {} }, message: 'HTTP 500' },
		{ response: { statusCode: 200, data: { status: 1, message: 'invalid key' } }, message: 'invalid key' },
		{ response: { statusCode: 200, data: { status: 0, result: { routes: [] } } }, message: '路线为空' },
		{ response: { statusCode: 200, data: { status: 0, result: {} } }, message: '路线响应格式无效' }
	]

	for (const item of cases) {
		await t.test(item.message, async () => {
			globalThis.__PYGC_CONFIG__ = { tencentLbs: { key: 'test-key', proxyUrl: 'https://proxy.test/tencent' } }
			globalThis.uni = { request: (options) => options.success(item.response) }
			const result = await walkingRoute({ latitude: 36, longitude: 112 }, { latitude: 36.001, longitude: 112.001 })
			assert.equal(result.status, 'error')
			assert.match(result.error, new RegExp(item.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
		})
	}
})
