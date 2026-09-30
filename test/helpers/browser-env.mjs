// 测试用的浏览器环境替身：存档（localStorage）、定位（navigator.geolocation）与网络请求（fetch）。
// 源码已改为纯 Web 实现，测试通过这些替身驱动 src/common/utils 下的模块。

/* storage.js 的写入格式：字符串原样保存，其余类型包成 {"type","data"}（兼容旧版存档）。 */
export function encodeStoredValue(value) {
	return typeof value === 'string' ? value : JSON.stringify({ type: typeof value, data: value })
}

export function decodeStoredValue(raw) {
	if (typeof raw !== 'string') return ''
	try {
		const parsed = JSON.parse(raw)
		if (parsed && typeof parsed === 'object' && 'type' in parsed && 'data' in parsed) return parsed.data
	} catch (error) {
		// 非 JSON 包装的值按原字符串返回
	}
	return raw
}

/* 安装内存版 localStorage。
   - memory：键 → 已编码字符串；seed()/read() 按 storage.js 的格式读写，便于构造畸形或旧存档；
   - state.failWrites / state.failRemoves 分别使 setItem / removeItem 抛错，模拟配额已满或隐私模式；
   - state.writes 记录每次成功写入的键。 */
export function installLocalStorage() {
	const memory = new Map()
	const state = { failWrites: false, failRemoves: false, writes: [] }
	const storage = {
		getItem: (key) => (memory.has(String(key)) ? memory.get(String(key)) : null),
		setItem(key, value) {
			if (state.failWrites) throw new Error('simulated quota')
			state.writes.push(String(key))
			memory.set(String(key), String(value))
		},
		removeItem(key) {
			if (state.failRemoves) throw new Error('simulated remove failure')
			memory.delete(String(key))
		},
		clear: () => memory.clear(),
		key: (index) => [...memory.keys()][index] ?? null,
		get length() {
			return memory.size
		}
	}
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
	Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
	return {
		storage,
		memory,
		state,
		seed(key, value) {
			memory.set(key, encodeStoredValue(value))
		},
		read(key) {
			return decodeStoredValue(memory.get(key))
		},
		reset() {
			memory.clear()
			state.failWrites = false
			state.failRemoves = false
			state.writes.length = 0
		},
		uninstall() {
			if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
			else delete globalThis.localStorage
		}
	}
}

/* Node 21+ 的 navigator 只有 getter，必须用 defineProperty 替换；返回还原函数。 */
export function installNavigator(overrides = {}) {
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	const value = { userAgent: 'node-test', vendor: '', maxTouchPoints: 0, ...overrides }
	Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
	return () => {
		if (previous) Object.defineProperty(globalThis, 'navigator', previous)
		else delete globalThis.navigator
	}
}

/* 替换全局 fetch；handler(url, init) 返回 { status, body } 或抛错。返回还原函数。 */
export function installFetch(handler) {
	const previous = globalThis.fetch
	globalThis.fetch = async (url, init) => {
		const { status = 200, body = null, invalidJson = false } = await handler(String(url), init)
		return {
			ok: status >= 200 && status < 300,
			status,
			async json() {
				if (invalidJson) throw new SyntaxError('Unexpected token')
				return body
			}
		}
	}
	return () => {
		globalThis.fetch = previous
	}
}
