<template>
	<div v-if="visible" class="reward-stage" @click="handleOverlayTap">
		<div class="reward-stage__veil"></div>

		<!-- 金粉粒子 -->
		<div class="reward-stage__particles">
			<div v-for="i in 20" :key="i" class="reward-stage__particle" :style="particleStyle(i)"></div>
		</div>

		<div class="reward-stage__voucher" @click.stop>
			<!-- 卷轴上下轴 -->
			<div class="reward-stage__roll reward-stage__roll--top"></div>
			<div class="reward-stage__roll reward-stage__roll--bot"></div>
			<div class="reward-stage__seal"><span>领</span></div>

			<div class="reward-stage__paper">
				<div class="reward-stage__fiber"></div>

				<div class="reward-stage__head">
					<span class="reward-stage__eyebrow">— 旅 程 已 点 亮 —</span>
					<span class="reward-stage__title">{{ title }}</span>
				</div>

				<!-- 奖励列表 -->
				<div class="reward-stage__list">
					<div v-if="rewards.exp" class="reward-stage__item">
						<div class="reward-stage__item-stamp reward-stage__item-stamp--exp"><span>经</span></div>
						<span class="reward-stage__item-label">经 验</span>
						<span class="reward-stage__item-value">+{{ rewards.exp }}</span>
					</div>
					<div v-if="rewards.silver" class="reward-stage__item">
						<div class="reward-stage__item-stamp reward-stage__item-stamp--silver"><span>银</span></div>
						<span class="reward-stage__item-label">银 两</span>
						<span class="reward-stage__item-value">+{{ rewards.silver }}</span>
					</div>
					<div v-if="rewards.silverKey" class="reward-stage__item">
						<div class="reward-stage__item-stamp reward-stage__item-stamp--key"><span>钥</span></div>
						<span class="reward-stage__item-label">银 钥</span>
						<span class="reward-stage__item-value">+{{ rewards.silverKey }}</span>
					</div>
					<div v-if="rewards.score" class="reward-stage__item">
						<div class="reward-stage__item-stamp reward-stage__item-stamp--score"><span>印</span></div>
						<span class="reward-stage__item-label">积 分</span>
						<span class="reward-stage__item-value">+{{ rewards.score }}</span>
					</div>
				</div>

				<!-- 角色加成 -->
				<div v-if="roleBonus" class="reward-stage__bonus">
					<span class="reward-stage__bonus-label">— 身 份 加 成 —</span>
					<span class="reward-stage__bonus-text">{{ roleBonus }}</span>
				</div>

				<!-- 晋小鸦结语 -->
				<div class="reward-stage__npc">
					<img class="reward-stage__npc-img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
					<div class="reward-stage__npc-bubble">
						<span class="reward-stage__npc-line">{{ npcMessage }}</span>
					</div>
				</div>

				<!-- 收下铜印 -->
				<div class="reward-stage__claim" @click="handleClaim">
					<div class="reward-stage__claim-stamp">
						<span>收</span>
					</div>
					<span class="reward-stage__claim-text">收 下 入 册</span>
					<span class="reward-stage__claim-arrow">›</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
const props = defineProps({
	visible: { type: Boolean, default: false },
	title: { type: String, default: '任务完成' },
	rewards: {
		type: Object,
		default: () => ({ exp: 0, silver: 0, silverKey: 0, score: 0 })
	},
	roleBonus: { type: String, default: '' },
	npcMessage: { type: String, default: '干得漂亮，再往前走两步。' }
})

const emit = defineEmits(['claim', 'close'])

function handleClaim() {
	// 此处印章拍下声 pa 留给后期接入
	emit('claim')
}

function handleOverlayTap() { /* 不允许遮罩关闭 */ }

function particleStyle(i) {
	const left = (i * 13) % 100
	const top = (i * 17) % 100
	const delay = (i * 0.12) % 1.4
	const dur = 1.6 + (i % 4) * 0.3
	const size = 6 + (i % 3) * 4
	return `left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s;width:${(size) / 32}rem;height:${(size) / 32}rem;`
}
</script>

<style lang="scss" scoped>.reward-stage {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.reward-stage__veil {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 50%, rgba(255, 200, 130, 0.18) 0%, transparent 40%),
		rgba(0, 0, 0, 0.78);
	backdrop-filter: blur(12rpx);
	animation: fadeIn 0.4s ease both;
}

.reward-stage__particles {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.reward-stage__particle {
	position: absolute;
	background: radial-gradient(circle, rgba(255, 220, 130, 1) 0%, transparent 70%);
	border-radius: 50%;
	animation: rewardSpark linear infinite;
}

@keyframes rewardSpark {
	0%   { opacity: 0; transform: scale(0); }
	30%  { opacity: 1; }
	100% { opacity: 0; transform: scale(2.4); }
}

.reward-stage__voucher {
	position: relative;
	width: 88%;
	max-width: 640rpx;
	max-height: calc(100dvh - 64px);
	overflow: visible;
	animation: voucherPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes voucherPop {
	0%   { opacity: 0; transform: scale(0.7) translateY(40rpx); }
	100% { opacity: 1; transform: scale(1) translateY(0); }
}

.reward-stage__roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 28rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.reward-stage__roll--top { top: -14rpx; }
.reward-stage__roll--bot { bottom: -14rpx; }

.reward-stage__paper {
	position: relative;
	max-height: calc(100dvh - 64px);
	box-sizing: border-box;
	overflow-y: auto;
	overflow-x: hidden;
	overscroll-behavior: contain;
	scrollbar-width: thin;
	scrollbar-color: rgba(139, 69, 19, 0.4) transparent;
	padding: 50rpx 44rpx 36rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.97) 0%, rgba(232, 215, 180, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 22rpx 50rpx rgba(0, 0, 0, 0.6);
}

.reward-stage__fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.05) 0, rgba(139, 69, 19, 0.05) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx;
}

.reward-stage__paper > * { position: relative; z-index: 1; }

/* 拍下的红章 */
.reward-stage__seal {
	position: absolute;
	top: -32rpx;
	right: 60rpx;
	width: 100rpx;
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(196, 30, 58, 0.06);
	border: 6rpx solid $py-red;
	border-radius: 50%;
	color: $py-red;
	font-size: 30rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform: rotate(-12deg);
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.42);
	z-index: 3;
	animation: stampSlam 0.65s cubic-bezier(0.36, 1.6, 0.5, 1) both;
	animation-delay: 0.4s;
}

.reward-stage__seal::before {
	content: '';
	position: absolute;
	inset: 6rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.45);
	border-radius: 50%;
}

@keyframes stampSlam {
	0%   { transform: scale(2.6) rotate(8deg); opacity: 0; }
	60%  { transform: scale(0.92) rotate(-15deg); opacity: 1; }
	100% { transform: scale(1) rotate(-12deg); opacity: 1; }
}

.reward-stage__head {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	margin-bottom: 22rpx;
}

.reward-stage__eyebrow {
	font-size: 20rpx;
	letter-spacing: 10rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.reward-stage__title {
	font-size: 38rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
	text-align: center;
}

.reward-stage__list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.reward-stage__item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 14rpx 20rpx;
	background: rgba(255, 248, 239, 0.7);
	border: 1rpx solid rgba(110, 85, 65, 0.32);
	border-left: 4rpx solid $py-red;
	border-radius: 4rpx;
}

.reward-stage__item-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50rpx;
	height: 50rpx;
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 6rpx;
	transform: rotate(-6deg);
	flex-shrink: 0;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.42);
}

.reward-stage__item-stamp--exp    { background: $py-bronze; }
.reward-stage__item-stamp--silver { background: #6b3510; }
.reward-stage__item-stamp--key    { background: $py-gold; color: $py-ink; }
.reward-stage__item-stamp--score  { background: $py-red; }

.reward-stage__item-label {
	flex: 1;
	font-size: 24rpx;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.reward-stage__item-value {
	font-size: 32rpx;
	font-weight: 700;
	color: $py-red;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

/* 角色加成 */
.reward-stage__bonus {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	margin-top: 18rpx;
	padding: 14rpx 22rpx;
	background: rgba(196, 30, 58, 0.12);
	border: 1rpx dashed $py-red;
	border-radius: 4rpx;
}

.reward-stage__bonus-label {
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.reward-stage__bonus-text {
	font-size: 22rpx;
	color: #4a2a18;
	line-height: 1.7;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-align: center;
	letter-spacing: 1rpx;
}

/* NPC */
.reward-stage__npc {
	display: flex;
	align-items: flex-start;
	gap: 14rpx;
	margin-top: 22rpx;
	padding: 14rpx 18rpx;
	background: rgba(212, 165, 116, 0.18);
	border-radius: 6rpx;
}

.reward-stage__npc-img {
	width: 90rpx;
	height: 110rpx;
	flex-shrink: 0;
	animation: floatY 3s ease-in-out infinite;
}

.reward-stage__npc-bubble {
	flex: 1;
	min-width: 0;
}

.reward-stage__npc-line {
	font-size: 22rpx;
	line-height: 1.85;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

/* 收下铜印 */
.reward-stage__claim {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
	margin-top: 22rpx;
	padding: 18rpx 36rpx;
	background:
		linear-gradient(135deg, $py-red 0%, #8b1a2e 50%, $py-red 100%);
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 999rpx;
	color: $py-paper-warm;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.45),
		0 8rpx 20rpx rgba(196, 30, 58, 0.45);
	transition: transform 0.18s ease;
}

.reward-stage__claim:active {
	transform: scale(0.96) rotate(-1deg);
}

.reward-stage__claim-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 44rpx;
	background: $py-paper-warm;
	color: $py-red;
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.reward-stage__claim-text {
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 10rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.reward-stage__claim-arrow {
	font-size: 30rpx;
	color: rgba(255, 220, 220, 0.85);
	animation: arrowNudge 1.4s ease-in-out infinite;
}

@keyframes arrowNudge {
	0%, 100% { transform: translateX(0); }
	50%      { transform: translateX(6rpx); }
}

/* 手机横屏：竖排卷轴放不下 390px 高的视口，改成左奖励/右结语的双栏卷轴，禁止出现滚动条 */
@media screen and (orientation: landscape) and (max-height: 520px) {
	.reward-stage__voucher {
		width: min(92vw, 720px);
		max-width: none;
		max-height: calc(100dvh - 40px);
		overflow: visible;
	}

	.reward-stage__roll { height: 12px; left: -6px; right: -6px; }
	.reward-stage__roll--top { top: -6px; }
	.reward-stage__roll--bot { bottom: -6px; }

	.reward-stage__paper {
		max-height: calc(100dvh - 40px);
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		grid-template-areas:
			'head head'
			'list npc'
			'bonus claim';
		column-gap: 16px;
		row-gap: 8px;
		align-items: start;
		padding: 20px 26px 14px;
	}

	.reward-stage__seal {
		top: -12px;
		right: 22px;
		width: 52px;
		height: 52px;
		border-width: 3px;
		font-size: 16px;
	}

	.reward-stage__seal::before { inset: 3px; }

	.reward-stage__head { grid-area: head; gap: 2px; margin-bottom: 2px; }
	.reward-stage__eyebrow { font-size: 10px; letter-spacing: 5px; }
	.reward-stage__title { font-size: 20px; letter-spacing: 3px; }

	.reward-stage__list { grid-area: list; gap: 5px; }
	.reward-stage__item { gap: 8px; padding: 5px 10px; border-left-width: 2px; }
	.reward-stage__item-stamp { width: 24px; height: 24px; font-size: 11px; border-radius: 3px; }
	.reward-stage__item-label { font-size: 12px; letter-spacing: 2px; }
	.reward-stage__item-value { font-size: 16px; }

	.reward-stage__bonus { grid-area: bonus; margin-top: 0; gap: 2px; padding: 6px 10px; }
	.reward-stage__bonus-label { font-size: 9px; letter-spacing: 4px; }
	.reward-stage__bonus-text { font-size: 11px; line-height: 1.5; }

	.reward-stage__npc { grid-area: npc; align-self: stretch; margin-top: 0; gap: 8px; padding: 8px 10px; }
	.reward-stage__npc-img { width: 44px; height: 54px; }
	.reward-stage__npc-line { font-size: 12px; line-height: 1.6; }

	.reward-stage__claim { grid-area: claim; align-self: end; margin-top: 0; gap: 8px; padding: 9px 18px; border-width: 1px; }
	.reward-stage__claim-stamp { width: 22px; height: 22px; font-size: 12px; border-radius: 2px; }
	.reward-stage__claim-text { font-size: 14px; letter-spacing: 5px; }
	.reward-stage__claim-arrow { font-size: 15px; }
}
</style>
