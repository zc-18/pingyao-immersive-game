<template>
	<view class="hub-stage">
		<!-- 视差背景：远山 + 屋顶 + 灯笼 -->
		<ParallaxScene tone="dusk" :lanterns="true" :clouds="true" />

		<!-- 飘落银杏 -->
		<FallingLeaves type="leaf" :density="12" />

		<!-- 顶部 HUD（左：等级官印 + 头像；右：腰包资产）-->
		<view class="hub-stage__top">
			<view class="hub-stage__profile">
				<view class="hub-stage__avatar">
					<view class="hub-stage__avatar-rim"></view>
					<view class="hub-stage__avatar-inner">
						<image v-if="roleImage" class="hub-stage__avatar-img" :src="roleImage" mode="aspectFit" />
					</view>
					<view class="hub-stage__avatar-seal">
						<text>{{ snapshot.level.level }}</text>
					</view>
				</view>
				<view class="hub-stage__profile-info">
					<text class="hub-stage__profile-name">{{ snapshot.profile.roleName || '平遥行客' }}</text>
					<text class="hub-stage__profile-title">{{ snapshot.level.title }}</text>
				</view>
			</view>

			<view class="hub-stage__pouch">
				<view class="hub-stage__pouch-cell">
					<view class="hub-stage__pouch-coin"></view>
					<text class="hub-stage__pouch-value">{{ snapshot.progress.silverKey }}</text>
				</view>
				<view class="hub-stage__pouch-divider"></view>
				<view class="hub-stage__pouch-cell">
					<view class="hub-stage__pouch-step">
						<view class="hub-stage__pouch-step-print"></view>
						<view class="hub-stage__pouch-step-print hub-stage__pouch-step-print--2"></view>
					</view>
					<text class="hub-stage__pouch-value">{{ snapshot.progress.steps }}</text>
				</view>
			</view>
		</view>

		<!-- 中央电影舞台：晋小鸦悬空 + 角色立绘 -->
		<view class="hub-stage__main">
			<!-- 舞台底光圈 -->
			<view class="hub-stage__floor-glow"></view>

			<!-- 晋小鸦（左上空中）-->
			<view class="hub-stage__owl">
				<image class="hub-stage__owl-img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
				<view class="hub-stage__owl-perch"></view>
			</view>

			<!-- 角色立绘（中央主舞台）-->
			<view class="hub-stage__role">
				<image class="hub-stage__role-img" :src="roleImage" mode="aspectFit" />
				<view class="hub-stage__role-shadow"></view>
			</view>

			<!-- 任务进度悬挂（角色右侧，竹简式）-->
			<view class="hub-stage__quest-stick">
				<view class="hub-stage__quest-stick-cord"></view>
				<view class="hub-stage__quest-stick-stamp">
					<text>主</text>
				</view>
				<view class="hub-stage__quest-stick-info">
					<text class="hub-stage__quest-stick-title">{{ currentQuestTitle }}</text>
					<view class="hub-stage__quest-stick-bar">
						<view class="hub-stage__quest-stick-bar-fill" :style="{ width: snapshot.questProgress + '%' }"></view>
					</view>
					<text class="hub-stage__quest-stick-progress">{{ snapshot.questProgress }}% · 进行中</text>
				</view>
				<view class="hub-stage__quest-stick-tassel"></view>
			</view>
		</view>

		<!-- 晋小鸦对话条（横跨底部，紧凑卷条样式）-->
		<view class="hub-stage__npc-bar">
			<view class="hub-stage__npc-bar-roll hub-stage__npc-bar-roll--l"></view>
			<view class="hub-stage__npc-bar-roll hub-stage__npc-bar-roll--r"></view>
			<view class="hub-stage__npc-bar-paper">
				<view class="hub-stage__npc-bar-fiber"></view>
				<view class="hub-stage__npc-bar-content">
					<view class="hub-stage__npc-bar-text">
						<text class="hub-stage__npc-bar-name">晋小鸦</text>
						<text class="hub-stage__npc-bar-line">{{ snapshot.heroNpcLine }}</text>
						<view class="hub-stage__npc-bar-route">
							<view class="hub-stage__npc-bar-dot"></view>
							<text class="hub-stage__npc-bar-route-text">{{ taskLine }}</text>
						</view>
					</view>
					<view class="hub-stage__npc-bar-cta" @tap="goExplore">
						<view class="hub-stage__npc-bar-cta-stamp">
							<text>启</text>
						</view>
						<text class="hub-stage__npc-bar-cta-text">{{ primaryActionLabel }}</text>
						<text class="hub-stage__npc-bar-cta-arrow">›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部门洞导航（4 个城门入口）-->
		<view class="hub-stage__gates">
			<view class="hub-stage__gates-beam"></view>

			<!-- 横幅信息条：时辰 / 签到 / 成就 -->
			<view class="hub-stage__ribbon">
				<view class="hub-stage__ribbon-cell">
					<text class="hub-stage__ribbon-tag">时</text>
					<text class="hub-stage__ribbon-text">{{ phase.label }} · {{ phase.caption }}</text>
				</view>
				<view
					v-if="checkInBadge"
					class="hub-stage__ribbon-cell hub-stage__ribbon-cell--accent"
					@tap="goUser"
				>
					<text class="hub-stage__ribbon-tag hub-stage__ribbon-tag--red">签</text>
					<text class="hub-stage__ribbon-text">{{ checkInBadge }}</text>
					<text class="hub-stage__ribbon-arrow">›</text>
				</view>
				<view class="hub-stage__ribbon-cell" @tap="goUser">
					<text class="hub-stage__ribbon-tag">章</text>
					<text class="hub-stage__ribbon-text">{{ achvBadge }}</text>
					<text class="hub-stage__ribbon-arrow">›</text>
				</view>
			</view>

			<view class="hub-stage__gate" @tap="goExplore">
				<view class="hub-stage__gate-arch hub-stage__gate-arch--street">
					<view class="hub-stage__gate-light"></view>
					<text class="hub-stage__gate-glyph">街</text>
				</view>
				<text class="hub-stage__gate-name">入街景</text>
			</view>

			<view class="hub-stage__gate" @tap="goMap">
				<view class="hub-stage__gate-arch hub-stage__gate-arch--map">
					<view class="hub-stage__gate-light"></view>
					<text class="hub-stage__gate-glyph">图</text>
				</view>
				<text class="hub-stage__gate-name">览胜图</text>
			</view>

			<view class="hub-stage__gate" @tap="goShop">
				<view class="hub-stage__gate-arch hub-stage__gate-arch--shop">
					<view class="hub-stage__gate-light"></view>
					<text class="hub-stage__gate-glyph">肆</text>
				</view>
				<text class="hub-stage__gate-name">瑞蚨祥</text>
			</view>

			<view class="hub-stage__gate" @tap="goUser">
				<view class="hub-stage__gate-arch hub-stage__gate-arch--user">
					<view class="hub-stage__gate-light"></view>
					<text class="hub-stage__gate-glyph">册</text>
				</view>
				<text class="hub-stage__gate-name">行旅册</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ParallaxScene from '@/components/ParallaxScene.vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import { getGameSnapshot, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { getCheckInPreview } from '@/common/utils/check-in.js'
import { getAchievementSummary, syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { getCurrentPhase } from '@/common/utils/phase.js'

const snapshot = ref(getGameSnapshot())
const checkInPreview = ref(getCheckInPreview())
const achvSummary = ref(getAchievementSummary())
const phase = ref(getCurrentPhase())

const currentQuestTitle = computed(() => snapshot.value.trackedQuest?.title || '自由探索')
const taskLine = computed(() => snapshot.value.journeyCopy?.approachLine || snapshot.value.currentStreet.playerHint)
const primaryActionLabel = computed(() => snapshot.value.primaryActionLabel || '继续主线')
const checkInBadge = computed(() => {
	if (checkInPreview.value.alreadyCheckedIn) return ''
	return `今 日 ·  连 ${checkInPreview.value.nextStreak} 日 +${checkInPreview.value.nextReward.silverKey} 钥`
})
const achvBadge = computed(() => `${achvSummary.value.unlockedCount} / ${achvSummary.value.total} 章`)
const roleImage = computed(() => {
	const roleId = snapshot.value.profile.roleId
	return {
		study: '/static/img/role_scholar.png',
		treasure: '/static/img/role_treasure_hunter.png',
		encounter: '/static/img/role_wanderer.png',
		checkin: '/static/img/role_checkin_fan.png',
		helper: '/static/img/role_helper.png'
	}[roleId] || '/static/img/role_wanderer.png'
})

onShow(() => {
	markPageVisit('index', { returnPage: '/pages_game/street/street' })
	rememberReturnContext('/pages_game/street/street', '')
	syncAchievementUnlocks()
	snapshot.value = getGameSnapshot()
	checkInPreview.value = getCheckInPreview()
	achvSummary.value = getAchievementSummary()
	phase.value = getCurrentPhase()
})

function goExplore() { uni.navigateTo({ url: '/pages_game/street/street' }) }
function goMap()     { uni.switchTab({ url: '/pages/map/map' }) }
function goShop()    { uni.switchTab({ url: '/pages/shop/shop' }) }
function goUser()    { uni.switchTab({ url: '/pages/user/user' }) }
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.hub-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background: linear-gradient(180deg, #1a0d08 0%, #0a0604 100%);
	overflow: hidden;
	padding-bottom: calc(env(safe-area-inset-bottom) + 132rpx);
	box-sizing: border-box;
}

/* ===== 顶部 HUD ===== */
.hub-stage__top {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	padding: calc(env(safe-area-inset-top) + 22rpx) 28rpx 0;
	animation: fadeInUp 0.6s ease both;
}

.hub-stage__profile {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.hub-stage__avatar {
	position: relative;
	width: 92rpx;
	height: 92rpx;
}

.hub-stage__avatar-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
}

.hub-stage__avatar-inner {
	position: absolute;
	inset: 6rpx;
	border-radius: 50%;
	overflow: hidden;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.85) 0%, rgba(196, 150, 90, 0.95) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.hub-stage__avatar-img {
	width: 100%;
	height: 100%;
}

.hub-stage__avatar-seal {
	position: absolute;
	right: -6rpx;
	bottom: -2rpx;
	width: 38rpx;
	height: 38rpx;
	background: $py-red;
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 5rpx;
	transform: rotate(-6deg);
	display: flex;
	align-items: center;
	justify-content: center;
	color: $py-paper-warm;
	font-size: 20rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 3rpx 6rpx rgba(0, 0, 0, 0.55);
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__profile-info {
	display: flex;
	flex-direction: column;
	gap: 2rpx;
}

.hub-stage__profile-name {
	font-size: 24rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__profile-title {
	font-size: 18rpx;
	color: rgba(212, 165, 116, 0.78);
	letter-spacing: 4rpx;
}

/* === 腰包 === */
.hub-stage__pouch {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 10rpx 22rpx;
	background:
		linear-gradient(180deg, #4a2a18 0%, #6b3510 50%, #4a2a18 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	border-radius: 999rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.4),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.5),
		0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

.hub-stage__pouch-cell {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.hub-stage__pouch-coin {
	width: 28rpx;
	height: 28rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	position: relative;
	box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__pouch-coin::after {
	content: '';
	position: absolute;
	left: 50%;
	top: 50%;
	width: 6rpx;
	height: 6rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
}

.hub-stage__pouch-step {
	position: relative;
	width: 28rpx;
	height: 28rpx;
}

.hub-stage__pouch-step-print {
	position: absolute;
	left: 4rpx;
	top: 6rpx;
	width: 8rpx;
	height: 14rpx;
	background: $py-gold;
	border-radius: 50% 50% 30% 30%;
}

.hub-stage__pouch-step-print--2 {
	left: auto;
	right: 4rpx;
	top: auto;
	bottom: 4rpx;
	opacity: 0.7;
	transform: rotate(15deg);
}

.hub-stage__pouch-value {
	font-size: 22rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__pouch-divider {
	width: 1rpx;
	height: 26rpx;
	background: rgba(212, 165, 116, 0.42);
}

/* ===== 中央电影舞台 ===== */
.hub-stage__main {
	position: relative;
	z-index: 4;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	margin-top: 24rpx;
	min-height: 540rpx;
	padding: 0 36rpx;
}

.hub-stage__floor-glow {
	position: absolute;
	left: 50%;
	bottom: 30rpx;
	width: 460rpx;
	height: 80rpx;
	transform: translateX(-50%);
	background:
		radial-gradient(ellipse at 50% 50%, rgba(255, 215, 100, 0.45) 0%, transparent 70%);
	pointer-events: none;
	animation: floorBreath 3.5s ease-in-out infinite;
}

@keyframes floorBreath {
	0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
	50%      { opacity: 1; transform: translateX(-50%) scale(1.12); }
}

.hub-stage__role {
	position: relative;
	z-index: 3;
	animation: heroEnter 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) 0.1s both;
}

@keyframes heroEnter {
	0%   { opacity: 0; transform: translateY(40rpx); }
	100% { opacity: 1; transform: translateY(0); }
}

.hub-stage__role-img {
	width: 360rpx;
	height: 500rpx;
	filter: drop-shadow(0 18rpx 44rpx rgba(0, 0, 0, 0.78));
}

.hub-stage__role-shadow {
	position: absolute;
	bottom: 12rpx;
	left: 50%;
	width: 240rpx;
	height: 28rpx;
	background: radial-gradient(ellipse at 50% 50%, rgba(255, 215, 100, 0.32) 0%, transparent 70%);
	transform: translateX(-50%);
}

/* 晋小鸦（左上空中飞翔）*/
.hub-stage__owl {
	position: absolute;
	top: 0;
	left: 4%;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: owlFloat 4s ease-in-out infinite;
}

@keyframes owlFloat {
	0%, 100% { transform: translateY(0) rotate(-3deg); }
	50%      { transform: translateY(-12rpx) rotate(3deg); }
}

.hub-stage__owl-img {
	width: 150rpx;
	height: 180rpx;
	filter: drop-shadow(0 12rpx 28rpx rgba(0, 0, 0, 0.55));
}

.hub-stage__owl-perch {
	width: 80rpx;
	height: 4rpx;
	background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.55), transparent);
	margin-top: -8rpx;
	border-radius: 999rpx;
}

/* 任务竹简（右上悬挂）*/
.hub-stage__quest-stick {
	position: absolute;
	top: 0;
	right: 4%;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 200rpx;
	animation: questStickDrop 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

@keyframes questStickDrop {
	0%   { opacity: 0; transform: translateY(-30rpx); }
	100% { opacity: 1; transform: translateY(0); }
}

.hub-stage__quest-stick-cord {
	width: 1rpx;
	height: 16rpx;
	background: rgba(212, 165, 116, 0.55);
}

.hub-stage__quest-stick-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 38rpx;
	height: 38rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	margin-bottom: 6rpx;
}

.hub-stage__quest-stick-stamp::before {
	content: '';
	position: absolute;
	inset: 3rpx;
	border: 1rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 2rpx;
}

.hub-stage__quest-stick-info {
	position: relative;
	width: 100%;
	padding: 14rpx 12rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.95) 0%, rgba(218, 196, 158, 0.92) 100%);
	border-top: 3rpx solid rgba(110, 85, 65, 0.45);
	border-bottom: 3rpx solid rgba(110, 85, 65, 0.45);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 248, 239, 0.45),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	animation: stickSway 5s ease-in-out infinite;
	transform-origin: top center;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	align-items: center;
}

.hub-stage__quest-stick-info::before,
.hub-stage__quest-stick-info::after {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	width: 5rpx;
	background: linear-gradient(180deg, #6b3510 0%, #4a2a18 50%, #2a1810 100%);
}

.hub-stage__quest-stick-info::before { left: 0; }
.hub-stage__quest-stick-info::after  { right: 0; }

@keyframes stickSway {
	0%, 100% { transform: rotate(-1deg); }
	50%      { transform: rotate(1deg); }
}

.hub-stage__quest-stick-title {
	font-size: 18rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-align: center;
	max-width: 160rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hub-stage__quest-stick-bar {
	width: 140rpx;
	height: 6rpx;
	background: rgba(110, 85, 65, 0.18);
	border-radius: 999rpx;
	overflow: hidden;
}

.hub-stage__quest-stick-bar-fill {
	height: 100%;
	background: linear-gradient(90deg, $py-red 0%, #ff6c80 100%);
	border-radius: 999rpx;
	transition: width 0.7s ease;
	box-shadow: 0 0 8rpx rgba(196, 30, 58, 0.55);
}

.hub-stage__quest-stick-progress {
	font-size: 14rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 2rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.hub-stage__quest-stick-tassel {
	width: 14rpx;
	height: 28rpx;
	background:
		linear-gradient(180deg, $py-gold 0%, $py-bronze 100%);
	clip-path: polygon(20% 0, 80% 0, 100% 100%, 50% 70%, 0 100%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

/* ===== 晋小鸦对话条 ===== */
.hub-stage__npc-bar {
	position: relative;
	z-index: 5;
	margin: 24rpx 32rpx 0;
	animation: fadeInUp 0.7s ease 0.5s both;
}

.hub-stage__npc-bar-roll {
	position: absolute;
	top: -8rpx;
	bottom: -8rpx;
	width: 22rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.hub-stage__npc-bar-roll--l { left: -11rpx; }
.hub-stage__npc-bar-roll--r { right: -11rpx; }

.hub-stage__npc-bar-paper {
	position: relative;
	padding: 18rpx 22rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-radius: 4rpx;
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.55);
	overflow: hidden;
}

.hub-stage__npc-bar-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 4rpx;
}

.hub-stage__npc-bar-content {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.hub-stage__npc-bar-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.hub-stage__npc-bar-name {
	font-size: 16rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.hub-stage__npc-bar-line {
	font-size: 22rpx;
	line-height: 1.55;
	color: $py-ink-soft;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.hub-stage__npc-bar-route {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 4rpx;
	padding: 6rpx 10rpx;
	background: rgba(212, 165, 116, 0.18);
	border-left: 3rpx solid $py-bronze;
	border-radius: 0 4rpx 4rpx 0;
}

.hub-stage__npc-bar-dot {
	flex-shrink: 0;
	width: 10rpx;
	height: 10rpx;
	background: $py-bronze;
	border-radius: 50%;
	box-shadow: 0 0 6rpx rgba(212, 165, 116, 0.65);
	animation: routeDotPulse 1.6s ease-in-out infinite;
}

@keyframes routeDotPulse {
	0%, 100% { transform: scale(1); opacity: 1; }
	50%      { transform: scale(1.25); opacity: 0.7; }
}

.hub-stage__npc-bar-route-text {
	flex: 1;
	font-size: 18rpx;
	line-height: 1.55;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.hub-stage__npc-bar-cta {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	padding: 12rpx 18rpx;
	background:
		linear-gradient(135deg, $py-red 0%, #8b1a2e 50%, $py-red 100%);
	color: $py-paper-warm;
	border-radius: 8rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.45),
		0 6rpx 14rpx rgba(196, 30, 58, 0.42);
	transition: transform 0.18s ease;
	min-width: 110rpx;
}

.hub-stage__npc-bar-cta:active {
	transform: scale(0.94);
}

.hub-stage__npc-bar-cta-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32rpx;
	height: 32rpx;
	background: $py-paper-warm;
	color: $py-red;
	font-size: 20rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__npc-bar-cta-text {
	font-size: 20rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.hub-stage__npc-bar-cta-arrow {
	font-size: 22rpx;
	color: rgba(255, 220, 220, 0.85);
	animation: arrowNudge 1.6s ease-in-out infinite;
}

@keyframes arrowNudge {
	0%, 100% { transform: translateX(0); }
	50%      { transform: translateX(6rpx); }
}

/* ===== 底部门洞导航 ===== */
.hub-stage__gates {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	gap: 8rpx;
	margin: 30rpx 32rpx 0;
	padding-top: 22rpx;
	animation: fadeInUp 0.7s ease 0.6s both;
}

.hub-stage__gates-beam {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	top: 0;
	height: 12rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 60rpx);
	background-blend-mode: multiply;
	border-bottom: 1rpx solid rgba(0, 0, 0, 0.6);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

/* === 横幅信息条 === */
.hub-stage__ribbon {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	top: -36rpx;
	display: flex;
	gap: 8rpx;
	z-index: 6;
	pointer-events: none;
}

.hub-stage__ribbon-cell {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 6rpx;
	min-width: 0;
	padding: 6rpx 10rpx;
	background: rgba(26, 16, 8, 0.78);
	border: 1rpx solid rgba(212, 165, 116, 0.4);
	border-radius: 4rpx;
	pointer-events: auto;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.55);
	transition: transform 0.18s ease;
}

.hub-stage__ribbon-cell:active {
	transform: scale(0.96);
}

.hub-stage__ribbon-cell--accent {
	background: rgba(196, 30, 58, 0.78);
	border-color: rgba(255, 220, 220, 0.45);
	animation: ribbonPulse 1.6s ease-in-out infinite;
}

@keyframes ribbonPulse {
	0%, 100% { box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.55); }
	50%      { box-shadow: 0 0 14rpx rgba(196, 30, 58, 0.55); }
}

.hub-stage__ribbon-tag {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26rpx;
	height: 26rpx;
	background: rgba(212, 165, 116, 0.85);
	color: #1a0d08;
	font-size: 16rpx;
	font-weight: 700;
	border-radius: 3rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform: rotate(-6deg);
}

.hub-stage__ribbon-tag--red {
	background: $py-paper-warm;
	color: $py-red;
}

.hub-stage__ribbon-text {
	flex: 1;
	font-size: 16rpx;
	color: rgba(255, 248, 239, 0.92);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hub-stage__ribbon-arrow {
	flex-shrink: 0;
	font-size: 18rpx;
	color: rgba(255, 248, 239, 0.85);
}

.hub-stage__gate {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	flex: 1;
	max-width: 160rpx;
	transition: transform 0.2s ease;
}

.hub-stage__gate:active {
	transform: translateY(2rpx) scale(0.96);
}

.hub-stage__gate-arch {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100rpx;
	height: 110rpx;
	background:
		linear-gradient(180deg, #4a2a18 0%, #2a1810 60%, #1a0d08 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.45);
	border-radius: 50% 50% 6rpx 6rpx;
	box-shadow:
		inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.5),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	overflow: hidden;
}

.hub-stage__gate-arch--street {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 130, 60, 0.32) 0%, transparent 60%),
		linear-gradient(180deg, #4a2a18 0%, #2a1810 60%, #1a0d08 100%);
}

.hub-stage__gate-arch--map {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(196, 30, 58, 0.28) 0%, transparent 60%),
		linear-gradient(180deg, #4a2a18 0%, #2a1810 60%, #1a0d08 100%);
}

.hub-stage__gate-arch--shop {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 215, 100, 0.32) 0%, transparent 60%),
		linear-gradient(180deg, #4a2a18 0%, #2a1810 60%, #1a0d08 100%);
}

.hub-stage__gate-arch--user {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(212, 165, 116, 0.32) 0%, transparent 60%),
		linear-gradient(180deg, #4a2a18 0%, #2a1810 60%, #1a0d08 100%);
}

.hub-stage__gate-light {
	position: absolute;
	left: 50%;
	top: 14rpx;
	width: 56rpx;
	height: 56rpx;
	transform: translateX(-50%);
	background: radial-gradient(circle, rgba(255, 220, 130, 0.5) 0%, transparent 70%);
	pointer-events: none;
	animation: gateLight 3s ease-in-out infinite;
}

@keyframes gateLight {
	0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
	50%      { opacity: 1; transform: translateX(-50%) scale(1.1); }
}

.hub-stage__gate-glyph {
	position: relative;
	z-index: 2;
	font-size: 36rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow:
		0 0 12rpx rgba(255, 220, 130, 0.65),
		0 1rpx 2rpx rgba(0, 0, 0, 0.7);
}

.hub-stage__gate-name {
	font-size: 18rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.6);
	margin-top: 4rpx;
}

@keyframes fadeInUp {
	0%   { opacity: 0; transform: translateY(20rpx); }
	100% { opacity: 1; transform: translateY(0); }
}
</style>
