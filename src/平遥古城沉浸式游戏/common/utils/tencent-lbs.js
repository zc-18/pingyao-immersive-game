const DEFAULT_CONFIG = {
	enabled: false,
	key: '',
	proxyUrl: ''
}

function asString(value) {
	return typeof value === 'string' ? value.trim() : ''
}

export function getTencentLbsConfig() {
	const configured = globalThis.__PYGC_CONFIG__?.tencentLbs
	if (!configured || typeof configured !== 'object') return { ...DEFAULT_CONFIG }
	const key = asString(configured.key)
	const proxyUrl = asString(configured.proxyUrl)
	return {
		enabled: configured.enabled !== false && Boolean(key && proxyUrl),
		key,
		proxyUrl
	}
}

function unavailable(config) {
	return !config.enabled
}

function validCoordinate(location) {
	if (!location || typeof location !== 'object') return false
	const { latitude, longitude } = location
	return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
		typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

function coordinate(location) {
	return `${location.latitude},${location.longitude}`
}

function joinUrl(base, path) {
	return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function buildUrl(proxyUrl, endpoint, params) {
	const query = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&')
	return `${joinUrl(proxyUrl, endpoint)}${query ? `?${query}` : ''}`
}

function errorMessage(error) {
	if (error instanceof Error) return error.message
	if (typeof error?.errMsg === 'string' && error.errMsg) return error.errMsg
	return '请求失败'
}

function request(config, endpoint, params) {
	if (unavailable(config)) return Promise.resolve({ status: 'disabled' })
	if (!globalThis.uni || typeof globalThis.uni.request !== 'function') {
		return Promise.resolve({ status: 'error', error: 'uni.request 不可用' })
	}

	return new Promise((resolve) => {
		let settled = false
		const finish = (value) => {
			if (settled) return
			settled = true
			resolve(value)
		}
		const fail = (error) => finish({ status: 'error', error: errorMessage(error) })
		const succeed = (response) => {
			if (!response || typeof response.statusCode !== 'number' || !Number.isInteger(response.statusCode) || response.statusCode < 200 || response.statusCode >= 300) {
				finish({ status: 'error', error: `HTTP ${response?.statusCode ?? 0}` })
				return
			}
			const body = response.data
			if (!body || typeof body !== 'object' || Array.isArray(body)) {
				finish({ status: 'error', error: '响应格式无效' })
				return
			}
			if (body.status !== 0) {
				finish({ status: 'error', error: asString(body.message) || `腾讯服务错误（${body.status ?? '未知'}）` })
				return
			}
			finish({ status: 'success', data: body })
		}

		try {
			const result = globalThis.uni.request({
				url: buildUrl(config.proxyUrl, endpoint, { ...params, key: config.key }),
				method: 'GET',
				success: succeed,
				fail
			})
			if (result && typeof result.then === 'function') result.then(succeed).catch(fail)
		} catch (error) {
			fail(error)
		}
	})
}

function malformed(error) {
	return { status: 'error', error }
}

export async function reverseGeocode(location, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(location)) return malformed('定位坐标无效')
	const response = await request(config, options.endpoint || 'ws/geocoder/v1', {
		location: coordinate(location),
		get_poi: options.getPoi === false ? 0 : 1
	})
	if (response.status !== 'success') return response
	const result = response.data.result
	if (!result || typeof result !== 'object' || Array.isArray(result) || !asString(result.address)) {
		return malformed('逆地址响应格式无效')
	}
	return { status: 'success', data: result }
}

function validSearchOptions(options) {
	if (options.radius !== undefined &&
		(typeof options.radius !== 'number' || !Number.isFinite(options.radius) || options.radius < 10 || options.radius > 1000)) return false
	if (options.pageSize !== undefined &&
		(typeof options.pageSize !== 'number' || !Number.isInteger(options.pageSize) || options.pageSize < 1 || options.pageSize > 20)) return false
	return true
}

export async function searchNearby(keyword, location, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(location)) return malformed('定位坐标无效')
	const query = asString(keyword)
	if (!query) return malformed('搜索关键词不能为空')
	if (!validSearchOptions(options)) return malformed('附近搜索选项无效')
	const response = await request(config, options.endpoint || 'ws/place/v1/search', {
		keyword: query,
		boundary: `nearby(${coordinate(location)},${options.radius ?? 1000})`,
		page_size: options.pageSize
	})
	if (response.status !== 'success') return response
	if (!Array.isArray(response.data.data)) return malformed('附近搜索响应格式无效')
	return { status: 'success', data: response.data.data }
}

function validRoute(route) {
	return route && typeof route === 'object' &&
		typeof route.distance === 'number' && Number.isFinite(route.distance) && route.distance >= 0 &&
		typeof route.duration === 'number' && Number.isFinite(route.duration) && route.duration >= 0 &&
		Array.isArray(route.polyline) && route.polyline.length > 0 && route.polyline.length % 2 === 0 &&
		route.polyline.every((value) => typeof value === 'number' && Number.isFinite(value))
}

export async function walkingRoute(from, to, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(from) || !validCoordinate(to)) return malformed('路线坐标无效')
	const response = await request(config, options.endpoint || 'ws/direction/v1/walking', {
		from: coordinate(from),
		to: coordinate(to)
	})
	if (response.status !== 'success') return response
	const routes = response.data.result?.routes
	if (!Array.isArray(routes)) return malformed('路线响应格式无效')
	if (routes.length === 0) return malformed('路线为空')
	const route = routes[0]
	if (!validRoute(route)) return malformed('路线响应格式无效')
	return {
		status: 'success',
		data: { distance: route.distance, duration: route.duration, polyline: route.polyline }
	}
}
