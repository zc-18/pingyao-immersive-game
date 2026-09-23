<template>
	<view v-if="visible" class="brush-loader" :class="{ 'brush-loader--inline': inline }">
		<view class="brush-loader__bg" v-if="!inline"></view>

		<view class="brush-loader__stage" role="status" aria-live="polite">
			<!-- 灯笼摇晃 -->
			<view class="brush-loader__lantern">
				<view class="brush-loader__lantern-cap"></view>
				<view class="brush-loader__lantern-body"></view>
			</view>

			<!-- 毛笔画圈 -->
			<view v-if="!failed" class="brush-loader__circle">
				<view class="brush-loader__arc"></view>
				<view class="brush-loader__brush"></view>
			</view>

			<text class="brush-loader__text">{{ failed ? '院落暂未准备好' : text || '晋小鸦正在张望…' }}</text>
			<text v-if="progress > 0" class="brush-loader__pct">{{ Math.floor(progress) }}%</text>

			<!-- 文化提示轮播：加载时滚动展示古城拾遗（遮蔽加载耗时 + 传递文旅文化）。 -->
			<view v-if="currentTip && !failed" class="brush-loader__tip">
				<text class="brush-loader__tip-label">— 古 城 拾 遗 —</text>
				<text :key="tipIndex" class="brush-loader__tip-text">{{ currentTip }}</text>
			</view>

			<!-- 加载阶段面包屑：卡住时这行文字会停在最后到达的阶段，便于定位是哪一步失败（视图就绪 / 加载库 X/7 / 搭建场景…）。 -->
			<text v-if="stage" class="brush-loader__stage-text">{{ stage }}</text>
			<!-- 提示 / 错误行：加载较慢或 renderjs 报错时把信息留在屏幕上，而非一闪而过的 toast。 -->
			<text v-if="hint" class="brush-loader__hint">{{ hint }}</text>
			<view v-if="showEscape" class="brush-loader__actions">
				<button class="brush-loader__escape" role="button" aria-label="重新加载" @tap="$emit('escape')">重新加载</button>
				<button class="brush-loader__return" role="button" aria-label="返回古城" @tap="$emit('return')">返回古城</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
	visible:    { type: Boolean, default: false },
	progress:   { type: Number, default: 0 },
	text:       { type: String, default: '' },
	stage:      { type: String, default: '' },
	hint:       { type: String, default: '' },
	showEscape: { type: Boolean, default: false },
	failed:     { type: Boolean, default: false },
	inline:     { type: Boolean, default: false },
	tips:       { type: Array, default: () => [] } // 文化提示轮播：加载时滚动展示，遮蔽耗时 + 传递文旅文化
})
defineEmits(['escape', 'return'])

/* 文化提示轮播：每 ~2.8s 切一条；仅在可见时计时，卸载/隐藏即清，杜绝遗留定时器。 */
const tipIndex = ref(0)
let tipTimer = null
const currentTip = computed(() => (props.tips && props.tips.length) ? props.tips[tipIndex.value % props.tips.length] : '')
function stopTipRotation() { if (tipTimer) { clearInterval(tipTimer); tipTimer = null } }
function startTipRotation() {
	stopTipRotation()
	if (!props.tips || props.tips.length <= 1) return
	tipTimer = setInterval(() => { tipIndex.value = (tipIndex.value + 1) % props.tips.length }, 2800)
}
watch(() => props.visible && !props.failed, (v) => { if (v) { startTipRotation() } else { stopTipRotation() } }, { immediate: true })
onUnmounted(stopTipRotation)
</script>

<style lang="scss" scoped>
.brush-loader {
	position: fixed;
	inset: 0;
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.brush-loader--inline {
	position: relative;
	inset: auto;
	z-index: auto;
	padding: 40rpx 0;
}

.brush-loader__bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(circle at 50% 50%, rgba(255, 200, 130, 0.06) 0%, transparent 35%),
		linear-gradient(180deg, rgba(13, 9, 7, 0.92) 0%, rgba(8, 6, 4, 0.96) 100%);
}

.brush-loader__stage {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 28rpx;
	width: min(680rpx, calc(100vw - 48rpx));
	max-height: calc(100dvh - 32rpx);
	overflow-y: auto;
}

/* ===== 灯笼 ===== */
.brush-loader__lantern {
	position: relative;
	transform-origin: top center;
	animation: lanternSway 2.8s ease-in-out infinite;
}

.brush-loader__lantern-cap {
	width: 36rpx;
	height: 12rpx;
	margin: 0 auto;
	background: linear-gradient(180deg, #d4a574 0%, #6b3510 100%);
	border-radius: 4rpx 4rpx 2rpx 2rpx;
}

.brush-loader__lantern-body {
	width: 80rpx;
	height: 110rpx;
	margin-top: -2rpx;
	border-radius: 40rpx 40rpx 40rpx 40rpx / 50rpx 50rpx 50rpx 50rpx;
	background:
		radial-gradient(ellipse at 35% 40%, rgba(255, 220, 160, 0.85) 0%, rgba(196, 30, 58, 0.82) 55%, rgba(110, 22, 34, 0.95) 100%);
	box-shadow: 0 0 36rpx rgba(255, 130, 60, 0.7);
	animation: lanternBreathe 2.4s ease-in-out infinite;
}

@keyframes lanternBreathe {
	0%, 100% { box-shadow: 0 0 36rpx rgba(255, 130, 60, 0.55); }
	50%      { box-shadow: 0 0 56rpx rgba(255, 165, 80, 0.95); }
}

/* ===== 毛笔画圈 ===== */
.brush-loader__circle {
	position: relative;
	width: 124rpx;
	height: 124rpx;
}

.brush-loader__arc {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	border: 4rpx solid rgba(212, 165, 116, 0.18);
	border-top-color: $py-gold;
	border-right-color: $py-gold;
	box-shadow: 0 0 16rpx rgba(212, 165, 116, 0.45);
	animation: brushSpin 1.4s linear infinite;
}

.brush-loader__brush {
	position: absolute;
	top: -6rpx;
	left: 50%;
	width: 10rpx;
	height: 36rpx;
	background: linear-gradient(180deg, #1a1411 0%, #6b3510 60%, #d4a574 100%);
	border-radius: 50% 50% 30% 30%;
	transform-origin: 50% 76rpx;
	animation: brushSpin 1.4s linear infinite;
	box-shadow: 0 0 6rpx rgba(0, 0, 0, 0.4);
}

@keyframes brushSpin {
	0%   { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.brush-loader__text {
	font-size: 15px;
	letter-spacing: 2px;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'Noto Serif SC', 'STSong', serif;
}

.brush-loader__pct {
	font-size: 26rpx;
	font-weight: 700;
	color: $py-gold;
	font-family: 'Noto Serif SC', 'STSong', serif;
	letter-spacing: 2rpx;
}

.brush-loader__stage-text {
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: rgba(212, 165, 116, 0.55);
	font-family: 'Noto Serif SC', 'STSong', serif;
	text-align: center;
	word-break: break-word;
}

/* ===== 文化提示轮播 ===== */
.brush-loader__tip {
	margin-top: 8rpx;
	max-width: 600rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 0 30rpx;
}

.brush-loader__tip-label {
	font-size: 16rpx;
	letter-spacing: 6rpx;
	color: rgba(212, 165, 116, 0.55);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.brush-loader__tip-text {
	font-size: 21rpx;
	line-height: 1.7;
	text-align: center;
	color: rgba(245, 240, 232, 0.9);
	letter-spacing: 1rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	animation: tipFade 0.6s ease both;
}

@keyframes tipFade {
	0%   { opacity: 0; transform: translateY(8rpx); }
	100% { opacity: 1; transform: translateY(0); }
}

.brush-loader__hint {
	margin-top: 4rpx;
	font-size: 13px;
	letter-spacing: 1rpx;
	color: rgba(231, 168, 120, 0.92);
	text-align: center;
	max-width: min(460px, 100%);
	line-height: 1.6;
	word-break: break-word;
}

.brush-loader__actions {
	display: flex;
	gap: 12px;
	margin-top: 12px;
	flex-shrink: 0;
}
.brush-loader__actions button {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 44px;
	min-width: 112px;
	margin: 0;
	line-height: 1.2;
	font-size: 14px;
	border-radius: 24px;
}
.brush-loader__actions button::after { border: 0; }
.brush-loader__return {
	color: #e1ccaa;
	background: #ffffff0c;
	border: 1px solid #a0845c;
	padding: 0 16px;
}
.brush-loader__escape {
	padding: 12rpx 36rpx;
	letter-spacing: 3rpx;
	color: #f5f0e8;
	border: 2rpx solid rgba(212, 165, 116, 0.6);
	border-radius: 40rpx;
	background: linear-gradient(180deg, rgba(139, 69, 19, 0.55) 0%, rgba(110, 53, 16, 0.7) 100%);
	box-shadow: 0 0 20rpx rgba(255, 140, 60, 0.35);
}

@media screen and (orientation: landscape) and (max-height: 520px) {
	.brush-loader__stage { width: min(560px, calc(100vw - 40px)); gap: 8px; }
	.brush-loader__lantern-cap { width: 18px; height: 6px; }
	.brush-loader__lantern-body { width: 40px; height: 52px; margin-top: -1px; border-radius: 20px / 24px; }
	.brush-loader__circle { width: 62px; height: 62px; }
	.brush-loader__arc { border-width: 2px; }
	.brush-loader__brush { top: -3px; width: 5px; height: 18px; transform-origin: 50% 38px; }
	.brush-loader__text { font-size: 15px; letter-spacing: 2px; }
	.brush-loader__pct { font-size: 13px; }
	.brush-loader__tip { max-width: 430px; gap: 3px; padding: 0 15px; }
	.brush-loader__tip-label { font-size: 9px; letter-spacing: 3px; }
	.brush-loader__tip-text { font-size: 11px; line-height: 1.45; }
	.brush-loader__stage-text { font-size: 10px; line-height: 1.4; }
	.brush-loader__hint { font-size: 13px; line-height: 1.6; }
	.brush-loader__escape { margin-top: 6px; padding: 7px 20px; border-width: 1px; font-size: 13px; letter-spacing: 2px; }
}
</style>
