/* 浏览器只允许在全屏状态下锁定屏幕方向（iOS Safari 不支持锁定）。
   游戏页在全屏时尝试锁横屏；其余情况由各页面的竖屏降级布局兜底。 */
function getOrientationApi() {
	if (typeof screen === 'undefined' || !screen.orientation) return null
	return screen.orientation
}

function isFullscreen() {
	return typeof document !== 'undefined' && Boolean(document.fullscreenElement || document.webkitFullscreenElement)
}

export function lockGameLandscape() {
	const orientation = getOrientationApi()
	if (!orientation || typeof orientation.lock !== 'function' || !isFullscreen()) return false
	try {
		orientation.lock('landscape').catch(() => {})
		return true
	} catch (error) {
		return false
	}
}

export function releaseOrientationLock() {
	const orientation = getOrientationApi()
	if (!orientation || typeof orientation.unlock !== 'function' || !isFullscreen()) return false
	try {
		orientation.unlock()
		return true
	} catch (error) {
		return false
	}
}
