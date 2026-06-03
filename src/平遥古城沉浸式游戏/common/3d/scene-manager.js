/**
 * SceneManager - 场景管理器（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - 管理 Scene / Camera / Renderer / AnimationLoop
 * - 后处理管线（EffectComposer → RenderPass → UnrealBloomPass）
 * - 场景加载与完整清理
 * - FogExp2 + resize + DPR + 帧率监控
 */

// ⚠️ 由于 renderjs 不能 import，此文件仅作参考
// 实际使用时需将代码内联到 renderjs 的 methods 中

export const SceneManagerFactory = {
	/**
	 * 创建场景管理器实例
	 * @param {HTMLElement} container - 渲染容器
	 * @param {Function} onMessage - 消息回调 (type, data) => void
	 * @returns {Object} 场景管理器实例
	 */
	create(container, onMessage) {
		let scene = null
		let camera = null
		let renderer = null
		let composer = null
		let animationId = null
		let lastTime = Date.now()
		let frameCount = 0
		let isRunning = false

		return {
			/**
			 * 初始化场景
			 * @param {Object} config - 场景配置
			 */
			init(config = {}) {
				const width = container.clientWidth
				const height = container.clientHeight

				// 创建场景
				scene = new THREE.Scene()
				scene.background = new THREE.Color(config.skyColor || 0xD7C0A2)
				scene.fog = new THREE.FogExp2(config.fogColor || 0xD7C0A2, config.fogDensity || 0.02)

				// 创建相机
				camera = new THREE.PerspectiveCamera(
					config.fov || 60,
					width / height,
					config.near || 0.1,
					config.far || 100
				)
				camera.position.set(
					config.cameraPosition?.x || 0,
					config.cameraPosition?.y || 5,
					config.cameraPosition?.z || 10
				)
				camera.lookAt(0, 0, 0)

				// 创建渲染器
				renderer = new THREE.WebGLRenderer({
					antialias: true,
					alpha: false,
					powerPreference: 'high-performance'
				})
				renderer.setSize(width, height)
				renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
				renderer.shadowMap.enabled = true
				renderer.shadowMap.type = THREE.PCFSoftShadowMap
				renderer.outputEncoding = THREE.sRGBEncoding
				renderer.toneMapping = THREE.ACESFilmicToneMapping
				renderer.toneMappingExposure = 1.2
				container.appendChild(renderer.domElement)

				// 创建后处理
				composer = new THREE.EffectComposer(renderer)
				composer.addPass(new THREE.RenderPass(scene, camera))

				const bloomPass = new THREE.UnrealBloomPass(
					new THREE.Vector2(width, height),
					config.bloomStrength || 0.8,
					config.bloomRadius || 0.5,
					config.bloomThreshold || 0.6
				)
				composer.addPass(bloomPass)

				// 监听窗口大小变化
				window.addEventListener('resize', this.handleResize)

				onMessage('sceneReady', { width, height })
			},

			/**
			 * 加载场景内容
			 * @param {Object} sceneConfig - 场景配置对象
			 */
			loadScene(sceneConfig) {
				// 清空现有场景内容（保留相机和光源）
				const objectsToRemove = []
				scene.traverse((obj) => {
					if (obj !== scene && obj !== camera && obj.type !== 'Light') {
						objectsToRemove.push(obj)
					}
				})
				objectsToRemove.forEach(obj => {
					if (obj.parent) obj.parent.remove(obj)
					if (obj.geometry) obj.geometry.dispose()
					if (obj.material) {
						if (Array.isArray(obj.material)) {
							obj.material.forEach(m => m.dispose())
						} else {
							obj.material.dispose()
						}
					}
				})

				// 更新天空和雾气
				if (sceneConfig.sky) {
					scene.background = new THREE.Color(sceneConfig.sky.color || 0xD7C0A2)
				}
				if (sceneConfig.fog) {
					scene.fog = new THREE.FogExp2(
						sceneConfig.fog.color || 0xD7C0A2,
						sceneConfig.fog.density || 0.02
					)
				}

				onMessage('loadProgress', { progress: 100 })
			},

			/**
			 * 开始动画循环
			 * @param {Function} updateCallback - 每帧更新回调
			 */
			startAnimation(updateCallback) {
				if (isRunning) return
				isRunning = true

				const animate = () => {
					if (!isRunning) return
					animationId = requestAnimationFrame(animate)

					// 调用外部更新逻辑
					if (updateCallback) {
						updateCallback()
					}

					// 渲染
					if (composer) {
						composer.render()
					}

					// 计算 FPS
					frameCount++
					const now = Date.now()
					if (now - lastTime >= 1000) {
						onMessage('fpsUpdate', frameCount)
						frameCount = 0
						lastTime = now
					}
				}

				animate()
			},

			/**
			 * 停止动画循环
			 */
			stopAnimation() {
				isRunning = false
				if (animationId) {
					cancelAnimationFrame(animationId)
					animationId = null
				}
			},

			/**
			 * 处理窗口大小变化
			 */
			handleResize() {
				const width = container.clientWidth
				const height = container.clientHeight

				if (camera) {
					camera.aspect = width / height
					camera.updateProjectionMatrix()
				}

				if (renderer) {
					renderer.setSize(width, height)
				}

				if (composer) {
					composer.setSize(width, height)
				}
			},

			/**
			 * 获取场景对象
			 */
			getScene() {
				return scene
			},

			/**
			 * 获取相机对象
			 */
			getCamera() {
				return camera
			},

			/**
			 * 获取渲染器对象
			 */
			getRenderer() {
				return renderer
			},

			/**
			 * 完整清理
			 */
			dispose() {
				this.stopAnimation()

				window.removeEventListener('resize', this.handleResize)

				if (scene) {
					scene.traverse((obj) => {
						if (obj.geometry) obj.geometry.dispose()
						if (obj.material) {
							if (Array.isArray(obj.material)) {
								obj.material.forEach(m => m.dispose())
							} else {
								obj.material.dispose()
							}
						}
					})
				}

				if (renderer) {
					renderer.dispose()
					if (container && renderer.domElement) {
						container.removeChild(renderer.domElement)
					}
				}

				if (composer) {
					composer = null
				}

				scene = null
				camera = null
				renderer = null
			}
		}
	}
}
