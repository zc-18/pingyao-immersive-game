import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/* 样式沿用 750rpx 设计稿：构建时把 rpx 换成 rem（32rpx = 1rem），
   根字号由 src/platform/viewport.js 按视口宽度设置，与原先的换算完全一致。 */
const RPX_PATTERN = /(-?\d*\.?\d+)rpx\b/g
function rpxToRem() {
	const convert = (value) => value.replace(RPX_PATTERN, (_, number) => `${Math.round((Number(number) / 32) * 100000) / 100000}rem`)
	return {
		postcssPlugin: 'pingyao-rpx-to-rem',
		Declaration(declaration) {
			if (declaration.value.includes('rpx')) declaration.value = convert(declaration.value)
		},
		AtRule(rule) {
			if (rule.params.includes('rpx')) rule.params = convert(rule.params)
		}
	}
}
rpxToRem.postcss = true

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: '@import "@/styles/variables.scss";\n',
				silenceDeprecations: ['import', 'global-builtin', 'color-functions']
			}
		},
		postcss: { plugins: [rpxToRem()] }
	},
	server: { host: 'localhost', port: 5219, strictPort: true },
	preview: { host: 'localhost', port: 5219, strictPort: true },
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		chunkSizeWarningLimit: 1200
	}
})
