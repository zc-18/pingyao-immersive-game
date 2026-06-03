<template>
	<view
		class="stamp"
		:class="[
			'stamp--' + shape,
			{ 'stamp--lit': lit, 'stamp--locked': locked, 'stamp--lg': size === 'lg', 'stamp--sm': size === 'sm' }
		]"
		:style="rotateStyle"
	>
		<view class="stamp__inner">
			<text v-if="text" class="stamp__text">{{ text }}</text>
			<text v-else-if="locked" class="stamp__text">？？？</text>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	text:   { type: String, default: '' },
	shape:  { type: String, default: 'square' },  // square / round / oval
	lit:    { type: Boolean, default: false },
	locked: { type: Boolean, default: false },
	angle:  { type: Number, default: -4 },
	size:   { type: String, default: 'md' }
})

const rotateStyle = computed(() => `transform:rotate(${props.angle}deg);`)
</script>

<style lang="scss" scoped>
.stamp {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 96rpx;
	min-height: 96rpx;
	padding: 14rpx 18rpx;
}

.stamp--sm { min-width: 72rpx; min-height: 72rpx; padding: 10rpx 14rpx; }
.stamp--lg { min-width: 140rpx; min-height: 140rpx; padding: 20rpx 26rpx; }

.stamp__inner {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	min-width: 60rpx;
	min-height: 60rpx;
	color: #c41e3a;
	font-size: 26rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 4rpx solid #c41e3a;
	text-shadow: 0 0 1rpx rgba(196, 30, 58, 0.6);
}

.stamp__inner::before {
	content: '';
	position: absolute;
	inset: 6rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	pointer-events: none;
}

.stamp--lg .stamp__inner { font-size: 32rpx; border-width: 6rpx; letter-spacing: 6rpx; }
.stamp--sm .stamp__inner { font-size: 20rpx; border-width: 3rpx; letter-spacing: 2rpx; }

.stamp--square .stamp__inner { border-radius: 8rpx; }
.stamp--square .stamp__inner::before { border-radius: 4rpx; }

.stamp--round .stamp__inner {
	border-radius: 50%;
	min-width: 96rpx;
	min-height: 96rpx;
}
.stamp--round .stamp__inner::before { border-radius: 50%; }

.stamp--oval .stamp__inner {
	border-radius: 50%;
	min-width: 140rpx;
	min-height: 90rpx;
}
.stamp--oval .stamp__inner::before { border-radius: 50%; }

.stamp__text {
	position: relative;
	z-index: 2;
	white-space: nowrap;
}

/* 已点亮：脉冲光圈 */
.stamp--lit .stamp__inner {
	animation: stampPulse 1.8s ease-in-out infinite;
}

/* 未解锁：墨色拓印 */
.stamp--locked .stamp__inner {
	color: rgba(110, 85, 65, 0.7);
	background: rgba(26, 20, 17, 0.45);
	border-color: rgba(110, 85, 65, 0.55);
	text-shadow: none;
	filter: blur(0.5rpx);
}

.stamp--locked .stamp__inner::before {
	border-color: rgba(110, 85, 65, 0.4);
}

@keyframes stampPulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(196, 30, 58, 0.6); }
	50%      { box-shadow: 0 0 0 14rpx rgba(196, 30, 58, 0); }
}
</style>
