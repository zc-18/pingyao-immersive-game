<template>
	<div class="app-shell" :class="{ 'app-shell--tabbar': showTabBar }">
		<main class="app-page">
			<router-view v-slot="{ Component, route: viewRoute }">
				<keep-alive :include="cachedPages">
					<component :is="Component" :key="pageKey(viewRoute)" :ref="trackPage" />
				</keep-alive>
			</router-view>
		</main>
		<AppTabBar v-if="showTabBar" />
		<AppToast />
		<AppModal />
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppTabBar from '@/components/AppTabBar.vue'
import AppToast from '@/components/AppToast.vue'
import AppModal from '@/components/AppModal.vue'
import { cachedPages, pageGeneration } from '@/platform/navigation.js'
import { STORAGE_KEYS, patchStorageObject } from '@/common/utils/storage.js'
import { pauseBGM, resumeBGM } from '@/common/utils/audio.js'

const TAB_BAR_HEIGHT = 50
const route = useRoute()
const showTabBar = computed(() => Boolean(route.meta.tab))

/* 标签页只保留一个实例；其他页面按 query 区分（例如不同的兑换券）。 */
function pageKey(viewRoute) {
	if (viewRoute.meta.tab) return `${pageGeneration.value}:${viewRoute.name}`
	const query = new URLSearchParams(viewRoute.query).toString()
	return `${pageGeneration.value}:${viewRoute.name}${query ? `?${query}` : ''}`
}

/* 开发环境记录当前页面的组件实例，见 main.js 的 window.__pygc。 */
function trackPage(page) {
	if (import.meta.env.DEV && page && window.__pygc) window.__pygc.page = page.$
}

/* 页面样式通过这些变量避让底部标签栏和刘海区域。 */
watch(showTabBar, (tab) => {
	const style = document.documentElement.style
	style.setProperty('--tab-bar-height', `${TAB_BAR_HEIGHT}px`)
	style.setProperty('--window-top', 'calc(0px + env(safe-area-inset-top))')
	style.setProperty('--app-header-height', tab ? 'var(--navigation-top-height)' : '0px')
	style.setProperty('--window-bottom', `calc(${tab ? 'var(--navigation-bottom-height)' : '0px'} + env(safe-area-inset-bottom))`)
}, { immediate: true })

/* 浏览器标签页切到后台时暂停音乐，回来再续播。 */
function handleVisibilityChange() {
	if (document.hidden) {
		pauseBGM()
		patchStorageObject(STORAGE_KEYS.appRuntime, { lastHideAt: Date.now() })
	} else {
		resumeBGM()
		patchStorageObject(STORAGE_KEYS.appRuntime, { lastShowAt: Date.now() })
	}
}

onMounted(() => {
	patchStorageObject(STORAGE_KEYS.appRuntime, { lastShowAt: Date.now() })
	document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
	document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style lang="scss">
:root {
	--navigation-top-height: 0px;
	--navigation-bottom-height: 50px;
}
@media (min-width: 1000px) {
	:root { --navigation-top-height: 76px; --navigation-bottom-height: 0px; }
	.app-shell--tabbar > .app-page { padding-top: var(--app-header-height, 0px); }
}
.app-shell {
	position: relative;
	width: 100%;
	min-height: 100%;
}
</style>
