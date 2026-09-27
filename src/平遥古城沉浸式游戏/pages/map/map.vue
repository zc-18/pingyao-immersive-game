<template>
	<view class="map-stage">
		<!-- 暗色帷幕背景 -->
		<view class="map-stage__veil"></view>

		<!-- 飘落银杏 -->
		<FallingLeaves type="leaf" :density="10" />

		<!-- 顶部铜尺刻度 -->
		<view class="map-stage__rule">
			<view class="map-stage__rule-track">
				<view
					v-for="i in 11"
					:key="i"
					class="map-stage__rule-mark"
					:class="{ 'map-stage__rule-mark--major': (i - 1) % 5 === 0 }"
				></view>
			</view>
			<view class="map-stage__rule-label">
				<text class="map-stage__rule-num">{{ unlockedPoiCount }} / {{ mapPoiList.length }}</text>
				<text class="map-stage__rule-text">— 已 探 处 —</text>
			</view>
		</view>

		<!-- 折扇按钮（右上角，切换打卡履历 / 路线推荐）-->
		<view class="map-stage__fan-btn" @tap="toggleSidePanel">
			<view class="map-stage__fan-btn-inner">
				<text class="map-stage__fan-btn-char">{{ sidePanelOpen ? '收' : '扇' }}</text>
			</view>
		</view>

		<!-- 视野切换：当前街景 / 全城 -->
		<view class="map-stage__scope-btn" @tap="toggleScope">
			<text class="map-stage__scope-btn-text">{{ showAllPois ? '全 城' : '本 街' }}</text>
		</view>

		<!-- 主卷轴（手绘平遥城）-->
		<view class="map-stage__scroll">
			<view class="map-stage__scroll-roll map-stage__scroll-roll--top"></view>
			<view class="map-stage__scroll-roll map-stage__scroll-roll--bot"></view>

			<view class="map-stage__paper">
				<view class="map-stage__paper-fiber"></view>

				<!-- 标题 -->
				<view class="map-stage__title">
					<text class="map-stage__title-text">— 平 遥 古 城 ·  览 胜 图 —</text>
					<text class="map-stage__subtitle">{{ showAllPois ? '全 城 总 览' : snapshot.currentStreet.title }} · {{ snapshot.trackedQuest?.title || '自由探索' }}</text>
				</view>

				<!-- 地图主区（伪手绘水墨）-->
				<view class="map-stage__map">
					<!-- 城墙轮廓 -->
					<view class="map-stage__wall"></view>

					<!-- 街区分块（手绘）-->
					<view class="map-stage__district map-stage__district--nw"></view>
					<view class="map-stage__district map-stage__district--ne"></view>
					<view class="map-stage__district map-stage__district--sw"></view>
					<view class="map-stage__district map-stage__district--se"></view>

					<!-- 主十字大街 -->
					<view class="map-stage__avenue map-stage__avenue--h"></view>
					<view class="map-stage__avenue map-stage__avenue--v"></view>

					<!-- 墨迹路径（断续虚线）-->
					<view class="map-stage__route map-stage__route--1"></view>
					<view class="map-stage__route map-stage__route--2"></view>
					<view class="map-stage__route map-stage__route--3"></view>

					<!-- 飘动的远山 -->
					<view class="map-stage__mountain map-stage__mountain--l">山</view>
					<view class="map-stage__mountain map-stage__mountain--r">岭</view>

					<!-- POI 印章 -->
					<view
						v-for="poi in mapPoiList"
						:key="poi.id"
						class="map-stage__poi"
						:class="{
							'map-stage__poi--active': selectedPoiId === poi.id,
							'map-stage__poi--quest': poi.status === 'quest',
							'map-stage__poi--locked': !poi.isUnlocked
						}"
						:style="{ left: poi.mapPosition.x + '%', top: poi.mapPosition.y + '%' }"
						@tap="selectedPoiId = poi.id"
					>
						<view class="map-stage__poi-stamp">
							<text class="map-stage__poi-stamp-text">{{ poi.isUnlocked ? poi.shortName : '？' }}</text>
						</view>
						<view class="map-stage__poi-flag" v-if="poi.isUnlocked">
							<text class="map-stage__poi-flag-text">{{ poi.name }}</text>
						</view>
						<view v-if="!poi.isUnlocked" class="map-stage__poi-fog"></view>
					</view>

					<!-- 玩家位置（红印章 + 在此小红旗）-->
					<view class="map-stage__player" :style="{ left: playerMapPos.x + '%', top: playerMapPos.y + '%' }">
						<view class="map-stage__player-flag">
							<text class="map-stage__player-flag-text">在此</text>
							<view class="map-stage__player-pole"></view>
						</view>
						<view class="map-stage__player-stamp">
							<text class="map-stage__player-stamp-text">我</text>
						</view>
						<view class="map-stage__player-pulse"></view>
					</view>
				</view>

				<!-- 底部图例 -->
				<view class="map-stage__legend">
					<view class="map-stage__legend-item">
						<view class="map-stage__legend-dot map-stage__legend-dot--quest"></view>
						<text>主线热点</text>
					</view>
					<view class="map-stage__legend-item">
						<view class="map-stage__legend-dot"></view>
						<text>已点亮</text>
					</view>
					<view class="map-stage__legend-item">
						<view class="map-stage__legend-dot map-stage__legend-dot--locked"></view>
						<text>未启</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部弹出：POI 详情卷轴 -->
		<view v-if="selectedPoi" class="map-stage__detail-mask" @tap="selectedPoiId = ''"></view>
		<view v-if="selectedPoi" class="map-stage__detail" @tap.stop>
			<view class="map-stage__detail-close" role="button" aria-label="关闭点位详情" @tap="selectedPoiId = ''"><PyIcon name="close" size="20px" variant="plain" /></view>
			<view class="map-stage__detail-roll map-stage__detail-roll--top"></view>
			<view class="map-stage__detail-paper">
				<view class="map-stage__detail-fiber"></view>
				<view class="map-stage__detail-head">
					<view>
						<text class="map-stage__detail-eyebrow">— 古城点位 —</text>
						<text class="map-stage__detail-name">{{ selectedPoiDisplay.name }}</text>
					</view>
					<view class="map-stage__detail-stamp">
						<text>{{ selectedPoiDisplay.statusText }}</text>
					</view>
				</view>

				<text class="map-stage__detail-desc">{{ selectedPoiDisplay.description }}</text>

				<view class="map-stage__detail-story">
					<text class="map-stage__detail-story-label">— 晋小鸦提示 —</text>
					<text class="map-stage__detail-story-text">{{ selectedPoiDisplay.npcTopic }}</text>
				</view>

				<view class="map-stage__detail-actions">
					<view class="map-stage__detail-cta" @tap="goExplore">
						<text>{{ selectedPoiDisplay.actionText }} ›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 侧边折扇展开（打卡履历 / 路线推荐）-->
		<view v-if="sidePanelOpen" class="map-stage__side-mask" @tap="sidePanelOpen = false"></view>
		<view v-if="sidePanelOpen" class="map-stage__side" @tap.stop>
			<view class="map-stage__side-tabs">
				<view
					v-for="tab in sideTabs"
					:key="tab.key"
					class="map-stage__side-tab"
					:class="{ 'map-stage__side-tab--active': activeSideTab === tab.key }"
					@tap="activeSideTab = tab.key"
				>
					{{ tab.label }}
				</view>
			</view>

			<scroll-view scroll-y class="map-stage__side-content">
				<template v-if="activeSideTab === 'history'">
					<view v-for="poi in unlockedPoiList" :key="poi.id" class="map-stage__history-item">
						<view class="map-stage__history-stamp">
							<text>{{ poi.shortName }}</text>
						</view>
						<view class="map-stage__history-info">
							<text class="map-stage__history-name">{{ poi.name }}</text>
							<text class="map-stage__history-desc">{{ poi.description }}</text>
						</view>
					</view>
					<EmptyOwl
						v-if="unlockedPoiList.length === 0"
						text="还没有点亮任何位置——先去街景里走两步吧。"
					/>
				</template>

				<template v-else>
					<view class="map-stage__route-card">
						<text class="map-stage__route-card-label">— 推 荐 路 线 —</text>
						<text class="map-stage__route-card-title">{{ snapshot.trackedQuest?.title || '自由游历线' }}</text>
						<text class="map-stage__route-card-desc">从眼下停留处启程，沿主线热点逐一点亮。</text>
						<view class="map-stage__route-steps">
							<view v-for="(step, idx) in routeSteps" :key="idx" class="map-stage__route-step">
								<view class="map-stage__route-step-num">{{ idx + 1 }}</view>
								<text class="map-stage__route-step-text">{{ step }}</text>
							</view>
						</view>
					</view>
				</template>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import EmptyOwl from '@/components/EmptyOwl.vue'
import PyIcon from '@/components/PyIcon.vue'
import { getGameSnapshot, getScenePoiList, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { getPoiStatusText, isUnlockedPoiStatus, getPoiShortLabel } from '@/common/utils/poi.js'
import { poiList, poiMap } from '@/common/data/poi-list.js'
import { getUserProgress } from '@/common/utils/storage.js'

const snapshot = ref(getGameSnapshot())
const selectedPoiId = ref('')
const sidePanelOpen = ref(false)
const activeSideTab = ref('history')
const showAllPois = ref(true)

const sideTabs = [
	{ key: 'history', label: '打卡履历' },
	{ key: 'route', label: '路线推荐' }
]

// 当前场景 POI（受任务高亮影响）
const sceneScopedPois = computed(() =>
	getScenePoiList(snapshot.value.currentStreet.id, { trackedQuest: snapshot.value.trackedQuest })
)

// 全城 POI（合并 poi-list.js 中所有 POI；若已经在场景中则继承场景态）
const cityPoiList = computed(() => {
	const overridesById = sceneScopedPois.value.reduce((map, poi) => {
		map[poi.id] = poi
		return map
	}, {})
	const progress = getUserProgress()
	const visited = new Set(progress.visitedPoiIds || [])
	const discovered = new Set(progress.discoveredPoiIds || [])

	return poiList.map((poi) => {
		const fromScene = overridesById[poi.id]
		if (fromScene) return fromScene
		// 全城状态：已访问 → nearby；已发现 → route；否则 → discoverable（未点亮）。
		// 不能用 poi.baseStatus 兜底——poi-list 里多处 POI 自带 hot/route/quest 等可解锁基态，
		// 会让从未到访的县衙/票号/明清街等被误判"已探"，与成就/我的页的真实探索口径冲突。
		let status = 'discoverable'
		if (visited.has(poi.id)) status = 'completed'
		else if (discovered.has(poi.id)) status = 'route'
		return {
			...poi,
			status,
			isVisited: visited.has(poi.id),
			isDiscovered: discovered.has(poi.id)
		}
	})
})

const mapPoiList = computed(() =>
	(showAllPois.value ? cityPoiList.value : sceneScopedPois.value).map((item) => ({
		...item,
		shortName: getPoiShortLabel(item),
		isUnlocked: isUnlockedPoiStatus(item.status)
	}))
)

const selectedPoi = computed(() => mapPoiList.value.find((item) => item.id === selectedPoiId.value) || null)
const unlockedPoiCount = computed(() => mapPoiList.value.filter((item) => item.isUnlocked).length)
const unlockedPoiList = computed(() => mapPoiList.value.filter((item) => item.isUnlocked))

/* 玩家在城图上的位置：全城视野落在当前街景代表点位（heroPoi 的城图坐标），不再恒在死中心；本街视野居中即可。 */
const playerMapPos = computed(() => {
	if (!showAllPois.value) return { x: 54, y: 52 }
	const hero = poiMap[snapshot.value.currentStreet?.heroPoiId]
	return hero?.mapPosition || { x: 50, y: 50 }
})

const routeSteps = computed(() => mapPoiList.value
	.filter((item) => item.status === 'quest' || item.status === 'route' || item.status === 'hot')
	.slice(0, 4)
	.map((item) => `${item.name} · ${item.description.slice(0, 26)}…`))

const selectedPoiDisplay = computed(() => {
	if (!selectedPoi.value) {
		return {
			name: '选一处位置',
			statusText: '',
			description: '点选地图上的印章查看详情。',
			npcTopic: '古城的故事藏在每个角落。',
			actionText: '回街景'
		}
	}

	if (!selectedPoi.value.isUnlocked) {
		return {
			name: '？？？ 未启之地',
			statusText: '尚未点亮',
			description: '此处还在墨色拓印中。把主线推进一段，它会自己亮起来。',
			npcTopic: '古城不会一次把所有线索都摊开。',
			actionText: '续主线'
		}
	}

	return {
		name: selectedPoi.value.name,
		statusText: getPoiStatusText(selectedPoi.value.status),
		description: selectedPoi.value.description,
		npcTopic: selectedPoi.value.npcTopic,
		actionText: selectedPoi.value.status === 'quest' ? '前往热点' : '回街景'
	}
})

onShow(() => {
	markPageVisit('map', { returnPage: '/pages_game/street/street', returnTab: '/pages/map/map' })
	rememberReturnContext('/pages_game/street/street', '/pages/map/map')
	snapshot.value = getGameSnapshot()
	selectedPoiId.value = mapPoiList.value.find((item) => item.status === 'quest')?.id || ''
})

function goExplore() {
	uni.navigateTo({ url: '/pages_game/street/street' })
}

function toggleSidePanel() {
	sidePanelOpen.value = !sidePanelOpen.value
}

function toggleScope() {
	showAllPois.value = !showAllPois.value
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.map-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	background: linear-gradient(180deg, #1a1108 0%, #0a0604 100%);
	overflow: hidden;
	padding: calc(env(safe-area-inset-top) + 24rpx) 24rpx calc(env(safe-area-inset-bottom) + 140rpx);
	box-sizing: border-box;
}

.map-stage__veil {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(212, 165, 116, 0.08) 0%, transparent 50%),
		radial-gradient(ellipse at 80% 80%, rgba(196, 30, 58, 0.05) 0%, transparent 40%);
	pointer-events: none;
}

/* ===== 顶部铜尺 ===== */
.map-stage__rule {
	position: relative;
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 14rpx 32rpx;
	background:
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 6rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.45),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.45),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	z-index: 4;
	animation: fadeInUp 0.6s ease both;
}

.map-stage__rule-track {
	flex: 1;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	height: 28rpx;
}

.map-stage__rule-mark {
	width: 2rpx;
	height: 12rpx;
	background: rgba(255, 235, 200, 0.5);
}

.map-stage__rule-mark--major {
	height: 24rpx;
	background: rgba(255, 235, 200, 0.85);
}

.map-stage__rule-label {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2rpx;
}

.map-stage__rule-num {
	font-size: 28rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

.map-stage__rule-text {
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: rgba(255, 235, 200, 0.7);
}

/* ===== 折扇按钮 ===== */
.map-stage__fan-btn {
	position: absolute;
	right: 24rpx;
	top: calc(env(safe-area-inset-top) + 110rpx);
	z-index: 12;
	width: 90rpx;
	height: 90rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 220, 220, 0.6) 0%, transparent 35%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #8b1a2e 100%);
	border: 3rpx solid rgba(255, 220, 220, 0.5);
	border-radius: 50%;
	box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.55), 0 0 24rpx rgba(196, 30, 58, 0.25);
	transition: transform 0.18s ease;
}

.map-stage__fan-btn:active { transform: rotateY(180deg) scale(0.94); }

.map-stage__scope-btn {
	position: absolute;
	right: 24rpx;
	top: calc(env(safe-area-inset-top) + 210rpx);
	z-index: 12;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 90rpx;
	height: 50rpx;
	padding: 0 14rpx;
	background:
		linear-gradient(135deg, #4a2a18 0%, #6b3510 50%, #4a2a18 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 999rpx;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	transition: transform 0.18s ease;
}

.map-stage__scope-btn:active { transform: scale(0.94); }

.map-stage__scope-btn-text {
	font-size: 20rpx;
	font-weight: 700;
	color: $py-paper-warm;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

.map-stage__fan-btn-inner {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: rgba(196, 30, 58, 0.6);
	box-shadow: inset 0 0 0 2rpx rgba(255, 220, 220, 0.3);
}

.map-stage__fan-btn-char {
	font-size: 30rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

/* ===== 主卷轴 ===== */
.map-stage__scroll {
	position: relative;
	margin-top: 24rpx;
	z-index: 2;
	animation: scrollUnfurlV 0.65s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

.map-stage__scroll-roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 32rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	z-index: 3;
}

.map-stage__scroll-roll--top { top: -16rpx; }
.map-stage__scroll-roll--bot { bottom: -16rpx; }

.map-stage__paper {
	position: relative;
	padding: 38rpx 36rpx 36rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.97) 0%, rgba(232, 215, 180, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.55);
}

.map-stage__paper-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.06) 0, rgba(139, 69, 19, 0.06) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx;
}

.map-stage__paper > * { position: relative; z-index: 1; }

.map-stage__title {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	margin-bottom: 24rpx;
}

.map-stage__title-text {
	font-size: 30rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 8rpx;
	color: #4a2a18;
}

.map-stage__subtitle {
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: rgba(110, 85, 65, 0.78);
}

/* ===== 地图主区 ===== */
.map-stage__map {
	position: relative;
	width: 100%;
	aspect-ratio: 4 / 3;
	border: 3rpx dashed rgba(110, 85, 65, 0.35);
	background:
		radial-gradient(ellipse at 50% 50%, rgba(218, 196, 158, 0.45) 0%, transparent 70%),
		repeating-linear-gradient(0deg, rgba(110, 85, 65, 0.04) 0, rgba(110, 85, 65, 0.04) 1rpx, transparent 1rpx, transparent 24rpx),
		repeating-linear-gradient(90deg, rgba(110, 85, 65, 0.04) 0, rgba(110, 85, 65, 0.04) 1rpx, transparent 1rpx, transparent 24rpx);
	border-radius: 6rpx;
	overflow: hidden;
}

.map-stage__wall {
	position: absolute;
	inset: 4%;
	border: 3rpx solid rgba(74, 42, 24, 0.55);
	border-radius: 8rpx;
	pointer-events: none;
}

.map-stage__wall::before {
	content: '';
	position: absolute;
	inset: -2%;
	border: 1rpx dashed rgba(74, 42, 24, 0.32);
	border-radius: 12rpx;
}

.map-stage__district {
	position: absolute;
	background: rgba(196, 168, 124, 0.32);
	border: 1rpx dashed rgba(110, 85, 65, 0.32);
}

.map-stage__district--nw { left: 8%;  top: 10%; width: 36%; height: 32%; }
.map-stage__district--ne { right: 8%; top: 10%; width: 36%; height: 32%; }
.map-stage__district--sw { left: 8%;  bottom: 10%; width: 36%; height: 32%; }
.map-stage__district--se { right: 8%; bottom: 10%; width: 36%; height: 32%; }

.map-stage__avenue {
	position: absolute;
	background: rgba(74, 42, 24, 0.18);
	border-top: 1rpx dashed rgba(74, 42, 24, 0.35);
	border-bottom: 1rpx dashed rgba(74, 42, 24, 0.35);
}

.map-stage__avenue--h { left: 6%; right: 6%; top: 47%; height: 6%; border-radius: 4rpx; }
.map-stage__avenue--v { left: 47%; top: 8%; bottom: 8%; width: 6%; border-radius: 4rpx; }

.map-stage__route {
	position: absolute;
	background: repeating-linear-gradient(90deg, $py-red 0, $py-red 10rpx, transparent 10rpx, transparent 18rpx);
	height: 2rpx;
	opacity: 0.55;
}

.map-stage__route--1 { left: 22%; top: 30%; width: 30%; transform: rotate(-15deg); }
.map-stage__route--2 { left: 50%; top: 60%; width: 28%; transform: rotate(20deg); }
.map-stage__route--3 { left: 26%; top: 70%; width: 32%; transform: rotate(8deg); }

.map-stage__mountain {
	position: absolute;
	color: rgba(74, 42, 24, 0.45);
	font-size: 60rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	pointer-events: none;
}

.map-stage__mountain--l { left: 8%;  top: 78%; transform: rotate(-12deg); }
.map-stage__mountain--r { right: 6%; top: 18%; transform: rotate(8deg); }

/* POI 印章 */
.map-stage__poi {
	position: absolute;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	z-index: 5;
	transition: transform 0.18s ease;
}

.map-stage__poi:active {
	transform: translate(-50%, -50%) scale(0.92);
}

.map-stage__poi-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 64rpx;
	height: 64rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 4rpx solid $py-red;
	border-radius: 8rpx;
	transform: rotate(-6deg);
	color: $py-red;
	font-size: 26rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.32);
	position: relative;
}

.map-stage__poi-stamp::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 4rpx;
}

.map-stage__poi-flag {
	padding: 4rpx 10rpx;
	background: rgba(255, 248, 239, 0.9);
	border: 1rpx solid rgba(74, 42, 24, 0.45);
	font-size: 17rpx;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	white-space: nowrap;
	border-radius: 2rpx;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.28);
}

/* 主线印章 */
.map-stage__poi--quest .map-stage__poi-stamp {
	background: rgba(255, 215, 0, 0.18);
	border-color: #f5c842;
	color: #b08020;
	animation: questStampPulse 1.6s ease-in-out infinite;
}

@keyframes questStampPulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.6), 0 4rpx 8rpx rgba(0, 0, 0, 0.32); }
	50%      { box-shadow: 0 0 0 10rpx rgba(255, 215, 0, 0), 0 4rpx 8rpx rgba(0, 0, 0, 0.32); }
}

/* 锁定 */
.map-stage__poi--locked .map-stage__poi-stamp {
	color: rgba(110, 85, 65, 0.85);
	background: rgba(110, 85, 65, 0.18);
	border-color: rgba(110, 85, 65, 0.55);
	transform: rotate(-3deg);
	filter: blur(0.4rpx);
}

.map-stage__poi-fog {
	position: absolute;
	inset: -16rpx;
	background: radial-gradient(circle, rgba(13, 9, 7, 0.32) 0%, transparent 70%);
	border-radius: 50%;
	pointer-events: none;
}

/* 选中态 */
.map-stage__poi--active .map-stage__poi-stamp {
	transform: rotate(-3deg) scale(1.15);
	background: rgba(196, 30, 58, 0.15);
	box-shadow: 0 0 16rpx rgba(196, 30, 58, 0.55);
}

/* 玩家标记 */
.map-stage__player {
	pointer-events: none;
	position: absolute;
	transform: translate(-50%, -50%);
	z-index: 8;
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: left 0.5s ease, top 0.5s ease;
}

.map-stage__player-flag {
	position: relative;
	margin-bottom: 4rpx;
}

.map-stage__player-flag-text {
	display: inline-block;
	padding: 4rpx 10rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%);
	border: 1rpx solid #6b1622;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
	animation: floatY 2.4s ease-in-out infinite;
}

.map-stage__player-pole {
	position: absolute;
	left: 0;
	top: 100%;
	width: 2rpx;
	height: 14rpx;
	background: #4a2a18;
}

.map-stage__player-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60rpx;
	height: 60rpx;
	background: $py-red;
	border: 4rpx solid rgba(255, 220, 220, 0.5);
	border-radius: 50%;
	color: $py-paper-warm;
	font-size: 26rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.5);
}

.map-stage__player-pulse {
	position: absolute;
	bottom: 12rpx;
	left: 50%;
	width: 60rpx;
	height: 60rpx;
	border-radius: 50%;
	border: 3rpx solid rgba(196, 30, 58, 0.6);
	transform: translate(-50%, 0);
	animation: playerPulse 1.8s ease-in-out infinite;
	pointer-events: none;
}

@keyframes playerPulse {
	0%   { transform: translate(-50%, 0) scale(1); opacity: 0.7; }
	100% { transform: translate(-50%, 0) scale(2); opacity: 0; }
}

/* 图例 */
.map-stage__legend {
	display: flex;
	justify-content: center;
	gap: 32rpx;
	margin-top: 22rpx;
	padding-top: 18rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.32);
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.85);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.map-stage__legend-item {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.map-stage__legend-dot {
	width: 14rpx;
	height: 14rpx;
	background: $py-red;
	border-radius: 2rpx;
	transform: rotate(-6deg);
}

.map-stage__legend-dot--quest { background: #f5c842; }
.map-stage__legend-dot--locked { background: rgba(110, 85, 65, 0.7); }

/* ===== 详情卷轴 ===== */
.map-stage__detail-mask {
	position: fixed;
	inset: 0;
	z-index: 30;
	background: rgba(0, 0, 0, 0.55);
	backdrop-filter: blur(8rpx);
}

.map-stage__detail {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(env(safe-area-inset-bottom) + 110rpx);
	z-index: 31;
	animation: scrollUnfurlV 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

.map-stage__detail-roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 26rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.map-stage__detail-roll--top { top: -13rpx; }

.map-stage__detail-paper {
	position: relative;
	padding: 28rpx 32rpx 24rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.55);
}

.map-stage__detail-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx;
}

.map-stage__detail-paper > * { position: relative; z-index: 1; }

.map-stage__detail-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.map-stage__detail-eyebrow {
	display: block;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.map-stage__detail-name {
	display: block;
	margin-top: 6rpx;
	font-size: 32rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.map-stage__detail-stamp {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 80rpx;
	height: 50rpx;
	padding: 0 16rpx;
	color: $py-red;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 3rpx solid $py-red;
	border-radius: 6rpx;
	transform: rotate(-4deg);
}

.map-stage__detail-desc {
	display: block;
	margin-top: 14rpx;
	font-size: 22rpx;
	line-height: 1.85;
	color: $py-ink-soft;
}

.map-stage__detail-story {
	margin-top: 14rpx;
	padding: 14rpx 18rpx;
	background: rgba(212, 165, 116, 0.18);
	border-left: 4rpx solid $py-bronze;
	border-radius: 0 6rpx 6rpx 0;
}

.map-stage__detail-story-label {
	display: block;
	font-size: 16rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.map-stage__detail-story-text {
	display: block;
	margin-top: 6rpx;
	font-size: 20rpx;
	line-height: 1.75;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.map-stage__detail-actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 18rpx;
}

.map-stage__detail-cta {
	padding: 14rpx 32rpx;
	background: linear-gradient(135deg, #6b3510 0%, $py-bronze 50%, #4a2a18 100%);
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	border-radius: 999rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.45),
		0 4rpx 12rpx rgba(0, 0, 0, 0.45);
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

/* ===== 侧边折扇展开 ===== */
.map-stage__side-mask {
	position: fixed;
	inset: 0;
	z-index: 40;
	background: rgba(0, 0, 0, 0.55);
	backdrop-filter: blur(8rpx);
}

.map-stage__side {
	position: fixed;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 41;
	width: 540rpx;
	max-width: 80vw;
	padding: calc(env(safe-area-inset-top) + 24rpx) 28rpx calc(env(safe-area-inset-bottom) + 24rpx);
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-left: 4rpx solid rgba(196, 30, 58, 0.45);
	box-shadow: -16rpx 0 40rpx rgba(0, 0, 0, 0.55);
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	animation: slideInRight 0.45s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

@keyframes slideInRight {
	0%   { transform: translateX(110%); }
	100% { transform: translateX(0); }
}

.map-stage__side-tabs {
	display: flex;
	gap: 14rpx;
}

.map-stage__side-tab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 60rpx;
	border: 2rpx solid rgba(110, 85, 65, 0.35);
	border-radius: 6rpx;
	font-size: 22rpx;
	color: rgba(110, 85, 65, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	background: rgba(255, 248, 239, 0.5);
}

.map-stage__side-tab--active {
	background: linear-gradient(135deg, $py-red 0%, #8b1a2e 100%);
	color: $py-paper-warm;
	border-color: rgba(255, 220, 220, 0.45);
	box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.32);
}

.map-stage__side-content {
	flex: 1;
	min-height: 0;
}

.map-stage__history-item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 14rpx 16rpx;
	margin-bottom: 12rpx;
	background: rgba(255, 248, 239, 0.55);
	border: 1rpx solid rgba(110, 85, 65, 0.22);
	border-radius: 6rpx;
}

.map-stage__history-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56rpx;
	height: 56rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 3rpx solid $py-red;
	border-radius: 6rpx;
	transform: rotate(-6deg);
	color: $py-red;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	flex-shrink: 0;
}

.map-stage__history-info {
	flex: 1;
	min-width: 0;
}

.map-stage__history-name {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

.map-stage__history-desc {
	display: block;
	margin-top: 4rpx;
	font-size: 18rpx;
	line-height: 1.65;
	color: rgba(110, 85, 65, 0.82);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.map-stage__route-card {
	padding: 22rpx 24rpx;
	background: rgba(255, 248, 239, 0.7);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 6rpx;
}

.map-stage__route-card-label {
	display: block;
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.map-stage__route-card-title {
	display: block;
	margin-top: 8rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.map-stage__route-card-desc {
	display: block;
	margin-top: 8rpx;
	text-align: center;
	font-size: 20rpx;
	color: rgba(110, 85, 65, 0.82);
}

.map-stage__route-steps {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	margin-top: 14rpx;
}

.map-stage__route-step {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 12rpx;
	background: rgba(255, 248, 239, 0.85);
	border-radius: 6rpx;
}

.map-stage__route-step-num {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36rpx;
	height: 36rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 20rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	flex-shrink: 0;
}

.map-stage__route-step-text {
	flex: 1;
	font-size: 19rpx;
	line-height: 1.65;
	color: #4a2a18;
}

@keyframes scrollUnfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}
.map-stage__detail-close { display: none; }

@import '@/common/styles/tab-landscape.scss';
@media (orientation: landscape) and (max-height: 600px), (min-width: 1000px) and (min-height: 560px) {
	.map-stage {
		@include tab-landscape-viewport;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 250px;
		grid-template-rows: 44px 44px minmax(0, 1fr);
		gap: 8px 16px;
	}
	.map-stage [class] { letter-spacing: 0; }
	.map-stage__scroll { grid-column: 1; grid-row: 1 / -1; margin: 0; min-width: 0; min-height: 0; animation: none; }
	.map-stage__paper { height: 100%; padding: 6px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
	.map-stage__title { padding: 0; margin: 0; flex-shrink: 0; }
	.map-stage__title-text { font-size: 13px; }
	.map-stage__subtitle { font-size: 10px; margin-top: 2px; }
	.map-stage__map {
		width: min(100%, calc((100vh - var(--tab-reserve) - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1.333333));
		width: min(100%, calc((100dvh - var(--tab-reserve) - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1.333333));
		height: auto; aspect-ratio: 4 / 3; margin: 0; flex: 0 0 auto;
	}
	.map-stage__scroll-roll { height: 8px; left: -3px; right: -3px; }
	.map-stage__scroll-roll--top { top: -4px; }
	.map-stage__scroll-roll--bot { bottom: -4px; }
	.map-stage__legend { padding: 3px 0 0; margin: 0; gap: 12px; font-size: 10px; }
	.map-stage__legend-item { gap: 4px; font-size: 10px; }
	.map-stage__legend-dot { width: 6px; height: 6px; }
	.map-stage__rule { grid-column: 2; grid-row: 1; padding: 4px 12px; gap: 12px; }
	.map-stage__rule-num { font-size: 15px; }
	.map-stage__rule-text { font-size: 10px; }
	.map-stage__rule-track { height: 18px; }
	.map-stage__rule-mark { height: 8px; width: 1px; }
	.map-stage__rule-mark--major { height: 15px; }
	.map-stage__fan-btn, .map-stage__scope-btn { position: relative; top: auto; right: auto; grid-column: 2; grid-row: 2; height: 44px; width: 110px; box-sizing: border-box; padding: 0; }
	.map-stage__fan-btn { justify-self: start; border-radius: 6px; }
	.map-stage__scope-btn { justify-self: end; border-radius: 6px; }
	.map-stage__fan-btn-inner { width: 30px; height: 30px; }
	.map-stage__fan-btn-char, .map-stage__scope-btn-text { font-size: 15px; }
	.map-stage__poi { min-width: 44px; min-height: 44px; justify-content: center; align-items: center; }
	.map-stage__poi-stamp { width: 24px; height: 24px; border-width: 1px; }
	.map-stage__poi-stamp-text { font-size: 12px; }
	.map-stage__poi-flag { padding: 1px 3px; margin: 0; }
	.map-stage__poi:not(.map-stage__poi--active) .map-stage__poi-flag { display: none; }
	.map-stage__poi-flag-text { font-size: 9px; }
	.map-stage__poi-fog { width: 28px; height: 28px; }
	.map-stage__player { pointer-events: none; }
	.map-stage__player-stamp { width: 20px; height: 20px; }
	.map-stage__player-stamp-text { font-size: 12px; }
	.map-stage__player-flag-text { font-size: 9px; }
	.map-stage__player-pulse { width: 30px; height: 30px; }
	.map-stage__mountain { font-size: 28px; }
	.map-stage__detail-mask { display: none; }
	.map-stage__detail { position: relative; left: auto; right: auto; bottom: auto; grid-column: 2; grid-row: 3; min-height: 0; overflow-y: auto; overflow-x: hidden; animation: none; z-index: 5; }
	.map-stage__detail-roll { left: 0; right: 0; }
	.map-stage__detail-paper { padding: 10px 12px; min-height: 100%; box-sizing: border-box; }
	.map-stage__detail-close { display: flex; align-items: center; justify-content: center; position: absolute; right: 0; top: 0; width: 44px; height: 44px; z-index: 4; }
	.map-stage__detail-head { padding-right: 28px; margin: 0 0 6px; }
	.map-stage__detail-eyebrow { font-size: 10px; }
	.map-stage__detail-name { font-size: 18px; margin-top: 3px; }
	.map-stage__detail-stamp { display: none; }
	.map-stage__detail-desc { font-size: 12px; line-height: 1.5; margin: 0; }
	.map-stage__detail-story { padding: 8px; margin-top: 8px; }
	.map-stage__detail-story-label { font-size: 10px; }
	.map-stage__detail-story-text { font-size: 12px; line-height: 1.5; }
	.map-stage__detail-actions { position: sticky; bottom: 0; margin-top: 8px; background: $py-paper; }
	.map-stage__detail-cta { min-height: 44px; padding: 4px 10px; box-sizing: border-box; font-size: 14px; }
	.map-stage__side { top: max(8px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); bottom: calc(var(--tab-reserve) + max(8px, env(safe-area-inset-bottom))); width: min(340px, 60%); padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; }
	.map-stage__side-tabs { flex-shrink: 0; gap: 8px; }
	.map-stage__side-tab { min-height: 44px; padding: 6px; box-sizing: border-box; font-size: 14px; }
	.map-stage__side-content { min-height: 0; height: 0; flex: 1; margin-top: 8px; }
	.map-stage__history-item { padding: 8px 0; gap: 8px; }
	.map-stage__history-stamp { width: 32px; height: 32px; font-size: 15px; }
	.map-stage__history-name, .map-stage__route-card-title { font-size: 15px; }
	.map-stage__history-desc, .map-stage__route-card-desc, .map-stage__route-step-text { font-size: 12px; }
	.map-stage__route-card { padding: 12px; }
	.map-stage__route-card-label { font-size: 11px; }
	.map-stage__route-step { gap: 8px; margin-top: 8px; }
	.map-stage__route-step-num { width: 24px; height: 24px; font-size: 12px; }
}
@media (min-width: 1000px) and (min-height: 560px) {
	.map-stage { padding: 32px max(40px, calc((100vw - 1300px) / 2)); grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr); gap: 20px 36px; }
	.map-stage__paper { padding: 22px; }
	.map-stage__title-text { font-size: 23px; }
	.map-stage__subtitle { font-size: 13px; }
	.map-stage__detail-paper { padding: 28px; }
	.map-stage__detail-name { font-size: 26px; }
	.map-stage__detail-desc, .map-stage__detail-story-text { font-size: 15px; line-height: 1.9; }
	.map-stage__detail-cta { min-height: 52px; font-size: 17px; cursor: pointer; }
	.map-stage__poi { cursor: pointer; }
	.map-stage__poi-stamp { width: 34px; height: 34px; }
	.map-stage__poi-stamp-text { font-size: 16px; }
	.map-stage__poi-flag-text { font-size: 12px; }
	.map-stage__side { width: 400px; padding: 24px; }
}
</style>
