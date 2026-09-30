<template>
	<div v-if="visible" class="wardrobe" :class="{ 'wardrobe--compact': compactLandscape }">
		<div class="wardrobe__dismiss-area" @click="handleClose"></div>
		<div class="wardrobe__panel" @click.stop>
			<!-- 卷轴轴头 -->
			<div class="wardrobe__roll wardrobe__roll--top"></div>
			<div class="wardrobe__roll wardrobe__roll--bot"></div>

			<div class="wardrobe__head">
				<span class="wardrobe__eyebrow">— 行 囊 · 衣 橱 —</span>
				<span class="wardrobe__title">试 新 衣</span>
				<div class="wardrobe__balance">
					<span class="wardrobe__balance-icon">钥</span>
					<span class="wardrobe__balance-num">{{ silverKey }}</span>
				</div>
			</div>

			<div data-scroll="y" class="wardrobe__scroll">
				<div class="wardrobe__grid">
					<div
						v-for="item in wardrobe"
						:key="item.id"
						class="wardrobe__card"
						:class="{
							'wardrobe__card--equipped': item.state.equipped,
							'wardrobe__card--locked': !item.state.owned
						}"
						@click="onCardTap(item)"
					>
						<!-- 化身预览与 3D 建模共用 silhouette / headwear / sleeve / pattern 参数。 -->
						<div class="wardrobe__figure" :class="'wardrobe__figure--' + (item.skin.silhouette || 'traveler')">
							<div v-if="item.skin.accent" class="wardrobe__figure-halo" :style="{ borderColor: item.skin.accent, boxShadow: '0 0 12rpx ' + item.skin.accent }"></div>
							<div class="wardrobe__figure-legs">
								<div class="wardrobe__figure-leg"></div>
								<div class="wardrobe__figure-leg"></div>
							</div>
							<div class="wardrobe__figure-arms" :class="'wardrobe__figure-arms--' + (item.skin.sleeve || 'narrow')">
								<div class="wardrobe__figure-arm" :style="garmentStyle(item, item.skin.body)"></div>
								<div class="wardrobe__figure-arm" :style="garmentStyle(item, item.skin.body)"></div>
							</div>
							<div v-if="item.skin.robe" class="wardrobe__figure-robe" :style="garmentStyle(item, item.skin.robe)"></div>
							<div class="wardrobe__figure-body" :style="garmentStyle(item, item.skin.body)">
								<div class="wardrobe__figure-collar" :style="{ borderColor: item.skin.trim || '#D2B48C' }"></div>
								<div class="wardrobe__figure-belt" :style="{ backgroundColor: item.skin.trim || '#D2B48C' }"></div>
							</div>
							<div class="wardrobe__figure-head" :style="{ backgroundColor: item.skin.head }">
								<div class="wardrobe__figure-eye wardrobe__figure-eye--l"></div>
								<div class="wardrobe__figure-eye wardrobe__figure-eye--r"></div>
							</div>
							<div class="wardrobe__figure-hair"></div>
							<div
								v-if="item.skin.headwear && item.skin.headwear !== 'hair-bun'"
								class="wardrobe__figure-hat"
								:class="'wardrobe__figure-hat--' + item.skin.headwear"
								:style="{ backgroundColor: item.skin.hat || '#30251F' }"
							></div>
							<div v-else class="wardrobe__figure-bun"></div>
							<div v-if="item.skin.accessory" class="wardrobe__figure-accessory" :style="{ borderColor: item.skin.trim || '#D2B48C' }"></div>
							<div class="wardrobe__figure-mark"><span>{{ item.mark }}</span></div>
						</div>

						<span class="wardrobe__name">{{ item.name }}</span>
						<span class="wardrobe__desc">{{ item.desc }}</span>

						<!-- 状态 / 动作 -->
						<div class="wardrobe__action">
							<div v-if="item.state.equipped" class="wardrobe__tag wardrobe__tag--on"><span>正 穿</span></div>
							<div v-else-if="item.state.owned" class="wardrobe__btn wardrobe__btn--equip"><span>换 上</span></div>
							<div
								v-else-if="item.state.canBuy"
								class="wardrobe__btn"
								:class="item.state.affordable ? 'wardrobe__btn--buy' : 'wardrobe__btn--cant'"
							>
								<span>{{ item.state.cost }} 钥 · 购</span>
							</div>
							<div v-else class="wardrobe__tag wardrobe__tag--lock"><span>{{ item.state.unlockLabel }}</span></div>
						</div>
					</div>
				</div>
			</div>

			<div class="wardrobe__close" @click="handleClose"><span>收 起 衣 橱</span></div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getWardrobe, equipCostume, purchaseCostume } from '@/common/data/costumes.js'
import { STORAGE_KEYS, getStorage } from '@/common/utils/storage.js'
import { playSFX, SFX } from '@/common/utils/audio.js'
import { showToast } from '@/platform/toast.js'

const props = defineProps({
	compactLandscape: { type: Boolean, default: false },
	visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'changed'])

const wardrobe = ref([])
const silverKey = ref(0)

function refresh() {
	wardrobe.value = getWardrobe()
	silverKey.value = Number(getStorage(STORAGE_KEYS.userProgress, {}).silverKey || 0)
}

function garmentStyle(item, color) {
	const style = { backgroundColor: color || '#8B4513' }
	if (item.skin.pattern === 'brocade') {
		style.backgroundImage = "url('/static/img/3d/pingyao-brocade-pattern.jpg')"
		style.backgroundSize = '2.4375rem 2.4375rem'
		style.backgroundBlendMode = 'multiply'
	}
	return style
}

watch(() => props.visible, (v) => {
	if (v) refresh()
}, { immediate: true })

function onCardTap(item) {
	if (item.state.equipped) return
	if (item.state.owned) {
		const res = equipCostume(item.id)
		if (res.ok) {
			playSFX(SFX.REWARD)
			showToast({ title: `已换上「${item.name}」`, icon: 'none' })
			refresh()
			emit('changed', { id: item.id, equipped: true })
		} else {
			showToast({ title: res.reason, icon: 'none' })
		}
		return
	}
	if (item.state.canBuy) {
		if (!item.state.affordable) {
			showToast({ title: `银钥不足，还差 ${item.state.cost - silverKey.value}`, icon: 'none' })
			return
		}
		const res = purchaseCostume(item.id, { equip: true })
		if (res.ok) {
			playSFX(SFX.COIN)
			showToast({ title: `已购入并换上「${item.name}」`, icon: 'none' })
			refresh()
			emit('changed', { id: item.id, equipped: true, purchased: true })
		} else {
			showToast({ title: res.reason, icon: 'none' })
		}
		return
	}
	// 锁定项：提示解锁方式
	showToast({ title: item.state.unlockLabel, icon: 'none' })
}

function handleClose() {
	emit('close')
}
</script>

<style lang="scss" scoped>.wardrobe {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(12rpx);
	animation: fadeIn 0.3s ease both;
}

.wardrobe__panel {
	position: relative;
	width: 88%;
	max-width: 720rpx;
	height: 84vh;
	max-height: 900rpx;
	display: flex;
	flex-direction: column;
	padding: 34rpx 30rpx 26rpx;
	box-sizing: border-box;
	overflow: hidden;
	background: linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(243, 233, 215, 0.97) 100%);
	border-radius: 8rpx;
	box-shadow: 0 20rpx 56rpx rgba(0, 0, 0, 0.62);
	animation: panelRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.wardrobe__dismiss-area { position: absolute; inset: 0; }

.wardrobe__roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 28rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.5);
	z-index: 2;
}
.wardrobe__roll--top { top: -14rpx; }
.wardrobe__roll--bot { bottom: -14rpx; }

.wardrobe__head {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	padding-bottom: 18rpx;
	border-bottom: 2rpx dashed rgba(110, 85, 65, 0.32);
}

.wardrobe__eyebrow {
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.wardrobe__title {
	font-size: 38rpx;
	font-weight: 700;
	color: #4a2a18;
	letter-spacing: 10rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.wardrobe__balance {
	position: absolute;
	right: 0;
	top: 4rpx;
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 4rpx 14rpx;
	background: rgba(139, 69, 19, 0.1);
	border: 1rpx solid rgba(139, 69, 19, 0.3);
	border-radius: 999rpx;
}
.wardrobe__balance-icon {
	display: flex; align-items: center; justify-content: center;
	width: 28rpx; height: 28rpx; border-radius: 50%;
	background: $py-gold; color: #4a2a18; font-size: 16rpx; font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', serif;
}
.wardrobe__balance-num { font-size: 24rpx; font-weight: 700; color: #6b3510; font-family: 'Noto Serif SC', serif; }

.wardrobe__scroll {
	flex: 1;
	min-height: 0;
	height: 1px;
	margin-top: 18rpx;
}

.wardrobe__grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 18rpx;
	padding: 4rpx;
}

.wardrobe__card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 20rpx 16rpx 16rpx;
	background: rgba(255, 250, 240, 0.7);
	border: 1rpx solid rgba(110, 85, 65, 0.26);
	border-radius: 8rpx;
	box-shadow: inset 0 1rpx 0 rgba(255, 252, 245, 0.6);
	transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.wardrobe__card:active { transform: scale(0.97); }

.wardrobe__card--equipped {
	border-color: $py-red;
	box-shadow: 0 0 0 2rpx rgba(196, 30, 58, 0.25), 0 6rpx 16rpx rgba(196, 30, 58, 0.18);
	background: rgba(255, 246, 238, 0.92);
}
.wardrobe__card--locked { opacity: 0.92; }

/* ===== 化身预览（与 3D 化身同配色逻辑）===== */
.wardrobe__figure {
	position: relative;
	width: 132rpx;
	height: 168rpx;
	filter: drop-shadow(0 7rpx 7rpx rgba(54, 32, 20, 0.25));
}
.wardrobe__figure-head {
	position: absolute;
	top: 35rpx;
	left: 45rpx;
	width: 42rpx;
	height: 46rpx;
	border-radius: 47% 47% 44% 44%;
	z-index: 5;
	box-shadow: inset -4rpx -3rpx 7rpx rgba(82, 49, 29, 0.18);
}
.wardrobe__figure-eye {
	position: absolute;
	top: 20rpx;
	width: 4rpx;
	height: 4rpx;
	border-radius: 50%;
	background: #251b17;
}
.wardrobe__figure-eye--l { left: 10rpx; }
.wardrobe__figure-eye--r { right: 10rpx; }

.wardrobe__figure-hair {
	position: absolute;
	top: 31rpx;
	left: 43rpx;
	width: 46rpx;
	height: 25rpx;
	border-radius: 48% 48% 34% 34%;
	background: #2a201c;
	z-index: 4;
}
.wardrobe__figure-bun {
	position: absolute;
	top: 23rpx;
	left: 59rpx;
	width: 17rpx;
	height: 17rpx;
	border-radius: 50%;
	background: #2a201c;
	z-index: 4;
}
.wardrobe__figure-body {
	position: absolute;
	left: 39rpx;
	top: 75rpx;
	width: 54rpx;
	height: 65rpx;
	border-radius: 15rpx 15rpx 8rpx 8rpx;
	z-index: 3;
	box-shadow: inset -6rpx -3rpx 9rpx rgba(0, 0, 0, 0.2);
	overflow: hidden;
}
.wardrobe__figure-robe {
	position: absolute;
	left: 27rpx;
	bottom: 13rpx;
	width: 78rpx;
	height: 70rpx;
	clip-path: polygon(29% 0, 71% 0, 100% 100%, 0 100%);
	z-index: 2;
	box-shadow: inset -8rpx -3rpx 10rpx rgba(0, 0, 0, 0.17);
}
.wardrobe__figure--escort .wardrobe__figure-robe,
.wardrobe__figure--traveler .wardrobe__figure-robe { width: 66rpx; left: 33rpx; height: 54rpx; }
.wardrobe__figure--festival .wardrobe__figure-robe,
.wardrobe__figure--legend .wardrobe__figure-robe { width: 90rpx; left: 21rpx; }

.wardrobe__figure-collar {
	position: absolute;
	top: 2rpx;
	left: 16rpx;
	width: 23rpx;
	height: 25rpx;
	border-left: 4rpx solid;
	border-bottom: 4rpx solid;
	transform: rotate(-43deg);
}
.wardrobe__figure-belt {
	position: absolute;
	left: 0;
	bottom: 11rpx;
	width: 100%;
	height: 6rpx;
}
.wardrobe__figure-arms {
	position: absolute;
	top: 78rpx;
	left: 27rpx;
	width: 78rpx;
	display: flex;
	justify-content: space-between;
	z-index: 2;
}
.wardrobe__figure-arm {
	width: 16rpx;
	height: 60rpx;
	border-radius: 8rpx 8rpx 12rpx 12rpx;
	box-shadow: inset -3rpx -2rpx 5rpx rgba(0, 0, 0, 0.18);
}
.wardrobe__figure-arm:first-child { transform: rotate(7deg); }
.wardrobe__figure-arm:last-child { transform: rotate(-7deg); }
.wardrobe__figure-arms--wide { left: 20rpx; width: 92rpx; }
.wardrobe__figure-arms--wide .wardrobe__figure-arm { width: 23rpx; }
.wardrobe__figure-arms--ceremonial { left: 14rpx; width: 104rpx; }
.wardrobe__figure-arms--ceremonial .wardrobe__figure-arm { width: 28rpx; height: 66rpx; }
.wardrobe__figure-arms--braced .wardrobe__figure-arm { border-bottom: 12rpx solid #2a211d; }

.wardrobe__figure-legs {
	position: absolute;
	left: 45rpx;
	bottom: 4rpx;
	width: 42rpx;
	display: flex;
	justify-content: space-between;
	z-index: 1;
}
.wardrobe__figure-leg {
	width: 15rpx;
	height: 38rpx;
	border-radius: 5rpx 5rpx 8rpx 8rpx;
	background: #29241f;
}
.wardrobe__figure-hat {
	position: absolute;
	top: 23rpx;
	left: 43rpx;
	width: 46rpx;
	height: 24rpx;
	border-radius: 48% 48% 7rpx 7rpx;
	z-index: 6;
	box-shadow: inset -4rpx -3rpx 6rpx rgba(0, 0, 0, 0.3);
}
.wardrobe__figure-hat--scholar-scarf { left: 38rpx; width: 56rpx; height: 20rpx; border-radius: 3rpx; }
.wardrobe__figure-hat--guard-cap { top: 20rpx; left: 36rpx; width: 60rpx; height: 19rpx; border-radius: 50% 50% 4rpx 4rpx; }
.wardrobe__figure-hat--merchant-cap,
.wardrobe__figure-hat--festival-cap { top: 19rpx; left: 44rpx; width: 44rpx; height: 28rpx; }
.wardrobe__figure-hat--merchant-crown { top: 12rpx; left: 46rpx; width: 40rpx; height: 36rpx; border-radius: 5rpx 5rpx 12rpx 12rpx; }
.wardrobe__figure-accessory {
	position: absolute;
	top: 105rpx;
	left: 60rpx;
	width: 12rpx;
	height: 17rpx;
	border: 3rpx solid;
	border-radius: 50%;
	z-index: 5;
}
.wardrobe__figure-halo {
	position: absolute;
	left: 24rpx;
	bottom: 0;
	width: 84rpx;
	height: 21rpx;
	border-radius: 50%;
	border: 3rpx solid;
	z-index: 0;
}
.wardrobe__figure-mark {
	position: absolute;
	right: 2rpx; top: 2rpx;
	display: flex; align-items: center; justify-content: center;
	width: 30rpx; height: 30rpx;
	background: $py-red; color: $py-paper-warm;
	font-size: 18rpx; font-weight: 700; border-radius: 4rpx;
	transform: rotate(-6deg);
	font-family: 'KaiTi', 'STKaiti', serif;
	box-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.4);
	z-index: 4;
}

.wardrobe__name {
	font-size: 24rpx;
	font-weight: 700;
	color: #4a2a18;
	letter-spacing: 2rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}
.wardrobe__desc {
	font-size: 17rpx;
	line-height: 1.5;
	color: rgba(110, 85, 65, 0.85);
	text-align: center;
	min-height: 52rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.wardrobe__action { margin-top: 2rpx; }

.wardrobe__btn {
	padding: 8rpx 26rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	letter-spacing: 3rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: $py-paper-warm;
}
.wardrobe__btn--equip { background: linear-gradient(135deg, #6b3510, $py-bronze); box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.35); }
.wardrobe__btn--buy { background: linear-gradient(135deg, #6b1622, $py-red); box-shadow: 0 3rpx 8rpx rgba(196, 30, 58, 0.35); }
.wardrobe__btn--cant { background: rgba(110, 85, 65, 0.4); }

.wardrobe__tag {
	padding: 6rpx 18rpx;
	border-radius: 999rpx;
	font-size: 19rpx;
	letter-spacing: 3rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}
.wardrobe__tag--on { background: rgba(196, 30, 58, 0.1); color: $py-red; font-weight: 700; border: 1rpx solid rgba(196, 30, 58, 0.4); }
.wardrobe__tag--lock { background: rgba(110, 85, 65, 0.1); color: rgba(110, 85, 65, 0.8); border: 1rpx dashed rgba(110, 85, 65, 0.4); }

.wardrobe__close {
	margin-top: 18rpx;
	padding-top: 16rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.32);
	text-align: center;
	font-size: 22rpx;
	letter-spacing: 6rpx;
	color: rgba(110, 85, 65, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes panelRise {
	0% { transform: translateY(40rpx) scale(0.96); opacity: 0; }
	100% { transform: translateY(0) scale(1); opacity: 1; }
}

@media screen and (orientation: landscape) and (max-height: 520px) {
	.wardrobe__panel {
		width: min(760px, calc(100vw - 32px));
		max-width: none;
		height: calc(100vh - 24px);
		max-height: none;
		padding: 14px 18px 10px;
	}
	.wardrobe__head { gap: 1px; padding-bottom: 8px; }
	.wardrobe__eyebrow { font-size: 9px; letter-spacing: 4px; }
	.wardrobe__title { font-size: 19px; letter-spacing: 5px; }
	.wardrobe__balance { top: 1px; gap: 4px; padding: 2px 8px; }
	.wardrobe__balance-icon { width: 18px; height: 18px; font-size: 9px; }
	.wardrobe__balance-num { font-size: 12px; }
	.wardrobe__scroll { margin-top: 8px; }
	.wardrobe__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 2px; }
	.wardrobe__card { gap: 4px; padding: 8px 7px 7px; }
	.wardrobe__figure { width: 74px; height: 94px; transform: scale(0.72); margin: -12px 0 -10px; }
	.wardrobe__name { font-size: 12px; letter-spacing: 1px; }
	.wardrobe__desc { min-height: 30px; font-size: 9px; line-height: 1.35; }
	.wardrobe__btn { padding: 4px 12px; font-size: 10px; letter-spacing: 1px; }
	.wardrobe__tag { padding: 3px 8px; font-size: 9px; letter-spacing: 1px; }
	.wardrobe__close { margin-top: 7px; padding-top: 7px; font-size: 11px; letter-spacing: 3px; }
}
@media (orientation: landscape) and (max-height: 600px) {
	.wardrobe--compact {
		padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(var(--tab-reserve, 0px) + max(8px, env(safe-area-inset-bottom))) max(12px, env(safe-area-inset-left));
		box-sizing: border-box;
		.wardrobe__panel { width: 100%; max-width: 900px; height: 100%; max-height: none; padding: 8px 16px; animation: none; }
		.wardrobe__head { flex-direction: row; justify-content: center; min-height: 36px; padding: 0 72px 6px; gap: 12px; }
		.wardrobe__eyebrow { font-size: 11px; letter-spacing: 0; }
		.wardrobe__title { font-size: 18px; letter-spacing: 0; }
		.wardrobe__balance { padding: 4px 8px; top: 2px; }
		.wardrobe__balance-icon, .wardrobe__balance-num { font-size: 13px; }
		.wardrobe__scroll { min-height: 0; height: 0; flex: 1; margin: 6px 0; }
		.wardrobe__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 0; }
		.wardrobe__card { padding: 8px; gap: 4px; min-width: 0; }
		.wardrobe__figure { width: 132rpx; height: 168rpx; flex-shrink: 0; transform: scale(0.6); transform-origin: center; margin: -33.6rpx -26.4rpx; }
		.wardrobe__name { font-size: 14px; letter-spacing: 0; }
		.wardrobe__desc { font-size: 11px; letter-spacing: 0; }
		.wardrobe__action { margin-top: 4px; }
		.wardrobe__btn, .wardrobe__tag { min-height: 44px; padding: 4px 8px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: 13px; letter-spacing: 0; }
		.wardrobe__close { min-height: 44px; padding: 0; flex-shrink: 0; font-size: 14px; letter-spacing: 0; }
	}
}
@media (min-width: 1000px) and (min-height: 560px) {
	.wardrobe__panel { width: 860px; max-width: 88vw; max-height: 84vh; padding: 26px 32px; }
	.wardrobe__head { padding-bottom: 14px; }
	.wardrobe__title { font-size: 28px; }
	.wardrobe__scroll { height: 52vh; }
	.wardrobe__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
	.wardrobe__card { padding: 18px; cursor: pointer; }
	.wardrobe__name { font-size: 17px; }
	.wardrobe__desc { font-size: 13px; line-height: 1.7; }
	.wardrobe__btn, .wardrobe__tag { font-size: 13px; min-height: 38px; display: flex; align-items: center; }
	.wardrobe__close { font-size: 16px; padding-top: 18px; cursor: pointer; }
}
</style>
