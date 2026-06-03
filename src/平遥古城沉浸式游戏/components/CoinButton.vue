<template>
	<!-- 铜钱按钮：圆形 + 中央方孔 + 沙金边 + 翻转/按下/金粉 三连反馈 -->
	<view
		class="coin-button"
		:class="{
			'coin-button--lit': lit,
			'coin-button--accent': accent,
			'coin-button--lg': size === 'lg',
			'coin-button--sm': size === 'sm'
		}"
		@tap="handleTap"
	>
		<view class="coin-button__rim"></view>
		<view class="coin-button__face">
			<text v-if="label" class="coin-button__label">{{ label }}</text>
			<text v-if="iconText" class="coin-button__icon">{{ iconText }}</text>
		</view>
		<view class="coin-button__hole"></view>
		<view v-if="lit" class="coin-button__halo"></view>
	</view>
</template>

<script setup>
const props = defineProps({
	label:    { type: String, default: '' },
	iconText: { type: String, default: '' }, // 简体字 / 篆文一字（如「探」「图」「肆」「证」）
	lit:      { type: Boolean, default: false },
	accent:   { type: Boolean, default: false },
	size:     { type: String, default: 'md' } // sm / md / lg
})

const emit = defineEmits(['tap'])

function handleTap() {
	// 此处铜铃声 ding —— 留给后期接入
	emit('tap')
}
</script>

<style lang="scss" scoped>
.coin-button {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 110rpx;
	height: 110rpx;
	border-radius: 50%;
	cursor: pointer;
	transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.4, 1);
	flex-shrink: 0;
}

.coin-button--sm { width: 78rpx; height: 78rpx; }
.coin-button--lg { width: 144rpx; height: 144rpx; }

.coin-button:active {
	transform: rotateY(180deg) scale(0.95);
}

.coin-button__rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.32),
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.45),
		0 6rpx 12rpx rgba(0, 0, 0, 0.5);
}

.coin-button--lit .coin-button__rim {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 245, 220, 0.85) 0%, transparent 30%),
		linear-gradient(135deg, #c5921e 0%, #f0d28e 30%, #fff8e0 50%, #f0d28e 70%, #8b6510 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 245, 220, 0.5),
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.32),
		0 6rpx 12rpx rgba(0, 0, 0, 0.5),
		0 0 26rpx rgba(255, 215, 100, 0.55);
}

.coin-button--accent .coin-button__rim {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 200, 200, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #6b1622 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 220, 0.4),
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.45),
		0 6rpx 12rpx rgba(0, 0, 0, 0.5);
}

.coin-button__face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%),
		linear-gradient(135deg, rgba(139, 69, 19, 0.85) 0%, rgba(196, 150, 90, 0.95) 50%, rgba(139, 69, 19, 0.85) 100%);
	box-shadow: inset 0 1rpx 4rpx rgba(255, 235, 195, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
}

.coin-button--lit .coin-button__face {
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 248, 230, 0.55) 0%, transparent 35%),
		linear-gradient(135deg, rgba(212, 165, 116, 0.95) 0%, rgba(255, 235, 180, 1) 50%, rgba(212, 165, 116, 0.95) 100%);
}

.coin-button--accent .coin-button__face {
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 220, 220, 0.45) 0%, transparent 35%),
		linear-gradient(135deg, rgba(196, 30, 58, 0.85) 0%, rgba(232, 72, 96, 0.95) 50%, rgba(196, 30, 58, 0.85) 100%);
}

.coin-button__hole {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 18rpx;
	height: 18rpx;
	background: #0d0907;
	transform: translate(-50%, -50%);
	box-shadow: 0 0 4rpx rgba(0, 0, 0, 0.85);
	z-index: 2;
}

.coin-button--lg .coin-button__hole { width: 26rpx; height: 26rpx; }
.coin-button--sm .coin-button__hole { width: 12rpx; height: 12rpx; }

.coin-button__label {
	position: absolute;
	top: calc(100% + 12rpx);
	left: 50%;
	transform: translateX(-50%);
	font-size: 20rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.85);
	white-space: nowrap;
}

.coin-button__icon {
	position: relative;
	z-index: 3;
	font-size: 28rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.7);
	letter-spacing: 0;
}

.coin-button--sm .coin-button__icon { font-size: 22rpx; }
.coin-button--lg .coin-button__icon { font-size: 38rpx; }

.coin-button__halo {
	position: absolute;
	inset: -10rpx;
	border-radius: 50%;
	border: 2rpx solid rgba(255, 215, 100, 0.55);
	animation: pulseGlow 2s ease-in-out infinite;
	pointer-events: none;
}
</style>
