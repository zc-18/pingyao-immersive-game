/**
 * PlayerController - 玩家控制器（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - 简单几何体（Cylinder 身体 + Sphere 头）
 * - 摇杆输入移动（3-5 单位/秒）
 * - AABB 碰撞检测
 * - 脚下阴影 + 行走浮动动画
 */

export const PlayerControllerFactory = {
	/**
	 * 创建玩家控制器实例
	 * @param {THREE.Scene} scene - Three.js 场景
	 * @param {Object} config - 配置参数
	 * @returns {Object} 玩家控制器实例
	 */
	create(scene, config = {}) {
		let playerGroup = null
		let shadowPlane = null
		let velocity = new THREE.Vector3()
		let position = new THREE.Vector3(
			config.startX || 0,
			config.startY || 0,
			config.startZ || 0
		)

		const moveSpeed = config.moveSpeed || 4 // 单位/秒
		const collisionRadius = config.collisionRadius || 0.5
		const bobAmplitude = 0.1 // 行走浮动幅度
		const bobFrequency = 5 // 行走浮动频率

		let bobTime = 0
		let isMoving = false

		return {
			/**
			 * 初始化玩家模型
			 */
			init() {
				// 创建玩家组
				playerGroup = new THREE.Group()

				// 身体（圆柱体）
				const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
				const bodyMaterial = new THREE.MeshStandardMaterial({
					color: 0x8B4513, // 古铜棕
					roughness: 0.7,
					metalness: 0.3,
					flatShading: true
				})
				const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
				body.position.y = 0.6
				body.castShadow = true
				playerGroup.add(body)

				// 头部（球体）
				const headGeometry = new THREE.SphereGeometry(0.25, 8, 6)
				const headMaterial = new THREE.MeshStandardMaterial({
					color: 0xD4A574, // 沙金色
					roughness: 0.6,
					metalness: 0.2,
					flatShading: true
				})
				const head = new THREE.Mesh(headGeometry, headMaterial)
				head.position.y = 1.4
				head.castShadow = true
				playerGroup.add(head)

				// 脚下阴影（圆形平面）
				const shadowGeometry = new THREE.CircleGeometry(0.4, 16)
				const shadowMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000,
					transparent: true,
					opacity: 0.3,
					depthWrite: false
				})
				shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial)
				shadowPlane.rotation.x = -Math.PI / 2
				shadowPlane.position.y = 0.01
				playerGroup.add(shadowPlane)

				// 设置初始位置
				playerGroup.position.copy(position)
				scene.add(playerGroup)
			},

			/**
			 * 更新玩家状态（每帧调用）
			 * @param {number} deltaTime - 帧间隔时间（秒）
			 * @param {Object} input - 输入 { dx, dy }
			 * @param {Array} obstacles - 障碍物数组（用于碰撞检测）
			 */
			update(deltaTime, input, obstacles = []) {
				if (!playerGroup) return

				// 根据输入计算速度
				const inputX = input.dx || 0
				const inputZ = input.dy || 0

				isMoving = inputX !== 0 || inputZ !== 0

				if (isMoving) {
					// 计算移动方向（世界坐标系）
					velocity.x = inputX * moveSpeed
					velocity.z = inputZ * moveSpeed

					// 计算新位置
					const newPosition = position.clone()
					newPosition.x += velocity.x * deltaTime
					newPosition.z += velocity.z * deltaTime

					// 碰撞检测
					if (!this.checkCollision(newPosition, obstacles)) {
						position.copy(newPosition)
					}

					// 旋转朝向移动方向
					const angle = Math.atan2(velocity.x, velocity.z)
					playerGroup.rotation.y = angle

					// 行走浮动动画
					bobTime += deltaTime * bobFrequency
					const bobOffset = Math.sin(bobTime) * bobAmplitude
					playerGroup.position.y = position.y + bobOffset
				} else {
					// 停止时重置浮动
					bobTime = 0
					playerGroup.position.y = position.y
				}

				// 更新位置
				playerGroup.position.x = position.x
				playerGroup.position.z = position.z
			},

			/**
			 * AABB 碰撞检测
			 * @param {THREE.Vector3} newPosition - 新位置
			 * @param {Array} obstacles - 障碍物数组
			 * @returns {boolean} 是否发生碰撞
			 */
			checkCollision(newPosition, obstacles) {
				for (const obstacle of obstacles) {
					// 简单的圆形碰撞检测
					const dx = newPosition.x - obstacle.x
					const dz = newPosition.z - obstacle.z
					const distance = Math.sqrt(dx * dx + dz * dz)

					if (distance < collisionRadius + (obstacle.radius || 1)) {
						return true // 发生碰撞
					}
				}
				return false // 无碰撞
			},

			/**
			 * 获取玩家位置
			 * @returns {THREE.Vector3} 玩家位置
			 */
			getPosition() {
				return position.clone()
			},

			/**
			 * 设置玩家位置
			 * @param {number} x - X 坐标
			 * @param {number} y - Y 坐标
			 * @param {number} z - Z 坐标
			 */
			setPosition(x, y, z) {
				position.set(x, y, z)
				if (playerGroup) {
					playerGroup.position.copy(position)
				}
			},

			/**
			 * 获取玩家对象
			 * @returns {THREE.Group} 玩家组对象
			 */
			getObject() {
				return playerGroup
			},

			/**
			 * 销毁
			 */
			dispose() {
				if (playerGroup) {
					playerGroup.traverse((obj) => {
						if (obj.geometry) obj.geometry.dispose()
						if (obj.material) obj.material.dispose()
					})
					if (playerGroup.parent) {
						playerGroup.parent.remove(playerGroup)
					}
					playerGroup = null
				}
				shadowPlane = null
			}
		}
	}
}
