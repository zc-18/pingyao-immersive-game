/**
 * 时辰系统 —— 把现实时间映射到古城时辰，控制飘落物 / 光层 / 灯笼 / 鸟鸣
 *
 * 此处对应每幕：
 *   - 晨 06–10：金色阳光 + 鸟鸣
 *   - 午 10–16：高光 + 蝉鸣
 *   - 昏 16–19：橘红光 + 乌鸦
 *   - 夜 19–06：蓝紫光 + 灯笼亮起 + 萤火
 *
 * 3D 场景额外字段：
 *   - sky.top / sky.bottom：3D 天空渐变两色
 *   - fog.color / fog.density：3D 雾气色与浓度
 *   - lighting.ambient / lighting.directional / lighting.hemi
 *   - bloomStrength：后处理光辉强度
 *   - exposure：色调映射曝光
 */

const PHASE_CONFIG = {
	dawn: {
		key: 'dawn',
		label: '晨',
		caption: '— 鸟 鸣 拂 山 —',
		toneClass: 'stage--dawn',
		fallingType: 'leaf',
		fallingDensity: 8,
		lanternsLit: false,
		ambientSound: 'birds',
		colorHint: 'rgba(255, 200, 130, 0.45)',
		sky: { top: '#f3c79e', bottom: '#fce5c5' },
		fog: { color: '#f3c79e', density: 0.014 },
		lighting: {
			ambient: { color: '#fce0c0', intensity: 0.55 },
			directional: { color: '#ffd99a', intensity: 1.15, angle: { x: 8, y: 18, z: 8 } },
			hemi: { sky: '#fce5c5', ground: '#a6987f', intensity: 0.4 }
		},
		bloomStrength: 0.55,
		exposure: 1.18
	},
	noon: {
		key: 'noon',
		label: '午',
		caption: '— 蝉 鸣 入 街 —',
		toneClass: 'stage--noon',
		fallingType: 'cherry',
		fallingDensity: 10,
		lanternsLit: false,
		ambientSound: 'cicada',
		colorHint: 'rgba(255, 245, 220, 0.32)',
		sky: { top: '#d7c0a2', bottom: '#f6ead7' },
		fog: { color: '#e0caa8', density: 0.012 },
		lighting: {
			ambient: { color: '#f5f0e8', intensity: 0.62 },
			directional: { color: '#fff0c6', intensity: 1.35, angle: { x: 14, y: 22, z: 6 } },
			hemi: { sky: '#f6ead7', ground: '#9e9e8e', intensity: 0.45 }
		},
		bloomStrength: 0.45,
		exposure: 1.25
	},
	dusk: {
		key: 'dusk',
		label: '昏',
		caption: '— 暮 色 上 城 —',
		toneClass: 'stage--dusk',
		fallingType: 'leaf',
		fallingDensity: 14,
		lanternsLit: true,
		ambientSound: 'crow',
		colorHint: 'rgba(255, 130, 60, 0.45)',
		sky: { top: '#b8633a', bottom: '#f3a86c' },
		fog: { color: '#c47c4f', density: 0.022 },
		lighting: {
			ambient: { color: '#f5c79a', intensity: 0.5 },
			directional: { color: '#ff9a55', intensity: 1.25, angle: { x: 4, y: 8, z: 10 } },
			hemi: { sky: '#f3a86c', ground: '#7a4a32', intensity: 0.5 }
		},
		bloomStrength: 0.85,
		exposure: 1.15
	},
	night: {
		key: 'night',
		label: '夜',
		caption: '— 灯 笼 起 萤 —',
		toneClass: 'stage--night',
		fallingType: 'firefly',
		fallingDensity: 16,
		lanternsLit: true,
		ambientSound: 'nightCrickets',
		colorHint: 'rgba(140, 170, 220, 0.22)',
		sky: { top: '#0d1230', bottom: '#2a2444' },
		fog: { color: '#1a1a32', density: 0.018 },
		lighting: {
			ambient: { color: '#3a3a55', intensity: 0.5 },
			directional: { color: '#a4b2d8', intensity: 0.65, angle: { x: -2, y: 14, z: 6 } },
			hemi: { sky: '#1a2444', ground: '#0d0c1c', intensity: 0.42 }
		},
		bloomStrength: 1.15,
		exposure: 0.95
	}
}

export function getCurrentPhase(date = new Date()) {
	const hour = date.getHours()
	if (hour >= 6 && hour < 10) return PHASE_CONFIG.dawn
	if (hour >= 10 && hour < 16) return PHASE_CONFIG.noon
	if (hour >= 16 && hour < 19) return PHASE_CONFIG.dusk
	return PHASE_CONFIG.night
}

export function getPhase(key) {
	return PHASE_CONFIG[key] || PHASE_CONFIG.dusk
}

export function getPhaseList() {
	return ['dawn', 'noon', 'dusk', 'night'].map((key) => PHASE_CONFIG[key])
}

export const PHASES = PHASE_CONFIG
