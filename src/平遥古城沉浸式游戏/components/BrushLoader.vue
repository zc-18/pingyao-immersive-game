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

			<!-- 加载阶段面包屑：卡住时这行文字会停在最后到达的阶段，便于定位是哪一步失败（视图就绪 / 加载库 X/7 / 搭建场景…）。 -->
			<text v-if="stage" class="brush-loader__stage-text">{{ stage }}</text>
			<!-- 提示 / 错误行：加载较慢或 renderjs 报错时把信息留在屏幕上，而非一闪而过的 toast。 -->
			<text v-if="hint" class="brush-loader__hint">{{ hint }}</text>
			<!-- 兜底逃生：无论何种原因卡住，过几秒出现此按钮，用户永不被永久困在加载层。 -->
			<view v-if="showEscape" class="brush-loader__escape" @tap="$emit('escape')">直接进入古城 ▶</view>
		</view>
	</view>
</template>

<script setup>
defineProps({
	visible:    { type: Boolean, default: false },
	progress:   { type: Number, default: 0 },
	text:       { type: String, default: '' },
	stage:      { type: String, default: '' },
	hint:       { type: String, default: '' },
	showEscape: { type: Boolean, default: false },
	inline:     { type: Boolean, default: false }
})
defineEmits(['escape'])
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

.brush-loader__stage-text {
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: rgba(212, 165, 116, 0.55);
	font-family: 'Noto Serif SC', 'STSong', serif;
}

.brush-loader__hint {
	margin-top: 4rpx;
	font-size: 20rpx;
	letter-spacing: 1rpx;
	color: rgba(231, 168, 120, 0.92);
	text-align: center;
	max-width: 460rpx;
	line-height: 1.5;
}

.brush-loader__escape {
	margin-top: 22rpx;
	padding: 12rpx 36rpx;
	font-size: 24rpx;
	letter-spacing: 3rpx;
	color: #f5f0e8;
	border: 2rpx solid rgba(212, 165, 116, 0.6);
	border-radius: 40rpx;
	background: linear-gradient(180deg, rgba(139, 69, 19, 0.55) 0%, rgba(110, 53, 16, 0.7) 100%);
	box-shadow: 0 0 20rpx rgba(255, 140, 60, 0.35);
}
</style>
