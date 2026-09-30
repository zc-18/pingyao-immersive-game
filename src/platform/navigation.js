import { nextTick, ref } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import router from '@/router.js'

/* 页面栈语义：
   - 四个底部标签页常驻缓存，切回时触发 onPageShow 刷新数据；
   - navigateTo 从非标签页离开时暂存该页，返回时原样恢复；
   - 街景（3D 场景）切到标签页时同样暂存并暂停渲染，之后 navigateTo('/street') 或浏览器后退回来无需重新加载；
   - switchTab 关闭其余暂存页；reLaunch 清空全部缓存（换身份、重置行旅后街景重建）。 */
export const TAB_PAGES = ['HomePage', 'MapPage', 'ShopPage', 'UserPage']
const PERSISTENT_PAGES = ['StreetPage']
export const cachedPages = ref([...TAB_PAGES])
export const pageGeneration = ref(0)

let keptPages = []
let evictAll = false

function syncCache() {
	cachedPages.value = evictAll ? [] : [...TAB_PAGES, ...keptPages]
}

function currentPageName() {
	return router.currentRoute.value.meta?.page || ''
}

function toLocation(target) {
	const url = typeof target === 'string' ? target : target?.url
	return url || '/home'
}

router.afterEach((to) => {
	nextTick(() => {
		const index = keptPages.indexOf(to.meta?.page)
		if (index >= 0) keptPages = keptPages.slice(0, index)
		evictAll = false
		syncCache()
	})
})

export function navigateTo(target) {
	const name = currentPageName()
	if (name && !TAB_PAGES.includes(name) && !keptPages.includes(name)) {
		keptPages.push(name)
		syncCache()
	}
	return router.push(toLocation(target))
}

export function redirectTo(target) {
	return router.replace(toLocation(target))
}

export function switchTab(target) {
	const name = currentPageName()
	keptPages = keptPages.filter((page) => PERSISTENT_PAGES.includes(page))
	if (PERSISTENT_PAGES.includes(name) && !keptPages.includes(name)) keptPages.push(name)
	syncCache()
	return router.push(toLocation(target))
}

export async function reLaunch(target) {
	keptPages = []
	evictAll = true
	syncCache()
	const result = await router.replace(toLocation(target))
	// 同地址 replace 不会替换活跃组件；重置街景时也必须重建场景与输入状态。
	if (isNavigationFailure(result, NavigationFailureType.duplicated)) pageGeneration.value += 1
	return result
}

/* 有站内历史时后退；直接打开的深链没有上一页，则执行 fail 或回到 fallback。 */
export function navigateBack(options = {}) {
	if (window.history.state?.back) {
		router.back()
		return
	}
	if (typeof options.fail === 'function') {
		options.fail()
		return
	}
	return router.replace(options.fallback || '/home')
}

// 缓存状态与 App 共享引用，热替换本模块后必须整体恢复，不能让页面各持一份缓存。
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
