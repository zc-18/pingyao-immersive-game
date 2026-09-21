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
	return {
		...DEFAULT_CONFIG,
		enabled: configured.enabled === true,
		key: asString(configured.key),
		proxyUrl: asString(configured.proxyUrl)
	}
}

function validCoordinate(location) {
	const latitude = Number(location?.latitude)
	const longitude = Number(location?.longitude)
	return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

function coordinate(location) {
	return `${Number(location.latitude)},${Number(location.longitude)}`
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

function unavailable(config) {
	return !config.key || !config.proxyUrl
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
		const settleError = (error) => {
			const message = error instanceof Error ? error.message : error?.errMsg || String(error || '请求失败')
			finish({ status: 'error', error: message })
		}
		const handleResponse = (response) => {
			if (!response || Number(response.statusCode) < 200 || Number(response.statusCode) >= 300) {
				finish({ status: 'error', error: `HTTP ${response?.statusCode || 0}` })
				return
			}
			const body = response.data
			if (!body || typeof body !== 'object') {
				finish({ status: 'error', error: '响应格式无效' })
				return
			}
			if (Number(body.status) !== 0) {
				finish({ status: 'error', error: body.message || `腾讯服务错误（${body.status ?? '未知'}）` })
				return
			}
			finish({ status: 'success', data: body.result })
		}
		try {
			const result = globalThis.uni.request({
				url: buildUrl(config.proxyUrl, endpoint, { ...params, key: config.key }),
				method: 'GET',
				success: handleResponse,
				fail: settleError
			})
			if (result && typeof result.then === 'function') result.then(handleResponse).catch(settleError)
		} catch (error) {
			settleError(error)
		}
	})
}

export async function reverseGeocode(location, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(location)) return { status: 'error', error: '定位坐标无效' }
	return request(config, options.endpoint || 'ws/geocoder/v1', {
		location: coordinate(location),
		get_poi: options.getPoi === false ? 0 : 1
	})
}

export async function searchNearby(keyword, location, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(location)) return { status: 'error', error: '定位坐标无效' }
	const query = asString(keyword)
	if (!query) return { status: 'error', error: '搜索关键词不能为空' }
	return request(config, options.endpoint || 'ws/place/v1/search', {
		keyword: query,
		boundary: `nearby(${coordinate(location)},${Number(options.radius) > 0 ? Number(options.radius) : 1000})`,
		page_size: options.pageSize
	})
}

export async function walkingRoute(from, to, options = {}) {
	const config = getTencentLbsConfig()
	if (unavailable(config)) return { status: 'disabled' }
	if (!validCoordinate(from) || !validCoordinate(to)) return { status: 'error', error: '路线坐标无效' }
	const result = await request(config, options.endpoint || 'ws/direction/v1/walking', {
		from: coordinate(from),
		to: coordinate(to)
	})
	if (result.status !== 'success') return result
	const route = result.data?.routes?.[0]
	if (!Array.isArray(result.data?.routes)) return { status: 'error', error: '路线响应格式无效' }
	if (result.data.routes.length === 0) return { status: 'error', error: '路线为空' }
	if (!route || !Number.isFinite(Number(route.distance)) || !Number.isFinite(Number(route.duration)) || !Array.isArray(route.polyline)) {
		return { status: 'error', error: '路线响应格式无效' }
	}
	return {
		status: 'success',
		data: { distance: route.distance, duration: route.duration, polyline: route.polyline }
	}
}
