<template>
	<view class="entry-card" :class="[`entry-card--${tone}`, `entry-card--${layout}`]" hover-class="entry-card--hover" hover-stay-time="80" @tap="emit('tap')">
		<view class="entry-card__head">
			<PyIcon :name="icon" :tone="iconTone" :size="76" />
			<text v-if="badge" class="entry-card__badge">{{ badge }}</text>
		</view>

		<view class="entry-card__body">
			<text class="entry-card__title">{{ title }}</text>
			<text class="entry-card__subtitle">{{ subtitle }}</text>
			<text class="entry-card__description">{{ description }}</text>
		</view>

		<view class="entry-card__foot">
			<text class="entry-card__hint">{{ hint }}</text>
			<PyIcon name="route" :size="44" tone="dark" variant="ring" />
		</view>
	</view>
</template>

<script setup>
import PyIcon from './PyIcon.vue'

defineProps({
	title: { type: String, default: '入口' },
	subtitle: { type: String, default: '功能分组' },
	description: { type: String, default: '入口说明' },
	hint: { type: String, default: '进入' },
	badge: { type: String, default: '' },
	tone: { type: String, default: 'primary' },
	layout: { type: String, default: 'grid' },
	icon: { type: String, default: 'spark' },
	iconTone: { type: String, default: 'light' }
})

const emit = defineEmits(['tap'])
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.entry-card {
	display: flex;
	flex-direction: column;
	min-height: 244rpx;
	padding: 22rpx;
	border-radius: 28rpx;
	border: 2rpx solid rgba(201, 174, 138, 0.68);
	background: $py-panel-paper;
	box-shadow: $py-shadow-soft;
	transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.entry-card--hover {
	transform: translateY(-4rpx);
	box-shadow: $py-shadow-card;
}

.entry-card__head,
.entry-card__foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.entry-card__badge {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.34);
	font-size: 20rpx;
	color: inherit;
}

.entry-card__body {
	display: flex;
	flex: 1;
	flex-direction: column;
	margin-top: 18rpx;
	min-width: 0;
}

.entry-card__title {
	font-size: 30rpx;
	font-weight: 700;
	color: inherit;
}

.entry-card__subtitle {
	margin-top: 8rpx;
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: inherit;
	opacity: 0.78;
}

.entry-card__description {
	margin-top: 12rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: inherit;
	opacity: 0.86;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.entry-card__foot {
	margin-top: 18rpx;
}

.entry-card__hint {
	font-size: 22rpx;
	font-weight: 600;
	color: inherit;
}

.entry-card--primary {
	background: linear-gradient(135deg, #8b4513 0%, #a85a21 100%);
	color: #fff8ef;
}

.entry-card--secondary {
	background: linear-gradient(135deg, rgba(212, 165, 116, 0.2) 0%, rgba(255, 251, 245, 0.96) 100%);
	color: #2c1810;
}

.entry-card--ink {
	background: linear-gradient(135deg, rgba(44, 24, 16, 0.95) 0%, rgba(84, 58, 39, 0.94) 100%);
	color: #fff8ef;
}

.entry-card--accent {
	background: linear-gradient(135deg, rgba(196, 30, 58, 0.14) 0%, rgba(255, 251, 245, 0.96) 100%);
	color: #2c1810;
}
</style>
