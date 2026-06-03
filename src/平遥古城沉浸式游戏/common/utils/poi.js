import { getPoiStatusSnapshot } from './game-state.js'

export const POI_STATUS = {
	nearby: 'nearby',
	hot: 'hot',
	route: 'route',
	quest: 'quest',
	discoverable: 'discoverable',
	completed: 'completed'
}

export const UNLOCKED_POI_STATUS_LIST = [POI_STATUS.nearby, POI_STATUS.hot, POI_STATUS.route, POI_STATUS.quest, POI_STATUS.completed]

const POI_STATUS_TEXT_MAP = {
	[POI_STATUS.nearby]: '附近可达',
	[POI_STATUS.hot]: '热门推荐',
	[POI_STATUS.route]: '路线节点',
	[POI_STATUS.quest]: '任务待开',
	[POI_STATUS.completed]: '已到访',
	[POI_STATUS.discoverable]: '等待发现'
}

const POI_ICON_MAP = {
	historic: '衙',
	culture: '学',
	craft: '坊',
	bank: '票',
	street: '街',
	temple: '殿',
	scenic: '景',
	market: '市'
}

export function getPoiStatus(poi = {}, options = {}) {
	return getPoiStatusSnapshot(poi, options).status || POI_STATUS.discoverable
}

export function isUnlockedPoiStatus(status = '') {
	return UNLOCKED_POI_STATUS_LIST.includes(status)
}

export function isUnlockedPoi(poi = {}, options = {}) {
	return isUnlockedPoiStatus(getPoiStatus(poi, options))
}

export function getUnlockedPoiCount(poiList = [], options = {}) {
	return Array.isArray(poiList) ? poiList.filter((item) => isUnlockedPoi(item, options)).length : 0
}

export function getPoiStatusText(status = '') {
	return POI_STATUS_TEXT_MAP[status] || '状态未知'
}

export function getPoiIcon(type = '') {
	return POI_ICON_MAP[type] || '城'
}

export function getPoiShortLabel(poi = {}) {
	if (poi.shortName) return poi.shortName
	if (poi.name) return poi.name.slice(0, 1)
	return '？'
}
