<template>
	<div v-if="visible" class="gate-overlay" :class="{ 'gate-overlay--out': closing }">
		<!-- 背景天光 -->
		<div class="gate-overlay__sky"></div>

		<!-- 左右两扇城门 -->
		<div class="gate-overlay__door gate-overlay__door--left">
			<div class="gate-overlay__panel"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--top"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--mid"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--bot"></div>
			<div class="gate-overlay__ring"></div>
		</div>
		<div class="gate-overlay__door gate-overlay__door--right">
			<div class="gate-overlay__panel"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--top"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--mid"></div>
			<div class="gate-overlay__bolt gate-overlay__bolt--bot"></div>
			<div class="gate-overlay__ring"></div>
		</div>

		<!-- 飞檐顶 -->
		<div class="gate-overlay__roof"></div>
		<div class="gate-overlay__plaque">
			<span class="gate-overlay__plaque-text">{{ plaqueText || '平 遥 古 城' }}</span>
		</div>

		<!-- 文案区 -->
		<div class="gate-overlay__copy">
			<span class="gate-overlay__kicker">{{ kicker || '平遥古城 · 晋商旧路' }}</span>
			<span class="gate-overlay__title">{{ title }}</span>
			<span class="gate-overlay__desc">{{ desc }}</span>
		</div>

		<!-- 飞舞尘粒 -->
		<div class="gate-overlay__dust">
			<div v-for="i in 12" :key="i" class="gate-overlay__dust-dot" :style="dustStyle(i)"></div>
		</div>
	</div>
</template>

<script setup>
defineProps({
	visible:    { type: Boolean, default: false },
	closing:    { type: Boolean, default: false },  // true=城门关合，false=城门打开
	plaqueText: { type: String, default: '' },
	kicker:     { type: String, default: '' },
	title:      { type: String, default: '' },
	desc:       { type: String, default: '' }
})

function dustStyle(i) {
	const x = (i * 7) % 100
	const y = (i * 13) % 100
	const delay = (i * 0.18) % 1.6
	const dur = 1.6 + (i % 4) * 0.3
	return `left:${x}%;top:${y}%;animation-delay:${delay}s;animation-duration:${dur}s;`
}
</script>

<style lang="scss" scoped>
.gate-overlay {
	position: fixed;
	inset: 0;
	z-index: 800;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	background: #0d0907;
	pointer-events: all;
}

.gate-overlay__sky {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 50%, rgba(255, 220, 160, 0.28) 0%, rgba(255, 165, 80, 0.18) 30%, rgba(13, 9, 7, 0.95) 70%);
	animation: skyBrighten 2.8s ease-in-out forwards;
}

.gate-overlay__door {
	position: absolute;
	top: 8%;
	bottom: 0;
	width: 50%;
	background:
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #5a2d0e 80%, #3d2010 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 4rpx, transparent 4rpx, transparent 24rpx);
	background-blend-mode: multiply;
	box-shadow:
		inset 0 0 0 4rpx rgba(212, 165, 116, 0.28),
		inset 0 -20rpx 30rpx rgba(0, 0, 0, 0.55),
		0 12rpx 32rpx rgba(0, 0, 0, 0.55);
	transform-origin: top center;
}

.gate-overlay__door--left {
	left: 0;
	animation: gateOpenLeft 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards;
}

.gate-overlay__door--right {
	right: 0;
	animation: gateOpenRight 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards;
}

.gate-overlay--out .gate-overlay__door--left  { animation: gateCloseLeft 0.55s ease-out forwards; }
.gate-overlay--out .gate-overlay__door--right { animation: gateCloseRight 0.55s ease-out forwards; }

.gate-overlay__panel {
	position: absolute;
	inset: 24rpx;
	border: 3rpx solid rgba(212, 165, 116, 0.28);
	border-radius: 4rpx;
	pointer-events: none;
}

.gate-overlay__bolt {
	position: absolute;
	width: 28rpx;
	height: 28rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f0d28e 0%, #6b3510 70%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.6);
}

.gate-overlay__door--left  .gate-overlay__bolt { right: 60rpx; }
.gate-overlay__door--right .gate-overlay__bolt { left: 60rpx; }

.gate-overlay__bolt--top { top: 16%; }
.gate-overlay__bolt--mid { top: 50%; }
.gate-overlay__bolt--bot { bottom: 18%; }

.gate-overlay__ring {
	position: absolute;
	top: 50%;
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	border: 4rpx solid #d4a574;
	background: radial-gradient(circle, rgba(0, 0, 0, 0.4) 30%, transparent 60%);
	transform: translateY(-50%);
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.5);
}

.gate-overlay__door--left  .gate-overlay__ring { right: 24rpx; }
.gate-overlay__door--right .gate-overlay__ring { left: 24rpx; }

.gate-overlay__roof {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 14%;
	background: linear-gradient(180deg, #1a1411 0%, #4a2a18 100%);
	clip-path: polygon(0 100%, 6% 30%, 12% 18%, 50% 0, 88% 18%, 94% 30%, 100% 100%);
	box-shadow: inset 0 -10rpx 18rpx rgba(0, 0, 0, 0.6);
}

.gate-overlay__plaque {
	position: absolute;
	top: 8%;
	left: 50%;
	transform: translateX(-50%);
	z-index: 5;
	padding: 10rpx 36rpx;
	background: linear-gradient(180deg, #2c1810 0%, #4a2a18 100%);
	color: $py-gold;
	font-size: 26rpx;
	font-weight: 700;
	letter-spacing: 12rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 2rpx;
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.55);
}

.gate-overlay__copy {
	position: relative;
	z-index: 4;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	max-width: 80%;
	text-align: center;
	animation: copyAppear 1.4s ease-out 1s both;
}

.gate-overlay__kicker {
	font-size: 22rpx;
	letter-spacing: 10rpx;
	color: rgba(212, 165, 116, 0.82);
}

.gate-overlay__title {
	font-size: 56rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 8rpx;
	text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.7), 0 0 20rpx rgba(255, 200, 130, 0.45);
}

.gate-overlay__desc {
	font-size: 22rpx;
	line-height: 1.85;
	color: rgba(255, 248, 239, 0.85);
	letter-spacing: 3rpx;
	max-width: 640rpx;
}

.gate-overlay__dust {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 6;
}

.gate-overlay__dust-dot {
	position: absolute;
	width: 6rpx;
	height: 6rpx;
	background: radial-gradient(circle, rgba(255, 220, 130, 0.85) 0%, transparent 70%);
	border-radius: 50%;
	animation-name: dustFloat;
	animation-timing-function: ease-out;
	animation-fill-mode: both;
}

@keyframes gateOpenLeft  { 0% { transform: translateX(0); } 100% { transform: translateX(-105%); } }
@keyframes gateOpenRight { 0% { transform: translateX(0); } 100% { transform: translateX(105%); } }
@keyframes gateCloseLeft  { 0% { transform: translateX(-105%); } 100% { transform: translateX(0); } }
@keyframes gateCloseRight { 0% { transform: translateX(105%); } 100% { transform: translateX(0); } }

@keyframes skyBrighten {
	0%   { opacity: 0.65; }
	60%  { opacity: 1; }
	100% { opacity: 1; }
}

@keyframes copyAppear {
	0%   { opacity: 0; transform: translateY(20rpx); }
	60%  { opacity: 1; transform: translateY(0); }
	100% { opacity: 1; }
}

@keyframes dustFloat {
	0%   { opacity: 0; transform: translateY(20rpx) scale(0.5); }
	30%  { opacity: 1; }
	100% { opacity: 0; transform: translateY(-60rpx) scale(1.4); }
}
</style>
