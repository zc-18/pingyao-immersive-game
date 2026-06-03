<template>
	<view class="falling-stage" :class="['falling-stage--' + type]">
		<view
			v-for="(item, index) in particles"
			:key="index"
			class="falling-leaf"
			:class="'falling-leaf--' + type"
			:style="item.style"
		></view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	type:    { type: String, default: 'leaf' },   // leaf / cherry / snow / firefly / petal
	density: { type: Number, default: 14 }
})

const particles = computed(() => {
	const list = []
	for (let i = 0; i < props.density; i++) {
		const left = ((i * 11 + 5) % 95) + 1
		const delay = (i * 0.7) % 12
		const duration = 9 + (i % 5) * 2
		const size = 12 + (i % 4) * 6
		const drift = (i % 2 === 0 ? 1 : -1) * (40 + (i % 3) * 30)
		const rot = (i % 360) * 1
		list.push({
			style: `left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;width:${size}rpx;height:${size}rpx;--drift:${drift}rpx;--rot:${rot}deg;`
		})
	}
	return list
})
</script>

<style lang="scss" scoped>
.falling-stage {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 4;
	overflow: hidden;
}

.falling-leaf {
	position: absolute;
	top: -10vh;
	border-radius: 50% 0 50% 0;
	will-change: transform, opacity;
	animation-name: leafDrift;
	animation-timing-function: linear;
	animation-iteration-count: infinite;
	transform: rotate(var(--rot, 0));
}

/* ===== 银杏叶 ===== */
.falling-leaf--leaf {
	background: linear-gradient(135deg, #f5d76e 0%, #d4a574 60%, #8b6510 100%);
	box-shadow: 0 0 4rpx rgba(255, 220, 130, 0.4);
}

/* ===== 樱花瓣 ===== */
.falling-leaf--cherry {
	background: radial-gradient(circle at 30% 30%, #ffe6ee 0%, #ff9eb5 60%, #d65a82 100%);
	border-radius: 60% 30% 60% 30%;
}

/* ===== 雪花 ===== */
.falling-leaf--snow {
	background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(220, 230, 245, 0.4) 70%, transparent 100%);
	border-radius: 50%;
	box-shadow: 0 0 6rpx rgba(255, 255, 255, 0.7);
}

/* ===== 萤火 ===== */
.falling-leaf--firefly {
	background: radial-gradient(circle, rgba(255, 220, 130, 1) 0%, rgba(255, 180, 60, 0.5) 50%, transparent 100%);
	border-radius: 50%;
	box-shadow: 0 0 16rpx rgba(255, 200, 80, 0.85);
	animation-name: fireflyFloat;
}

/* ===== 花瓣 ===== */
.falling-leaf--petal {
	background: linear-gradient(135deg, #ffd6c0 0%, #ff8a6b 100%);
	border-radius: 60% 30% 60% 30%;
}

@keyframes leafDrift {
	0%   { transform: translate3d(0, -10vh, 0) rotate(var(--rot, 0)); opacity: 0; }
	8%   { opacity: 0.9; }
	95%  { opacity: 0.7; }
	100% { transform: translate3d(var(--drift, 0), 110vh, 0) rotate(calc(var(--rot, 0) + 720deg)); opacity: 0; }
}

@keyframes fireflyFloat {
	0%   { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
	15%  { opacity: 1; }
	50%  { transform: translate3d(var(--drift, 0), -32vh, 0) scale(1.1); opacity: 0.85; }
	85%  { opacity: 0.5; }
	100% { transform: translate3d(calc(var(--drift, 0) * -0.5), -64vh, 0) scale(0.6); opacity: 0; }
}
</style>
