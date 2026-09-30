// 虚拟服饰 / 换装系统数据 + 逻辑。
//
// 每套服饰提供：
//  - skin：街景化身使用的纯 JSON 建模参数（街景渲染模块 street-renderer.js 的 createPlayer 据此建模着色）。
//    除 body/head 等配色外，silhouette/headwear/sleeve/accessory 控制轮廓与服饰部件，
//    pattern 控制生成式衣料贴图。皮肤随场景命令下发给渲染模块，只放可序列化的数据，不传函数或 Three.js 实例。
//  - unlock：解锁方式。
//      default      初始拥有（人人皆有）
//      level        达到等级自动拥有（进阶奖励）
//      quest        完成指定任务自动拥有
//      achievement  解锁指定成就自动拥有
//      silverKey    银钥购买（需主动消费，写入 ownedCostumes）
//      shop         商城兑换对应商品后解锁（shop-items.js 的 redeemShopItem 在兑换的同一次写入中发放）
//
// 设计取舍：level/quest/achievement 类「条件达成即拥有」，给玩家自然的进阶惊喜；
// silverKey/shop 类需主动获取（接通经济与 O2O 商城循环）。装备状态持久化在 userProgress.equippedCostume。

import { STORAGE_KEYS, getStorage, getUserProgress, patchStorageObject } from '../utils/storage.js'
import { getLevelMeta } from '../utils/level.js'

export const DEFAULT_COSTUME_ID = 'commoner'

export const COSTUMES = [
	{
		id: 'commoner',
		name: '布衣行客',
		mark: '布',
		desc: '青灰素布交领长衫，束发佩玉，清雅自在地走街串巷。',
		unlock: { type: 'default' },
		skin: {
			body: '#7b9394', head: '#D4A574', robe: '#657f83', trim: '#c6d0c7', hat: '#293739',
			silhouette: 'scholar', headwear: 'hair-bun', sleeve: 'formal', accessory: 'jade'
		}
	},
	{
		id: 'ledger-clerk',
		name: '账房青衫',
		mark: '账',
		desc: '票号柜台伙计的青布长衫，袖口还沾着没干透的墨。',
		unlock: { type: 'silverKey', cost: 80 },
		skin: {
			body: '#3f5a6b', head: '#e8cfa6', robe: '#2e4654', hat: '#1f2d36', trim: '#b9c3bd',
			silhouette: 'clerk', headwear: 'skullcap', sleeve: 'formal', accessory: 'ledger'
		}
	},
	{
		id: 'scholar-robe',
		name: '书生襕衫',
		mark: '儒',
		desc: '文庙书生的月白襕衫，配一方青色纶巾，书卷气十足。',
		unlock: { type: 'level', level: 2 },
		skin: {
			body: '#e9e4d4', head: '#e8cfa6', robe: '#d8d0ba', hat: '#6b7a8f', trim: '#596b78',
			silhouette: 'scholar', headwear: 'scholar-scarf', sleeve: 'wide', accessory: 'scroll'
		}
	},
	{
		id: 'escort-garb',
		name: '镖师劲装',
		mark: '镖',
		desc: '同兴公镖局的玄色劲装，护腕扎得利落，走夜路也不怵。',
		unlock: { type: 'silverKey', cost: 150 },
		skin: {
			body: '#4a2a18', head: '#caa477', robe: '#2a1810', hat: '#3a2415', trim: '#a77743',
			silhouette: 'escort', headwear: 'guard-cap', sleeve: 'braced', accessory: 'scabbard'
		}
	},
	{
		id: 'merchant-gown',
		name: '掌柜锦袍',
		mark: '柜',
		desc: '大掌柜的酱色团花锦袍，气度沉稳，一看便是当家的人。',
		unlock: { type: 'level', level: 3 },
		skin: {
			body: '#7a3b2e', head: '#e8cfa6', robe: '#5e2a20', hat: '#3a1a14', trim: '#d4a574', accent: '#d4a574',
			silhouette: 'merchant', headwear: 'merchant-cap', sleeve: 'formal', accessory: 'jade', pattern: 'brocade'
		}
	},
	{
		id: 'lantern-festival',
		name: '灯节华服',
		mark: '灯',
		desc: '灯影长街灯会限定的朱红华服，金线绕身，灯下流光溢彩。',
		unlock: { type: 'shop', itemId: 'exp-dress-005' },
		skin: {
			body: '#c41e3a', head: '#e8cfa6', robe: '#8b1a2e', hat: '#6b1622', trim: '#f1c76d', accent: '#ffd700',
			silhouette: 'festival', headwear: 'festival-cap', sleeve: 'ceremonial', accessory: 'tassel', pattern: 'brocade'
		}
	},
	{
		id: 'jin-merchant-legend',
		name: '晋商传人',
		mark: '晋',
		desc: '走通全程方能加身的晋商传人盛装，金袍玉带，气贯一城商道。',
		unlock: { type: 'level', level: 5 },
		skin: {
			body: '#8b4513', head: '#e8cfa6', robe: '#b8860b', hat: '#6b3510', trim: '#ffe3a0', accent: '#ffe27a',
			silhouette: 'legend', headwear: 'merchant-crown', sleeve: 'ceremonial', accessory: 'seal', pattern: 'brocade'
		}
	}
]

export const costumeMap = COSTUMES.reduce((map, item) => {
	map[item.id] = item
	return map
}, {})

export function getCostumeById(id) {
	return costumeMap[id] || null
}

/* userProgress 中显式获得的服饰 id 列表（silverKey 购买 / shop 兑换写入；default 兜底包含）。 */
function getExplicitOwned() {
	const progress = getUserProgress()
	const owned = Array.isArray(progress.ownedCostumes) ? progress.ownedCostumes : []
	return new Set([DEFAULT_COSTUME_ID, ...owned])
}

/* 判定某服饰是否「已拥有」：default 恒真；level/quest/achievement 条件达成即拥有；silverKey/shop 需显式获得。 */
export function isCostumeOwned(costume, progress = getStorage(STORAGE_KEYS.userProgress, {})) {
	if (!costume) return false
	const unlock = costume.unlock || { type: 'default' }
	if (unlock.type === 'default') return true
	if (unlock.type === 'level') {
		return getLevelMeta(progress.exp || 0).level >= (unlock.level || 1)
	}
	if (unlock.type === 'quest') {
		const completed = progress.questData?.completedQuests || []
		return completed.includes(unlock.questId)
	}
	if (unlock.type === 'achievement') {
		const unlocked = progress.unlockedAchievements || []
		return unlocked.includes(unlock.achievementId)
	}
	// silverKey / shop：以显式 ownedCostumes 为准
	const owned = Array.isArray(progress.ownedCostumes) ? progress.ownedCostumes : []
	return owned.includes(costume.id)
}

export function getEquippedCostumeId() {
	const progress = getUserProgress()
	const id = progress.equippedCostume
	// 已装备的服饰若已不再拥有（极端情况），回退默认。
	if (id && costumeMap[id] && isCostumeOwned(costumeMap[id], progress)) return id
	return DEFAULT_COSTUME_ID
}

/* 给街景渲染模块的纯 JSON 皮肤参数（页面 buildScenePayload → 渲染模块 init/loadScene → createPlayer）。 */
export function getEquippedCostumeSkin() {
	const costume = costumeMap[getEquippedCostumeId()] || costumeMap[DEFAULT_COSTUME_ID]
	return costume ? { ...costume.skin } : { body: '#8B4513', head: '#D4A574' }
}

/* 解锁条件的可读文案（用于衣橱 UI 的锁定提示）。 */
export function getUnlockLabel(costume) {
	const unlock = costume.unlock || { type: 'default' }
	switch (unlock.type) {
		case 'default': return '初始拥有'
		case 'level': return `${unlock.level} 阶解锁`
		case 'quest': return '完成指定支线解锁'
		case 'achievement': return '点亮指定成就解锁'
		case 'silverKey': return `${unlock.cost} 银钥`
		case 'shop': return '商城换装体验兑换'
		default: return '——'
	}
}

/* 衣橱单项状态：owned / equipped / 可否购买 / 锁定原因。 */
export function getCostumeState(costume, progress = getStorage(STORAGE_KEYS.userProgress, {})) {
	const owned = isCostumeOwned(costume, progress)
	const equipped = getEquippedCostumeId() === costume.id
	const unlock = costume.unlock || { type: 'default' }
	const canBuy = !owned && unlock.type === 'silverKey'
	const affordable = canBuy && Number(progress.silverKey || 0) >= (unlock.cost || 0)
	return {
		owned,
		equipped,
		canBuy,
		affordable,
		unlockType: unlock.type,
		unlockLabel: getUnlockLabel(costume),
		cost: unlock.cost || 0
	}
}

/* 装备服饰：仅在已拥有时生效。返回 { ok, reason }。 */
export function equipCostume(id) {
	const costume = costumeMap[id]
	if (!costume) return { ok: false, reason: '没有这件衣裳' }
	if (!isCostumeOwned(costume)) return { ok: false, reason: '尚未拥有这件衣裳' }
	if (!patchStorageObject(STORAGE_KEYS.userProgress, { equippedCostume: id })) return { ok: false, reason: '保存失败，请重试' }
	return { ok: true }
}

/* 银钥购买解锁（仅 silverKey 类）。成功扣银钥并写入 ownedCostumes，可选直接装备。返回 { ok, reason }。 */
export function purchaseCostume(id, { equip = true } = {}) {
	const costume = costumeMap[id]
	if (!costume) return { ok: false, reason: '没有这件衣裳' }
	const unlock = costume.unlock || {}
	if (isCostumeOwned(costume)) {
		if (equip) return equipCostume(id)
		return { ok: true, reason: '已拥有，已为你换上' }
	}
	if (unlock.type !== 'silverKey') return { ok: false, reason: '这件衣裳无法直接购买' }
	const progress = getUserProgress()
	const balance = Number(progress.silverKey || 0)
	const cost = unlock.cost || 0
	if (balance < cost) return { ok: false, reason: '银钥不足' }
	const owned = Array.isArray(progress.ownedCostumes) ? progress.ownedCostumes : []
	const saved = patchStorageObject(STORAGE_KEYS.userProgress, {
		silverKey: balance - cost,
		ownedCostumes: [...new Set([...owned, id])],
		...(equip ? { equippedCostume: id } : {})
	})
	return saved ? { ok: true } : { ok: false, reason: '保存失败，请重试' }
}

/* 衣橱列表（带状态）。 */
export function getWardrobe() {
	const progress = getUserProgress()
	return COSTUMES.map((costume) => ({
		...costume,
		state: getCostumeState(costume, progress)
	}))
}

export default COSTUMES
