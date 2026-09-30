import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStreetWorldLayout, getPoiTriggerModel } from '../src/common/utils/street-world.js'

const street = {
	id: 'test-street',
	buildings: [
		{ id: 'bank', label: '票号', left: '20%', style: 'bank', poiId: 'bank-poi' },
		{ id: 'shop', label: '商铺', left: '70%', style: 'shop' }
	]
}

test('街巷布局生成连续的双侧立面', () => {
	const layout = buildStreetWorldLayout(street, [])
	assert.equal(layout.facades.length, 6)
	assert.equal(layout.facades.filter((item) => item.side < 0).length, 3)
	assert.equal(layout.facades.filter((item) => item.side > 0).length, 3)
	assert.ok(layout.facades.every((item) => Math.abs(item.x) > layout.roadBounds.xMax))
})

test('POI 与所属建筑共用街巷纵坐标并落在步行边界旁', () => {
	const layout = buildStreetWorldLayout(street, [{ id: 'bank-poi', status: 'quest' }])
	const facade = layout.facades.find((item) => item.poiId === 'bank-poi')
	const poi = layout.pois[0]
	assert.equal(poi.z, facade.z)
	assert.ok(Math.abs(poi.x) > layout.roadBounds.xMax)
	assert.ok(Math.abs(poi.x) < Math.abs(facade.x))
})

test('无绑定建筑的 POI 仍位于可探索道路内', () => {
	const layout = buildStreetWorldLayout(street, [{ id: 'free-poi', status: 'hot' }])
	const poi = layout.pois[0]
	assert.ok(poi.x >= layout.roadBounds.xMin && poi.x <= layout.roadBounds.xMax)
	assert.ok(poi.z >= layout.roadBounds.zMin && poi.z <= layout.roadBounds.zMax)
})

test('任务 POI 使用带迟滞的发现与交互半径模型', () => {
	const trigger = getPoiTriggerModel('quest')
	assert.ok(trigger.interactionRadius < trigger.exitRadius)
	assert.ok(trigger.exitRadius < trigger.discoveryRadius)
	assert.ok(trigger.discoveryRadius < trigger.resetRadius)
	assert.equal(trigger.markerLevel, 'quest')
})

test('五条街使用各自的主题陈设并提供相机边界', () => {
	const themes = {
		'bank-house': 'ledger-chest',
		'south-avenue': 'stone-lion',
		'academy-lane': 'book-stall',
		'market-crossing': 'market-stall',
		'lantern-quarter': 'lantern-string'
	}

	Object.entries(themes).forEach(([id, expectedKind]) => {
		const layout = buildStreetWorldLayout({ ...street, id }, [])
		assert.ok(layout.setPieces.some((item) => item.kind === expectedKind))
		assert.ok(layout.cameraBounds.xMin < layout.roadBounds.xMin)
		assert.ok(layout.cameraBounds.xMax > layout.roadBounds.xMax)
		assert.ok(layout.cameraBounds.zMin <= layout.roadBounds.zMin)
		assert.ok(layout.cameraBounds.zMax >= layout.roadBounds.zMax)
	})
})
