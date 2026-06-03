<template>
	<view class="message-row" :class="[`message-row-${type}`]">
		<view v-if="type === 'npc'" class="npc-side">
			<view class="npc-avatar">
				<text class="avatar-mark">鸦</text>
			</view>
		</view>

		<view class="bubble-card" :class="[`bubble-card-${type}`]">
			<view class="bubble-head">
				<text class="speaker-name">{{ speakerName }}</text>
				<text v-if="meta" class="speaker-meta">{{ meta }}</text>
			</view>
			<text class="bubble-text">{{ text }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	type: { type: String, default: 'npc' },
	text: { type: String, default: '' },
	meta: { type: String, default: '' },
	npcName: { type: String, default: '晋小鸦' },
	playerName: { type: String, default: '你' }
})

const speakerName = computed(() => (props.type === 'npc' ? props.npcName : props.playerName))
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.message-row {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
	position: relative;
	z-index: 1;
}

.message-row-player {
	justify-content: flex-end;
}

.npc-side {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	padding-top: 10rpx;
	flex-shrink: 0;
}

.npc-avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	border-radius: 18rpx;
	background: linear-gradient(135deg, #d4a574 0%, #8b4513 100%);
	box-shadow: 0 10rpx 18rpx rgba(139, 69, 19, 0.16);
}

.avatar-mark {
	color: #fff8ef;
	font-size: 24rpx;
	font-weight: 700;
}

.bubble-card {
	position: relative;
	z-index: 1;
	max-width: 82%;
	padding: 22rpx 24rpx;
	border-radius: 28rpx;
	border: 2rpx solid rgba(201, 174, 138, 0.6);
	box-shadow: 0 12rpx 28rpx rgba(92, 55, 24, 0.08);
	box-sizing: border-box;
}

.bubble-card::before {
	content: '';
	position: absolute;
	top: 28rpx;
	z-index: -1;
	width: 18rpx;
	height: 18rpx;
	transform: rotate(45deg);
	border-radius: 4rpx;
}

.bubble-card-npc {
	background: $py-panel-paper, $py-paper-stripe-vertical;
}

.bubble-card-npc::before {
	left: -9rpx;
	background: #f7f0e4;
	border-left: 2rpx solid rgba(201, 174, 138, 0.6);
	border-bottom: 2rpx solid rgba(201, 174, 138, 0.6);
}

.bubble-card-player {
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.96) 0%, rgba(111, 54, 17, 0.94) 100%);
	border-color: rgba(111, 54, 17, 0.92);
}

.bubble-card-player::before {
	right: -9rpx;
	background: #7a3d13;
	border-top: 2rpx solid rgba(111, 54, 17, 0.92);
	border-right: 2rpx solid rgba(111, 54, 17, 0.92);
}

.bubble-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8rpx 14rpx;
}

.speaker-name {
	font-size: 22rpx;
	font-weight: 700;
	color: #8b4513;
}

.speaker-meta {
	font-size: 18rpx;
	color: rgba(44, 24, 16, 0.5);
	line-height: 1.6;
}

.bubble-text {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.8;
	color: #2c1810;
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
}

.bubble-card-player .speaker-name,
.bubble-card-player .speaker-meta,
.bubble-card-player .bubble-text {
	color: #fffaf1;
}

@media screen and (max-width: 768px) {
	.bubble-card {
		max-width: calc(100% - 10rpx);
	}
}
</style>
