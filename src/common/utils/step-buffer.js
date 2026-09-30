import { localDateString, nonNegativeInteger } from './storage.js'
import { recordSteps } from './quest-manager.js'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// 缓冲区是模块级单例：页面卸载时保存失败，重新进入街景仍可补存。
// 不能在存储不可写时承诺关闭页面后仍保留；页面会提示并自动重试。
export function createStepBuffer() {
	const batches = new Map()

	// 系统时钟被往回拨或向西跨时区后，已缓冲批次的日期会晚于「今天」，recordSteps 会一直拒绝它们，
	// 进而卡住之后所有步数。这类批次并入今天的批次：总步数不丢，也不会重复记账。
	function settleFutureBatches(today) {
		for (const [day, count] of [...batches]) {
			if (DAY_PATTERN.test(day) && day <= today) continue
			batches.delete(day)
			batches.set(today, nonNegativeInteger((batches.get(today) || 0) + count))
		}
	}

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
			settleFutureBatches(localDateString())
			// 按日期先后结算：前一天未落盘的步数先记入前一天的日常任务，再开启今天的。
			for (const day of [...batches.keys()].sort()) {
				const saved = recordSteps(batches.get(day), day)
				if (!saved.ok) {
					// 写存档失败可重试：保留本批与之后的批次，下次按原顺序补存。
					if (saved.error === 'storage') return { ...result, ok: false, error: saved.error }
					// 其他拒绝（如结算途中系统日期又被往回调）不阻塞后续批次；本批保留，下次 flush 并入当天。
					result.ok = false
					result.error = saved.error
					continue
				}
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
