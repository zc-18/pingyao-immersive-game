<template>
	<view
		class="scroll-wrap"
		:class="[
			'scroll-wrap--' + orientation,
			{ 'scroll-wrap--unfurl': unfurl }
		]"
	>
		<!-- 卷轴上下/左右轴 -->
		<view class="scroll-wrap__roller scroll-wrap__roller--start"></view>
		<view class="scroll-wrap__roller scroll-wrap__roller--end"></view>

		<view class="scroll-wrap__paper">
			<view class="scroll-wrap__paper-fiber"></view>
			<view class="scroll-wrap__content">
				<text v-if="title" class="scroll-wrap__title">{{ title }}</text>
				<text v-if="subtitle" class="scroll-wrap__subtitle">{{ subtitle }}</text>
				<slot />
			</view>
		</view>
	</view>
</template>

<script setup>
defineProps({
	orientation: { type: String, default: 'horizontal' }, // horizontal / vertical
	unfurl:      { type: Boolean, default: true },        // 入场展开动画
	title:       { type: String, default: '' },
	subtitle:    { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
.scroll-wrap {
	position: relative;
	display: block;
}

.scroll-wrap--horizontal {
	padding: 0 32rpx;
}

.scroll-wrap--vertical {
	padding: 32rpx 0;
}

/* 上下轴 / 左右轴 */
.scroll-wrap__roller {
	position: absolute;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 170, 0.18),
		0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.scroll-wrap--horizontal .scroll-wrap__roller {
	top: -6rpx;
	bottom: -6rpx;
	width: 36rpx;
}

.scroll-wrap--horizontal .scroll-wrap__roller--start { left: 0; }
.scroll-wrap--horizontal .scroll-wrap__roller--end   { right: 0; }

.scroll-wrap--vertical .scroll-wrap__roller {
	left: -6rpx;
	right: -6rpx;
	height: 36rpx;
}

.scroll-wrap--vertical .scroll-wrap__roller--start { top: 0; }
.scroll-wrap--vertical .scroll-wrap__roller--end   { bottom: 0; }

/* 滚轴端帽 */
.scroll-wrap__roller::before,
.scroll-wrap__roller::after {
	content: '';
	position: absolute;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f0d28e 0%, #8b4513 60%, #3d2010 100%);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.6);
}

.scroll-wrap--horizontal .scroll-wrap__roller::before,
.scroll-wrap--horizontal .scroll-wrap__roller::after {
	left: 50%;
	width: 50rpx;
	height: 50rpx;
	transform: translateX(-50%);
}

.scroll-wrap--horizontal .scroll-wrap__roller::before { top: -10rpx; }
.scroll-wrap--horizontal .scroll-wrap__roller::after  { bottom: -10rpx; }

.scroll-wrap--vertical .scroll-wrap__roller::before,
.scroll-wrap--vertical .scroll-wrap__roller::after {
	top: 50%;
	width: 50rpx;
	height: 50rpx;
	transform: translateY(-50%);
}

.scroll-wrap--vertical .scroll-wrap__roller::before { left: -10rpx; }
.scroll-wrap--vertical .scroll-wrap__roller::after  { right: -10rpx; }

/* 纸面 */
.scroll-wrap__paper {
	position: relative;
	padding: 36rpx 36rpx;
	background: linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 240, 232, 0.94) 100%);
	box-shadow: 0 14rpx 40rpx rgba(0, 0, 0, 0.45);
	border-radius: 4rpx;
	overflow: hidden;
}

.scroll-wrap__paper-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.045) 0, rgba(139, 69, 19, 0.045) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.03) 0, rgba(139, 69, 19, 0.03) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.scroll-wrap__content {
	position: relative;
	z-index: 1;
	color: $py-ink;
}

.scroll-wrap__title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	color: #6b3510;
	letter-spacing: 6rpx;
}

.scroll-wrap__subtitle {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(110, 85, 65, 0.85);
	letter-spacing: 3rpx;
}

/* 卷轴展开动画 */
.scroll-wrap--unfurl.scroll-wrap--horizontal {
	animation: unfurlH 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: center;
}

.scroll-wrap--unfurl.scroll-wrap--vertical {
	animation: unfurlV 0.6s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

@keyframes unfurlH {
	0%   { transform: scaleX(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleX(1); opacity: 1; }
}

@keyframes unfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}
</style>
