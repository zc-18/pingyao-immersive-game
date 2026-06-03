/**
 * CameraController - 第三人称相机控制器（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - 第三人称跟随（距离 8-12、俯角 25°-35°）
 * - 右半屏拖拽旋转 360°，垂直 10°-60°
 * - 双指缩放（5-20）
 * - lerp 平滑 / lookAt(target, duration)
 */

export const CameraControllerFactory = {
	/**
	 * 创建相机控制器实例
	 * @param {THREE.Camera} camera - Three.js 相机对象
	 * @param {HTMLElement} domElement - 交互元素
	 * @returns {Object} 相机控制器实例
	 */
	create(camera, domElement) {
		// 相机参数
		let target = new THREE.Vector3(0, 0, 0)
		let distance = 10
		let azimuthAngle = 0 // 水平角度（弧度）
		let polarAngle = Math.PI / 6 // 垂直角度（弧度，默认 30°）

		// 约束
		const minDistance = 5
		const maxDistance = 20
		const minPolarAngle = Math.PI / 18 // 10°
		const maxPolarAngle = Math.PI / 3 // 60°

		// 平滑参数
		const dampingFactor = 0.1

		// 触摸状态
		let isTouching = false
		let touchStartX = 0
		let touchStartY = 0
		let lastAzimuth = 0
		let lastPolar = 0

		// 双指缩放
		let initialPinchDistance = 0
		let initialDistance = distance

		return {
			/**
			 * 设置跟随目标
			 * @param {THREE.Vector3} newTarget - 目标位置
			 */
			setTarget(newTarget) {
				target.copy(newTarget)
			},

			/**
			 * 设置距离
			 * @param {number} newDistance - 新距离
			 */
			setDistance(newDistance) {
				distance = Math.max(minDistance, Math.min(maxDistance, newDistance))
			},

			/**
			 * 设置角度
			 * @param {number} azimuth - 水平角度（弧度）
			 * @param {number} polar - 垂直角度（弧度）
			 */
			setAngles(azimuth, polar) {
				azimuthAngle = azimuth
				polarAngle = Math.max(minPolarAngle, Math.min(maxPolarAngle, polar))
			},

			/**
			 * 平滑看向目标
			 * @param {THREE.Vector3} lookTarget - 目标位置
			 * @param {number} duration - 持续时间（毫秒）
			 */
			lookAt(lookTarget, duration = 500) {
				// 简化版：直接设置目标，实际可用 TWEEN.js 实现动画
				target.copy(lookTarget)
			},

			/**
			 * 更新相机位置（每帧调用）
			 */
			update() {
				// 计算相机位置（球坐标转笛卡尔坐标）
				const x = target.x + distance * Math.sin(polarAngle) * Math.sin(azimuthAngle)
				const y = target.y + distance * Math.cos(polarAngle)
				const z = target.z + distance * Math.sin(polarAngle) * Math.cos(azimuthAngle)

				// 平滑插值
				camera.position.lerp(new THREE.Vector3(x, y, z), dampingFactor)
				camera.lookAt(target)
			},

			/**
			 * 处理触摸开始
			 * @param {TouchEvent} event - 触摸事件
			 */
			handleTouchStart(event) {
				if (event.touches.length === 1) {
					// 单指旋转（仅右半屏）
					const touch = event.touches[0]
					if (touch.clientX > window.innerWidth / 2) {
						isTouching = true
						touchStartX = touch.clientX
						touchStartY = touch.clientY
						lastAzimuth = azimuthAngle
						lastPolar = polarAngle
					}
				} else if (event.touches.length === 2) {
					// 双指缩放
					const dx = event.touches[0].clientX - event.touches[1].clientX
					const dy = event.touches[0].clientY - event.touches[1].clientY
					initialPinchDistance = Math.sqrt(dx * dx + dy * dy)
					initialDistance = distance
				}
			},

			/**
			 * 处理触摸移动
			 * @param {TouchEvent} event - 触摸事件
			 */
			handleTouchMove(event) {
				if (event.touches.length === 1 && isTouching) {
					// 单指旋转
					const touch = event.touches[0]
					const deltaX = touch.clientX - touchStartX
					const deltaY = touch.clientY - touchStartY

					azimuthAngle = lastAzimuth + deltaX * 0.005
					polarAngle = lastPolar + deltaY * 0.005
					polarAngle = Math.max(minPolarAngle, Math.min(maxPolarAngle, polarAngle))

				} else if (event.touches.length === 2) {
					// 双指缩放
					const dx = event.touches[0].clientX - event.touches[1].clientX
					const dy = event.touches[0].clientY - event.touches[1].clientY
					const currentPinchDistance = Math.sqrt(dx * dx + dy * dy)
					const scale = currentPinchDistance / initialPinchDistance
					distance = initialDistance / scale
					distance = Math.max(minDistance, Math.min(maxDistance, distance))
				}
			},

			/**
			 * 处理触摸结束
			 */
			handleTouchEnd() {
				isTouching = false
			},

			/**
			 * 绑定事件监听
			 */
			bindEvents() {
				domElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
				domElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
				domElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
			},

			/**
			 * 解绑事件监听
			 */
			unbindEvents() {
				domElement.removeEventListener('touchstart', this.handleTouchStart.bind(this))
				domElement.removeEventListener('touchmove', this.handleTouchMove.bind(this))
				domElement.removeEventListener('touchend', this.handleTouchEnd.bind(this))
			},

			/**
			 * 获取当前参数
			 */
			getParams() {
				return {
					target: target.clone(),
					distance,
					azimuthAngle,
					polarAngle
				}
			},

			/**
			 * 销毁
			 */
			dispose() {
				this.unbindEvents()
			}
		}
	}
}
