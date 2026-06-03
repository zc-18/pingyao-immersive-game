<template>
	<view v-if="visible" class="brush-loader" :class="{ 'brush-loader--inline': inline }">
		<view class="brush-loader__bg" v-if="!inline"></view>

		<view class="brush-loader__stage">
			<!-- 灯笼摇晃 -->
			<view class="brush-loader__lantern">
				<view class="brush-loader__lantern-cap"></view>
				<view class="brush-loader__lantern-body"></view>
			</view>

			<!-- 毛笔画圈 -->
			<view class="brush-loader__circle">
				<view class="brush-loader__arc"></view>
				<view class="brush-loader__brush"></view>
			</view>

			<text class="brush-loader__text">{{ text || '晋小鸦正在张望…' }}</text>
			<text v-if="progress > 0" class="brush-loader__pct">{{ Math.floor(progress) }}%</text>
		</view>
	</view>
</template>

<script setup>
defineProps({
	visible:  { type: Boolean, default: false },
	progress: { type: Number, default: 0 },
	text:     { type: String, default: '' },
	inline:   { type: Boolean, default: false }
})
</script>

<style lang="scss" scoped>
.brush-loader {
	position: fixed;
	inset: 0;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.brush-loader--inline {
	position: relative;
	inset: auto;
	z-index: auto;
	padding: 40rpx 0;
}

.brush-loader__bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(circle at 50% 50%, rgba(255, 200, 130, 0.06) 0%, transparent 35%),
		linear-gradient(180deg, rgba(13, 9, 7, 0.92) 0%, rgba(8, 6, 4, 0.96) 100%);
}

.brush-loader__stage {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 28rpx;
}

/* ===== 灯笼 ===== */
.brush-loader__lantern {
	position: relative;
	transform-origin: top center;
	animation: lanternSway 2.8s ease-in-out infinite;
}

.brush-loader__lantern-cap {
	width: 36rpx;
	height: 12rpx;
	margin: 0 auto;
	background: linear-gradient(180deg, #d4a574 0%, #6b3510 100%);
	border-radius: 4rpx 4rpx 2rpx 2rpx;
}

.brush-loader__lantern-body {
	width: 80rpx;
	height: 110rpx;
	margin-top: -2rpx;
	border-radius: 40rpx 40rpx 40rpx 40rpx / 50rpx 50rpx 50rpx 50rpx;
	background:
		radial-gradient(ellipse at 35% 40%, rgba(255, 220, 160, 0.85) 0%, rgba(196, 30, 58, 0.82) 55%, rgba(110, 22, 34, 0.95) 100%);
	box-shadow: 0 0 36rpx rgba(255, 130, 60, 0.7);
	animation: lanternBreathe 2.4s ease-in-out infinite;
}

@keyframes lanternBreathe {
	0%, 100% { box-shadow: 0 0 36rpx rgba(255, 130, 60, 0.55); }
	50%      { box-shadow: 0 0 56rpx rgba(255, 165, 80, 0.95); }
}

/* ===== 毛笔画圈 ===== */
.brush-loader__circle {
	position: relative;
	width: 124rpx;
	height: 124rpx;
}

.brush-loader__arc {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	border: 4rpx solid rgba(212, 165, 116, 0.18);
	border-top-color: $py-gold;
	border-right-color: $py-gold;
	box-shadow: 0 0 16rpx rgba(212, 165, 116, 0.45);
	animation: brushSpin 1.4s linear infinite;
}

.brush-loader__brush {
	position: absolute;
	top: -6rpx;
	left: 50%;
	width: 10rpx;
	height: 36rpx;
	background: linear-gradient(180deg, #1a1411 0%, #6b3510 60%, #d4a574 100%);
	border-radius: 50% 50% 30% 30%;
	transform-origin: 50% 76rpx;
	animation: brushSpin 1.4s linear infinite;
	box-shadow: 0 0 6rpx rgba(0, 0, 0, 0.4);
}

@keyframes brushSpin {
	0%   { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.brush-loader__text {
	font-size: 22rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'Noto Serif SC', 'STSong', serif;
}

.brush-loader__pct {
	font-size: 26rpx;
	font-weight: 700;
	color: $py-gold;
	font-family: 'Noto Serif SC', 'STSong', serif;
	letter-spacing: 2rpx;
}
</style>
