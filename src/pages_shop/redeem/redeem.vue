<template>
	<div class="redeem-stage">
		<!-- 暗夜背景 -->
		<div class="redeem-stage__bg"></div>
		<div class="redeem-stage__bg-glow"></div>

		<!-- 飘动萤火 -->
		<FallingLeaves type="firefly" :density="8" />

		<!-- 顶部铜钱返回 -->
		<div class="redeem-stage__back" @click="goBack">
			<div class="redeem-stage__back-rim"></div>
			<div class="redeem-stage__back-face">
				<span>返</span>
			</div>
			<div class="redeem-stage__back-hole"></div>
			<span class="redeem-stage__back-label">{{ requestedOrderId ? '回 票 券' : '返 回' }}</span>
		</div>

		<!-- 出票柜门头（呼应商城瑞蚨祥门头，衔接出票流程）-->
		<div v-if="orderDetail" class="redeem-stage__counter">
			<div class="redeem-stage__counter-beam"></div>
			<div class="redeem-stage__counter-plaque">
				<div class="redeem-stage__counter-plaque-ribbon"></div>
				<span class="redeem-stage__counter-plaque-text">瑞 蚨 祥 ·  出 票 柜</span>
			</div>
			<span class="redeem-stage__counter-sub">— 票号出票 · {{ orderDetail.currencyLabel }}已收讫 —</span>
		</div>

		<!-- 主体：老票号凭证 -->
		<div v-if="orderDetail" class="redeem-stage__voucher">
			<!-- 撕齿边 -->
			<div class="redeem-stage__voucher-perf redeem-stage__voucher-perf--top"></div>
			<div class="redeem-stage__voucher-perf redeem-stage__voucher-perf--bot"></div>

			<!-- 掌柜小鸦递票（衔接商城掌柜角色）-->
			<div class="redeem-stage__keeper">
				<div class="redeem-stage__keeper-aura"></div>
				<img class="redeem-stage__keeper-img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
				<div class="redeem-stage__keeper-bubble">
					<div class="redeem-stage__keeper-bubble-arrow"></div>
					<span class="redeem-stage__keeper-bubble-name">— 掌柜小鸦 —</span>
					<span class="redeem-stage__keeper-bubble-line">{{ keeperLine }}</span>
				</div>
			</div>

			<div class="redeem-stage__voucher-paper">
				<div class="redeem-stage__voucher-fiber"></div>

				<!-- 顶部牌匾 -->
				<div class="redeem-stage__voucher-head">
					<div class="redeem-stage__voucher-cat">
						<span>{{ categoryGlyph }}</span>
					</div>
					<span class="redeem-stage__voucher-eyebrow">— 平 遥 票 号 凭 证 —</span>
					<div class="redeem-stage__voucher-bar"></div>
					<span class="redeem-stage__voucher-title">{{ orderDetail.itemName }}</span>
					<span class="redeem-stage__voucher-merchant">{{ orderDetail.merchantName }}</span>
				</div>

				<!-- 红印章状态 -->
				<div class="redeem-stage__voucher-state-stamp" :class="`redeem-stage__voucher-state-stamp--${orderStatus.key}`">
					<div class="redeem-stage__voucher-state-stamp-inner">
						<span>{{ orderStatus.text }}</span>
					</div>
				</div>

				<div class="redeem-stage__voucher-divider"></div>

				<!-- 主信息 -->
				<div class="redeem-stage__voucher-body">
					<div class="redeem-stage__voucher-field">
						<span class="redeem-stage__voucher-field-label">订 单</span>
						<span class="redeem-stage__voucher-field-value">{{ orderDetail.orderId }}</span>
					</div>
					<div class="redeem-stage__voucher-field">
						<span class="redeem-stage__voucher-field-label">兑 时</span>
						<span class="redeem-stage__voucher-field-value">{{ orderDetail.exchangeAt }}</span>
					</div>
					<div class="redeem-stage__voucher-field">
						<span class="redeem-stage__voucher-field-label">效 期</span>
						<span class="redeem-stage__voucher-field-value">{{ orderDetail.expireAt }}</span>
					</div>
					<div class="redeem-stage__voucher-field">
						<span class="redeem-stage__voucher-field-label">{{ orderDetail.currencyLabel }}</span>
						<span class="redeem-stage__voucher-field-value">{{ orderDetail.price }} {{ orderDetail.currencyLabel }}</span>
					</div>
				</div>

				<!-- 中央码 -->
				<div class="redeem-stage__voucher-code">
					<div class="redeem-stage__voucher-code-frame">
						<div class="redeem-stage__voucher-code-grid">
							<div
								v-for="cell in qrCells"
								:key="cell.index"
								class="redeem-stage__voucher-code-cell"
								:class="{ 'redeem-stage__voucher-code-cell--dark': cell.dark }"
							></div>
						</div>
						<!-- 四角定位印章 -->
						<div class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--tl"></div>
						<div class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--tr"></div>
						<div class="redeem-stage__voucher-code-corner redeem-stage__voucher-code-corner--bl"></div>
					</div>
					<span class="redeem-stage__voucher-code-text">{{ orderDetail.codeText }}</span>
					<span class="redeem-stage__voucher-code-hint">— 演示凭证 · 线下核销尚未接入 —</span>
				</div>

				<div class="redeem-stage__voucher-divider"></div>

				<!-- 商户信息 -->
				<div class="redeem-stage__voucher-merchant-info">
					<div class="redeem-stage__voucher-merchant-row">
						<span class="redeem-stage__voucher-merchant-label">铺 址</span>
						<span class="redeem-stage__voucher-merchant-value">{{ orderDetail.address }}</span>
					</div>
					<div class="redeem-stage__voucher-merchant-row">
						<span class="redeem-stage__voucher-merchant-label">营 时</span>
						<span class="redeem-stage__voucher-merchant-value">{{ orderDetail.businessHours }}</span>
					</div>
					<div class="redeem-stage__voucher-merchant-row">
						<span class="redeem-stage__voucher-merchant-label">联 系</span>
						<a v-if="merchantTel" class="redeem-stage__voucher-merchant-value" :href="merchantTel">{{ orderDetail.merchantPhone }}</a>
						<span v-else class="redeem-stage__voucher-merchant-value">{{ orderDetail.merchantPhone }}</span>
					</div>
				</div>

				<!-- 提示卷边 -->
				<div class="redeem-stage__voucher-tips">
					<span class="redeem-stage__voucher-tips-label">— 掌柜叮咛 —</span>
					<span class="redeem-stage__voucher-tips-text">{{ orderDetail.redeemTip }}</span>
				</div>

				<!-- 底部红朱印（落款）-->
				<div class="redeem-stage__voucher-seal">
					<span>瑞蚨祥晋商印鉴</span>
				</div>

				<!-- 操作按钮 -->
				<div class="redeem-stage__voucher-actions">
					<div
						class="redeem-stage__voucher-action"
						:class="{ 'redeem-stage__voucher-action--done': orderStatus.key !== 'unused' }"
						@click="markUsed"
					>
						<span>{{ orderStatus.key === 'used' ? '已 核 销' : orderStatus.key === 'expired' ? '已 过 期' : '模 拟 核 销' }}</span>
					</div>
					<div class="redeem-stage__voucher-action redeem-stage__voucher-action--accent" @click="goMerchant">
						<span>前往商户</span>
					</div>
					<a v-if="merchantTel" class="redeem-stage__voucher-action" :href="merchantTel">
						<span>联系商户</span>
					</a>
					<button v-else class="redeem-stage__voucher-action" @click="contactMerchant">联系商户</button>
				</div>
			</div>
		</div>

		<section v-if="!requestedOrderId && orders.length" class="ticket-list">
			<h1>我的票券</h1>
			<button v-for="order in orderRows" :key="order.orderId" @click="redirectTo({ url: '/redeem?orderId=' + encodeURIComponent(order.orderId) })">
				<span>{{ order.itemName }}</span>
				<span>{{ order.statusText }} · {{ order.price }} {{ order.currencyLabel }}</span>
			</button>
		</section>
		<!-- 空状态 -->
		<EmptyOwl
			v-if="!orderDetail && (requestedOrderId || !orders.length)"
			:text="emptyText"
			cta-text="回到商城 ›"
			@action="switchTab('/shop')"
		/>
	</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FallingLeaves from '@/components/FallingLeaves.vue'
import EmptyOwl from '@/components/EmptyOwl.vue'
import { getOrderStatus, getRedeemOrderById, getRedeemOrders, updateRedeemOrderStatus } from '@/common/data/shop-items.js'
import { playSFX, SFX } from '@/common/utils/audio.js'
import { onPageShow, onPageHide } from '@/platform/lifecycle.js'
import { showToast } from '@/platform/toast.js'
import { showModal } from '@/platform/modal.js'
import { switchTab, navigateBack, redirectTo } from '@/platform/navigation.js'

defineOptions({ name: 'RedeemPage' })

const orderDetail = ref(null)
const requestedOrderId = ref('')
const orders = ref([])
const now = ref(Date.now())
let statusTimer = null
const route = useRoute()

const orderStatus = computed(() => {
	now.value
	return getOrderStatus(orderDetail.value)
})
const orderRows = computed(() => {
	now.value
	return orders.value.map((order) => ({ ...order, statusText: getOrderStatus(order).text }))
})
const merchantTel = computed(() => {
	const phone = String(orderDetail.value?.merchantPhone || '').trim()
	return /^\+?[\d\s()-]+$/.test(phone) && phone.replace(/\D/g, '').length >= 5
		? `tel:${phone.replace(/[\s()-]/g, '')}` : ''
})
const emptyText = computed(() => {
	if (requestedOrderId.value) {
		return '未找到这张票券，可能已重置行旅或链接失效。'
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

// 品类小印（与商城器型语义一致：食 / 物 / 游），纯展示用
const categoryGlyph = computed(() => {
	const map = { food: '食', cultural: '物', experience: '游' }
	return map[orderDetail.value?.category] || '宝'
})

// 掌柜递票的氛围话，随凭证状态略有不同（不改变任何业务逻辑）
const keeperLine = computed(() => {
	const key = orderStatus.value.key
	if (key === 'used') return '此票已核销，路引仍记在账本里。'
	if (key === 'expired') return '票子过了效期，下回早些来兑。'
	return '票已出讫，收好路引。此为演示凭证，暂不支持线下核销。'
})

watch(() => route.query.orderId, (orderId) => {
	requestedOrderId.value = typeof orderId === 'string' ? orderId : ''
	loadOrder()
}, { immediate: true })

onPageShow(() => {
	loadOrder()
	clearInterval(statusTimer)
	statusTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onPageHide(() => { clearInterval(statusTimer); statusTimer = null })

function loadOrder() {
	now.value = Date.now()
	orders.value = getRedeemOrders()
	if (requestedOrderId.value) {
		orderDetail.value = getRedeemOrderById(requestedOrderId.value)
		return
	}
	orderDetail.value = null
}

/* 在店核销：把凭证状态 unused → used，完成订单生命周期；已核销/过期则提示，不重复操作。 */
function markUsed() {
	loadOrder()
	if (!orderDetail.value) return
	if (orderStatus.value.key !== 'unused') {
		showToast({ title: orderStatus.value.key === 'used' ? '此票已核销' : '此票已过期', icon: 'none' })
		return
	}
	showModal({
		title: '模拟核销',
		content: '线下核销尚未接入。确认将此演示凭证标记为「已核销」？',
		success: (res) => {
			if (!res.confirm) return
			const ok = updateRedeemOrderStatus(orderDetail.value.orderId, 'used')
			if (ok) {
				playSFX(SFX.COIN)
				loadOrder()
				showToast({ title: '已核销 · 路引仍记在账本', icon: 'none' })
			} else {
				loadOrder()
				showToast({ title: orderStatus.value.key === 'expired' ? '此票已过期' : '核销失败，请重试', icon: 'none' })
			}
		}
	})
}

/* 前往商户：把铺名+铺址复制到剪贴板，便于粘贴进地图导航（无内置地图依赖）。 */
async function goMerchant() {
	if (!orderDetail.value) return
	const text = `${orderDetail.value.merchantName} · ${orderDetail.value.address || ''}`
	let copied = false
	try {
		await navigator.clipboard.writeText(text)
		copied = true
	} catch { /* 浏览器拒绝剪贴板授权时尝试选中文本复制。 */ }
	if (!copied) {
		const input = document.createElement('textarea')
		const previousFocus = document.activeElement
		input.value = text
		input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none'
		document.body.appendChild(input)
		try {
			input.focus()
			input.select()
			copied = document.execCommand('copy')
		} catch { /* 手动复制面板仍可使用。 */ }
		finally { input.remove(); previousFocus?.focus?.() }
	}
	if (copied) showToast({ title: '铺址已复制，可粘贴到地图导航' })
	else showModal({ title: '请长按或选中复制铺址', content: text, editable: true, maxLength: Math.max(140, text.length), showCancel: false, confirmText: '知道了' })
}

function contactMerchant() {
	const phone = orderDetail.value?.merchantPhone || ''
	showModal({ title: '联系商户', content: phone || '商户暂未登记电话', showCancel: false, confirmText: '知道了' })
}

function goBack() {
	if (requestedOrderId.value) return redirectTo('/redeem')
	navigateBack({
		fail() {
			switchTab({ url: '/shop' })
		}
	})
}
</script>

<style lang="scss" scoped>
.ticket-list { position: relative; z-index: 4; max-width: 760px; margin: 80px auto 24px; padding: 20px; background: $py-paper; color: #8b4513; }
.ticket-list button { width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 18px 8px; border-bottom: 1px solid #d4a574; color: #8b4513; font-size: 16px; text-align: left; }
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

/* 顶部暖光（与商城门头 bg-glow 一致，强化页面衔接）*/
.redeem-stage__bg-glow {
	position: absolute;
	inset: 0;
	background: radial-gradient(ellipse at 50% 0%, rgba(255, 130, 60, 0.28) 0%, transparent 38%);
	pointer-events: none;
}

/* ===== 出票柜门头（呼应商城瑞蚨祥门头）===== */
.redeem-stage__counter {
	position: relative;
	z-index: 4;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
	margin-top: 18rpx;
	animation: fadeInDown 0.55s ease both;
}

.redeem-stage__counter-beam {
	position: absolute;
	left: -32rpx;
	right: -32rpx;
	top: -8rpx;
	height: 20rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 55%, #2a1810 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 64rpx);
	background-blend-mode: multiply;
	border-bottom: 2rpx solid rgba(0, 0, 0, 0.5);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

.redeem-stage__counter-plaque {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 14rpx;
	padding: 10rpx 44rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 28rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 8rpx;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.5),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
}

.redeem-stage__counter-plaque::before,
.redeem-stage__counter-plaque::after {
	content: '';
	position: absolute;
	top: -9rpx;
	width: 26rpx;
	height: 16rpx;
	background: #2a1810;
	border-radius: 4rpx 4rpx 0 0;
}

.redeem-stage__counter-plaque::before { left: 16rpx; transform: skewX(-20deg); }
.redeem-stage__counter-plaque::after  { right: 16rpx; transform: skewX(20deg); }

.redeem-stage__counter-plaque-text {
	position: relative;
	z-index: 1;
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
}

.redeem-stage__counter-plaque-ribbon {
	position: absolute;
	top: -20rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 40rpx;
	height: 24rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
}

.redeem-stage__counter-sub {
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

@keyframes fadeInDown {
	0%   { opacity: 0; transform: translateY(-16rpx); }
	100% { opacity: 1; transform: translateY(0); }
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
	margin: 40rpx auto 0;
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

/* ===== 掌柜小鸦递票（衔接商城掌柜角色）===== */
.redeem-stage__keeper {
	position: absolute;
	top: -68rpx;
	right: 12rpx;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: none;
}

.redeem-stage__keeper-aura {
	position: absolute;
	left: 50%;
	bottom: -8rpx;
	width: 96rpx;
	height: 20rpx;
	transform: translateX(-50%);
	background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 100, 0.4) 0%, transparent 70%);
	animation: keeperBreath 2.6s ease-in-out infinite;
}

@keyframes keeperBreath {
	0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
	50%      { opacity: 0.9; transform: translateX(-50%) scale(1.15); }
}

.redeem-stage__keeper-img {
	width: 96rpx;
	height: 118rpx;
	animation: keeperFloat 3.4s ease-in-out infinite;
	filter: drop-shadow(0 6rpx 18rpx rgba(0, 0, 0, 0.55));
}

@keyframes keeperFloat {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-8rpx); }
}

.redeem-stage__keeper-bubble {
	position: absolute;
	right: 100rpx;
	top: 8rpx;
	z-index: 6;
	width: 280rpx;
	padding: 12rpx 16rpx;
	background: rgba(255, 248, 239, 0.96);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 18rpx 4rpx 18rpx 18rpx;
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.45);
	pointer-events: auto;
	animation: keeperBubbleIn 0.4s cubic-bezier(0.2, 0.8, 0.4, 1) 0.3s both;
}

.redeem-stage__keeper-bubble-arrow {
	position: absolute;
	right: -10rpx;
	top: 18rpx;
	width: 0;
	height: 0;
	border-top: 8rpx solid transparent;
	border-bottom: 8rpx solid transparent;
	border-left: 12rpx solid rgba(255, 248, 239, 0.96);
}

@keyframes keeperBubbleIn {
	0%   { transform: translateX(20rpx); opacity: 0; }
	100% { transform: translateX(0); opacity: 1; }
}

.redeem-stage__keeper-bubble-name {
	display: block;
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.redeem-stage__keeper-bubble-line {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	line-height: 1.6;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

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
.redeem-stage__voucher-paper > .redeem-stage__voucher-fiber {
	position: absolute;
	z-index: 0;
}

/* 顶部牌匾 */
.redeem-stage__voucher-head {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

/* 品类小印（呼应商城器型语义：食 / 物 / 游）*/
.redeem-stage__voucher-cat {
	position: absolute;
	top: -8rpx;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 3rpx solid $py-red;
	border-radius: 6rpx;
	transform: rotate(-8deg);
	color: $py-red;
	font-size: 30rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.28);
}

.redeem-stage__voucher-cat::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 3rpx;
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
	animation: stampDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both;
}

/* 盖章落定：从上方放大砸下，终态保留 -12deg 旋转 */
@keyframes stampDrop {
	0%   { opacity: 0; transform: rotate(-12deg) scale(2.4); }
	60%  { opacity: 1; transform: rotate(-12deg) scale(0.92); }
	100% { opacity: 1; transform: rotate(-12deg) scale(1); }
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
	min-width: 44px;
	white-space: nowrap;
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
	min-height: 44px;
	text-decoration: none;
	cursor: pointer;
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

/* 已核销 / 已过期：灰化，提示不可再核销 */
.redeem-stage__voucher-action--done {
	background: linear-gradient(135deg, #4a3a2a 0%, #3d2f22 100%);
	color: rgba(245, 240, 232, 0.5);
	border-color: rgba(212, 165, 116, 0.18);
	box-shadow: inset 0 2rpx 6rpx rgba(0, 0, 0, 0.45);
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
	.redeem-stage__voucher-seal { display: none; }
	.redeem-stage__keeper { top: -56rpx; right: 6rpx; }
	.redeem-stage__keeper-img { width: 80rpx; height: 100rpx; }
	.redeem-stage__keeper-bubble { width: 240rpx; right: 84rpx; }
	.redeem-stage__voucher-cat { width: 48rpx; height: 48rpx; font-size: 26rpx; }
	.redeem-stage__counter-plaque { font-size: 24rpx; letter-spacing: 6rpx; padding: 8rpx 32rpx; }
}
@media (orientation: landscape) and (max-height: 600px) {
	.redeem-stage { min-height: 100vh; min-height: 100dvh; padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); width: 100%; box-sizing: border-box; font-size: 14px; }
	.redeem-stage [class] { letter-spacing: 0; }
	.redeem-stage__back { position: fixed; top: max(8px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left)); min-width: 44px; min-height: 44px; }
	.redeem-stage__back-rim { width: 40px; height: 40px; }
	.redeem-stage__back-face { width: 30px; height: 30px; top: 5px; font-size: 18px; }
	.redeem-stage__back-hole { display: none; }
	.redeem-stage__back-label { font-size: 10px; }
	.redeem-stage__counter { padding: 0 60px; margin: 0 0 12px; }
	.redeem-stage__counter-plaque { padding: 5px 20px; margin: 0; }
	.redeem-stage__counter-plaque-text { font-size: 18px; }
	.redeem-stage__counter-sub { font-size: 10px; }
	.redeem-stage__voucher { margin: 0 48px; }
	.redeem-stage__keeper { display: none; }
	.redeem-stage__voucher-paper { display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 10px 16px; padding: 14px 18px; }
	.redeem-stage__voucher-head { grid-column: 1; padding: 0; margin: 0; align-items: flex-start; }
	.redeem-stage__voucher-title { font-size: 20px; }
	.redeem-stage__voucher-eyebrow, .redeem-stage__voucher-merchant { font-size: 11px; }
	.redeem-stage__voucher-cat, .redeem-stage__voucher-bar, .redeem-stage__voucher-divider, .redeem-stage__voucher-seal { display: none; }
	.redeem-stage__voucher-state-stamp { position: static; grid-column: 2; grid-row: 1; width: auto; height: auto; justify-self: center; }
	.redeem-stage__voucher-state-stamp-inner { width: auto; height: auto; padding: 4px 10px; font-size: 14px; }
	.redeem-stage__voucher-body { grid-column: 1; margin: 0; padding: 0; }
	.redeem-stage__voucher-field { padding: 4px 0; gap: 8px; }
	.redeem-stage__voucher-field-label, .redeem-stage__voucher-field-value { font-size: 12px; overflow-wrap: anywhere; }
	.redeem-stage__voucher-code { grid-column: 2; grid-row: 2 / 4; margin: 0; padding: 0; }
	.redeem-stage__voucher-code-frame { width: 112px; height: 112px; padding: 7px; }
	.redeem-stage__voucher-code-text { font-size: 14px; }
	.redeem-stage__voucher-code-hint { font-size: 10px; }
	.redeem-stage__voucher-merchant-info { grid-column: 1; padding: 0; margin: 0; }
	.redeem-stage__voucher-merchant-row { gap: 8px; margin-top: 4px; }
	.redeem-stage__voucher-merchant-label, .redeem-stage__voucher-merchant-value { font-size: 12px; }
	.redeem-stage__voucher-tips { grid-column: 1 / -1; padding: 6px 10px; margin: 0; }
	.redeem-stage__voucher-tips-label { font-size: 10px; }
	.redeem-stage__voucher-tips-text { font-size: 12px; }
	.redeem-stage__voucher-actions { grid-column: 1 / -1; position: sticky; bottom: 0; margin: 0; gap: 8px; background: $py-paper; }
	.redeem-stage__voucher-action { height: 44px; min-height: 44px; padding: 4px 10px; font-size: 13px; box-sizing: border-box; }
}
</style>
