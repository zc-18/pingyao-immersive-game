<template>
	<view v-if="visible" class="game-toast" :class="`toast-${type}`">
		<!-- 奖励金色飘字 -->
		<view v-if="type === 'reward'" class="toast-reward">
			<image v-if="icon" class="toast-icon" :src="icon" mode="aspectFit" />
			<text class="toast-text">{{ message }}</text>
		</view>

		<!-- 成就卷轴展开 -->
		<view v-else-if="type === 'achievement'" class="toast-achievement">
			<image class="achievement-scroll" src="/static/img/frame_scroll.png" mode="aspectFit" />
			<view class="achievement-content">
				<text class="achievement-title">成就达成</text>
				<text class="achievement-name">{{ message }}</text>
			</view>
		</view>

		<!-- 等级全屏光效 -->
		<view v-else-if="type === 'levelup'" class="toast-levelup">
			<view class="levelup-glow"></view>
			<view class="levelup-content">
				<text class="levelup-title">晋升</text>
				<text class="levelup-level">{{ message }}</text>
			</view>
		</view>

		<!-- NPC 底部气泡 -->
		<view v-else-if="type === 'npc'" class="toast-npc">
			<image class="npc-avatar" src="/static/img/npc_owl_avatar.png" mode="aspectFit" />
			<view class="npc-bubble">
				<text class="npc-text">{{ message }}</text>
			</view>
		</view>

		<!-- 系统顶部小条 -->
		<view v-else class="toast-system">
			<text class="system-text">{{ message }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false },
	type: { type: String, default: 'system' }, // 'reward', 'achievement', 'levelup', 'npc', 'system'
	message: { type: String, default: '' },
	icon: { type: String, default: '' }, // 奖励类型可传图标路径
	duration: { type: Number, default: 2000 }
})

const emit = defineEmits(['close'])

let timer = null

watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			clearTimeout(timer)
			timer = setTimeout(() => {
				emit('close')
			}, props.duration)
		}
	}
)

// 卸载时清掉挂起的关闭定时器：街景频繁弹 toast + 多次换幕，遗留定时器会持续持有组件闭包、阻止 GC，
// 累积成渐进卡顿。这是本组件唯一的副作用，必须随卸载回收。
onUnmounted(() => {
	if (timer) { clearTimeout(timer); timer = null }
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.game-toast {
	position: fixed;
	z-index: 9999;
	pointer-events: none;
}

/* 奖励金色飘字 */
.toast-reward {
	top: 30%;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx 36rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, rgba(212, 165, 116, 0.95) 0%, rgba(139, 69, 19, 0.95) 100%);
	box-shadow: 0 20rpx 60rpx rgba(212, 165, 116, 0.6), 0 0 80rpx rgba(255, 215, 0, 0.4);
	animation: reward-float 2s ease-out forwards;
}

.toast-icon {
	width: 48rpx;
	height: 48rpx;
}

.toast-reward .toast-text {
	font-size: 32rpx;
	font-weight: 700;
	color: #fffbf4;
	text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.3);
}

@keyframes reward-float {
	0% {
		opacity: 0;
		transform: translateX(-50%) translateY(60rpx) scale(0.8);
	}
	20% {
		opacity: 1;
		transform: translateX(-50%) translateY(0) scale(1.1);
	}
	80% {
		opacity: 1;
		transform: translateX(-50%) translateY(-40rpx) scale(1);
	}
	100% {
		opacity: 0;
		transform: translateX(-50%) translateY(-100rpx) scale(0.9);
	}
}

/* 成就卷轴展开 */
.toast-achievement {
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	position: relative;
	width: 600rpx;
	height: 400rpx;
	animation: achievement-unfold 2s ease-out forwards;
}

.achievement-scroll {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.achievement-content {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
}

.achievement-title {
	font-size: 28rpx;
	letter-spacing: 8rpx;
	color: #8b4513;
}

.achievement-name {
	font-size: 40rpx;
	font-weight: 700;
	color: #2c1810;
}

@keyframes achievement-unfold {
	0% {
		opacity: 0;
		transform: translate(-50%, -50%) scaleY(0);
	}
	30% {
		opacity: 1;
		transform: translate(-50%, -50%) scaleY(1.1);
	}
	50% {
		transform: translate(-50%, -50%) scaleY(1);
	}
	80% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.95);
	}
}

/* 等级全屏光效 */
.toast-levelup {
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: levelup-show 2.5s ease-out forwards;
}

.levelup-glow {
	position: absolute;
	inset: 0;
	background: radial-gradient(circle at center, rgba(212, 165, 116, 0.4) 0%, transparent 60%);
	animation: levelup-glow 2.5s ease-out forwards;
}

.levelup-content {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	padding: 48rpx 80rpx;
	border-radius: 40rpx;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.95) 0%, rgba(212, 165, 116, 0.95) 100%);
	box-shadow: 0 0 120rpx rgba(212, 165, 116, 0.8), 0 30rpx 80rpx rgba(0, 0, 0, 0.3);
	animation: levelup-pulse 2.5s ease-out forwards;
}

.levelup-title {
	font-size: 36rpx;
	letter-spacing: 12rpx;
	color: rgba(255, 251, 244, 0.8);
}

.levelup-level {
	font-size: 56rpx;
	font-weight: 700;
	color: #fffbf4;
	text-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.4);
}

@keyframes levelup-show {
	0%,
	100% {
		opacity: 0;
	}
	10%,
	90% {
		opacity: 1;
	}
}

@keyframes levelup-glow {
	0%,
	100% {
		opacity: 0;
	}
	50% {
		opacity: 1;
	}
}

@keyframes levelup-pulse {
	0% {
		transform: scale(0.8);
	}
	20% {
		transform: scale(1.15);
	}
	40% {
		transform: scale(1);
	}
	60% {
		transform: scale(1.05);
	}
	80% {
		transform: scale(1);
	}
}

/* NPC 底部气泡 */
.toast-npc {
	bottom: 180rpx;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 32rpx;
	border-radius: 60rpx;
	background: rgba(255, 251, 244, 0.95);
	backdrop-filter: blur(20rpx);
	border: 3rpx solid rgba(201, 174, 138, 0.8);
	box-shadow: 0 16rpx 40rpx rgba(92, 55, 24, 0.25);
	animation: npc-slide 2s ease-out forwards;
}

.npc-avatar {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	border: 2rpx solid rgba(139, 69, 19, 0.3);
}

.npc-bubble {
	max-width: 500rpx;
}

.npc-text {
	font-size: 24rpx;
	line-height: 1.6;
	color: #2c1810;
}

@keyframes npc-slide {
	0% {
		opacity: 0;
		transform: translateX(-50%) translateY(40rpx);
	}
	15% {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
	85% {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
	100% {
		opacity: 0;
		transform: translateX(-50%) translateY(-20rpx);
	}
}

/* 系统顶部小条 */
.toast-system {
	top: 40rpx;
	left: 50%;
	transform: translateX(-50%);
	padding: 16rpx 40rpx;
	border-radius: 999rpx;
	background: rgba(44, 24, 16, 0.9);
	backdrop-filter: blur(20rpx);
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.2);
	animation: system-slide 2s ease-out forwards;
}

.system-text {
	font-size: 24rpx;
	color: #fffbf4;
}

@keyframes system-slide {
	0% {
		opacity: 0;
		transform: translateX(-50%) translateY(-40rpx);
	}
	15% {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
	85% {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
	100% {
		opacity: 0;
		transform: translateX(-50%) translateY(-20rpx);
	}
}
</style>
