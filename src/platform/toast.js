import { reactive } from 'vue'

/* 全局轻提示：由 App.vue 中的 AppToast 渲染，同一时刻只显示最新一条。 */
export const toastState = reactive({ visible: false, title: '', icon: 'none', id: 0 })

let hideTimer = null

export function showToast(options = {}) {
	const { title = '', icon = 'none', duration = 1500 } = typeof options === 'string' ? { title: options } : options
	clearTimeout(hideTimer)
	toastState.title = String(title)
	toastState.icon = icon
	toastState.id += 1
	toastState.visible = Boolean(toastState.title)
	hideTimer = setTimeout(hideToast, Math.max(800, Number(duration) || 1500))
}

export function hideToast() {
	clearTimeout(hideTimer)
	hideTimer = null
	toastState.visible = false
}
