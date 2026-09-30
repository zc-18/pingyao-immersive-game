/* 页面按 750rpx 设计稿编写：构建时 32rpx 换算为 1rem，这里负责按视口宽度设置根字号。
   宽度超过 960px（桌面）时按 375px 基准固定，避免大屏上文字和面板无限放大。 */
const MAX_SCALING_WIDTH = 960
const DESKTOP_BASE_WIDTH = 375

function getViewportWidth() {
	const isApple = /^Apple/.test(navigator.vendor)
	const landscapeFix = isApple && window.matchMedia('(orientation: landscape)').matches
	const screenWidth = landscapeFix ? Math.max(screen.width, screen.height) : screen.width
	const width = Math.min(window.innerWidth, document.documentElement.clientWidth)
	return isApple ? Math.min(width, screenWidth) || screenWidth : width
}

export function updateRootFontSize() {
	const width = getViewportWidth()
	const designWidth = width <= MAX_SCALING_WIDTH ? width : DESKTOP_BASE_WIDTH
	document.documentElement.style.fontSize = designWidth / 23.4375 + 'px'
}

export function installRootFontSize() {
	updateRootFontSize()
	window.addEventListener('resize', updateRootFontSize)
	window.addEventListener('orientationchange', () => {
		updateRootFontSize()
		setTimeout(updateRootFontSize, 50)
	})
}

/* 脚本里拼接的内联样式使用同一换算。 */
export function rpx(value) {
	return `${Number(value) / 32}rem`
}
