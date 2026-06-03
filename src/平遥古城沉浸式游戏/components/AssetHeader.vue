<template>
	<view class="asset-header">
		<view class="asset-header__main">
			<text class="asset-header__eyebrow">{{ eyebrow }}</text>
			<text class="asset-header__title">{{ title }}</text>
			<text class="asset-header__subtitle">{{ subtitle }}</text>
		</view>

		<view class="asset-header__grid">
			<view
				v-for="asset in assets"
				:key="asset.key"
				class="asset-tile"
				:class="{ 'asset-tile--accent': asset.accent }"
			>
				<PyIcon :name="resolveIcon(asset)" :tone="asset.accent ? 'accent' : 'primary'" :size="60" />
				<view class="asset-tile__copy">
					<text class="asset-tile__value">{{ asset.value }}</text>
					<text class="asset-tile__label">{{ asset.label }}</text>
				</view>
			</view>
		</view>

		<button class="asset-header__action" @tap="$emit('record')">
			<PyIcon name="record" tone="light" :size="42" />
			<text>{{ actionText }}</text>
		</button>
	</view>
</template>

<script setup>
import PyIcon from './PyIcon.vue'

defineProps({
	eyebrow: { type: String, default: '晋商账本' },
	title: { type: String, default: '票号资产' },
	subtitle: { type: String, default: '线上记账、线下核销，在一张移动账本里查看今日收支与兑换进度。' },
	actionText: { type: String, default: '查看票券' },
	assets: { type: Array, default: () => [] }
})

defineEmits(['record'])

function resolveIcon(asset) {
	if (asset.key === 'silverKey') {
		return 'key'
	}

	if (asset.key === 'silver') {
		return 'coin'
	}

	return 'spark'
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.asset-header {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 32rpx;
	border: 2rpx solid rgba(201, 174, 138, 0.76);
	background: $py-panel-paper-strong, $py-paper-stripe-vertical;
	box-shadow: $py-shadow-panel;
}

.asset-header__eyebrow {
	font-size: 20rpx;
	letter-spacing: 4rpx;
	color: #8b4513;
}

.asset-header__title {
	display: block;
	margin-top: 10rpx;
	font-size: 40rpx;
	font-weight: 700;
	color: #2c1810;
}

.asset-header__subtitle {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(44, 24, 16, 0.62);
}

.asset-header__grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16rpx;
}

.asset-tile {
	display: flex;
	align-items: center;
	gap: 14rpx;
	padding: 18rpx;
	border-radius: 24rpx;
	background: rgba(255, 251, 244, 0.92);
	border: 2rpx solid rgba(201, 174, 138, 0.52);
}

.asset-tile--accent {
	background: rgba(196, 30, 58, 0.08);
}

.asset-tile__copy {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.asset-tile__value {
	font-size: 30rpx;
	font-weight: 700;
	color: #2c1810;
}

.asset-tile__label {
	margin-top: 6rpx;
	font-size: 20rpx;
	color: rgba(44, 24, 16, 0.58);
}

.asset-header__action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	width: 100%;
	min-height: 88rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8b4513 0%, #6e3410 100%);
	color: #fff8ef;
	font-size: 24rpx;
	box-shadow: $py-shadow-button;
}

.asset-header__action::after {
	border: 0;
}
</style>
