<template>
	<view class="product-card" :class="`product-card--${layout}`" @tap="handleOpen">
		<view class="product-card__poster">
			<view class="product-card__badge">{{ item.markLabel }}</view>
			<PyIcon :name="cardIcon" tone="light" :size="88" />
			<text class="product-card__poster-title">{{ item.highlight }}</text>
		</view>

		<view class="product-card__body">
			<text class="product-card__name">{{ item.name }}</text>
			<text class="product-card__merchant">{{ item.merchantName }}</text>

			<view class="product-card__chips">
				<text class="product-card__chip">{{ item.distance }}</text>
				<text class="product-card__chip">{{ item.redeemScene }}</text>
			</view>

			<view class="product-card__bottom">
				<view>
					<text class="product-card__price">{{ item.price }}</text>
					<text class="product-card__unit">{{ item.currencyLabel }}</text>
				</view>
				<button
					class="product-card__action"
					:class="{ 'product-card__action--disabled': disabled }"
					:disabled="disabled"
					@tap.stop="handleExchange"
				>
					{{ disabled ? '余额不足' : buttonText }}
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import PyIcon from './PyIcon.vue'

const props = defineProps({
	item: { type: Object, default: () => ({}) },
	disabled: { type: Boolean, default: false },
	buttonText: { type: String, default: '记账兑换' },
	layout: { type: String, default: 'grid' }
})

const emit = defineEmits(['open', 'exchange'])

const cardIcon = computed(() => {
	if (props.item.category === 'experience') {
		return 'camera'
	}
	if (props.item.category === 'cultural') {
		return 'badge'
	}
	return 'gift'
})

function handleOpen() {
	emit('open', props.item)
}

function handleExchange() {
	if (!props.disabled) {
		emit('exchange', props.item)
	}
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.product-card {
	display: flex;
	flex-direction: column;
	min-height: 380rpx;
	padding: 16rpx;
	border-radius: 28rpx;
	background: $py-panel-paper;
	border: 2rpx solid rgba(201, 174, 138, 0.84);
	box-shadow: $py-shadow-card;
}

.product-card__poster {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: flex-end;
	height: 190rpx;
	padding: 18rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.94) 0%, rgba(212, 165, 116, 0.84) 100%);
	overflow: hidden;
}

.product-card__badge {
	position: absolute;
	right: 16rpx;
	top: 16rpx;
	z-index: 1;
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(196, 30, 58, 0.9);
	color: #fff8ef;
	font-size: 18rpx;
}

.product-card__poster-title {
	margin-top: 16rpx;
	font-size: 22rpx;
	color: rgba(255, 248, 239, 0.82);
}

.product-card__body {
	display: flex;
	flex: 1;
	flex-direction: column;
	padding: 18rpx 6rpx 6rpx;
}

.product-card__name {
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.4;
	color: #2c1810;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.product-card__merchant {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(44, 24, 16, 0.66);
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.product-card__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 14rpx;
}

.product-card__chip {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(255, 248, 239, 0.92);
	border: 2rpx solid rgba(201, 174, 138, 0.44);
	font-size: 18rpx;
	color: rgba(44, 24, 16, 0.66);
}

.product-card__bottom {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: auto;
	padding-top: 18rpx;
}

.product-card__price {
	font-size: 40rpx;
	font-weight: 700;
	line-height: 1;
	color: #8b4513;
}

.product-card__unit {
	margin-left: 8rpx;
	font-size: 20rpx;
	color: rgba(44, 24, 16, 0.56);
}

.product-card__action {
	min-width: 148rpx;
	height: 64rpx;
	line-height: 64rpx;
	padding: 0 18rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #8b4513 0%, #c46d2d 100%);
	color: #fffaf3;
	font-size: 20rpx;
	box-shadow: $py-shadow-button;
}

.product-card__action--disabled {
	background: #c9ae8a;
	box-shadow: none;
}

.product-card--list {
	min-height: 320rpx;
}
</style>
