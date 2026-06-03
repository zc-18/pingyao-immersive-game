/**
 * PoiBeacon - POI 信标系统（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - 底部发光圆环 + 浮动八面体 + 光柱
 * - 颜色：discoverable 金 / quest 红 / completed 灰 / nearby 白脉冲
 * - 动画：旋转 + 浮动 + 脉冲
 */

export const PoiBeaconFactory = {
	/**
	 * 创建 POI 信标实例
	 * @param {THREE.Scene} scene - Three.js 场景
	 * @param {Object} config - 配置参数
	 * @returns {Object} 信标实例
	 */
	create(scene, config = {}) {
		let beaconGroup = null
		let ring = null
		let crystal = null
		let beam = null
		let light = null
		let animationTime = 0

		const position = new THREE.Vector3(
			config.x || 0,
			config.y || 0,
			config.z || 0
		)

		// 根据状态确定颜色
		const statusColors = {
			discoverable: 0xD4A574, // 金色
			quest: 0xC41E3A,        // 中国红
			completed: 0x808080,    // 灰色
			nearby: 0xF5F0E8,       // 白色
			hot: 0xFFD77F,          // 暖黄色
			route: 0x8B4513         // 古铜棕
		}

		const color = statusColors[config.status] || 0xD4A574
		const isPulsing = config.status === 'nearby' || config.status === 'hot'

		return {
			/**
			 * 初始化信标
			 */
			init() {
				beaconGroup = new THREE.Group()

				// 底部发光圆环
				const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16)
				const ringMaterial = new THREE.MeshStandardMaterial({
					color: color,
					emissive: color,
					emissiveIntensity: 0.6,
					roughness: 0.3,
					metalness: 0.7,
					flatShading: true
				})
				ring = new THREE.Mesh(ringGeometry, ringMaterial)
				ring.rotation.x = Math.PI / 2
				ring.position.y = 0.1
				beaconGroup.add(ring)

				// 浮动八面体（水晶）
				const crystalGeometry = new THREE.OctahedronGeometry(0.4, 0)
				const crystalMaterial = new THREE.MeshStandardMaterial({
					color: color,
					emissive: color,
					emissiveIntensity: 0.8,
					roughness: 0.2,
					metalness: 0.8,
					flatShading: true,
					transparent: true,
					opacity: 0.9
				})
				crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
				crystal.position.y = 1.5
				beaconGroup.add(crystal)

				// 光柱（圆柱体）
				const beamGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8)
				const beamMaterial = new THREE.MeshStandardMaterial({
					color: color,
					emissive: color,
					emissiveIntensity: 0.5,
					roughness: 0.3,
					transparent: true,
					opacity: 0.4,
					flatShading: true
				})
				beam = new THREE.Mesh(beamGeometry, beamMaterial)
				beam.position.y = 0.7
				beaconGroup.add(beam)

				// 点光源
				light = new THREE.PointLight(color, 1.5, 6)
				light.position.y = 1.5
				beaconGroup.add(light)

				// 设置位置
				beaconGroup.position.copy(position)
				scene.add(beaconGroup)
			},

			/**
			 * 更新动画（每帧调用）
			 * @param {number} deltaTime - 帧间隔时间（秒）
			 */
			update(deltaTime) {
				if (!beaconGroup) return

				animationTime += deltaTime

				// 圆环旋转
				if (ring) {
					ring.rotation.z += deltaTime * 0.5
				}

				// 水晶旋转 + 浮动
				if (crystal) {
					crystal.rotation.y += deltaTime * 1.5
					crystal.rotation.x += deltaTime * 0.5
					crystal.position.y = 1.5 + Math.sin(animationTime * 2) * 0.2
				}

				// 脉冲效果（nearby / hot 状态）
				if (isPulsing) {
					const pulse = (Math.sin(animationTime * 3) + 1) / 2 // 0-1
					if (ring) {
						ring.material.emissiveIntensity = 0.4 + pulse * 0.4
					}
					if (crystal) {
						crystal.material.emissiveIntensity = 0.6 + pulse * 0.4
					}
					if (light) {
						light.intensity = 1 + pulse * 1
					}
				}
			},

			/**
			 * 设置状态（更新颜色）
			 * @param {string} newStatus - 新状态
			 */
			setStatus(newStatus) {
				const newColor = statusColors[newStatus] || 0xD4A574

				if (ring) {
					ring.material.color.set(newColor)
					ring.material.emissive.set(newColor)
				}
				if (crystal) {
					crystal.material.color.set(newColor)
					crystal.material.emissive.set(newColor)
				}
				if (beam) {
					beam.material.color.set(newColor)
					beam.material.emissive.set(newColor)
				}
				if (light) {
					light.color.set(newColor)
				}
			},

			/**
			 * 设置位置
			 * @param {number} x - X 坐标
			 * @param {number} y - Y 坐标
			 * @param {number} z - Z 坐标
			 */
			setPosition(x, y, z) {
				position.set(x, y, z)
				if (beaconGroup) {
					beaconGroup.position.copy(position)
				}
			},

			/**
			 * 获取位置
			 * @returns {THREE.Vector3} 位置
			 */
			getPosition() {
				return position.clone()
			},

			/**
			 * 显示/隐藏
			 * @param {boolean} visible - 是否可见
			 */
			setVisible(visible) {
				if (beaconGroup) {
					beaconGroup.visible = visible
				}
			},

			/**
			 * 获取对象
			 * @returns {THREE.Group} 信标组对象
			 */
			getObject() {
				return beaconGroup
			},

			/**
			 * 销毁
			 */
			dispose() {
				if (beaconGroup) {
					beaconGroup.traverse((obj) => {
						if (obj.geometry) obj.geometry.dispose()
						if (obj.material) obj.material.dispose()
					})
					if (beaconGroup.parent) {
						beaconGroup.parent.remove(beaconGroup)
					}
					beaconGroup = null
				}
				ring = null
				crystal = null
				beam = null
				light = null
			}
		}
	}
}
