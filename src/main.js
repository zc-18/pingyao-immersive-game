import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import * as navigation from './platform/navigation.js'
import { installRootFontSize } from './platform/viewport.js'
import { STORAGE_KEYS, ensureStorageDefaults, getStorage, patchStorageObject } from './common/utils/storage.js'
import { syncAchievementUnlocks } from './common/utils/achievements.js'
import './styles/global.scss'

function getPlatformName() {
	const agent = navigator.userAgent || ''
	if (/Android/i.test(agent)) return 'android'
	if (/iPhone|iPad|iPod/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) return 'ios'
	if (/Windows/i.test(agent)) return 'windows'
	if (/Macintosh|Mac OS X/i.test(agent)) return 'mac'
	if (/Linux/i.test(agent)) return 'linux'
	return 'web'
}

installRootFontSize()

/* 首次进入先补齐存档默认值，再同步一次成就（兼容旧存档）。必须早于任何页面读取存档。 */
ensureStorageDefaults()
patchStorageObject(STORAGE_KEYS.appRuntime, { lastLaunchAt: Date.now(), platform: getPlatformName() })
try {
	syncAchievementUnlocks()
} catch (error) {
	console.warn('[app] sync achievements failed', error)
}

/* 仅开发环境：浏览器调试与审计通过它读取存档和当前页面实例（page.setupState）。 */
if (import.meta.env.DEV) {
	window.__pygc = { router, navigation, readStorage: (key) => getStorage(key), page: null }
}

createApp(App).use(router).mount('#app')
