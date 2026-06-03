<template>
	<view class="achievement-wall">
		<view class="achievement-wall__head">
			<text class="achievement-wall__eyebrow">— 行 旅 印 章 ·  {{ summary.unlockedCount }} / {{ summary.total }} —</text>
			<text class="achievement-wall__hint">点章看详情，金边为已点亮。</text>
		</view>

		<view class="achievement-wall__grid">
			<view
				v-for="ach in summary.list"
				:key="ach.id"
				class="achievement-wall__item"
				:class="{ 'achievement-wall__item--lit': ach.unlocked }"
				@tap="select(ach)"
			>
				<view class="achievement-wall__cord-l"></view>
				<view class="achievement-wall__cord-r"></view>
				<view class="achievement-wall__board" :style="ach.unlocked ? { borderColor: ach.accent } : null">
					<view
						class="achievement-wall__board-glyph"
						:style="ach.unlocked ? { color: ach.accent } : null"
					>
						<text>{{ ach.unlocked ? ach.icon : '？' }}</text>
					</view>
					<text class="achievement-wall__board-name">{{ ach.unlocked ? ach.name : '未点亮' }}</text>
					<view v-if="!ach.unlocked && ach.progress > 0" class="achievement-wall__board-bar">
						<view class="achievement-wall__board-bar-fill" :style="{ width: ach.progress + '%' }"></view>
					</view>
				</view>
			</view>
		</view>

		<view v-if="selected" class="achievement-wall__detail-mask" @tap="selected = null"></view>
		<view v-if="selected" class="achievement-wall__detail" @tap.stop>
			<view class="achievement-wall__detail-head">
				<view class="achievement-wall__detail-icon" :style="{ background: selected.accent }">
					<text>{{ selected.unlocked ? selected.icon : '？' }}</text>
				</view>
				<view class="achievement-wall__detail-info">
					<text class="achievement-wall__detail-name">{{ selected.name }}</text>
					<text class="achievement-wall__detail-state">{{ selected.unlocked ? '— 已 点 亮 —' : '— 待 解 锁 —' }}</text>
				</view>
			</view>
			<text class="achievement-wall__detail-desc">{{ selected.desc }}</text>
			<text class="achievement-wall__detail-progress">{{ selected.hint }}</text>
			<view class="achievement-wall__detail-close" @tap="selected = null">
				<text>收起</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getAchievementSummary } from '@/common/utils/achievements.js'

const props = defineProps({
	refreshKey: { type: Number, default: 0 }
})

const summary = ref(getAchievementSummary())
const selected = ref(null)

watch(() => props.refreshKey, () => {
	summary.value = getAchievementSummary()
})

function select(ach) {
	selected.value = ach
}

defineExpose({
	refresh() {
		summary.value = getAchievementSummary()
	}
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.achievement-wall {
	position: relative;
	padding: 20rpx 22rpx 22rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.94) 0%, rgba(243, 233, 215, 0.92) 100%);
	border: 2rpx solid rgba(110, 85, 65, 0.32);
	border-radius: 8rpx;
	box-shadow: 0 8rpx 22rpx rgba(0, 0, 0, 0.28);
}

.achievement-wall__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.achievement-wall__eyebrow {
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.achievement-wall__hint {
	font-size: 16rpx;
	color: rgba(110, 85, 65, 0.65);
}

.achievement-wall__grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 14rpx 10rpx;
}

.achievement-wall__item {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.achievement-wall__cord-l,
.achievement-wall__cord-r {
	position: absolute;
	top: -10rpx;
	width: 1rpx;
	height: 14rpx;
	background: rgba(110, 85, 65, 0.55);
}

.achievement-wall__cord-l { left: 24%; }
.achievement-wall__cord-r { right: 24%; }

.achievement-wall__board {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	width: 100%;
	padding: 10rpx 6rpx 8rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.85) 0%, rgba(218, 196, 158, 0.85) 100%);
	border-top: 3rpx solid rgba(110, 85, 65, 0.45);
	border-bottom: 3rpx solid rgba(110, 85, 65, 0.45);
	box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.32);
	filter: grayscale(0.85);
	opacity: 0.65;
}

.achievement-wall__item--lit .achievement-wall__board {
	filter: grayscale(0);
	opacity: 1;
	box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.42), 0 0 12rpx rgba(212, 165, 116, 0.42);
	background:
		linear-gradient(180deg, rgba(255, 240, 200, 0.95) 0%, rgba(232, 200, 140, 0.92) 100%);
}

.achievement-wall__board-glyph {
	width: 44rpx;
	height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26rpx;
	font-weight: 700;
	color: rgba(110, 85, 65, 0.8);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	background: rgba(255, 255, 255, 0.45);
	border-radius: 50%;
}

.achievement-wall__board-name {
	font-size: 16rpx;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.achievement-wall__board-bar {
	width: 80%;
	height: 4rpx;
	background: rgba(110, 85, 65, 0.18);
	border-radius: 999rpx;
	overflow: hidden;
}

.achievement-wall__board-bar-fill {
	height: 100%;
	background: linear-gradient(90deg, $py-red 0%, #ff6c80 100%);
	border-radius: 999rpx;
}

/* === Detail === */
.achievement-wall__detail-mask {
	position: fixed;
	inset: 0;
	z-index: 60;
	background: rgba(0, 0, 0, 0.55);
	backdrop-filter: blur(6rpx);
}

.achievement-wall__detail {
	position: fixed;
	left: 28rpx;
	right: 28rpx;
	top: 50%;
	transform: translateY(-50%);
	z-index: 61;
	padding: 28rpx 32rpx 24rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-radius: 8rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.55);
}

.achievement-wall__detail-head {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.achievement-wall__detail-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	color: #fff8ef;
	font-size: 38rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 8rpx;
	transform: rotate(-6deg);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.35);
}

.achievement-wall__detail-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.achievement-wall__detail-name {
	font-size: 30rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.achievement-wall__detail-state {
	font-size: 18rpx;
	color: $py-red;
	letter-spacing: 6rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.achievement-wall__detail-desc {
	display: block;
	margin-top: 16rpx;
	font-size: 22rpx;
	line-height: 1.85;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.achievement-wall__detail-progress {
	display: block;
	margin-top: 8rpx;
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.82);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.achievement-wall__detail-close {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 18rpx;
	height: 60rpx;
	border-radius: 6rpx;
	background: linear-gradient(135deg, #6b3510 0%, $py-bronze 50%, #4a2a18 100%);
	color: $py-paper-warm;
	font-size: 22rpx;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}
</style>
