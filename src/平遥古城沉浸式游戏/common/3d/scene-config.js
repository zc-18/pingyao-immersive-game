/**
 * Scene Configuration - 场景配置数据结构（参考文档，实际使用时需内联到 renderjs）
 *
 * 定义 3D 场景的完整配置结构
 */

export const SceneConfigSchema = {
	// 地面配置
	ground: {
		size: 50,              // 地面大小
		color: 0x9E9E8E,       // 石板路颜色
		segments: 20,          // 分段数
		roughness: 0.9,
		metalness: 0.1
	},

	// 天空配置
	sky: {
		color: 0xD7C0A2,       // 天空颜色（渐变顶部）
		bottomColor: 0xF6EAD7  // 天空底部颜色
	},

	// 雾气配置
	fog: {
		color: 0xD7C0A2,       // 雾气颜色
		density: 0.02          // 雾气密度
	},

	// 光照配置
	lighting: {
		ambient: {
			color: 0xF5F0E8,
			intensity: 0.5
		},
		directional: {
			color: 0xFFD77F,   // 暖色调阳光
			intensity: 1.2,
			position: { x: 10, y: 15, z: 10 },
			castShadow: true
		},
		point: [
			// 额外的点光源（灯笼等）
		]
	},

	// 建筑配置
	buildings: [
		// { type: 'traditional_house', position: { x, y, z }, rotation: y, config: {} }
	],

	// POI 信标配置
	pois: [
		// { id: 'rishengchang', position: { x, y, z }, status: 'hot' }
	],

	// 装饰物配置
	decorations: [
		// { type: 'lantern_post', position: { x, y, z } }
	],

	// 玩家出生点
	playerSpawn: {
		x: 0,
		y: 0,
		z: 0,
		bearing: 0  // 朝向角度（度）
	},

	// 道路配置
	road: {
		width: 4,
		length: 30,
		color: 0x9E9E8E
	},

	// 粒子效果（可选）
	particles: {
		enabled: false,
		type: 'dust',  // dust / leaves / snow
		count: 100
	}
}

/**
 * migrateStreetData - 数据迁移函数
 * 将 streets.js 的 2D 配置转换为 3D 场景配置
 *
 * @param {Object} streetData - streets.js 中的街景数据
 * @returns {Object} 3D 场景配置
 */
export function migrateStreetData(streetData) {
	const config = {
		ground: {
			size: 50,
			color: 0x9E9E8E,
			segments: 20,
			roughness: 0.9,
			metalness: 0.1
		},
		sky: {
			color: parseInt(streetData.sceneTone?.skyTop?.replace('#', '0x') || '0xD7C0A2'),
			bottomColor: parseInt(streetData.sceneTone?.skyBottom?.replace('#', '0x') || '0xF6EAD7')
		},
		fog: {
			color: parseInt(streetData.sceneTone?.skyTop?.replace('#', '0x') || '0xD7C0A2'),
			density: 0.02
		},
		lighting: {
			ambient: {
				color: 0xF5F0E8,
				intensity: 0.5
			},
			directional: {
				color: 0xFFD77F,
				intensity: 1.2,
				position: { x: 10, y: 15, z: 10 },
				castShadow: true
			},
			point: []
		},
		buildings: [],
		pois: [],
		decorations: [],
		playerSpawn: {
			x: 0,
			y: 0,
			z: 0,
			bearing: streetData.playerStart?.bearing || 0
		},
		road: {
			width: 4,
			length: 30,
			color: 0x9E9E8E
		},
		particles: {
			enabled: false
		}
	}

	// 转换建筑（从百分比位置到世界坐标）
	if (streetData.buildings && Array.isArray(streetData.buildings)) {
		streetData.buildings.forEach((building, index) => {
			// 百分比转世界坐标（假设场景宽度 50，深度 30）
			const leftPercent = parseFloat(building.left) / 100
			const x = (leftPercent - 0.5) * 50  // 居中对齐

			// 深度根据 depth 参数决定
			const depth = building.depth || 1
			const z = -5 - depth * 3  // 越大越远

			// 根据 label 推断建筑类型
			let type = 'traditional_house'
			if (building.label.includes('票号') || building.label.includes('银号')) {
				type = 'bank_building'
			} else if (building.label.includes('门楼') || building.label.includes('牌楼')) {
				type = 'gate_tower'
			} else if (building.label.includes('铺') || building.label.includes('坊')) {
				type = 'shop_front'
			}

			config.buildings.push({
				type: type,
				position: { x, y: 0, z },
				rotation: 0,
				config: {
					name: building.label,
					width: 4 + depth * 0.5,
					depth: 3 + depth * 0.3,
					height: 3 + depth * 0.5
				}
			})
		})
	}

	// 转换 POI（从 poiOverrides）
	if (streetData.poiOverrides) {
		Object.entries(streetData.poiOverrides).forEach(([poiId, override]) => {
			const mapPos = override.mapPosition || { x: 50, y: 50, depth: 1 }

			// 百分比转世界坐标
			const x = (mapPos.x / 100 - 0.5) * 50
			const z = (mapPos.y / 100 - 0.5) * 30

			config.pois.push({
				id: poiId,
				position: { x, y: 0, z },
				status: override.status || 'discoverable'
			})
		})
	}

	// 自动生成灯笼（沿道路两侧）
	const lanternCount = 6
	for (let i = 0; i < lanternCount; i++) {
		const z = -15 + i * 6

		// 左侧灯笼
		config.decorations.push({
			type: 'lantern_post',
			position: { x: -3, y: 0, z }
		})

		// 右侧灯笼
		config.decorations.push({
			type: 'lantern_post',
			position: { x: 3, y: 0, z }
		})
	}

	// 玩家出生点（从 playerStart 转换）
	if (streetData.playerStart) {
		config.playerSpawn = {
			x: 0,
			y: 0,
			z: 10,  // 场景后方
			bearing: streetData.playerStart.bearing || 0
		}
	}

	return config
}

/**
 * 创建默认场景配置
 * @returns {Object} 默认场景配置
 */
export function createDefaultSceneConfig() {
	return {
		ground: {
			size: 50,
			color: 0x9E9E8E,
			segments: 20,
			roughness: 0.9,
			metalness: 0.1
		},
		sky: {
			color: 0xD7C0A2,
			bottomColor: 0xF6EAD7
		},
		fog: {
			color: 0xD7C0A2,
			density: 0.02
		},
		lighting: {
			ambient: {
				color: 0xF5F0E8,
				intensity: 0.5
			},
			directional: {
				color: 0xFFD77F,
				intensity: 1.2,
				position: { x: 10, y: 15, z: 10 },
				castShadow: true
			},
			point: []
		},
		buildings: [
			{
				type: 'bank_building',
				position: { x: -8, y: 0, z: -10 },
				rotation: 0,
				config: { name: '日升昌', width: 6, depth: 5, height: 4 }
			},
			{
				type: 'traditional_house',
				position: { x: 5, y: 0, z: -8 },
				rotation: 0,
				config: { width: 4, depth: 3, height: 3 }
			},
			{
				type: 'shop_front',
				position: { x: -5, y: 0, z: -5 },
				rotation: 0,
				config: { name: '醋坊', width: 5, depth: 3, height: 2.5 }
			},
			{
				type: 'gate_tower',
				position: { x: 0, y: 0, z: -15 },
				rotation: 0,
				config: { width: 8, depth: 4, height: 6 }
			}
		],
		pois: [
			{
				id: 'rishengchang',
				position: { x: -8, y: 0, z: -10 },
				status: 'hot'
			}
		],
		decorations: [
			{ type: 'lantern_post', position: { x: -3, y: 0, z: -12 } },
			{ type: 'lantern_post', position: { x: 3, y: 0, z: -12 } },
			{ type: 'lantern_post', position: { x: -3, y: 0, z: -6 } },
			{ type: 'lantern_post', position: { x: 3, y: 0, z: -6 } },
			{ type: 'lantern_post', position: { x: -3, y: 0, z: 0 } },
			{ type: 'lantern_post', position: { x: 3, y: 0, z: 0 } }
		],
		playerSpawn: {
			x: 0,
			y: 0,
			z: 10,
			bearing: 0
		},
		road: {
			width: 4,
			length: 30,
			color: 0x9E9E8E
		},
		particles: {
			enabled: false
		}
	}
}
