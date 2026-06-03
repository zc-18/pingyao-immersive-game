<template>
	<view v-if="visible" class="street-loading">
		<!-- 宣纸背景 -->
		<view class="loading-bg"></view>

		<!-- 内容区 -->
		<view class="loading-content">
			<!-- 标题 -->
			<text class="loading-title">青石路长,且行且听……</text>

			<!-- 进度条 -->
			<view class="loading-bar-container">
				<image class="loading-bar-frame" src="/static/img/loading_bar_frame.png" mode="aspectFit" />
				<view class="loading-bar-fill" :style="{ width: progress + '%' }"></view>
			</view>

			<!-- 进度文字 -->
			<text class="loading-progress">{{ progress }}%</text>
		</view>
	</view>
</template>

<script setup>
defineProps({
	visible: { type: Boolean, default: false },
	progress: { type: Number, default: 0 }
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.street-loading {
	position: fixed;
	inset: 0;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: fadeIn 0.3s ease-out;
}

.loading-bg {
	position: absolute;
	inset: 0;
	background-image: url('/static/img/texture_xuan_paper.png');
	background-size: 512rpx 512rpx;
	background-repeat: repeat;
	opacity: 0.98;
}

.loading-content {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 48rpx;
	padding: 80rpx 60rpx;
	z-index: 1;
}

.loading-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #2c1810;
	line-height: 1.5;
	font-family: "Noto Serif SC", serif;
	text-align: center;
	letter-spacing: 4rpx;
}

.loading-bar-container {
	position: relative;
	width: 500rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.loading-bar-frame {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 2;
	pointer-events: none;
}

.loading-bar-fill {
	position: absolute;
	left: 8rpx;
	top: 50%;
	transform: translateY(-50%);
	height: 24rpx;
	background: linear-gradient(90deg, #d4a574 0%, #8b4513 100%);
	border-radius: 12rpx;
	transition: width 0.3s ease-out;
	z-index: 1;
	box-shadow: 0 4rpx 12rpx rgba(139, 69, 19, 0.3);
}

.loading-progress {
	font-size: 28rpx;
	font-weight: 600;
	color: rgba(44, 24, 16, 0.7);
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

/* 横屏适配 */
@media screen and (orientation: landscape) {
	.loading-content {
		padding: 60rpx 80rpx;
		gap: 40rpx;
	}

	.loading-title {
		font-size: 32rpx;
	}

	.loading-bar-container {
		width: 600rpx;
		height: 36rpx;
	}

	.loading-bar-fill {
		height: 20rpx;
	}
}
</style>
