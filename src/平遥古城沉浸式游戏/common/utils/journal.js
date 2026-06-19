// 行旅册写入能力：POI 收藏（favorites）+ 个人札记（journal notes）。
// 让「行旅册」从只读展示升级为可写——玩家能收藏心头好地标、为每处写一句私人札记。
// 存储：userProgress.favoritePoiIds（string[]）/ journalNotes（{poiId: text}）。

import { STORAGE_KEYS, getUserProgress, patchStorageObject } from './storage.js'
import { poiMap } from '../data/poi-list.js'

const NOTE_MAX = 60

export function getFavoritePoiIds() {
	const p = getUserProgress()
	return Array.isArray(p.favoritePoiIds) ? p.favoritePoiIds : []
}

export function isFavoritePoi(poiId = '') {
	return !!poiId && getFavoritePoiIds().includes(poiId)
}

/* 切换收藏。返回 { favorited }。 */
export function toggleFavoritePoi(poiId = '') {
	if (!poiId) return { favorited: false }
	const current = getFavoritePoiIds()
	const has = current.includes(poiId)
	const next = has ? current.filter((id) => id !== poiId) : [...current, poiId]
	patchStorageObject(STORAGE_KEYS.userProgress, { favoritePoiIds: [...new Set(next)] })
	return { favorited: !has }
}

export function getJournalNotes() {
	const p = getUserProgress()
	return (p.journalNotes && typeof p.journalNotes === 'object') ? p.journalNotes : {}
}

export function getJournalNote(poiId = '') {
	return getJournalNotes()[poiId] || ''
}

/* 写/改/清 一条札记（空串则删除该条）。返回规范化后的文本。 */
export function setJournalNote(poiId = '', text = '') {
	if (!poiId) return ''
	const clean = String(text || '').trim().slice(0, NOTE_MAX)
	const notes = { ...getJournalNotes() }
	if (clean) notes[poiId] = clean
	else delete notes[poiId]
	patchStorageObject(STORAGE_KEYS.userProgress, { journalNotes: notes })
	return clean
}

/* 行旅册展示用：收藏或写过札记的 POI 合集（带名称解析）。 */
export function getJournalEntries() {
	const favorites = getFavoritePoiIds()
	const notes = getJournalNotes()
	const ids = [...new Set([...favorites, ...Object.keys(notes)])]
	return ids
		.map((poiId) => {
			const poi = poiMap[poiId]
			if (!poi) return null
			return {
				poiId,
				name: poi.name,
				shortName: poi.shortName || (poi.name || '').slice(0, 1),
				note: notes[poiId] || '',
				favorited: favorites.includes(poiId)
			}
		})
		.filter(Boolean)
}

export const JOURNAL_NOTE_MAX = NOTE_MAX
