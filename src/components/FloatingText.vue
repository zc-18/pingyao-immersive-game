<template>
	<div v-if="visible" class="floating-text" :style="floatingStyle">
		<span class="floating-text-content" :class="typeClass">{{ text }}</span>
	</div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onDeactivated } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false },
	text: { type: String, default: '' },
	type: { type: String, default: 'exp' }, // exp, silver, silverKey, score, level
	duration: { type: Number, default: 2000 }
})

const emit = defineEmits(['complete'])

const offsetY = ref(0)
const opacity = ref(1)

const floatingStyle = computed(() => ({
	transform: `translateY(${(offsetY.value) / 32}rem)`,
	opacity: opacity.value
}))

const typeClass = computed(() => `floating-text--${props.type}`)

// 同时观察 visible 与 text：父级连续触发飘字时 visible 一直为 true，仅 watch(visible) 不会重放，
// 旧动画进度（可能已淡出到近乎透明）会被新文案直接套用，等于丢字。getter 返回数组，任一变化即重触发。
watch(() => [props.visible, props.text], ([visible]) => {
	if (visible) {
		startAnimation()
	} else {
		resetAnimation()
	}
})

// 代次令牌：新动画启动即作废上一段 rAF 循环，避免两条循环并发改 offsetY/opacity 且各自 emit('complete')
// （旧循环会先到点把刚开始的新文案提前隐藏）。
let animToken = 0
let animationFrame = null

function startAnimation() {
	resetAnimation()
	const myToken = ++animToken
	offsetY.value = 0
	opacity.value = 1

	// 使用 requestAnimationFrame 实现平滑动画
	const startTime = Date.now()
	const animate = () => {
		if (myToken !== animToken) return // 已被更新的动画作废，停止改值且不再 emit
		const elapsed = Date.now() - startTime
		const progress = Math.min(elapsed / props.duration, 1)

		// 向上飘动 (0 -> -3.125rem)
		offsetY.value = -100 * progress

		// 淡出 (1 -> 0)
		if (progress > 0.6) {
			opacity.value = 1 - (progress - 0.6) / 0.4
		}

		if (progress < 1) {
			animationFrame = requestAnimationFrame(animate)
		} else {
			animationFrame = null
			emit('complete')
		}
	}

	animationFrame = requestAnimationFrame(animate)
}

function resetAnimation() {
	animToken++ // 失效正在跑的循环
	if (animationFrame !== null) cancelAnimationFrame(animationFrame)
	animationFrame = null
	offsetY.value = 0
	opacity.value = 1
}
onDeactivated(resetAnimation)
onUnmounted(resetAnimation)
</script>

<style lang="scss" scoped>.floating-text {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 2000;
	pointer-events: none;
	transition: transform 0.05s linear, opacity 0.05s linear;
}

.floating-text-content {
	display: inline-block;
	padding: 14rpx 32rpx;
	border-radius: 4rpx;
	font-size: 32rpx;
	font-weight: 700;
	line-height: 1.2;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
	white-space: nowrap;
	border: 2rpx solid;
}

/* 不同类型 — 印章/铜钱/红章风 */
.floating-text--exp {
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.92) 0%, rgba(212, 165, 116, 0.95) 100%);
	color: #fff8ef;
	border-color: rgba(255, 235, 200, 0.5);
	box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.45), 0 0 24rpx rgba(212, 165, 116, 0.35);
}

.floating-text--silver {
	background: linear-gradient(135deg, #6b3510 0%, #b07b3a 100%);
	color: #fff8ef;
	border-color: rgba(255, 235, 200, 0.4);
	box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.45);
}

.floating-text--silverKey {
	background: linear-gradient(135deg, #d4a574 0%, #f0d28e 100%);
	color: #1a1411;
	border-color: rgba(255, 245, 200, 0.6);
	box-shadow: 0 6rpx 18rpx rgba(212, 165, 116, 0.55), 0 0 32rpx rgba(255, 220, 130, 0.35);
}

.floating-text--score {
	background: linear-gradient(135deg, #c41e3a 0%, #8b1a2e 100%);
	color: #fff8ef;
	border-color: rgba(255, 220, 220, 0.45);
	box-shadow: 0 6rpx 18rpx rgba(196, 30, 58, 0.55);
}

.floating-text--level {
	background: linear-gradient(135deg, #c41e3a 0%, #ff6c80 50%, #c41e3a 100%);
	color: #fff8ef;
	border-color: rgba(255, 220, 220, 0.55);
	box-shadow: 0 8rpx 22rpx rgba(196, 30, 58, 0.65), 0 0 36rpx rgba(255, 200, 130, 0.4);
	font-size: 44rpx;
	animation: level-up-pulse 0.6s ease-out;
}

@keyframes level-up-pulse {
	0% {
		transform: scale(0.8);
	}
	50% {
		transform: scale(1.2);
	}
	100% {
		transform: scale(1);
	}
}

/* 横屏适配 */
@media screen and (orientation: landscape) {
	.floating-text-content {
		font-size: 32rpx;
		padding: 12rpx 28rpx;
	}

	.floating-text--level {
		font-size: 42rpx;
	}
}
</style>
