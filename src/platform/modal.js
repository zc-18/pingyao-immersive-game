import { reactive } from 'vue'

/* 全局确认框：由 App.vue 中的 AppModal 渲染。返回 Promise<{ confirm, cancel, content }>，
   同时兼容 success / complete 回调写法；editable 时 content 为输入框的初始文字。 */
export const modalState = reactive({
	visible: false,
	title: '',
	content: '',
	editable: false,
	placeholderText: '',
	confirmText: '确定',
	cancelText: '取消',
	showCancel: true,
	value: '',
	maxLength: 140
})

let pending = null

export function showModal(options = {}) {
	if (pending) settleModal(false)
	Object.assign(modalState, {
		visible: true,
		title: options.title || '',
		content: options.editable ? '' : options.content || '',
		editable: Boolean(options.editable),
		placeholderText: options.placeholderText || '',
		confirmText: options.confirmText || '确定',
		cancelText: options.cancelText || '取消',
		showCancel: options.showCancel !== false,
		value: options.editable ? String(options.content || '') : '',
		maxLength: Number(options.maxLength) > 0 ? Number(options.maxLength) : 140
	})
	return new Promise((resolve) => {
		pending = { resolve, options }
	})
}

export function settleModal(confirm) {
	if (!pending) return
	const { resolve, options } = pending
	pending = null
	const result = { confirm: Boolean(confirm), cancel: !confirm }
	if (modalState.editable) result.content = modalState.value
	modalState.visible = false
	try {
		options.success?.(result)
	} finally {
		try {
			options.complete?.(result)
		} finally {
			resolve(result)
		}
	}
}
