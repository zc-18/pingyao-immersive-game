/**
 * JoystickController - 虚拟摇杆控制器（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - DOM 覆盖层，左半屏触摸半透明圆环 + 内圈跟随
 * - 输出 { dx: -1~1, dy: -1~1 }，松手归零
 * - 支持 PC WASD（可选）
 */

export const JoystickControllerFactory = {
	/**
	 * 创建虚拟摇杆实例
	 * @param {HTMLElement} container - 容器元素
	 * @param {Function} onInput - 输入回调 (dx, dy) => void
	 * @returns {Object} 摇杆控制器实例
	 */
	create(container, onInput) {
		let joystickBase = null
		let joystickStick = null
		let isTouching = false
		let touchId = null
		let centerX = 0
		let centerY = 0
		let currentDx = 0
		let currentDy = 0

		const maxRadius = 60 // 最大偏移半径（像素）

		// 键盘状态（可选）
		const keys = {
			w: false,
			a: false,
			s: false,
			d: false
		}

		return {
			/**
			 * 初始化摇杆 UI
			 */
			init() {
				// 创建摇杆底座
				joystickBase = document.createElement('div')
				joystickBase.style.cssText = `
					position: absolute;
					width: 120px;
					height: 120px;
					border-radius: 50%;
					background: rgba(139, 69, 19, 0.3);
					border: 2px solid rgba(212, 165, 116, 0.5);
					display: none;
					pointer-events: none;
					z-index: 100;
				`
				container.appendChild(joystickBase)

				// 创建摇杆内圈
				joystickStick = document.createElement('div')
				joystickStick.style.cssText = `
					position: absolute;
					width: 50px;
					height: 50px;
					border-radius: 50%;
					background: rgba(212, 165, 116, 0.8);
					border: 2px solid rgba(245, 240, 232, 0.6);
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					pointer-events: none;
				`
				joystickBase.appendChild(joystickStick)

				// 绑定事件
				this.bindEvents()
			},

			/**
			 * 处理触摸开始
			 * @param {TouchEvent} event - 触摸事件
			 */
			handleTouchStart(event) {
				// 仅响应左半屏
				const touch = event.touches[0]
				if (touch.clientX > window.innerWidth / 2) return

				isTouching = true
				touchId = touch.identifier
				centerX = touch.clientX
				centerY = touch.clientY

				// 显示摇杆
				joystickBase.style.display = 'block'
				joystickBase.style.left = `${centerX - 60}px`
				joystickBase.style.top = `${centerY - 60}px`
			},

			/**
			 * 处理触摸移动
			 * @param {TouchEvent} event - 触摸事件
			 */
			handleTouchMove(event) {
				if (!isTouching) return

				// 找到对应的触摸点
				let touch = null
				for (let i = 0; i < event.touches.length; i++) {
					if (event.touches[i].identifier === touchId) {
						touch = event.touches[i]
						break
					}
				}
				if (!touch) return

				// 计算偏移
				const dx = touch.clientX - centerX
				const dy = touch.clientY - centerY
				const distance = Math.sqrt(dx * dx + dy * dy)

				// 限制在最大半径内
				let clampedDx = dx
				let clampedDy = dy
				if (distance > maxRadius) {
					clampedDx = (dx / distance) * maxRadius
					clampedDy = (dy / distance) * maxRadius
				}

				// 更新内圈位置
				joystickStick.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`

				// 归一化输出 (-1 到 1)
				currentDx = clampedDx / maxRadius
				currentDy = clampedDy / maxRadius

				// 回调
				if (onInput) {
					onInput(currentDx, currentDy)
				}
			},

			/**
			 * 处理触摸结束
			 * @param {TouchEvent} event - 触摸事件
			 */
			handleTouchEnd(event) {
				// 检查是否是当前触摸点
				let found = false
				for (let i = 0; i < event.touches.length; i++) {
					if (event.touches[i].identifier === touchId) {
						found = true
						break
					}
				}
				if (found) return

				// 重置
				isTouching = false
				touchId = null
				currentDx = 0
				currentDy = 0

				// 隐藏摇杆
				joystickBase.style.display = 'none'
				joystickStick.style.transform = 'translate(-50%, -50%)'

				// 回调
				if (onInput) {
					onInput(0, 0)
				}
			},

			/**
			 * 处理键盘按下（可选）
			 * @param {KeyboardEvent} event - 键盘事件
			 */
			handleKeyDown(event) {
				const key = event.key.toLowerCase()
				if (key in keys) {
					keys[key] = true
					this.updateKeyboardInput()
				}
			},

			/**
			 * 处理键盘抬起（可选）
			 * @param {KeyboardEvent} event - 键盘事件
			 */
			handleKeyUp(event) {
				const key = event.key.toLowerCase()
				if (key in keys) {
					keys[key] = false
					this.updateKeyboardInput()
				}
			},

			/**
			 * 更新键盘输入
			 */
			updateKeyboardInput() {
				let dx = 0
				let dy = 0

				if (keys.a) dx -= 1
				if (keys.d) dx += 1
				if (keys.w) dy -= 1
				if (keys.s) dy += 1

				// 归一化对角线
				if (dx !== 0 && dy !== 0) {
					const length = Math.sqrt(dx * dx + dy * dy)
					dx /= length
					dy /= length
				}

				currentDx = dx
				currentDy = dy

				if (onInput) {
					onInput(dx, dy)
				}
			},

			/**
			 * 绑定事件监听
			 */
			bindEvents() {
				container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
				container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
				container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
				container.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false })

				// 键盘支持（可选）
				window.addEventListener('keydown', this.handleKeyDown.bind(this))
				window.addEventListener('keyup', this.handleKeyUp.bind(this))
			},

			/**
			 * 解绑事件监听
			 */
			unbindEvents() {
				container.removeEventListener('touchstart', this.handleTouchStart.bind(this))
				container.removeEventListener('touchmove', this.handleTouchMove.bind(this))
				container.removeEventListener('touchend', this.handleTouchEnd.bind(this))
				container.removeEventListener('touchcancel', this.handleTouchEnd.bind(this))

				window.removeEventListener('keydown', this.handleKeyDown.bind(this))
				window.removeEventListener('keyup', this.handleKeyUp.bind(this))
			},

			/**
			 * 获取当前输入
			 */
			getInput() {
				return { dx: currentDx, dy: currentDy }
			},

			/**
			 * 销毁
			 */
			dispose() {
				this.unbindEvents()
				if (joystickBase && joystickBase.parentNode) {
					joystickBase.parentNode.removeChild(joystickBase)
				}
				joystickBase = null
				joystickStick = null
			}
		}
	}
}
