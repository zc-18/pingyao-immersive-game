<template>
	<div class="empty-owl">
		<img class="empty-owl__img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
		<span class="empty-owl__text">{{ text || '此处空空如也，去别处看看？' }}</span>
		<div v-if="ctaText" class="empty-owl__cta" @click="$emit('action')">
			<span>{{ ctaText }}</span>
		</div>
	</div>
</template>

<script setup>
defineProps({
	text:    { type: String, default: '' },
	ctaText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style lang="scss" scoped>
.empty-owl {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 60rpx 40rpx;
}

.empty-owl__img {
	width: 200rpx;
	height: 240rpx;
	filter: drop-shadow(0 8rpx 24rpx rgba(0, 0, 0, 0.4)) grayscale(0.2);
	animation: floatY 3.4s ease-in-out infinite;
}

.empty-owl__text {
	font-size: 22rpx;
	color: rgba(212, 165, 116, 0.8);
	letter-spacing: 2rpx;
	text-align: center;
	max-width: 480rpx;
	line-height: 1.7;
}

.empty-owl__cta {
	margin-top: 12rpx;
	padding: 14rpx 32rpx;
	border-radius: 999rpx;
	background: rgba(212, 165, 116, 0.14);
	border: 1rpx solid rgba(212, 165, 116, 0.45);
	color: $py-gold;
	font-size: 22rpx;
	letter-spacing: 4rpx;
}

/* 手机横屏：竖排的大猫头鹰 + 文案 + 按钮超出 390px 视口，改为左图右文并整体居中 */
@media screen and (orientation: landscape) and (max-height: 520px) {
	.empty-owl {
		flex-direction: row;
		justify-content: center;
		gap: 24px;
		padding: 16px 24px;
		min-height: calc(100vh - 32px);
		min-height: calc(100dvh - 32px);
		box-sizing: border-box;
	}
	.empty-owl__img { width: 120px; height: 144px; flex-shrink: 0; }
	.empty-owl__text { font-size: 14px; max-width: 320px; text-align: left; letter-spacing: 1px; }
	.empty-owl__cta { margin: 0; padding: 9px 18px; font-size: 13px; letter-spacing: 2px; flex-shrink: 0; }
}
</style>
