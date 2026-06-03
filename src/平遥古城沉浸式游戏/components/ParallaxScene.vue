<template>
	<view class="parallax-scene" :class="['parallax-scene--' + tone]">
		<!-- 背景层（最远 / 最慢）—— 远山 / 远城墙 -->
		<view class="parallax-layer parallax-layer--bg">
			<view class="bg-mountain bg-mountain--1"></view>
			<view class="bg-mountain bg-mountain--2"></view>
			<view class="bg-mountain bg-mountain--3"></view>
		</view>

		<!-- 远城墙 / 屋顶剪影 -->
		<view class="parallax-layer parallax-layer--mid">
			<view class="mid-rooftop mid-rooftop--1"></view>
			<view class="mid-rooftop mid-rooftop--2"></view>
			<view class="mid-rooftop mid-rooftop--3"></view>
			<view class="mid-rooftop mid-rooftop--4"></view>
			<view class="mid-rooftop mid-rooftop--5"></view>
		</view>

		<!-- 前景层（最快） —— 灯笼 / 飘云 / 屋檐 -->
		<view class="parallax-layer parallax-layer--front">
			<view v-if="lanterns" class="front-lantern front-lantern--1"></view>
			<view v-if="lanterns" class="front-lantern front-lantern--2"></view>
			<view v-if="lanterns" class="front-lantern front-lantern--3"></view>
			<view v-if="clouds" class="front-cloud front-cloud--1"></view>
			<view v-if="clouds" class="front-cloud front-cloud--2"></view>
		</view>

		<!-- 时辰光层 -->
		<view class="time-glow"></view>

		<!-- 内容透出 -->
		<slot />
	</view>
</template>

<script setup>
defineProps({
	tone:     { type: String, default: 'dusk' }, // dawn / noon / dusk / night
	lanterns: { type: Boolean, default: true },
	clouds:   { type: Boolean, default: true }
})
</script>

<style lang="scss" scoped>
.parallax-scene {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
}

.parallax-layer {
	position: absolute;
	left: -10%;
	right: -10%;
	bottom: 0;
	pointer-events: none;
}

.parallax-layer--bg {
	height: 60%;
	bottom: 30%;
	animation: floatY 18s ease-in-out infinite;
}

.parallax-layer--mid {
	height: 40%;
	bottom: 8%;
	animation: floatY 12s ease-in-out infinite reverse;
}

.parallax-layer--front {
	inset: 0;
	animation: floatY 8s ease-in-out infinite;
}

/* ===== 远山（背景层）===== */
.bg-mountain {
	position: absolute;
	bottom: 0;
	border-radius: 50% 50% 0 0 / 100% 100% 0 0;
	filter: blur(2rpx);
	opacity: 0.55;
}

.bg-mountain--1 { left: -8%; width: 60%; height: 70%; background: linear-gradient(180deg, rgba(120, 90, 60, 0.75) 0%, rgba(60, 40, 25, 0.95) 100%); }
.bg-mountain--2 { left: 25%; width: 70%; height: 90%; background: linear-gradient(180deg, rgba(95, 70, 48, 0.82) 0%, rgba(45, 30, 18, 0.96) 100%); z-index: 2; }
.bg-mountain--3 { right: -10%; width: 50%; height: 60%; background: linear-gradient(180deg, rgba(140, 100, 65, 0.72) 0%, rgba(70, 48, 28, 0.92) 100%); }

/* ===== 屋顶剪影（中景）===== */
.mid-rooftop {
	position: absolute;
	bottom: 0;
	height: 40%;
	background: linear-gradient(180deg, rgba(40, 26, 18, 0.95) 0%, rgba(20, 12, 8, 1) 100%);
	clip-path: polygon(0 100%, 0 30%, 12% 30%, 14% 18%, 28% 18%, 30% 30%, 60% 30%, 62% 8%, 78% 8%, 80% 30%, 100% 30%, 100% 100%);
}

.mid-rooftop--1 { left: 0%;  width: 30%; }
.mid-rooftop--2 { left: 22%; width: 28%; height: 50%; }
.mid-rooftop--3 { left: 44%; width: 26%; height: 42%; }
.mid-rooftop--4 { left: 64%; width: 30%; height: 56%; }
.mid-rooftop--5 { left: 84%; width: 20%; height: 38%; }

/* ===== 前景灯笼 ===== */
.front-lantern {
	position: absolute;
	top: 6%;
	width: 56rpx;
	height: 76rpx;
	border-radius: 28rpx 28rpx 28rpx 28rpx / 32rpx 32rpx 32rpx 32rpx;
	background: radial-gradient(circle at 50% 38%, #ffb060 0%, #c41e3a 65%, #6b1622 100%);
	box-shadow: 0 0 32rpx rgba(255, 140, 60, 0.6), inset 0 -8rpx 12rpx rgba(0, 0, 0, 0.4);
	transform-origin: top center;
	animation: lanternSway 4s ease-in-out infinite;
}

.front-lantern::before {
	content: '';
	position: absolute;
	left: 50%;
	top: -22rpx;
	width: 2rpx;
	height: 22rpx;
	background: rgba(212, 165, 116, 0.6);
	transform: translateX(-50%);
}

.front-lantern::after {
	content: '';
	position: absolute;
	left: 18rpx;
	bottom: -10rpx;
	width: 20rpx;
	height: 14rpx;
	background: linear-gradient(180deg, #d4a574 0%, #8b4513 100%);
	border-radius: 4rpx;
}

.front-lantern--1 { left: 12%; animation-delay: 0s; }
.front-lantern--2 { left: 48%; animation-delay: 1s; top: 4%; }
.front-lantern--3 { right: 14%; animation-delay: 2s; top: 8%; }

/* ===== 飘云 ===== */
.front-cloud {
	position: absolute;
	background: radial-gradient(ellipse at center, rgba(255, 248, 239, 0.18) 0%, transparent 70%);
	border-radius: 50%;
	animation: cloudDrift 30s linear infinite;
}

.front-cloud--1 { top: 12%; left: -20%; width: 320rpx; height: 100rpx; animation-delay: 0s; }
.front-cloud--2 { top: 22%; left: -30%; width: 240rpx; height: 80rpx; animation-delay: 12s; }

@keyframes cloudDrift {
	0%   { transform: translateX(0); }
	100% { transform: translateX(150vw); }
}

/* ===== 时辰光层 ===== */
.time-glow {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.parallax-scene--dawn .time-glow {
	background:
		radial-gradient(ellipse at 70% 18%, rgba(255, 200, 130, 0.45) 0%, transparent 35%),
		linear-gradient(180deg, rgba(255, 220, 170, 0.18) 0%, transparent 50%, rgba(26, 20, 17, 0.45) 100%);
}

.parallax-scene--noon .time-glow {
	background:
		radial-gradient(ellipse at 50% 8%, rgba(255, 245, 220, 0.32) 0%, transparent 40%),
		linear-gradient(180deg, rgba(245, 240, 232, 0.05) 0%, transparent 60%, rgba(26, 20, 17, 0.55) 100%);
}

.parallax-scene--dusk .time-glow {
	background:
		radial-gradient(ellipse at 30% 22%, rgba(255, 130, 60, 0.5) 0%, transparent 38%),
		radial-gradient(ellipse at 80% 76%, rgba(196, 30, 58, 0.18) 0%, transparent 40%),
		linear-gradient(180deg, rgba(255, 130, 60, 0.18) 0%, transparent 40%, rgba(13, 9, 7, 0.85) 100%);
}

.parallax-scene--night .time-glow {
	background:
		radial-gradient(ellipse at 20% 18%, rgba(140, 170, 220, 0.22) 0%, transparent 38%),
		radial-gradient(ellipse at 80% 70%, rgba(255, 140, 60, 0.16) 0%, transparent 40%),
		linear-gradient(180deg, rgba(20, 30, 56, 0.45) 0%, rgba(8, 10, 18, 0.92) 100%);
}
</style>
