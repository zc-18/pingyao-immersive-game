let pendingOrientation = ''
let plusReadyBound = false

function getPlusBridge() {
	if (typeof plus !== 'undefined') return plus
	if (typeof window !== 'undefined' && window.plus) return window.plus
	return null
}

function applyOrientation(orientation) {
	const bridge = getPlusBridge()
	if (!bridge || !bridge.screen) return false

	try {
		if (orientation) bridge.screen.lockOrientation(orientation)
		else bridge.screen.unlockOrientation()
		return true
	} catch (error) {
		console.warn('[orientation] 切换屏幕方向失败', error)
		return false
	}
}

function requestOrientation(orientation) {
	pendingOrientation = orientation
	if (applyOrientation(orientation)) return
	if (plusReadyBound || typeof document === 'undefined') return

	plusReadyBound = true
	const handlePlusReady = () => {
		plusReadyBound = false
		document.removeEventListener('plusready', handlePlusReady, false)
		applyOrientation(pendingOrientation)
	}
	document.addEventListener('plusready', handlePlusReady, false)
}

export function lockGameLandscape() {
	requestOrientation('landscape-primary')
}

export function releaseOrientationLock() {
	requestOrientation('')
}
