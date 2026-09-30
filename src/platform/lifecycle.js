import { getCurrentInstance, onActivated, onBeforeMount, onBeforeUnmount, onDeactivated, onMounted } from 'vue'
import { useRoute } from 'vue-router'

/* 页面级生命周期（在页面组件的 setup 中调用）：
   - onPageLoad(fn)：首次挂载前执行一次，参数为路由 query；
   - onPageShow(fn)：页面进入视野时执行——首次挂载、从缓存恢复、浏览器标签页重新可见；
   - onPageHide(fn)：页面离开视野时执行——被缓存、卸载、浏览器标签页隐藏。
   同一页面的 show / hide 严格交替，不会连续触发两次。 */
const controllers = new WeakMap()

function getController(instance) {
	let controller = controllers.get(instance)
	if (controller) return controller
	controller = { shown: false, active: false, show: [], hide: [] }
	controllers.set(instance, controller)

	const runShow = () => {
		if (controller.shown || !controller.active || document.hidden) return
		controller.shown = true
		controller.show.forEach((fn) => fn())
	}
	const runHide = () => {
		if (!controller.shown) return
		controller.shown = false
		controller.hide.forEach((fn) => fn())
	}
	const onVisibilityChange = () => (document.hidden ? runHide() : runShow())

	onMounted(() => {
		controller.active = true
		document.addEventListener('visibilitychange', onVisibilityChange)
		runShow()
	})
	onActivated(() => {
		controller.active = true
		runShow()
	})
	onDeactivated(() => {
		controller.active = false
		runHide()
	})
	onBeforeUnmount(() => {
		controller.active = false
		document.removeEventListener('visibilitychange', onVisibilityChange)
		runHide()
	})
	return controller
}

function currentInstance(hook) {
	const instance = getCurrentInstance()
	if (!instance) throw new Error(`${hook} 只能在页面组件的 setup 中调用`)
	return instance
}

export function onPageLoad(fn) {
	currentInstance('onPageLoad')
	const route = useRoute()
	onBeforeMount(() => fn({ ...route.query }))
}

export function onPageShow(fn) {
	getController(currentInstance('onPageShow')).show.push(fn)
}

export function onPageHide(fn) {
	getController(currentInstance('onPageHide')).hide.push(fn)
}
