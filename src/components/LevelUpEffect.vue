<template>
	<div v-if="visible" class="levelup-stage">
		<!-- 沙金光晕底色 -->
		<div class="levelup-stage__bg"></div>

		<!-- 体积光柱（从下而上）-->
		<div class="levelup-stage__beams">
			<div class="levelup-stage__beam levelup-stage__beam--1"></div>
			<div class="levelup-stage__beam levelup-stage__beam--2"></div>
			<div class="levelup-stage__beam levelup-stage__beam--3"></div>
			<div class="levelup-stage__beam levelup-stage__beam--4"></div>
		</div>

		<!-- 金粉粒子 -->
		<div class="levelup-stage__particles">
			<div v-for="i in 28" :key="i" class="levelup-stage__particle" :style="particleStyle(i)"></div>
		</div>

		<!-- 中央内容 -->
		<div class="levelup-stage__content">
			<span class="levelup-stage__eyebrow">— 官 印 加 章 —</span>

			<!-- 大印章 -->
			<div class="levelup-stage__seal">
				<div class="levelup-stage__seal-inner">
					<span class="levelup-stage__seal-num">{{ newLevel }}</span>
					<span class="levelup-stage__seal-bar"></span>
					<span class="levelup-stage__seal-char">阶</span>
				</div>
			</div>

			<span class="levelup-stage__title">晋 升 一 阶</span>

			<div class="levelup-stage__path">
				<span class="levelup-stage__path-old">{{ oldLevelName }}</span>
				<div class="levelup-stage__path-arrow">
					<div class="levelup-stage__path-arrow-line"></div>
					<span class="levelup-stage__path-arrow-tip">›</span>
				</div>
				<span class="levelup-stage__path-new">{{ newLevelName }}</span>
			</div>

			<!-- 晋小鸦祝贺 -->
			<div class="levelup-stage__npc">
				<img class="levelup-stage__npc-img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
				<div class="levelup-stage__npc-bubble">
					<span class="levelup-stage__npc-line">{{ congratsMessage }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	visible: { type: Boolean, default: false },
	oldLevel: { type: Number, default: 1 },
	newLevel: { type: Number, default: 2 },
	oldLevelName: { type: String, default: '票号学徒' },
	newLevelName: { type: String, default: '柜台伙计' }
})

const congratsMessage = computed(() => {
	const messages = {
		2: '柜台伙计了——往后能上手的活更多了。',
		3: '账房先生，对账本和人心都看得更深一层。',
		4: '大掌柜——你已经能担一座票号的事了。',
		5: '晋商传人，平遥这条路，你算是走通了。'
	}
	return messages[props.newLevel] || '又上一阶——再走一段，我陪你。'
})

function particleStyle(i) {
	const left = (i * 11) % 100
	const top = (i * 17) % 100
	const delay = (i * 0.08) % 1.5
	const dur = 1.4 + (i % 4) * 0.3
	const size = 6 + (i % 4) * 4
	return `left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s;width:${(size) / 32}rem;height:${(size) / 32}rem;`
}
</script>

<style lang="scss" scoped>.levelup-stage {
	position: fixed;
	inset: 0;
	z-index: 3000;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	animation: fadeIn 0.4s ease both;
}

.levelup-stage__bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(circle at 50% 50%, rgba(255, 215, 100, 0.32) 0%, transparent 35%),
		rgba(0, 0, 0, 0.85);
	backdrop-filter: blur(8rpx);
}

/* 光柱 */
.levelup-stage__beams {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.levelup-stage__beam {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 6rpx;
	height: 100vh;
	background: linear-gradient(180deg, transparent 0%, rgba(255, 220, 130, 0.85) 50%, transparent 100%);
	transform-origin: center top;
	animation: beamRotate 4s linear infinite;
	filter: blur(1rpx);
}

.levelup-stage__beam--1 { transform: translate(-50%, -50%) rotate(0deg);   animation-delay: 0s; }
.levelup-stage__beam--2 { transform: translate(-50%, -50%) rotate(45deg);  animation-delay: 0.5s; }
.levelup-stage__beam--3 { transform: translate(-50%, -50%) rotate(90deg);  animation-delay: 1s; }
.levelup-stage__beam--4 { transform: translate(-50%, -50%) rotate(135deg); animation-delay: 1.5s; }

@keyframes beamRotate {
	from { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.4; }
	50%  { opacity: 0.85; }
	to   { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.4; }
}

/* 金粉 */
.levelup-stage__particles {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.levelup-stage__particle {
	position: absolute;
	background: radial-gradient(circle, rgba(255, 220, 130, 1) 0%, transparent 70%);
	border-radius: 50%;
	animation: levelSpark linear infinite;
}

@keyframes levelSpark {
	0%   { opacity: 0; transform: scale(0.4); }
	30%  { opacity: 1; }
	100% { opacity: 0; transform: scale(2); }
}

/* 中央内容 */
.levelup-stage__content {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24rpx;
	animation: contentBoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes contentBoom {
	0%   { opacity: 0; transform: scale(0.6); }
	100% { opacity: 1; transform: scale(1); }
}

.levelup-stage__eyebrow {
	font-size: 22rpx;
	letter-spacing: 12rpx;
	color: rgba(255, 220, 130, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

/* 大印章 */
.levelup-stage__seal {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 240rpx;
	height: 240rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 8rpx solid $py-red;
	border-radius: 16rpx;
	transform: rotate(-6deg);
	animation: sealSlam 0.7s cubic-bezier(0.36, 1.6, 0.5, 1) both;
	box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.55), 0 0 60rpx rgba(196, 30, 58, 0.45);
}

.levelup-stage__seal::before {
	content: '';
	position: absolute;
	inset: 8rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.5);
	border-radius: 8rpx;
}

@keyframes sealSlam {
	0%   { transform: scale(2.6) rotate(8deg); opacity: 0; }
	60%  { transform: scale(0.92) rotate(-10deg); opacity: 1; }
	100% { transform: scale(1) rotate(-6deg); opacity: 1; }
}

.levelup-stage__seal-inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.levelup-stage__seal-num {
	font-size: 100rpx;
	font-weight: 700;
	line-height: 1;
	text-shadow: 0 0 4rpx rgba(196, 30, 58, 0.7);
}

.levelup-stage__seal-bar {
	width: 80rpx;
	height: 3rpx;
	background: $py-red;
}

.levelup-stage__seal-char {
	font-size: 30rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
}

/* 标题 */
.levelup-stage__title {
	font-size: 48rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 16rpx;
	text-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.7), 0 0 28rpx rgba(255, 220, 130, 0.65);
	animation: titleGlow 2s ease-in-out infinite;
}

@keyframes titleGlow {
	0%, 100% { text-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.7), 0 0 28rpx rgba(255, 220, 130, 0.65); }
	50%      { text-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.7), 0 0 48rpx rgba(255, 220, 130, 0.95); }
}

/* 路径 */
.levelup-stage__path {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.levelup-stage__path-old {
	font-size: 26rpx;
	color: rgba(255, 235, 200, 0.5);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-decoration: line-through;
}

.levelup-stage__path-arrow {
	display: flex;
	align-items: center;
	gap: 6rpx;
}

.levelup-stage__path-arrow-line {
	width: 30rpx;
	height: 2rpx;
	background: linear-gradient(90deg, transparent, $py-gold, $py-gold);
}

.levelup-stage__path-arrow-tip {
	font-size: 32rpx;
	color: $py-gold;
	line-height: 1;
}

.levelup-stage__path-new {
	font-size: 36rpx;
	font-weight: 700;
	color: $py-gold;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
	text-shadow: 0 2rpx 8rpx rgba(255, 220, 130, 0.65);
}

/* NPC */
.levelup-stage__npc {
	display: flex;
	align-items: flex-end;
	gap: 18rpx;
	margin-top: 18rpx;
}

.levelup-stage__npc-img {
	width: 160rpx;
	height: 200rpx;
	animation: floatY 3s ease-in-out infinite;
	filter: drop-shadow(0 12rpx 28rpx rgba(0, 0, 0, 0.55)) drop-shadow(0 0 24rpx rgba(255, 220, 130, 0.45));
}

.levelup-stage__npc-bubble {
	max-width: 380rpx;
	padding: 16rpx 22rpx;
	background: rgba(255, 248, 239, 0.94);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 4rpx 18rpx 18rpx 18rpx;
	box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.5);
	margin-bottom: 30rpx;
}

.levelup-stage__npc-line {
	font-size: 22rpx;
	line-height: 1.85;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

@media screen and (orientation: landscape) {
	.levelup-stage__seal { width: 200rpx; height: 200rpx; }
	.levelup-stage__seal-num { font-size: 80rpx; }
	.levelup-stage__title { font-size: 38rpx; }
	.levelup-stage__npc-img { width: 130rpx; height: 160rpx; }
}
</style>
