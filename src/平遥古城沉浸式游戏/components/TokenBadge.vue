<template>
	<!-- 令牌：上圆下方，整体作为按钮道具 -->
	<view
		class="token"
		:class="{ 'token--accent': accent, 'token--lit': lit }"
		@tap="handleTap"
	>
		<view class="token__head">
			<text v-if="symbol" class="token__symbol">{{ symbol }}</text>
		</view>
		<view class="token__body">
			<text class="token__label">{{ label }}</text>
			<text v-if="caption" class="token__caption">{{ caption }}</text>
		</view>
		<view class="token__cord"></view>
		<view v-if="lit" class="token__halo"></view>
	</view>
</template>

<script setup>
defineProps({
	label:   { type: String, default: '' },
	caption: { type: String, default: '' },
	symbol:  { type: String, default: '' }, // 上圆头中字（一字）
	accent:  { type: Boolean, default: false },
	lit:     { type: Boolean, default: false }
})

const emit = defineEmits(['tap'])

function handleTap() {
	emit('tap')
}
</script>

<style lang="scss" scoped>
.token {
	position: relative;
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	width: 152rpx;
	padding-top: 10rpx;
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1);
	cursor: pointer;
}

.token:active {
	transform: scale(0.94) rotate(-1deg);
}

.token__cord {
	position: absolute;
	top: 0;
	left: 50%;
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f5d76e 0%, #8b4513 70%);
	transform: translateX(-50%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.6);
}

.token__head {
	width: 92rpx;
	height: 92rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 25%, rgba(255, 235, 195, 0.6) 0%, transparent 35%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 35%, #f0d28e 50%, #b07b3a 65%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.32),
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.45),
		0 6rpx 12rpx rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
}

.token--accent .token__head {
	background:
		radial-gradient(circle at 30% 25%, rgba(255, 220, 220, 0.6) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #8b1a2e 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 220, 0.4),
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.45),
		0 6rpx 12rpx rgba(0, 0, 0, 0.5);
}

.token__symbol {
	font-size: 42rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6), 0 0 8rpx rgba(255, 235, 195, 0.4);
}

.token__body {
	margin-top: -10rpx;
	padding: 18rpx 14rpx 14rpx;
	width: 142rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #8b4513 35%, #6b3510 100%);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 170, 0.32),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.5),
		0 6rpx 12rpx rgba(0, 0, 0, 0.55);
	border-radius: 6rpx;
	clip-path: polygon(8% 0, 92% 0, 100% 18%, 100% 100%, 0 100%, 0 18%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
}

.token--accent .token__body {
	background: linear-gradient(180deg, #6b1622 0%, #c41e3a 35%, #6b1622 100%);
}

.token__label {
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
	letter-spacing: 4rpx;
}

.token__caption {
	font-size: 18rpx;
	color: rgba(255, 235, 200, 0.7);
	letter-spacing: 2rpx;
}

.token__halo {
	position: absolute;
	inset: -8rpx;
	border-radius: 28rpx;
	border: 2rpx solid rgba(255, 215, 100, 0.55);
	pointer-events: none;
	animation: pulseGlow 2s ease-in-out infinite;
}
</style>
