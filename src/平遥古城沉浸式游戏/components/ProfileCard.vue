<template>
	<view class="profile-card">
		<view class="portrait-panel">
			<view class="portrait-frame">
				<view class="portrait-block">
					<text class="portrait-label">{{ profile.avatarText }}</text>
				</view>
				<view class="partner-chip">
					<text class="partner-chip__label">{{ textMap.partner }}</text>
					<text class="partner-chip__value">{{ profile.npcPartner }}</text>
				</view>
			</view>
		</view>

		<view class="profile-main">
			<view class="identity-row">
				<view>
					<text class="name">{{ profile.name }}</text>
					<text class="identity">{{ profile.identity }}</text>
				</view>
				<view class="level-chip">
					<text class="level-chip__text">Lv.{{ levelInfo.level }} {{ levelInfo.title }}</text>
				</view>
			</view>

			<text class="signature">{{ profile.signature }}</text>

			<view class="progress-panel">
				<view class="progress-row">
					<text class="progress-label">{{ textMap.progress }}</text>
					<text class="progress-value">{{ expProgressText }}</text>
				</view>
				<view class="progress-track">
					<view class="progress-fill" :style="{ width: `${levelInfo.progress}%` }"></view>
				</view>
				<view class="progress-row progress-row--foot">
					<text class="progress-tip">{{ remainText }}</text>
					<text class="progress-tip">{{ nextLevelText }}</text>
				</view>
				<view class="title-row">
					<text class="title-row__label">{{ textMap.currentTitle }}</text>
					<text class="title-row__value">{{ levelInfo.title }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const textMap = {
	partner: '\u540c\u884c',
	progress: '\u6210\u957f\u8fdb\u5ea6',
	currentTitle: '\u5f53\u524d\u79f0\u53f7',
	max: '\u5df2\u8fbe\u5f53\u524d\u6700\u9ad8\u79f0\u53f7',
	full: '\u6210\u957f\u5706\u6ee1'
}

const props = defineProps({
	profile: {
		type: Object,
		default: () => ({})
	},
	levelInfo: {
		type: Object,
		default: () => ({})
	}
})

const remainText = computed(() => {
	if (props.levelInfo.isMaxLevel) {
		return textMap.max
	}
	return `\u5347\u7ea7\u8fd8\u9700 ${props.levelInfo.expToNextLevel} \u7ecf\u9a8c`
})

const expProgressText = computed(() => {
	if (props.levelInfo.isMaxLevel) {
		return `${props.levelInfo.currentExp} EXP`
	}
	return `${props.levelInfo.currentLevelExp} / ${props.levelInfo.currentLevelRangeExp} EXP`
})

const nextLevelText = computed(() => {
	if (props.levelInfo.isMaxLevel) {
		return textMap.full
	}
	return `\u4e0b\u4e00\u9636\uff1a${props.levelInfo.nextLevelTitle}`
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.profile-card {
	display: grid;
	grid-template-columns: 220rpx minmax(0, 1fr);
	gap: 24rpx;
	height: 100%;
	padding: 28rpx;
	border-radius: 34rpx;
	background: $py-panel-paper-strong, $py-paper-stripe;
	border: 2rpx solid rgba(201, 174, 138, 0.86);
	box-shadow: $py-shadow-panel;
}

.portrait-panel {
	display: flex;
}

.portrait-frame {
	position: relative;
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	padding: 12rpx;
	border-radius: 28rpx;
	background: linear-gradient(180deg, rgba(139, 69, 19, 0.92) 0%, rgba(212, 165, 116, 0.88) 100%);
}

.portrait-frame::after {
	content: '';
	position: absolute;
	inset: 10rpx;
	border: 2rpx dashed rgba(255, 248, 239, 0.4);
	border-radius: 22rpx;
}

.portrait-block {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	min-height: 220rpx;
	border-radius: 20rpx;
	background:
		linear-gradient(180deg, rgba(245, 240, 232, 0.16) 0%, rgba(44, 24, 16, 0.12) 100%),
		radial-gradient(circle at 50% 32%, rgba(255, 248, 239, 0.3) 0, transparent 32%);
}

.portrait-label {
	font-size: 26rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	color: #fff9f2;
}

.partner-chip {
	position: absolute;
	left: 18rpx;
	bottom: 18rpx;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 10rpx;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(44, 24, 16, 0.28);
	backdrop-filter: blur(8rpx);
}

.partner-chip__label,
.partner-chip__value {
	font-size: 20rpx;
	color: #fff7ef;
}

.partner-chip__value {
	font-weight: 700;
}

.profile-main {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 0;
}

.identity-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.name {
	display: block;
	font-size: 42rpx;
	font-weight: 700;
	color: #2c1810;
}

.identity {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	letter-spacing: 2rpx;
	color: rgba(44, 24, 16, 0.68);
}

.level-chip {
	flex-shrink: 0;
	padding: 14rpx 22rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8b4513 0%, #c46d2d 100%);
	box-shadow: 0 14rpx 30rpx rgba(139, 69, 19, 0.18);
}

.level-chip__text {
	font-size: 22rpx;
	font-weight: 700;
	color: #fff9f1;
}

.signature {
	margin-top: 20rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: rgba(44, 24, 16, 0.72);
}

.progress-panel {
	margin-top: auto;
	padding: 20rpx 24rpx;
	border-radius: 26rpx;
	background: rgba(255, 248, 239, 0.82);
	border: 2rpx solid $py-panel-line;
}

.progress-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.progress-row--foot {
	margin-top: 14rpx;
}

.progress-label,
.progress-value,
.progress-tip {
	font-size: 22rpx;
}

.progress-label {
	color: #8b4513;
}

.progress-value {
	font-weight: 700;
	color: #2c1810;
}

.progress-tip {
	color: rgba(44, 24, 16, 0.62);
}

.progress-track {
	position: relative;
	height: 20rpx;
	margin-top: 16rpx;
	border-radius: 999rpx;
	background: rgba(139, 69, 19, 0.12);
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #d4a574 0%, #f1d28a 45%, #8b4513 100%);
	box-shadow: 0 0 16rpx rgba(212, 165, 116, 0.5);
}

.title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-top: 16rpx;
	padding-top: 16rpx;
	border-top: 2rpx solid rgba(201, 174, 138, 0.35);
}

.title-row__label,
.title-row__value {
	font-size: 22rpx;
}

.title-row__label {
	color: rgba(44, 24, 16, 0.58);
}

.title-row__value {
	font-weight: 700;
	color: #8b4513;
}

@media screen and (max-width: 768px) {
	.profile-card {
		grid-template-columns: 1fr;
	}

	.portrait-frame {
		min-height: 240rpx;
	}
}
</style>
