<template>
	<div class="hub-stage">
		<div class="hub-stage__city-backdrop" aria-hidden="true"></div>
		<!-- 视差背景：远山 + 屋顶 + 灯笼 -->
		<ParallaxScene tone="dusk" :lanterns="true" :clouds="true" />

		<!-- 飘落银杏 -->
		<FallingLeaves type="leaf" :density="12" />

		<!-- 顶部 HUD（左：等级官印 + 头像；右：腰包资产）-->
		<div class="hub-stage__top">
			<div class="hub-stage__profile">
				<div class="hub-stage__avatar">
					<div class="hub-stage__avatar-rim"></div>
					<div class="hub-stage__avatar-inner">
						<img v-if="roleImage" class="hub-stage__avatar-img" :src="roleImage" data-fit="contain"  alt="" draggable="false" />
					</div>
					<div class="hub-stage__avatar-seal">
						<span>{{ snapshot.level.level }}</span>
					</div>
				</div>
				<div class="hub-stage__profile-info">
					<span class="hub-stage__profile-name">{{ snapshot.profile.roleName || '平遥行客' }}</span>
					<span class="hub-stage__profile-title">{{ snapshot.level.title }}</span>
				</div>
			</div>

			<div class="hub-stage__pouch">
				<div class="hub-stage__pouch-cell">
					<div class="hub-stage__pouch-coin"></div>
					<span class="hub-stage__pouch-value">{{ snapshot.progress.silverKey }}</span>
				</div>
				<div class="hub-stage__pouch-divider"></div>
				<div class="hub-stage__pouch-cell">
					<div class="hub-stage__pouch-step">
						<div class="hub-stage__pouch-step-print"></div>
						<div class="hub-stage__pouch-step-print hub-stage__pouch-step-print--2"></div>
					</div>
					<span class="hub-stage__pouch-value">{{ snapshot.progress.steps }}</span>
				</div>
			</div>
		</div>

		<header class="hub-stage__welcome">
			<span class="hub-stage__eyebrow">平遥古城 · 沉浸式行旅</span>
			<h1>一城烟火，一程故事。</h1>
			<p>走进青砖灰瓦间，让晋小鸦陪你读懂一座城。</p>
		</header>

		<!-- 中央电影舞台：晋小鸦悬空 + 角色立绘 -->
		<div class="hub-stage__main">
			<!-- 舞台底光圈 -->
			<div class="hub-stage__floor-glow"></div>

			<!-- 晋小鸦（左上空中）-->
			<div class="hub-stage__owl">
				<img class="hub-stage__owl-img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
				<div class="hub-stage__owl-perch"></div>
			</div>

			<!-- 角色立绘（中央主舞台）-->
			<div class="hub-stage__role">
				<img class="hub-stage__role-img" :src="roleImage" data-fit="contain"  alt="" draggable="false" />
				<div class="hub-stage__role-shadow"></div>
			</div>

			<!-- 任务进度悬挂（角色右侧，竹简式）-->
			<div class="hub-stage__quest-stick">
				<div class="hub-stage__quest-stick-cord"></div>
				<div class="hub-stage__quest-stick-stamp">
					<span>主</span>
				</div>
				<div class="hub-stage__quest-stick-info">
					<span class="hub-stage__quest-stick-title">{{ currentQuestTitle }}</span>
					<div class="hub-stage__quest-stick-bar">
						<div class="hub-stage__quest-stick-bar-fill" :style="{ width: snapshot.questProgress + '%' }"></div>
					</div>
					<span class="hub-stage__quest-stick-progress">{{ snapshot.questProgress }}% · 进行中</span>
				</div>
				<div class="hub-stage__quest-stick-tassel"></div>
			</div>
		</div>

		<!-- 晋小鸦对话条（横跨底部，紧凑卷条样式）-->
		<div class="hub-stage__npc-bar">
			<div class="hub-stage__npc-bar-roll hub-stage__npc-bar-roll--l"></div>
			<div class="hub-stage__npc-bar-roll hub-stage__npc-bar-roll--r"></div>
			<div class="hub-stage__npc-bar-paper">
				<div class="hub-stage__npc-bar-fiber"></div>
				<div class="hub-stage__npc-bar-content">
					<div class="hub-stage__npc-bar-text">
						<span class="hub-stage__npc-bar-name">晋小鸦</span>
						<span class="hub-stage__npc-bar-line">{{ snapshot.heroNpcLine }}</span>
						<div class="hub-stage__npc-bar-route">
							<div class="hub-stage__npc-bar-dot"></div>
							<span class="hub-stage__npc-bar-route-text">{{ taskLine }}</span>
						</div>
					</div>
					<div class="hub-stage__npc-bar-cta" @click="goExplore">
						<div class="hub-stage__npc-bar-cta-stamp">
							<span>启</span>
						</div>
						<span class="hub-stage__npc-bar-cta-text">{{ primaryActionLabel }}</span>
						<span class="hub-stage__npc-bar-cta-arrow">›</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 底部门洞导航（4 个城门入口）-->
		<div class="hub-stage__gates">
			<div class="hub-stage__gates-beam"></div>

			<!-- 横幅信息条：时辰 / 签到 / 成就 -->
			<div class="hub-stage__ribbon">
				<div class="hub-stage__ribbon-cell">
					<span class="hub-stage__ribbon-tag">时</span>
					<span class="hub-stage__ribbon-text">{{ phase.label }} · {{ phase.caption }}</span>
				</div>
				<div
					v-if="checkInBadge"
					class="hub-stage__ribbon-cell hub-stage__ribbon-cell--accent"
					@click="goUser"
				>
					<span class="hub-stage__ribbon-tag hub-stage__ribbon-tag--red">签</span>
					<span class="hub-stage__ribbon-text">{{ checkInBadge }}</span>
					<span class="hub-stage__ribbon-arrow">›</span>
				</div>
				<div class="hub-stage__ribbon-cell" @click="goUser">
					<span class="hub-stage__ribbon-tag">章</span>
					<span class="hub-stage__ribbon-text">{{ achvBadge }}</span>
					<span class="hub-stage__ribbon-arrow">›</span>
				</div>
			</div>

			<div class="hub-stage__gate" @click="goExplore">
				<div class="hub-stage__gate-arch hub-stage__gate-arch--street">
					<div class="hub-stage__gate-light"></div>
					<span class="hub-stage__gate-glyph">街</span>
				</div>
				<span class="hub-stage__gate-name">入街景</span>
			</div>

			<div class="hub-stage__gate" @click="goMap">
				<div class="hub-stage__gate-arch hub-stage__gate-arch--map">
					<div class="hub-stage__gate-light"></div>
					<span class="hub-stage__gate-glyph">图</span>
				</div>
				<span class="hub-stage__gate-name">览胜图</span>
			</div>

			<div class="hub-stage__gate" @click="goShop">
				<div class="hub-stage__gate-arch hub-stage__gate-arch--shop">
					<div class="hub-stage__gate-light"></div>
					<span class="hub-stage__gate-glyph">肆</span>
				</div>
				<span class="hub-stage__gate-name">瑞蚨祥</span>
			</div>

			<div class="hub-stage__gate" @click="goUser">
				<div class="hub-stage__gate-arch hub-stage__gate-arch--user">
					<div class="hub-stage__gate-light"></div>
					<span class="hub-stage__gate-glyph">册</span>
				</div>
				<span class="hub-stage__gate-name">行旅册</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ParallaxScene from '@/components/ParallaxScene.vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import { getGameSnapshot, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { getCheckInPreview } from '@/common/utils/check-in.js'
import { getAchievementSummary, syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { getCurrentPhase } from '@/common/utils/phase.js'
import { onPageShow } from '@/platform/lifecycle.js'
import { navigateTo, switchTab } from '@/platform/navigation.js'
import { showToast } from '@/platform/toast.js'

defineOptions({ name: 'HomePage' })

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

onPageShow(() => {
	markPageVisit('index', { returnPage: '/street' })
	rememberReturnContext('/street', '')
	const { newlyUnlocked, grantedReward } = syncAchievementUnlocks()
	if (newlyUnlocked.length) {
		showToast({ title: `点亮：${newlyUnlocked.map((item) => item.name).join('、')} · +${grantedReward.silverKey} 银钥 / +${grantedReward.exp} 经验`, duration: 3200 })
	}
	snapshot.value = getGameSnapshot()
	checkInPreview.value = getCheckInPreview()
	achvSummary.value = getAchievementSummary()
	phase.value = getCurrentPhase()
})

function goExplore() { navigateTo({ url: '/street' }) }
function goMap()     { switchTab({ url: '/map' }) }
function goShop()    { switchTab({ url: '/shop' }) }
function goUser()    { switchTab({ url: '/user' }) }
</script>

<style lang="scss" scoped>
.hub-stage__welcome, .hub-stage__city-backdrop { display: none; }
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
@import '@/common/styles/tab-landscape.scss';

@media (orientation: landscape) and (max-height: 600px), (min-width: 1000px) and (min-height: 560px) {
	.hub-stage {
		@include tab-landscape-viewport;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(300px, 1fr);
		grid-template-rows: 44px minmax(0, 1fr) 90px;
		gap: 8px 18px;
	}
	.hub-stage [class] { letter-spacing: 0; }
	.hub-stage__top { grid-column: 1 / -1; padding: 0; margin: 0; }
	.hub-stage__profile { gap: 8px; }
	.hub-stage__avatar { width: 40px; height: 40px; }
	.hub-stage__avatar-inner { inset: 3px; }
	.hub-stage__avatar-seal { width: 18px; height: 18px; font-size: 11px; right: -3px; bottom: -1px; }
	.hub-stage__profile-name { font-size: 16px; }
	.hub-stage__profile-title { font-size: 12px; }
	.hub-stage__pouch { padding: 6px 12px; gap: 12px; }
	.hub-stage__pouch-value { font-size: 14px; }
	.hub-stage__pouch-coin, .hub-stage__pouch-step { width: 20px; height: 20px; }
	.hub-stage__pouch-divider { height: 20px; }
	.hub-stage__main { grid-column: 1; grid-row: 2 / 4; min-height: 0; height: 100%; margin: 0; padding: 0; }
	.hub-stage__role { height: 100%; width: 58%; margin-right: 16%; }
	.hub-stage__role-img { width: 100%; height: 100%; }
	.hub-stage__owl { left: 0; top: 4px; }
	.hub-stage__owl-img { width: 66px; height: 80px; }
	.hub-stage__owl-perch { width: 36px; height: 2px; }
	.hub-stage__quest-stick { right: 0; top: 6px; width: 110px; }
	.hub-stage__quest-stick-info { padding: 8px; box-sizing: border-box; }
	.hub-stage__quest-stick-title { font-size: 13px; }
	.hub-stage__quest-stick-progress { font-size: 11px; }
	.hub-stage__quest-stick-stamp { width: 24px; height: 24px; font-size: 14px; }
	.hub-stage__quest-stick-cord, .hub-stage__quest-stick-tassel { height: 8px; }
	.hub-stage__floor-glow { width: 70%; height: 26px; bottom: 8px; }
	.hub-stage__role-shadow { width: 90%; height: 12px; bottom: 0; }
	.hub-stage__npc-bar { grid-column: 2; grid-row: 2; align-self: center; margin: 0 6px; min-width: 0; }
	.hub-stage__npc-bar-paper { padding: 10px 12px; }
	.hub-stage__npc-bar-content { flex-direction: column; align-items: stretch; gap: 8px; }
	.hub-stage__npc-bar-text { gap: 3px; }
	.hub-stage__npc-bar-name { font-size: 11px; }
	.hub-stage__npc-bar-line { font-size: 14px; line-height: 1.45; }
	.hub-stage__npc-bar-route { margin: 0; padding: 3px 6px; }
	.hub-stage__npc-bar-route-text { font-size: 11px; line-height: 1.4; }
	.hub-stage__npc-bar-cta { min-height: 44px; padding: 0 12px; flex-direction: row; justify-content: center; box-sizing: border-box; }
	.hub-stage__npc-bar-cta-text { font-size: 15px; }
	.hub-stage__npc-bar-cta-stamp { width: 24px; height: 24px; font-size: 15px; }
	.hub-stage__npc-bar-cta-arrow { font-size: 20px; }
	.hub-stage__npc-bar-roll { width: 8px; }
	.hub-stage__gates { grid-column: 2; grid-row: 3; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; align-content: end; }
	.hub-stage__gates-beam { display: none; }
	.hub-stage__ribbon { position: static; grid-column: 1 / -1; gap: 4px; justify-content: space-between; flex-wrap: wrap; }
	.hub-stage__ribbon-cell { padding: 2px; gap: 3px; min-height: 28px; }
	.hub-stage__ribbon-tag { width: 16px; height: 16px; font-size: 10px; }
	.hub-stage__ribbon-text { font-size: 10px; }
	.hub-stage__ribbon-arrow { font-size: 12px; }
	.hub-stage__gate { min-height: 44px; flex-direction: row; gap: 4px; }
	.hub-stage__gate-arch { width: 28px; height: 36px; flex-shrink: 0; border-radius: 14px 14px 2px 2px; }
	.hub-stage__gate-glyph { font-size: 18px; }
	.hub-stage__gate-name { font-size: 11px; margin: 0; }
}
@media (min-width: 1000px) and (min-height: 560px) {
	.hub-stage { padding: 28px max(40px, calc((100vw - 1240px) / 2)); grid-template-columns: 1fr 1.05fr; grid-template-rows: 64px auto minmax(0, 1fr) auto; gap: 24px 64px; }
	.hub-stage__city-backdrop { display: block; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(26, 20, 17, .2), rgba(26, 20, 17, .58)), linear-gradient(0deg, #100c0a, transparent 70%), url('/static/img/pingyao-home-evening.webp') center / cover; }
	.hub-stage > :deep(.parallax-scene) { display: none; }
	.hub-stage__welcome { display: block; position: relative; z-index: 2; grid-column: 2; grid-row: 2; padding-top: clamp(0px, 3vh, 30px); }
	.hub-stage__eyebrow { font-size: 12px; letter-spacing: 4px !important; color: $py-gold-light; }
	.hub-stage__welcome h1 { margin: 12px 0 14px; font: 40px/1.4 'KaiTi', 'STKaiti', 'Noto Serif SC', serif; color: $py-paper-warm; letter-spacing: 2px; white-space: nowrap; }
	.hub-stage__welcome p { font-size: 14px; line-height: 1.8; color: rgba($py-paper, .72); }
	.hub-stage__main { grid-row: 2 / 5; }
	.hub-stage__npc-bar { grid-row: 3; align-self: start; }
	.hub-stage__avatar { width: 64px; height: 64px; }
	.hub-stage__profile-name { font-size: 24px; }
	.hub-stage__profile-title { font-size: 14px; }
	.hub-stage__pouch { padding: 12px 24px; }
	.hub-stage__pouch-value { font-size: 20px; }
	.hub-stage__role { width: 80%; margin: 0; }
	.hub-stage__owl-img { width: 115px; height: 145px; }
	.hub-stage__quest-stick { width: 150px; top: 25%; }
	.hub-stage__quest-stick-title { font-size: 17px; }
	.hub-stage__npc-bar-paper { padding: 28px 32px; }
	.hub-stage__npc-bar-content { gap: 20px; }
	.hub-stage__npc-bar-name { font-size: 14px; }
	.hub-stage__npc-bar-line { font-size: 21px; line-height: 1.8; }
	.hub-stage__npc-bar-route-text { font-size: 14px; }
	.hub-stage__npc-bar-cta { min-height: 56px; cursor: pointer; }
	.hub-stage__npc-bar-cta-text { font-size: 20px; }
	.hub-stage__gates { grid-row: 4; display: block; padding-bottom: 12px; }
	.hub-stage__gate { display: none; }
	.hub-stage__ribbon { gap: 8px; }
	.hub-stage__ribbon-cell { background: rgba($py-ink, .6); padding: 7px 8px; border-color: rgba($py-gold, .25); }
	.hub-stage__gate-arch { width: 50px; height: 62px; }
	.hub-stage__gate-glyph { font-size: 28px; }
	.hub-stage__gate-name { font-size: 14px; }
	.hub-stage__ribbon-text { font-size: 12px; }
}
@media (min-width: 1000px) and (min-height: 560px) and (max-height: 760px) {
	.hub-stage { padding-top: 18px; padding-bottom: 18px; grid-template-rows: 46px auto minmax(0, 1fr) auto; gap: 14px 40px; }
	.hub-stage__avatar { width: 44px; height: 44px; }
	.hub-stage__profile-name { font-size: 19px; }
	.hub-stage__welcome { padding-top: 0; }
	.hub-stage__welcome h1 { font-size: 32px; margin: 6px 0; }
	.hub-stage__npc-bar-paper { padding: 18px 22px; }
	.hub-stage__npc-bar-content { gap: 12px; }
	.hub-stage__npc-bar-line { font-size: 17px; line-height: 1.6; }
	.hub-stage__npc-bar-cta { min-height: 44px; }
	.hub-stage__gates { padding-bottom: 0; }
	.hub-stage__owl-img { width: 80px; height: 96px; }
}
</style>
