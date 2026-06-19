<template>
	<view class="splash-stage" :class="['splash-stage--' + phase.key]">
		<!-- 背景层（远 → 近 三层视差）-->
		<ParallaxScene :tone="phase.key" :lanterns="phase.lanternsLit" :clouds="true" />

		<!-- 远城墙剪影（手绘）-->
		<view class="splash-wall">
			<view class="splash-wall__silhouette"></view>
			<view class="splash-wall__tower splash-wall__tower--l"></view>
			<view class="splash-wall__tower splash-wall__tower--r"></view>
		</view>

		<!-- 飞过的猫头鹰（晋小鸦掠影）-->
		<view class="splash-owl-flyby">
			<image class="splash-owl-flyby__img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
		</view>

		<!-- 飘落银杏叶 -->
		<FallingLeaves type="leaf" :density="14" />

		<!-- 屋顶剪影（最前层 - 比 ParallaxScene 更近）-->
		<view class="splash-roofs">
			<view class="splash-roof splash-roof--l"></view>
			<view class="splash-roof splash-roof--r"></view>
		</view>

		<!-- 中央内容 -->
		<view class="splash-center">
			<text class="splash-kicker">平 遥 古 城 · 沉 浸 式 行 旅</text>

			<!-- 印章式 LOGO -->
			<view class="splash-stamp" :class="{ 'splash-stamp--slammed': stampShown }">
				<view class="splash-stamp__inner">
					<text class="splash-stamp__text">{{ logoText[0] }}</text>
					<text class="splash-stamp__text">{{ logoText[1] }}</text>
					<text class="splash-stamp__text">{{ logoText[2] }}</text>
					<text class="splash-stamp__text">{{ logoText[3] }}</text>
				</view>
			</view>

			<text class="splash-headline">{{ headline }}</text>
			<text class="splash-desc">{{ introLine }}</text>
		</view>

		<!-- 晋小鸦立绘（栖在 LOGO 旁边）-->
		<view class="splash-owl">
			<image class="splash-owl__img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
			<view class="splash-owl__bubble">
				<text class="splash-owl__text">{{ npcCue }}</text>
			</view>
		</view>

		<!-- 底部毛笔字 -->
		<view class="splash-bottom">
			<text class="splash-status">{{ statusText }}</text>
			<view class="splash-enter-frame" @tap="handleEnter" :class="{ 'splash-enter-frame--lit': !isRouting }">
				<view class="splash-enter-frame__seal"></view>
				<text class="splash-enter-frame__text">{{ buttonText }}</text>
				<view class="splash-enter-frame__arrow">›</view>
			</view>
			<text class="splash-tap-hint">{{ buttonHint }}</text>
		</view>

		<!-- 城门过场（点击进入时叠在最上面）-->
		<GateTransition
			v-if="showGate"
			:visible="showGate"
			:plaque-text="'平 遥 古 城'"
			:title="entranceTitle"
			:desc="entranceDesc"
		/>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ParallaxScene from '@/components/ParallaxScene.vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import GateTransition from '@/components/GateTransition.vue'
import { getUserProfile, hasSelectedRole } from '@/common/utils/storage.js'
import { getGameSnapshot, getRuntimeState, markPageVisit } from '@/common/utils/game-state.js'
import { getCurrentPhase } from '@/common/utils/phase.js'
import { getCheckInPreview } from '@/common/utils/check-in.js'
import { playSFX, SFX } from '@/common/utils/audio.js'

const isRouting = ref(false)
const stampShown = ref(false)
const showGate = ref(false)
const profile = ref(getUserProfile())
const runtime = ref(getRuntimeState())
const snapshot = ref(getGameSnapshot())
const phase = ref(getCurrentPhase())
const checkInState = ref(getCheckInPreview())

const logoText = '平遥古城'

const hasRole = computed(() => hasSelectedRole(profile.value))
const sceneTitle = computed(() => snapshot.value.heroSceneTitle || '票号旧巷')
const headline = computed(() => {
	if (!hasRole.value) return '先定身份 · 再推一扇城门'
	return runtime.value.hasCompletedPrologue ? '古城还在等你续上' : '灯影已亮 · 入城即始'
})
const introLine = computed(() => {
	if (!hasRole.value) return '云海之中，山雾散开，平遥古城在夕阳里静静等你。挑一种身份，让第一段路、第一位人物先向你靠近。'
	return snapshot.value.heroNpcLine || snapshot.value.journeyCopy?.introLine || snapshot.value.currentStreet.subtitle
})
const npcCue = computed(() => {
	if (!hasRole.value) return '今晚先定身份，再开城门。'
	if (!checkInState.value.alreadyCheckedIn) return `今日「${phase.value.label}」时辰已到，先盖一枚行旅章。`
	return runtime.value.hasCompletedPrologue ? '上次你停在街口，我替你记着。' : '走，先把入城这一程稳稳点亮。'
})
const statusText = computed(() => {
	if (!hasRole.value) return '— 身份未定 · 主线封在城门后 —'
	if (!runtime.value.hasCompletedPrologue) return `— 已选「${profile.value.roleName}」· 主线待启 —`
	return `— 上次停在「${sceneTitle.value}」· 时辰：${phase.value.label} —`
})
const buttonText = computed(() => {
	if (!hasRole.value) return '择 身 份'
	return runtime.value.hasCompletedPrologue ? '续 旅 程' : '入 古 城'
})
const buttonHint = computed(() => {
	if (!hasRole.value) return '— 轻 触 城 门 ·  开 启 —'
	if (!checkInState.value.alreadyCheckedIn) return `— 今 日 银 钥 +${checkInState.value.nextReward.silverKey} 等 你 收 章 —`
	return '— 轻 触 城 门 ·  开 启 —'
})
const entranceTitle = computed(() => sceneTitle.value || '票号旧巷')
const entranceDesc = computed(() => '城门徐徐推开，光从门缝中漏出。一脚踏入青石板街，把第一段引线点亮。')

onShow(() => {
	markPageVisit('splash')
	profile.value = getUserProfile()
	runtime.value = getRuntimeState()
	snapshot.value = getGameSnapshot()
	phase.value = getCurrentPhase()
	checkInState.value = getCheckInPreview()
	isRouting.value = false
	showGate.value = false
})

onMounted(() => {
	// 印章在 0.6s 后"啪"地拍下
	setTimeout(() => {
		stampShown.value = true
		playSFX(SFX.QUEST_START) // 印章拍下声（缺素材时静默兜底）
	}, 600)
})

function handleEnter() {
	if (isRouting.value) return
	isRouting.value = true
	playSFX(SFX.DOOR_OPEN) // 推门入城声（缺素材时静默兜底）

	// 城门过场动画 → 路由
	showGate.value = true
	setTimeout(() => {
		if (!hasRole.value) {
			uni.navigateTo({ url: '/pages_game/role-select/role-select' })
		} else {
			uni.reLaunch({ url: '/pages_game/street/street' })
		}
	}, 1600)

	setTimeout(() => {
		isRouting.value = false
	}, 2000)
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.splash-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	overflow: hidden;
	background: linear-gradient(180deg, #2a1a14 0%, #1a1108 50%, #050308 100%);
}

.splash-stage--dawn {
	background: linear-gradient(180deg, #f0c89c 0%, #e0a075 35%, #6b3510 90%, #1a1411 100%);
}

.splash-stage--noon {
	background: linear-gradient(180deg, #d7c0a2 0%, #a08e72 50%, #2c1810 100%);
}

.splash-stage--dusk {
	background: linear-gradient(180deg, #f59e4a 0%, #c41e3a 35%, #5a2d0e 75%, #0d0907 100%);
}

.splash-stage--night {
	background: linear-gradient(180deg, #1a2438 0%, #0e1422 50%, #050308 100%);
}

/* ===== 远城墙剪影 ===== */
.splash-wall {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 22%;
	height: 18%;
	z-index: 2;
	pointer-events: none;
}

.splash-wall__silhouette {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(40, 26, 18, 0.95) 0%, rgba(20, 12, 8, 1) 100%);
	clip-path: polygon(
		0 100%, 0 60%,
		8% 60%, 8% 40%, 16% 40%, 16% 60%,
		28% 60%, 28% 32%, 36% 32%, 36% 60%,
		48% 60%, 48% 22%, 56% 22%, 56% 60%,
		68% 60%, 68% 36%, 76% 36%, 76% 60%,
		88% 60%, 88% 44%, 96% 44%, 96% 60%,
		100% 60%, 100% 100%
	);
	box-shadow: 0 -8rpx 32rpx rgba(255, 130, 60, 0.18);
}

.splash-wall__tower {
	position: absolute;
	bottom: 60%;
	width: 56rpx;
	height: 70rpx;
	background: linear-gradient(180deg, rgba(40, 26, 18, 0.98) 0%, rgba(20, 12, 8, 1) 100%);
	clip-path: polygon(0 100%, 0 60%, 50% 0, 100% 60%, 100% 100%);
}

.splash-wall__tower--l { left: 18%; }
.splash-wall__tower--r { right: 22%; }

/* ===== 屋顶剪影（更近）===== */
.splash-roofs {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 12%;
	height: 12%;
	z-index: 3;
	pointer-events: none;
}

.splash-roof {
	position: absolute;
	bottom: 0;
	height: 100%;
	background: linear-gradient(180deg, rgba(20, 12, 8, 1) 0%, rgba(10, 6, 4, 1) 100%);
}

.splash-roof--l {
	left: 0;
	width: 30%;
	clip-path: polygon(0 100%, 0 50%, 30% 0, 70% 0, 100% 50%, 100% 100%);
}

.splash-roof--r {
	right: 0;
	width: 35%;
	clip-path: polygon(0 100%, 0 60%, 25% 0, 60% 0, 95% 60%, 100% 100%);
}

/* ===== 飞过的猫头鹰 ===== */
.splash-owl-flyby {
	position: absolute;
	top: 12%;
	left: -10%;
	z-index: 4;
	width: 80rpx;
	height: 100rpx;
	animation: owlSwoop 6s ease-in-out infinite;
	animation-delay: 1.2s;
	opacity: 0.55;
}

.splash-owl-flyby__img {
	width: 100%;
	height: 100%;
	filter: brightness(0.6) drop-shadow(0 4rpx 12rpx rgba(0, 0, 0, 0.55));
}

@keyframes owlSwoop {
	0%   { left: -10%; top: 16%; transform: rotate(-6deg); opacity: 0; }
	15%  { opacity: 0.55; }
	50%  { left: 50%; top: 8%; transform: rotate(0); }
	85%  { opacity: 0.55; }
	100% { left: 110%; top: 16%; transform: rotate(8deg); opacity: 0; }
}

/* ===== 中央内容 ===== */
.splash-center {
	position: relative;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding-top: calc(env(safe-area-inset-top) + 100rpx);
	padding-left: 60rpx;
	padding-right: 60rpx;
	text-align: center;
}

.splash-kicker {
	font-size: 22rpx;
	letter-spacing: 10rpx;
	color: rgba(212, 165, 116, 0.78);
	animation: fadeIn 1s ease both;
	animation-delay: 0.2s;
	opacity: 0;
}

/* 印章 LOGO */
.splash-stamp {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 280rpx;
	height: 280rpx;
	margin-top: 10rpx;
	color: $py-red;
	background: rgba(255, 248, 239, 0.04);
	border: 8rpx solid $py-red;
	border-radius: 16rpx;
	box-shadow: 0 0 60rpx rgba(196, 30, 58, 0.45);
	transform: scale(0) rotate(15deg);
	opacity: 0;
}

.splash-stamp::before {
	content: '';
	position: absolute;
	inset: 8rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.55);
	border-radius: 8rpx;
	pointer-events: none;
}

.splash-stamp--slammed {
	animation: stampSlam 0.7s cubic-bezier(0.36, 1.6, 0.5, 1) both;
}

@keyframes stampSlam {
	0%   { transform: scale(2.6) rotate(12deg); opacity: 0; }
	50%  { transform: scale(0.92) rotate(-6deg); opacity: 1; }
	75%  { transform: scale(1.06) rotate(-2deg); }
	100% { transform: scale(1) rotate(-3deg); opacity: 1; }
}

.splash-stamp__inner {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 14rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.splash-stamp__text {
	font-size: 96rpx;
	font-weight: 700;
	color: $py-red;
	line-height: 1;
	text-shadow: 0 0 4rpx rgba(196, 30, 58, 0.65);
}

.splash-headline {
	margin-top: 18rpx;
	font-size: 52rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.6), 0 0 20rpx rgba(255, 200, 130, 0.32);
	animation: fadeInUp 1.2s ease both;
	animation-delay: 1.2s;
	opacity: 0;
}

.splash-desc {
	max-width: 580rpx;
	margin-top: 10rpx;
	font-size: 22rpx;
	line-height: 1.95;
	letter-spacing: 2rpx;
	color: rgba(255, 248, 239, 0.7);
	animation: fadeInUp 1.2s ease both;
	animation-delay: 1.5s;
	opacity: 0;
}

/* ===== 晋小鸦立绘 ===== */
.splash-owl {
	position: absolute;
	right: 60rpx;
	top: 32%;
	z-index: 6;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10rpx;
	animation: fadeIn 1s ease both;
	animation-delay: 1.8s;
	opacity: 0;
}

.splash-owl__img {
	width: 160rpx;
	height: 200rpx;
	animation: floatY 3.4s ease-in-out infinite;
	filter: drop-shadow(0 8rpx 24rpx rgba(0, 0, 0, 0.55));
}

.splash-owl__bubble {
	position: relative;
	max-width: 280rpx;
	padding: 14rpx 18rpx;
	background: rgba(255, 248, 239, 0.93);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 16rpx 16rpx 4rpx 16rpx;
	box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.45);
}

.splash-owl__bubble::after {
	content: '';
	position: absolute;
	right: -12rpx;
	top: 24rpx;
	width: 0;
	height: 0;
	border-top: 10rpx solid transparent;
	border-bottom: 10rpx solid transparent;
	border-left: 12rpx solid rgba(255, 248, 239, 0.93);
}

.splash-owl__text {
	font-size: 22rpx;
	line-height: 1.75;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

/* ===== 底部 ===== */
.splash-bottom {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 7;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 0 60rpx calc(env(safe-area-inset-bottom) + 60rpx);
	animation: fadeInUp 1.2s ease both;
	animation-delay: 2.2s;
	opacity: 0;
}

.splash-status {
	font-size: 22rpx;
	letter-spacing: 6rpx;
	color: rgba(212, 165, 116, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.6);
}

/* 牌匾按钮 */
.splash-enter-frame {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 18rpx;
	min-width: 480rpx;
	padding: 24rpx 80rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(135deg, #6b3510 0%, #8b4513 35%, #d4a574 50%, #8b4513 65%, #4a2a18 100%);
	border: 2rpx solid rgba(255, 220, 170, 0.45);
	border-radius: 8rpx;
	color: $py-paper-warm;
	font-size: 36rpx;
	font-weight: 700;
	letter-spacing: 14rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.45), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.5),
		inset 0 -4rpx 10rpx rgba(0, 0, 0, 0.4),
		0 12rpx 28rpx rgba(0, 0, 0, 0.55),
		0 0 36rpx rgba(255, 200, 130, 0.18);
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1);
}

.splash-enter-frame::before,
.splash-enter-frame::after {
	content: '';
	position: absolute;
	top: -14rpx;
	width: 28rpx;
	height: 18rpx;
	background: #4a2a18;
	border-radius: 4rpx 4rpx 0 0;
}

.splash-enter-frame::before { left: 16rpx; transform: skewX(-20deg); }
.splash-enter-frame::after  { right: 16rpx; transform: skewX(20deg); }

.splash-enter-frame--lit {
	animation: copperShimmer 4s ease-in-out infinite;
}

.splash-enter-frame:active {
	transform: scale(0.96) translateY(2rpx);
	box-shadow: inset 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.splash-enter-frame__seal {
	position: absolute;
	top: -22rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 40rpx;
	height: 28rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
}

.splash-enter-frame__arrow {
	font-size: 36rpx;
	font-weight: 300;
	letter-spacing: 0;
	color: rgba(255, 235, 200, 0.85);
	animation: arrowNudge 1.6s ease-in-out infinite;
}

@keyframes arrowNudge {
	0%, 100% { transform: translateX(0); }
	50%      { transform: translateX(8rpx); }
}

.splash-tap-hint {
	font-size: 20rpx;
	letter-spacing: 6rpx;
	color: rgba(212, 165, 116, 0.55);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}
</style>
