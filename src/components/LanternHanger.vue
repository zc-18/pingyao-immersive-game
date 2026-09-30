<template>
	<div class="lantern-row">
		<div
			v-for="i in count"
			:key="i"
			class="lantern"
			:class="{ 'lantern--lit': lit }"
			:style="lanternStyle(i)"
		>
			<div class="lantern__rope"></div>
			<div class="lantern__cap"></div>
			<div class="lantern__body">
				<span v-if="text" class="lantern__text">{{ text[(i - 1) % text.length] }}</span>
			</div>
			<div class="lantern__tail"></div>
		</div>
	</div>
</template>

<script setup>
const props = defineProps({
	count: { type: Number, default: 3 },
	lit:   { type: Boolean, default: true },
	text:  { type: String, default: '' } // 灯笼上每个灯一字
})

function lanternStyle(i) {
	const delay = (i * 0.4) % 2
	return `animation-delay:-${delay}s;`
}
</script>

<style lang="scss" scoped>
.lantern-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-evenly;
	gap: 0;
	width: 100%;
	pointer-events: none;
}

.lantern {
	position: relative;
	width: 80rpx;
	transform-origin: top center;
	animation: lanternSway 3.6s ease-in-out infinite;
}

.lantern__rope {
	width: 2rpx;
	height: 30rpx;
	margin: 0 auto;
	background: rgba(212, 165, 116, 0.65);
}

.lantern__cap {
	width: 36rpx;
	height: 12rpx;
	margin: 0 auto;
	background: linear-gradient(180deg, #d4a574 0%, #6b3510 100%);
	border-radius: 4rpx 4rpx 2rpx 2rpx;
}

.lantern__body {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 110rpx;
	margin-top: -2rpx;
	border-radius: 40rpx 40rpx 40rpx 40rpx / 50rpx 50rpx 50rpx 50rpx;
	background:
		radial-gradient(ellipse at 35% 40%, rgba(255, 220, 160, 0.85) 0%, rgba(196, 30, 58, 0.82) 55%, rgba(110, 22, 34, 0.95) 100%),
		linear-gradient(180deg, rgba(255, 200, 140, 0.4) 0%, rgba(0, 0, 0, 0.35) 100%);
	box-shadow:
		inset 0 -8rpx 14rpx rgba(0, 0, 0, 0.45),
		0 0 28rpx rgba(255, 130, 60, 0.55);
	overflow: hidden;
}

.lantern__body::before,
.lantern__body::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	height: 2rpx;
	background: rgba(0, 0, 0, 0.45);
}

.lantern__body::before { top: 18rpx; }
.lantern__body::after  { bottom: 18rpx; }

.lantern__text {
	position: relative;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-size: 30rpx;
	font-weight: 700;
	color: $py-paper-warm;
	text-shadow: 0 0 6rpx rgba(255, 230, 180, 0.85);
	letter-spacing: 0;
}

.lantern__tail {
	width: 12rpx;
	height: 22rpx;
	margin: -2rpx auto 0;
	background: linear-gradient(180deg, #d4a574 0%, #c41e3a 100%);
	border-radius: 0 0 6rpx 6rpx;
	clip-path: polygon(20% 0, 80% 0, 60% 100%, 50% 80%, 40% 100%);
}

.lantern--lit .lantern__body {
	animation: lanternBreathe 3s ease-in-out infinite;
}

@keyframes lanternBreathe {
	0%, 100% { box-shadow: inset 0 -8rpx 14rpx rgba(0, 0, 0, 0.45), 0 0 28rpx rgba(255, 130, 60, 0.55); }
	50%      { box-shadow: inset 0 -8rpx 14rpx rgba(0, 0, 0, 0.42), 0 0 44rpx rgba(255, 160, 80, 0.85); }
}

@media screen and (orientation: landscape) and (max-height: 520px) {
	.lantern { width: 42px; }
	.lantern__rope { width: 1px; height: 12px; }
	.lantern__cap { width: 18px; height: 6px; border-radius: 2px 2px 1px 1px; }
	.lantern__body { width: 42px; height: 52px; margin-top: -1px; border-radius: 21px / 24px; }
	.lantern__body::before { top: 9px; }
	.lantern__body::after { bottom: 9px; }
	.lantern__text { font-size: 15px; }
	.lantern__tail { width: 6px; height: 11px; margin-top: -1px; }
}

@media screen and (orientation: portrait) and (max-width: 600px) {
	.lantern { width: 44px; }
	.lantern__rope { width: 1px; height: 14px; }
	.lantern__cap { width: 20px; height: 7px; }
	.lantern__body { width: 44px; height: 56px; margin-top: -1px; border-radius: 22px / 26px; }
	.lantern__body::before { top: 10px; }
	.lantern__body::after { bottom: 10px; }
	.lantern__text { font-size: 16px; }
	.lantern__tail { width: 7px; height: 12px; margin-top: -1px; }
}
</style>
