<template>
	<view class="shop-stage">
		<!-- 店铺夜景 -->
		<view class="shop-stage__bg"></view>
		<view class="shop-stage__bg-glow"></view>

		<!-- 飘动萤火 -->
		<FallingLeaves type="firefly" :density="10" />

		<!-- 顶部门头：飞檐 + 牌匾 + 灯笼 -->
		<view class="shop-stage__shopfront">
			<view class="shop-stage__eaves shop-stage__eaves--l"></view>
			<view class="shop-stage__eaves shop-stage__eaves--r"></view>

			<view class="shop-stage__plaque">
				<view class="shop-stage__plaque-ribbon"></view>
				<text class="shop-stage__plaque-text">{{ shopName }}</text>
			</view>

			<view class="shop-stage__lanterns">
				<LanternHanger :count="4" :lit="true" text="瑞蚨祥晋" />
			</view>

			<view class="shop-stage__banner">
				<text class="shop-stage__banner-text">— 平遥旧物 · 银钥可兑 —</text>
			</view>
		</view>

		<!-- 资产腰包（左上）+ 掌柜（右上）-->
		<view class="shop-stage__hud">
			<view class="shop-stage__pouch">
				<view class="shop-stage__pouch-item">
					<view class="shop-stage__pouch-coin"></view>
					<view class="shop-stage__pouch-figure">
						<text class="shop-stage__pouch-value">{{ assets.silver }}</text>
						<text class="shop-stage__pouch-label">银两</text>
					</view>
				</view>
				<view class="shop-stage__pouch-divider"></view>
				<view class="shop-stage__pouch-item">
					<view class="shop-stage__pouch-key">
						<text>钥</text>
					</view>
					<view class="shop-stage__pouch-figure">
						<text class="shop-stage__pouch-value">{{ assets.silverKey }}</text>
						<text class="shop-stage__pouch-label">银钥</text>
					</view>
				</view>
			</view>

			<view class="shop-stage__keeper" @tap="bubbleVisible = !bubbleVisible">
				<view class="shop-stage__keeper-aura"></view>
				<image class="shop-stage__keeper-img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
				<view v-if="bubbleVisible" class="shop-stage__keeper-bubble">
					<view class="shop-stage__keeper-bubble-arrow"></view>
					<text class="shop-stage__keeper-bubble-name">— 掌柜小鸦 —</text>
					<text class="shop-stage__keeper-bubble-line">{{ categoryNarrative[activeCategory] }}</text>
				</view>
			</view>
		</view>

		<!-- 分类标签（账本卷边）-->
		<view class="shop-stage__categories">
			<view
				v-for="category in shopCategories"
				:key="category.id"
				class="shop-stage__category"
				:class="{ 'shop-stage__category--active': activeCategory === category.id }"
				@tap="activeCategory = category.id"
			>
				<text class="shop-stage__category-name">{{ category.name }}</text>
				<text class="shop-stage__category-tag">{{ category.tagline }}</text>
				<view v-if="activeCategory === category.id" class="shop-stage__category-mark"></view>
			</view>
		</view>

		<!-- 货架场景（柜台纵深感）-->
		<scroll-view class="shop-stage__shelves-scroll" scroll-y :show-scrollbar="false">
			<view :key="activeCategory" class="shop-stage__shelves">
				<!-- 铺面纵深：两侧木柱 + 楹联竖条 -->
				<view class="shop-stage__post shop-stage__post--l">
					<view class="shop-stage__couplet">
						<text>晋商旧物聚一架</text>
					</view>
				</view>
				<view class="shop-stage__post shop-stage__post--r">
					<view class="shop-stage__couplet">
						<text>银钥可换满堂珍</text>
					</view>
				</view>

				<view
					v-for="(shelfRow, rowIdx) in shelfRows"
					:key="rowIdx"
					class="shop-stage__shelf"
				>
					<!-- 木横档 -->
					<view class="shop-stage__shelf-board">
						<view class="shop-stage__shelf-board-front"></view>
						<view class="shop-stage__shelf-board-edge"></view>
					</view>

					<!-- 商品摆件（无外框） -->
					<view class="shop-stage__shelf-row">
						<view
							v-for="item in shelfRow"
							:key="item.id"
							class="shop-stage__product"
							:class="{
								'shop-stage__product--selected': currentItem?.id === item.id,
								'shop-stage__product--epic': item.price >= 200,
								'shop-stage__product--rare': item.price >= 100 && item.price < 200
							}"
							@tap="currentItem = item"
						>
							<!-- 限量印章 -->
							<view v-if="item.price >= 200" class="shop-stage__product-stamp">
								<text>限</text>
							</view>

							<!-- 商品光晕 -->
							<view class="shop-stage__product-halo"></view>

							<!-- 商品本体（按品类呈不同器型：食盒 / 锦盒 / 票券）-->
							<view class="shop-stage__product-body">
								<view
									class="shop-stage__product-orb"
									:class="`shop-stage__product-orb--${item.category}`"
								>
									<view class="shop-stage__product-orb-shine"></view>
									<text class="shop-stage__product-orb-icon">{{ getProductIcon(item) }}</text>
								</view>
								<view class="shop-stage__product-shadow"></view>
							</view>

							<!-- 商品名（木匾名签）-->
							<view class="shop-stage__product-plaque">
								<text class="shop-stage__product-name">{{ item.name }}</text>
							</view>

							<!-- 价格挂签 -->
							<view class="shop-stage__product-tag">
								<view class="shop-stage__product-tag-string"></view>
								<view class="shop-stage__product-tag-paper">
									<text>{{ item.priceLabel }}</text>
								</view>
							</view>
						</view>
					</view>

					<!-- 货架支柱阴影 -->
					<view class="shop-stage__shelf-shadow"></view>
				</view>

				<EmptyOwl
					v-if="filteredItems.length === 0"
					text="此架暂时空着——掌柜还在备货。"
				/>

				<!-- 柜台前景（结尾装饰）-->
				<view v-if="filteredItems.length > 0" class="shop-stage__counter">
					<view class="shop-stage__counter-top"></view>
					<view class="shop-stage__counter-front">
						<text class="shop-stage__counter-text">— 瑞 蚨 祥 · 柜 台 —</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 商品详情（卷轴展开）-->
		<view v-if="currentItem" class="shop-stage__detail-mask" @tap="currentItem = null"></view>
		<view v-if="currentItem" class="shop-stage__detail" @tap.stop>
			<view class="shop-stage__detail-roll shop-stage__detail-roll--top"></view>
			<view class="shop-stage__detail-paper">
				<view class="shop-stage__detail-fiber"></view>

				<view class="shop-stage__detail-product">
					<view
						class="shop-stage__detail-product-inner"
						:class="[getRarityClass(currentItem), `shop-stage__product-orb--${currentItem.category}`]"
					>
						<text class="shop-stage__detail-product-icon">{{ getProductIcon(currentItem) }}</text>
					</view>
				</view>

				<view class="shop-stage__detail-head">
					<text class="shop-stage__detail-eyebrow">— 平遥旧物 —</text>
					<text class="shop-stage__detail-name">{{ currentItem.name }}</text>
					<text class="shop-stage__detail-merchant">{{ currentItem.merchantName }} · {{ currentItem.distance }}</text>
				</view>

				<text class="shop-stage__detail-desc">{{ currentItem.highlight }}。{{ currentItem.redeemTip }}</text>

				<view class="shop-stage__detail-props">
					<view class="shop-stage__detail-prop">
						<text class="shop-stage__detail-prop-label">来源</text>
						<text class="shop-stage__detail-prop-value">{{ currentItem.origin }}</text>
					</view>
					<view class="shop-stage__detail-prop">
						<text class="shop-stage__detail-prop-label">工艺</text>
						<text class="shop-stage__detail-prop-value">{{ currentItem.craft }}</text>
					</view>
					<view class="shop-stage__detail-prop">
						<text class="shop-stage__detail-prop-label">规格</text>
						<text class="shop-stage__detail-prop-value">{{ currentItem.spec }}</text>
					</view>
					<view class="shop-stage__detail-prop">
						<text class="shop-stage__detail-prop-label">营业</text>
						<text class="shop-stage__detail-prop-value">{{ currentItem.businessHours }}</text>
					</view>
				</view>

				<view class="shop-stage__detail-fund">
					<text>已 {{ currentItem.currencyLabel }}：{{ assets[currentItem.currency] || 0 }}</text>
					<text class="shop-stage__detail-fund-divider">/</text>
					<text>需 {{ currentItem.price }}</text>
				</view>

				<view
					class="shop-stage__detail-buy"
					:class="{ 'shop-stage__detail-buy--locked': isRedeeming || !isEnough(currentItem) }"
					@tap="redeemItem(currentItem)"
				>
					<view class="shop-stage__detail-buy-stamp">
						<text>印</text>
					</view>
					<text class="shop-stage__detail-buy-text">{{ isRedeeming ? '正 在 出 票' : isEnough(currentItem) ? '盖 章 兑 换' : '银 钥 不 足' }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import LanternHanger from '@/components/LanternHanger.vue'
import EmptyOwl from '@/components/EmptyOwl.vue'
import {
	createRedeemOrder,
	getShopAssets,
	saveRedeemOrder,
	setShopAssets,
	shopCategories,
	shopItems
} from '@/common/data/shop-items.js'
import { markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'

const activeCategory = ref(shopCategories[0]?.id || 'food')
const assets = ref(getShopAssets())
const currentItem = ref(null)
const isRedeeming = ref(false)
const bubbleVisible = ref(true)

const shopName = '瑞 蚨 祥 旧 铺'
const categoryNarrative = {
	food: '把古城的味道，装进行囊带走。',
	cultural: '票号与旧城的记忆，值得留作纪念。',
	experience: '真正的旅程，要拉回线下去体验。'
}

const filteredItems = computed(() => shopItems.filter((item) => item.category === activeCategory.value))

/* 货架分层（每层最多3件）*/
const shelfRows = computed(() => {
	const rows = []
	const items = filteredItems.value
	for (let i = 0; i < items.length; i += 3) {
		rows.push(items.slice(i, i + 3))
	}
	return rows.length === 0 ? [] : rows
})

function getRarityClass(item) {
	if (item.price >= 200) return 'rarity--epic'
	if (item.price >= 100) return 'rarity--rare'
	return 'rarity--common'
}

function getProductIcon(item) {
	const map = {
		food: '食',
		cultural: '物',
		experience: '游'
	}
	return map[item.category] || '宝'
}

onShow(() => {
	markPageVisit('shop', { returnPage: '/pages_game/street/street', returnTab: '/pages/shop/shop' })
	rememberReturnContext('/pages_game/street/street', '/pages/shop/shop')
	assets.value = getShopAssets()
})

function isEnough(item) {
	return !!item && (assets.value[item.currency] || 0) >= item.price
}

function redeemItem(item) {
	if (!item || isRedeeming.value || !isEnough(item)) return
	isRedeeming.value = true

	const nextAssets = { ...assets.value, [item.currency]: Math.max(0, (assets.value[item.currency] || 0) - item.price) }
	assets.value = setShopAssets(nextAssets)
	const order = createRedeemOrder(item)
	saveRedeemOrder(order)
	currentItem.value = null
	setTimeout(() => {
		isRedeeming.value = false
		uni.navigateTo({ url: `/pages_shop/redeem/redeem?orderId=${order.orderId}` })
	}, 280)
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.shop-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background: linear-gradient(180deg, #1a0d08 0%, #0a0604 100%);
	overflow: hidden;
	padding-bottom: calc(env(safe-area-inset-bottom) + 140rpx);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.shop-stage__bg {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(180deg, rgba(40, 22, 14, 0.55) 0%, rgba(13, 9, 7, 0.92) 100%),
		repeating-linear-gradient(0deg, rgba(74, 42, 24, 0.18) 0, rgba(74, 42, 24, 0.18) 80rpx, transparent 80rpx, transparent 120rpx);
	pointer-events: none;
}

.shop-stage__bg-glow {
	position: absolute;
	inset: 0;
	background: radial-gradient(ellipse at 50% 0%, rgba(255, 130, 60, 0.32) 0%, transparent 40%);
	pointer-events: none;
}

/* ===== 顶部门头 ===== */
.shop-stage__shopfront {
	position: relative;
	z-index: 4;
	padding: calc(env(safe-area-inset-top) + 28rpx) 36rpx 30rpx;
}

.shop-stage__eaves {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 0rpx);
	width: 50%;
	height: 90rpx;
	background: linear-gradient(180deg, #1a1108 0%, #4a2a18 100%);
}

.shop-stage__eaves--l {
	left: 0;
	clip-path: polygon(0 100%, 0 30%, 30% 0, 100% 60%, 100% 100%);
	box-shadow: inset -4rpx -8rpx 16rpx rgba(0, 0, 0, 0.6);
}

.shop-stage__eaves--r {
	right: 0;
	clip-path: polygon(0 60%, 70% 0, 100% 30%, 100% 100%, 0 100%);
	box-shadow: inset 4rpx -8rpx 16rpx rgba(0, 0, 0, 0.6);
}

.shop-stage__plaque {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto;
	width: max-content;
	min-width: 360rpx;
	padding: 16rpx 60rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 36rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 12rpx;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.5),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	z-index: 4;
}

.shop-stage__plaque::before,
.shop-stage__plaque::after {
	content: '';
	position: absolute;
	top: -10rpx;
	width: 28rpx;
	height: 18rpx;
	background: #2a1810;
	border-radius: 4rpx 4rpx 0 0;
}

.shop-stage__plaque::before { left: 16rpx; transform: skewX(-20deg); }
.shop-stage__plaque::after  { right: 16rpx; transform: skewX(20deg); }

.shop-stage__plaque-ribbon {
	position: absolute;
	top: -22rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 44rpx;
	height: 26rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
}

.shop-stage__lanterns {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(env(safe-area-inset-top) + 86rpx);
	padding: 0 6%;
	z-index: 3;
	pointer-events: none;
}

.shop-stage__banner {
	display: flex;
	justify-content: center;
	margin-top: 200rpx;
	padding: 8rpx 24rpx;
	border-top: 1rpx dashed rgba(212, 165, 116, 0.42);
	border-bottom: 1rpx dashed rgba(212, 165, 116, 0.42);
}

.shop-stage__banner-text {
	font-size: 22rpx;
	letter-spacing: 8rpx;
	color: rgba(212, 165, 116, 0.8);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* ===== 资产腰包 + 掌柜（HUD 横排）===== */
.shop-stage__hud {
	position: relative;
	z-index: 6;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
	margin: 18rpx 32rpx 0;
	animation: fadeInUp 0.6s ease 0.2s both;
}

.shop-stage__pouch {
	display: flex;
	align-items: center;
	gap: 14rpx;
	padding: 10rpx 22rpx;
	background:
		linear-gradient(180deg, #4a2a18 0%, #6b3510 50%, #4a2a18 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	border-radius: 999rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.4),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.5),
		0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	max-width: 60%;
}

.shop-stage__pouch-item {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.shop-stage__pouch-coin {
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	position: relative;
	box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__pouch-coin::after {
	content: '';
	position: absolute;
	left: 50%;
	top: 50%;
	width: 8rpx;
	height: 8rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
}

.shop-stage__pouch-key {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32rpx;
	height: 32rpx;
	background: linear-gradient(135deg, $py-gold 0%, $py-bronze 100%);
	border-radius: 6rpx;
	color: $py-paper-warm;
	font-size: 20rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform: rotate(-6deg);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__pouch-figure {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.shop-stage__pouch-value {
	font-size: 24rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	line-height: 1.1;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__pouch-label {
	font-size: 14rpx;
	color: rgba(255, 235, 200, 0.78);
	letter-spacing: 2rpx;
}

.shop-stage__pouch-divider {
	width: 1rpx;
	height: 32rpx;
	background: rgba(212, 165, 116, 0.4);
}

/* 掌柜小立绘 */
.shop-stage__keeper {
	position: relative;
	flex-shrink: 0;
}

.shop-stage__keeper-aura {
	position: absolute;
	left: 50%;
	bottom: -10rpx;
	width: 100rpx;
	height: 20rpx;
	transform: translateX(-50%);
	background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 100, 0.4) 0%, transparent 70%);
	pointer-events: none;
	animation: keeperBreath 2.6s ease-in-out infinite;
}

@keyframes keeperBreath {
	0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
	50%      { opacity: 0.9; transform: translateX(-50%) scale(1.15); }
}

.shop-stage__keeper-img {
	width: 88rpx;
	height: 110rpx;
	animation: floatY 3.4s ease-in-out infinite;
	filter: drop-shadow(0 6rpx 18rpx rgba(0, 0, 0, 0.55));
}

.shop-stage__keeper-bubble {
	position: absolute;
	right: 92rpx;
	top: 4rpx;
	z-index: 4;
	width: 280rpx;
	padding: 12rpx 16rpx;
	background: rgba(255, 248, 239, 0.95);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 18rpx 4rpx 18rpx 18rpx;
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.45);
	animation: bubbleIn 0.32s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

.shop-stage__keeper-bubble-arrow {
	position: absolute;
	right: -10rpx;
	top: 16rpx;
	width: 0;
	height: 0;
	border-top: 8rpx solid transparent;
	border-bottom: 8rpx solid transparent;
	border-left: 12rpx solid rgba(255, 248, 239, 0.95);
}

@keyframes bubbleIn {
	0%   { transform: translateX(20rpx); opacity: 0; }
	100% { transform: translateX(0); opacity: 1; }
}

.shop-stage__keeper-bubble-name {
	display: block;
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.shop-stage__keeper-bubble-line {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	line-height: 1.6;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* ===== 分类标签 ===== */
.shop-stage__categories {
	position: relative;
	z-index: 4;
	display: flex;
	gap: 12rpx;
	margin: 22rpx 32rpx 0;
	animation: fadeInUp 0.6s ease 0.3s both;
}

.shop-stage__category {
	position: relative;
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2rpx;
	padding: 12rpx 8rpx;
	background:
		linear-gradient(180deg, rgba(40, 22, 14, 0.7) 0%, rgba(74, 42, 24, 0.6) 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.32);
	border-radius: 6rpx 6rpx 0 0;
	color: rgba(212, 165, 116, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transition: all 0.2s ease;
}

.shop-stage__category-name {
	font-size: 24rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
}

.shop-stage__category-tag {
	font-size: 14rpx;
	letter-spacing: 2rpx;
	color: rgba(212, 165, 116, 0.55);
}

.shop-stage__category--active {
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	color: $py-paper-warm;
	border-color: rgba(255, 220, 220, 0.45);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.45),
		0 6rpx 14rpx rgba(196, 30, 58, 0.32);
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__category--active .shop-stage__category-tag {
	color: rgba(255, 220, 220, 0.85);
}

.shop-stage__category-mark {
	position: absolute;
	left: 50%;
	bottom: -8rpx;
	width: 20rpx;
	height: 12rpx;
	transform: translateX(-50%);
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 50% 100%);
	box-shadow: 0 4rpx 6rpx rgba(196, 30, 58, 0.5);
}

/* ===== 货架场景 ===== */
.shop-stage__shelves-scroll {
	position: relative;
	z-index: 3;
	flex: 1;
	min-height: 0;
	margin: 14rpx 0 0;
	max-height: calc(100vh - 740rpx);
}

.shop-stage__shelves {
	position: relative;
	padding: 24rpx 56rpx 40rpx;
	background:
		linear-gradient(180deg, rgba(58, 34, 22, 0.65) 0%, rgba(40, 22, 14, 0.85) 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.16) 0, rgba(0, 0, 0, 0.16) 1rpx, transparent 1rpx, transparent 14rpx),
		repeating-linear-gradient(90deg, rgba(176, 123, 58, 0.08) 0, rgba(176, 123, 58, 0.08) 2rpx, transparent 2rpx, transparent 90rpx);
	background-blend-mode: normal, multiply, screen;
	box-shadow:
		inset 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	animation: shelfSwap 0.42s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

/* 换架（分类切换）卷入过渡 */
@keyframes shelfSwap {
	0%   { opacity: 0; transform: translateY(18rpx) scale(0.98); }
	60%  { opacity: 1; }
	100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* ===== 铺面木柱 + 楹联 ===== */
.shop-stage__post {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 40rpx;
	z-index: 1;
	pointer-events: none;
	background:
		linear-gradient(90deg, #2a1810 0%, #6b3510 35%, #b07b3a 50%, #6b3510 65%, #2a1810 100%);
	box-shadow:
		inset 0 0 0 1rpx rgba(0, 0, 0, 0.45),
		inset 0 0 12rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__post--l { left: 0; }
.shop-stage__post--r { right: 0; }

.shop-stage__post::before {
	content: '';
	position: absolute;
	left: 50%;
	top: 0;
	width: 2rpx;
	height: 100%;
	transform: translateX(-50%);
	background: repeating-linear-gradient(0deg, rgba(255, 235, 195, 0.12) 0, rgba(255, 235, 195, 0.12) 3rpx, transparent 3rpx, transparent 24rpx);
}

.shop-stage__couplet {
	position: absolute;
	top: 30rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 30rpx;
	padding: 12rpx 0;
	display: flex;
	justify-content: center;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	border: 1rpx solid rgba(255, 220, 220, 0.4);
	border-radius: 3rpx;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__couplet text {
	writing-mode: vertical-rl;
	font-size: 18rpx;
	letter-spacing: 6rpx;
	line-height: 1.1;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
	white-space: nowrap;
	overflow: hidden;
}

/* 单层货架 */
.shop-stage__shelf {
	position: relative;
	margin-bottom: 24rpx;
	padding-top: 20rpx;
}

/* 木横档（货架顶板）*/
.shop-stage__shelf-board {
	position: absolute;
	left: -16rpx;
	right: -16rpx;
	bottom: 0;
	z-index: 2;
	pointer-events: none;
}

.shop-stage__shelf-board-front {
	height: 18rpx;
	background:
		linear-gradient(180deg, #b07b3a 0%, #8b4513 50%, #6b3510 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 60rpx);
	background-blend-mode: multiply;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.4),
		inset 0 -2rpx 4rpx rgba(0, 0, 0, 0.55);
}

.shop-stage__shelf-board-edge {
	height: 14rpx;
	background:
		linear-gradient(180deg, #4a2a18 0%, #2a1810 100%);
	border-bottom: 1rpx solid rgba(0, 0, 0, 0.55);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

/* 商品摆件行 */
.shop-stage__shelf-row {
	position: relative;
	z-index: 3;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16rpx;
	padding: 0 6rpx 22rpx;
}

/* 货架投影 */
.shop-stage__shelf-shadow {
	position: absolute;
	left: 0;
	right: 0;
	bottom: -16rpx;
	height: 16rpx;
	background: radial-gradient(ellipse at 50% 0%, rgba(0, 0, 0, 0.55) 0%, transparent 70%);
	pointer-events: none;
}

/* ===== 商品摆件（无卡片框）===== */
.shop-stage__product {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	padding-top: 6rpx;
	padding-bottom: 18rpx;
	transition: transform 0.18s ease;
}

.shop-stage__product:active {
	transform: translateY(-4rpx);
}

.shop-stage__product-stamp {
	position: absolute;
	top: -2rpx;
	right: 8rpx;
	z-index: 4;
	width: 32rpx;
	height: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 4rpx;
	transform: rotate(-8deg);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__product-stamp::before {
	content: '';
	position: absolute;
	inset: 3rpx;
	border: 1rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 2rpx;
}

.shop-stage__product-halo {
	position: absolute;
	left: 50%;
	top: 30rpx;
	width: 110rpx;
	height: 110rpx;
	transform: translateX(-50%);
	background: radial-gradient(circle, rgba(212, 165, 116, 0.32) 0%, transparent 70%);
	pointer-events: none;
	z-index: 1;
	transition: all 0.4s ease;
}

.shop-stage__product--rare .shop-stage__product-halo {
	background: radial-gradient(circle, rgba(255, 220, 130, 0.55) 0%, transparent 70%);
}

.shop-stage__product--epic .shop-stage__product-halo {
	background: radial-gradient(circle, rgba(196, 30, 58, 0.55) 0%, transparent 70%);
	animation: epicPulse 2.2s ease-in-out infinite;
}

@keyframes epicPulse {
	0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
	50%      { opacity: 1; transform: translateX(-50%) scale(1.18); }
}

.shop-stage__product--selected .shop-stage__product-halo {
	background: radial-gradient(circle, rgba(255, 220, 130, 0.7) 0%, transparent 75%);
	animation: selectedPulse 1.4s ease-in-out infinite;
}

@keyframes selectedPulse {
	0%, 100% { transform: translateX(-50%) scale(1); }
	50%      { transform: translateX(-50%) scale(1.25); }
}

.shop-stage__product-body {
	position: relative;
	z-index: 2;
}

.shop-stage__product-orb {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.7) 0%, transparent 35%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.4),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	overflow: hidden;
	animation: productFloat 3s ease-in-out infinite;
}

.shop-stage__product--rare .shop-stage__product-orb {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 230, 195, 0.7) 0%, transparent 35%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 50%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.45),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55),
		0 0 18rpx rgba(255, 220, 130, 0.4);
}

.shop-stage__product--epic .shop-stage__product-orb {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 220, 220, 0.7) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #6b1622 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 220, 0.5),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55),
		0 0 22rpx rgba(196, 30, 58, 0.55);
}

@keyframes productFloat {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-6rpx); }
}

/* ===== 品类器型差异化（食盒 / 锦盒 / 票券）===== */
/* 食单：圆食盒，顶部一道盒盖缝 */
.shop-stage__product-orb--food {
	border-radius: 18rpx;
}

.shop-stage__product-orb--food::before {
	content: '';
	position: absolute;
	left: 12%;
	right: 12%;
	top: 30%;
	height: 2rpx;
	background: rgba(42, 24, 16, 0.55);
	box-shadow: 0 1rpx 0 rgba(255, 235, 195, 0.35);
	pointer-events: none;
	z-index: 1;
}

/* 文藏：方锦盒，十字系带 */
.shop-stage__product-orb--cultural {
	border-radius: 12rpx;
}

.shop-stage__product-orb--cultural::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		linear-gradient(90deg, transparent calc(50% - 4rpx), rgba(196, 30, 58, 0.7) calc(50% - 4rpx), rgba(196, 30, 58, 0.7) calc(50% + 4rpx), transparent calc(50% + 4rpx)),
		linear-gradient(0deg, transparent calc(50% - 4rpx), rgba(196, 30, 58, 0.7) calc(50% - 4rpx), rgba(196, 30, 58, 0.7) calc(50% + 4rpx), transparent calc(50% + 4rpx));
	border-radius: 12rpx;
	pointer-events: none;
	z-index: 1;
}

/* 行程：立式票券，剪票豁口 */
.shop-stage__product-orb--experience {
	border-radius: 8rpx;
	clip-path: polygon(0 0, 100% 0, 100% 42%, 90% 50%, 100% 58%, 100% 100%, 0 100%, 0 58%, 10% 50%, 0 42%);
}

.shop-stage__product-orb-shine {
	position: absolute;
	top: 18rpx;
	left: 22rpx;
	width: 22rpx;
	height: 14rpx;
	background: rgba(255, 248, 239, 0.4);
	border-radius: 50%;
	transform: rotate(-30deg);
	filter: blur(2rpx);
	pointer-events: none;
}

.shop-stage__product-orb-icon {
	position: relative;
	z-index: 2;
	font-size: 38rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.shop-stage__product-shadow {
	position: absolute;
	bottom: -6rpx;
	left: 50%;
	width: 80rpx;
	height: 12rpx;
	background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.55) 0%, transparent 70%);
	transform: translateX(-50%);
	pointer-events: none;
}

.shop-stage__product-name {
	font-size: 18rpx;
	font-weight: 700;
	color: $py-gold-light;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	text-align: center;
	max-width: 156rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
	z-index: 2;
}

/* 商品名木匾名签 */
.shop-stage__product-plaque {
	position: relative;
	z-index: 2;
	margin-top: 6rpx;
	padding: 4rpx 14rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%);
	border: 1rpx solid rgba(212, 165, 116, 0.5);
	border-radius: 4rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.32),
		0 2rpx 5rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__product-plaque::before,
.shop-stage__product-plaque::after {
	content: '';
	position: absolute;
	top: 50%;
	width: 6rpx;
	height: 6rpx;
	transform: translateY(-50%);
	background: $py-gold;
	border-radius: 50%;
	box-shadow: 0 0 2rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__product-plaque::before { left: 4rpx; }
.shop-stage__product-plaque::after  { right: 4rpx; }

.shop-stage__product--selected .shop-stage__product-name {
	color: $py-paper-warm;
	text-shadow: 0 0 8rpx rgba(255, 220, 130, 0.5), 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.shop-stage__product--selected .shop-stage__product-plaque {
	border-color: rgba(255, 220, 130, 0.7);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.4),
		0 0 12rpx rgba(255, 220, 130, 0.5),
		0 2rpx 5rpx rgba(0, 0, 0, 0.5);
}

/* 价格挂签 */
.shop-stage__product-tag {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: 2rpx;
	z-index: 2;
}

.shop-stage__product-tag-string {
	width: 1rpx;
	height: 10rpx;
	background: rgba(212, 165, 116, 0.65);
}

.shop-stage__product-tag-paper {
	position: relative;
	padding: 4rpx 12rpx;
	background: $py-paper-warm;
	border: 1rpx solid rgba(110, 85, 65, 0.55);
	border-radius: 2rpx;
	transform: rotate(-3deg);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.45);
}

.shop-stage__product-tag-paper::before {
	content: '';
	position: absolute;
	left: 50%;
	top: -3rpx;
	width: 5rpx;
	height: 5rpx;
	background: #4a2a18;
	border-radius: 50%;
	transform: translateX(-50%);
}

.shop-stage__product-tag-paper text {
	font-size: 16rpx;
	font-weight: 700;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

/* ===== 柜台前景 ===== */
.shop-stage__counter {
	position: relative;
	z-index: 4;
	margin: 32rpx -56rpx 0;
}

.shop-stage__counter-top {
	height: 14rpx;
	background:
		linear-gradient(180deg, #b07b3a 0%, #8b4513 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 80rpx);
	background-blend-mode: multiply;
	box-shadow: inset 0 1rpx 0 rgba(255, 235, 195, 0.4);
}

.shop-stage__counter-front {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 56rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 2rpx, transparent 2rpx, transparent 26rpx);
	background-blend-mode: multiply;
	border-bottom: 2rpx solid rgba(0, 0, 0, 0.5);
}

.shop-stage__counter-text {
	font-size: 22rpx;
	letter-spacing: 12rpx;
	color: rgba(212, 165, 116, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.65);
}

/* ===== 商品详情 ===== */
.shop-stage__detail-mask {
	position: fixed;
	inset: 0;
	z-index: 30;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(10rpx);
}

.shop-stage__detail {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(env(safe-area-inset-bottom) + 30rpx);
	z-index: 31;
	max-height: 88vh;
	overflow-y: auto;
	animation: scrollUnfurlV 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: bottom center;
}

.shop-stage__detail-roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 26rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.shop-stage__detail-roll--top { top: -13rpx; }

.shop-stage__detail-paper {
	position: relative;
	padding: 32rpx 32rpx 28rpx;
	background: linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.6);
}

.shop-stage__detail-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx;
}

.shop-stage__detail-paper > * { position: relative; z-index: 1; }

.shop-stage__detail-product {
	display: flex;
	justify-content: center;
	margin-bottom: 14rpx;
}

.shop-stage__detail-product-inner {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.65) 0%, transparent 35%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 3rpx rgba(255, 235, 195, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.45);
	animation: detailSpin 6s linear infinite;
}

.shop-stage__detail-product-inner.rarity--rare {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 230, 195, 0.65) 0%, transparent 35%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 50%, #4a2a18 100%);
}

.shop-stage__detail-product-inner.rarity--epic {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 220, 220, 0.65) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #6b1622 100%);
}

.shop-stage__detail-product-icon {
	font-size: 60rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

@keyframes detailSpin {
	0%   { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.shop-stage__detail-head {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	margin-bottom: 14rpx;
}

.shop-stage__detail-eyebrow {
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.shop-stage__detail-name {
	font-size: 36rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
}

.shop-stage__detail-merchant {
	font-size: 20rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 2rpx;
}

.shop-stage__detail-desc {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.85;
	color: $py-ink-soft;
	text-align: center;
}

.shop-stage__detail-props {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12rpx;
	margin-top: 18rpx;
}

.shop-stage__detail-prop {
	padding: 12rpx 14rpx;
	background: rgba(212, 165, 116, 0.12);
	border-left: 3rpx solid $py-bronze;
	border-radius: 0 6rpx 6rpx 0;
}

.shop-stage__detail-prop-label {
	display: block;
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: rgba(110, 85, 65, 0.78);
}

.shop-stage__detail-prop-value {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

.shop-stage__detail-fund {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 16rpx;
	margin-top: 18rpx;
	padding: 14rpx 24rpx;
	background: rgba(212, 165, 116, 0.18);
	border-radius: 6rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

.shop-stage__detail-fund-divider {
	color: rgba(110, 85, 65, 0.55);
}

.shop-stage__detail-buy {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
	margin-top: 18rpx;
	padding: 22rpx 32rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 220, 0.32) 0%, transparent 60%),
		linear-gradient(135deg, $py-red 0%, #8b1a2e 50%, $py-red 100%);
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 6rpx;
	color: $py-paper-warm;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.5),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.45),
		0 8rpx 18rpx rgba(196, 30, 58, 0.45);
	transition: transform 0.18s ease;
}

.shop-stage__detail-buy:active {
	transform: scale(0.96) rotate(-1deg);
}

.shop-stage__detail-buy--locked {
	background: linear-gradient(135deg, #4a3a2a 0%, #3d2f22 100%);
	color: rgba(245, 240, 232, 0.34);
	border-color: rgba(212, 165, 116, 0.12);
	box-shadow: inset 0 2rpx 6rpx rgba(0, 0, 0, 0.45);
}

.shop-stage__detail-buy-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 44rpx;
	background: $py-paper-warm;
	color: $py-red;
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.shop-stage__detail-buy-text {
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 12rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

@keyframes scrollUnfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}

@keyframes fadeInUp {
	0%   { opacity: 0; transform: translateY(20rpx); }
	100% { opacity: 1; transform: translateY(0); }
}

@keyframes floatY {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-8rpx); }
}
</style>
