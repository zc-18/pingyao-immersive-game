<template>
	<view class="achievement-badge" :class="{ 'achievement-badge--locked': !achievement.unlocked }">
		<view
			class="badge-icon"
			:style="{
				background: achievement.unlocked
					? `linear-gradient(135deg, ${achievement.accent || '#D4A574'} 0%, #8B4513 100%)`
					: '#b8b1a6'
			}"
		>
			<text class="badge-icon__text">{{ achievement.unlocked ? achievement.icon : textMap.lock }}</text>
		</view>
		<view class="badge-content">
			<view class="badge-head">
				<text class="badge-name">{{ achievement.name }}</text>
				<text class="badge-state">
					{{ achievement.stateText || (achievement.unlocked ? textMap.unlocked : textMap.locked) }}
				</text>
			</view>
			<text class="badge-desc">{{ achievement.desc }}</text>
			<text class="badge-progress">{{ achievement.progressText }}</text>
			<view class="badge-meter">
				<view class="badge-meter__fill" :style="{ width: `${progressRate}%` }"></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const textMap = {
	lock: '\u9501',
	unlocked: '\u5df2\u70b9\u4eae',
	locked: '\u672a\u89e3\u9501'
}

const props = defineProps({
	achievement: {
		type: Object,
		default: () => ({})
	}
})

const progressRate = computed(() => {
	const value = Number(props.achievement.progressRate)
	if (Number.isFinite(value)) {
		return Math.min(100, Math.max(0, value))
	}
	return props.achievement.unlocked ? 100 : 0
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.achievement-badge {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 18rpx;
	border-radius: 24rpx;
	background: rgba(255, 251, 245, 0.92);
	border: 2rpx solid rgba(201, 174, 138, 0.72);
	box-shadow: $py-shadow-soft;
}

.achievement-badge--locked {
	background: rgba(234, 229, 220, 0.88);
	border-color: rgba(184, 177, 166, 0.9);
}

.badge-icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 92rpx;
	height: 92rpx;
	border-radius: 26rpx;
	box-shadow: inset 0 0 0 2rpx rgba(255, 248, 239, 0.28);
}

.badge-icon__text {
	font-size: 30rpx;
	font-weight: 700;
	color: #fff8ef;
}

.achievement-badge--locked .badge-icon__text {
	color: rgba(255, 248, 239, 0.9);
}

.badge-content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.badge-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.badge-name {
	font-size: 26rpx;
	font-weight: 700;
	color: #2c1810;
}

.badge-state {
	flex-shrink: 0;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(139, 69, 19, 0.08);
	font-size: 20rpx;
	color: #8b4513;
}

.achievement-badge--locked .badge-name,
.achievement-badge--locked .badge-desc,
.achievement-badge--locked .badge-progress,
.achievement-badge--locked .badge-state {
	color: rgba(44, 24, 16, 0.48);
}

.achievement-badge--locked .badge-state {
	background: rgba(118, 112, 104, 0.1);
}

.badge-desc {
	margin-top: 10rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(44, 24, 16, 0.68);
}

.badge-progress {
	margin-top: 10rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #8b4513;
}

.badge-meter {
	position: relative;
	height: 10rpx;
	margin-top: 14rpx;
	border-radius: 999rpx;
	background: rgba(139, 69, 19, 0.12);
	overflow: hidden;
}

.badge-meter__fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #d4a574 0%, #8b4513 100%);
}
</style>
