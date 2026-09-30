import test from 'node:test'
import assert from 'node:assert/strict'
import { getCityMapPois } from '../src/common/utils/city-map.js'
import { poiMap } from '../src/common/data/poi-list.js'

test('城图保持全城坐标，街景覆盖和玩家位置使用同一个点位', () => {
	const snapshot = { currentPois: [{ ...poiMap['county-office'], status: 'nearby', mapPosition: { x: 58, y: 48 } }] }
	const county = getCityMapPois(snapshot).find((poi) => poi.id === 'county-office')
	assert.deepEqual(county.mapPosition, { x: 30, y: 42 })
	assert.deepEqual(snapshot.currentPois[0].mapPosition, { x: 58, y: 48 })
	assert.equal(county.isVisited, false)
	assert.equal(county.isDiscovered, false)
})

test('跨街任务目标显示热点，但不会因此记作已探', () => {
	const pois = getCityMapPois({ targetPoiId: 'county-office', currentPois: [{ ...poiMap['vinegar-workshop'], status: 'quest' }] })
	assert.deepEqual(pois.filter((poi) => poi.status === 'quest').map((poi) => poi.id), ['county-office'])
	assert.equal(pois.filter((poi) => poi.isVisited || poi.isDiscovered).length, 0)
})

test('发现与到访分别统计，未去过的推荐地点不进入履历', () => {
	const pois = getCityMapPois({ progress: { visitedPoiIds: ['rishengchang'], discoveredPoiIds: ['rishengchang', 'county-office'] } })
	assert.deepEqual(pois.filter((poi) => poi.isVisited).map((poi) => poi.id), ['rishengchang'])
	assert.equal(pois.filter((poi) => poi.isVisited || poi.isDiscovered).length, 2)
	assert.equal(pois.find((poi) => poi.id === 'county-office').status, 'route')
	assert.equal(pois.find((poi) => poi.id === 'mingqing-street').status, 'discoverable')
})
