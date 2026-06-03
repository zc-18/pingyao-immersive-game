<template>
	<view class="street-stage">
		<!-- 3D 街景画布（不动）-->
		<canvas id="street-canvas" type="2d" class="street-stage__canvas"></canvas>

		<!-- 上方暗角光层（暮色 / 夜灯笼） -->
		<view class="street-stage__vignette"></view>

		<!-- 飘落物（按时辰可切换：banyan / cherry / snow / firefly）-->
		<FallingLeaves :type="seasonType" :density="seasonDensity" />

		<!-- 右上角：时辰印章 + 迷你地图 -->
		<view class="street-stage__rightcorner">
			<view class="street-stage__phase" :class="phaseStamp.tone">
				<text class="street-stage__phase-label">{{ phaseStamp.label }}</text>
				<text class="street-stage__phase-caption">{{ phaseStamp.caption }}</text>
			</view>
			<MiniMap
				class="street-stage__minimap"
				:player-position="playerWorldPos"
				:player-rotation="playerHeading"
				:buildings="miniMapBuildings"
				:pois="miniMapPois"
				:map-size="60"
				:label="currentStreet.title"
			/>
		</view>

		<!-- 街景 HUD（覆盖在 3D 画面上）-->
		<StreetHud
			:level="levelMeta.level"
			:level-name="levelMeta.title"
			:role-name="userProfile.roleName || '平遥行客'"
			:role-avatar-char="roleAvatarChar"
			:location="currentStreet.title"
			:quest="trackedQuest?.title || ''"
			:steps="displaySteps"
			:silver-key="silverKey"
			:score="userScore"
			:exp-percent="expPercent"
			:quest-tracker="questTrackerData"
			:role-bonus="currentRoleBonus"
			:scene-hint="sceneHint"
			:plaque-flipping="plaqueFlipping"
			@action="handleHudAction"
		/>

		<!-- 晋小鸦悬浮（保持现有）-->
		<NpcOwl :visible="npcVisible" :message="npcMessage" :auto-hide="npcAutoHide" @close="handleNpcClose" />

		<!-- 互动 / 奖励 / 飘字 / 升级 -->
		<RewardPopup :visible="showRewardPopup" :title="rewardData.title" :rewards="rewardData.rewards" :role-bonus="rewardData.roleBonus" :npc-message="rewardData.npcMessage" @claim="handleClaimReward" />
		<FloatingText :visible="floatingText.visible" :text="floatingText.text" :type="floatingText.type" @complete="handleFloatingComplete" />
		<LevelUpEffect :visible="showLevelUp" :old-level="levelUpData.oldLevel" :new-level="levelUpData.newLevel" :old-level-name="levelUpData.oldLevelName" :new-level-name="levelUpData.newLevelName" />
		<InteractionButton v-if="interactionCard" :label="interactionCard.label" @action="handleSceneInteraction" />

		<!-- 加载（毛笔画圈 + 灯笼 + 晋小鸦正在张望…）-->
		<BrushLoader :visible="isLoading" :progress="loadProgress" />

		<!-- POI 详情（卷轴样式）-->
		<view v-if="activePoi" class="street-stage__poi-overlay" @tap="closePoi">
			<view class="street-stage__poi-paper" @tap.stop>
				<view class="street-stage__poi-roll street-stage__poi-roll--top"></view>
				<view class="street-stage__poi-roll street-stage__poi-roll--bot"></view>
				<view class="street-stage__poi-paper-fiber"></view>

				<view class="street-stage__poi-head">
					<view>
						<text class="street-stage__poi-eyebrow">— 古城点位 —</text>
						<text class="street-stage__poi-name">{{ activePoi.name }}</text>
					</view>
					<view class="street-stage__poi-stamp">
						<text>{{ statusLabelMap[activePoi.status] || '可探索' }}</text>
					</view>
				</view>

				<text class="street-stage__poi-desc">{{ activePoi.description }}</text>

				<view class="street-stage__poi-story">
					<text class="street-stage__poi-story-label">— 晋小鸦提示 —</text>
					<text class="street-stage__poi-story-text">{{ activePoi.npcTopic }}</text>
				</view>

				<view class="street-stage__poi-footer">
					<text class="street-stage__poi-distance">距 {{ activePoi.distance }}m</text>
					<view class="street-stage__poi-action" @tap="playPoiTopic">
						<text>继续讲解 ›</text>
					</view>
				</view>

				<view class="street-stage__poi-close" @tap="closePoi">
					<text>收起</text>
				</view>
			</view>
		</view>

		<!-- 入城过场（城门徐徐打开）-->
		<GateTransition
			v-if="showEntranceAnim"
			:visible="showEntranceAnim"
			plaque-text="平 遥 古 城"
			:title="entranceCopy.title"
			:desc="entranceCopy.desc"
		/>

		<!-- 街景切换器（牌匾翻转）-->
		<view class="street-stage__switch">
			<view class="street-stage__switch-arrow" @tap="switchStreet(-1)">
				<text>‹</text>
			</view>
			<view class="street-stage__switch-arrow" @tap="switchStreet(1)">
				<text>›</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StreetHud from '@/components/StreetHud.vue'
import NpcOwl from '@/components/NpcOwl.vue'
import InteractionButton from '@/components/InteractionButton.vue'
import BrushLoader from '@/components/BrushLoader.vue'
import RewardPopup from '@/components/RewardPopup.vue'
import FloatingText from '@/components/FloatingText.vue'
import LevelUpEffect from '@/components/LevelUpEffect.vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import GateTransition from '@/components/GateTransition.vue'
import streetScenes from '@/common/data/streets.js'
import { roleList } from '@/common/data/roles.js'
import { getStorage, patchStorageObject, STORAGE_KEYS } from '@/common/utils/storage.js'
import { getLevelMeta } from '@/common/utils/level.js'
import {
	getCurrentStreetScene,
	getExploreDirectionLabel,
	getScenePoiList,
	getGameSnapshot,
	markNpcTalk,
	markPageVisit,
	markPoiVisited,
	markPrologueComplete,
	patchRuntimeState,
	rememberReturnContext,
	setCurrentPoi,
	setCurrentStreetScene
} from '@/common/utils/game-state.js'
import {
	EVENT_TYPES,
	advanceQuestByEvent,
	completeQuestAndCollectFeedback,
	ensureJourneyQuest,
	getQuestNpcHint,
	getQuestTargetPoi
} from '@/common/utils/quest-manager.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { getCurrentPhase } from '@/common/utils/phase.js'
import MiniMap from '@/components/MiniMap.vue'

const statusLabelMap = { nearby: '已靠近', discoverable: '待点亮', quest: '主线热点', hot: '必看地标', route: '顺路可达' }

const userProfile = ref(getStorage(STORAGE_KEYS.userProfile, {}))
const userProgress = ref(getStorage(STORAGE_KEYS.userProgress, {}))
const currentStreetIndex = ref(0)
const activePoiId = ref('')
const npcVisible = ref(false)
const npcMessage = ref('')
const npcAutoHide = ref(false)
const isLoading = ref(true)
const loadProgress = ref(0)
const showEntranceAnim = ref(false)
const scenePulseText = ref('')
const showRewardPopup = ref(false)
const rewardData = ref({ title: '', rewards: {}, roleBonus: '', npcMessage: '' })
const floatingText = ref({ visible: false, text: '', type: 'exp' })
const showLevelUp = ref(false)
const levelUpData = ref({ oldLevel: 1, newLevel: 2, oldLevelName: '', newLevelName: '' })
const trackedQuest = ref(null)
const questTargetPoiId = ref('')
const pendingSceneAfterClaim = ref('')
const plaqueFlipping = ref(false)
const currentPhase = ref(getCurrentPhase())
const playerWorldPos = ref({ x: 0, z: 10 })
const playerHeading = ref(0)
let phaseWatchTimer = null

const roleMap = roleList.reduce((map, role) => {
	map[role.id] = role
	return map
}, {})

const streetMap = streetScenes.reduce((map, item, index) => {
	map[item.id] = { ...item, index }
	return map
}, {})

const currentStreet = computed(() => streetScenes[currentStreetIndex.value] || streetScenes[0])
const streetPois = computed(() => getScenePoiList(currentStreet.value.id, { trackedQuest: trackedQuest.value }).sort((a, b) => a.distance - b.distance))
const activePoi = computed(() => streetPois.value.find((item) => item.id === activePoiId.value) || null)
const levelMeta = computed(() => getLevelMeta(userProgress.value.exp || 0))
const silverKey = computed(() => Number(userProgress.value.silverKey || 0))
const userScore = computed(() => Number(userProgress.value.score || 0))
const displaySteps = computed(() => Number(userProgress.value.steps || 0))
const expPercent = computed(() => {
	const cur = Number(userProgress.value.exp || 0)
	const next = Number(levelMeta.value.expToNextLevel || 100)
	const base = Math.max(1, next + cur)
	return Math.min(100, Math.floor((cur / base) * 100))
})
const roleAvatarChar = computed(() => roleMap[userProfile.value.roleId]?.avatar || '客')
const snapshot = computed(() => getGameSnapshot())
const sceneHint = computed(() => getExploreDirectionLabel({
	currentStreet: currentStreet.value,
	trackedQuest: trackedQuest.value,
	journeyCopy: snapshot.value.journeyCopy
}))
const entranceCopy = computed(() => {
	const role = roleMap[userProfile.value.roleId]
	return {
		title: currentStreet.value.title,
		desc: currentStreet.value.subtitle,
		npc: role ? `晋小鸦已替你备好 ${role.name} 的第一段入城线索。` : '晋小鸦已在街口等你。'
	}
})
const questTrackerData = computed(() => {
	if (!trackedQuest.value) return null
	const currentObjective = trackedQuest.value.progress?.objectives?.find((item) => item.current < item.required)
	if (!currentObjective) return null
	const total = trackedQuest.value.progress.objectives.reduce((sum, item) => sum + item.required, 0)
	const current = trackedQuest.value.progress.objectives.reduce((sum, item) => sum + item.current, 0)
	return {
		title: trackedQuest.value.title,
		currentObjective: currentObjective.storyLine || currentObjective.desc,
		progress: total ? Math.floor((current / total) * 100) : 0
	}
})
const currentRoleBonus = computed(() => trackedQuest.value?.roleBonus?.[userProfile.value.roleId]?.desc || '')
const interactionCard = computed(() => activePoi.value ? { label: activePoi.value.status === 'quest' ? `查看${activePoi.value.name}` : `走近${activePoi.value.name}` } : null)

/* 迷你地图：从 renderjs 同款换算反推世界坐标 */
const miniMapBuildings = computed(() => {
	return (currentStreet.value.buildings || []).map((b) => {
		const leftPercent = parseFloat(b.left) / 100
		const depth = b.depth || 1
		return {
			id: b.id,
			x: (leftPercent - 0.5) * 48,
			z: -6 - depth * 3,
			width: 4.3,
			depth: 3.1
		}
	})
})

const miniMapPois = computed(() => {
	return streetPois.value.map((p) => {
		const mapPos = p.mapPosition || { x: 50, y: 50 }
		return {
			id: p.id,
			x: (mapPos.x / 100 - 0.5) * 48,
			z: (mapPos.y / 100 - 0.5) * 28,
			isQuest: p.id === questTargetPoiId.value || p.status === 'quest',
			isHot: p.status === 'hot'
		}
	})
})

/* 时辰 -> 飘落物类型 / 密度（统一走 phase.js）*/
const seasonType = computed(() => currentPhase.value.fallingType || 'leaf')
const seasonDensity = computed(() => currentPhase.value.fallingDensity || 12)

/* 顶栏时辰印章数据 */
const phaseStamp = computed(() => ({
	label: currentPhase.value.label,
	caption: currentPhase.value.caption,
	tone: currentPhase.value.toneClass || ''
}))

/* 把 phase 配置序列化成 renderjs 可消费的纯 JSON */
function serializePhase(phase) {
	return {
		key: phase.key,
		sky: phase.sky,
		fog: phase.fog,
		lighting: phase.lighting,
		bloomStrength: phase.bloomStrength,
		exposure: phase.exposure,
		lanternsLit: phase.lanternsLit,
		fallingType: phase.fallingType
	}
}

let onRenderReady
let onRenderProgress
let onRenderError
let onPoiEnterListener
let onPoiLeaveListener
let onPlayerMoveListener

watch(currentStreet, (street) => {
	activePoiId.value = ''
	setCurrentStreetScene(street.id, { sceneMode: 'story' })
	plaqueFlipping.value = true
	setTimeout(() => { plaqueFlipping.value = false }, 600)
})

function sendToRenderjs(type, data) {
	if (typeof window === 'undefined') return
	window.dispatchEvent(new CustomEvent('logic-message', { detail: { type, data } }))
}

function refreshRuntimeState() {
	userProfile.value = getStorage(STORAGE_KEYS.userProfile, {})
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	trackedQuest.value = ensureJourneyQuest()
	questTargetPoiId.value = trackedQuest.value ? getQuestTargetPoi(trackedQuest.value.id) || '' : ''
	patchRuntimeState({
		lastQuestId: trackedQuest.value?.id || '',
		lastQuestStageLine: snapshot.value.journeyCopy?.approachLine || ''
	})
	sendToRenderjs('highlightPoi', { poiId: questTargetPoiId.value })
}

function initScene() {
	isLoading.value = true
	loadProgress.value = 0
	sendToRenderjs('init', {
		streetData: currentStreet.value,
		pois: streetPois.value,
		questTargetPoiId: questTargetPoiId.value,
		phase: serializePhase(currentPhase.value)
	})
}

function loadCurrentScene() {
	isLoading.value = true
	loadProgress.value = 0
	sendToRenderjs('loadScene', {
		streetData: currentStreet.value,
		pois: streetPois.value,
		questTargetPoiId: questTargetPoiId.value,
		phase: serializePhase(currentPhase.value)
	})
	const result = advanceQuestByEvent(EVENT_TYPES.sceneLoaded, { sceneId: currentStreet.value.id })
	if (result.updated) {
		scenePulseText.value = result.stageLine
		announceMicroReward(result.microReward)
	}
}

function applyPhaseToScene() {
	sendToRenderjs('applyPhase', { phase: serializePhase(currentPhase.value) })
}

function watchPhase() {
	if (phaseWatchTimer) return
	phaseWatchTimer = setInterval(() => {
		const next = getCurrentPhase()
		if (next.key !== currentPhase.value.key) {
			currentPhase.value = next
			applyPhaseToScene()
		}
	}, 60_000)
}

function stopWatchPhase() {
	if (phaseWatchTimer) {
		clearInterval(phaseWatchTimer)
		phaseWatchTimer = null
	}
}

function handlePoiEnter(poiId) {
	const poi = streetPois.value.find((item) => item.id === poiId)
	if (!poi) return
	activePoiId.value = poiId
	markPoiVisited(poiId)
	setCurrentPoi(poiId, poi.npcTopic)
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})

	const result = advanceQuestByEvent(EVENT_TYPES.poiEntered, { poiId, sceneId: currentStreet.value.id })
	scenePulseText.value = result.stageLine || poi.npcTopic
	npcMessage.value = result.stageLine || getQuestNpcHint(trackedQuest.value?.id) || poi.npcTopic
	npcVisible.value = true
	npcAutoHide.value = true

	if (result.microReward) {
		announceMicroReward(result.microReward)
	}

	// 进入新 POI 是常见成就触发点（五处掌纹 / 三街连珠等）
	const sync = syncAchievementUnlocks()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		uni.showToast({ title: `点亮成就：${labels}`, icon: 'none', duration: 2200 })
	}

	if (result.completed && trackedQuest.value) {
		handleQuestComplete(trackedQuest.value.id)
		return
	}

	refreshRuntimeState()
}

function handlePoiLeave() {
	if (npcAutoHide.value) {
		npcVisible.value = false
	}
}

function playPoiTopic() {
	if (!activePoi.value) return
	markNpcTalk(activePoi.value.npcTopic)
	const result = advanceQuestByEvent(EVENT_TYPES.npcDialogCompleted, {
		poiId: activePoi.value.id,
		topic: activePoi.value.npcTopic
	})
	scenePulseText.value = result.stageLine || activePoi.value.npcTopic
	npcMessage.value = result.stageLine || activePoi.value.npcTopic
	npcVisible.value = true
	npcAutoHide.value = false
	if (result.microReward) announceMicroReward(result.microReward)
	refreshRuntimeState()

	if (result.completed && trackedQuest.value) {
		handleQuestComplete(trackedQuest.value.id)
	}
}

function handleSceneInteraction() {
	if (!activePoi.value) return
	const result = advanceQuestByEvent(EVENT_TYPES.buildingInteracted, {
		poiId: activePoi.value.id,
		buildingId: activePoi.value.id,
		buildingType: activePoi.value.type
	})
	scenePulseText.value = result.stageLine || `你已在 ${activePoi.value.name} 留下新的旅程印记。`
	if (result.microReward) {
		announceMicroReward(result.microReward)
	} else {
		showFloatingText(result.objectiveCompleted ? '线索已记入行旅册' : '街景回响已收录', 'exp')
	}
	npcMessage.value = scenePulseText.value
	npcVisible.value = true
	npcAutoHide.value = true
	refreshRuntimeState()

	if (result.completed && trackedQuest.value) {
		handleQuestComplete(trackedQuest.value.id)
	}
}

function handleQuestComplete(questId) {
	const oldLevel = getLevelMeta(userProgress.value.exp || 0)
	const result = completeQuestAndCollectFeedback(questId)
	if (!result) return

	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	const newLevel = getLevelMeta(userProgress.value.exp || 0)

	rewardData.value = {
		title: `${result.quest.title} 已点亮`,
		rewards: result.rewards,
		roleBonus: result.roleBonus,
		npcMessage: result.nextLine || result.quest.completionLine || '新的路已经在城里为你点亮。'
	}
	showRewardPopup.value = true
	pendingSceneAfterClaim.value = result.nextQuest?.sceneId && result.nextQuest.sceneId !== currentStreet.value.id ? result.nextQuest.sceneId : ''

	if (newLevel.level > oldLevel.level) {
		levelUpData.value = {
			oldLevel: oldLevel.level,
			newLevel: newLevel.level,
			oldLevelName: oldLevel.title,
			newLevelName: newLevel.title
		}
		showLevelUp.value = true
		setTimeout(() => {
			showLevelUp.value = false
		}, 3200)
	}

	refreshRuntimeState()
}

function handleClaimReward() {
	showRewardPopup.value = false
	const rewards = rewardData.value.rewards || {}
	if (rewards.silverKey) {
		showFloatingText(`银钥 +${rewards.silverKey}`, 'silverKey')
	} else if (rewards.exp) {
		showFloatingText(`EXP +${rewards.exp}`, 'exp')
	}

	// 同步成就（任务领奖后是常见的成就解锁时机）
	const sync = syncAchievementUnlocks()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		uni.showToast({ title: `点亮成就：${labels}`, icon: 'none', duration: 2200 })
	}

	if (pendingSceneAfterClaim.value) {
		switchStreetById(pendingSceneAfterClaim.value)
		pendingSceneAfterClaim.value = ''
	}
}

function handleFloatingComplete() {
	floatingText.value.visible = false
}

function showFloatingText(text, type = 'exp') {
	floatingText.value = { visible: true, text, type }
}

/* 命中 objective 节奏奖励：飘字 + 同步用户进度引用 */
function announceMicroReward(microReward) {
	if (!microReward) return
	const lines = []
	if (microReward.silverKey) lines.push(`银钥 +${microReward.silverKey}`)
	if (microReward.exp) lines.push(`EXP +${microReward.exp}`)
	const type = microReward.silverKey ? 'silverKey' : 'exp'
	if (lines.length) {
		showFloatingText(lines.join(' · '), type)
	}
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
}

function handleNpcClose() {
	npcVisible.value = false
}

function closePoi() {
	activePoiId.value = ''
}

function handleHudAction(action) {
	if (action === 'inventory') {
		uni.showToast({ title: '行囊：稍后开放', icon: 'none' })
	} else if (action === 'quest') {
		uni.switchTab({ url: '/pages/user/user' })
	} else if (action === 'settings') {
		uni.navigateTo({ url: '/pages_game/dialog/dialog' })
	}
}

function switchStreet(direction) {
	const nextIndex = (currentStreetIndex.value + direction + streetScenes.length) % streetScenes.length
	currentStreetIndex.value = nextIndex
	refreshRuntimeState()
	loadCurrentScene()
}

function switchStreetById(sceneId) {
	if (!streetMap[sceneId]) return
	currentStreetIndex.value = streetMap[sceneId].index
	refreshRuntimeState()
	loadCurrentScene()
}

// 步数批量写入：避免每步都触发 storage 同步
let pendingStepDelta = 0
let lastStepFlush = 0
const STEP_FLUSH_INTERVAL = 800  // ms
const STEP_FLUSH_MIN_DELTA = 5   // 至少累积 5 步再写

function flushSteps(force = false) {
	if (pendingStepDelta <= 0) return
	const now = Date.now()
	if (!force && pendingStepDelta < STEP_FLUSH_MIN_DELTA && now - lastStepFlush < STEP_FLUSH_INTERVAL) return
	const nextSteps = Number(userProgress.value.steps || 0) + pendingStepDelta
	pendingStepDelta = 0
	lastStepFlush = now
	patchStorageObject(STORAGE_KEYS.userProgress, { steps: nextSteps })
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
}

function handlePlayerMove(detail) {
	pendingStepDelta += 1
	flushSteps(false)
	if (detail && typeof detail.x === 'number' && typeof detail.z === 'number') {
		const prev = playerWorldPos.value
		const dx = detail.x - prev.x
		const dz = detail.z - prev.z
		if (Math.abs(dx) + Math.abs(dz) > 0.01) {
			playerHeading.value = Math.atan2(dx, -dz) * 180 / Math.PI
		}
		playerWorldPos.value = { x: detail.x, z: detail.z }
	}
}

function playEntranceAnimation() {
	showEntranceAnim.value = true
	setTimeout(() => {
		showEntranceAnim.value = false
		markPrologueComplete(currentStreet.value.id)
		npcMessage.value = trackedQuest.value?.introLine || '城门已开，顺着第一段引线往前走吧。'
		npcVisible.value = true
		npcAutoHide.value = false
		initScene()
	}, 3000)
}

onLoad(() => {
	markPageVisit('street', { returnPage: '/pages_game/street/street' })
	rememberReturnContext('/pages_game/street/street', '')
	uni.hideTabBar()

	const initialStreet = getCurrentStreetScene()
	if (initialStreet?.id && streetMap[initialStreet.id]) {
		currentStreetIndex.value = streetMap[initialStreet.id].index
	}

	refreshRuntimeState()
	const runtime = getStorage(STORAGE_KEYS.appRuntime, {})

	if (!runtime.hasCompletedPrologue) {
		playEntranceAnimation()
	} else {
		npcMessage.value = trackedQuest.value?.introLine || currentStreet.value.playerHint
		npcVisible.value = true
		npcAutoHide.value = true
		initScene()
	}
})

onMounted(() => {
	onRenderReady = () => {
		isLoading.value = false
	}
	onRenderProgress = (event) => {
		loadProgress.value = event.detail || 0
	}
	onRenderError = (event) => {
		isLoading.value = false
		uni.showToast({ title: event.detail?.error || '街景加载失败', icon: 'none' })
	}
	onPoiEnterListener = (event) => {
		handlePoiEnter(event.detail)
	}
	onPoiLeaveListener = () => {
		handlePoiLeave()
	}
	onPlayerMoveListener = (event) => {
		handlePlayerMove(event.detail)
	}

	window.addEventListener('render-ready', onRenderReady)
	window.addEventListener('render-progress', onRenderProgress)
	window.addEventListener('render-error', onRenderError)
	window.addEventListener('poi-enter', onPoiEnterListener)
	window.addEventListener('poi-leave', onPoiLeaveListener)
	window.addEventListener('player-move', onPlayerMoveListener)

	watchPhase()
})

onUnmounted(() => {
	uni.showTabBar()
	flushSteps(true)
	stopWatchPhase()
	window.removeEventListener('render-ready', onRenderReady)
	window.removeEventListener('render-progress', onRenderProgress)
	window.removeEventListener('render-error', onRenderError)
	window.removeEventListener('poi-enter', onPoiEnterListener)
	window.removeEventListener('poi-leave', onPoiLeaveListener)
	window.removeEventListener('player-move', onPlayerMoveListener)
})
</script>

<script module="render" lang="renderjs">
let THREE = null
let scene = null
let camera = null
let renderer = null
let composer = null
let bloomPassRef = null
let ambientLightRef = null
let directionalLightRef = null
let hemiLightRef = null
let player = null
let buildings = []
let poiBeacons = []
let decorations = []
let particles = null
let animationId = null
let isInitialized = false
let lastTime = Date.now()
let joystickInput = { dx: 0, dy: 0 }
let currentPhaseData = null

function emit(name, detail) {
	window.dispatchEvent(new CustomEvent(name, { detail }))
}

function colorHex(value, fallback) {
	const raw = typeof value === 'string' && value.startsWith('#') ? value.slice(1) : null
	if (raw && /^[0-9a-fA-F]{6}$/.test(raw)) return parseInt('0x' + raw)
	return fallback
}

export default {
	mounted() {
		this.loadThreeJS()
		this.listenLogicMessages()
	},
	beforeUnmount() {
		this.dispose()
	},
	methods: {
		loadThreeJS() {
			const script = document.createElement('script')
			script.src = '/static/libs/three.min.js'
			script.onload = () => {
				THREE = window.THREE
				this.loadPostProcessing()
			}
			script.onerror = () => emit('render-error', { error: 'Three.js 加载失败' })
			document.head.appendChild(script)
		},
		loadPostProcessing() {
			const scripts = [
				'/static/libs/EffectComposer.js',
				'/static/libs/RenderPass.js',
				'/static/libs/UnrealBloomPass.js'
			]
			scripts.forEach((src) => {
				const script = document.createElement('script')
				script.src = src
				script.onerror = () => emit('render-error', { error: `${src} 加载失败` })
				document.head.appendChild(script)
			})
		},
		listenLogicMessages() {
			window.addEventListener('logic-message', (event) => {
				const { type, data } = event.detail
				if (type === 'init' && !isInitialized) {
					this.initScene(data)
					isInitialized = true
				} else if (type === 'loadScene') {
					this.loadScene(data)
				} else if (type === 'highlightPoi') {
					this.highlightQuestPoi(data.poiId)
				} else if (type === 'applyPhase') {
					this.applyPhase(data.phase)
				}
			})
		},
		initScene(data) {
			if (!THREE) {
				emit('render-error', { error: 'Three.js 未准备完成' })
				return
			}

			const canvas = document.getElementById('street-canvas')
			if (!canvas) {
				emit('render-error', { error: '未找到街景画布' })
				return
			}

			const width = window.innerWidth
			const height = window.innerHeight
			scene = new THREE.Scene()

			const phase = data.phase || null
			const fallbackSky = colorHex(data.streetData.sceneTone?.skyTop, 0xD7C0A2)
			const skyColor = phase ? colorHex(phase.sky?.top, fallbackSky) : fallbackSky
			const fogColor = phase ? colorHex(phase.fog?.color, skyColor) : skyColor
			const fogDensity = phase?.fog?.density || data.streetData.ambience?.fogDensity || 0.02

			scene.background = new THREE.Color(skyColor)
			scene.fog = new THREE.FogExp2(fogColor, fogDensity)

			camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
			camera.position.set(0, 5, 10)

			renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
			renderer.setSize(width, height)
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
			renderer.shadowMap.enabled = true
			renderer.shadowMap.type = THREE.PCFSoftShadowMap
			renderer.toneMapping = THREE.ACESFilmicToneMapping
			renderer.toneMappingExposure = phase?.exposure || 1.15

			composer = new THREE.EffectComposer(renderer)
			composer.addPass(new THREE.RenderPass(scene, camera))
			bloomPassRef = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), phase?.bloomStrength || 0.85, 0.5, 0.6)
			composer.addPass(bloomPassRef)

			currentPhaseData = phase
			this.loadScene(data)
			this.createJoystick()
			this.startAnimation()
			emit('render-ready')
		},
		loadScene(data) {
			if (!scene) return
			this.clearScene()

			const phase = data.phase || currentPhaseData

			const groundGeometry = new THREE.PlaneGeometry(60, 60, 24, 24)
			const groundMaterial = new THREE.MeshStandardMaterial({
				color: colorHex(data.streetData.ambience?.groundColor, 0x9e9e8e),
				roughness: 0.92,
				metalness: 0.08
			})
			const ground = new THREE.Mesh(groundGeometry, groundMaterial)
			ground.rotation.x = -Math.PI / 2
			ground.receiveShadow = true
			scene.add(ground)

			const ambColor = phase?.lighting?.ambient?.color
			const ambIntensity = phase?.lighting?.ambient?.intensity
			ambientLightRef = new THREE.AmbientLight(colorHex(ambColor, 0xF5F0E8), ambIntensity || 0.55)
			scene.add(ambientLightRef)

			const keyColor = phase?.lighting?.directional?.color || data.streetData.ambience?.keyLight
			const keyIntensity = phase?.lighting?.directional?.intensity
			directionalLightRef = new THREE.DirectionalLight(colorHex(keyColor, 0xffd77f), keyIntensity || 1.25)
			const angle = phase?.lighting?.directional?.angle || { x: 12, y: 16, z: 10 }
			directionalLightRef.position.set(angle.x, angle.y, angle.z)
			directionalLightRef.castShadow = true
			scene.add(directionalLightRef)

			/* 半球光：天 / 地双色补光，让 Low-Poly 国风更柔 */
			const hemiSky = phase?.lighting?.hemi?.sky
			const hemiGround = phase?.lighting?.hemi?.ground
			const hemiIntensity = phase?.lighting?.hemi?.intensity
			hemiLightRef = new THREE.HemisphereLight(
				colorHex(hemiSky, 0xf6ead7),
				colorHex(hemiGround, 0x6e5541),
				hemiIntensity || 0.42
			)
			hemiLightRef.position.set(0, 24, 0)
			scene.add(hemiLightRef)

			this.createBuildings(data.streetData)
			this.createPoiBeacons(data.pois, data.streetData)
			this.createDecorations(data.streetData)
			this.createParticles(phase)
			this.createPlayer()
			this.highlightQuestPoi(data.questTargetPoiId)

			if (phase) this.applyPhase(phase)
			emit('render-progress', 100)
		},
		createBuildings(streetData) {
			(streetData.buildings || []).forEach((building) => {
				const leftPercent = parseFloat(building.left) / 100
				const x = (leftPercent - 0.5) * 48
				const depth = building.depth || 1
				const z = -6 - depth * 3
				const group = new THREE.Group()

				const bodyGeometry = new THREE.BoxGeometry(4.3, 3.2 + depth * 0.2, 3.1)
				const bodyMaterial = new THREE.MeshStandardMaterial({
					color: building.style === 'gate' ? 0xc7b18b : building.style === 'temple' ? 0xd8c8b0 : 0xd0c2aa,
					roughness: 0.85,
					flatShading: true
				})
				const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
				body.position.y = 1.6
				body.castShadow = true
				body.receiveShadow = true
				group.add(body)

				const roofGeometry = new THREE.ConeGeometry(3.1, 1.3, 4)
				const roofMaterial = new THREE.MeshStandardMaterial({
					color: building.style === 'gate' ? 0x5a3a2b : 0x3d3d3d,
					roughness: 0.92,
					flatShading: true
				})
				const roof = new THREE.Mesh(roofGeometry, roofMaterial)
				roof.position.y = 3.9 + depth * 0.1
				roof.rotation.y = Math.PI / 4
				group.add(roof)

				/* 灯笼 - 提升发光 */
				const lantern = new THREE.Mesh(
					new THREE.SphereGeometry(0.26, 10, 10),
					new THREE.MeshStandardMaterial({
						color: 0xC41E3A,
						emissive: 0xC41E3A,
						emissiveIntensity: building.poiId ? 0.95 : 0.45
					})
				)
				lantern.position.set(1.4, 2.4, 1.55)
				group.add(lantern)

				group.position.set(x, 0, z)
				group.userData = { buildingId: building.id, poiId: building.poiId || '', type: building.style || 'building' }
				scene.add(group)
				buildings.push(group)
			})
		},
		createPoiBeacons(pois, streetData) {
			(pois || []).forEach((poi) => {
				const mapPos = poi.mapPosition
				const x = (mapPos.x / 100 - 0.5) * 48
				const z = (mapPos.y / 100 - 0.5) * 28

				const group = new THREE.Group()

				/* 地面光圈（金色光柱底盘）*/
				const ringGeometry = new THREE.TorusGeometry(1.05, 0.14, 12, 24)
				const ringMaterial = new THREE.MeshStandardMaterial({
					color: poi.status === 'quest' ? 0xFFD700 : 0xD4A574,
					emissive: poi.status === 'quest' ? 0xFFD700 : 0xD4A574,
					emissiveIntensity: poi.status === 'quest' ? 1.2 : 0.7,
					flatShading: true
				})
				const ring = new THREE.Mesh(ringGeometry, ringMaterial)
				ring.rotation.x = Math.PI / 2
				ring.position.y = 0.12
				group.add(ring)

				/* 漂浮印章（八面体）*/
				const crystal = new THREE.Mesh(
					new THREE.OctahedronGeometry(0.46, 0),
					new THREE.MeshStandardMaterial({
						color: poi.status === 'quest' ? 0xC41E3A : 0xfff3d2,
						emissive: poi.status === 'quest' ? 0xC41E3A : parseInt((streetData.ambience?.accentColor || '#d4a574').replace('#', '0x')),
						emissiveIntensity: poi.status === 'quest' ? 1.0 : 0.6,
						flatShading: true
					})
				)
				crystal.position.y = 1.1
				group.add(crystal)

				/* 体积光柱（从地面升起）*/
				const beam = new THREE.Mesh(
					new THREE.CylinderGeometry(0.25, 0.85, 4, 12, 1, true),
					new THREE.MeshBasicMaterial({
						color: poi.status === 'quest' ? 0xFFD700 : 0xD4A574,
						transparent: true,
						opacity: 0.18,
						side: THREE.DoubleSide
					})
				)
				beam.position.y = 2.0
				group.add(beam)

				group.position.set(x, 0, z)
				group.userData = { poiId: poi.id, type: 'poi', isHighlighted: poi.status === 'quest', entered: false }
				scene.add(group)
				poiBeacons.push(group)
			})
		},
		createPlayer() {
			const group = new THREE.Group()

			const body = new THREE.Mesh(
				new THREE.CylinderGeometry(0.32, 0.38, 1.2, 8),
				new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.72, flatShading: true })
			)
			body.position.y = 0.6
			group.add(body)

			const head = new THREE.Mesh(
				new THREE.SphereGeometry(0.26, 10, 8),
				new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.6, flatShading: true })
			)
			head.position.y = 1.42
			group.add(head)

			group.position.set(0, 0, 10)
			scene.add(group)
			player = group
		},
		createDecorations(streetData) {
			/* 沿玩家可视区域均匀放置装饰物：石灯 / 古槐 / 旗幡 / 鼓 */
			const decorPlan = [
				{ kind: 'lantern-post', x: -14, z: 4 },
				{ kind: 'lantern-post', x: 14, z: 4 },
				{ kind: 'tree', x: -10, z: -2 },
				{ kind: 'tree', x: 10, z: -2 },
				{ kind: 'banner', x: -6, z: 1 },
				{ kind: 'banner', x: 6, z: 1 },
				{ kind: 'drum', x: 0, z: 7 }
			]

			decorPlan.forEach((d) => {
				const group = new THREE.Group()

				if (d.kind === 'lantern-post') {
					const post = new THREE.Mesh(
						new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6),
						new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9, flatShading: true })
					)
					post.position.y = 1.3
					group.add(post)

					const lantern = new THREE.Mesh(
						new THREE.SphereGeometry(0.36, 12, 10),
						new THREE.MeshStandardMaterial({
							color: 0xC41E3A,
							emissive: 0xC41E3A,
							emissiveIntensity: 0.85,
							flatShading: true
						})
					)
					lantern.position.y = 2.45
					group.add(lantern)
					group.userData.isLantern = true
				} else if (d.kind === 'tree') {
					const trunk = new THREE.Mesh(
						new THREE.CylinderGeometry(0.18, 0.26, 2.4, 7),
						new THREE.MeshStandardMaterial({ color: 0x5a3a2b, roughness: 0.95, flatShading: true })
					)
					trunk.position.y = 1.2
					group.add(trunk)

					const crownColors = [0x6b8e23, 0x4f7a1f, 0x8aa346]
					for (let i = 0; i < 3; i++) {
						const crown = new THREE.Mesh(
							new THREE.IcosahedronGeometry(0.95 + i * 0.12, 0),
							new THREE.MeshStandardMaterial({
								color: crownColors[i % crownColors.length],
								roughness: 0.92,
								flatShading: true
							})
						)
						crown.position.set((i - 1) * 0.4, 2.4 + i * 0.3, (i - 1) * 0.3)
						group.add(crown)
					}
				} else if (d.kind === 'banner') {
					const pole = new THREE.Mesh(
						new THREE.CylinderGeometry(0.05, 0.06, 3.1, 6),
						new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.85, flatShading: true })
					)
					pole.position.y = 1.55
					group.add(pole)

					const cloth = new THREE.Mesh(
						new THREE.PlaneGeometry(0.5, 1.6),
						new THREE.MeshStandardMaterial({
							color: 0xC41E3A,
							side: THREE.DoubleSide,
							emissive: 0x3a0a14,
							emissiveIntensity: 0.18,
							flatShading: true
						})
					)
					cloth.position.set(0.32, 2.1, 0)
					group.add(cloth)
					group.userData.isBanner = true
				} else if (d.kind === 'drum') {
					const stand = new THREE.Mesh(
						new THREE.BoxGeometry(0.9, 0.18, 0.9),
						new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.92, flatShading: true })
					)
					stand.position.y = 0.09
					group.add(stand)

					const drum = new THREE.Mesh(
						new THREE.CylinderGeometry(0.42, 0.42, 0.55, 14),
						new THREE.MeshStandardMaterial({ color: 0xb73a2a, roughness: 0.8, flatShading: true })
					)
					drum.position.y = 0.46
					group.add(drum)
				}

				group.position.set(d.x, 0, d.z)
				scene.add(group)
				decorations.push(group)
			})
		},
		createParticles(phase) {
			const type = phase?.fallingType || 'leaf'
			const count = type === 'firefly' ? 80 : 40
			const positions = new Float32Array(count * 3)
			const colorStr = type === 'firefly' ? 0xfff3a0 : type === 'cherry' ? 0xffcad4 : 0xd4a574

			for (let i = 0; i < count; i++) {
				positions[i * 3] = (Math.random() - 0.5) * 40
				positions[i * 3 + 1] = Math.random() * 8 + 0.5
				positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 4
			}

			const geom = new THREE.BufferGeometry()
			geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

			const mat = new THREE.PointsMaterial({
				color: colorStr,
				size: type === 'firefly' ? 0.16 : 0.1,
				transparent: true,
				opacity: type === 'firefly' ? 0.95 : 0.55,
				sizeAttenuation: true
			})

			particles = new THREE.Points(geom, mat)
			particles.userData.kind = type
			scene.add(particles)
		},
		applyPhase(phase) {
			if (!scene || !phase) return
			currentPhaseData = phase

			const skyColor = colorHex(phase.sky?.top, 0xD7C0A2)
			scene.background = new THREE.Color(skyColor)
			if (scene.fog) {
				scene.fog.color = new THREE.Color(colorHex(phase.fog?.color, skyColor))
				scene.fog.density = phase.fog?.density || scene.fog.density
			}

			if (ambientLightRef) {
				ambientLightRef.color = new THREE.Color(colorHex(phase.lighting?.ambient?.color, 0xF5F0E8))
				ambientLightRef.intensity = phase.lighting?.ambient?.intensity || 0.55
			}
			if (directionalLightRef) {
				directionalLightRef.color = new THREE.Color(colorHex(phase.lighting?.directional?.color, 0xffd77f))
				directionalLightRef.intensity = phase.lighting?.directional?.intensity || 1.25
				const angle = phase.lighting?.directional?.angle
				if (angle) directionalLightRef.position.set(angle.x, angle.y, angle.z)
			}
			if (hemiLightRef) {
				hemiLightRef.color = new THREE.Color(colorHex(phase.lighting?.hemi?.sky, 0xf6ead7))
				hemiLightRef.groundColor = new THREE.Color(colorHex(phase.lighting?.hemi?.ground, 0x6e5541))
				hemiLightRef.intensity = phase.lighting?.hemi?.intensity || 0.42
			}
			if (bloomPassRef && typeof phase.bloomStrength === 'number') {
				bloomPassRef.strength = phase.bloomStrength
			}
			if (renderer && typeof phase.exposure === 'number') {
				renderer.toneMappingExposure = phase.exposure
			}

			/* 灯笼 / 旗幡：夜间增强发光 */
			const lit = phase.lanternsLit
			decorations.forEach((group) => {
				if (group.userData?.isLantern) {
					group.traverse((mesh) => {
						if (mesh.isMesh && mesh.material && mesh.material.emissive) {
							mesh.material.emissiveIntensity = lit ? 1.4 : 0.55
						}
					})
				}
				if (group.userData?.isBanner) {
					group.traverse((mesh) => {
						if (mesh.isMesh && mesh.material && mesh.material.emissive) {
							mesh.material.emissiveIntensity = lit ? 0.45 : 0.18
						}
					})
				}
			})
		},
		createJoystick() {
			const canvas = document.getElementById('street-canvas')
			if (!canvas) return

			let isTouching = false
			let touchStartX = 0
			let touchStartY = 0

			canvas.addEventListener('touchstart', (event) => {
				const touch = event.touches[0]
				if (touch.clientX < window.innerWidth * 0.4 && touch.clientY > window.innerHeight * 0.5) {
					isTouching = true
					touchStartX = touch.clientX
					touchStartY = touch.clientY
				}
			})

			canvas.addEventListener('touchmove', (event) => {
				if (!isTouching) return
				const touch = event.touches[0]
				const dx = (touch.clientX - touchStartX) / 70
				const dy = (touch.clientY - touchStartY) / 70
				joystickInput.dx = Math.max(-1, Math.min(1, dx))
				joystickInput.dy = Math.max(-1, Math.min(1, dy))
			})

			canvas.addEventListener('touchend', () => {
				isTouching = false
				joystickInput.dx = 0
				joystickInput.dy = 0
			})
		},
		highlightQuestPoi(targetPoiId) {
			poiBeacons.forEach((beacon) => {
				const isTarget = beacon.userData.poiId === targetPoiId
				beacon.userData.isHighlighted = isTarget
				beacon.traverse((mesh) => {
					if (mesh.isMesh && mesh.material) {
						if (isTarget) {
							if (mesh.material.color) mesh.material.color.setHex(0xFFD700)
							if (mesh.material.emissive) mesh.material.emissive.setHex(0xFFD700)
							mesh.material.emissiveIntensity = 1.2
						} else if (mesh.material.emissive) {
							mesh.material.color.setHex(0xD4A574)
							mesh.material.emissive.setHex(0xD4A574)
							mesh.material.emissiveIntensity = 0.7
						}
					}
				})
			})
		},
		clearScene() {
			[...buildings, ...poiBeacons, ...decorations].forEach((group) => {
				scene.remove(group)
				group.traverse((item) => {
					if (item.geometry) item.geometry.dispose()
					if (item.material) item.material.dispose()
				})
			})
			buildings = []
			poiBeacons = []
			decorations = []

			if (particles) {
				scene.remove(particles)
				if (particles.geometry) particles.geometry.dispose()
				if (particles.material) particles.material.dispose()
				particles = null
			}
		},
		startAnimation() {
			const animate = () => {
				animationId = requestAnimationFrame(animate)
				const now = Date.now()
				const deltaTime = (now - lastTime) / 1000
				lastTime = now

				if (player && (joystickInput.dx !== 0 || joystickInput.dy !== 0)) {
					player.position.x = Math.max(-18, Math.min(18, player.position.x + joystickInput.dx * 4 * deltaTime))
					player.position.z = Math.max(-18, Math.min(16, player.position.z + joystickInput.dy * 4 * deltaTime))
					emit('player-move', { x: player.position.x, z: player.position.z })
				}

				if (camera && player) {
					const target = player.position
					const cameraTarget = new THREE.Vector3(target.x + 0.2, target.y + 6, target.z + 9)
					camera.position.lerp(cameraTarget, 0.08)
					camera.lookAt(target.x, target.y + 1.3, target.z - 5)
				}

				poiBeacons.forEach((beacon) => {
					beacon.position.y = beacon.userData.isHighlighted ? 0.2 + Math.sin(now * 0.003) * 0.18 : 0.06
					beacon.rotation.y += deltaTime * (beacon.userData.isHighlighted ? 1.2 : 0.4)
				})

				/* 装饰物：旗幡轻晃，灯笼微呼吸 */
				decorations.forEach((group, idx) => {
					if (group.userData?.isBanner) {
						group.rotation.y = Math.sin(now * 0.0012 + idx) * 0.18
					}
					if (group.userData?.isLantern) {
						const scale = 1 + Math.sin(now * 0.002 + idx) * 0.04
						group.scale.set(scale, scale, scale)
					}
				})

				/* 粒子飘动：萤火上下浮动 / 落叶下落 */
				if (particles && particles.geometry) {
					const pos = particles.geometry.attributes.position
					const arr = pos.array
					const kind = particles.userData.kind
					for (let i = 0; i < arr.length; i += 3) {
						if (kind === 'firefly') {
							arr[i + 1] += Math.sin(now * 0.001 + i) * deltaTime * 0.3
							arr[i] += Math.cos(now * 0.0008 + i) * deltaTime * 0.15
						} else {
							arr[i + 1] -= deltaTime * 0.4
							arr[i] += Math.sin(now * 0.0006 + i) * deltaTime * 0.2
							if (arr[i + 1] < 0.2) {
								arr[i + 1] = 8 + Math.random() * 2
								arr[i] = (Math.random() - 0.5) * 40
								arr[i + 2] = (Math.random() - 0.5) * 24 - 4
							}
						}
					}
					pos.needsUpdate = true
				}

				if (player) {
					poiBeacons.forEach((beacon) => {
						const distance = player.position.distanceTo(beacon.position)
						if (distance < 3.2 && !beacon.userData.entered) {
							beacon.userData.entered = true
							emit('poi-enter', beacon.userData.poiId)
						} else if (distance >= 3.2 && beacon.userData.entered) {
							beacon.userData.entered = false
							emit('poi-leave', beacon.userData.poiId)
						}
					})
				}

				if (composer) composer.render()
			}
			animate()
		},
		dispose() {
			if (animationId) cancelAnimationFrame(animationId)
			this.clearScene()
			if (renderer) renderer.dispose()
			scene = null
			camera = null
			renderer = null
			composer = null
			bloomPassRef = null
			ambientLightRef = null
			directionalLightRef = null
			hemiLightRef = null
			player = null
			isInitialized = false
			currentPhaseData = null
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.street-stage {
	position: relative;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background: #000;
}

.street-stage__canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

/* 暗角光层 */
.street-stage__vignette {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background:
		radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0, 0, 0, 0.45) 100%),
		linear-gradient(180deg, rgba(255, 200, 130, 0.06) 0%, transparent 30%, rgba(0, 0, 0, 0.4) 100%);
}

/* 街景切换器 */
.street-stage__switch {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	justify-content: space-between;
	z-index: 13;
	pointer-events: none;
}

.street-stage__switch-arrow {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: rgba(13, 9, 7, 0.55);
	color: $py-gold;
	font-size: 38rpx;
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	pointer-events: auto;
	transition: transform 0.18s ease;
}

.street-stage__switch-arrow:active {
	transform: scale(0.92);
	background: rgba(13, 9, 7, 0.85);
}

/* POI 详情卷轴 */
.street-stage__poi-overlay {
	position: fixed;
	inset: 0;
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(12rpx);
	animation: fadeIn 0.3s ease both;
}

.street-stage__poi-paper {
	position: relative;
	width: 86%;
	max-width: 720rpx;
	padding: 36rpx 48rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 240, 232, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.6);
	animation: scrollUnfurlV 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

.street-stage__poi-paper-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.025) 0, rgba(139, 69, 19, 0.025) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx;
}

.street-stage__poi-roll {
	position: absolute;
	left: -10rpx;
	right: -10rpx;
	height: 32rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.street-stage__poi-roll--top { top: -16rpx; }
.street-stage__poi-roll--bot { bottom: -16rpx; }

.street-stage__poi-head {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.street-stage__poi-eyebrow {
	display: block;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.street-stage__poi-name {
	display: block;
	margin-top: 8rpx;
	font-size: 38rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
}

.street-stage__poi-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 96rpx;
	height: 60rpx;
	padding: 0 18rpx;
	background: rgba(196, 30, 58, 0.06);
	color: $py-red;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	border: 4rpx solid $py-red;
	border-radius: 6rpx;
	transform: rotate(-4deg);
	flex-shrink: 0;
}

.street-stage__poi-stamp::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 4rpx;
}

.street-stage__poi-desc {
	position: relative;
	z-index: 1;
	display: block;
	margin-top: 22rpx;
	font-size: 24rpx;
	line-height: 1.85;
	color: #2c1810;
	letter-spacing: 1rpx;
}

.street-stage__poi-story {
	position: relative;
	z-index: 1;
	margin-top: 22rpx;
	padding: 20rpx 24rpx;
	background: rgba(212, 165, 116, 0.18);
	border-left: 4rpx solid $py-bronze;
	border-radius: 0 8rpx 8rpx 0;
}

.street-stage__poi-story-label {
	display: block;
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.street-stage__poi-story-text {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.85;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.street-stage__poi-footer {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 26rpx;
	gap: 18rpx;
}

.street-stage__poi-distance {
	font-size: 20rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 2rpx;
}

.street-stage__poi-action {
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
	transition: transform 0.18s ease;
}

.street-stage__poi-action:active {
	transform: scale(0.94);
}

.street-stage__poi-close {
	position: relative;
	z-index: 1;
	display: flex;
	justify-content: center;
	margin-top: 18rpx;
	padding-top: 14rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.35);
	font-size: 20rpx;
	color: rgba(110, 85, 65, 0.6);
	letter-spacing: 4rpx;
}

@keyframes scrollUnfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}

/* 右上角：时辰印章 + 迷你地图 */
.street-stage__rightcorner {
	position: absolute;
	right: 24rpx;
	top: calc(env(safe-area-inset-top) + 24rpx);
	z-index: 14;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 14rpx;
	pointer-events: none;
}

.street-stage__phase {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	padding: 10rpx 18rpx 12rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.32) 0%, transparent 60%),
		linear-gradient(180deg, rgba(13, 9, 7, 0.78) 0%, rgba(26, 16, 8, 0.82) 100%);
	border: 1rpx solid rgba(212, 165, 116, 0.5);
	border-radius: 6rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 195, 0.22),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
	pointer-events: auto;
	min-width: 110rpx;
}

.street-stage__phase::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx dashed rgba(212, 165, 116, 0.35);
	border-radius: 4rpx;
	pointer-events: none;
}

.street-stage__phase-label {
	position: relative;
	font-size: 30rpx;
	font-weight: 700;
	color: $py-gold-light;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	text-shadow:
		0 0 12rpx rgba(255, 220, 130, 0.55),
		0 1rpx 2rpx rgba(0, 0, 0, 0.7);
}

.street-stage__phase-caption {
	position: relative;
	font-size: 14rpx;
	color: rgba(212, 165, 116, 0.78);
	letter-spacing: 2rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.street-stage__minimap {
	pointer-events: auto;
}
</style>
