<template>
	<view class="stat-grid">
		<view v-for="item in items" :key="item.key" class="stat-card">
			<view class="stat-card__head">
				<PyIcon :name="resolveIcon(item.key)" :size="56" tone="primary" />
				<text class="stat-card__label">{{ item.label }}</text>
			</view>
			<view class="stat-card__value-row">
				<text class="stat-card__value">{{ item.value }}</text>
				<text class="stat-card__unit">{{ item.unit }}</text>
			</view>
			<text class="stat-card__trend">{{ item.trend }}</text>
		</view>
	</view>
</template>

<script setup>
import PyIcon from './PyIcon.vue'

defineProps({
	items: {
		type: Array,
		default: () => []
	}
})

function resolveIcon(key) {
	const iconMap = {
		silver: 'coin',
		credit: 'badge',
		tasks: 'task',
		spots: 'poi'
	}

	return iconMap[key] || 'spark'
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.stat-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16rpx;
}

.stat-card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-height: 196rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: rgba(255, 251, 245, 0.96);
	border: 2rpx solid rgba(201, 174, 138, 0.72);
	box-shadow: $py-shadow-soft;
}

.stat-card__head {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.stat-card__label {
	font-size: 22rpx;
	color: rgba(44, 24, 16, 0.68);
}

.stat-card__value-row {
	display: flex;
	align-items: baseline;
	gap: 10rpx;
	margin-top: 18rpx;
}

.stat-card__value {
	font-size: 44rpx;
	font-weight: 700;
	line-height: 1;
	color: #2c1810;
}

.stat-card__unit {
	font-size: 22rpx;
	color: #8b4513;
}

.stat-card__trend {
	margin-top: 14rpx;
	font-size: 20rpx;
	line-height: 1.5;
	color: rgba(44, 24, 16, 0.56);
}
</style>
