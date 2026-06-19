<template>
	<view class="game-page">
		<!-- 3D 渲染容器 -->
		<view
			id="three-container"
			class="three-container"
			:change:sceneCmd="renderModule.onSceneCmd"
			:sceneCmd="sceneCmd"
		></view>

		<!-- 调试信息面板 -->
		<view class="debug-panel" v-if="showDebug">
			<text class="debug-title">{{ sceneName }}</text>
			<text class="debug-info">FPS: {{ fps }}</text>
			<text class="debug-info">状态: {{ status }}</text>
			<text class="debug-info">三角面: {{ triangles }}</text>
			<text class="debug-info">位置: {{ playerPos }}</text>
		</view>

		<!-- 迷你地图 -->
		<view class="mini-map-anchor">
			<MiniMap
				:player-position="playerWorld"
				:player-rotation="playerRotation"
				:buildings="miniBuildings"
				:pois="miniPois"
				:map-size="60"
				:label="phaseLabel + ' · ' + sceneName"
			/>
		</view>

		<!-- 底部 HUD -->
		<view class="hud-bar">
			<text class="hud-label">{{ sceneName }}</text>
			<text class="hud-sub">{{ sceneSubtitle }}</text>
			<view class="hud-phase">
				<text class="hud-phase-char">{{ phaseLabel }}</text>
			</view>
		</view>

		<!-- 返回按钮 -->
		<view class="back-btn" @tap="goBack">
			<text class="back-icon">←</text>
		</view>

		<!-- 调试开关 -->
		<view class="debug-toggle" @tap="showDebug = !showDebug">
			<text class="debug-toggle-icon">⚙</text>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { streetScenes } from '@/common/data/streets.js'
import { poiList } from '@/common/data/poi-list.js'
import { getCurrentPhase } from '@/common/utils/phase.js'
import MiniMap from '@/components/MiniMap.vue'

// 场景命令（传递给 renderjs）
const sceneCmd = ref({ action: 'noop', ts: 0 })

// 调试信息
const fps = ref(0)
const status = ref('初始化中...')
const triangles = ref(0)
const playerPos = ref('0, 0')
const showDebug = ref(true)

// 场景信息
const sceneName = ref('票号旧巷')
const sceneSubtitle = ref('')
const phaseLabel = ref('')

// 迷你地图数据
const playerWorld = ref({ x: 0, z: 12 })
const playerRotation = ref(0)
const miniBuildings = ref([])
const miniPois = ref([])

// 接收来自 renderjs 的消息
function handleRenderMsg(msg) {
	if (!msg || !msg.detail) return
	const { type, data } = msg.detail
	if (type === 'fpsUpdate') fps.value = data
	else if (type === 'status') status.value = data
	else if (type === 'triangles') triangles.value = data
	else if (type === 'playerMove') playerPos.value = data
	else if (type === 'playerWorld') {
		playerWorld.value = { x: data.x, z: data.z }
		playerRotation.value = data.rotation || 0
	}
	else if (type === 'sceneReady') status.value = '运行中'
	else if (type === 'loadProgress') status.value = `加载 ${data}%`
}

function goBack() {
	uni.navigateBack()
}

onMounted(() => {
	uni.$on('renderMsg', handleRenderMsg)

	// 当前时辰（用于天空/光照/雾气）
	const phase = getCurrentPhase()
	phaseLabel.value = phase.label

	// 使用第一条街景数据
	const street = streetScenes[0]
	sceneName.value = street.title || street.name
	sceneSubtitle.value = street.subtitle || ''

	// 构建 POI 查找表
	const poiMap = {}
	poiList.forEach(p => { poiMap[p.id] = p })

	// 内联 migrateStreetData：将 streets.js 数据转为 3D 场景配置
	const sceneConfig = migrateStreet(street, poiMap, phase)

	// 同步迷你地图数据
	miniBuildings.value = sceneConfig.buildings.map((b, i) => ({
		id: 'b-' + i,
		x: b.position.x,
		z: b.position.z,
		width: b.config?.width || 4,
		depth: b.config?.depth || 3
	}))
	miniPois.value = sceneConfig.pois.map((p) => ({
		id: p.id,
		x: p.position.x,
		z: p.position.z,
		isQuest: p.status === 'quest',
		isHot: p.status === 'hot' || p.status === 'nearby'
	}))
	playerWorld.value = { x: sceneConfig.playerSpawn.x, z: sceneConfig.playerSpawn.z }

	// 发送初始化命令
	sceneCmd.value = {
		action: 'init',
		sceneConfig: sceneConfig,
		ts: Date.now()
	}
})

onUnmounted(() => {
	uni.$off('renderMsg', handleRenderMsg)
	sceneCmd.value = { action: 'dispose', ts: Date.now() }
})

/**
 * migrateStreetData - 纯函数，将 streets.js 数据转为 3D 场景配置
 *  + 根据 phase 自动设置天空 / 雾气 / 光照 / 灯笼亮灭
 */
function migrateStreet(street, poiMap, phase) {
	const ph = phase || getCurrentPhase()

	const cfg = {
		ground: { size: 80, color: street.ambience?.groundColor || '#9E9E8E' },
		sky: { topColor: ph.sky.top, bottomColor: ph.sky.bottom },
		fog: { color: ph.fog.color, density: ph.fog.density },
		lighting: {
			ambient: { color: ph.lighting.ambient.color, intensity: ph.lighting.ambient.intensity },
			directional: {
				color: ph.lighting.directional.color,
				intensity: ph.lighting.directional.intensity,
				position: ph.lighting.directional.angle
			},
			hemi: ph.lighting.hemi
		},
		bloomStrength: ph.bloomStrength,
		exposure: ph.exposure,
		buildings: [],
		pois: [],
		decorations: [],
		playerSpawn: { x: 0, y: 0, z: 12, bearing: street.playerStart?.bearing || 0 },
		road: { width: 5.5, length: 50, color: '#8A8278' },
		phase: ph.key,
		lanternsLit: ph.lanternsLit
	}

	// 转换建筑
	if (street.buildings) {
		street.buildings.forEach((b, i) => {
			const leftPct = parseFloat(b.left) / 100
			const x = (leftPct - 0.5) * 50
			const d = b.depth || 1
			const z = -5 - d * 4
			const side = leftPct < 0.5 ? 'left' : 'right'
			let type = 'traditional_house'
			if (b.label.includes('票号') || b.label.includes('银号') || b.label.includes('账房')) type = 'bank_building'
			else if (b.label.includes('门楼') || b.label.includes('牌楼')) type = 'gate_tower'
			else if (b.label.includes('铺') || b.label.includes('坊') || b.label.includes('肆') || b.label.includes('庄')) type = 'shop_front'
			else if (b.label.includes('影壁') || b.label.includes('照壁')) type = 'city_wall'

			cfg.buildings.push({
				type, side,
				position: { x, y: 0, z },
				rotation: side === 'left' ? Math.PI / 2 : -Math.PI / 2,
				config: {
					name: b.label,
					width: 3.5 + d * 0.8,
					depth: 2.5 + d * 0.5,
					height: 2.5 + d * 0.8
				}
			})
		})
	}

	// 转换 POI
	if (street.poiOverrides) {
		Object.entries(street.poiOverrides).forEach(([pid, ov]) => {
			const mp = ov.mapPosition || { x: 50, y: 50 }
			const x = (mp.x / 100 - 0.5) * 40
			const z = (mp.y / 100 - 0.5) * 30
			const poiData = poiMap[pid] || {}
			cfg.pois.push({
				id: pid,
				name: poiData.name || pid,
				position: { x, y: 0, z },
				status: ov.status || 'discoverable'
			})
		})
	}

	// 灯笼柱（夜间发光）
	for (let i = 0; i < 7; i++) {
		const z = -18 + i * 6
		cfg.decorations.push({ type: 'lantern_post', position: { x: -3.6, y: 0, z } })
		cfg.decorations.push({ type: 'lantern_post', position: { x: 3.6, y: 0, z } })
	}

	// 古槐树（街角分布）
	const treeColor = ph.key === 'night' ? '#3a4a2a' : '#506b3a'
	cfg.decorations.push({ type: 'tree', position: { x: -8, y: 0, z: -6 }, leafColor: treeColor, height: 4.6 })
	cfg.decorations.push({ type: 'tree', position: { x: 8, y: 0, z: -8 }, leafColor: treeColor, height: 4.2 })
	cfg.decorations.push({ type: 'tree', position: { x: -9, y: 0, z: -22 }, leafColor: treeColor, height: 4.8 })
	cfg.decorations.push({ type: 'tree', position: { x: 9, y: 0, z: -20 }, leafColor: treeColor, height: 4.0 })

	// 商铺旗幡（点缀）
	const bannerColors = ['#C41E3A', '#D4A574', '#8B4513', '#C41E3A']
	for (let i = 0; i < bannerColors.length; i++) {
		const z = -10 + i * 6
		cfg.decorations.push({
			type: 'banner', color: bannerColors[i],
			position: { x: i % 2 === 0 ? -2.6 : 2.6, y: 0, z }
		})
	}

	// 石灯（路边）
	cfg.decorations.push({ type: 'stone_lantern', position: { x: -2.3, y: 0, z: 8 } })
	cfg.decorations.push({ type: 'stone_lantern', position: { x: 2.3, y: 0, z: 8 } })

	// 鼓（街景一处摆设）
	cfg.decorations.push({ type: 'drum', position: { x: -3.4, y: 0, z: -2 } })

	return cfg
}
</script>

<script module="renderModule" lang="renderjs">
/* ============================================================
 * 平遥古城 3D 街景 — renderjs 全内联架构
 * 包含：SceneManager / CameraController / JoystickController /
 *       PlayerController / BuildingFactory / PoiBeacon
 * ============================================================ */

var THREE = null
var _scene = null
var _camera = null
var _renderer = null
var _composer = null
var _animId = null
var _isRunning = false
var _lastTime = 0
var _frameCount = 0
var _clock = null

// 子系统实例
var _camCtrl = null
var _joyCtrl = null
var _playerCtrl = null
var _beacons = []
var _obstacles = []
var _particles = null  // 粒子系统（萤火 / 飘尘）
var _joystickInput = { dx: 0, dy: 0 }

// 保存事件处理函数引用（用于 dispose 时解绑）
var _boundTouchStart = null
var _boundTouchMove = null
var _boundTouchEnd = null
var _boundKeyDown = null
var _boundKeyUp = null
var _boundResize = null

export default {
	mounted() {
		console.log('[renderjs] mounted')
	},

	methods: {
		/* ---------- 工具 ---------- */
		loadScript(src) {
			return new Promise(function(resolve, reject) {
				var s = document.createElement('script')
				s.src = src
				s.onload = function() { console.log('[3d] loaded: ' + src); resolve() }
				s.onerror = function(e) { console.error('[3d] fail: ' + src, e); reject(e) }
				document.head.appendChild(s)
			})
		},

		sendMsg(type, data) {
			if (this.$ownerInstance) {
				this.$ownerInstance.callMethod('handleRenderMsg', { detail: { type: type, data: data } })
			}
		},

		/* ---------- 场景命令入口 ---------- */
		onSceneCmd(newVal, oldVal, ownerInstance, instance) {
			if (!newVal || !newVal.action) return
			var action = newVal.action
			// 跨端取方法上下文：APP 端 renderjs 观察器靠第 4 参 instance 调同级方法；
			// H5(vue3) 端观察器是组件 Proxy 的方法，方法挂在 this 上、instance 不带方法。
			// 取「确实带 initAll 的那个」即可两端通用。
			var ctx = (this && typeof this.initAll === 'function') ? this : instance
			if (action === 'init') {
				ctx.initAll(newVal.sceneConfig)
			} else if (action === 'dispose') {
				ctx.disposeAll()
			}
		},

		/* ---------- 初始化全部 ---------- */
		async initAll(sceneConfig) {
			try {
				this.sendMsg('status', '加载 Three.js…')
				// EffectComposer.js 定义 THREE.Pass，必须先于 RenderPass/ShaderPass/UnrealBloomPass（它们在求值期 extends THREE.Pass）加载，否则同步抛 TypeError。
				var libs = [
					'/static/libs/three.min.js',
					'/static/libs/CopyShader.js',
					'/static/libs/LuminosityHighPassShader.js',
					'/static/libs/EffectComposer.js',
					'/static/libs/RenderPass.js',
					'/static/libs/ShaderPass.js',
					'/static/libs/UnrealBloomPass.js'
				]
				for (var i = 0; i < libs.length; i++) {
					await this.loadScript(libs[i])
				}
				THREE = window.THREE
				if (!THREE) throw new Error('THREE undefined')

				this.sendMsg('status', '构建场景…')
				this.initScene(sceneConfig)
				this.buildGround(sceneConfig)
				this.buildSky(sceneConfig)
				this.buildLighting(sceneConfig)
				this.buildRoad(sceneConfig)
				this.buildBuildings(sceneConfig)
				this.buildPois(sceneConfig)
				this.buildDecorations(sceneConfig)
				this.buildParticles(sceneConfig)
				this.initPlayer(sceneConfig)
				this.initCamera(sceneConfig)
				this.initJoystick()
				this.countTriangles()

				this.sendMsg('status', '运行中')
				this.sendMsg('sceneReady', { ok: true })
				this.startLoop()
			} catch (err) {
				console.error('[3d] initAll error:', err)
				this.sendMsg('status', '错误: ' + err.message)
			}
		},

		/* ============================================================
		 * SceneManager 内联
		 * ============================================================ */
		initScene(cfg) {
			var container = document.getElementById('three-container')
			var w = container.clientWidth
			var h = container.clientHeight

			_scene = new THREE.Scene()
			_scene.background = new THREE.Color(cfg.sky ? cfg.sky.topColor : '#d7c0a2')
			_scene.fog = new THREE.FogExp2(
				new THREE.Color(cfg.fog ? cfg.fog.color : '#d7c0a2'),
				cfg.fog ? cfg.fog.density : 0.018
			)

			_camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 140)
			_camera.position.set(0, 8, 18)
			_camera.lookAt(0, 0, 0)

			_renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
			_renderer.setSize(w, h)
			_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
			_renderer.shadowMap.enabled = true
			_renderer.shadowMap.type = THREE.PCFSoftShadowMap
			_renderer.outputEncoding = THREE.sRGBEncoding
			_renderer.toneMapping = THREE.ACESFilmicToneMapping
			_renderer.toneMappingExposure = cfg.exposure || 1.25
			container.appendChild(_renderer.domElement)

			// 后处理
			_composer = new THREE.EffectComposer(_renderer)
			_composer.addPass(new THREE.RenderPass(_scene, _camera))
			var bloomStr = (typeof cfg.bloomStrength === 'number') ? cfg.bloomStrength : 0.7
			var bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), bloomStr, 0.5, 0.65)
			_composer.addPass(bloom)

			_clock = { last: performance.now() }

			// resize
			var self = this
			_boundResize = function() {
				var cw = container.clientWidth
				var ch = container.clientHeight
				if (_camera) { _camera.aspect = cw / ch; _camera.updateProjectionMatrix() }
				if (_renderer) _renderer.setSize(cw, ch)
				if (_composer) _composer.setSize(cw, ch)
			}
			window.addEventListener('resize', _boundResize)
		},

		/* ---------- 天空（渐变背景大球） ---------- */
		buildSky(cfg) {
			var skyConf = cfg.sky || {}
			var canvas = document.createElement('canvas')
			canvas.width = 2
			canvas.height = 256
			var ctx = canvas.getContext('2d')
			var grd = ctx.createLinearGradient(0, 0, 0, 256)
			grd.addColorStop(0, skyConf.topColor || '#d7c0a2')
			grd.addColorStop(1, skyConf.bottomColor || '#f6ead7')
			ctx.fillStyle = grd
			ctx.fillRect(0, 0, 2, 256)

			var tex = new THREE.CanvasTexture(canvas)
			var skyGeo = new THREE.SphereGeometry(80, 16, 8)
			var skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
			var skyMesh = new THREE.Mesh(skyGeo, skyMat)
			_scene.add(skyMesh)
		},

		/* ---------- 地面 ---------- */
		buildGround(cfg) {
			var gc = cfg.ground || {}
			var size = gc.size || 60
			var geo = new THREE.PlaneGeometry(size, size, 24, 24)
			// 微起伏
			var pos = geo.attributes.position
			for (var i = 0; i < pos.count; i++) {
				pos.setZ(i, (Math.random() - 0.5) * 0.15)
			}
			geo.computeVertexNormals()
			var mat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(gc.color || '#9E9E8E'),
				roughness: 0.92, metalness: 0.08, flatShading: true
			})
			var ground = new THREE.Mesh(geo, mat)
			ground.rotation.x = -Math.PI / 2
			ground.receiveShadow = true
			_scene.add(ground)
		},

		/* ---------- 道路 ---------- */
		buildRoad(cfg) {
			var rc = cfg.road || {}
			var w = rc.width || 5
			var l = rc.length || 40

			// 用 CanvasTexture 画青石板纹理
			var canvas = document.createElement('canvas')
			canvas.width = 256
			canvas.height = 256
			var ctx = canvas.getContext('2d')
			// 底色
			ctx.fillStyle = rc.color || '#8A8278'
			ctx.fillRect(0, 0, 256, 256)
			// 石板缝隙（深色十字网格）
			ctx.strokeStyle = 'rgba(40, 30, 20, 0.42)'
			ctx.lineWidth = 3
			for (var sx = 0; sx <= 256; sx += 64) {
				ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, 256); ctx.stroke()
			}
			for (var sy = 0; sy <= 256; sy += 80) {
				ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(256, sy); ctx.stroke()
			}
			// 随机小裂纹（增加旧感）
			ctx.strokeStyle = 'rgba(40, 30, 20, 0.18)'
			ctx.lineWidth = 1
			for (var k = 0; k < 30; k++) {
				var x = Math.random() * 256
				var y = Math.random() * 256
				ctx.beginPath()
				ctx.moveTo(x, y)
				ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30)
				ctx.stroke()
			}
			var roadTex = new THREE.CanvasTexture(canvas)
			roadTex.wrapS = THREE.RepeatWrapping
			roadTex.wrapT = THREE.RepeatWrapping
			roadTex.repeat.set(2, l / 8)

			var geo = new THREE.PlaneGeometry(w, l, 8, 32)
			var pos = geo.attributes.position
			for (var i = 0; i < pos.count; i++) {
				pos.setZ(i, (Math.random() - 0.5) * 0.05)
			}
			geo.computeVertexNormals()
			var mat = new THREE.MeshStandardMaterial({
				map: roadTex,
				color: new THREE.Color(rc.color || '#9A9080'),
				roughness: 0.95, metalness: 0.05, flatShading: true
			})
			var road = new THREE.Mesh(geo, mat)
			road.rotation.x = -Math.PI / 2
			road.position.y = 0.02
			road.receiveShadow = true
			_scene.add(road)
		},

		/* ---------- 光照 ---------- */
		buildLighting(cfg) {
			var lc = cfg.lighting || {}
			// 环境光
			var amb = lc.ambient || {}
			var ambLight = new THREE.AmbientLight(new THREE.Color(amb.color || '#F5F0E8'), amb.intensity || 0.5)
			_scene.add(ambLight)

			// 方向光（阳光）
			var dc = lc.directional || {}
			var dirLight = new THREE.DirectionalLight(new THREE.Color(dc.color || '#FFD77F'), dc.intensity || 1.2)
			var dp = dc.position || { x: 10, y: 15, z: 10 }
			dirLight.position.set(dp.x, dp.y, dp.z)
			dirLight.castShadow = true
			dirLight.shadow.camera.near = 0.1
			dirLight.shadow.camera.far = 60
			dirLight.shadow.camera.left = -25
			dirLight.shadow.camera.right = 25
			dirLight.shadow.camera.top = 25
			dirLight.shadow.camera.bottom = -25
			dirLight.shadow.mapSize.width = 1024
			dirLight.shadow.mapSize.height = 1024
			_scene.add(dirLight)

			// 半球光（天地色差）
			var hemi = lc.hemi || { sky: '#F6EAD7', ground: '#9E9E8E', intensity: 0.35 }
			var hemiLight = new THREE.HemisphereLight(
				new THREE.Color(hemi.sky || '#F6EAD7'),
				new THREE.Color(hemi.ground || '#9E9E8E'),
				hemi.intensity || 0.35
			)
			_scene.add(hemiLight)

			// 夜间补光：街心点光（在 phase==='night' 时增加暖光）
			if (cfg.phase === 'night') {
				var nightLight = new THREE.PointLight(new THREE.Color('#FFB85A'), 0.8, 16)
				nightLight.position.set(0, 4, 0)
				_scene.add(nightLight)
			}
		},

		/* ============================================================
		 * BuildingFactory 内联
		 * ============================================================ */

		/** 创建硬山顶屋顶（带飞檐翘角） */
		createRoof(width, depth, color) {
			var group = new THREE.Group()
			var roofW = width + 1.0
			var roofH = width * 0.35
			var roofD = depth + 0.6

			// 主屋顶 - 用自定义 BufferGeometry 做三角剖面挤出
			var shape = new THREE.Shape()
			shape.moveTo(-roofW / 2, 0)
			// 左飞檐翘角
			shape.quadraticCurveTo(-roofW / 2 - 0.3, 0.15, -roofW / 2 + 0.5, 0.3)
			shape.lineTo(-width * 0.15, roofH)
			shape.lineTo(width * 0.15, roofH)
			shape.lineTo(roofW / 2 - 0.5, 0.3)
			// 右飞檐翘角
			shape.quadraticCurveTo(roofW / 2 + 0.3, 0.15, roofW / 2, 0)
			shape.lineTo(-roofW / 2, 0)

			var extSettings = { depth: roofD, bevelEnabled: false }
			var roofGeo = new THREE.ExtrudeGeometry(shape, extSettings)
			var roofMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(color || '#3D3D3D'),
				roughness: 0.88, metalness: 0.15, flatShading: true
			})
			var roofMesh = new THREE.Mesh(roofGeo, roofMat)
			roofMesh.rotation.x = Math.PI / 2
			roofMesh.position.set(0, 0, roofD / 2)
			roofMesh.castShadow = true
			group.add(roofMesh)

			// 脊饰
			var ridgeGeo = new THREE.BoxGeometry(width * 0.3, 0.15, roofD * 0.9)
			var ridgeMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#5A4A3A'), roughness: 0.9, flatShading: true
			})
			var ridge = new THREE.Mesh(ridgeGeo, ridgeMat)
			ridge.position.y = roofH + 0.07
			group.add(ridge)

			return group
		},

		/** 创建 CanvasTexture 匾额 */
		createPlaque(text) {
			var canvas = document.createElement('canvas')
			canvas.width = 512; canvas.height = 128
			var ctx = canvas.getContext('2d')
			ctx.fillStyle = '#8B4513'
			ctx.fillRect(0, 0, 512, 128)
			ctx.strokeStyle = '#D4A574'
			ctx.lineWidth = 8
			ctx.strokeRect(4, 4, 504, 120)
			ctx.fillStyle = '#F5F0E8'
			ctx.font = 'bold 72px serif'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(text, 256, 64)

			var tex = new THREE.CanvasTexture(canvas)
			var geo = new THREE.PlaneGeometry(2.2, 0.55)
			var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, flatShading: true })
			return new THREE.Mesh(geo, mat)
		},

		/** 创建竖排招牌 */
		createVerticalSign(text) {
			var canvas = document.createElement('canvas')
			canvas.width = 128; canvas.height = 512
			var ctx = canvas.getContext('2d')
			ctx.fillStyle = '#8B4513'
			ctx.fillRect(0, 0, 128, 512)
			ctx.strokeStyle = '#D4A574'
			ctx.lineWidth = 6
			ctx.strokeRect(3, 3, 122, 506)
			ctx.fillStyle = '#F5F0E8'
			ctx.font = 'bold 56px serif'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			var chars = text.split('')
			var sp = 512 / (chars.length + 1)
			for (var i = 0; i < chars.length; i++) {
				ctx.fillText(chars[i], 64, sp * (i + 1))
			}
			var tex = new THREE.CanvasTexture(canvas)
			var geo = new THREE.PlaneGeometry(0.5, 2)
			var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, flatShading: true })
			return new THREE.Mesh(geo, mat)
		},

		/** 传统民居 */
		createTraditionalHouse(config) {
			var g = new THREE.Group()
			var w = config.width || 4
			var d = config.depth || 3
			var h = config.height || 3

			// 墙体
			var wallGeo = new THREE.BoxGeometry(w, h, d)
			var wallMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#D4C5A9'), roughness: 0.82, metalness: 0.08, flatShading: true
			})
			var wall = new THREE.Mesh(wallGeo, wallMat)
			wall.position.y = h / 2
			wall.castShadow = true; wall.receiveShadow = true
			g.add(wall)

			// 硬山顶飞檐
			var roof = this.createRoof(w, d, '#3D3D3D')
			roof.position.y = h
			g.add(roof)

			// 门
			var doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.1)
			var doorMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#6B3A1F'), roughness: 0.9, flatShading: true
			})
			var door = new THREE.Mesh(doorGeo, doorMat)
			door.position.set(0, 0.8, d / 2 + 0.06)
			g.add(door)

			// 窗
			var winGeo = new THREE.BoxGeometry(0.7, 0.7, 0.08)
			var winMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#2C1810'), roughness: 0.5, flatShading: true
			})
			var w1 = new THREE.Mesh(winGeo, winMat)
			w1.position.set(-w * 0.3, h * 0.55, d / 2 + 0.05)
			g.add(w1)
			var w2 = w1.clone()
			w2.position.x = w * 0.3
			g.add(w2)

			return g
		},

		/** 票号建筑 */
		createBankBuilding(config) {
			var g = new THREE.Group()
			var w = config.width || 6
			var d = config.depth || 5
			var h = config.height || 4

			// 台基
			var baseGeo = new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6)
			var baseMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#A09888'), roughness: 0.95, flatShading: true
			})
			var base = new THREE.Mesh(baseGeo, baseMat)
			base.position.y = 0.2
			base.receiveShadow = true
			g.add(base)

			// 主体
			var wallGeo = new THREE.BoxGeometry(w, h, d)
			var wallMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#C9AE8A'), roughness: 0.8, metalness: 0.1, flatShading: true
			})
			var wall = new THREE.Mesh(wallGeo, wallMat)
			wall.position.y = h / 2 + 0.4
			wall.castShadow = true; wall.receiveShadow = true
			g.add(wall)

			// 屋顶
			var roof = this.createRoof(w, d, '#3D3D3D')
			roof.position.y = h + 0.4
			g.add(roof)

			// 大门（中国红）
			var gateGeo = new THREE.BoxGeometry(1.8, 2.2, 0.15)
			var gateMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#C41E3A'), roughness: 0.7, flatShading: true
			})
			var gate = new THREE.Mesh(gateGeo, gateMat)
			gate.position.set(0, 1.5, d / 2 + 0.08)
			g.add(gate)

			// 匾额
			var plaque = this.createPlaque(config.name || '日升昌')
			plaque.position.set(0, h + 0.1, d / 2 + 0.12)
			g.add(plaque)

			return g
		},

		/** 城门楼 */
		createGateTower(config) {
			var g = new THREE.Group()
			var w = config.width || 8
			var d = config.depth || 4
			var h = config.height || 6

			// 石台底座
			var baseGeo = new THREE.BoxGeometry(w, 1.2, d)
			var baseMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#9E9E8E'), roughness: 0.92, flatShading: true
			})
			var base = new THREE.Mesh(baseGeo, baseMat)
			base.position.y = 0.6
			base.castShadow = true; base.receiveShadow = true
			g.add(base)

			// 通道（挖空效果 - 简化为暗色矩形）
			var passGeo = new THREE.BoxGeometry(w * 0.4, 2.5, d + 0.2)
			var passMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#1A1008'), roughness: 0.9, flatShading: true
			})
			var pass = new THREE.Mesh(passGeo, passMat)
			pass.position.set(0, 2.45, 0)
			g.add(pass)

			// 四根柱子
			var pillarGeo = new THREE.CylinderGeometry(0.25, 0.28, h - 1.2, 8)
			var pillarMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#8B4513'), roughness: 0.8, flatShading: true
			})
			var px = w / 3
			var pz = d / 3
			var pillarY = (h - 1.2) / 2 + 1.2
			var positions = [[-px, pillarY, -pz], [px, pillarY, -pz], [-px, pillarY, pz], [px, pillarY, pz]]
			for (var i = 0; i < positions.length; i++) {
				var p = new THREE.Mesh(pillarGeo, pillarMat)
				p.position.set(positions[i][0], positions[i][1], positions[i][2])
				p.castShadow = true
				g.add(p)
			}

			// 上部墙体
			var upperGeo = new THREE.BoxGeometry(w, h * 0.4, d)
			var upperMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#D4C5A9'), roughness: 0.85, flatShading: true
			})
			var upper = new THREE.Mesh(upperGeo, upperMat)
			upper.position.y = h * 0.7 + 1.2
			upper.castShadow = true
			g.add(upper)

			// 双层飞檐屋顶
			var roof1 = this.createRoof(w, d, '#3D3D3D')
			roof1.position.y = h + 1.2
			g.add(roof1)

			var roof2 = this.createRoof(w * 0.7, d * 0.7, '#3D3D3D')
			roof2.position.y = h + 1.2 + w * 0.35 + 0.3
			g.add(roof2)

			return g
		},

		/** 商铺门面 */
		createShopFront(config) {
			var g = new THREE.Group()
			var w = config.width || 5
			var d = config.depth || 3
			var h = config.height || 2.5

			// 墙体
			var wallGeo = new THREE.BoxGeometry(w, h, d)
			var wallMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#D4C5A9'), roughness: 0.82, metalness: 0.08, flatShading: true
			})
			var wall = new THREE.Mesh(wallGeo, wallMat)
			wall.position.y = h / 2
			wall.castShadow = true; wall.receiveShadow = true
			g.add(wall)

			// 敞开门面（暗色凹槽）
			var openGeo = new THREE.BoxGeometry(w * 0.75, h * 0.7, 0.15)
			var openMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#2C1810'), roughness: 0.8, flatShading: true
			})
			var openFront = new THREE.Mesh(openGeo, openMat)
			openFront.position.set(0, h * 0.35, d / 2 + 0.05)
			g.add(openFront)

			// 屋顶
			var roof = this.createRoof(w, d, '#3D3D3D')
			roof.position.y = h
			g.add(roof)

			// 竖排招牌
			var sign = this.createVerticalSign(config.name || '商铺')
			sign.position.set(-w / 2 - 0.35, h * 0.6, 0)
			g.add(sign)

			return g
		},

		/** 城墙段 */
		createCityWall(config) {
			var g = new THREE.Group()
			var len = config.width || 6
			var h = config.height || 3.5
			var thick = 1.2

			var wallGeo = new THREE.BoxGeometry(len, h, thick)
			var wallMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#9E9E8E'), roughness: 0.92, flatShading: true
			})
			var wall = new THREE.Mesh(wallGeo, wallMat)
			wall.position.y = h / 2
			wall.castShadow = true; wall.receiveShadow = true
			g.add(wall)

			// 城垛
			var merlonGeo = new THREE.BoxGeometry(0.6, 0.5, thick)
			var merlonMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#8E8E7E'), roughness: 0.9, flatShading: true
			})
			var count = Math.floor(len / 1.2)
			for (var i = 0; i < count; i++) {
				var m = new THREE.Mesh(merlonGeo, merlonMat)
				m.position.set(-len / 2 + i * 1.2 + 0.6, h + 0.25, 0)
				m.castShadow = true
				g.add(m)
			}

			return g
		},

		/** 灯笼柱 */
		createLanternPost(config) {
			var g = new THREE.Group()
			var h = config.height || 3.2

			// 柱
			var poleGeo = new THREE.CylinderGeometry(0.06, 0.08, h, 6)
			var poleMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#8B4513'), roughness: 0.85, flatShading: true
			})
			var pole = new THREE.Mesh(poleGeo, poleMat)
			pole.position.y = h / 2
			pole.castShadow = true
			g.add(pole)

			// 横臂
			var armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4)
			var arm = new THREE.Mesh(armGeo, poleMat)
			arm.rotation.z = Math.PI / 2
			arm.position.set(0.4, h - 0.1, 0)
			g.add(arm)

			// 灯笼（椭球）
			var lanGeo = new THREE.SphereGeometry(0.28, 8, 6)
			lanGeo.scale(1, 1.3, 1)
			var lanMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#C41E3A'),
				emissive: new THREE.Color('#C41E3A'),
				emissiveIntensity: 0.9,
				roughness: 0.4, flatShading: true
			})
			var lantern = new THREE.Mesh(lanGeo, lanMat)
			lantern.position.set(0.8, h - 0.45, 0)
			g.add(lantern)

			// 灯笼穗子
			var tasselGeo = new THREE.ConeGeometry(0.06, 0.3, 4)
			var tasselMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#FFD77F'), roughness: 0.6, flatShading: true
			})
			var tassel = new THREE.Mesh(tasselGeo, tasselMat)
			tassel.position.set(0.8, h - 0.85, 0)
			g.add(tassel)

			// 点光源
			var light = new THREE.PointLight(new THREE.Color('#FFD77F'), 1.2, 8)
			light.position.set(0.8, h - 0.3, 0)
			g.add(light)

			return g
		},

		/** 古槐树（Low-Poly 三层球）*/
		createTree(config) {
			var g = new THREE.Group()
			var h = config.height || 4.5

			// 树干
			var trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, h * 0.5, 6)
			var trunkMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#5a3a22'), roughness: 0.95, flatShading: true
			})
			var trunk = new THREE.Mesh(trunkGeo, trunkMat)
			trunk.position.y = h * 0.25
			trunk.castShadow = true
			g.add(trunk)

			// 三层叶
			var leafMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(config.leafColor || '#506b3a'),
				roughness: 0.9, flatShading: true
			})
			var radii = [1.0, 0.85, 0.65]
			var ys = [h * 0.55, h * 0.78, h * 0.95]
			for (var i = 0; i < 3; i++) {
				var leafGeo = new THREE.IcosahedronGeometry(radii[i], 0)
				var leaf = new THREE.Mesh(leafGeo, leafMat)
				leaf.position.y = ys[i]
				leaf.castShadow = true
				g.add(leaf)
			}
			return g
		},

		/** 旗幡 / 商铺幌子 */
		createBanner(config) {
			var g = new THREE.Group()
			var h = config.height || 2.8

			// 杆
			var poleGeo = new THREE.CylinderGeometry(0.04, 0.04, h, 4)
			var poleMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#4a2a18'), roughness: 0.9, flatShading: true
			})
			var pole = new THREE.Mesh(poleGeo, poleMat)
			pole.position.y = h / 2
			g.add(pole)

			// 旗
			var flagGeo = new THREE.PlaneGeometry(0.7, 1.2)
			var flagMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(config.color || '#C41E3A'),
				emissive: new THREE.Color(config.color || '#C41E3A'),
				emissiveIntensity: 0.15,
				roughness: 0.7, side: THREE.DoubleSide, flatShading: true
			})
			var flag = new THREE.Mesh(flagGeo, flagMat)
			flag.position.set(0.36, h - 0.7, 0)
			g.add(flag)

			// 飘带
			var ribbonGeo = new THREE.PlaneGeometry(0.05, 0.3)
			var ribbon = new THREE.Mesh(ribbonGeo, flagMat)
			ribbon.position.set(0.7, h - 1.4, 0)
			g.add(ribbon)
			return g
		},

		/** 石灯 */
		createStoneLantern(config) {
			var g = new THREE.Group()
			var stoneMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#9A9080'), roughness: 0.95, flatShading: true
			})
			var glowMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#FFD77F'),
				emissive: new THREE.Color('#FFD77F'),
				emissiveIntensity: 0.8,
				roughness: 0.4, flatShading: true
			})

			// 底座
			var baseGeo = new THREE.BoxGeometry(0.36, 0.2, 0.36)
			var base = new THREE.Mesh(baseGeo, stoneMat)
			base.position.y = 0.1
			g.add(base)

			// 柱身
			var pillarGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6)
			var pillar = new THREE.Mesh(pillarGeo, stoneMat)
			pillar.position.y = 0.55
			g.add(pillar)

			// 灯笼室
			var roomGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32)
			var room = new THREE.Mesh(roomGeo, glowMat)
			room.position.y = 1.05
			g.add(room)

			// 顶
			var roofGeo = new THREE.ConeGeometry(0.32, 0.2, 4)
			var roof = new THREE.Mesh(roofGeo, stoneMat)
			roof.position.y = 1.31
			roof.rotation.y = Math.PI / 4
			g.add(roof)

			var pl = new THREE.PointLight(new THREE.Color('#FFD77F'), 0.8, 4)
			pl.position.y = 1.05
			g.add(pl)

			return g
		},

		/** 鼓 */
		createDrum(config) {
			var g = new THREE.Group()
			var drumGeo = new THREE.CylinderGeometry(0.42, 0.4, 0.7, 12)
			var drumMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#7a2820'), roughness: 0.7, flatShading: true
			})
			var drum = new THREE.Mesh(drumGeo, drumMat)
			drum.position.y = 0.55
			drum.castShadow = true
			g.add(drum)

			// 上下面（皮）
			var skinMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#e6d6b0'), roughness: 0.85, flatShading: true
			})
			var topGeo = new THREE.CircleGeometry(0.42, 16)
			var top = new THREE.Mesh(topGeo, skinMat)
			top.rotation.x = -Math.PI / 2
			top.position.y = 0.91
			g.add(top)

			var bot = top.clone()
			bot.rotation.x = Math.PI / 2
			bot.position.y = 0.21
			g.add(bot)

			// 支架
			var standMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#4a2a18'), roughness: 0.9, flatShading: true
			})
			var legGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06)
			for (var i = 0; i < 4; i++) {
				var leg = new THREE.Mesh(legGeo, standMat)
				var ang = i * Math.PI * 0.5 + Math.PI * 0.25
				leg.position.set(Math.cos(ang) * 0.32, 0.275, Math.sin(ang) * 0.32)
				g.add(leg)
			}
			return g
		},

		/* ---------- 建筑批量生成 ---------- */
		buildBuildings(cfg) {
			var buildings = cfg.buildings || []
			for (var i = 0; i < buildings.length; i++) {
				var b = buildings[i]
				var group = null
				var bc = b.config || {}
				if (b.type === 'bank_building') group = this.createBankBuilding(bc)
				else if (b.type === 'gate_tower') group = this.createGateTower(bc)
				else if (b.type === 'shop_front') group = this.createShopFront(bc)
				else if (b.type === 'city_wall') group = this.createCityWall(bc)
				else group = this.createTraditionalHouse(bc)

				if (group) {
					var pos = b.position || { x: 0, y: 0, z: 0 }
					group.position.set(pos.x, pos.y, pos.z)
					if (b.rotation) group.rotation.y = b.rotation
					_scene.add(group)

					// 碰撞体
					var cw = (bc.width || 4) / 2
					_obstacles.push({
						x: pos.x, z: pos.z,
						radius: Math.max(cw, (bc.depth || 3) / 2) + 0.3
					})
				}
			}
		},

		/* ---------- 装饰生成 ---------- */
		buildDecorations(cfg) {
			var decs = cfg.decorations || []
			for (var i = 0; i < decs.length; i++) {
				var d = decs[i]
				var dp = d.position || { x: 0, y: 0, z: 0 }
				var item = null
				if (d.type === 'lantern_post') {
					item = this.createLanternPost({ height: d.height || 3.2 })
				} else if (d.type === 'tree') {
					item = this.createTree({ height: d.height || 4.5, leafColor: d.leafColor })
				} else if (d.type === 'banner') {
					item = this.createBanner({ height: d.height || 2.8, color: d.color })
				} else if (d.type === 'stone_lantern') {
					item = this.createStoneLantern({})
				} else if (d.type === 'drum') {
					item = this.createDrum({})
				}
				if (item) {
					item.position.set(dp.x, dp.y, dp.z)
					if (d.rotation) item.rotation.y = d.rotation
					_scene.add(item)
				}
			}
		},

		/* ============================================================
		 * Particles - 萤火/飘尘粒子系统
		 * ============================================================ */
		buildParticles(cfg) {
			var phase = cfg.phase || 'noon'
			// 选定粒子配置
			var conf
			if (phase === 'night') {
				conf = { count: 60, color: '#FFE082', size: 0.18, opacity: 0.9, yMin: 0.4, yMax: 4.5, drift: 0.6 }
			} else if (phase === 'dusk') {
				conf = { count: 40, color: '#FFB76A', size: 0.14, opacity: 0.55, yMin: 0.6, yMax: 5.5, drift: 0.4 }
			} else if (phase === 'dawn') {
				conf = { count: 50, color: '#FFE2C0', size: 0.10, opacity: 0.42, yMin: 0.4, yMax: 4.5, drift: 0.35 }
			} else {
				conf = { count: 30, color: '#FFFFFF', size: 0.08, opacity: 0.32, yMin: 0.6, yMax: 5.5, drift: 0.3 }
			}

			var positions = new Float32Array(conf.count * 3)
			var velocities = new Float32Array(conf.count * 3)
			for (var i = 0; i < conf.count; i++) {
				positions[i * 3] = (Math.random() - 0.5) * 32
				positions[i * 3 + 1] = conf.yMin + Math.random() * (conf.yMax - conf.yMin)
				positions[i * 3 + 2] = (Math.random() - 0.5) * 36
				velocities[i * 3] = (Math.random() - 0.5) * conf.drift
				velocities[i * 3 + 1] = (Math.random() * 0.4 + 0.05) * (phase === 'night' ? 0.4 : 0.2)
				velocities[i * 3 + 2] = (Math.random() - 0.5) * conf.drift
			}

			var geo = new THREE.BufferGeometry()
			geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

			// 用 CanvasTexture 做柔光圆点
			var canvas = document.createElement('canvas')
			canvas.width = 64; canvas.height = 64
			var ctx = canvas.getContext('2d')
			var grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
			grd.addColorStop(0, 'rgba(255, 255, 255, 1)')
			grd.addColorStop(0.4, 'rgba(255, 255, 255, 0.65)')
			grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
			ctx.fillStyle = grd
			ctx.fillRect(0, 0, 64, 64)
			var dotTex = new THREE.CanvasTexture(canvas)

			var mat = new THREE.PointsMaterial({
				color: new THREE.Color(conf.color),
				size: conf.size,
				map: dotTex,
				transparent: true,
				opacity: conf.opacity,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				sizeAttenuation: true
			})

			var points = new THREE.Points(geo, mat)
			_scene.add(points)
			_particles = {
				mesh: points,
				geo: geo,
				count: conf.count,
				positions: positions,
				velocities: velocities,
				yMin: conf.yMin,
				yMax: conf.yMax,
				bounds: 18
			}
		},

		updateParticles(dt) {
			if (!_particles) return
			var p = _particles
			var pos = p.positions
			for (var i = 0; i < p.count; i++) {
				var ix = i * 3
				pos[ix] += p.velocities[ix] * dt
				pos[ix + 1] += p.velocities[ix + 1] * dt
				pos[ix + 2] += p.velocities[ix + 2] * dt
				// 出界 → 重生
				if (pos[ix + 1] > p.yMax) pos[ix + 1] = p.yMin
				if (pos[ix] > p.bounds) pos[ix] = -p.bounds
				if (pos[ix] < -p.bounds) pos[ix] = p.bounds
				if (pos[ix + 2] > p.bounds) pos[ix + 2] = -p.bounds
				if (pos[ix + 2] < -p.bounds) pos[ix + 2] = p.bounds
			}
			p.geo.attributes.position.needsUpdate = true
		},

		/* ============================================================
		 * PoiBeacon 内联
		 * ============================================================ */
		buildPois(cfg) {
			var pois = cfg.pois || []
			_beacons = []
			var statusColors = {
				discoverable: '#D4A574',
				quest: '#C41E3A',
				completed: '#808080',
				nearby: '#F5F0E8',
				hot: '#FFD77F',
				route: '#8B4513'
			}

			for (var i = 0; i < pois.length; i++) {
				var poi = pois[i]
				var color = new THREE.Color(statusColors[poi.status] || '#D4A574')
				var isPulsing = poi.status === 'nearby' || poi.status === 'hot'

				var bg = new THREE.Group()

				// 底部发光圆环
				var ringGeo = new THREE.TorusGeometry(0.7, 0.08, 8, 16)
				var ringMat = new THREE.MeshStandardMaterial({
					color: color, emissive: color, emissiveIntensity: 0.6,
					roughness: 0.3, metalness: 0.7, flatShading: true
				})
				var ring = new THREE.Mesh(ringGeo, ringMat)
				ring.rotation.x = Math.PI / 2
				ring.position.y = 0.1
				bg.add(ring)

				// 浮动八面体
				var cryGeo = new THREE.OctahedronGeometry(0.35, 0)
				var cryMat = new THREE.MeshStandardMaterial({
					color: color, emissive: color, emissiveIntensity: 0.85,
					roughness: 0.2, metalness: 0.8, flatShading: true,
					transparent: true, opacity: 0.92
				})
				var crystal = new THREE.Mesh(cryGeo, cryMat)
				crystal.position.y = 1.5
				bg.add(crystal)

				// 光柱
				var beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6)
				var beamMat = new THREE.MeshStandardMaterial({
					color: color, emissive: color, emissiveIntensity: 0.4,
					roughness: 0.3, transparent: true, opacity: 0.35, flatShading: true
				})
				var beam = new THREE.Mesh(beamGeo, beamMat)
				beam.position.y = 0.7
				bg.add(beam)

				// 点光源
				var poiLight = new THREE.PointLight(color, 1.2, 6)
				poiLight.position.y = 1.5
				bg.add(poiLight)

				// 名称标签
				if (poi.name) {
					var label = this.createPlaque(poi.name)
					label.position.set(0, 2.5, 0)
					label.scale.set(0.7, 0.7, 0.7)
					bg.add(label)
				}

				var pp = poi.position || { x: 0, y: 0, z: 0 }
				bg.position.set(pp.x, pp.y, pp.z)
				_scene.add(bg)

				_beacons.push({
					group: bg, ring: ring, crystal: crystal, beam: beam,
					light: poiLight, isPulsing: isPulsing, time: Math.random() * 6,
					id: poi.id
				})
			}
		},

		/* ============================================================
		 * PlayerController 内联
		 * ============================================================ */
		initPlayer(cfg) {
			var spawn = cfg.playerSpawn || { x: 0, y: 0, z: 10 }
			var pg = new THREE.Group()

			// 身体
			var bodyGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.2, 8)
			var bodyMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#4A6B8A'), roughness: 0.7, metalness: 0.2, flatShading: true
			})
			var body = new THREE.Mesh(bodyGeo, bodyMat)
			body.position.y = 0.6
			body.castShadow = true
			pg.add(body)

			// 头
			var headGeo = new THREE.SphereGeometry(0.22, 8, 6)
			var headMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#D4A574'), roughness: 0.6, metalness: 0.15, flatShading: true
			})
			var head = new THREE.Mesh(headGeo, headMat)
			head.position.y = 1.42
			head.castShadow = true
			pg.add(head)

			// 发髻
			var bunGeo = new THREE.SphereGeometry(0.12, 6, 4)
			var bunMat = new THREE.MeshStandardMaterial({
				color: new THREE.Color('#2C1810'), roughness: 0.8, flatShading: true
			})
			var bun = new THREE.Mesh(bunGeo, bunMat)
			bun.position.set(0, 1.68, -0.05)
			pg.add(bun)

			// 脚下阴影
			var shadowGeo = new THREE.CircleGeometry(0.4, 12)
			var shadowMat = new THREE.MeshBasicMaterial({
				color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false
			})
			var shadow = new THREE.Mesh(shadowGeo, shadowMat)
			shadow.rotation.x = -Math.PI / 2
			shadow.position.y = 0.02
			pg.add(shadow)

			pg.position.set(spawn.x, spawn.y, spawn.z)
			_scene.add(pg)

			_playerCtrl = {
				group: pg,
				position: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
				velocity: new THREE.Vector3(),
				moveSpeed: 4,
				bobTime: 0,
				isMoving: false
			}
		},

		updatePlayer(dt) {
			if (!_playerCtrl) return
			var pc = _playerCtrl
			var dx = _joystickInput.dx || 0
			var dz = _joystickInput.dy || 0

			pc.isMoving = (dx !== 0 || dz !== 0)

			if (pc.isMoving) {
				// 基于相机朝向的移动方向
				var camDir = new THREE.Vector3()
				_camera.getWorldDirection(camDir)
				camDir.y = 0
				camDir.normalize()

				var right = new THREE.Vector3()
				right.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize()

				var moveDir = new THREE.Vector3()
				moveDir.addScaledVector(right, dx)
				moveDir.addScaledVector(camDir, -dz) // 负号：摇杆上=前进=相机方向
				moveDir.normalize()

				var newPos = pc.position.clone()
				newPos.x += moveDir.x * pc.moveSpeed * dt
				newPos.z += moveDir.z * pc.moveSpeed * dt

				// 碰撞检测
				var collided = false
				for (var i = 0; i < _obstacles.length; i++) {
					var obs = _obstacles[i]
					var odx = newPos.x - obs.x
					var odz = newPos.z - obs.z
					if (Math.sqrt(odx * odx + odz * odz) < 0.5 + obs.radius) {
						collided = true
						break
					}
				}

				// 边界限制
				var boundary = 28
				if (Math.abs(newPos.x) > boundary || Math.abs(newPos.z) > boundary) {
					collided = true
				}

				if (!collided) {
					pc.position.copy(newPos)
				}

				// 朝向
				if (moveDir.length() > 0.01) {
					var angle = Math.atan2(moveDir.x, moveDir.z)
					pc.group.rotation.y = angle
				}

				// 行走浮动
				pc.bobTime += dt * 6
				pc.group.position.y = pc.position.y + Math.sin(pc.bobTime) * 0.08
			} else {
				pc.bobTime = 0
				pc.group.position.y = pc.position.y
			}

			pc.group.position.x = pc.position.x
			pc.group.position.z = pc.position.z
		},

		/* ============================================================
		 * CameraController 内联
		 * ============================================================ */
		initCamera(cfg) {
			_camCtrl = {
				distance: 10,
				azimuth: 0,
				polar: Math.PI / 5.5, // ~33°
				minDist: 5, maxDist: 20,
				minPolar: Math.PI / 18, maxPolar: Math.PI / 3,
				isTouching: false,
				touchStartX: 0, touchStartY: 0,
				lastAzimuth: 0, lastPolar: 0,
				pinchDist: 0, pinchInitDist: 10
			}

			var canvas = _renderer.domElement
			var self = this

			_boundTouchStart = function(e) { self.camTouchStart(e) }
			_boundTouchMove = function(e) { self.camTouchMove(e) }
			_boundTouchEnd = function(e) { self.camTouchEnd(e) }

			canvas.addEventListener('touchstart', _boundTouchStart, { passive: false })
			canvas.addEventListener('touchmove', _boundTouchMove, { passive: false })
			canvas.addEventListener('touchend', _boundTouchEnd, { passive: false })

			// PC 鼠标拖拽
			var mouseDown = false
			var mouseX = 0, mouseY = 0
			canvas.addEventListener('mousedown', function(e) {
				if (e.clientX > window.innerWidth / 2) {
					mouseDown = true
					mouseX = e.clientX
					mouseY = e.clientY
					_camCtrl.lastAzimuth = _camCtrl.azimuth
					_camCtrl.lastPolar = _camCtrl.polar
				}
			})
			canvas.addEventListener('mousemove', function(e) {
				if (!mouseDown) return
				var ddx = e.clientX - mouseX
				var ddy = e.clientY - mouseY
				_camCtrl.azimuth = _camCtrl.lastAzimuth + ddx * 0.005
				_camCtrl.polar = _camCtrl.lastPolar + ddy * 0.005
				_camCtrl.polar = Math.max(_camCtrl.minPolar, Math.min(_camCtrl.maxPolar, _camCtrl.polar))
			})
			canvas.addEventListener('mouseup', function() { mouseDown = false })

			// 滚轮缩放
			canvas.addEventListener('wheel', function(e) {
				_camCtrl.distance += e.deltaY * 0.01
				_camCtrl.distance = Math.max(_camCtrl.minDist, Math.min(_camCtrl.maxDist, _camCtrl.distance))
			})
		},

		camTouchStart(e) {
			if (!_camCtrl) return
			if (e.touches.length === 1) {
				var t = e.touches[0]
				if (t.clientX > window.innerWidth / 2) {
					_camCtrl.isTouching = true
					_camCtrl.touchStartX = t.clientX
					_camCtrl.touchStartY = t.clientY
					_camCtrl.lastAzimuth = _camCtrl.azimuth
					_camCtrl.lastPolar = _camCtrl.polar
				}
			} else if (e.touches.length === 2) {
				var dx = e.touches[0].clientX - e.touches[1].clientX
				var dy = e.touches[0].clientY - e.touches[1].clientY
				_camCtrl.pinchDist = Math.sqrt(dx * dx + dy * dy)
				_camCtrl.pinchInitDist = _camCtrl.distance
			}
		},

		camTouchMove(e) {
			if (!_camCtrl) return
			if (e.touches.length === 1 && _camCtrl.isTouching) {
				var t = e.touches[0]
				var ddx = t.clientX - _camCtrl.touchStartX
				var ddy = t.clientY - _camCtrl.touchStartY
				_camCtrl.azimuth = _camCtrl.lastAzimuth + ddx * 0.005
				_camCtrl.polar = _camCtrl.lastPolar + ddy * 0.005
				_camCtrl.polar = Math.max(_camCtrl.minPolar, Math.min(_camCtrl.maxPolar, _camCtrl.polar))
			} else if (e.touches.length === 2) {
				var dx = e.touches[0].clientX - e.touches[1].clientX
				var dy = e.touches[0].clientY - e.touches[1].clientY
				var cur = Math.sqrt(dx * dx + dy * dy)
				var scale = cur / _camCtrl.pinchDist
				_camCtrl.distance = _camCtrl.pinchInitDist / scale
				_camCtrl.distance = Math.max(_camCtrl.minDist, Math.min(_camCtrl.maxDist, _camCtrl.distance))
			}
		},

		camTouchEnd(e) {
			if (!_camCtrl) return
			_camCtrl.isTouching = false
		},

		updateCamera() {
			if (!_camCtrl || !_playerCtrl || !_camera) return
			var cc = _camCtrl
			var target = _playerCtrl.position

			var x = target.x + cc.distance * Math.sin(cc.polar) * Math.sin(cc.azimuth)
			var y = target.y + cc.distance * Math.cos(cc.polar)
			var z = target.z + cc.distance * Math.sin(cc.polar) * Math.cos(cc.azimuth)

			_camera.position.lerp(new THREE.Vector3(x, y, z), 0.08)
			_camera.lookAt(target.x, target.y + 1.0, target.z)
		},

		/* ============================================================
		 * JoystickController 内联
		 * ============================================================ */
		initJoystick() {
			var container = document.getElementById('three-container')
			if (!container) return

			// 摇杆底座
			var base = document.createElement('div')
			base.style.cssText = 'position:absolute;width:130px;height:130px;border-radius:50%;' +
				'background:rgba(139,69,19,0.25);border:2px solid rgba(212,165,116,0.45);' +
				'display:none;pointer-events:none;z-index:100;' +
				'box-shadow:0 0 20px rgba(212,165,116,0.15);'
			container.appendChild(base)

			// 摇杆内圈
			var stick = document.createElement('div')
			stick.style.cssText = 'position:absolute;width:55px;height:55px;border-radius:50%;' +
				'background:rgba(212,165,116,0.75);border:2px solid rgba(245,240,232,0.5);' +
				'top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;' +
				'box-shadow:0 0 12px rgba(212,165,116,0.3);'
			base.appendChild(stick)

			var maxR = 55
			var joyTouchId = null
			var joyActive = false
			var jCenterX = 0, jCenterY = 0
			var self = this

			function joyStart(e) {
				for (var i = 0; i < e.changedTouches.length; i++) {
					var t = e.changedTouches[i]
					if (t.clientX < window.innerWidth / 2 && !joyActive) {
						joyActive = true
						joyTouchId = t.identifier
						jCenterX = t.clientX
						jCenterY = t.clientY
						base.style.display = 'block'
						base.style.left = (jCenterX - 65) + 'px'
						base.style.top = (jCenterY - 65) + 'px'
						e.preventDefault()
					}
				}
			}

			function joyMove(e) {
				if (!joyActive) return
				for (var i = 0; i < e.changedTouches.length; i++) {
					var t = e.changedTouches[i]
					if (t.identifier === joyTouchId) {
						var dx = t.clientX - jCenterX
						var dy = t.clientY - jCenterY
						var dist = Math.sqrt(dx * dx + dy * dy)
						var cx = dx, cy = dy
						if (dist > maxR) { cx = dx / dist * maxR; cy = dy / dist * maxR }
						stick.style.transform = 'translate(calc(-50% + ' + cx + 'px), calc(-50% + ' + cy + 'px))'
						_joystickInput.dx = cx / maxR
						_joystickInput.dy = cy / maxR
						e.preventDefault()
					}
				}
			}

			function joyEnd(e) {
				for (var i = 0; i < e.changedTouches.length; i++) {
					if (e.changedTouches[i].identifier === joyTouchId) {
						joyActive = false
						joyTouchId = null
						_joystickInput.dx = 0
						_joystickInput.dy = 0
						base.style.display = 'none'
						stick.style.transform = 'translate(-50%, -50%)'
					}
				}
			}

			container.addEventListener('touchstart', joyStart, { passive: false })
			container.addEventListener('touchmove', joyMove, { passive: false })
			container.addEventListener('touchend', joyEnd, { passive: false })
			container.addEventListener('touchcancel', joyEnd, { passive: false })

			// WASD 键盘支持
			var keys = { w: false, a: false, s: false, d: false }
			_boundKeyDown = function(e) {
				var k = e.key.toLowerCase()
				if (k in keys) {
					keys[k] = true
					var kx = 0, ky = 0
					if (keys.a) kx -= 1; if (keys.d) kx += 1
					if (keys.w) ky -= 1; if (keys.s) ky += 1
					if (kx !== 0 && ky !== 0) {
						var len = Math.sqrt(kx * kx + ky * ky)
						kx /= len; ky /= len
					}
					_joystickInput.dx = kx; _joystickInput.dy = ky
				}
			}
			_boundKeyUp = function(e) {
				var k = e.key.toLowerCase()
				if (k in keys) {
					keys[k] = false
					var kx = 0, ky = 0
					if (keys.a) kx -= 1; if (keys.d) kx += 1
					if (keys.w) ky -= 1; if (keys.s) ky += 1
					if (kx !== 0 && ky !== 0) {
						var len = Math.sqrt(kx * kx + ky * ky)
						kx /= len; ky /= len
					}
					_joystickInput.dx = kx; _joystickInput.dy = ky
				}
			}
			window.addEventListener('keydown', _boundKeyDown)
			window.addEventListener('keyup', _boundKeyUp)

			_joyCtrl = { base: base, stick: stick }
		},

		/* ============================================================
		 * 动画循环
		 * ============================================================ */
		startLoop() {
			_isRunning = true
			_lastTime = performance.now()
			_frameCount = 0
			var fpsLastTime = performance.now()
			var miniMapLastTime = 0
			var self = this

			function loop() {
				if (!_isRunning) return
				_animId = requestAnimationFrame(loop)

				var now = performance.now()
				var dt = Math.min((now - _lastTime) / 1000, 0.1) // 最大 100ms
				_lastTime = now

				// 更新子系统
				self.updatePlayer(dt)
				self.updateCamera()
				self.updateBeacons(dt)
				self.updateParticles(dt)

				// 渲染
				if (_composer) _composer.render()

				// 每 200ms 发一次玩家世界坐标（迷你地图用）
				if (_playerCtrl && now - miniMapLastTime >= 200) {
					var pp = _playerCtrl.position
					var rot = _playerCtrl.group ? _playerCtrl.group.rotation.y : 0
					// Three.js Y 旋转 → 屏幕角度（迷你地图 0° 朝上）
					var degree = -(rot * 180 / Math.PI)
					self.sendMsg('playerWorld', { x: pp.x, z: pp.z, rotation: degree })
					miniMapLastTime = now
				}

				// FPS
				_frameCount++
				if (now - fpsLastTime >= 1000) {
					self.sendMsg('fpsUpdate', _frameCount)
					_frameCount = 0
					fpsLastTime = now

					// 同步位置（调试用）
					if (_playerCtrl) {
						var p = _playerCtrl.position
						self.sendMsg('playerMove', Math.round(p.x) + ', ' + Math.round(p.z))
					}
				}
			}

			loop()
		},

		updateBeacons(dt) {
			for (var i = 0; i < _beacons.length; i++) {
				var b = _beacons[i]
				b.time += dt

				// 圆环旋转
				if (b.ring) b.ring.rotation.z += dt * 0.5

				// 水晶浮动 + 旋转
				if (b.crystal) {
					b.crystal.rotation.y += dt * 1.5
					b.crystal.rotation.x += dt * 0.4
					b.crystal.position.y = 1.5 + Math.sin(b.time * 2) * 0.2
				}

				// 脉冲
				if (b.isPulsing) {
					var pulse = (Math.sin(b.time * 3) + 1) / 2
					if (b.ring) b.ring.material.emissiveIntensity = 0.4 + pulse * 0.5
					if (b.crystal) b.crystal.material.emissiveIntensity = 0.5 + pulse * 0.5
					if (b.light) b.light.intensity = 0.8 + pulse * 1.2
				}
			}
		},

		countTriangles() {
			if (!_scene) return
			var count = 0
			_scene.traverse(function(obj) {
				if (obj.geometry) {
					if (obj.geometry.index) count += obj.geometry.index.count / 3
					else if (obj.geometry.attributes && obj.geometry.attributes.position) {
						count += obj.geometry.attributes.position.count / 3
					}
				}
			})
			this.sendMsg('triangles', Math.floor(count))
		},

		/* ============================================================
		 * Dispose 内联
		 * ============================================================ */
		disposeAll() {
			_isRunning = false
			if (_animId) { cancelAnimationFrame(_animId); _animId = null }

			// 解绑事件
			if (_renderer && _renderer.domElement) {
				if (_boundTouchStart) _renderer.domElement.removeEventListener('touchstart', _boundTouchStart)
				if (_boundTouchMove) _renderer.domElement.removeEventListener('touchmove', _boundTouchMove)
				if (_boundTouchEnd) _renderer.domElement.removeEventListener('touchend', _boundTouchEnd)
			}
			if (_boundKeyDown) window.removeEventListener('keydown', _boundKeyDown)
			if (_boundKeyUp) window.removeEventListener('keyup', _boundKeyUp)
			if (_boundResize) window.removeEventListener('resize', _boundResize)

			// 清理摇杆
			if (_joyCtrl && _joyCtrl.base && _joyCtrl.base.parentNode) {
				_joyCtrl.base.parentNode.removeChild(_joyCtrl.base)
			}

			// 清理场景
			if (_scene) {
				_scene.traverse(function(obj) {
					if (obj.geometry) obj.geometry.dispose()
					if (obj.material) {
						if (Array.isArray(obj.material)) {
							obj.material.forEach(function(m) {
								if (m.map) m.map.dispose()
								m.dispose()
							})
						} else {
							if (obj.material.map) obj.material.map.dispose()
							obj.material.dispose()
						}
					}
				})
			}

			if (_renderer) {
				_renderer.dispose()
				var container = document.getElementById('three-container')
				if (container && _renderer.domElement) {
					try { container.removeChild(_renderer.domElement) } catch(e) {}
				}
			}

			if (_composer) _composer = null

			_scene = null; _camera = null; _renderer = null
			_playerCtrl = null; _camCtrl = null; _joyCtrl = null
			_beacons = []; _obstacles = []
			_particles = null

			console.log('[3d] disposed')
		}
	}
}
</script>

<style lang="scss">
.game-page {
	position: fixed;
	inset: 0;
	background: #1A1008;
	overflow: hidden;
}

.three-container {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

/* 调试面板 */
.debug-panel {
	position: absolute;
	top: 16rpx;
	left: 16rpx;
	padding: 20rpx 24rpx;
	background: rgba(26, 16, 8, 0.82);
	border: 1px solid rgba(212, 165, 116, 0.35);
	border-radius: 12rpx;
	backdrop-filter: blur(8px);
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	z-index: 20;
}

.debug-title {
	font-size: 26rpx;
	font-weight: 700;
	color: #D4A574;
	margin-bottom: 4rpx;
}

.debug-info {
	font-size: 22rpx;
	color: #F5F0E8;
	font-family: 'Courier New', monospace;
	opacity: 0.85;
}

/* 底部 HUD */
.hud-bar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 90rpx;
	background: linear-gradient(180deg, transparent 0%, rgba(26, 16, 8, 0.85) 40%, rgba(26, 16, 8, 0.95) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 24rpx;
	z-index: 15;
	padding-bottom: env(safe-area-inset-bottom);
}

.hud-label {
	font-size: 28rpx;
	font-weight: 700;
	color: #D4A574;
	letter-spacing: 4rpx;
}

.hud-sub {
	font-size: 22rpx;
	color: rgba(245, 240, 232, 0.65);
	max-width: 400rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hud-phase {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	background: rgba(196, 30, 58, 0.85);
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 8rpx;
	transform: rotate(-6deg);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

.hud-phase-char {
	font-size: 30rpx;
	font-weight: 700;
	color: #F5F0E8;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

/* 返回按钮 */
.back-btn {
	position: absolute;
	top: 16rpx;
	right: 16rpx;
	width: 64rpx;
	height: 64rpx;
	background: rgba(26, 16, 8, 0.75);
	border: 1px solid rgba(212, 165, 116, 0.35);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20;
}

.back-icon {
	font-size: 32rpx;
	color: #D4A574;
}

/* 调试开关 */
.debug-toggle {
	position: absolute;
	top: 16rpx;
	right: 96rpx;
	width: 64rpx;
	height: 64rpx;
	background: rgba(26, 16, 8, 0.75);
	border: 1px solid rgba(212, 165, 116, 0.35);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20;
}

.debug-toggle-icon {
	font-size: 32rpx;
	color: #D4A574;
}

/* 迷你地图（横屏模式右下角，避开摇杆与底部 HUD）*/
.mini-map-anchor {
	position: absolute;
	right: 24rpx;
	bottom: 130rpx;
	z-index: 18;
	pointer-events: none;
}

.mini-map-anchor > * {
	pointer-events: auto;
}
</style>
