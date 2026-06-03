<template>
	<view class="redeem-stage">
		<!-- 暗夜背景 -->
		<view class="redeem-stage__bg"></view>

		<!-- 飘动萤火 -->
		<FallingLeaves type="firefly" :density="8" />

		<!-- 顶部铜钱返回 -->
		<view class="redeem-stage__back" @tap="goBack">
			<view class="redeem-stage__back-rim"></view>
			<view class="redeem-stage__back-face">
				<text>返</text>
			</view>
			<view class="redeem-stage__back-hole"></view>
			<text class="redeem-stage__back-label">回 账 本</text>
		</view>

		<!-- 主体：老票号凭证 -->
		<view v-if="orderDetail" class="redeem-stage__voucher">
			<!-- 撕齿边 -->
			<view class="redeem-stage__voucher-perf redeem-stage__voucher-perf--top"></view>
			<view class="redeem-stage__voucher-perf redeem-stage__voucher-perf--bot"></view>

			<view class="redeem-stage__voucher-paper">
				<view class="redeem-stage__voucher-fiber"></view>

				<!-- 顶部牌匾 -->
				<view class="redeem-stage__voucher-head">
					<text class="redeem-stage__voucher-eyebrow">— 平 遥 票 号 凭 证 —</text>
					<view class="redeem-stage__voucher-bar"></view>
					<text class="redeem-stage__voucher-title">{{ orderDetail.itemName }}</text>
					<text class="redeem-stage__voucher-merchant">{{ orderDetail.merchantName }}</text>
				</view>

				<!-- 红印章状态 -->
				<view class="redeem-stage__voucher-state-stamp" :class="`redeem-stage__voucher-state-stamp--${orderStatus.key}`">
					<view class="redeem-stage__voucher-state-stamp-inner">
						<text>{{ orderStatus.text }}</text>
					</view>
				</view>

				<view class="redeem-stage__voucher-divider"></view>

				<!-- 主信息 -->
				<view class="redeem-stage__voucher-body">
					<view class="redeem-stage__voucher-field">
						<text class="redeem-stage__voucher-field-label">订 单</text>
						<text class="redeem-stage__voucher-field-value">{{ orderDetail.orderId }}</text>
					</view>
					<view class="redeem-stage__voucher-field">
						<text class="redeem-stage__voucher-field-label">兑 时</text>
						<text class="redeem-stage__voucher-field-value">{{ orderDetail.exchangeAt }}</text>
					</view>
					<view class="redeem-stage__voucher-field">
						<text class="redeem-stage__voucher-field-label">效 期</text>
						<text class="redeem-stage__voucher-field-value">{{ orderDetail.expireAt }}</text>
					</view>
					<view class="redeem-stage__voucher-field">
						<text class="redeem-stage__voucher-field-label">银 钥</text>
						<text class="redeem-stage__voucher-field-value">{{ orderDetail.price }} {{ orderDetail.currencyLabel }}</text>
					</view>
				</view>

				<!-- 中央码 -->
				<view class="redeem-stage__voucher-code">
					<view class="redeem-stage__voucher-code-frame">
						<view class="redeem-stage__voucher-code-grid">
							<view
								v-for="cell in qrCells"
								:key="cell.index"
								class="redeem-stage__voucher-code-cell"
								:class="{ 'redeem-stage__voucher-code-cell--dark': cell.dark }"
							></view>
						</view>
						<!-- 四角定位印章 -->
						<view class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--tl"></view>
						<view class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--tr"></view>
						<view class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--bl"></view>
					</view>
					<text class="redeem-stage__voucher-code-text">{{ orderDetail.codeText }}</text>
					<text class="redeem-stage__voucher-code-hint">— 入店出示此码即可核销 —</text>
				</view>

				<view class="redeem-stage__voucher-divider"></view>

				<!-- 商户信息 -->
				<view class="redeem-stage__voucher-merchant-info">
					<view class="redeem-stage__voucher-merchant-row">
						<text class="redeem-stage__voucher-merchant-label">铺 址</text>
						<text class="redeem-stage__voucher-merchant-value">{{ orderDetail.address }}</text>
					</view>
					<view class="redeem-stage__voucher-merchant-row">
						<text class="redeem-stage__voucher-merchant-label">营 时</text>
						<text class="redeem-stage__voucher-merchant-value">{{ orderDetail.businessHours }}</text>
					</view>
					<view class="redeem-stage__voucher-merchant-row">
						<text class="redeem-stage__voucher-merchant-label">联 系</text>
						<text class="redeem-stage__voucher-merchant-value">{{ orderDetail.merchantPhone }}</text>
					</view>
				</view>

				<!-- 提示卷边 -->
				<view class="redeem-stage__voucher-tips">
					<text class="redeem-stage__voucher-tips-label">— 掌柜叮咛 —</text>
					<text class="redeem-stage__voucher-tips-text">{{ orderDetail.redeemTip }}</text>
				</view>

				<!-- 底部红朱印（落款）-->
				<view class="redeem-stage__voucher-seal">
					<text>瑞蚨祥晋商印鉴</text>
				</view>

				<!-- 操作按钮 -->
				<view class="redeem-stage__voucher-actions">
					<view class="redeem-stage__voucher-action" @tap="handleTicketAction('票券已收入行旅账本')">
						<text>收入账本</text>
					</view>
					<view class="redeem-stage__voucher-action redeem-stage__voucher-action--accent" @tap="handleTicketAction(`已记住 ${orderDetail.merchantName}`)">
						<text>前往商户</text>
					</view>
					<view class="redeem-stage__voucher-action" @tap="handleTicketAction(`商户电话：${orderDetail.merchantPhone}`)">
						<text>联系商户</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<EmptyOwl
			v-else
			:text="emptyText"
			cta-text="回到商城 ›"
			@action="goBack"
		/>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import EmptyOwl from '@/components/EmptyOwl.vue'
import { getOrderStatus, getRedeemOrderById, getRedeemOrders } from '@/common/data/shop-items.js'

const orderDetail = ref(null)
const requestedOrderId = ref('')

const orderStatus = computed(() => getOrderStatus(orderDetail.value))
const emptyText = computed(() => {
	if (requestedOrderId.value) {
		return '此处票券已不在账本之中——可能已过期、已使用或链接失效。'
	}
	return '账本里还没有票券。先去商城兑一张吧。'
})

const qrCells = computed(() => {
	const baseText = orderDetail.value?.codeText || 'PINGYAO'
	return Array.from({ length: 144 }, (_, index) => {
		const charCode = baseText.charCodeAt(index % baseText.length)
		return { index, dark: (charCode + index * 7) % 5 < 3 }
	})
})

onLoad((options) => {
	requestedOrderId.value = options?.orderId || ''
	loadOrder()
})

onShow(() => {
	loadOrder()
})

function loadOrder() {
	if (requestedOrderId.value) {
		orderDetail.value = getRedeemOrderById(requestedOrderId.value)
		return
	}
	orderDetail.value = getRedeemOrders()[0] || null
}

function handleTicketAction(message) {
	uni.showToast({ title: message, icon: 'none' })
}

function goBack() {
	uni.navigateBack({
		fail() {
			uni.switchTab({ url: '/pages/shop/shop' })
		}
	})
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.redeem-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background: linear-gradient(180deg, #1a0d08 0%, #0a0604 100%);
	overflow: hidden;
	padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx calc(env(safe-area-inset-bottom) + 60rpx);
	box-sizing: border-box;
}

.redeem-stage__bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 20%, rgba(255, 130, 60, 0.16) 0%, transparent 40%),
		radial-gradient(ellipse at 50% 80%, rgba(196, 30, 58, 0.08) 0%, transparent 50%);
	pointer-events: none;
}

/* ===== 顶部铜钱返回 ===== */
.redeem-stage__back {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 18rpx);
	left: 28rpx;
	z-index: 10;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	transition: transform 0.18s ease;
}

.redeem-stage__back:active {
	transform: rotateY(180deg) scale(0.92);
}

.redeem-stage__back-rim {
	position: relative;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow: inset 0 0 0 2rpx rgba(255, 235, 195, 0.3), 0 6rpx 12rpx rgba(0, 0, 0, 0.55);
}

.redeem-stage__back-face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%), linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	color: $py-paper-warm;
	font-size: 28rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.redeem-stage__back-hole {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 12rpx;
	height: 12rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
	z-index: 2;
}

.redeem-stage__back-label {
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	margin-top: 2rpx;
}

/* ===== 票号凭证 ===== */
.redeem-stage__voucher {
	position: relative;
	margin: 80rpx auto 0;
	max-width: 720rpx;
	animation: scrollUnfurlV 0.6s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

/* 撕齿边 */
.redeem-stage__voucher-perf {
	position: absolute;
	left: 8rpx;
	right: 8rpx;
	height: 16rpx;
	background-image: radial-gradient(circle at 8rpx 50%, transparent 6rpx, rgba(245, 232, 208, 0.95) 6rpx);
	background-size: 16rpx 16rpx;
	background-repeat: repeat-x;
	z-index: 1;
}

.redeem-stage__voucher-perf--top { top: -8rpx; }
.redeem-stage__voucher-perf--bot { bottom: -8rpx; transform: rotate(180deg); }

.redeem-stage__voucher-paper {
	position: relative;
	padding: 50rpx 50rpx 40rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.97) 0%, rgba(232, 215, 180, 0.95) 100%);
	border: 2rpx solid rgba(110, 85, 65, 0.55);
	box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.6);
}

.redeem-stage__voucher-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.06) 0, rgba(139, 69, 19, 0.06) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.redeem-stage__voucher-paper > * {
	position: relative;
	z-index: 1;
}

/* 顶部牌匾 */
.redeem-stage__voucher-head {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.redeem-stage__voucher-eyebrow {
	font-size: 22rpx;
	letter-spacing: 12rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.redeem-stage__voucher-bar {
	width: 240rpx;
	height: 2rpx;
	margin-top: 4rpx;
	background: linear-gradient(90deg, transparent 0%, $py-red 50%, transparent 100%);
}

.redeem-stage__voucher-title {
	margin-top: 14rpx;
	font-size: 44rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 8rpx;
}

.redeem-stage__voucher-merchant {
	font-size: 22rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 4rpx;
}

/* 状态印章 */
.redeem-stage__voucher-state-stamp {
	position: absolute;
	top: 70rpx;
	right: 50rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 110rpx;
	height: 110rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 6rpx solid $py-red;
	border-radius: 50%;
	transform: rotate(-12deg);
	z-index: 3;
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.32);
}

.redeem-stage__voucher-state-stamp::before {
	content: '';
	position: absolute;
	inset: 6rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.45);
	border-radius: 50%;
}

.redeem-stage__voucher-state-stamp-inner {
	color: $py-red;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.redeem-stage__voucher-state-stamp--used .redeem-stage__voucher-state-stamp-inner,
.redeem-stage__voucher-state-stamp--used { border-color: rgba(110, 85, 65, 0.7); color: rgba(110, 85, 65, 0.9); background: rgba(110, 85, 65, 0.06); }
.redeem-stage__voucher-state-stamp--expired .redeem-stage__voucher-state-stamp-inner,
.redeem-stage__voucher-state-stamp--expired { border-color: rgba(110, 85, 65, 0.55); color: rgba(110, 85, 65, 0.8); background: rgba(110, 85, 65, 0.06); filter: grayscale(0.4); }

.redeem-stage__voucher-divider {
	margin: 24rpx 0;
	height: 1rpx;
	background: repeating-linear-gradient(90deg, rgba(110, 85, 65, 0.55) 0, rgba(110, 85, 65, 0.55) 8rpx, transparent 8rpx, transparent 14rpx);
}

/* 信息字段 */
.redeem-stage__voucher-body {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16rpx;
}

.redeem-stage__voucher-field {
	display: flex;
	align-items: baseline;
	gap: 12rpx;
	padding: 10rpx 14rpx;
	background: rgba(255, 248, 239, 0.55);
	border-left: 3rpx solid $py-red;
}

.redeem-stage__voucher-field-label {
	font-size: 18rpx;
	letter-spacing: 4rpx;
	color: rgba(110, 85, 65, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	flex-shrink: 0;
}

.redeem-stage__voucher-field-value {
	font-size: 22rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	word-break: break-all;
}

/* 中央码 */
.redeem-stage__voucher-code {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	margin: 26rpx 0;
}

.redeem-stage__voucher-code-frame {
	position: relative;
	width: 280rpx;
	height: 280rpx;
	padding: 16rpx;
	background: $py-paper-warm;
	border: 3rpx solid #4a2a18;
	box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.32);
}

.redeem-stage__voucher-code-grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	grid-template-rows: repeat(12, 1fr);
	gap: 2rpx;
	width: 100%;
	height: 100%;
}

.redeem-stage__voucher-code-cell {
	background: rgba(212, 165, 116, 0.18);
}

.redeem-stage__voucher-code-cell--dark {
	background: #1a1411;
}

.redeem-stage__voucher-code-corner {
	position: absolute;
	width: 50rpx;
	height: 50rpx;
	background: #1a1411;
}

.redeem-stage__voucher-code-corner::before {
	content: '';
	position: absolute;
	inset: 8rpx;
	background: $py-paper-warm;
}

.redeem-stage__voucher-code-corner::after {
	content: '';
	position: absolute;
	inset: 16rpx;
	background: #1a1411;
}

.redeem-stage__voucher-code-corner--tl { top: 16rpx; left: 16rpx; }
.redeem-stage__voucher-code-corner--tr { top: 16rpx; right: 16rpx; }
.redeem-stage__voucher-code-corner--bl { bottom: 16rpx; left: 16rpx; }

.redeem-stage__voucher-code-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
}

.redeem-stage__voucher-code-hint {
	font-size: 18rpx;
	letter-spacing: 4rpx;
	color: rgba(110, 85, 65, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* 商户信息 */
.redeem-stage__voucher-merchant-info {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.redeem-stage__voucher-merchant-row {
	display: flex;
	gap: 14rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.redeem-stage__voucher-merchant-label {
	font-size: 20rpx;
	letter-spacing: 4rpx;
	color: $py-red;
	flex-shrink: 0;
	width: 60rpx;
}

.redeem-stage__voucher-merchant-value {
	flex: 1;
	font-size: 22rpx;
	color: #4a2a18;
	letter-spacing: 1rpx;
	line-height: 1.7;
}

/* 提示 */
.redeem-stage__voucher-tips {
	margin-top: 18rpx;
	padding: 16rpx 18rpx;
	background: rgba(212, 165, 116, 0.18);
	border: 1rpx dashed rgba(110, 85, 65, 0.45);
	border-radius: 4rpx;
}

.redeem-stage__voucher-tips-label {
	display: block;
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.redeem-stage__voucher-tips-text {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	line-height: 1.85;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* 底部红朱印 */
.redeem-stage__voucher-seal {
	position: absolute;
	bottom: 130rpx;
	right: 50rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 120rpx;
	height: 120rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 5rpx solid $py-red;
	border-radius: 8rpx;
	transform: rotate(-8deg);
	z-index: 2;
	color: $py-red;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	text-align: center;
	line-height: 1.3;
	padding: 0 8rpx;
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.42);
}

.redeem-stage__voucher-seal::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 4rpx;
}

/* 操作按钮 */
.redeem-stage__voucher-actions {
	display: flex;
	gap: 14rpx;
	margin-top: 24rpx;
}

.redeem-stage__voucher-action {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 50%, #4a2a18 100%);
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border: 2rpx solid rgba(212, 165, 116, 0.45);
	border-radius: 4rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.45),
		0 4rpx 10rpx rgba(0, 0, 0, 0.45);
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
	transition: transform 0.18s ease;
}

.redeem-stage__voucher-action:active {
	transform: scale(0.96);
}

.redeem-stage__voucher-action--accent {
	background: linear-gradient(135deg, $py-red 0%, #8b1a2e 100%);
	border-color: rgba(255, 220, 220, 0.45);
	box-shadow: inset 0 1rpx 0 rgba(255, 220, 220, 0.45), 0 4rpx 10rpx rgba(196, 30, 58, 0.45);
}

@keyframes scrollUnfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}

@media screen and (max-width: 600px) {
	.redeem-stage__voucher-body { grid-template-columns: 1fr; }
	.redeem-stage__voucher-actions { flex-direction: column; }
	.redeem-stage__voucher-state-stamp { width: 90rpx; height: 90rpx; top: 50rpx; right: 30rpx; }
	.redeem-stage__voucher-seal { width: 90rpx; height: 90rpx; right: 30rpx; bottom: 240rpx; }
}
</style>
