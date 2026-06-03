import { createSSRApp } from 'vue'
import App from './App'
import theme from './common/constants/theme'
import storage from './common/utils/storage'

export function createApp() {
	const app = createSSRApp(App)

	app.config.globalProperties.$theme = theme
	app.config.globalProperties.$storage = storage

	app.provide('theme', theme)
	app.provide('storage', storage)

	return {
		app
	}
}
