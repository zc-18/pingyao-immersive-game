const STREET_SIDES = [-1, 1]
const SLOT_Z = [7, -5, -17]

const STYLE_HEIGHT = {
	gate: 4.8,
	tower: 5.2,
	temple: 4.4,
	pavilion: 3.8,
	wall: 3.4,
	bank: 4.2,
	shop: 3.8,
	craft: 3.7,
	food: 3.7,
	courtyard: 3.6
}

const POI_TRIGGER_MODELS = {
	quest: { discoveryRadius: 8.5, interactionRadius: 3.4, exitRadius: 3.9, resetRadius: 9.5, markerLevel: 'quest' },
	hot: { discoveryRadius: 7.8, interactionRadius: 3.2, exitRadius: 3.7, resetRadius: 8.8, markerLevel: 'hot' },
	default: { discoveryRadius: 7.2, interactionRadius: 3, exitRadius: 3.5, resetRadius: 8.2, markerLevel: 'normal' }
}

const BASE_SET_PIECES = [
	{ kind: 'lantern-post', x: -5.15, z: 10, side: -1 },
	{ kind: 'lantern-post', x: 5.15, z: 10, side: 1 },
	{ kind: 'banner', x: -5.25, z: 2.5, side: -1 },
	{ kind: 'hanging-sign', x: 5.25, z: 0.5, side: 1 },
	{ kind: 'potted', x: -5.18, z: -5, side: -1 },
	{ kind: 'stone-step', x: 5.22, z: -6, side: 1 },
	{ kind: 'wind-chime', x: -5.55, z: 6, side: -1 },
	{ kind: 'wind-chime', x: 5.55, z: -8, side: 1 }
]

const SCENE_SET_PIECES = {
	'bank-house': [
		{ kind: 'ledger-chest', x: -4.05, z: 5.2, side: -1 },
		{ kind: 'ledger-chest', x: 4.1, z: -8.5, side: 1 },
		{ kind: 'lantern-post', x: -5.15, z: -15, side: -1 },
		{ kind: 'hanging-sign', x: 5.25, z: -16, side: 1 },
		{ kind: 'horse-post', x: -4.35, z: -2, side: -1 },
		{ kind: 'mounting-stone', x: 4.2, z: 6.8, side: 1 },
		{ kind: 'bench', x: -4.2, z: -10.5, side: -1 },
		{ kind: 'wine-flag', x: 5.1, z: 8.5, side: 1 }
	],
	'south-avenue': [
		{ kind: 'stone-lion', x: -4.05, z: -16.5, side: -1 },
		{ kind: 'stone-lion', x: 4.05, z: -16.5, side: 1 },
		{ kind: 'drum', x: -4.2, z: -2.5, side: -1 },
		{ kind: 'stele', x: 4.15, z: 5.5, side: 1 },
		{ kind: 'well', x: -4.0, z: 7.8, side: -1 },
		{ kind: 'water-vat', x: 4.15, z: -9.8, side: 1 },
		{ kind: 'horse-post', x: -4.25, z: -9.5, side: -1 },
		{ kind: 'door-curtain', x: 5.0, z: -1, side: 1 }
	],
	'academy-lane': [
		{ kind: 'stele', x: -4.1, z: 5, side: -1 },
		{ kind: 'book-stall', x: 4.05, z: -3.5, side: 1 },
		{ kind: 'potted', x: -4.2, z: -14.5, side: -1 },
		{ kind: 'potted', x: 4.2, z: 7.5, side: 1 },
		{ kind: 'bird-cage', x: -4.2, z: -5.5, side: -1 },
		{ kind: 'bench', x: 4.1, z: 3.3, side: 1 },
		{ kind: 'drying-cloth', x: -5.0, z: -10, side: -1 },
		{ kind: 'tea-stall', x: 4.05, z: -14, side: 1 }
	],
	'market-crossing': [
		{ kind: 'market-stall', x: -4.05, z: 5.4, side: -1 },
		{ kind: 'market-stall', x: 4.05, z: -7.5, side: 1 },
		{ kind: 'jar-stack', x: -4.15, z: -12.5, side: -1 },
		{ kind: 'jar-stack', x: 4.15, z: 1.5, side: 1 },
		{ kind: 'tea-stall', x: -4.0, z: -2.5, side: -1 },
		{ kind: 'pickle-jars', x: 4.15, z: 8, side: 1 },
		{ kind: 'wine-flag', x: -5.1, z: -15.5, side: -1 },
		{ kind: 'water-vat', x: 4.15, z: -14, side: 1 }
	],
	'lantern-quarter': [
		{ kind: 'lantern-string', x: 0, z: 7, side: 0 },
		{ kind: 'lantern-string', x: 0, z: -4, side: 0 },
		{ kind: 'lantern-string', x: 0, z: -15, side: 0 },
		{ kind: 'lantern-post', x: -5.15, z: -11, side: -1 },
		{ kind: 'lantern-post', x: 5.15, z: -11, side: 1 },
		{ kind: 'bird-cage', x: -4.2, z: 1, side: -1 },
		{ kind: 'door-curtain', x: 5.0, z: 2.4, side: 1 },
		{ kind: 'bench', x: -4.15, z: -7.8, side: -1 },
		{ kind: 'water-vat', x: 4.1, z: -17, side: 1 }
	]
}

export function getPoiTriggerModel(status) {
	return { ...(POI_TRIGGER_MODELS[status] || POI_TRIGGER_MODELS.default) }
}

function getBuildingSide(building, index) {
	const left = Number.parseFloat(building?.left)
	if (Number.isFinite(left) && left !== 50) return left < 50 ? -1 : 1
	return index % 2 === 0 ? -1 : 1
}

function createFacade(source, side, slot, sceneId) {
	const style = source?.style || 'courtyard'
	const depthLevel = Number(source?.depth || 1)
	const depth = style === 'gate' || style === 'tower' ? 4.8 : 4.2
	const width = ({ gate: 10, temple: 10.2, tower: 8.6, bank: 9.5, shop: 8.6, food: 8.2, craft: 8.0 })[style] || 9
	return {
		id: source?.id || `${sceneId}-residence-${side < 0 ? 'west' : 'east'}-${slot + 1}`,
		label: source?.label || (style === 'shop' ? '街巷商铺' : '古城民居'),
		style,
		poiId: source?.poiId || '',
		isFiller: !source,
		side,
		slot,
		x: side * (5.15 + depth / 2),
		z: SLOT_Z[slot],
		rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
		width: width - (source ? 0 : slot * 0.2),
		depth,
		height: (STYLE_HEIGHT[style] || 3.8) + Math.min(0.35, (depthLevel - 1) * 0.12)
	}
}

/**
 * Convert the editorial street data into one shared 3D world layout.
 * The logic layer uses this for the minimap and sends the same JSON to renderjs.
 */
export function buildStreetWorldLayout(streetData = {}, pois = []) {
	const buckets = { '-1': [], '1': [] }
	;(streetData.buildings || []).forEach((building, index) => {
		buckets[String(getBuildingSide(building, index))].push(building)
	})

	const facades = []
	STREET_SIDES.forEach((side) => {
		for (let slot = 0; slot < SLOT_Z.length; slot += 1) {
			facades.push(createFacade(buckets[String(side)][slot], side, slot, streetData.id || 'street'))
		}
	})

	const poiPlacements = (pois || []).map((poi, index) => {
		const facade = facades.find((item) => item.poiId === poi.id || item.id === poi.id)
		if (facade) {
			return {
				id: poi.id,
				x: facade.side * 4.7,
				z: facade.z,
				status: poi.status,
				buildingId: facade.id,
				trigger: getPoiTriggerModel(poi.status)
			}
		}
		return {
			id: poi.id,
			x: index % 2 === 0 ? -2.6 : 2.6,
			z: 4 - index * 7.5,
			status: poi.status,
			buildingId: '',
			trigger: getPoiTriggerModel(poi.status)
		}
	})

	return {
		facades,
		pois: poiPlacements,
		setPieces: [...BASE_SET_PIECES, ...(SCENE_SET_PIECES[streetData.id] || [])].map((item) => ({ ...item })),
		spawn: { x: 0, z: 13 },
		roadBounds: { xMin: -4.15, xMax: 4.15, zMin: -23, zMax: 15 },
		cameraBounds: { xMin: -4.45, xMax: 4.45, zMin: -25, zMax: 21 }
	}
}

export default buildStreetWorldLayout
