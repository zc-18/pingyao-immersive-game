<template>
	<div v-if="visible" class="owl-float" :class="{ 'owl-float--expanded': isExpanded }">
		<!-- 头像（圆形铜框）-->
		<div class="owl-float__avatar" @click="toggleExpand">
			<div class="owl-float__rim"></div>
			<div class="owl-float__inner">
				<img class="owl-float__img" src="/static/img/npc_owl_avatar.png" data-fit="contain"  alt="" draggable="false" />
			</div>
			<div class="owl-float__pulse"></div>
		</div>

		<!-- 对话气泡（卷边纸笺）-->
		<div v-if="isExpanded" class="owl-float__bubble">
			<div class="owl-float__bubble-fiber"></div>
			<span class="owl-float__bubble-name">— 晋 小 鸦 —</span>
			<span class="owl-float__message">{{ message }}</span>
			<div class="owl-float__bubble-tail"></div>
			<div class="owl-float__close" @click.stop="handleClose">
				<span>×</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false },
	message: { type: String, default: '客官,前头有故事,也有银钥。' },
	autoHide: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const isExpanded = ref(false)
let autoHideTimer = null

function toggleExpand() {
	isExpanded.value = !isExpanded.value
	// 此处铜铃声 ding 留给后期接入

	if (isExpanded.value && props.autoHide) {
		clearTimeout(autoHideTimer)
		autoHideTimer = setTimeout(() => {
			isExpanded.value = false
		}, 3500)
	}
}

function handleClose() {
	clearTimeout(autoHideTimer)
	isExpanded.value = false
	emit('close')
}

function expandBubble() {
	isExpanded.value = true
	clearTimeout(autoHideTimer)
	if (props.autoHide) {
		autoHideTimer = setTimeout(() => {
			isExpanded.value = false
		}, 3500)
	}
}

watch(() => props.visible, (newVal) => {
	if (newVal) {
		expandBubble()
	} else {
		clearTimeout(autoHideTimer)
		isExpanded.value = false
	}
})

// 消息变化时若气泡仍可见，也重新展开并重启计时器：
// approach / 换幕寒暄等在 visible 已为 true 时推送新句，否则 watch(visible) 不触发、新台词被吞。
watch(() => props.message, () => {
	if (props.visible) {
		expandBubble()
	}
})

onUnmounted(() => {
	clearTimeout(autoHideTimer)
})
</script>

<style lang="scss" scoped>.owl-float {
	position: fixed;
	right: 32rpx;
	bottom: 220rpx;
	z-index: 11;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 16rpx;
}

.owl-float__avatar {
	position: relative;
	width: 124rpx;
	height: 124rpx;
	cursor: pointer;
}

.owl-float__rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.32),
		0 8rpx 20rpx rgba(0, 0, 0, 0.55),
		0 0 24rpx rgba(255, 200, 130, 0.32);
	animation: breathe 3s ease-in-out infinite;
}

.owl-float__inner {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	overflow: hidden;
	background: rgba(13, 9, 7, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
}

.owl-float__img {
	width: 92rpx;
	height: 92rpx;
}

.owl-float__pulse {
	position: absolute;
	inset: -10rpx;
	border-radius: 50%;
	border: 3rpx solid rgba(255, 215, 100, 0.55);
	animation: owlPulse 2s ease-in-out infinite;
}

@keyframes owlPulse {
	0%, 100% { transform: scale(1); opacity: 0.65; }
	50%      { transform: scale(1.18); opacity: 0; }
}

@keyframes breathe {
	0%, 100% { transform: scale(1); }
	50%      { transform: scale(1.05); }
}

/* ===== 卷边纸笺气泡 ===== */
.owl-float__bubble {
	position: relative;
	max-width: 460rpx;
	padding: 22rpx 28rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 4rpx;
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.55);
	animation: bubbleIn 0.35s ease-out;
}

.owl-float__bubble-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.05) 0, rgba(139, 69, 19, 0.05) 1rpx, transparent 1rpx, transparent 7rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.owl-float__bubble > * { position: relative; z-index: 1; }

.owl-float__bubble-name {
	display: block;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.owl-float__message {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.85;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

.owl-float__bubble-tail {
	position: absolute;
	right: 36rpx;
	bottom: -14rpx;
	width: 0;
	height: 0;
	border-left: 14rpx solid transparent;
	border-right: 14rpx solid transparent;
	border-top: 14rpx solid rgba(245, 232, 208, 0.95);
	z-index: 2;
}

.owl-float__close {
	position: absolute;
	top: -10rpx;
	right: -10rpx;
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 26rpx;
	font-weight: 700;
	border-radius: 50%;
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.5);
	z-index: 3;
}

@keyframes bubbleIn {
	from { opacity: 0; transform: translateY(20rpx) scale(0.95); }
	to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 横屏适配 */
@media screen and (orientation: landscape) {
	.owl-float {
		right: 40rpx;
		bottom: 180rpx;
	}

	.owl-float__avatar {
		width: 100rpx;
		height: 100rpx;
	}

	.owl-float__img {
		width: 78rpx;
		height: 78rpx;
	}

	.owl-float__bubble {
		max-width: 380rpx;
		padding: 18rpx 24rpx;
	}
}

@media screen and (orientation: landscape) and (max-height: 520px) {
	.owl-float { right: 12px; bottom: 62px; gap: 8px; }
	.owl-float__avatar { width: 50px; height: 50px; }
	.owl-float__inner { inset: 4px; }
	.owl-float__img { width: 38px; height: 38px; }
	.owl-float__pulse { inset: -5px; border-width: 1px; }
	.owl-float__bubble { max-width: 280px; padding: 10px 14px; border-width: 1px; }
	.owl-float__bubble-name { font-size: 10px; letter-spacing: 3px; }
	.owl-float__message { margin-top: 3px; font-size: 12px; line-height: 1.55; }
	.owl-float__close { top: -7px; right: -7px; width: 22px; height: 22px; font-size: 14px; }
}
</style>
