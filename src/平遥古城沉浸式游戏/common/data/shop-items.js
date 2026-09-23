import { getStorage, getUserProgress, patchStorageObject, STORAGE_KEYS } from '../utils/storage.js'
import { COSTUMES } from './costumes.js'

export const assetMetaMap = {
	silver: {
		key: 'silver',
		label: '银两余账',
		shortLabel: '银两',
		icon: '两'
	},
	silverKey: {
		key: 'silverKey',
		label: '银钥余账',
		shortLabel: '银钥',
		icon: '钥'
	}
}

export const shopAssetDefault = {
	silver: 268,
	silverKey: 120
}

export const shopCategories = [
	{ id: 'food', name: '食单', tagline: '票号食礼' },
	{ id: 'cultural', name: '文藏', tagline: '古城纪念' },
	{ id: 'experience', name: '行程', tagline: '到店体验' }
]

const rawShopItems = [
	{
		id: 'food-wantuo-001',
		category: 'food',
		name: '平遥碗托食礼盒',
		merchantName: '协同庆食铺',
		merchantPhone: '0354-5680123',
		distance: '距你 320m',
		price: 28,
		currency: 'silver',
		origin: '平遥古城南大街手作食坊',
		craft: '荞面冷制，配老陈醋与秘制辣油分装。',
		spec: '4 碗装 / 含料包 4 份',
		redeemTip: '到店出示核销码后现取，建议 2 小时内食用。',
		address: '平遥古城南大街 108 号',
		businessHours: '09:30 - 20:30',
		expireHours: 48,
		stockLabel: '今日现制',
		markLabel: '热销',
		highlight: '古城风味',
		redeemScene: '到店现取'
	},
	{
		id: 'food-beef-002',
		category: 'food',
		name: '冠云牛肉随行装',
		merchantName: '日升昌行旅铺',
		merchantPhone: '0354-5680168',
		distance: '距你 560m',
		price: 36,
		currency: 'silver',
		origin: '平遥牛肉老字号联名档口',
		craft: '低温卤制，真空锁鲜，适合旅途携带。',
		spec: '220g / 袋',
		redeemTip: '线下核销后可当场领取，也可请商户代为封装。',
		address: '西大街 41 号',
		businessHours: '10:00 - 21:00',
		expireHours: 72,
		stockLabel: '可打包',
		markLabel: '掌柜荐',
		highlight: '伴手食礼',
		redeemScene: '到店提货'
	},
	{
		id: 'cultural-seal-003',
		category: 'cultural',
		name: '晋商票号木印章',
		merchantName: '汇通天下文坊',
		merchantPhone: '0354-5680216',
		distance: '距你 180m',
		price: 52,
		currency: 'silverKey',
		origin: '古城文房定制工坊',
		craft: '榉木底座，票号纹样手工雕刻，上墨留痕清晰。',
		spec: '印面 3cm x 3cm / 含印泥 1 盒',
		redeemTip: '需到店挑选纹样，核销后支持现场试盖。',
		address: '城隍庙街 16 号',
		businessHours: '09:00 - 18:30',
		expireHours: 120,
		stockLabel: '可刻字',
		markLabel: '限量',
		highlight: '票号印记',
		redeemScene: '到店定制'
	},
	{
		id: 'cultural-ledger-004',
		category: 'cultural',
		name: '掌柜账本手札',
		merchantName: '瑞蚨祥纸墨局',
		merchantPhone: '0354-5680228',
		distance: '距你 420m',
		price: 66,
		currency: 'silverKey',
		origin: '宣纸纹理手作本册铺',
		craft: '仿古线装，封面烫金票号纹，内页米黄护眼纸。',
		spec: '80 页 / A6 便携尺寸',
		redeemTip: '线下核销后可加盖限定纪念章，适合做旅程手账。',
		address: '衙门街 8 号',
		businessHours: '10:00 - 19:30',
		expireHours: 168,
		stockLabel: '可盖章',
		markLabel: '新品',
		highlight: '账本质感',
		redeemScene: '到店领物'
	},
	{
		id: 'exp-dress-005',
		category: 'experience',
		name: '晋商换装拍照体验',
		merchantName: '协和楼影像馆',
		merchantPhone: '0354-5680315',
		distance: '距你 710m',
		price: 88,
		currency: 'silver',
		origin: '古城旅拍体验点',
		craft: '提供晋商长衫、账房配饰与室内布景。',
		spec: '30 分钟体验 / 含 3 张电子底片',
		redeemTip: '需提前到店预约档期，核销后由店员安排服装与拍摄。',
		address: '上西门街 66 号',
		businessHours: '10:30 - 21:00',
		expireHours: 72,
		stockLabel: '需预约',
		markLabel: '沉浸款',
		highlight: '角色体验',
		redeemScene: '预约核销'
	},
	{
		id: 'exp-night-006',
		category: 'experience',
		name: '夜游听更导览券',
		merchantName: '晋小鸦夜行社',
		merchantPhone: '0354-5680399',
		distance: '集合点 950m',
		price: 108,
		currency: 'silverKey',
		origin: '古城夜游限定路线',
		craft: 'NPC 讲解串联票号、镖局与城门夜景故事。',
		spec: '单人券 / 约 60 分钟',
		redeemTip: '到集合点出示核销码签到，过期自动失效不补。',
		address: '迎薰门内广场集合点',
		businessHours: '19:00 - 21:30',
		expireHours: 24,
		stockLabel: '夜场限定',
		markLabel: '推荐',
		highlight: '夜游任务',
		redeemScene: '集合签到'
	}
]

function clampAssetValue(value, fallback) {
	const nextValue = Number(value)
	if (!Number.isFinite(nextValue)) {
		return fallback
	}
	return Math.max(0, Math.floor(nextValue))
}

function formatDateTime(date) {
	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	const hour = `${date.getHours()}`.padStart(2, '0')
	const minute = `${date.getMinutes()}`.padStart(2, '0')
	return `${year}-${month}-${day} ${hour}:${minute}`
}

function createOrderId(date) {
	return `PY${date.getTime()}${(++orderSequence).toString(36)}${Math.floor(Math.random() * 900 + 100)}`
}

let orderSequence = 0

function normalizeShopItem(item = {}) {
	const assetMeta = assetMetaMap[item.currency] || assetMetaMap.silver
	return {
		...item,
		currency: assetMeta.key,
		currencyLabel: assetMeta.shortLabel,
		assetLabel: assetMeta.label,
		assetIcon: assetMeta.icon,
		priceLabel: `${item.price}${assetMeta.shortLabel}`,
		merchantPhone: item.merchantPhone || '暂未登记',
		redeemScene: item.redeemScene || '到店核销'
	}
}

function normalizeRedeemOrder(order = {}) {
	const assetMeta = assetMetaMap[order.currency] || assetMetaMap.silver
	const expireAtTs = Number(order.expireAtTs) || 0
	return {
		...order,
		currency: assetMeta.key,
		currencyLabel: order.currencyLabel || assetMeta.shortLabel,
		assetLabel: order.assetLabel || assetMeta.label,
		assetIcon: order.assetIcon || assetMeta.icon,
		merchantPhone: order.merchantPhone || '暂未登记',
		status: order.status || 'unused',
		expireAtTs,
		isExpired: expireAtTs > 0 ? expireAtTs <= Date.now() : false
	}
}

export const shopItems = rawShopItems.map((item) => normalizeShopItem(item))

export function getShopAssets() {
	const progress = getStorage(STORAGE_KEYS.userProgress, {})
	return {
		silver: clampAssetValue(progress.silver, shopAssetDefault.silver),
		silverKey: clampAssetValue(progress.silverKey, shopAssetDefault.silverKey)
	}
}

export function setShopAssets(nextAssets = {}) {
	patchStorageObject(STORAGE_KEYS.userProgress, {
		silver: clampAssetValue(nextAssets.silver, shopAssetDefault.silver),
		silverKey: clampAssetValue(nextAssets.silverKey, shopAssetDefault.silverKey)
	})
	return getShopAssets()
}

export function getRedeemOrders() {
	const progress = getUserProgress()
	// Legacy coupons remain readable; the next write migrates them into the economy snapshot.
	const cachedOrders = Array.isArray(progress.redeemOrders) ? progress.redeemOrders : getStorage(STORAGE_KEYS.redeemOrders, [])
	if (!Array.isArray(cachedOrders)) {
		return []
	}
	return cachedOrders.filter((item) => item && typeof item === 'object' && item.orderId).map((item) => normalizeRedeemOrder(item))
}

export function saveRedeemOrder(order = {}) {
	const normalizedOrder = normalizeRedeemOrder(order)
	const orderList = getRedeemOrders()
	const nextOrders = [normalizedOrder, ...orderList.filter((item) => item.orderId !== normalizedOrder.orderId)]
	return patchStorageObject(STORAGE_KEYS.userProgress, { redeemOrders: nextOrders }) ? nextOrders : null
}

/** Charge, issue the coupon and unlock its outfit in one storage write. */
export function redeemShopItem(itemId, now = new Date()) {
	const item = shopItems.find((entry) => entry.id === itemId)
	if (!item) return { ok: false, reason: '商品不存在' }
	const progress = getUserProgress()
	if (progress[item.currency] < item.price) return { ok: false, reason: `${item.currencyLabel}不足` }
	const order = createRedeemOrder(item, now)
	const costume = COSTUMES.find((entry) => entry.unlock?.type === 'shop' && entry.unlock.itemId === itemId)
	const grantedCostume = costume && !progress.ownedCostumes.includes(costume.id) ? costume : null
	const saved = patchStorageObject(STORAGE_KEYS.userProgress, {
		[item.currency]: progress[item.currency] - item.price,
		redeemOrders: [order, ...getRedeemOrders()],
		ownedCostumes: grantedCostume ? [...progress.ownedCostumes, grantedCostume.id] : progress.ownedCostumes
	})
	return saved ? { ok: true, order, grantedCostume, assets: getShopAssets() } : { ok: false, reason: '保存失败，未扣款，请重试' }
}

export function getRedeemOrderById(orderId) {
	return getRedeemOrders().find((item) => item.orderId === orderId) || null
}

/* 更新某张票券的状态（如到店「在店核销」→ 'used'）。完成订单生命周期：unused → used。 */
export function updateRedeemOrderStatus(orderId, status) {
	const orders = getRedeemOrders()
	const target = orders.find((order) => order.orderId === orderId)
	if (!target || status !== 'used' || target.status !== 'unused' || target.isExpired) return false
	let changed = false
	const next = orders.map((order) => {
		if (order.orderId === orderId) {
			changed = true
			return normalizeRedeemOrder({ ...order, status })
		}
		return order
	})
	if (changed) {
		return !!patchStorageObject(STORAGE_KEYS.userProgress, { redeemOrders: next })
	}
	return changed
}

export function createRedeemOrder(item, now = new Date()) {
	const normalizedItem = normalizeShopItem(item)
	const expireAt = new Date(now.getTime() + normalizedItem.expireHours * 60 * 60 * 1000)
	const orderId = createOrderId(now)
	return normalizeRedeemOrder({
		orderId,
		itemId: normalizedItem.id,
		itemName: normalizedItem.name,
		category: normalizedItem.category,
		merchantName: normalizedItem.merchantName,
		merchantPhone: normalizedItem.merchantPhone,
		price: normalizedItem.price,
		currency: normalizedItem.currency,
		currencyLabel: normalizedItem.currencyLabel,
		assetLabel: normalizedItem.assetLabel,
		assetIcon: normalizedItem.assetIcon,
		priceLabel: normalizedItem.priceLabel,
		address: normalizedItem.address,
		businessHours: normalizedItem.businessHours,
		redeemTip: normalizedItem.redeemTip,
		redeemScene: normalizedItem.redeemScene,
		highlight: normalizedItem.highlight,
		spec: normalizedItem.spec,
		codeText: `${normalizedItem.id}|${orderId}`,
		exchangeAt: formatDateTime(now),
		exchangeAtTs: now.getTime(),
		expireAt: formatDateTime(expireAt),
		expireAtTs: expireAt.getTime(),
		status: 'unused'
	})
}

export function getOrderStatus(order) {
	if (!order) {
		return {
			key: 'missing',
			text: '无凭证',
			isExpired: false
		}
	}

	if (order.status !== 'used' && Number(order.expireAtTs) > 0 && Number(order.expireAtTs) <= Date.now()) {
		return {
			key: 'expired',
			text: '已过期',
			isExpired: true
		}
	}

	return {
		key: order.status || 'unused',
		text: order.status === 'used' ? '已核销' : '待核销',
		isExpired: false
	}
}
