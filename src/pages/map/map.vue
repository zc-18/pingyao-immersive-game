<template>
	<div class="map-stage">
		<!-- 暗色帷幕背景 -->
		<div class="map-stage__veil"></div>

		<!-- 飘落银杏 -->
		<FallingLeaves type="leaf" :density="10" />

		<!-- 顶部铜尺刻度 -->
		<div class="map-stage__rule">
			<div class="map-stage__rule-track">
				<div
					v-for="i in 11"
					:key="i"
					class="map-stage__rule-mark"
					:class="{ 'map-stage__rule-mark--major': (i - 1) % 5 === 0 }"
				></div>
			</div>
			<div class="map-stage__rule-label">
				<span class="map-stage__rule-num">{{ unlockedPoiCount }} / {{ mapPoiList.length }}</span>
				<span class="map-stage__rule-text">— 已 探 处 —</span>
			</div>
		</div>

		<!-- 折扇按钮（右上角，切换打卡履历 / 路线推荐）-->
		<div class="map-stage__fan-btn" role="button" tabindex="0" aria-label="游历履历与推荐路线" @click="toggleSidePanel" @keydown.enter.prevent="toggleSidePanel" @keydown.space.prevent="toggleSidePanel">
			<div class="map-stage__fan-btn-inner">
				<span class="map-stage__fan-btn-char">{{ sidePanelOpen ? '收' : '扇' }}</span>
			</div>
			<span class="map-stage__fan-label">{{ sidePanelOpen ? '收起履历' : '游历履历' }}</span>
		</div>

		<!-- 视野切换：当前街景 / 全城 -->
		<div class="map-stage__scope-btn" @click="toggleScope">
			<span class="map-stage__scope-btn-text">{{ showAllPois ? '全 城' : '本 街' }}</span>
		</div>

		<!-- 定位状态与手动刷新 -->
		<div class="map-stage__location-bar" :class="`map-stage__location-bar--${locationState}`">
			<div class="map-stage__location-copy">
				<span class="map-stage__location-state">{{ locationStatusText }}</span>
				<span v-if="locationAddress" class="map-stage__location-address">{{ locationAddress }}</span>
			</div>
			<button
				class="map-stage__location-action"
				:disabled="locationState === 'locating'"
				@click="refreshLocation"
			>
				<PyIcon name="compass" tone="light" :size="38" />
				<span>{{ locationState === 'locating' ? '定位中' : '定位' }}</span>
			</button>
		</div>

		<!-- 主卷轴（手绘平遥城）-->
		<div class="map-stage__scroll">
			<div class="map-stage__scroll-roll map-stage__scroll-roll--top"></div>
			<div class="map-stage__scroll-roll map-stage__scroll-roll--bot"></div>

			<div class="map-stage__paper">
				<div class="map-stage__paper-fiber"></div>

				<!-- 标题 -->
				<div class="map-stage__title">
					<span class="map-stage__title-text">— 平 遥 古 城 ·  览 胜 图 —</span>
					<span class="map-stage__subtitle">{{ showAllPois ? '全 城 总 览' : snapshot.currentStreet.title }} · {{ snapshot.trackedQuest?.title || '自由探索' }}</span>
				</div>

				<!-- 地图主区（伪手绘水墨）-->
				<div class="map-stage__map">
					<!-- 城墙轮廓 -->
					<div class="map-stage__wall"></div>

					<!-- 街区分块（手绘）-->
					<div class="map-stage__district map-stage__district--nw"></div>
					<div class="map-stage__district map-stage__district--ne"></div>
					<div class="map-stage__district map-stage__district--sw"></div>
					<div class="map-stage__district map-stage__district--se"></div>

					<!-- 主十字大街 -->
					<div class="map-stage__avenue map-stage__avenue--h"></div>
					<div class="map-stage__avenue map-stage__avenue--v"></div>

					<!-- 墨迹路径（断续虚线）-->
					<div class="map-stage__route map-stage__route--1"></div>
					<div class="map-stage__route map-stage__route--2"></div>
					<div class="map-stage__route map-stage__route--3"></div>

					<!-- 飘动的远山 -->
					<div class="map-stage__mountain map-stage__mountain--l">山</div>
					<div class="map-stage__mountain map-stage__mountain--r">岭</div>

					<!-- POI 印章 -->
					<div
						v-for="poi in mapPoiList"
						:key="poi.id"
						:data-poi-id="poi.id"
						role="button"
						tabindex="0"
						:aria-label="`${poi.isUnlocked ? poi.name : '未启之地'} · ${getPoiStatusText(poi.status)}`"
						class="map-stage__poi"
						:class="{
							'map-stage__poi--active': selectedPoiId === poi.id,
							'map-stage__poi--quest': poi.status === 'quest',
							'map-stage__poi--locked': !poi.isUnlocked
						}"
						:style="{ left: poi.mapPosition.x + '%', top: poi.mapPosition.y + '%' }"
						@click="selectedPoiId = poi.id"
						@keydown.enter.prevent="selectedPoiId = poi.id"
						@keydown.space.prevent="selectedPoiId = poi.id"
					>
						<div class="map-stage__poi-stamp">
							<span class="map-stage__poi-stamp-text">{{ poi.isUnlocked ? poi.shortName : '？' }}</span>
						</div>
						<div class="map-stage__poi-flag" v-if="poi.isUnlocked">
							<span class="map-stage__poi-flag-text">{{ poi.name }}</span>
						</div>
						<div v-if="!poi.isUnlocked" class="map-stage__poi-fog"></div>
					</div>

					<!-- 玩家位置（红印章 + 在此小红旗）-->
					<div class="map-stage__player" :style="{ left: playerMapPos.x + '%', top: playerMapPos.y + '%' }">
						<div class="map-stage__player-flag">
							<span class="map-stage__player-flag-text">{{ playerLocationLabel }}</span>
							<div class="map-stage__player-pole"></div>
						</div>
						<div class="map-stage__player-stamp">
							<span class="map-stage__player-stamp-text">我</span>
						</div>
						<div class="map-stage__player-pulse"></div>
					</div>
				</div>

				<!-- 底部图例 -->
				<div class="map-stage__legend">
					<div class="map-stage__legend-item">
						<div class="map-stage__legend-dot map-stage__legend-dot--quest"></div>
						<span>主线热点</span>
					</div>
					<div class="map-stage__legend-item">
						<div class="map-stage__legend-dot"></div>
						<span>已点亮</span>
					</div>
					<div class="map-stage__legend-item">
						<div class="map-stage__legend-dot map-stage__legend-dot--locked"></div>
						<span>未启</span>
					</div>
				</div>
			</div>
		</div>

		<section v-if="!selectedPoi" class="map-stage__overview">
			<span class="map-stage__overview-eyebrow">此刻的旅程</span>
			<h2>{{ snapshot.currentStreet.title }}</h2>
			<p>{{ snapshot.heroNpcLine }}</p>
			<div class="map-stage__overview-quest"><span>正在进行</span><strong>{{ snapshot.trackedQuest?.title || '自由探索' }}</strong></div>
			<button @click="goExplore">继续当前旅程 <span aria-hidden="true">↗</span></button>
			<small>点选地图印章，查看故事与前往路线。</small>
		</section>

		<!-- 底部弹出：POI 详情卷轴 -->
		<div v-if="selectedPoi" class="map-stage__detail-mask" @click="selectedPoiId = ''"></div>
		<div v-if="selectedPoi" class="map-stage__detail" @click.stop>
			<div class="map-stage__detail-close" role="button" aria-label="关闭点位详情" @click="selectedPoiId = ''"><PyIcon name="close" size="20px" variant="plain" /></div>
			<div class="map-stage__detail-roll map-stage__detail-roll--top"></div>
			<div class="map-stage__detail-paper">
				<div class="map-stage__detail-fiber"></div>
				<div class="map-stage__detail-head">
					<div>
						<span class="map-stage__detail-eyebrow">— 古城点位 —</span>
						<span class="map-stage__detail-name">{{ selectedPoiDisplay.name }}</span>
					</div>
					<div class="map-stage__detail-stamp">
						<span>{{ selectedPoiDisplay.statusText }}</span>
					</div>
				</div>

				<span class="map-stage__detail-desc">{{ selectedPoiDisplay.description }}</span>

				<div class="map-stage__detail-story">
					<span class="map-stage__detail-story-label">— 晋小鸦提示 —</span>
					<span class="map-stage__detail-story-text">{{ selectedPoiDisplay.npcTopic }}</span>
				</div>

				<div class="map-stage__detail-actions">
					<div class="map-stage__detail-cta" @click="goExplore">
						<span>{{ selectedPoiDisplay.actionText }} ›</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 侧边折扇展开（打卡履历 / 路线推荐）-->
		<div v-if="sidePanelOpen" class="map-stage__side-mask" @click="sidePanelOpen = false"></div>
		<div v-if="sidePanelOpen" class="map-stage__side" @click.stop>
			<div class="map-stage__side-tabs">
				<div
					v-for="tab in sideTabs"
					:key="tab.key"
					class="map-stage__side-tab"
					:class="{ 'map-stage__side-tab--active': activeSideTab === tab.key }"
					@click="activeSideTab = tab.key"
				>
					{{ tab.label }}
				</div>
			</div>

			<div data-scroll="y" class="map-stage__side-content">
				<template v-if="activeSideTab === 'history'">
					<div v-for="poi in unlockedPoiList" :key="poi.id" class="map-stage__history-item">
						<div class="map-stage__history-stamp">
							<span>{{ poi.shortName }}</span>
						</div>
						<div class="map-stage__history-info">
							<span class="map-stage__history-name">{{ poi.name }}</span>
							<span class="map-stage__history-desc">{{ poi.description }}</span>
						</div>
					</div>
					<EmptyOwl
						v-if="unlockedPoiList.length === 0"
						text="还没有点亮任何位置——先去街景里走两步吧。"
					/>
				</template>

				<template v-else>
					<div class="map-stage__route-card">
						<span class="map-stage__route-card-label">— 推 荐 路 线 —</span>
						<span class="map-stage__route-card-title">{{ snapshot.trackedQuest?.title || '自由游历线' }}</span>
						<span class="map-stage__route-card-desc">从眼下停留处启程，沿主线热点逐一点亮。</span>
						<div class="map-stage__route-steps">
							<div v-for="(step, idx) in routeSteps" :key="idx" class="map-stage__route-step">
								<div class="map-stage__route-step-num">{{ idx + 1 }}</div>
								<span class="map-stage__route-step-text">{{ step }}</span>
							</div>
						</div>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import EmptyOwl from '@/components/EmptyOwl.vue'
import PyIcon from '@/components/PyIcon.vue'
import { getGameSnapshot, setCurrentStreetScene, markPageVisit, rememberReturnContext } from '@/common/utils/game-state.js'
import { getCityMapPois } from '@/common/utils/city-map.js'
import { getPoiStatusText, isUnlockedPoiStatus, getPoiShortLabel } from '@/common/utils/poi.js'
import { poiMap } from '@/common/data/poi-list.js'
import streetScenes from '@/common/data/streets.js'
import {
	getCurrentLocation,
	getLocationSnapshot,
	isLocationWithinMapBounds,
	resolvePlayerMapPosition,
	saveLocationSnapshot
} from '@/common/utils/location.js'
import { getTencentLbsConfig, reverseGeocode } from '@/common/utils/tencent-lbs.js'
import { onPageShow } from '@/platform/lifecycle.js'
import { navigateTo } from '@/platform/navigation.js'
import { showToast } from '@/platform/toast.js'

defineOptions({ name: 'MapPage' })

const snapshot = ref(getGameSnapshot())
const selectedPoiId = ref('')
const sidePanelOpen = ref(false)
const activeSideTab = ref('history')
const showAllPois = ref(true)
const cachedLocation = getLocationSnapshot()
const locationSnapshot = ref(cachedLocation)
const locationState = ref(cachedLocation ? 'cached' : 'idle')
const locationAddress = ref(getTencentLbsConfig().enabled ? '' : '腾讯服务未配置')
let locationRequestId = 0
let isUnmounted = false
let lastTargetPoiId

const sideTabs = [
	{ key: 'history', label: '打卡履历' },
	{ key: 'route', label: '路线推荐' }
]

const cityPoiList = computed(() => getCityMapPois(snapshot.value))
const sceneScopedPois = computed(() => cityPoiList.value.filter((poi) => snapshot.value.currentStreet.poiIds.includes(poi.id)))

const mapPoiList = computed(() =>
	(showAllPois.value ? cityPoiList.value : sceneScopedPois.value).map((item) => ({
		...item,
		shortName: getPoiShortLabel(item),
		isUnlocked: isUnlockedPoiStatus(item.status)
	}))
)

const selectedPoi = computed(() => mapPoiList.value.find((item) => item.id === selectedPoiId.value) || null)
const unlockedPoiCount = computed(() => mapPoiList.value.filter((item) => item.isVisited || item.isDiscovered).length)
const unlockedPoiList = computed(() => mapPoiList.value.filter((item) => item.isVisited))

const fallbackPlayerMapPos = computed(() => {
	const current = snapshot.value.currentPois.find((poi) => poi.id === snapshot.value.runtime.currentPoiId)
	if (current) return poiMap[current.id].mapPosition
	const hero = poiMap[snapshot.value.currentStreet?.heroPoiId]
	return hero?.mapPosition || { x: 50, y: 50 }
})

/* GPS 只在古城粗略范围内用于估算位置；城外或失败时仍落在当前街景代表点位。 */
const playerMapPos = computed(() => {
	if (!showAllPois.value) return fallbackPlayerMapPos.value
	return resolvePlayerMapPosition(locationSnapshot.value, fallbackPlayerMapPos.value)
})

const playerLocationLabel = computed(() => {
	if (!showAllPois.value || !isLocationWithinMapBounds(locationSnapshot.value)) return '街景位置'
	return locationState.value === 'cached' ? '上次定位' : '估算位置'
})

const locationStatusText = computed(() => {
	if (locationState.value === 'locating') return '正在定位…'
	if (locationState.value === 'outside') return '已定位 · 古城范围外'
	if (locationState.value === 'error') return '定位不可用'
	if (locationState.value === 'cached') {
		return isLocationWithinMapBounds(locationSnapshot.value) ? '上次定位 · 估算位置' : '上次定位 · 古城范围外'
	}
	if (locationState.value === 'success') {
		return locationSnapshot.value?.accuracy > 100
			? `低精度 · 约 ${Math.round(locationSnapshot.value.accuracy)} 米`
			: '已定位 · 估算位置'
	}
	return '定位未开启'
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

onPageShow(() => {
	markPageVisit('map', { returnPage: '/street', returnTab: '/map' })
	rememberReturnContext('/street', '/map')
	snapshot.value = getGameSnapshot()
	const targetId = snapshot.value.targetPoiId
	if (targetId !== lastTargetPoiId) {
		// 小屏只高亮地图印章，不在进入页面时自动打开遮罩。
		selectedPoiId.value = window.matchMedia('(min-width: 1000px) and (min-height: 560px)').matches ? targetId : ''
		lastTargetPoiId = targetId
	}
})

onUnmounted(() => {
	isUnmounted = true
	locationRequestId += 1
})

function locationErrorText(error) {
	const message = error instanceof Error ? error.message : String(error?.errMsg || '')
	if (/permission|auth deny|denied|拒绝|权限/i.test(message)) return '定位权限未开启'
	if (/超时|timeout/i.test(message)) return '定位超时，请到开阔处重试'
	return '定位暂不可用'
}

async function refreshLocation() {
	if (locationState.value === 'locating') return
	const requestId = ++locationRequestId
	locationState.value = 'locating'
	locationAddress.value = ''

	try {
		const currentLocation = await getCurrentLocation()
		if (isUnmounted || requestId !== locationRequestId) return
		locationSnapshot.value = currentLocation
		saveLocationSnapshot(currentLocation)
		locationState.value = isLocationWithinMapBounds(currentLocation) ? 'success' : 'outside'

		const tencentConfig = getTencentLbsConfig()
		if (!tencentConfig.enabled) {
			locationAddress.value = '腾讯服务未配置'
			return
		}

		const geocodeResult = await reverseGeocode(currentLocation)
		if (isUnmounted || requestId !== locationRequestId) return
		locationAddress.value = geocodeResult.status === 'success'
			? geocodeResult.data.address
			: '地址暂不可用'
	} catch (error) {
		if (isUnmounted || requestId !== locationRequestId) return
		// 保留磁盘中的旧快照，但本次失败后页面回到静态街景标记。
		locationSnapshot.value = null
		locationState.value = 'error'
		locationAddress.value = locationErrorText(error)
	}
}

function goExplore() {
	const poiId = selectedPoi.value?.isUnlocked ? selectedPoi.value.id : snapshot.value.targetPoiId
	const current = snapshot.value.currentStreet
	const destination = current.poiIds.includes(poiId) ? current
		: streetScenes.find((scene) => scene.heroPoiId === poiId) || streetScenes.find((scene) => scene.poiIds.includes(poiId))
	if (destination && !setCurrentStreetScene(destination.id)) {
		showToast({ title: '目的地未能保存，请重试', icon: 'none' })
		return
	}
	navigateTo({ url: '/street' })
}

function toggleSidePanel() {
	sidePanelOpen.value = !sidePanelOpen.value
}

function toggleScope() {
	showAllPois.value = !showAllPois.value
}
</script>

<style lang="scss" scoped>
.map-stage__overview, .map-stage__fan-label { display: none; }
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

.map-stage__location-bar {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: center;
	gap: 12rpx;
	width: calc(100% - 136rpx);
	box-sizing: border-box;
	min-height: 58rpx;
	margin-top: 12rpx;
	padding: 8rpx 10rpx 8rpx 18rpx;
	background: rgba(61, 32, 16, 0.9);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 6rpx;
	box-shadow: 0 5rpx 14rpx rgba(0, 0, 0, 0.5);
}

.map-stage__location-bar--error,
.map-stage__location-bar--outside {
	border-color: rgba(196, 30, 58, 0.65);
}

.map-stage__location-copy {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 2rpx;
}

.map-stage__location-state,
.map-stage__location-address {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.map-stage__location-state {
	font-size: 19rpx;
	font-weight: 700;
	color: $py-paper-warm;
}

.map-stage__location-address {
	font-size: 16rpx;
	color: rgba(255, 235, 200, 0.72);
}

.map-stage__location-action {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	width: 126rpx;
	height: 42rpx;
	min-height: 42rpx;
	margin: 0;
	padding: 0 8rpx;
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
	background: transparent;
	border: 0;
	border-radius: 0;
}

.map-stage__location-action::after {
	border: 0;
}

.map-stage__location-action[disabled] {
	opacity: 0.5;
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
	white-space: nowrap;
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
		grid-template-rows: 44px 44px auto minmax(0, 1fr);
		gap: 8px 16px;
	}
	.map-stage [class] { letter-spacing: 0; }
	.map-stage__scroll { grid-column: 1; grid-row: 1 / -1; margin: 0; min-width: 0; min-height: 0; animation: none; }
	.map-stage__paper { height: 100%; padding: 6px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
	.map-stage__title { padding: 0; margin: 0; flex-shrink: 0; }
	.map-stage__title-text { font-size: 13px; }
	.map-stage__subtitle { font-size: 10px; margin-top: 2px; }
	.map-stage__map {
		width: min(100%, calc((100vh - var(--app-header-height, 0px) - var(--tab-reserve) - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1.333333));
		width: min(100%, calc((100dvh - var(--app-header-height, 0px) - var(--tab-reserve) - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1.333333));
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
	.map-stage__location-bar { grid-column: 2; grid-row: 3; width: 100%; min-height: 44px; margin: 0; padding: 4px 4px 4px 10px; gap: 6px; border-width: 1px; border-radius: 6px; }
	.map-stage__location-state { font-size: 12px; }
	.map-stage__location-address { font-size: 10px; }
	.map-stage__location-action { width: 72px; height: 36px; min-height: 36px; gap: 4px; font-size: 12px; }
	.map-stage__location-action .py-icon { width: 22px !important; height: 22px !important; }
	.map-stage__location-action :deep(.py-icon__glyph) { font-size: 11px !important; }
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
	.map-stage__detail { position: relative; left: auto; right: auto; bottom: auto; grid-column: 2; grid-row: 4; min-height: 0; overflow-y: auto; overflow-x: hidden; animation: none; z-index: 5; }
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
	.map-stage__map { width: 100%; flex: 1 1 auto; min-height: 0; aspect-ratio: auto; margin: 16px 0; }
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
	.map-stage__side { top: calc(var(--app-header-height, 0px) + 16px); }
	.map-stage__fan-btn-inner { display: none; }
	.map-stage__fan-label { display: block; font-size: 14px; color: $py-paper; }
	.map-stage__overview { display: flex; flex-direction: column; align-self: start; grid-column: 2; grid-row: 4; min-height: 0; max-height: 100%; overflow-y: auto; box-sizing: border-box; padding: 28px; border: 1px solid rgba($py-gold, .3); background: rgba($py-paper, .96); color: $py-ink-soft; }
	.map-stage__overview-eyebrow { color: $py-bronze; font-size: 12px; letter-spacing: 2px !important; }
	.map-stage__overview h2 { font: 28px/1.4 'KaiTi', 'STKaiti', serif; margin: 10px 0 18px; }
	.map-stage__overview p { font-size: 15px; line-height: 1.9; color: #6e5541; }
	.map-stage__overview-quest { display: flex; flex-direction: column; gap: 6px; padding: 18px 0; margin: 18px 0; border-block: 1px solid rgba($py-bronze, .15); }
	.map-stage__overview-quest span { font-size: 12px; color: #806c59; }
	.map-stage__overview-quest strong { font-size: 16px; font-weight: 500; }
	.map-stage__overview button { display: flex; justify-content: space-between; width: 100%; padding: 12px 16px; font-size: 14px; color: $py-paper; background: $py-bronze; }
	.map-stage__overview small { margin-top: 16px; color: #806c59; font-size: 12px; }
}
</style>
