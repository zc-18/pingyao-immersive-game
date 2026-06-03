/**
 * BuildingFactory - 程序化古建筑生成器（参考文档，实际使用时需内联到 renderjs）
 *
 * 职责：
 * - 程序化生成 Low-Poly 国风古建筑
 * - 支持类型：traditional_house / bank_building / gate_tower / shop_front / city_wall / lantern_post
 * - 关键特征：硬山顶飞檐 + CanvasTexture 中文招牌 + 灯笼 emissive + PointLight
 * - 使用 mergeBufferGeometries 减少 draw calls
 */

export const BuildingFactoryMethods = {
	/**
	 * 创建传统民居（硬山顶 + 飞檐）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createTraditionalHouse(config = {}) {
		const group = new THREE.Group()

		const width = config.width || 4
		const depth = config.depth || 3
		const height = config.height || 3
		const wallColor = config.wallColor || 0xD4C5A9
		const roofColor = config.roofColor || 0x3D3D3D
		const woodColor = config.woodColor || 0x8B4513

		// 墙体（矩形）
		const wallGeometry = new THREE.BoxGeometry(width, height, depth)
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: wallColor,
			roughness: 0.8,
			metalness: 0.1,
			flatShading: true
		})
		const wall = new THREE.Mesh(wallGeometry, wallMaterial)
		wall.position.y = height / 2
		wall.castShadow = true
		wall.receiveShadow = true
		group.add(wall)

		// 硬山顶（梯形 + 飞檐）
		const roofGroup = this.createRoof(width, depth, roofColor)
		roofGroup.position.y = height
		group.add(roofGroup)

		// 门（深色矩形）
		const doorGeometry = new THREE.BoxGeometry(1, 1.8, 0.1)
		const doorMaterial = new THREE.MeshStandardMaterial({
			color: woodColor,
			roughness: 0.9,
			flatShading: true
		})
		const door = new THREE.Mesh(doorGeometry, doorMaterial)
		door.position.set(0, 0.9, depth / 2 + 0.05)
		group.add(door)

		// 窗户（两侧）
		const windowGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1)
		const windowMaterial = new THREE.MeshStandardMaterial({
			color: 0x2C1810,
			roughness: 0.5,
			flatShading: true
		})
		const window1 = new THREE.Mesh(windowGeometry, windowMaterial)
		window1.position.set(-1.2, 1.5, depth / 2 + 0.05)
		group.add(window1)

		const window2 = window1.clone()
		window2.position.x = 1.2
		group.add(window2)

		return group
	},

	/**
	 * 创建硬山顶屋顶（带飞檐）
	 * @param {number} width - 宽度
	 * @param {number} depth - 深度
	 * @param {number} color - 颜色
	 * @returns {THREE.Group} 屋顶组
	 */
	createRoof(width, depth, color) {
		const group = new THREE.Group()

		// 主屋顶（梯形）
		const roofShape = new THREE.Shape()
		const roofWidth = width + 0.8 // 飞檐外扩
		const roofTop = width * 0.6
		roofShape.moveTo(-roofWidth / 2, 0)
		roofShape.lineTo(-roofTop / 2, 1.2)
		roofShape.lineTo(roofTop / 2, 1.2)
		roofShape.lineTo(roofWidth / 2, 0)
		roofShape.lineTo(-roofWidth / 2, 0)

		const extrudeSettings = {
			depth: depth + 0.8,
			bevelEnabled: false
		}
		const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings)
		const roofMaterial = new THREE.MeshStandardMaterial({
			color: color,
			roughness: 0.9,
			metalness: 0.2,
			flatShading: true
		})
		const roof = new THREE.Mesh(roofGeometry, roofMaterial)
		roof.rotation.x = Math.PI / 2
		roof.position.z = -(depth + 0.8) / 2
		roof.castShadow = true
		group.add(roof)

		// 飞檐翘角（前后两个小三角）
		const eavesGeometry = new THREE.ConeGeometry(0.3, 0.6, 4)
		const eavesMaterial = new THREE.MeshStandardMaterial({
			color: color,
			roughness: 0.9,
			flatShading: true
		})

		const eaves1 = new THREE.Mesh(eavesGeometry, eavesMaterial)
		eaves1.position.set(-roofWidth / 2, 0.3, depth / 2 + 0.4)
		eaves1.rotation.z = Math.PI / 6
		group.add(eaves1)

		const eaves2 = eaves1.clone()
		eaves2.position.x = roofWidth / 2
		eaves2.rotation.z = -Math.PI / 6
		group.add(eaves2)

		return group
	},

	/**
	 * 创建票号建筑（大体量 + 匾额）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createBankBuilding(config = {}) {
		const group = new THREE.Group()

		const width = config.width || 6
		const depth = config.depth || 5
		const height = config.height || 4

		// 主体（更大的民居）
		const mainBuilding = this.createTraditionalHouse({
			width,
			depth,
			height,
			wallColor: 0xC9AE8A,
			roofColor: 0x3D3D3D,
			woodColor: 0x8B4513
		})
		group.add(mainBuilding)

		// 匾额（带中文纹理）
		const plaque = this.createPlaque(config.name || '日升昌')
		plaque.position.set(0, height + 0.5, depth / 2 + 0.1)
		group.add(plaque)

		// 大门（更宽）
		const gateGeometry = new THREE.BoxGeometry(2, 2.5, 0.15)
		const gateMaterial = new THREE.MeshStandardMaterial({
			color: 0xC41E3A, // 中国红
			roughness: 0.7,
			flatShading: true
		})
		const gate = new THREE.Mesh(gateGeometry, gateMaterial)
		gate.position.set(0, 1.25, depth / 2 + 0.05)
		group.add(gate)

		return group
	},

	/**
	 * 创建城门楼（四柱三间 + 多层飞檐）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createGateTower(config = {}) {
		const group = new THREE.Group()

		const width = config.width || 8
		const depth = config.depth || 4
		const height = config.height || 6

		// 底座（石台）
		const baseGeometry = new THREE.BoxGeometry(width, 1, depth)
		const baseMaterial = new THREE.MeshStandardMaterial({
			color: 0x9E9E8E, // 石灰色
			roughness: 0.9,
			flatShading: true
		})
		const base = new THREE.Mesh(baseGeometry, baseMaterial)
		base.position.y = 0.5
		base.castShadow = true
		base.receiveShadow = true
		group.add(base)

		// 四根柱子
		const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, height, 8)
		const pillarMaterial = new THREE.MeshStandardMaterial({
			color: 0x8B4513,
			roughness: 0.8,
			flatShading: true
		})

		const positions = [
			[-width / 3, height / 2 + 1, -depth / 3],
			[width / 3, height / 2 + 1, -depth / 3],
			[-width / 3, height / 2 + 1, depth / 3],
			[width / 3, height / 2 + 1, depth / 3]
		]

		positions.forEach(pos => {
			const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
			pillar.position.set(...pos)
			pillar.castShadow = true
			group.add(pillar)
		})

		// 多层屋顶
		const roof1 = this.createRoof(width, depth, 0x3D3D3D)
		roof1.position.y = height + 1
		group.add(roof1)

		const roof2 = this.createRoof(width * 0.8, depth * 0.8, 0x3D3D3D)
		roof2.position.y = height + 2.5
		group.add(roof2)

		return group
	},

	/**
	 * 创建商铺门面（矮宽 + 敞开 + 招牌）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createShopFront(config = {}) {
		const group = new THREE.Group()

		const width = config.width || 5
		const depth = config.depth || 3
		const height = config.height || 2.5

		// 墙体（敞开前面）
		const wallGeometry = new THREE.BoxGeometry(width, height, depth)
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: 0xD4C5A9,
			roughness: 0.8,
			flatShading: true
		})
		const wall = new THREE.Mesh(wallGeometry, wallMaterial)
		wall.position.y = height / 2
		wall.castShadow = true
		wall.receiveShadow = true
		group.add(wall)

		// 屋顶
		const roof = this.createRoof(width, depth, 0x3D3D3D)
		roof.position.y = height
		group.add(roof)

		// 招牌（竖排中文）
		const sign = this.createVerticalSign(config.name || '醋坊')
		sign.position.set(-width / 2 - 0.3, height / 2, 0)
		group.add(sign)

		return group
	},

	/**
	 * 创建城墙（长条 + 城垛）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createCityWall(config = {}) {
		const group = new THREE.Group()

		const length = config.length || 10
		const height = config.height || 4
		const thickness = config.thickness || 1.5

		// 墙体
		const wallGeometry = new THREE.BoxGeometry(length, height, thickness)
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: 0x9E9E8E,
			roughness: 0.9,
			flatShading: true
		})
		const wall = new THREE.Mesh(wallGeometry, wallMaterial)
		wall.position.y = height / 2
		wall.castShadow = true
		wall.receiveShadow = true
		group.add(wall)

		// 城垛（齿状顶）
		const merlonGeometry = new THREE.BoxGeometry(0.8, 0.6, thickness)
		const merlonMaterial = new THREE.MeshStandardMaterial({
			color: 0x8E8E7E,
			roughness: 0.9,
			flatShading: true
		})

		const merlonCount = Math.floor(length / 1.5)
		for (let i = 0; i < merlonCount; i++) {
			const merlon = new THREE.Mesh(merlonGeometry, merlonMaterial)
			merlon.position.set(-length / 2 + i * 1.5 + 0.75, height + 0.3, 0)
			merlon.castShadow = true
			group.add(merlon)
		}

		return group
	},

	/**
	 * 创建灯笼柱（细柱 + 红灯笼 + PointLight）
	 * @param {Object} config - 配置参数
	 * @returns {THREE.Group} 建筑组
	 */
	createLanternPost(config = {}) {
		const group = new THREE.Group()

		const height = config.height || 3

		// 柱子
		const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, height, 8)
		const poleMaterial = new THREE.MeshStandardMaterial({
			color: 0x8B4513,
			roughness: 0.8,
			flatShading: true
		})
		const pole = new THREE.Mesh(poleGeometry, poleMaterial)
		pole.position.y = height / 2
		pole.castShadow = true
		group.add(pole)

		// 灯笼（球体 + emissive）
		const lanternGeometry = new THREE.SphereGeometry(0.3, 8, 6)
		const lanternMaterial = new THREE.MeshStandardMaterial({
			color: 0xC41E3A, // 中国红
			emissive: 0xC41E3A,
			emissiveIntensity: 0.8,
			roughness: 0.5,
			flatShading: true
		})
		const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial)
		lantern.position.y = height
		group.add(lantern)

		// 点光源
		const light = new THREE.PointLight(0xFFD77F, 1.5, 8)
		light.position.y = height
		light.castShadow = true
		light.shadow.mapSize.width = 512
		light.shadow.mapSize.height = 512
		group.add(light)

		return group
	},

	/**
	 * 创建匾额（CanvasTexture 中文）
	 * @param {string} text - 文字内容
	 * @returns {THREE.Mesh} 匾额网格
	 */
	createPlaque(text) {
		const canvas = document.createElement('canvas')
		canvas.width = 512
		canvas.height = 128
		const ctx = canvas.getContext('2d')

		// 背景
		ctx.fillStyle = '#8B4513'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		// 边框
		ctx.strokeStyle = '#D4A574'
		ctx.lineWidth = 8
		ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)

		// 文字
		ctx.fillStyle = '#F5F0E8'
		ctx.font = 'bold 80px serif'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(text, canvas.width / 2, canvas.height / 2)

		const texture = new THREE.CanvasTexture(canvas)
		const geometry = new THREE.PlaneGeometry(2, 0.5)
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.7,
			flatShading: true
		})

		return new THREE.Mesh(geometry, material)
	},

	/**
	 * 创建竖排招牌（CanvasTexture）
	 * @param {string} text - 文字内容
	 * @returns {THREE.Mesh} 招牌网格
	 */
	createVerticalSign(text) {
		const canvas = document.createElement('canvas')
		canvas.width = 128
		canvas.height = 512
		const ctx = canvas.getContext('2d')

		// 背景
		ctx.fillStyle = '#8B4513'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		// 边框
		ctx.strokeStyle = '#D4A574'
		ctx.lineWidth = 6
		ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6)

		// 竖排文字
		ctx.fillStyle = '#F5F0E8'
		ctx.font = 'bold 60px serif'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'

		const chars = text.split('')
		const spacing = canvas.height / (chars.length + 1)
		chars.forEach((char, i) => {
			ctx.fillText(char, canvas.width / 2, spacing * (i + 1))
		})

		const texture = new THREE.CanvasTexture(canvas)
		const geometry = new THREE.PlaneGeometry(0.5, 2)
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.7,
			flatShading: true
		})

		return new THREE.Mesh(geometry, material)
	}
}
