<template>
	<view v-if="visible" class="wardrobe" @tap="handleClose">
		<view class="wardrobe__panel" @tap.stop>
			<!-- 卷轴轴头 -->
			<view class="wardrobe__roll wardrobe__roll--top"></view>
			<view class="wardrobe__roll wardrobe__roll--bot"></view>

			<view class="wardrobe__head">
				<text class="wardrobe__eyebrow">— 行 囊 · 衣 橱 —</text>
				<text class="wardrobe__title">试 新 衣</text>
				<view class="wardrobe__balance">
					<text class="wardrobe__balance-icon">钥</text>
					<text class="wardrobe__balance-num">{{ silverKey }}</text>
				</view>
			</view>

			<scroll-view scroll-y class="wardrobe__scroll">
				<view class="wardrobe__grid">
					<view
						v-for="item in wardrobe"
						:key="item.id"
						class="wardrobe__card"
						:class="{
							'wardrobe__card--equipped': item.state.equipped,
							'wardrobe__card--locked': !item.state.owned
						}"
						@tap="onCardTap(item)"
					>
						<!-- 化身预览（与 3D 化身同配色）-->
						<view class="wardrobe__figure">
							<view v-if="item.skin.hat" class="wardrobe__figure-hat" :style="{ background: item.skin.hat }"></view>
							<view class="wardrobe__figure-head" :style="{ background: item.skin.head }"></view>
							<view class="wardrobe__figure-body" :style="{ background: item.skin.body }"></view>
							<view v-if="item.skin.robe" class="wardrobe__figure-robe" :style="{ background: item.skin.robe }"></view>
							<view v-if="item.skin.accent" class="wardrobe__figure-halo" :style="{ borderColor: item.skin.accent, boxShadow: '0 0 12rpx ' + item.skin.accent }"></view>
							<view class="wardrobe__figure-mark"><text>{{ item.mark }}</text></view>
						</view>

						<text class="wardrobe__name">{{ item.name }}</text>
						<text class="wardrobe__desc">{{ item.desc }}</text>

						<!-- 状态 / 动作 -->
						<view class="wardrobe__action">
							<view v-if="item.state.equipped" class="wardrobe__tag wardrobe__tag--on"><text>正 穿</text></view>
							<view v-else-if="item.state.owned" class="wardrobe__btn wardrobe__btn--equip"><text>换 上</text></view>
							<view
								v-else-if="item.state.canBuy"
								class="wardrobe__btn"
								:class="item.state.affordable ? 'wardrobe__btn--buy' : 'wardrobe__btn--cant'"
							>
								<text>{{ item.state.cost }} 钥 · 购</text>
							</view>
							<view v-else class="wardrobe__tag wardrobe__tag--lock"><text>{{ item.state.unlockLabel }}</text></view>
						</view>
					</view>
				</view>
			</scroll-view>

			<view class="wardrobe__close" @tap="handleClose"><text>收 起 衣 橱</text></view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getWardrobe, equipCostume, purchaseCostume } from '@/common/data/costumes.js'
import { STORAGE_KEYS, getStorage } from '@/common/utils/storage.js'
import { playSFX, SFX } from '@/common/utils/audio.js'

const props = defineProps({
	visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'changed'])

const wardrobe = ref([])
const silverKey = ref(0)

function refresh() {
	wardrobe.value = getWardrobe()
	silverKey.value = Number(getStorage(STORAGE_KEYS.userProgress, {}).silverKey || 0)
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
			uni.showToast({ title: `已换上「${item.name}」`, icon: 'none' })
			refresh()
			emit('changed', { id: item.id, equipped: true })
		} else {
			uni.showToast({ title: res.reason, icon: 'none' })
		}
		return
	}
	if (item.state.canBuy) {
		if (!item.state.affordable) {
			uni.showToast({ title: `银钥不足，还差 ${item.state.cost - silverKey.value}`, icon: 'none' })
			return
		}
		const res = purchaseCostume(item.id, { equip: true })
		if (res.ok) {
			playSFX(SFX.COIN)
			uni.showToast({ title: `已购入并换上「${item.name}」`, icon: 'none' })
			refresh()
			emit('changed', { id: item.id, equipped: true, purchased: true })
		} else {
			uni.showToast({ title: res.reason, icon: 'none' })
		}
		return
	}
	// 锁定项：提示解锁方式
	uni.showToast({ title: item.state.unlockLabel, icon: 'none' })
}

function handleClose() {
	emit('close')
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.wardrobe {
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
	max-height: 84vh;
	display: flex;
	flex-direction: column;
	padding: 34rpx 30rpx 26rpx;
	background: linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(243, 233, 215, 0.97) 100%);
	border-radius: 8rpx;
	box-shadow: 0 20rpx 56rpx rgba(0, 0, 0, 0.62);
	animation: panelRise 0.5s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

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
	width: 120rpx;
	height: 150rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
}
.wardrobe__figure-hat {
	position: absolute;
	top: 6rpx;
	width: 44rpx; height: 22rpx;
	border-radius: 40rpx 40rpx 6rpx 6rpx;
	z-index: 3;
	box-shadow: inset -3rpx -3rpx 5rpx rgba(0, 0, 0, 0.3);
}
.wardrobe__figure-head {
	width: 40rpx; height: 40rpx;
	border-radius: 50%;
	margin-bottom: -6rpx;
	z-index: 2;
	box-shadow: inset -3rpx -3rpx 6rpx rgba(0, 0, 0, 0.25);
}
.wardrobe__figure-body {
	width: 50rpx; height: 64rpx;
	border-radius: 18rpx 18rpx 10rpx 10rpx;
	z-index: 2;
	box-shadow: inset -4rpx -4rpx 8rpx rgba(0, 0, 0, 0.28);
}
.wardrobe__figure-robe {
	position: absolute;
	bottom: 8rpx;
	width: 86rpx; height: 52rpx;
	clip-path: polygon(34% 0, 66% 0, 100% 100%, 0 100%);
	z-index: 1;
	opacity: 0.95;
}
.wardrobe__figure-halo {
	position: absolute;
	bottom: 2rpx;
	width: 80rpx; height: 22rpx;
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
</style>
