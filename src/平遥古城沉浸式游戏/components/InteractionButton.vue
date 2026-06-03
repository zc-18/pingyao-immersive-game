<template>
	<view class="interact-stage">
		<view class="interact-stage__token" @tap="handleAction">
			<view class="interact-stage__cord"></view>
			<view class="interact-stage__head">
				<text class="interact-stage__head-char">触</text>
			</view>
			<view class="interact-stage__body">
				<text class="interact-stage__label">{{ label }}</text>
			</view>
			<view class="interact-stage__halo"></view>
		</view>
	</view>
</template>

<script setup>
defineProps({
	label: { type: String, default: '走 近 看 看' }
})

const emit = defineEmits(['action'])

function handleAction() {
	// 此处铜铃声 ding 留给后期接入
	emit('action')
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.interact-stage {
	position: fixed;
	left: 50%;
	top: 58%;
	transform: translate(-50%, -50%);
	z-index: 25;
	animation: floatY 2.6s ease-in-out infinite;
}

.interact-stage__token {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: transform 0.18s ease;
}

.interact-stage__token:active {
	transform: scale(0.92) rotate(-2deg);
}

.interact-stage__cord {
	width: 14rpx;
	height: 14rpx;
	margin-bottom: -2rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f5d76e 0%, #8b4513 70%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.55);
	z-index: 3;
}

.interact-stage__head {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 25%, rgba(255, 220, 220, 0.6) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #8b1a2e 100%);
	border: 3rpx solid rgba(255, 220, 220, 0.5);
	box-shadow:
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.4),
		0 6rpx 12rpx rgba(0, 0, 0, 0.55);
}

.interact-stage__head-char {
	font-size: 36rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.interact-stage__body {
	margin-top: -8rpx;
	padding: 14rpx 32rpx 12rpx;
	background:
		linear-gradient(180deg, #6b1622 0%, #c41e3a 35%, #6b1622 100%);
	clip-path: polygon(8% 0, 92% 0, 100% 18%, 100% 100%, 0 100%, 0 18%);
	border-radius: 4rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.32),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.5),
		0 6rpx 12rpx rgba(0, 0, 0, 0.55);
}

.interact-stage__label {
	font-size: 22rpx;
	font-weight: 700;
	color: $py-paper-warm;
	letter-spacing: 6rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
	white-space: nowrap;
}

.interact-stage__halo {
	position: absolute;
	inset: -16rpx;
	border-radius: 24rpx;
	border: 2rpx solid rgba(196, 30, 58, 0.55);
	pointer-events: none;
	animation: pulseGlow 1.6s ease-in-out infinite;
}
</style>
