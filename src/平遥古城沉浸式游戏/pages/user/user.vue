<template>
	<view class="bank-hall">
		<!-- 大堂深处暗色幕 -->
		<view class="bank-hall__veil"></view>

		<!-- 木地砖纹理（地面）-->
		<view class="bank-hall__floor"></view>

		<!-- 远墙：水墨拓印 + 砖纹 -->
		<view class="bank-hall__wall"></view>

		<!-- 左右廊柱（透视感）-->
		<view class="bank-hall__pillar bank-hall__pillar--l">
			<view class="bank-hall__pillar-cap"></view>
			<view class="bank-hall__pillar-body"></view>
			<view class="bank-hall__pillar-base"></view>
		</view>
		<view class="bank-hall__pillar bank-hall__pillar--r">
			<view class="bank-hall__pillar-cap"></view>
			<view class="bank-hall__pillar-body"></view>
			<view class="bank-hall__pillar-base"></view>
		</view>

		<!-- 顶部横梁 + 吊灯笼 -->
		<view class="bank-hall__beam">
			<view class="bank-hall__beam-bar"></view>
			<view
				v-for="(lantern, idx) in beamLanterns"
				:key="idx"
				class="bank-hall__beam-lantern"
				:style="{ left: lantern.left, animationDelay: lantern.delay }"
			>
				<view class="bank-hall__beam-lantern-rope"></view>
				<view class="bank-hall__beam-lantern-cap"></view>
				<view class="bank-hall__beam-lantern-body">
					<text>{{ lantern.char }}</text>
				</view>
				<view class="bank-hall__beam-lantern-tail"></view>
			</view>
		</view>

		<!-- 顶部牌匾 + 设置铜环 -->
		<view class="bank-hall__plaque">
			<view class="bank-hall__plaque-rope bank-hall__plaque-rope--l"></view>
			<view class="bank-hall__plaque-rope bank-hall__plaque-rope--r"></view>
			<view class="bank-hall__plaque-board">
				<text class="bank-hall__plaque-text">行 旅 档 案</text>
				<view class="bank-hall__plaque-seal">
					<text>记</text>
				</view>
			</view>
		</view>

		<view class="bank-hall__settings-ring" @tap="settingsOpen = !settingsOpen">
			<view class="bank-hall__settings-ring-arc"></view>
			<view class="bank-hall__settings-ring-core">
				<text>{{ settingsOpen ? '×' : '⚙' }}</text>
			</view>
		</view>

		<!-- 设置抽屉 -->
		<view v-if="settingsOpen" class="bank-hall__settings" @tap.stop>
			<view class="bank-hall__settings-row">
				<text class="bank-hall__settings-label">音 效</text>
				<view
					class="bank-hall__settings-toggle"
					:class="{ 'bank-hall__settings-toggle--on': settings.music }"
					@tap="settings.music = !settings.music"
				>
					<view class="bank-hall__settings-toggle-knob"></view>
				</view>
			</view>
			<view class="bank-hall__settings-row">
				<text class="bank-hall__settings-label">竖 屏 锁 定</text>
				<view
					class="bank-hall__settings-toggle"
					:class="{ 'bank-hall__settings-toggle--on': settings.portrait }"
					@tap="settings.portrait = !settings.portrait"
				>
					<view class="bank-hall__settings-toggle-knob"></view>
				</view>
			</view>
			<view class="bank-hall__settings-row bank-hall__settings-row--danger" @tap="confirmReset">
				<text class="bank-hall__settings-label">重 置 行 旅</text>
				<text class="bank-hall__settings-action">销 印</text>
			</view>
		</view>

		<!-- 飘落银杏（少量，营造氛围）-->
		<FallingLeaves type="leaf" :density="6" />

		<!-- 中央台：角色立绘站位 -->
		<view class="bank-hall__stage">
			<!-- 红毯 -->
			<view class="bank-hall__carpet"></view>

			<!-- 头顶称号匾 -->
			<view class="bank-hall__title-banner">
				<view class="bank-hall__title-banner-cord"></view>
				<view class="bank-hall__title-banner-body">
					<text class="bank-hall__title-banner-text">{{ snapshot.level.title }}</text>
				</view>
				<view class="bank-hall__title-banner-tassel"></view>
			</view>

			<!-- 角色立绘 -->
			<view class="bank-hall__hero">
				<view class="bank-hall__hero-glow"></view>
				<image class="bank-hall__hero-img" :src="roleImage" mode="aspectFit" />
				<view class="bank-hall__hero-shadow"></view>

				<!-- 等级官印（角色右肩）-->
				<view class="bank-hall__hero-seal">
					<view class="bank-hall__hero-seal-rim"></view>
					<text class="bank-hall__hero-seal-num">{{ snapshot.level.level }}</text>
				</view>
			</view>

			<!-- 木质站台基座 -->
			<view class="bank-hall__podium">
				<view class="bank-hall__podium-top"></view>
				<view class="bank-hall__podium-side"></view>
				<view class="bank-hall__podium-engraving">
					<text>{{ snapshot.profile.nickname || '平遥行客' }} · {{ roleSubtitleText }}</text>
				</view>
			</view>

			<!-- 经验墨痕条（贴在台子下方）-->
			<view class="bank-hall__exp">
				<view class="bank-hall__exp-track">
					<view class="bank-hall__exp-fill" :style="{ width: expPercent + '%' }">
						<view class="bank-hall__exp-fill-shine"></view>
					</view>
					<view class="bank-hall__exp-mark" :style="{ left: expPercent + '%' }">
						<text>笔</text>
					</view>
				</view>
				<view class="bank-hall__exp-meta">
					<text class="bank-hall__exp-current">距 {{ snapshot.level.nextLevelTitle || '满级' }} 还需 {{ snapshot.level.expToNextLevel }} 经验</text>
				</view>
			</view>

			<!-- 试新衣令牌（角色右下角小银钥牌）-->
			<view class="bank-hall__tryon" @tap="tryOutfit">
				<view class="bank-hall__tryon-cord"></view>
				<view class="bank-hall__tryon-body">
					<text>试 新 衣</text>
				</view>
			</view>
		</view>

		<!-- 升迁石阶（横向5级，从左低到右高）-->
		<view class="bank-hall__ranks">
			<text class="bank-hall__ranks-title">— 升 迁 之 阶 —</text>
			<view class="bank-hall__ranks-row">
				<view
					v-for="(rank, idx) in rankPath"
					:key="idx"
					class="bank-hall__rank-step"
					:class="{
						'bank-hall__rank-step--current': idx === currentRankIdx,
						'bank-hall__rank-step--done': idx < currentRankIdx,
						'bank-hall__rank-step--locked': idx > currentRankIdx
					}"
					:style="{ height: 80 + idx * 22 + 'rpx' }"
				>
					<!-- 当前级插一面小红旗 -->
					<view v-if="idx === currentRankIdx" class="bank-hall__rank-flag">
						<view class="bank-hall__rank-flag-pole"></view>
						<view class="bank-hall__rank-flag-cloth">
							<text>{{ snapshot.profile.roleName?.[0] || '行' }}</text>
						</view>
					</view>

					<!-- 已完成级盖红印 -->
					<view v-if="idx < currentRankIdx" class="bank-hall__rank-stamp">
						<text>已</text>
					</view>

					<view class="bank-hall__rank-stone">
						<text class="bank-hall__rank-stone-name">{{ rank.title }}</text>
						<text class="bank-hall__rank-stone-exp">{{ rank.expRequired === 0 ? '入门' : rank.expRequired }}</text>
					</view>

					<view class="bank-hall__rank-stone-base"></view>
				</view>
			</view>
		</view>

		<!-- 每日签到 -->
		<view class="bank-hall__panel">
			<DailyCheckIn ref="checkInRef" @claimed="handleCheckInClaimed" />
		</view>

		<!-- 成就墙（自动评估）-->
		<view class="bank-hall__panel">
			<AchievementWall :refresh-key="achvRefreshKey" />
		</view>

		<!-- 成就匾额墙（横梁吊6块）-->
		<view class="bank-hall__medal-wall">
			<view class="bank-hall__medal-beam"></view>
			<text class="bank-hall__medal-eyebrow">— 行 旅 印 记 —</text>
			<view class="bank-hall__medal-row">
				<view
					v-for="(ach, idx) in achievementList"
					:key="ach.title"
					class="bank-hall__medal"
					:class="{ 'bank-hall__medal--lit': ach.lit }"
					:style="{ animationDelay: 0.05 * idx + 's' }"
				>
					<view class="bank-hall__medal-cord-l"></view>
					<view class="bank-hall__medal-cord-r"></view>
					<view class="bank-hall__medal-board">
						<text class="bank-hall__medal-glyph">{{ ach.lit ? ach.glyph : '？' }}</text>
						<text class="bank-hall__medal-title">{{ ach.title }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 行旅石碑（4 块）-->
		<view class="bank-hall__stelae">
			<view class="bank-hall__stelae-ground"></view>
			<view
				v-for="stele in steleList"
				:key="stele.label"
				class="bank-hall__stele"
			>
				<view class="bank-hall__stele-arch"></view>
				<view class="bank-hall__stele-body">
					<text class="bank-hall__stele-value">{{ stele.value }}</text>
					<text class="bank-hall__stele-divider">— · —</text>
					<text class="bank-hall__stele-label">{{ stele.label }}</text>
				</view>
				<view class="bank-hall__stele-base"></view>
			</view>
		</view>

		<!-- 墙面石刻心境 -->
		<view class="bank-hall__motto">
			<view class="bank-hall__motto-bracket bank-hall__motto-bracket--l"></view>
			<view class="bank-hall__motto-bracket bank-hall__motto-bracket--r"></view>
			<text class="bank-hall__motto-text">「{{ mottoText }}」</text>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import DailyCheckIn from '@/components/DailyCheckIn.vue'
import AchievementWall from '@/components/AchievementWall.vue'
import { getGameSnapshot, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'

const snapshot = ref(getGameSnapshot())
const settingsOpen = ref(false)
const settings = ref({ music: true, portrait: false })
const checkInRef = ref(null)
const achvRefreshKey = ref(0)

function handleCheckInClaimed(data) {
	snapshot.value = getGameSnapshot()
	achvRefreshKey.value++
	if (data?.newAchievements?.length) {
		const labels = data.newAchievements.map((a) => a.name).join('、')
		uni.showToast({ title: `新章：${labels}`, icon: 'none', duration: 2200 })
	}
}

const beamLanterns = [
	{ left: '14%', char: '行', delay: '0s' },
	{ left: '38%', char: '旅', delay: '0.6s' },
	{ left: '62%', char: '春', delay: '1.2s' },
	{ left: '86%', char: '秋', delay: '1.8s' }
]

const roleSubtitleText = computed(() => snapshot.value.profile.roleName ? `${snapshot.value.profile.roleName} · ${snapshot.value.level.title}` : `${snapshot.value.level.title} · 待定身份`)

const storyCount = computed(() => snapshot.value.progress.totalQuestCompleted || snapshot.value.progress.questData?.completedQuests?.length || 0)
const expPercent = computed(() => {
	const total = (snapshot.value.level.expToNextLevel || 100) + (snapshot.value.progress.exp || 0)
	return total > 0 ? Math.min(100, Math.floor(((snapshot.value.progress.exp || 0) / total) * 100)) : 0
})

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

const rankPath = [
	{ title: '票号学徒', expRequired: 0 },
	{ title: '柜台伙计', expRequired: 600 },
	{ title: '账房先生', expRequired: 1600 },
	{ title: '大掌柜',   expRequired: 3000 },
	{ title: '晋商传人', expRequired: 4800 }
]

const currentRankIdx = computed(() => {
	const cur = snapshot.value.level.level || 1
	return Math.max(0, Math.min(rankPath.length - 1, cur - 1))
})

const achievementList = computed(() => {
	const completed = snapshot.value.progress.questData?.completedQuests || []
	return [
		{ title: '票号旧巷', glyph: '票', lit: completed.includes('main-rishengchang') },
		{ title: '县衙前街', glyph: '衙', lit: completed.includes('main-county-office') },
		{ title: '市集十字', glyph: '市', lit: completed.includes('main-market-crossing') },
		{ title: '初入古城', glyph: '入', lit: snapshot.value.progress.discoveredPoiIds?.length > 0 },
		{ title: '夜话晋小鸦', glyph: '话', lit: !!snapshot.value.runtime?.lastNpcTopic },
		{ title: '行旅启程', glyph: '行', lit: (snapshot.value.progress.steps || 0) > 0 }
	]
})

const steleList = computed(() => [
	{ label: '故事 · 篇', value: storyCount.value },
	{ label: '点亮 · 火', value: snapshot.value.progress.discoveredPoiIds?.length || 0 },
	{ label: '行旅 · 步', value: snapshot.value.progress.steps || 0 },
	{ label: '票券 · 张', value: snapshot.value.latestOrder ? 1 : 0 }
])

const mottoText = computed(() => snapshot.value.profile.roleMotto || snapshot.value.currentStreet?.playerHint || '一城风物，不必赶路')

onShow(() => {
	markPageVisit('user', { returnPage: '/pages_game/street/street', returnTab: '/pages/user/user' })
	rememberReturnContext('/pages_game/street/street', '/pages/user/user')
	const sync = syncAchievementUnlocks()
	snapshot.value = getGameSnapshot()
	achvRefreshKey.value++
	checkInRef.value?.refresh?.()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		uni.showToast({ title: `点亮：${labels}`, icon: 'none', duration: 2200 })
	}
})

function tryOutfit() {
	uni.showToast({ title: '换装系统稍后开放', icon: 'none' })
}

function confirmReset() {
	uni.showModal({
		title: '重置行旅',
		content: '是否清空当前所有行旅记录？',
		success: (res) => {
			if (res.confirm) {
				try {
					uni.clearStorageSync()
				} catch (e) { }
				uni.reLaunch({ url: '/pages_game/splash/splash' })
			}
		}
	})
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

/* ===== 大堂场景：深色木质内厅 ===== */
.bank-hall {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background:
		radial-gradient(ellipse at 50% 18%, rgba(255, 180, 90, 0.18) 0%, transparent 45%),
		linear-gradient(180deg, #2a160c 0%, #1a0d08 50%, #0a0604 100%);
	overflow: hidden;
	padding: calc(env(safe-area-inset-top) + 24rpx) 24rpx calc(env(safe-area-inset-bottom) + 132rpx);
	box-sizing: border-box;
}

.bank-hall__veil {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 0%, transparent 30%, rgba(0, 0, 0, 0.5) 100%);
	pointer-events: none;
	z-index: 1;
}

/* 木地砖（透视感地面）*/
.bank-hall__floor {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 35%;
	background:
		linear-gradient(180deg, transparent 0%, rgba(74, 42, 24, 0.55) 60%, rgba(40, 22, 14, 0.85) 100%),
		repeating-linear-gradient(90deg, rgba(40, 22, 14, 0.45) 0, rgba(40, 22, 14, 0.45) 2rpx, transparent 2rpx, transparent 100rpx),
		repeating-linear-gradient(0deg, rgba(212, 165, 116, 0.06) 0, rgba(212, 165, 116, 0.06) 1rpx, transparent 1rpx, transparent 28rpx);
	transform: perspective(800rpx) rotateX(48deg);
	transform-origin: bottom center;
	pointer-events: none;
	z-index: 1;
}

/* 远墙：水墨拓印 + 砖纹 */
.bank-hall__wall {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 65%;
	background:
		radial-gradient(ellipse at 50% 90%, rgba(110, 70, 38, 0.32) 0%, transparent 60%),
		repeating-linear-gradient(0deg, rgba(110, 85, 65, 0.06) 0, rgba(110, 85, 65, 0.06) 2rpx, transparent 2rpx, transparent 70rpx),
		repeating-linear-gradient(90deg, rgba(110, 85, 65, 0.04) 0, rgba(110, 85, 65, 0.04) 1rpx, transparent 1rpx, transparent 130rpx);
	mix-blend-mode: overlay;
	opacity: 0.7;
	pointer-events: none;
	z-index: 1;
}

/* ===== 廊柱（左右木柱，给深度）===== */
.bank-hall__pillar {
	position: absolute;
	top: 0;
	bottom: 30%;
	width: 56rpx;
	z-index: 2;
	pointer-events: none;
}

.bank-hall__pillar--l { left: 0; }
.bank-hall__pillar--r { right: 0; }

.bank-hall__pillar-cap {
	height: 22rpx;
	background: linear-gradient(180deg, #6b3510 0%, #4a2a18 100%);
	border-bottom: 2rpx solid rgba(212, 165, 116, 0.45);
	box-shadow: inset 0 -2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__pillar-body {
	height: calc(100% - 50rpx);
	background:
		linear-gradient(90deg, #2a1810 0%, #4a2a18 35%, #6b3510 50%, #4a2a18 65%, #2a1810 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 2rpx, transparent 2rpx, transparent 28rpx);
	background-blend-mode: multiply;
	box-shadow:
		inset 0 0 0 1rpx rgba(212, 165, 116, 0.18),
		2rpx 0 8rpx rgba(0, 0, 0, 0.4);
}

.bank-hall__pillar-base {
	height: 28rpx;
	background: linear-gradient(180deg, #4a2a18 0%, #2a1810 100%);
	border-top: 2rpx solid rgba(212, 165, 116, 0.45);
	box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

/* ===== 顶部横梁 + 吊灯笼 ===== */
.bank-hall__beam {
	position: relative;
	z-index: 5;
	height: 130rpx;
	margin-top: 2rpx;
	animation: fadeInUp 0.6s ease both;
}

.bank-hall__beam-bar {
	position: absolute;
	left: -24rpx;
	right: -24rpx;
	top: 0;
	height: 32rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 50%, #2a1810 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 4rpx, transparent 4rpx, transparent 60rpx);
	background-blend-mode: multiply;
	border-bottom: 3rpx solid rgba(0, 0, 0, 0.5);
	box-shadow:
		0 4rpx 0 rgba(74, 42, 24, 0.85),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__beam-lantern {
	position: absolute;
	top: 32rpx;
	transform: translateX(-50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: lanternSway 4.2s ease-in-out infinite;
	pointer-events: none;
}

@keyframes lanternSway {
	0%, 100% { transform: translateX(-50%) rotate(-2deg); }
	50%      { transform: translateX(-50%) rotate(2deg); }
}

.bank-hall__beam-lantern-rope {
	width: 1rpx;
	height: 22rpx;
	background: rgba(212, 165, 116, 0.6);
}

.bank-hall__beam-lantern-cap {
	width: 26rpx;
	height: 6rpx;
	background: linear-gradient(180deg, #b07b3a 0%, #6b3510 100%);
	border-radius: 3rpx 3rpx 0 0;
	box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__beam-lantern-body {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 56rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 180, 0.55) 0%, transparent 60%),
		linear-gradient(180deg, #d92a4a 0%, #c41e3a 50%, #6b1622 100%);
	border-radius: 50%;
	color: $py-paper-warm;
	font-size: 20rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow:
		0 0 18rpx rgba(255, 130, 60, 0.55),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.32);
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__beam-lantern-tail {
	width: 4rpx;
	height: 14rpx;
	background: linear-gradient(180deg, $py-gold 0%, transparent 100%);
}

/* ===== 中央牌匾 ===== */
.bank-hall__plaque {
	position: absolute;
	left: 50%;
	top: calc(env(safe-area-inset-top) + 18rpx);
	transform: translateX(-50%);
	z-index: 6;
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: fadeInUp 0.6s ease 0.15s both;
}

.bank-hall__plaque-rope {
	position: absolute;
	top: -32rpx;
	width: 1rpx;
	height: 32rpx;
	background: rgba(212, 165, 116, 0.55);
}

.bank-hall__plaque-rope--l { left: 28rpx; transform: rotate(-12deg); transform-origin: top center; }
.bank-hall__plaque-rope--r { right: 28rpx; transform: rotate(12deg); transform-origin: top center; }

.bank-hall__plaque-board {
	position: relative;
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 12rpx 38rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.5),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__plaque-board::before,
.bank-hall__plaque-board::after {
	content: '';
	position: absolute;
	top: -8rpx;
	width: 22rpx;
	height: 14rpx;
	background: #2a1810;
	border-radius: 4rpx 4rpx 0 0;
}

.bank-hall__plaque-board::before { left: 14rpx; transform: skewX(-20deg); }
.bank-hall__plaque-board::after  { right: 14rpx; transform: skewX(20deg); }

.bank-hall__plaque-text {
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 12rpx;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
}

.bank-hall__plaque-seal {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36rpx;
	height: 36rpx;
	background: $py-red;
	border: 2rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 4rpx;
	font-size: 20rpx;
	font-weight: 700;
	transform: rotate(-6deg);
	color: $py-paper-warm;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.4);
}

/* ===== 设置铜环（右上）===== */
.bank-hall__settings-ring {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 22rpx);
	right: 28rpx;
	z-index: 12;
	width: 76rpx;
	height: 76rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	animation: fadeInUp 0.6s ease 0.2s both;
}

.bank-hall__settings-ring-arc {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 35%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.32),
		0 4rpx 10rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__settings-ring-core {
	position: relative;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(13, 9, 7, 0.78);
	border: 2rpx solid rgba(212, 165, 116, 0.45);
	border-radius: 50%;
	color: $py-gold;
	font-size: 28rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 0 6rpx rgba(255, 220, 130, 0.55);
	z-index: 2;
	transition: transform 0.2s ease;
}

.bank-hall__settings-ring:active .bank-hall__settings-ring-core {
	transform: rotate(40deg);
}

/* 设置抽屉 */
.bank-hall__settings {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 110rpx);
	right: 28rpx;
	z-index: 13;
	width: 380rpx;
	padding: 18rpx 22rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 6rpx;
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.55);
	animation: dropOpen 0.32s cubic-bezier(0.2, 0.8, 0.4, 1) both;
	transform-origin: top right;
}

@keyframes dropOpen {
	0%   { transform: scaleY(0.6) translateY(-10rpx); opacity: 0; }
	100% { transform: scaleY(1) translateY(0); opacity: 1; }
}

.bank-hall__settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10rpx 0;
}

.bank-hall__settings-row + .bank-hall__settings-row {
	border-top: 1rpx dashed rgba(110, 85, 65, 0.32);
}

.bank-hall__settings-row--danger .bank-hall__settings-label { color: $py-red; }

.bank-hall__settings-label {
	font-size: 22rpx;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.bank-hall__settings-action {
	font-size: 20rpx;
	font-weight: 700;
	color: $py-paper-warm;
	background: $py-red;
	padding: 4rpx 14rpx;
	border-radius: 4rpx;
	letter-spacing: 4rpx;
	transform: rotate(-4deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.32);
}

.bank-hall__settings-toggle {
	width: 64rpx;
	height: 32rpx;
	background: rgba(110, 85, 65, 0.42);
	border-radius: 999rpx;
	position: relative;
	transition: background 0.2s ease;
}

.bank-hall__settings-toggle--on { background: $py-red; }

.bank-hall__settings-toggle-knob {
	position: absolute;
	top: 2rpx;
	left: 2rpx;
	width: 28rpx;
	height: 28rpx;
	background: $py-paper-warm;
	border-radius: 50%;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.4);
	transition: left 0.2s ease;
}

.bank-hall__settings-toggle--on .bank-hall__settings-toggle-knob { left: 34rpx; }

/* ===== 中央台 ===== */
.bank-hall__stage {
	position: relative;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: 30rpx;
	padding: 0 40rpx;
}

/* 红毯 */
.bank-hall__carpet {
	position: absolute;
	left: 50%;
	bottom: -20rpx;
	width: 70%;
	height: 240rpx;
	transform: translateX(-50%) perspective(600rpx) rotateX(60deg);
	transform-origin: bottom center;
	background:
		linear-gradient(180deg, rgba(196, 30, 58, 0.55) 0%, rgba(107, 22, 34, 0.32) 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 2rpx, transparent 2rpx, transparent 60rpx);
	background-blend-mode: multiply;
	border-left: 1rpx solid rgba(212, 165, 116, 0.35);
	border-right: 1rpx solid rgba(212, 165, 116, 0.35);
	box-shadow: 0 0 32rpx rgba(196, 30, 58, 0.32);
	pointer-events: none;
	z-index: 1;
}

/* 头顶称号匾 */
.bank-hall__title-banner {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 12rpx;
	z-index: 4;
	animation: fadeInUp 0.6s ease 0.25s both;
}

.bank-hall__title-banner-cord {
	width: 1rpx;
	height: 18rpx;
	background: rgba(212, 165, 116, 0.55);
}

.bank-hall__title-banner-body {
	padding: 8rpx 36rpx;
	background:
		linear-gradient(180deg, $py-red 0%, #8b1a2e 50%, #6b1622 100%);
	clip-path: polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.3),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__title-banner-text {
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__title-banner-tassel {
	width: 16rpx;
	height: 28rpx;
	background:
		linear-gradient(180deg, $py-gold 0%, $py-bronze 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.4) 0, rgba(0, 0, 0, 0.4) 1rpx, transparent 1rpx, transparent 4rpx);
	background-blend-mode: multiply;
	clip-path: polygon(20% 0, 80% 0, 100% 100%, 50% 70%, 0 100%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

/* 角色 */
.bank-hall__hero {
	position: relative;
	z-index: 3;
	animation: fadeInUp 0.6s ease 0.3s both;
}

.bank-hall__hero-glow {
	position: absolute;
	left: 50%;
	top: 30rpx;
	width: 320rpx;
	height: 320rpx;
	transform: translateX(-50%);
	background: radial-gradient(circle, rgba(255, 215, 130, 0.4) 0%, transparent 70%);
	z-index: 1;
	pointer-events: none;
	animation: heroBreath 3s ease-in-out infinite;
}

@keyframes heroBreath {
	0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
	50%      { opacity: 1; transform: translateX(-50%) scale(1.08); }
}

.bank-hall__hero-img {
	position: relative;
	z-index: 3;
	width: 360rpx;
	height: 480rpx;
	filter: drop-shadow(0 18rpx 36rpx rgba(0, 0, 0, 0.78));
}

.bank-hall__hero-shadow {
	position: absolute;
	bottom: -10rpx;
	left: 50%;
	width: 240rpx;
	height: 24rpx;
	background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.65) 0%, transparent 70%);
	transform: translateX(-50%);
	z-index: 2;
}

.bank-hall__hero-seal {
	position: absolute;
	top: 50rpx;
	right: -10rpx;
	z-index: 4;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.bank-hall__hero-seal-rim {
	position: absolute;
	inset: 0;
	background: $py-red;
	border: 3rpx solid rgba(255, 220, 220, 0.5);
	border-radius: 8rpx;
	transform: rotate(-8deg);
	box-shadow:
		0 8rpx 16rpx rgba(0, 0, 0, 0.55),
		0 0 18rpx rgba(196, 30, 58, 0.42);
}

.bank-hall__hero-seal-rim::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(255, 220, 220, 0.45);
	border-radius: 4rpx;
}

.bank-hall__hero-seal-num {
	position: relative;
	z-index: 2;
	font-size: 38rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
	transform: rotate(-8deg);
}

/* 木台 */
.bank-hall__podium {
	position: relative;
	z-index: 2;
	width: 460rpx;
	margin-top: -8rpx;
}

.bank-hall__podium-top {
	height: 14rpx;
	background:
		linear-gradient(180deg, #b07b3a 0%, #8b4513 50%, #6b3510 100%);
	border-radius: 4rpx 4rpx 0 0;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.4),
		inset 0 -2rpx 4rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__podium-side {
	height: 38rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 50rpx);
	background-blend-mode: multiply;
	border-bottom: 2rpx solid rgba(0, 0, 0, 0.5);
	box-shadow: inset 0 -2rpx 4rpx rgba(0, 0, 0, 0.45);
}

.bank-hall__podium-engraving {
	position: absolute;
	left: 0;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	justify-content: center;
	color: $py-gold;
	font-size: 18rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.85);
	pointer-events: none;
	z-index: 1;
}

/* 经验墨条 */
.bank-hall__exp {
	position: relative;
	z-index: 4;
	margin-top: 22rpx;
	width: 100%;
	max-width: 480rpx;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	animation: fadeInUp 0.6s ease 0.4s both;
}

.bank-hall__exp-track {
	position: relative;
	height: 18rpx;
	background:
		linear-gradient(180deg, rgba(13, 9, 7, 0.85) 0%, rgba(40, 22, 14, 0.7) 100%);
	border: 1rpx solid rgba(212, 165, 116, 0.42);
	border-radius: 999rpx;
	overflow: visible;
	box-shadow: inset 0 1rpx 3rpx rgba(0, 0, 0, 0.7);
}

.bank-hall__exp-fill {
	position: relative;
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, $py-bronze 0%, $py-gold 50%, $py-gold-light 100%);
	box-shadow: 0 0 14rpx rgba(255, 220, 130, 0.55);
	transition: width 0.7s ease;
	overflow: hidden;
}

.bank-hall__exp-fill-shine {
	position: absolute;
	top: 0;
	left: -40rpx;
	width: 40rpx;
	height: 100%;
	background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
	animation: expShine 2.2s linear infinite;
}

@keyframes expShine {
	0%   { left: -40rpx; }
	100% { left: 100%; }
}

.bank-hall__exp-mark {
	position: absolute;
	top: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30rpx;
	height: 30rpx;
	background: $py-paper-warm;
	border: 2rpx solid $py-red;
	border-radius: 50%;
	color: $py-red;
	font-size: 16rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform-origin: center;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.55);
	transition: left 0.7s ease;
}

.bank-hall__exp-meta {
	display: flex;
	justify-content: center;
}

.bank-hall__exp-current {
	font-size: 18rpx;
	color: rgba(212, 165, 116, 0.78);
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* 试衣令牌 */
.bank-hall__tryon {
	position: relative;
	z-index: 5;
	margin-top: 26rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: transform 0.2s ease;
	animation: fadeInUp 0.6s ease 0.5s both;
}

.bank-hall__tryon:active {
	transform: scale(0.94);
}

.bank-hall__tryon-cord {
	width: 12rpx;
	height: 12rpx;
	margin-bottom: -2rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f5d76e 0%, #8b4513 70%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.6);
	z-index: 2;
}

.bank-hall__tryon-body {
	padding: 12rpx 38rpx;
	background:
		linear-gradient(180deg, #6b1622 0%, #c41e3a 35%, #6b1622 100%);
	clip-path: polygon(8% 0, 92% 0, 100% 14%, 100% 100%, 0 100%, 0 14%);
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.55);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.32),
		0 6rpx 14rpx rgba(0, 0, 0, 0.5);
}

/* ===== 升迁石阶 ===== */
.bank-hall__ranks {
	position: relative;
	z-index: 4;
	margin-top: 60rpx;
	animation: fadeInUp 0.6s ease 0.55s both;
}

/* ===== 通用面板（签到 / 成就墙）===== */
.bank-hall__panel {
	position: relative;
	z-index: 4;
	margin-top: 36rpx;
	animation: fadeInUp 0.6s ease 0.6s both;
}

.bank-hall__ranks-title {
	display: block;
	text-align: center;
	font-size: 20rpx;
	letter-spacing: 10rpx;
	color: rgba(212, 165, 116, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	margin-bottom: 16rpx;
}

.bank-hall__ranks-row {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 14rpx;
	padding: 0 14rpx;
}

.bank-hall__rank-step {
	position: relative;
	flex: 1;
	max-width: 132rpx;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: center;
	transition: transform 0.3s ease;
}

.bank-hall__rank-stone {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2rpx;
	width: 100%;
	padding: 10rpx 6rpx;
	background:
		linear-gradient(180deg, rgba(110, 85, 65, 0.85) 0%, rgba(74, 42, 24, 0.95) 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 2rpx, transparent 2rpx, transparent 14rpx);
	background-blend-mode: multiply;
	border-top: 2rpx solid rgba(212, 165, 116, 0.35);
	border-bottom: 1rpx solid rgba(0, 0, 0, 0.5);
	color: rgba(212, 165, 116, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.18),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.45);
}

.bank-hall__rank-stone-name {
	font-size: 18rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__rank-stone-exp {
	font-size: 14rpx;
	color: rgba(212, 165, 116, 0.55);
	letter-spacing: 1rpx;
}

.bank-hall__rank-stone-base {
	height: 8rpx;
	width: calc(100% + 8rpx);
	margin-left: -4rpx;
	background: linear-gradient(180deg, #4a2a18 0%, #2a1810 100%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.55);
}

/* 已完成 */
.bank-hall__rank-step--done .bank-hall__rank-stone {
	background:
		linear-gradient(180deg, rgba(139, 69, 19, 0.85) 0%, rgba(74, 42, 24, 0.95) 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 2rpx, transparent 2rpx, transparent 14rpx);
	background-blend-mode: multiply;
	color: $py-gold-light;
}

.bank-hall__rank-stamp {
	position: absolute;
	top: -22rpx;
	left: 50%;
	transform: translateX(-50%) rotate(-8deg);
	z-index: 3;
	width: 36rpx;
	height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $py-red;
	border: 2rpx solid rgba(255, 220, 220, 0.5);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.45);
}

/* 当前 */
.bank-hall__rank-step--current {
	transform: translateY(-12rpx);
}

.bank-hall__rank-step--current .bank-hall__rank-stone {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 130, 0.32) 0%, transparent 70%),
		linear-gradient(180deg, rgba(196, 30, 58, 0.55) 0%, rgba(107, 22, 34, 0.85) 100%);
	border-top: 2rpx solid rgba(255, 220, 220, 0.5);
	color: $py-paper-warm;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.35),
		0 0 22rpx rgba(196, 30, 58, 0.55);
	animation: stoneBreath 2.4s ease-in-out infinite;
}

@keyframes stoneBreath {
	0%, 100% { box-shadow: inset 0 1rpx 0 rgba(255, 220, 220, 0.35), 0 0 22rpx rgba(196, 30, 58, 0.55); }
	50%      { box-shadow: inset 0 1rpx 0 rgba(255, 220, 220, 0.35), 0 0 32rpx rgba(255, 215, 100, 0.6); }
}

.bank-hall__rank-flag {
	position: absolute;
	top: -54rpx;
	left: 50%;
	transform: translateX(-50%);
	z-index: 4;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.bank-hall__rank-flag-pole {
	width: 2rpx;
	height: 56rpx;
	background: linear-gradient(180deg, $py-bronze 0%, #4a2a18 100%);
	box-shadow: 1rpx 0 2rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__rank-flag-cloth {
	margin-top: 4rpx;
	margin-left: -1rpx;
	padding: 4rpx 10rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	color: $py-paper-warm;
	font-size: 16rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	clip-path: polygon(0 0, 100% 0, 88% 50%, 100% 100%, 0 100%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.55);
	animation: flagWave 2.4s ease-in-out infinite;
	transform-origin: left center;
}

@keyframes flagWave {
	0%, 100% { transform: skewY(0deg) scaleX(1); }
	50%      { transform: skewY(-3deg) scaleX(0.96); }
}

/* 锁定 */
.bank-hall__rank-step--locked .bank-hall__rank-stone {
	opacity: 0.55;
	color: rgba(110, 85, 65, 0.65);
}

/* ===== 成就匾额墙 ===== */
.bank-hall__medal-wall {
	position: relative;
	z-index: 4;
	margin-top: 60rpx;
	padding: 30rpx 14rpx 20rpx;
	animation: fadeInUp 0.6s ease 0.65s both;
}

.bank-hall__medal-beam {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	top: 0;
	height: 16rpx;
	background:
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%),
		repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0, rgba(0, 0, 0, 0.32) 3rpx, transparent 3rpx, transparent 60rpx);
	background-blend-mode: multiply;
	border-bottom: 2rpx solid rgba(0, 0, 0, 0.5);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__medal-eyebrow {
	display: block;
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	margin-bottom: 14rpx;
}

.bank-hall__medal-row {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 22rpx 16rpx;
}

.bank-hall__medal {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 14rpx;
	animation: medalDrop 0.45s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

@keyframes medalDrop {
	0%   { transform: translateY(-20rpx); opacity: 0; }
	100% { transform: translateY(0); opacity: 1; }
}

.bank-hall__medal-cord-l,
.bank-hall__medal-cord-r {
	position: absolute;
	top: 0;
	width: 1rpx;
	height: 22rpx;
	background: rgba(212, 165, 116, 0.55);
}

.bank-hall__medal-cord-l { left: 28rpx; transform: rotate(-12deg); transform-origin: top center; }
.bank-hall__medal-cord-r { right: 28rpx; transform: rotate(12deg); transform-origin: top center; }

.bank-hall__medal-board {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 110rpx;
	padding: 12rpx 8rpx;
	background:
		linear-gradient(180deg, rgba(40, 22, 14, 0.85) 0%, rgba(26, 16, 8, 0.95) 100%),
		repeating-linear-gradient(0deg, rgba(212, 165, 116, 0.04) 0, rgba(212, 165, 116, 0.04) 1rpx, transparent 1rpx, transparent 14rpx);
	background-blend-mode: overlay;
	border: 2rpx solid rgba(110, 85, 65, 0.55);
	border-radius: 4rpx;
	color: rgba(110, 85, 65, 0.7);
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	transition: all 0.3s ease;
}

.bank-hall__medal-board::before {
	content: '';
	position: absolute;
	left: 8rpx;
	right: 8rpx;
	top: 8rpx;
	bottom: 8rpx;
	border: 1rpx dashed rgba(110, 85, 65, 0.35);
	pointer-events: none;
}

.bank-hall__medal--lit .bank-hall__medal-board {
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(180deg, #6b3510 0%, #4a2a18 100%);
	border-color: rgba(212, 165, 116, 0.55);
	color: $py-paper-warm;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.45),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55),
		0 0 18rpx rgba(255, 220, 130, 0.32);
}

.bank-hall__medal--lit .bank-hall__medal-board::before {
	border-color: rgba(212, 165, 116, 0.45);
}

.bank-hall__medal-glyph {
	font-size: 38rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	line-height: 1;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__medal--lit .bank-hall__medal-glyph {
	color: $py-paper-warm;
	text-shadow: 0 0 12rpx rgba(255, 220, 130, 0.55), 0 1rpx 2rpx rgba(0, 0, 0, 0.55);
}

.bank-hall__medal-title {
	margin-top: 6rpx;
	font-size: 16rpx;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-align: center;
}

/* ===== 行旅石碑 ===== */
.bank-hall__stelae {
	position: relative;
	z-index: 4;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 16rpx;
	margin-top: 50rpx;
	padding: 0 14rpx;
	animation: fadeInUp 0.6s ease 0.75s both;
}

.bank-hall__stelae-ground {
	position: absolute;
	left: -10%;
	right: -10%;
	bottom: 0;
	height: 6rpx;
	background: linear-gradient(90deg, transparent 0%, rgba(212, 165, 116, 0.35) 30%, rgba(212, 165, 116, 0.35) 70%, transparent 100%);
	pointer-events: none;
}

.bank-hall__stele {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
	max-width: 160rpx;
	transition: transform 0.3s ease;
}

.bank-hall__stele:active {
	transform: translateY(2rpx);
}

.bank-hall__stele-arch {
	width: 100%;
	max-width: 110rpx;
	height: 28rpx;
	background:
		linear-gradient(180deg, rgba(110, 85, 65, 0.85) 0%, rgba(74, 42, 24, 0.95) 100%);
	clip-path: polygon(15% 100%, 50% 0, 85% 100%);
	box-shadow: 0 -2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.bank-hall__stele-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	width: 100%;
	max-width: 110rpx;
	min-height: 130rpx;
	padding: 16rpx 8rpx;
	background:
		linear-gradient(180deg, rgba(110, 85, 65, 0.78) 0%, rgba(74, 42, 24, 0.92) 100%),
		repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) 1rpx, transparent 1rpx, transparent 18rpx);
	background-blend-mode: multiply;
	border-left: 1rpx solid rgba(212, 165, 116, 0.32);
	border-right: 1rpx solid rgba(212, 165, 116, 0.32);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.18),
		inset 0 -3rpx 6rpx rgba(0, 0, 0, 0.45);
}

.bank-hall__stele-value {
	font-size: 38rpx;
	font-weight: 700;
	color: $py-gold-light;
	font-family: 'Noto Serif SC', 'KaiTi', serif;
	letter-spacing: 1rpx;
	text-shadow:
		0 1rpx 0 rgba(0, 0, 0, 0.65),
		0 0 12rpx rgba(255, 220, 130, 0.45);
	line-height: 1;
}

.bank-hall__stele-divider {
	font-size: 14rpx;
	color: rgba(212, 165, 116, 0.55);
	letter-spacing: 2rpx;
}

.bank-hall__stele-label {
	font-size: 18rpx;
	color: rgba(212, 165, 116, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.55);
	white-space: nowrap;
}

.bank-hall__stele-base {
	width: calc(100% - 12rpx);
	max-width: 122rpx;
	height: 14rpx;
	background: linear-gradient(180deg, #4a2a18 0%, #2a1810 100%);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	border-bottom: 1rpx solid rgba(0, 0, 0, 0.6);
}

/* ===== 墙面石刻心境 ===== */
.bank-hall__motto {
	position: relative;
	z-index: 4;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 40rpx;
	padding: 0 80rpx;
	animation: fadeInUp 0.6s ease 0.85s both;
}

.bank-hall__motto-bracket {
	position: absolute;
	top: 50%;
	width: 30rpx;
	height: 36rpx;
	transform: translateY(-50%);
}

.bank-hall__motto-bracket--l {
	left: 36rpx;
	border-left: 2rpx solid rgba(212, 165, 116, 0.55);
	border-top: 2rpx solid rgba(212, 165, 116, 0.55);
	border-bottom: 2rpx solid rgba(212, 165, 116, 0.55);
}

.bank-hall__motto-bracket--r {
	right: 36rpx;
	border-right: 2rpx solid rgba(212, 165, 116, 0.55);
	border-top: 2rpx solid rgba(212, 165, 116, 0.55);
	border-bottom: 2rpx solid rgba(212, 165, 116, 0.55);
}

.bank-hall__motto-text {
	font-size: 22rpx;
	line-height: 1.85;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-align: center;
	font-style: italic;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.55);
}

/* 通用动画 */
@keyframes fadeInUp {
	0%   { opacity: 0; transform: translateY(20rpx); }
	100% { opacity: 1; transform: translateY(0); }
}
</style>
