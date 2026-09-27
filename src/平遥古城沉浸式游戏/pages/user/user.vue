<template>
	<view class="ledger">
		<!-- 木案背景：册子摊在书案上 -->
		<view class="ledger__desk"></view>
		<view class="ledger__desk-grain"></view>
		<view class="ledger__veil"></view>

		<!-- 飘落银杏（少量，营造氛围）-->
		<FallingLeaves type="leaf" :density="6" />

		<!-- 设置铜环（右上，浮于册子之上）-->
		<view class="ledger__settings-ring" @tap="settingsOpen = !settingsOpen">
			<view class="ledger__settings-ring-arc"></view>
			<view class="ledger__settings-ring-core">
				<text>{{ settingsOpen ? '×' : '⚙' }}</text>
			</view>
		</view>

		<!-- 设置抽屉 -->
		<view v-if="settingsOpen" class="ledger__settings" @tap.stop>
			<view class="ledger__settings-row">
				<text class="ledger__settings-label">音 效</text>
				<view
					class="ledger__settings-toggle"
					:class="{ 'ledger__settings-toggle--on': settings.music }"
					@tap="toggleMusic"
				>
					<view class="ledger__settings-toggle-knob"></view>
				</view>
			</view>
			<view class="ledger__settings-row">
				<text class="ledger__settings-label">画 面 特 效</text>
				<view
					class="ledger__settings-toggle"
					:class="{ 'ledger__settings-toggle--on': settings.effect }"
					@tap="toggleEffect"
				>
					<view class="ledger__settings-toggle-knob"></view>
				</view>
			</view>
			<view class="ledger__settings-row ledger__settings-row--danger" @tap="confirmReset">
				<text class="ledger__settings-label">重 置 行 旅</text>
				<text class="ledger__settings-action">销 印</text>
			</view>
		</view>

		<!-- ============ 行旅册 · 线装册子主体 ============ -->
		<view class="ledger__book">
			<!-- 装订书脊（左侧线装孔）-->
			<view class="ledger__spine">
				<view v-for="i in 5" :key="i" class="ledger__spine-stitch"></view>
			</view>

			<!-- 竖排书名签条（贴册子右上）-->
			<view class="ledger__title-slip">
				<text class="ledger__title-slip-text">行 旅 册</text>
				<view class="ledger__title-slip-seal">
					<text>记</text>
				</view>
			</view>

			<!-- 封页：身份腰牌 -->
			<view class="ledger__cover">
				<view class="ledger__badge">
					<view class="ledger__badge-hole"></view>
					<view class="ledger__badge-cord"></view>
					<view class="ledger__badge-body">
						<view class="ledger__badge-portrait">
							<image class="ledger__badge-portrait-img" :src="roleImage" mode="aspectFit" />
						</view>
						<view class="ledger__badge-info">
							<text class="ledger__badge-eyebrow">— 平 遥 行 旅 ·  腰 牌 —</text>
							<text class="ledger__badge-name">{{ snapshot.profile.nickname || '平遥行客' }}</text>
							<text class="ledger__badge-role">{{ roleSubtitleText }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- ====== 册页·其一：品阶官印页 ====== -->
			<view class="ledger__page ledger__page--rank">
				<view class="ledger__page-tab"><text>壹</text></view>
				<text class="ledger__page-eyebrow">— 品 阶 官 印 —</text>

				<view class="ledger__rank-hero">
					<!-- 大方官印：等级 + 称号 -->
					<view class="ledger__seal-big">
						<view class="ledger__seal-big-rim"></view>
						<text class="ledger__seal-big-num">{{ snapshot.level.level }}</text>
						<text class="ledger__seal-big-title">{{ snapshot.level.title }}</text>
					</view>

					<view class="ledger__rank-side">
						<text class="ledger__rank-side-line">现 任 {{ snapshot.level.title }}</text>
						<text class="ledger__rank-side-sub">距 {{ snapshot.level.nextLevelTitle || '满阶' }} 尚需 {{ snapshot.level.expToNextLevel }} 经验</text>
						<!-- 经验墨条 -->
						<view class="ledger__exp">
							<view class="ledger__exp-track">
								<view class="ledger__exp-fill" :style="{ width: expPercent + '%' }">
									<view class="ledger__exp-fill-shine"></view>
								</view>
								<view class="ledger__exp-mark" :style="{ left: expPercent + '%' }">
									<text>笔</text>
								</view>
							</view>
							<text class="ledger__exp-pct">{{ expPercent }}%</text>
						</view>
						<!-- 试新衣令牌 -->
						<view class="ledger__tryon" @tap="tryOutfit">
							<view class="ledger__tryon-cord"></view>
							<view class="ledger__tryon-body"><text>试 新 衣</text></view>
						</view>
					</view>
				</view>

				<!-- 品阶骑缝印（5 级横排）-->
				<view class="ledger__rank-row">
					<view
						v-for="(rank, idx) in rankPath"
						:key="idx"
						class="ledger__rank-cell"
						:class="{
							'ledger__rank-cell--current': idx === currentRankIdx,
							'ledger__rank-cell--done': idx < currentRankIdx,
							'ledger__rank-cell--locked': idx > currentRankIdx
						}"
					>
						<view class="ledger__rank-cell-seal">
							<text class="ledger__rank-cell-mark">{{ idx < currentRankIdx ? '已' : (idx === currentRankIdx ? (snapshot.profile.roleName?.[0] || '今') : '？') }}</text>
						</view>
						<text class="ledger__rank-cell-name">{{ rank.title }}</text>
						<text class="ledger__rank-cell-exp">{{ rank.expRequired === 0 ? '入门' : rank.expRequired }}</text>
					</view>
				</view>
			</view>

			<!-- ====== 册页·其二：每日路引 ====== -->
			<view class="ledger__page ledger__page--checkin">
				<view class="ledger__page-tab"><text>贰</text></view>
				<text class="ledger__page-eyebrow">— 每 日 路 引 —</text>
				<view class="ledger__embed">
					<DailyCheckIn ref="checkInRef" @claimed="handleCheckInClaimed" />
				</view>
			</view>

			<!-- ====== 册页·其三：勋印墙 ====== -->
			<view class="ledger__page ledger__page--achv">
				<view class="ledger__page-tab"><text>叁</text></view>
				<text class="ledger__page-eyebrow">— 勋 印 之 墙 —</text>
				<view class="ledger__embed">
					<AchievementWall :refresh-key="achvRefreshKey" />
				</view>

				<!-- 行旅勋印（6 方钤印）-->
				<view class="ledger__crests">
					<view
						v-for="(ach, idx) in achievementList"
						:key="ach.title"
						class="ledger__crest"
						:class="{ 'ledger__crest--lit': ach.lit }"
						:style="{ animationDelay: 0.05 * idx + 's' }"
						@tap="showCrestHint(ach)"
					>
						<view class="ledger__crest-seal">
							<text class="ledger__crest-glyph">{{ ach.lit ? ach.glyph : '？' }}</text>
						</view>
						<text class="ledger__crest-title">{{ ach.title }}</text>
					</view>
				</view>
			</view>

			<!-- ====== 册页·其四：行脚戳记 ====== -->
			<view class="ledger__page ledger__page--marks">
				<view class="ledger__page-tab"><text>肆</text></view>
				<text class="ledger__page-eyebrow">— 行 脚 戳 记 —</text>
				<view class="ledger__marks">
					<view
						v-for="stele in steleList"
						:key="stele.label"
						class="ledger__mark"
					>
						<view class="ledger__mark-stamp">
							<text class="ledger__mark-value">{{ stele.value }}</text>
						</view>
						<text class="ledger__mark-label">{{ stele.label }}</text>
					</view>
				</view>
			</view>

			<!-- ====== 册页·其五：心头好与行旅札记 ====== -->
			<view class="ledger__page ledger__page--journal">
				<view class="ledger__page-tab"><text>伍</text></view>
				<text class="ledger__page-eyebrow">— 心 头 好 与 札 记 —</text>
				<view v-if="journalEntries.length" class="ledger__journal">
					<view v-for="entry in journalEntries" :key="entry.poiId" class="ledger__journal-item">
						<view class="ledger__journal-stamp" :class="{ 'ledger__journal-stamp--fav': entry.favorited }">
							<text>{{ entry.shortName }}</text>
						</view>
						<view class="ledger__journal-body">
							<view class="ledger__journal-head">
								<text class="ledger__journal-name">{{ entry.name }}</text>
								<text v-if="entry.favorited" class="ledger__journal-fav">★</text>
							</view>
							<text v-if="entry.note" class="ledger__journal-note">「{{ entry.note }}」</text>
							<text v-else class="ledger__journal-blank">— 已收藏 · 尚无札记 —</text>
						</view>
					</view>
				</view>
				<text v-else class="ledger__journal-hint">街景里点开地标，「☆ 收藏」或「✎ 札记」，这里便记下你的心头好。</text>
			</view>

			<!-- 末页题跋（心境）-->
			<view class="ledger__colophon">
				<view class="ledger__colophon-seal"><text>跋</text></view>
				<text class="ledger__colophon-text">「{{ mottoText }}」</text>
			</view>
		</view>

		<!-- 衣橱（换装系统）-->
		<OutfitWardrobe :visible="wardrobeOpen" compact-landscape @close="wardrobeOpen = false" @changed="onWardrobeChanged" />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import DailyCheckIn from '@/components/DailyCheckIn.vue'
import AchievementWall from '@/components/AchievementWall.vue'
import OutfitWardrobe from '@/components/OutfitWardrobe.vue'
import { getGameSnapshot, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { stepBuffer } from '@/common/utils/step-buffer.js'
import { playSFX, SFX } from '@/common/utils/audio.js'
import { getGameplaySettings, updateGameplaySetting } from '@/common/utils/game-settings.js'
import { getJournalEntries } from '@/common/utils/journal.js'

const snapshot = ref(getGameSnapshot())
const settingsOpen = ref(false)
const settings = ref({ music: true, effect: true })
const wardrobeOpen = ref(false)
const journalEntries = ref(getJournalEntries())

/* 设置抽屉与 gameSettings 持久化绑定（此前仅为内存 ref，开关既不读也不写 storage）。 */
function loadSettings() {
	const gs = getGameplaySettings()
	settings.value = {
		music: gs.enableMusic !== false,
		effect: gs.enableEffect !== false
	}
}
function toggleMusic() {
	const result = updateGameplaySetting('enableMusic', !settings.value.music)
	loadSettings()
	if (!result.ok) uni.showToast({ title: '设置未能保存，请重试', icon: 'none' })
}
function toggleEffect() {
	const result = updateGameplaySetting('enableEffect', !settings.value.effect)
	loadSettings()
	if (!result.ok) uni.showToast({ title: '设置未能保存，请重试', icon: 'none' })
}
const checkInRef = ref(null)
const achvRefreshKey = ref(0)

function handleCheckInClaimed(data) {
	snapshot.value = getGameSnapshot()
	achvRefreshKey.value++
	playSFX(SFX.REWARD)
	if (data?.newAchievements?.length) {
		const labels = data.newAchievements.map((a) => a.name).join('、')
		uni.showToast({ title: `新章：${labels}`, icon: 'none', duration: 2200 })
	}
}

const roleSubtitleText = computed(() => snapshot.value.profile.roleName ? `${snapshot.value.profile.roleName} · ${snapshot.value.level.title}` : `${snapshot.value.level.title} · 待定身份`)

const storyCount = computed(() => snapshot.value.progress.totalQuestCompleted || snapshot.value.progress.questData?.completedQuests?.length || 0)
const expPercent = computed(() => snapshot.value.level.progress || 0)

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
		{ title: '票号旧巷', glyph: '票', lit: completed.includes('main-rishengchang'), hint: '完成日升昌入城主线点亮' },
		{ title: '县衙前街', glyph: '衙', lit: completed.includes('main-county-office'), hint: '完成县衙前街主线点亮' },
		{ title: '市集十字', glyph: '市', lit: completed.includes('main-market-crossing'), hint: '完成市集十字主线点亮' },
		{ title: '初入古城', glyph: '入', lit: snapshot.value.progress.discoveredPoiIds?.length > 0, hint: '点亮任意一处古城点位' },
		{ title: '夜话晋小鸦', glyph: '话', lit: !!snapshot.value.runtime?.lastNpcTopic, hint: '与晋小鸦完成一次讲解' },
		{ title: '行旅启程', glyph: '行', lit: (snapshot.value.progress.steps || 0) > 0, hint: '在街景里迈出第一步' }
	]
})

/* 点击勋印查看其点亮条件 / 状态（成就详情见上方「勋印之墙」，此处为行旅里程碑速览）。 */
function showCrestHint(ach) {
	uni.showToast({
		title: ach.lit ? `${ach.title} · 已点亮` : `${ach.title} · ${ach.hint}`,
		icon: 'none',
		duration: 2000
	})
}

const steleList = computed(() => [
	{ label: '故事 · 篇', value: storyCount.value },
	{ label: '点亮 · 火', value: snapshot.value.progress.discoveredPoiIds?.length || 0 },
	{ label: '行旅 · 步', value: snapshot.value.progress.steps || 0 },
	{ label: '票券 · 张', value: snapshot.value.redeemOrderCount || 0 }
])

const mottoText = computed(() => snapshot.value.profile.roleMotto || snapshot.value.currentStreet?.playerHint || '一城风物，不必赶路')

onShow(() => {
	markPageVisit('user', { returnPage: '/pages_game/street/street', returnTab: '/pages/user/user' })
	rememberReturnContext('/pages_game/street/street', '/pages/user/user')
	const sync = syncAchievementUnlocks()
	snapshot.value = getGameSnapshot()
	journalEntries.value = getJournalEntries()
	loadSettings()
	achvRefreshKey.value++
	checkInRef.value?.refresh?.()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		const gr = sync.grantedReward || {}
		const bonus = gr.silverKey ? `（银钥+${gr.silverKey}）` : (gr.exp ? `（经验+${gr.exp}）` : '')
		uni.showToast({ title: `点亮：${labels}${bonus}`, icon: 'none', duration: 2200 })
	}
})

function tryOutfit() {
	wardrobeOpen.value = true
}

/* 换装后刷新快照（等级/银钥可能因购买变化），衣橱内自身已即时刷新。 */
function onWardrobeChanged() {
	snapshot.value = getGameSnapshot()
}

function confirmReset() {
	uni.showModal({
		title: '重置行旅',
		content: '是否清空当前所有行旅记录？',
		success: (res) => {
			if (res.confirm) {
				try {
					uni.clearStorageSync()
					stepBuffer.clear()
				} catch (e) {
					uni.showToast({ title: '行旅记录未能清空，请重试', icon: 'none' })
					return
				}
				uni.reLaunch({ url: '/pages_game/splash/splash' })
			}
		}
	})
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

/* ===== 行旅册：一本摊在木案上的线装册子 ===== */
.ledger {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background:
		radial-gradient(ellipse at 50% 14%, rgba(255, 180, 90, 0.14) 0%, transparent 50%),
		linear-gradient(180deg, #2a160c 0%, #1a0d08 55%, #0a0604 100%);
	overflow: hidden;
	padding: calc(env(safe-area-inset-top) + 24rpx) 24rpx calc(env(safe-area-inset-bottom) + 132rpx);
	box-sizing: border-box;
}

/* 木案：册子下方的书桌纹理 */
.ledger__desk {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(96deg, rgba(40, 22, 14, 0.55) 0, rgba(40, 22, 14, 0.55) 3rpx, transparent 3rpx, transparent 140rpx),
		linear-gradient(180deg, #3a2012 0%, #271509 100%);
	pointer-events: none;
	z-index: 0;
}

.ledger__desk-grain {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(0deg, rgba(212, 165, 116, 0.04) 0, rgba(212, 165, 116, 0.04) 1rpx, transparent 1rpx, transparent 26rpx);
	mix-blend-mode: overlay;
	opacity: 0.6;
	pointer-events: none;
	z-index: 0;
}

.ledger__veil {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 0%, transparent 35%, rgba(0, 0, 0, 0.45) 100%);
	pointer-events: none;
	z-index: 1;
}

/* ===== 设置铜环（右上）===== */
.ledger__settings-ring {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 22rpx);
	right: 28rpx;
	z-index: 30;
	width: 76rpx;
	height: 76rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	animation: fadeInUp 0.6s ease 0.2s both;
}

.ledger__settings-ring-arc {
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

.ledger__settings-ring-core {
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

.ledger__settings-ring:active .ledger__settings-ring-core {
	transform: rotate(40deg);
}

/* 设置抽屉 */
.ledger__settings {
	position: absolute;
	top: calc(env(safe-area-inset-top) + 110rpx);
	right: 28rpx;
	z-index: 31;
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

.ledger__settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10rpx 0;
}

.ledger__settings-row + .ledger__settings-row {
	border-top: 1rpx dashed rgba(110, 85, 65, 0.32);
}

.ledger__settings-row--danger .ledger__settings-label { color: $py-red; }

.ledger__settings-label {
	font-size: 22rpx;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.ledger__settings-action {
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

.ledger__settings-toggle {
	width: 64rpx;
	height: 32rpx;
	background: rgba(110, 85, 65, 0.42);
	border-radius: 999rpx;
	position: relative;
	transition: background 0.2s ease;
}

.ledger__settings-toggle--on { background: $py-red; }

.ledger__settings-toggle-knob {
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

.ledger__settings-toggle--on .ledger__settings-toggle-knob { left: 34rpx; }

/* ===== 线装册子主体 ===== */
.ledger__book {
	position: relative;
	z-index: 5;
	margin-top: calc(env(safe-area-inset-top) + 12rpx);
	padding: 40rpx 30rpx 44rpx 46rpx;
	background:
		linear-gradient(100deg, rgba(232, 215, 180, 0.96) 0%, rgba(245, 238, 222, 0.98) 16%, rgba(245, 240, 226, 0.98) 100%);
	border-radius: 6rpx 12rpx 12rpx 6rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 252, 245, 0.6),
		0 20rpx 50rpx rgba(0, 0, 0, 0.6),
		0 2rpx 0 rgba(0, 0, 0, 0.4);
	overflow: hidden;
	animation: ledgerOpen 0.65s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: left center;
}

/* 宣纸纤维纹理叠在册子上 */
.ledger__book::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.05) 0, rgba(139, 69, 19, 0.05) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.035) 0, rgba(139, 69, 19, 0.035) 1rpx, transparent 1rpx, transparent 13rpx);
	mix-blend-mode: multiply;
	pointer-events: none;
	z-index: 0;
}

.ledger__book > * { position: relative; z-index: 1; }

@keyframes ledgerOpen {
	0%   { transform: perspective(1400rpx) rotateY(-26deg) scaleX(0.92); opacity: 0; }
	100% { transform: perspective(1400rpx) rotateY(0deg) scaleX(1); opacity: 1; }
}

/* 装订书脊 */
.ledger__spine {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 30rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;
	background:
		linear-gradient(90deg, #4a2a18 0%, #6b3510 55%, rgba(74, 42, 24, 0.2) 100%);
	box-shadow: inset -3rpx 0 8rpx rgba(0, 0, 0, 0.4);
	z-index: 2;
}

.ledger__spine-stitch {
	width: 8rpx;
	height: 26rpx;
	background: linear-gradient(180deg, #2a1810 0%, #1a0d08 100%);
	border-radius: 999rpx;
	box-shadow:
		inset 0 1rpx 1rpx rgba(0, 0, 0, 0.6),
		0 0 2rpx rgba(255, 235, 195, 0.25);
}

/* 竖排书名签条 */
.ledger__title-slip {
	position: absolute;
	top: -6rpx;
	right: 44rpx;
	z-index: 6;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	width: 52rpx;
	padding: 16rpx 0 12rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(238, 228, 208, 0.96) 100%);
	border: 1rpx solid rgba(110, 85, 65, 0.4);
	border-top: none;
	border-radius: 0 0 4rpx 4rpx;
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.3);
	animation: slipDrop 0.55s cubic-bezier(0.2, 0.8, 0.4, 1) 0.3s both;
	transform-origin: top center;
}

@keyframes slipDrop {
	0%   { transform: translateY(-12rpx) scaleY(0.7); opacity: 0; }
	100% { transform: translateY(0) scaleY(1); opacity: 1; }
}

.ledger__title-slip-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
	writing-mode: vertical-rl;
	text-shadow: 0 1rpx 0 rgba(255, 252, 245, 0.6);
}

.ledger__title-slip-seal {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34rpx;
	height: 34rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 19rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.45);
}

/* ===== 封页：身份腰牌 ===== */
.ledger__cover {
	display: flex;
	justify-content: flex-start;
	padding-right: 70rpx;
	margin-bottom: 8rpx;
	animation: fadeInUp 0.6s ease 0.2s both;
}

.ledger__badge {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 18rpx;
}

.ledger__badge-hole {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 35%, #6b3510 0%, #2a1810 75%);
	box-shadow: inset 0 1rpx 2rpx rgba(0, 0, 0, 0.7);
	z-index: 3;
}

.ledger__badge-cord {
	width: 2rpx;
	height: 16rpx;
	background: linear-gradient(180deg, $py-bronze 0%, #4a2a18 100%);
	margin-top: -2rpx;
}

.ledger__badge-body {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 14rpx 22rpx 14rpx 14rpx;
	background:
		linear-gradient(135deg, #4a2a18 0%, #6b3510 45%, #8b4513 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 10rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.35),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.5);
	animation: badgeSway 5s ease-in-out infinite;
	transform-origin: top center;
}

@keyframes badgeSway {
	0%, 100% { transform: rotate(-0.6deg); }
	50%      { transform: rotate(0.6deg); }
}

.ledger__badge-portrait {
	position: relative;
	width: 96rpx;
	height: 96rpx;
	border-radius: 8rpx;
	overflow: hidden;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.45) 0%, transparent 45%),
		linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.6);
	box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.5);
	flex-shrink: 0;
}

.ledger__badge-portrait-img {
	width: 100%;
	height: 100%;
}

.ledger__badge-info {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}

.ledger__badge-eyebrow {
	font-size: 15rpx;
	letter-spacing: 3rpx;
	color: rgba(212, 165, 116, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.ledger__badge-name {
	font-size: 30rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.ledger__badge-role {
	font-size: 18rpx;
	color: rgba(212, 165, 116, 0.9);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 320rpx;
}

/* ===== 册页通用 ===== */
.ledger__page {
	position: relative;
	margin-top: 30rpx;
	padding: 28rpx 22rpx 24rpx;
	background: rgba(255, 250, 240, 0.5);
	border: 1rpx solid rgba(110, 85, 65, 0.22);
	border-radius: 6rpx;
	box-shadow: inset 0 1rpx 0 rgba(255, 252, 245, 0.6);
	animation: fadeInUp 0.6s ease both;
}

/* 册页之间的折痕分隔 */
.ledger__page + .ledger__page,
.ledger__cover + .ledger__page {
	border-top: 2rpx dashed rgba(110, 85, 65, 0.3);
}

.ledger__page--rank    { animation-delay: 0.3s; }
.ledger__page--checkin { animation-delay: 0.42s; }
.ledger__page--achv    { animation-delay: 0.54s; }
.ledger__page--marks   { animation-delay: 0.66s; }

/* 页角骑缝印章序号 */
.ledger__page-tab {
	position: absolute;
	top: -16rpx;
	left: 22rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40rpx;
	height: 40rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	border-radius: 5rpx;
	transform: rotate(-7deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.45);
}

.ledger__page-tab::before {
	content: '';
	position: absolute;
	inset: 3rpx;
	border: 1rpx solid rgba(255, 220, 220, 0.5);
	border-radius: 3rpx;
}

.ledger__page-eyebrow {
	display: block;
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	margin-bottom: 18rpx;
}

/* 包裹外部组件的浅框，避免组件深色样式贴宣纸突兀 */
.ledger__embed {
	position: relative;
}

/* ===== 册页·其一：品阶官印 ===== */
.ledger__rank-hero {
	display: flex;
	align-items: center;
	gap: 26rpx;
	padding: 0 6rpx 6rpx;
}

.ledger__seal-big {
	position: relative;
	flex-shrink: 0;
	width: 152rpx;
	height: 152rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
	animation: sealBreath 3s ease-in-out infinite;
}

.ledger__seal-big-rim {
	position: absolute;
	inset: 0;
	background: rgba(196, 30, 58, 0.05);
	border: 5rpx solid $py-red;
	border-radius: 12rpx;
	transform: rotate(-5deg);
	box-shadow:
		inset 0 0 0 2rpx rgba(196, 30, 58, 0.18),
		0 6rpx 16rpx rgba(196, 30, 58, 0.25);
}

.ledger__seal-big-rim::before {
	content: '';
	position: absolute;
	inset: 6rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 7rpx;
}

@keyframes sealBreath {
	0%, 100% { transform: scale(1); }
	50%      { transform: scale(1.04); }
}

.ledger__seal-big-num {
	position: relative;
	z-index: 2;
	font-size: 60rpx;
	font-weight: 700;
	color: $py-red;
	font-family: 'Noto Serif SC', 'KaiTi', serif;
	line-height: 1;
	text-shadow: 0 1rpx 0 rgba(255, 252, 245, 0.6);
	transform: rotate(-5deg);
}

.ledger__seal-big-title {
	position: relative;
	z-index: 2;
	font-size: 18rpx;
	font-weight: 700;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	transform: rotate(-5deg);
}

.ledger__rank-side {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.ledger__rank-side-line {
	font-size: 26rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.ledger__rank-side-sub {
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.82);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

.ledger__exp {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 4rpx;
}

.ledger__exp-track {
	position: relative;
	flex: 1;
	height: 18rpx;
	background:
		linear-gradient(180deg, rgba(74, 42, 24, 0.22) 0%, rgba(74, 42, 24, 0.12) 100%);
	border: 1rpx solid rgba(110, 85, 65, 0.42);
	border-radius: 999rpx;
	overflow: visible;
	box-shadow: inset 0 1rpx 3rpx rgba(0, 0, 0, 0.32);
}

.ledger__exp-fill {
	position: relative;
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, $py-bronze 0%, $py-gold 50%, $py-gold-light 100%);
	box-shadow: 0 0 12rpx rgba(255, 220, 130, 0.55);
	transition: width 0.7s ease;
	overflow: hidden;
}

.ledger__exp-fill-shine {
	position: absolute;
	top: 0;
	left: -40rpx;
	width: 40rpx;
	height: 100%;
	background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%);
	animation: expShine 2.2s linear infinite;
}

@keyframes expShine {
	0%   { left: -40rpx; }
	100% { left: 100%; }
}

.ledger__exp-mark {
	position: absolute;
	top: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28rpx;
	height: 28rpx;
	background: $py-paper-warm;
	border: 2rpx solid $py-red;
	border-radius: 50%;
	color: $py-red;
	font-size: 15rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.4);
	transition: left 0.7s ease;
}

.ledger__exp-pct {
	flex-shrink: 0;
	font-size: 18rpx;
	font-weight: 700;
	color: #6b3510;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

.ledger__tryon {
	align-self: flex-start;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: 6rpx;
	transition: transform 0.2s ease;
}

.ledger__tryon:active { transform: scale(0.94); }

.ledger__tryon-cord {
	width: 10rpx;
	height: 10rpx;
	margin-bottom: -2rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f5d76e 0%, #8b4513 70%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
	z-index: 2;
}

.ledger__tryon-body {
	padding: 8rpx 26rpx;
	background: linear-gradient(180deg, #6b1622 0%, #c41e3a 40%, #6b1622 100%);
	clip-path: polygon(8% 0, 92% 0, 100% 16%, 100% 100%, 0 100%, 0 16%);
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.3),
		0 4rpx 10rpx rgba(0, 0, 0, 0.45);
}

/* 品阶骑缝印（5 级横排）*/
.ledger__rank-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8rpx;
	margin-top: 22rpx;
	padding-top: 18rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.3);
}

.ledger__rank-cell {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	transition: transform 0.3s ease;
}

.ledger__rank-cell-seal {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	border-radius: 6rpx;
	border: 3rpx solid rgba(110, 85, 65, 0.45);
	background: rgba(110, 85, 65, 0.06);
	color: rgba(110, 85, 65, 0.6);
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform: rotate(-5deg);
}

.ledger__rank-cell-mark {
	line-height: 1;
	text-shadow: 0 1rpx 0 rgba(255, 252, 245, 0.4);
}

.ledger__rank-cell-name {
	font-size: 17rpx;
	font-weight: 700;
	color: rgba(110, 85, 65, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	text-align: center;
}

.ledger__rank-cell-exp {
	font-size: 14rpx;
	color: rgba(110, 85, 65, 0.5);
	letter-spacing: 1rpx;
}

/* 已过阶：淡墨印 */
.ledger__rank-cell--done .ledger__rank-cell-seal {
	border-color: rgba(139, 69, 19, 0.7);
	background: rgba(139, 69, 19, 0.1);
	color: #8b4513;
}

.ledger__rank-cell--done .ledger__rank-cell-name {
	color: #8b4513;
}

/* 当前阶：朱印 */
.ledger__rank-cell--current {
	transform: translateY(-4rpx);
}

.ledger__rank-cell--current .ledger__rank-cell-seal {
	border-color: $py-red;
	background: rgba(196, 30, 58, 0.08);
	color: $py-red;
	box-shadow: 0 0 16rpx rgba(196, 30, 58, 0.45);
	animation: cellStampPulse 1.8s ease-in-out infinite;
}

@keyframes cellStampPulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(196, 30, 58, 0.5), 0 0 16rpx rgba(196, 30, 58, 0.3); }
	50%      { box-shadow: 0 0 0 8rpx rgba(196, 30, 58, 0), 0 0 16rpx rgba(196, 30, 58, 0.45); }
}

.ledger__rank-cell--current .ledger__rank-cell-name {
	color: $py-red;
}

/* 未达阶：留白虚印 */
.ledger__rank-cell--locked .ledger__rank-cell-seal {
	border-style: dashed;
	opacity: 0.6;
}

.ledger__rank-cell--locked .ledger__rank-cell-name {
	opacity: 0.6;
}

/* ===== 册页·其三：行旅勋印 ===== */
.ledger__crests {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 22rpx 14rpx;
	margin-top: 24rpx;
	padding-top: 20rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.3);
}

.ledger__crest {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	animation: medalDrop 0.45s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

@keyframes medalDrop {
	0%   { transform: translateY(-16rpx); opacity: 0; }
	100% { transform: translateY(0); opacity: 1; }
}

.ledger__crest-seal {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 78rpx;
	height: 78rpx;
	border-radius: 50%;
	border: 3rpx dashed rgba(110, 85, 65, 0.45);
	background: rgba(110, 85, 65, 0.05);
	color: rgba(110, 85, 65, 0.55);
	font-size: 34rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transition: all 0.3s ease;
}

.ledger__crest-glyph {
	position: relative;
	z-index: 1;
	line-height: 1;
	text-shadow: 0 1rpx 0 rgba(255, 252, 245, 0.4);
}

.ledger__crest-title {
	font-size: 17rpx;
	letter-spacing: 2rpx;
	color: rgba(110, 85, 65, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-align: center;
}

/* 点亮：朱红钤印 */
.ledger__crest--lit .ledger__crest-seal {
	border-style: solid;
	border-color: $py-red;
	background:
		radial-gradient(circle at 50% 50%, rgba(196, 30, 58, 0.12) 0%, rgba(196, 30, 58, 0.04) 100%);
	color: $py-red;
	transform: rotate(-6deg);
	box-shadow:
		inset 0 0 0 2rpx rgba(196, 30, 58, 0.2),
		0 4rpx 10rpx rgba(196, 30, 58, 0.25);
}

.ledger__crest--lit .ledger__crest-seal::before {
	content: '';
	position: absolute;
	inset: 5rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.35);
	border-radius: 50%;
}

.ledger__crest--lit .ledger__crest-title {
	color: $py-red;
	font-weight: 700;
}

/* ===== 册页·其四：行脚戳记 ===== */
.ledger__marks {
	display: flex;
	align-items: flex-start;
	justify-content: space-around;
	gap: 12rpx;
	padding: 6rpx 4rpx 0;
}

.ledger__mark {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	flex: 1;
	transition: transform 0.2s ease;
}

.ledger__mark:active { transform: translateY(2rpx) scale(0.96); }

.ledger__mark-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	border: 3rpx solid $py-bronze;
	background:
		radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.16) 0%, rgba(212, 165, 116, 0.05) 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(139, 69, 19, 0.18),
		0 4rpx 10rpx rgba(0, 0, 0, 0.22);
	transform: rotate(-5deg);
	position: relative;
}

.ledger__mark-stamp::before {
	content: '';
	position: absolute;
	inset: 5rpx;
	border: 1rpx dashed rgba(139, 69, 19, 0.3);
	border-radius: 50%;
}

.ledger__mark-value {
	font-size: 40rpx;
	font-weight: 700;
	color: #8b4513;
	font-family: 'Noto Serif SC', 'KaiTi', serif;
	line-height: 1;
	text-shadow: 0 1rpx 0 rgba(255, 252, 245, 0.5);
}

.ledger__mark-label {
	font-size: 17rpx;
	color: rgba(110, 85, 65, 0.82);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	white-space: nowrap;
}

/* ===== 末页题跋 ===== */
.ledger__colophon {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
	margin-top: 34rpx;
	padding-top: 24rpx;
	border-top: 2rpx dashed rgba(110, 85, 65, 0.3);
	animation: fadeInUp 0.6s ease 0.8s both;
}

.ledger__colophon-seal {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40rpx;
	height: 40rpx;
	flex-shrink: 0;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	border-radius: 5rpx;
	transform: rotate(-6deg);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.4);
}

.ledger__colophon-text {
	font-size: 22rpx;
	line-height: 1.8;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 3rpx;
	font-style: italic;
	text-align: center;
}

/* ===== 册页·其五：心头好与札记 ===== */
.ledger__page--journal { animation-delay: 0.72s; }

.ledger__journal {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	margin-top: 6rpx;
}

.ledger__journal-item {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
	padding: 12rpx 14rpx;
	background: rgba(255, 250, 240, 0.6);
	border: 1rpx solid rgba(110, 85, 65, 0.2);
	border-radius: 6rpx;
}

.ledger__journal-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52rpx;
	height: 52rpx;
	flex-shrink: 0;
	border: 3rpx solid rgba(110, 85, 65, 0.5);
	border-radius: 6rpx;
	transform: rotate(-5deg);
	color: rgba(110, 85, 65, 0.85);
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	background: rgba(110, 85, 65, 0.06);
}

.ledger__journal-stamp--fav {
	border-color: $py-red;
	color: $py-red;
	background: rgba(196, 30, 58, 0.08);
}

.ledger__journal-body { flex: 1; min-width: 0; }

.ledger__journal-head {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.ledger__journal-name {
	font-size: 23rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

.ledger__journal-fav { font-size: 20rpx; color: $py-red; }

.ledger__journal-note {
	display: block;
	margin-top: 4rpx;
	font-size: 21rpx;
	line-height: 1.7;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.ledger__journal-blank {
	display: block;
	margin-top: 4rpx;
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.5);
}

.ledger__journal-hint {
	display: block;
	margin-top: 8rpx;
	font-size: 19rpx;
	line-height: 1.7;
	text-align: center;
	color: rgba(110, 85, 65, 0.6);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* 通用动画 */
@keyframes fadeInUp {
	0%   { opacity: 0; transform: translateY(20rpx); }
	100% { opacity: 1; transform: translateY(0); }
}
/* Fixed achievement details must escape the book's entrance animation. */
.ledger__book { z-index: auto; animation-fill-mode: backwards; }
.ledger__page--achv { z-index: 40; animation-fill-mode: backwards; }
@import './user-landscape.scss';
@media (min-width: 1000px) and (min-height: 560px) {
	.ledger { padding: 32px max(48px, calc((100vw - 1160px) / 2)); }
	.ledger__book { padding: 34px 40px; gap: 26px 50px; grid-template-columns: 1fr 1.5fr; }
	.ledger__badge-portrait { width: 84px; height: 100px; }
	.ledger__badge-name { font-size: 26px; }
	.ledger__badge-role { font-size: 14px; line-height: 1.7; }
	.ledger__page-eyebrow { font-size: 16px; margin-bottom: 16px; letter-spacing: 4px; }
	.ledger__rank-side-line { font-size: 16px; }
	.ledger__journal { gap: 24px; }
	.ledger__journal-name { font-size: 17px; }
	.ledger__journal-note, .ledger__journal-blank, .ledger__journal-hint { font-size: 14px; }
	.ledger :deep(.check-in-card__cell) { padding: 12px 4px; }
	.ledger :deep(.check-in-card__cell-num) { font-size: 14px; }
	.ledger :deep(.check-in-card__claim) { min-height: 48px; }
}
</style>
