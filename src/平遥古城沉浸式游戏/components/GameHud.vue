<template>
	<view class="game-hud">
		<view class="game-hud__top">
			<view class="game-hud__identity">
				<text class="game-hud__eyebrow">晋商行旅</text>
				<text class="game-hud__title">{{ identityText }}</text>
				<text class="game-hud__subtitle">{{ currentStreet }} · {{ currentLabel }}</text>
			</view>

			<view class="game-hud__stats">
				<view class="game-hud__stat">
					<PyIcon name="key" tone="primary" :size="48" />
					<view>
						<text class="game-hud__stat-value">{{ silverKey }}</text>
						<text class="game-hud__stat-label">银钥</text>
					</view>
				</view>
				<view class="game-hud__stat">
					<PyIcon name="step" tone="accent" :size="48" />
					<view>
						<text class="game-hud__stat-value">{{ steps }}</text>
						<text class="game-hud__stat-label">步数</text>
					</view>
				</view>
			</view>
		</view>

		<view class="game-hud__target">
			<PyIcon name="compass" tone="accent" :size="42" />
			<text class="game-hud__target-label">当前目标</text>
			<text class="game-hud__target-value">{{ targetLabel }}</text>
		</view>

		<view class="game-hud__actions">
			<button class="game-hud__button" @tap="$emit('change-direction', -1)">
				<PyIcon name="route" tone="primary" :size="42" />
				<text>切到上一段街景</text>
			</button>
			<button class="game-hud__button" @tap="$emit('change-direction', 1)">
				<PyIcon name="route" tone="accent" :size="42" />
				<text>切到下一段街景</text>
			</button>
		</view>
	</view>
</template>

<script setup>
import PyIcon from './PyIcon.vue'

defineProps({
	identityText: { type: String, default: '票号学徒 Lv.1' },
	currentStreet: { type: String, default: '票号街景' },
	currentLabel: { type: String, default: '初入古城' },
	targetLabel: { type: String, default: '前方目标' },
	silverKey: { type: [String, Number], default: 120 },
	steps: { type: [String, Number], default: 2680 }
})

defineEmits(['change-direction'])
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.game-hud {
	position: relative;
	z-index: 5;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.game-hud__top,
.game-hud__target {
	padding: 18rpx 20rpx;
	border-radius: 24rpx;
	background: rgba(255, 251, 244, 0.88);
	border: 2rpx solid rgba(201, 174, 138, 0.72);
	box-shadow: $py-shadow-soft;
	backdrop-filter: blur(10rpx);
}

.game-hud__top {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.game-hud__eyebrow {
	font-size: 20rpx;
	letter-spacing: 4rpx;
	color: #8b4513;
}

.game-hud__title {
	display: block;
	margin-top: 6rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #2c1810;
}

.game-hud__subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	color: rgba(44, 24, 16, 0.62);
}

.game-hud__stats,
.game-hud__actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12rpx;
}

.game-hud__stat {
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 14rpx 16rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.54);
	border: 2rpx solid rgba(201, 174, 138, 0.56);
}

.game-hud__stat-value {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #2c1810;
}

.game-hud__stat-label {
	display: block;
	margin-top: 4rpx;
	font-size: 18rpx;
	color: rgba(44, 24, 16, 0.56);
}

.game-hud__target {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.game-hud__target-label {
	font-size: 20rpx;
	color: rgba(44, 24, 16, 0.56);
}

.game-hud__target-value {
	flex: 1;
	font-size: 24rpx;
	font-weight: 700;
	color: #8b4513;
}

.game-hud__button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	min-height: 76rpx;
	border-radius: 999rpx;
	background: rgba(255, 251, 244, 0.78);
	border: 2rpx solid rgba(201, 174, 138, 0.62);
	color: #6e5541;
	font-size: 20rpx;
	box-shadow: 0 10rpx 24rpx rgba(92, 55, 24, 0.08);
}

.game-hud__button::after {
	border: 0;
}
</style>
