<template>
	<view class="role-stage">
		<!-- 客栈背景：木格屏风 + 红灯笼 + 远处炊烟 -->
		<view class="role-stage__bg"></view>
		<view class="role-stage__lattice"></view>
		<view class="role-stage__smoke role-stage__smoke--1"></view>
		<view class="role-stage__smoke role-stage__smoke--2"></view>

		<!-- 顶部红灯笼一排 -->
		<view class="role-stage__lanterns">
			<LanternHanger :count="6" :lit="true" />
		</view>

		<!-- 飘落樱花 -->
		<FallingLeaves type="cherry" :density="10" />

		<!-- 标题 -->
		<view class="role-title-bar">
			<view class="role-title-bar__plaque">
				<view class="role-title-bar__ribbon"></view>
				<text class="role-title-bar__text">择 身 入 城</text>
			</view>
			<text class="role-title-bar__subtitle">— 五位旅人 · 各自有缘 —</text>
		</view>

		<!-- 晋小鸦点评 -->
		<view class="role-owl">
			<image class="role-owl__img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
			<view class="role-owl__bubble">
				<text class="role-owl__name">晋 小 鸦</text>
				<text class="role-owl__line">{{ npcGreeting }}</text>
			</view>
		</view>

		<!-- 五位站位（横向并列）-->
		<view class="role-row">
			<view
				v-for="(role, index) in roleList"
				:key="role.id"
				class="role-figure"
				role="button" tabindex="0" :aria-label="role.name" :aria-pressed="index === currentIndex"
				@keydown.enter.prevent="currentIndex = index" @keydown.space.prevent="currentIndex = index"
				:class="{ 'role-figure--active': index === currentIndex, 'role-figure--dim': index !== currentIndex }"
				@tap="currentIndex = index"
			>
				<!-- 站立光圈（仅当前选中可见）-->
				<view v-if="index === currentIndex" class="role-figure__halo"></view>

				<!-- 立绘 -->
				<image class="role-figure__img" :src="getRoleImage(role.id)" mode="aspectFit" />

				<!-- 木匾名牌 -->
				<view class="role-figure__nameplate">
					<text class="role-figure__name">{{ role.name }}</text>
					<view v-if="index === currentIndex" class="role-figure__nameplate-stamp">
						<text>选</text>
					</view>
				</view>

				<!-- 当前选中：右下小幌子（横向竹简）-->
				<view v-if="index === currentIndex" class="role-figure__banner">
					<text class="role-figure__banner-tag">{{ role.subtitle }}</text>
					<text class="role-figure__banner-bonus">{{ role.bonus }}</text>
				</view>
			</view>
		</view>

		<!-- 底部导览 -->
		<view class="role-pager">
			<view class="role-pager__arrow" @tap="switchRole(-1)">
				<text>‹</text>
			</view>
			<view class="role-pager__dots">
				<view
					v-for="(role, index) in roleList"
					:key="role.id"
					class="role-pager__dot"
					:class="{ 'role-pager__dot--active': index === currentIndex }"
					@tap="currentIndex = index"
				></view>
			</view>
			<view class="role-pager__arrow" @tap="switchRole(1)">
				<text>›</text>
			</view>
		</view>

		<!-- 角色心境（卷轴）-->
		<view class="role-motto">
			<view class="role-motto__paper">
				<text class="role-motto__text">「{{ currentRole.motto }}」</text>
			</view>
		</view>

		<!-- 确认令牌 -->
		<view class="role-bottom">
			<view
				class="role-confirm-token"
				role="button" tabindex="0" :aria-label="'以' + currentRole.name + '入城'"
				@keydown.enter.prevent="confirmRole" @keydown.space.prevent="confirmRole"
				:class="{ 'role-confirm-token--locked': isSubmitting }"
				@tap="confirmRole"
			>
				<view class="role-confirm-token__cord"></view>
				<view class="role-confirm-token__head">
					<text class="role-confirm-token__head-char">{{ currentRole.avatar }}</text>
				</view>
				<view class="role-confirm-token__body">
					<text class="role-confirm-token__body-char">此 乃 吾 身</text>
					<text class="role-confirm-token__body-sub">— 以 {{ currentRole.name }} 入 城 —</text>
				</view>
			</view>
		</view>

		<!-- 城门过场 -->
		<GateTransition
			v-if="showGate"
			:visible="showGate"
			plaque-text="平 遥 古 城"
			:title="currentRole.name + ' · 入城'"
			desc="令牌飞向城门，门轴吱呀一响，光从门缝中漏出。"
		/>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import LanternHanger from '@/components/LanternHanger.vue'
import GateTransition from '@/components/GateTransition.vue'
import { roleList } from '@/common/data/roles.js'
import { patchStorageObject, STORAGE_KEYS } from '@/common/utils/storage.js'
import { markPageVisit, patchRuntimeState } from '@/common/utils/game-state.js'
import { playSFX, SFX } from '@/common/utils/audio.js'
import { lockGameLandscape } from '@/common/utils/orientation.js'

const currentIndex = ref(0)
const isSubmitting = ref(false)
const showGate = ref(false)
const currentRole = computed(() => roleList[currentIndex.value] || roleList[0])

onShow(() => {
	lockGameLandscape()
	markPageVisit('role-select')
})

const npcGreeting = computed(() => {
	return {
		study: '— 你适合从票号、文庙和账本里读城。',
		treasure: '— 你适合在街角和暗线里找惊喜。',
		encounter: '— 你适合慢走，不必赶路。',
		checkin: '— 你适合收集地标与旅印。',
		helper: '— 你适合和商户、街坊打交道。'
	}[currentRole.value.id] || '— 入城前先定一个身份，让古城知道你是谁。'
})

function getRoleImage(roleId) {
	return {
		study: '/static/img/role_scholar.png',
		treasure: '/static/img/role_treasure_hunter.png',
		encounter: '/static/img/role_wanderer.png',
		checkin: '/static/img/role_checkin_fan.png',
		helper: '/static/img/role_helper.png'
	}[roleId] || '/static/img/role_scholar.png'
}

function switchRole(direction) {
	if (isSubmitting.value) return
	currentIndex.value = (currentIndex.value + direction + roleList.length) % roleList.length
	playSFX(SFX.BUTTON_CLICK) // 切换身份的铜铃轻响（缺素材时静默兜底）
}

function confirmRole() {
	if (isSubmitting.value) return
	isSubmitting.value = true
	// 印章拍下声：启程音效（缺素材时静默兜底）
	playSFX(SFX.QUEST_START)

	patchStorageObject(STORAGE_KEYS.userProfile, {
		roleId: currentRole.value.id,
		roleName: currentRole.value.name,
		roleSubtitle: currentRole.value.subtitle,
		roleMotto: currentRole.value.motto,
		avatarType: currentRole.value.avatar,
		roleSelectedAt: Date.now()
	})
	patchRuntimeState({
		currentStreetScene: 'bank-house',
		pendingArrivalScene: 'bank-house',
		hasCompletedPrologue: false,
		hasEnteredStreet: false
	})

	showGate.value = true
	setTimeout(() => {
		uni.reLaunch({ url: '/pages_game/street/street' })
	}, 1700)
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.role-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	min-height: 100dvh;
	overflow: hidden;
	background: linear-gradient(180deg, #2a1810 0%, #1a0d08 60%, #0a0604 100%);
	padding-bottom: calc(env(safe-area-inset-bottom) + 280rpx);
}

/* ===== 客栈背景：木格屏风 ===== */
.role-stage__bg {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 0%, rgba(255, 130, 60, 0.18) 0%, transparent 35%),
		radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.7) 0%, transparent 50%),
		linear-gradient(180deg, #3a1f12 0%, #1a0d08 80%);
	pointer-events: none;
}

.role-stage__lattice {
	position: absolute;
	left: 0;
	right: 0;
	top: 110rpx;
	bottom: 30%;
	background:
		repeating-linear-gradient(0deg, rgba(40, 22, 14, 0.45) 0, rgba(40, 22, 14, 0.45) 4rpx, transparent 4rpx, transparent 80rpx),
		repeating-linear-gradient(90deg, rgba(40, 22, 14, 0.4) 0, rgba(40, 22, 14, 0.4) 4rpx, transparent 4rpx, transparent 110rpx);
	mix-blend-mode: multiply;
	opacity: 0.55;
	pointer-events: none;
}

.role-stage__smoke {
	position: absolute;
	width: 240rpx;
	height: 320rpx;
	background: radial-gradient(ellipse at 50% 100%, rgba(255, 248, 239, 0.18) 0%, transparent 70%);
	border-radius: 50%;
	filter: blur(20rpx);
	animation: smokeRise 12s ease-in-out infinite;
	pointer-events: none;
}

.role-stage__smoke--1 { left: 6%;  bottom: 26%; animation-delay: 0s; }
.role-stage__smoke--2 { right: 10%; bottom: 30%; animation-delay: 5s; opacity: 0.6; }

@keyframes smokeRise {
	0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.2; }
	50%      { transform: translateY(-60rpx) scale(1.2); opacity: 0.45; }
}

/* ===== 顶部灯笼 ===== */
.role-stage__lanterns {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	z-index: 5;
	padding: 0 6%;
	pointer-events: none;
}

/* ===== 标题 ===== */
.role-title-bar {
	position: relative;
	z-index: 8;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	margin-top: calc(env(safe-area-inset-top) + 200rpx);
	animation: fadeInUp 0.6s ease both;
}

.role-title-bar__plaque {
	position: relative;
	padding: 14rpx 56rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 38rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 14rpx;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.5),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
}

.role-title-bar__plaque::before,
.role-title-bar__plaque::after {
	content: '';
	position: absolute;
	top: -10rpx;
	width: 28rpx;
	height: 18rpx;
	background: #2a1810;
	border-radius: 4rpx 4rpx 0 0;
}

.role-title-bar__plaque::before { left: 18rpx; transform: skewX(-20deg); }
.role-title-bar__plaque::after  { right: 18rpx; transform: skewX(20deg); }

.role-title-bar__ribbon {
	position: absolute;
	top: -22rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 44rpx;
	height: 26rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.role-title-bar__subtitle {
	font-size: 22rpx;
	letter-spacing: 8rpx;
	color: rgba(212, 165, 116, 0.8);
}

/* ===== 晋小鸦 ===== */
.role-owl {
	position: absolute;
	left: 24rpx;
	top: calc(env(safe-area-inset-top) + 180rpx);
	z-index: 9;
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	max-width: 460rpx;
	animation: fadeInUp 0.6s ease 0.3s both;
}

.role-owl__img {
	width: 96rpx;
	height: 120rpx;
	flex-shrink: 0;
	animation: floatY 3.4s ease-in-out infinite;
	filter: drop-shadow(0 4rpx 12rpx rgba(0, 0, 0, 0.5));
}

.role-owl__bubble {
	position: relative;
	max-width: 360rpx;
	padding: 16rpx 20rpx;
	background: rgba(255, 248, 239, 0.94);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 4rpx 18rpx 18rpx 18rpx;
	box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.42);
}

.role-owl__bubble::before {
	content: '';
	position: absolute;
	left: -12rpx;
	top: 28rpx;
	width: 0;
	height: 0;
	border-top: 10rpx solid transparent;
	border-bottom: 10rpx solid transparent;
	border-right: 12rpx solid rgba(255, 248, 239, 0.94);
}

.role-owl__name {
	display: block;
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.role-owl__line {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.7;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

/* ===== 五位站位 ===== */
.role-row {
	position: relative;
	z-index: 6;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 0;
	margin-top: 50rpx;
	padding: 0 60rpx;
	height: 600rpx;
}

.role-figure {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 18%;
	transition: all 0.4s cubic-bezier(0.2, 0.8, 0.4, 1);
	cursor: pointer;
	animation: fadeInUp 0.6s ease both;
	transform-origin: bottom center;
}

.role-figure:nth-child(1) { animation-delay: 0.1s; }
.role-figure:nth-child(2) { animation-delay: 0.2s; }
.role-figure:nth-child(3) { animation-delay: 0.3s; }
.role-figure:nth-child(4) { animation-delay: 0.4s; }
.role-figure:nth-child(5) { animation-delay: 0.5s; }

.role-figure--active {
	transform: scale(1.18) translateY(-30rpx);
	z-index: 5;
}

.role-figure--dim {
	opacity: 0.45;
	filter: grayscale(0.6) brightness(0.7);
	transform: scale(0.86);
}

.role-figure__halo {
	position: absolute;
	bottom: 30rpx;
	left: 50%;
	width: 220rpx;
	height: 80rpx;
	background:
		radial-gradient(ellipse at 50% 50%, rgba(255, 215, 100, 0.55) 0%, transparent 70%);
	transform: translateX(-50%);
	z-index: 1;
	animation: pulseGlow 2.4s ease-in-out infinite;
	pointer-events: none;
}

.role-figure__img {
	position: relative;
	z-index: 2;
	width: 220rpx;
	height: 460rpx;
	filter: drop-shadow(0 12rpx 32rpx rgba(0, 0, 0, 0.7));
}

.role-figure--active .role-figure__img {
	filter: drop-shadow(0 12rpx 36rpx rgba(0, 0, 0, 0.7)) drop-shadow(0 0 24rpx rgba(255, 215, 100, 0.45));
}

/* 木匾名牌 */
.role-figure__nameplate {
	position: relative;
	z-index: 3;
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: -12rpx;
	padding: 12rpx 24rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #8b4513 50%, #4a2a18 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.45),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.4),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.35), 0 2rpx 0 rgba(0, 0, 0, 0.45);
}

.role-figure__nameplate-stamp {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36rpx;
	height: 36rpx;
	background: $py-red;
	border: 2rpx solid rgba(255, 200, 200, 0.45);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 20rpx;
	font-weight: 700;
	transform: rotate(-6deg);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

/* 横向小竹简 */
.role-figure__banner {
	position: absolute;
	bottom: -120rpx;
	left: 50%;
	transform: translateX(-50%);
	z-index: 4;
	width: 320rpx;
	padding: 18rpx 28rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.96) 0%, rgba(245, 240, 232, 0.94) 100%),
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	background-blend-mode: multiply;
	border-radius: 4rpx;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.55);
	animation: bannerDrop 0.5s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

.role-figure__banner::before,
.role-figure__banner::after {
	content: '';
	position: absolute;
	top: -8rpx;
	bottom: -8rpx;
	width: 22rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.45);
}

.role-figure__banner::before { left: -10rpx; }
.role-figure__banner::after  { right: -10rpx; }

@keyframes bannerDrop {
	0%   { opacity: 0; transform: translate(-50%, -20rpx) scale(0.92); }
	100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

.role-figure__banner-tag {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	line-height: 1.5;
}

.role-figure__banner-bonus {
	display: block;
	margin-top: 6rpx;
	font-size: 19rpx;
	line-height: 1.7;
	color: rgba(110, 85, 65, 0.95);
}

/* ===== 翻页 ===== */
.role-pager {
	position: relative;
	z-index: 7;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 32rpx;
	margin-top: 240rpx;
}

.role-pager__arrow {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.35) 0%, transparent 35%), linear-gradient(135deg, #4a2a18 0%, #8b4513 50%, #4a2a18 100%);
	color: $py-gold;
	font-size: 38rpx;
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	box-shadow: inset 0 0 0 2rpx rgba(255, 235, 195, 0.18), 0 6rpx 12rpx rgba(0, 0, 0, 0.5);
	transition: transform 0.18s ease;
}

.role-pager__arrow:active {
	transform: scale(0.92);
}

.role-pager__dots {
	display: flex;
	gap: 14rpx;
}

.role-pager__dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: rgba(212, 165, 116, 0.28);
	border: 1rpx solid rgba(212, 165, 116, 0.4);
	transition: all 0.3s ease;
}

.role-pager__dot--active {
	width: 38rpx;
	border-radius: 999rpx;
	background: $py-red;
	box-shadow: 0 0 14rpx rgba(196, 30, 58, 0.55);
}

/* ===== 心境卷轴 ===== */
.role-motto {
	position: relative;
	z-index: 6;
	display: flex;
	justify-content: center;
	margin-top: 40rpx;
	padding: 0 60rpx;
	animation: fadeInUp 0.6s ease 0.6s both;
}

.role-motto__paper {
	position: relative;
	max-width: 560rpx;
	padding: 24rpx 56rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 240, 232, 0.94) 100%);
	border-radius: 4rpx;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.55);
}

.role-motto__paper::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.025) 0, rgba(139, 69, 19, 0.025) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.role-motto__paper::after,
.role-motto__paper::before {
	border-radius: 4rpx;
}

.role-motto__paper > * {
	position: relative;
	z-index: 1;
}

.role-motto__text {
	font-size: 26rpx;
	line-height: 1.85;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-align: center;
}

/* ===== 确认令牌 ===== */
.role-bottom {
	position: fixed;
	left: 0;
	right: 0;
	bottom: calc(env(safe-area-inset-bottom) + 40rpx);
	z-index: 10;
	display: flex;
	justify-content: center;
	pointer-events: none;
}

.role-confirm-token {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	pointer-events: auto;
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1);
	animation: tokenFloat 3s ease-in-out infinite;
}

.role-confirm-token:active {
	transform: scale(0.94) rotate(-2deg);
}

.role-confirm-token--locked {
	pointer-events: none;
	opacity: 0.6;
}

.role-confirm-token__cord {
	width: 14rpx;
	height: 14rpx;
	margin-bottom: -2rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f5d76e 0%, #8b4513 70%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.6);
	z-index: 3;
}

.role-confirm-token__head {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 25%, rgba(255, 220, 220, 0.6) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #8b1a2e 100%);
	border: 3rpx solid rgba(255, 220, 220, 0.5);
	box-shadow:
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.45),
		0 8rpx 16rpx rgba(0, 0, 0, 0.55),
		0 0 24rpx rgba(196, 30, 58, 0.45);
}

.role-confirm-token__head-char {
	font-size: 50rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6), 0 0 8rpx rgba(255, 220, 220, 0.4);
}

.role-confirm-token__body {
	margin-top: -10rpx;
	padding: 22rpx 40rpx 18rpx;
	min-width: 320rpx;
	background:
		linear-gradient(180deg, #6b1622 0%, #c41e3a 35%, #6b1622 100%);
	clip-path: polygon(8% 0, 92% 0, 100% 14%, 100% 100%, 0 100%, 0 14%);
	border-radius: 6rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.32),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.5),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
}

.role-confirm-token__body-char {
	font-size: 32rpx;
	font-weight: 700;
	color: $py-paper-warm;
	letter-spacing: 12rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.role-confirm-token__body-sub {
	font-size: 18rpx;
	color: rgba(255, 220, 220, 0.85);
	letter-spacing: 4rpx;
}

@keyframes tokenFloat {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-10rpx); }
}

/* 核心游戏在 APP 中锁横屏；这些规则同时让浏览器横屏和系统拒绝旋转时都有可用布局。 */
@media screen and (orientation: landscape) and (max-height: 520px) {
	.role-stage {
		height: 100vh;
		height: 100dvh;
		min-height: 0;
		padding: 0;
	}
	.role-stage__lattice { top: 48px; bottom: 8%; }
	.role-stage__lanterns { height: 62px; padding: 0 4%; overflow: hidden; opacity: 0.72; }

	.role-title-bar {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(env(safe-area-inset-top) + 8px);
		margin: 0;
		gap: 4px;
	}
	.role-title-bar__plaque { padding: 7px 26px; border-width: 1px; font-size: 18px; letter-spacing: 6px; }
	.role-title-bar__plaque::before,
	.role-title-bar__plaque::after { top: -5px; width: 14px; height: 9px; border-radius: 2px 2px 0 0; }
	.role-title-bar__ribbon { top: -11px; width: 22px; height: 13px; }
	.role-title-bar__subtitle { font-size: 10px; letter-spacing: 3px; }

	.role-owl {
		left: calc(env(safe-area-inset-left) + 10px);
		top: calc(env(safe-area-inset-top) + 8px);
		gap: 6px;
		max-width: 210px;
	}
	.role-owl__img { width: 48px; height: 56px; }
	.role-owl__bubble { max-width: 156px; padding: 7px 9px; border-width: 1px; border-radius: 2px 8px 8px 8px; }
	.role-owl__bubble::before { left: -6px; top: 14px; border-top-width: 5px; border-bottom-width: 5px; border-right-width: 6px; }
	.role-owl__name { font-size: 9px; letter-spacing: 2px; }
	.role-owl__line { margin-top: 2px; font-size: 10px; line-height: 1.4; letter-spacing: 0; }

	.role-row {
		position: absolute;
		left: 0;
		right: 0;
		top: 66px;
		bottom: 58px;
		height: auto;
		margin: 0;
		padding: 0 70px;
	}
	.role-figure { width: 20%; }
	.role-figure--active { transform: scale(1.06) translateY(-4px); }
	.role-figure--dim { transform: scale(0.9); }
	.role-figure__img { width: min(112px, 14vw); height: min(190px, 49vh); }
	.role-figure__halo { bottom: 15px; width: 108px; height: 36px; }
	.role-figure__nameplate { margin-top: -6px; padding: 6px 10px; border-width: 1px; font-size: 12px; letter-spacing: 1px; }
	.role-figure__nameplate-stamp { width: 18px; height: 18px; border-width: 1px; font-size: 10px; }
	.role-figure__banner {
		position: fixed;
		left: calc(env(safe-area-inset-left) + 12px);
		bottom: calc(env(safe-area-inset-bottom) + 10px);
		width: 210px;
		padding: 8px 14px;
		transform: none;
		animation: none;
	}
	.role-figure__banner::before,
	.role-figure__banner::after { top: -4px; bottom: -4px; width: 11px; }
	.role-figure__banner::before { left: -5px; }
	.role-figure__banner::after { right: -5px; }
	.role-figure__banner-tag { font-size: 11px; line-height: 1.35; }
	.role-figure__banner-bonus { margin-top: 2px; font-size: 9px; line-height: 1.35; }

	.role-pager { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 13px); margin: 0; gap: 12px; transform: translateX(-50%); }
	.role-pager__arrow { width: 40px; height: 40px; border-width: 1px; font-size: 22px; }
	.role-pager__dots { gap: 6px; }
	.role-pager__dot { width: 7px; height: 7px; border-width: 1px; }
	.role-pager__dot--active { width: 19px; }
	.role-motto { display: none; }

	.role-bottom { left: auto; right: calc(env(safe-area-inset-right) + 12px); bottom: calc(env(safe-area-inset-bottom) + 10px); }
	.role-confirm-token { flex-direction: row; animation: none; }
	.role-confirm-token__cord { display: none; }
	.role-confirm-token__head { width: 40px; height: 40px; border-width: 1px; z-index: 2; }
	.role-confirm-token__head-char { font-size: 22px; }
	.role-confirm-token__body { min-width: 142px; margin: 0 0 0 -6px; padding: 8px 12px 7px 16px; }
	.role-confirm-token__body-char { font-size: 14px; letter-spacing: 4px; }
	.role-confirm-token__body-sub { font-size: 8px; letter-spacing: 1px; }
}

@media screen and (orientation: portrait) and (max-width: 600px) {
	.role-stage {
		height: 100vh;
		height: 100dvh;
		min-height: 0;
		padding: 0;
	}
	.role-stage__lattice { top: 64px; bottom: 10%; }
	.role-stage__lanterns { height: 72px; padding: 0 3%; overflow: hidden; opacity: 0.72; }

	.role-title-bar {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(env(safe-area-inset-top) + 72px);
		margin: 0;
		gap: 5px;
	}
	.role-title-bar__plaque { padding: 8px 26px; border-width: 1px; font-size: 20px; letter-spacing: 6px; }
	.role-title-bar__subtitle { font-size: 10px; letter-spacing: 3px; }

	.role-owl {
		left: 10px;
		top: calc(env(safe-area-inset-top) + 136px);
		gap: 7px;
		max-width: calc(100vw - 20px);
	}
	.role-owl__img { width: 52px; height: 62px; }
	.role-owl__bubble { max-width: calc(100vw - 90px); padding: 8px 11px; border-width: 1px; border-radius: 2px 9px 9px 9px; }
	.role-owl__bubble::before { left: -6px; top: 14px; border-top-width: 5px; border-bottom-width: 5px; border-right-width: 6px; }
	.role-owl__name { font-size: 10px; letter-spacing: 3px; }
	.role-owl__line { margin-top: 2px; font-size: 12px; line-height: 1.45; letter-spacing: 0; }

	.role-row {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(env(safe-area-inset-top) + 215px);
		bottom: 214px;
		height: auto;
		margin: 0;
		padding: 0 24px;
	}
	.role-figure { display: none; width: 100%; height: 100%; }
	.role-figure--active { display: flex; transform: none; }
	.role-figure__img { width: min(62vw, 250px); height: calc(100% - 40px); min-height: 0; }
	.role-figure__halo { bottom: 22px; width: 170px; height: 52px; }
	.role-figure__nameplate { margin-top: -6px; padding: 7px 14px; border-width: 1px; font-size: 14px; letter-spacing: 2px; }
	.role-figure__nameplate-stamp { width: 20px; height: 20px; border-width: 1px; font-size: 11px; }
	.role-figure__banner {
		position: fixed;
		left: 50%;
		bottom: 158px;
		width: min(320px, calc(100vw - 32px));
		padding: 9px 16px;
		transform: translateX(-50%);
		animation: none;
	}
	.role-figure__banner::before,
	.role-figure__banner::after { top: -4px; bottom: -4px; width: 11px; }
	.role-figure__banner::before { left: -5px; }
	.role-figure__banner::after { right: -5px; }
	.role-figure__banner-tag { font-size: 12px; line-height: 1.35; }
	.role-figure__banner-bonus { margin-top: 2px; font-size: 10px; line-height: 1.35; }

	.role-pager { position: fixed; left: 50%; bottom: 100px; margin: 0; gap: 16px; transform: translateX(-50%); }
	.role-pager__arrow { width: 42px; height: 42px; border-width: 1px; font-size: 22px; }
	.role-pager__dots { gap: 7px; }
	.role-pager__dot { width: 7px; height: 7px; border-width: 1px; }
	.role-pager__dot--active { width: 20px; }
	.role-motto { display: none; }

	.role-bottom { bottom: calc(env(safe-area-inset-bottom) + 16px); }
	.role-confirm-token { flex-direction: row; animation: none; }
	.role-confirm-token__cord { display: none; }
	.role-confirm-token__head { width: 44px; height: 44px; border-width: 1px; z-index: 2; }
	.role-confirm-token__head-char { font-size: 24px; }
	.role-confirm-token__body { min-width: 190px; margin: 0 0 0 -7px; padding: 9px 18px 8px 22px; }
	.role-confirm-token__body-char { font-size: 16px; letter-spacing: 5px; }
	.role-confirm-token__body-sub { font-size: 9px; letter-spacing: 2px; }
}
@media screen and (min-width: 1000px) and (min-height: 560px) {
	.role-figure:focus-visible, .role-confirm-token:focus-visible { outline: 2px solid #d4a574; outline-offset: 8px; border-radius: 6px; }
	.role-stage { height: 100vh; height: 100dvh; min-height: 0; overflow: hidden; }
	.role-title-bar { position: absolute; top: 7%; left: 0; right: 0; margin: 0; gap: 12px; }
	.role-title-bar__plaque { padding: 12px 40px; font-size: 26px; letter-spacing: 9px; }
	.role-title-bar__subtitle { font-size: 13px; letter-spacing: 5px; }
	.role-owl { top: 6%; left: 28px; max-width: 265px; }
	.role-owl__line { font-size: 12px; }
	.role-row { position: absolute; left: 6%; right: 6%; top: 23%; bottom: 24%; height: auto; margin: 0; padding: 0; gap: 20px; align-items: flex-start; }
	.role-figure { width: 18%; height: calc(100% - 82px); transform: none; cursor: pointer; }
	.role-figure__img { height: calc(100% - 44px); width: 100%; max-width: 230px; min-height: 0; }
	.role-figure__nameplate { font-size: 16px; padding: 10px 18px; margin-top: 0; }
	.role-figure__banner { bottom: -88px; width: 100%; max-width: 225px; box-sizing: border-box; padding: 10px 14px; }
	.role-figure__banner-tag { font-size: 13px; }
	.role-figure__banner-bonus { font-size: 12px; line-height: 1.5; }
	.role-figure--active { transform: none; }
	.role-figure--dim { opacity: .65; }
	.role-figure:hover { opacity: 1; }
	.role-pager { display: none; }
	.role-motto { position: absolute; bottom: 8%; left: 8%; width: 46%; margin: 0; }
	.role-motto__paper { width: 100%; max-width: 560px; padding: 16px 24px; }
	.role-motto__text { font-size: 16px; line-height: 1.7; }
	.role-bottom { position: absolute; left: auto; right: 12%; bottom: 7%; width: auto; margin: 0; padding: 0; }
	.role-confirm-token { animation: none; display: flex; align-items: center; cursor: pointer; }
	.role-confirm-token__body { margin: 0 0 0 -8px; padding: 18px 40px; }
	.role-confirm-token__body-char { font-size: 22px; }
	.role-confirm-token__body-sub { font-size: 12px; }
	.role-confirm-token__cord { display: none; }
}
</style>
