<template>
	<view class="npc-float">
		<view class="npc-card">
			<view class="npc-avatar-wrap">
				<view class="npc-orbit orbit-one"></view>
				<view class="npc-orbit orbit-two"></view>
				<view class="npc-avatar">鸦</view>
				<view class="npc-voice">
					<text
						v-for="bar in voiceBars"
						:key="bar"
						class="voice-bar"
						:style="{ animationDelay: `${bar * 0.12}s` }"
					></text>
				</view>
			</view>

			<view class="npc-content">
				<view class="npc-head">
					<text class="npc-name">{{ name }}</text>
					<text class="npc-role">{{ tag }}</text>
				</view>
				<text class="npc-copy">{{ text }}</text>
				<view class="npc-footer">
					<text class="npc-tip">{{ tip }}</text>
					<button class="npc-action" @tap="$emit('action')">{{ buttonText }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
const voiceBars = [1, 2, 3, 4]

defineProps({
	name: { type: String, default: '晋小鸦' },
	tag: { type: String, default: '古城向导' },
	text: { type: String, default: '客官，前头有故事，也有银钥。' },
	tip: { type: String, default: '轻触可切换一条引导文案' },
	buttonText: { type: String, default: '再听一句' }
})

defineEmits(['action'])
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.npc-float {
	position: relative;
	z-index: 6;
}

.npc-card {
	display: flex;
	align-items: center;
	gap: 18rpx;
	min-height: 132rpx;
	padding: 16rpx 22rpx 16rpx 18rpx;
	border-radius: 30rpx;
	background: $py-panel-paper, $py-paper-stripe-vertical;
	border: 2rpx solid rgba(201, 174, 138, 0.82);
	box-shadow: $py-shadow-card;
}

.npc-avatar-wrap {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 124rpx;
	height: 124rpx;
	flex-shrink: 0;
}

.npc-orbit {
	position: absolute;
	border-radius: 50%;
	border: 2rpx dashed rgba(212, 165, 116, 0.5);
}

.orbit-one {
	width: 108rpx;
	height: 108rpx;
	animation: orbitSpin 8s linear infinite;
}

.orbit-two {
	width: 124rpx;
	height: 124rpx;
	border-color: rgba(196, 30, 58, 0.18);
	animation: orbitSpin 12s linear infinite reverse;
}

.npc-avatar {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 86rpx;
	height: 86rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #d4a574 0%, #8b4513 100%);
	color: #fff8ef;
	font-size: 34rpx;
	font-weight: 700;
	box-shadow: 0 14rpx 28rpx rgba(92, 55, 24, 0.18);
}

.npc-voice {
	position: absolute;
	right: -6rpx;
	bottom: 8rpx;
	z-index: 3;
	display: flex;
	align-items: flex-end;
	gap: 6rpx;
	width: 42rpx;
	height: 38rpx;
}

.voice-bar {
	width: 6rpx;
	height: 16rpx;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #c41e3a 0%, #8b4513 100%);
	animation: voicePulse 1.2s ease-in-out infinite;
	transform-origin: bottom center;
}

.npc-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.npc-head {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.npc-name {
	color: #2c1810;
	font-size: 30rpx;
	font-weight: 700;
}

.npc-role {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 110rpx;
	height: 40rpx;
	padding: 0 14rpx;
	border-radius: 999rpx;
	background: rgba(196, 30, 58, 0.08);
	color: #c41e3a;
	font-size: 20rpx;
	font-weight: 600;
}

.npc-copy {
	margin-top: 10rpx;
	color: #2c1810;
	font-size: 24rpx;
	line-height: 1.7;
}

.npc-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	margin-top: 14rpx;
}

.npc-tip {
	flex: 1;
	color: rgba(44, 24, 16, 0.56);
	font-size: 20rpx;
	line-height: 1.6;
}

.npc-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 148rpx;
	height: 56rpx;
	padding: 0 20rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8b4513 0%, #6f3611 100%);
	color: #fff8ef;
	font-size: 22rpx;
	font-weight: 600;
	box-shadow: 0 10rpx 24rpx rgba(139, 69, 19, 0.18);
}

.npc-action::after {
	border: 0;
}

@keyframes voicePulse {
	0%,
	100% {
		transform: scaleY(0.5);
		opacity: 0.55;
	}

	50% {
		transform: scaleY(1.25);
		opacity: 1;
	}
}

@keyframes orbitSpin {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 768px) {
	.npc-card,
	.npc-footer {
		flex-direction: column;
		align-items: flex-start;
	}

	.npc-avatar-wrap {
		width: 100rpx;
		height: 100rpx;
	}

	.npc-action {
		width: 100%;
	}
}
</style>
