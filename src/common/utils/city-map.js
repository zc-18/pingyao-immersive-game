import { poiList } from '../data/poi-list.js'

/* 城图始终使用全城坐标；街景覆盖只提供状态，不能改变城图上的位置。 */
export function getCityMapPois(snapshot = {}) {
	const current = new Map((snapshot.currentPois || []).map((poi) => [poi.id, poi]))
	const visited = new Set(snapshot.progress?.visitedPoiIds || [])
	const discovered = new Set(snapshot.progress?.discoveredPoiIds || [])
	return poiList.map((poi) => {
		const local = current.get(poi.id)
		const isVisited = visited.has(poi.id)
		const isDiscovered = discovered.has(poi.id)
		let status = local?.status || 'discoverable'
		if (status === 'quest') status = 'route'
		if (snapshot.targetPoiId === poi.id) status = 'quest'
		else if (isVisited) status = 'completed'
		else if (isDiscovered && status === 'discoverable') status = 'route'
		return { ...poi, ...local, mapPosition: poi.mapPosition, status, isVisited, isDiscovered }
	})
}
