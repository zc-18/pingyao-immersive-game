import { localDateString, nonNegativeInteger } from './storage.js'
import { recordSteps } from './quest-manager.js'

// 保存在逻辑层模块内：页面卸载时保存失败，重新进入仍可补存。
// 不能在存储不可写时承诺进程关闭后仍保留；页面会提示并自动重试。
export function createStepBuffer() {
	const batches = new Map()
	return {
		get pending() { return [...batches.values()].reduce((sum, count) => sum + count, 0) },
		clear() { batches.clear() },
		add(delta) {
			const count = nonNegativeInteger(delta)
			if (!count) return
			const day = localDateString()
			batches.set(day, nonNegativeInteger((batches.get(day) || 0) + count))
		},
		flush() {
			const result = { ok: true, accepted: 0, updated: false, completed: [] }
			for (const [day, count] of batches) {
				const saved = recordSteps(count, day)
				if (!saved.ok) return { ...result, ok: false, error: saved.error }
				batches.delete(day)
				result.accepted += saved.accepted
				result.updated ||= saved.updated
				result.completed.push(...saved.completed)
			}
			return result
		}
	}
}

export const stepBuffer = createStepBuffer()
