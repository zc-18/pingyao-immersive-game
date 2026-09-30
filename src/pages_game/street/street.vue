<template>
	<div class="street-stage">
		<!-- Three.js 创建 WebGL 画布，并挂载到此容器。 -->
		<div id="street-canvas" ref="streetCanvas" class="street-stage__canvas"></div>

		<!-- 上方暗角光层（暮色 / 夜灯笼） -->
		<div class="street-stage__vignette"></div>

		<!-- 左半屏触控移动反馈；渲染器 仅更新位置与摇杆帽偏移，不参与 Vue 响应式渲染。 -->
		<div id="street-move-pad" class="street-stage__move-pad" aria-hidden="true">
			<div id="street-move-knob" class="street-stage__move-knob"></div>
		</div>

		<!-- 右上角：时辰印章 + 迷你地图 -->
		<div class="street-stage__rightcorner">
			<div class="street-stage__phase" :class="phaseStamp.tone">
				<span class="street-stage__phase-label">{{ phaseStamp.label }}</span>
				<span class="street-stage__phase-caption">{{ phaseStamp.caption }}</span>
			</div>
			<MiniMap
				class="street-stage__minimap"
				:player-position="playerWorldPos"
				:player-rotation="playerHeading"
				:buildings="miniMapBuildings"
				:pois="miniMapPois"
				:map-size="54"
				:enclosure="streetWorldLayout.enclosure"
				:label="currentStreet.title"
			/>
		</div>

		<!-- 街景 HUD（覆盖在 3D 画面上）-->
		<SceneControls :open="sceneControlOpen" :phases="getPhaseList()" :phase-mode="phaseMode" :running="runningMode" :portrait="portraitMode"
			@toggle="sceneControlOpen = !sceneControlOpen" @phase="selectScenePhase" @action="handleSceneControl" />
		<StreetHud
			:settings-open="settingsOpen"
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
			:scene-hint="interactionCard ? '' : sceneHint"
			:plaque-flipping="plaqueFlipping"
			@action="handleHudAction"
		/>

		<!-- 晋小鸦悬浮（保持现有）-->
		<NpcOwl :visible="npcVisible" :message="npcMessage" :auto-hide="npcAutoHide" @close="handleNpcClose" />

		<!-- 互动 / 奖励 / 飘字 / 升级 -->
		<RewardPopup :visible="showRewardPopup" :title="rewardData.title" :rewards="rewardData.rewards" :role-bonus="rewardData.roleBonus" :npc-message="rewardData.npcMessage" @claim="handleClaimReward" />
		<FloatingText :visible="floatingText.visible" :text="floatingText.text" :type="floatingText.type" @complete="handleFloatingComplete" />
		<LevelUpEffect :visible="showLevelUp" :old-level="levelUpData.oldLevel" :new-level="levelUpData.newLevel" :old-level-name="levelUpData.oldLevelName" :new-level-name="levelUpData.newLevelName" />
		<InteractionButton v-if="interactionCard" :label="interactionCard.label" @action="openNearbyPoi" />
		<DesktopGuide :nearby="!!interactionCard" :portrait="portraitMode" @action="handleDesktopAction" />

		<!-- 画面成功显示前保持遮罩；失败可重试或返回。 -->
		<BrushLoader
			:visible="isLoading && pageVisible"
			:progress="loadProgress"
			:stage="loadStage"
			:hint="loadHint"
			:tips="loadingTips"
			:show-escape="showEscape"
			:failed="loadFailed"
			@escape="retryScene"
			@return="returnToCity"
		/>

		<!-- POI 详情（卷轴样式）-->
		<div v-if="activePoi" class="street-stage__poi-overlay">
			<div class="street-stage__poi-backdrop" @click="closePoi"></div>
			<div class="street-stage__poi-paper" @click.stop>
				<div class="street-stage__poi-roll street-stage__poi-roll--top"></div>
				<div class="street-stage__poi-roll street-stage__poi-roll--bot"></div>
				<div class="street-stage__poi-content" @touchmove.stop="$event.stopPropagation && $event.stopPropagation()">
					<div class="street-stage__poi-paper-fiber"></div>

					<div class="street-stage__poi-head">
						<div>
							<span class="street-stage__poi-eyebrow">— 古城点位 —</span>
							<span class="street-stage__poi-name">{{ activePoi.name }}</span>
						</div>
						<div class="street-stage__poi-stamp">
							<span>{{ statusLabelMap[activePoi.status] || '可探索' }}</span>
						</div>
					</div>

					<span class="street-stage__poi-desc">{{ activePoi.description }}</span>

					<div class="street-stage__poi-story">
						<span class="street-stage__poi-story-label">— 晋小鸦提示 —</span>
						<span class="street-stage__poi-story-text">{{ activePoi.npcTopic }}</span>
						<span v-if="poiDeepLines[activePoi.id]" class="street-stage__poi-story-deep">{{ poiDeepLines[activePoi.id] }}</span>
					</div>

					<!-- 我的札记（写过才显示）-->
					<div v-if="poiNote" class="street-stage__poi-mynote">
						<span class="street-stage__poi-mynote-label">— 我的札记 —</span>
						<span class="street-stage__poi-mynote-text">{{ poiNote }}</span>
					</div>

					<div v-if="poiProgressError" class="street-stage__poi-error" role="alert">
						<span>本次进度未保存，请重试。</span>
						<button role="button" tabindex="0" aria-label="重试保存点位进度" @click.stop="retryPoiProgress">重试保存</button>
					</div>

					<div class="street-stage__poi-footer">
						<div class="street-stage__poi-tools">
							<div class="street-stage__poi-tool" :class="{ 'street-stage__poi-tool--on': poiFavorited }" @click.stop="toggleFav">
								<span>{{ poiFavorited ? '★ 收藏' : '☆ 收藏' }}</span>
							</div>
							<div class="street-stage__poi-tool" @click.stop="editNote">
								<span>{{ poiNote ? '✎ 改札记' : '✎ 札记' }}</span>
							</div>
						</div>
						<div class="street-stage__poi-action" @click.stop="playPoiTopic">
							<span>继续讲解 ›</span>
						</div>
						<div class="street-stage__poi-action street-stage__poi-investigate" @click.stop="handleSceneInteraction">
							<span>查看线索</span>
						</div>
					</div>

					<div class="street-stage__poi-close" @click="closePoi">
						<span>收起</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 入城过场（城门徐徐打开）-->
		<GateTransition
			v-if="showEntranceAnim"
			:visible="showEntranceAnim"
			plaque-text="平 遥 古 城"
			:kicker="entranceCopy.kicker"
			:title="entranceCopy.title"
			:desc="entranceCopy.desc"
		/>

		<!-- 街景内衣橱：从 HUD「行囊」唤起，换装即时热切换到 3D 化身 -->
		<OutfitWardrobe :visible="wardrobeOpen" compact-landscape @close="wardrobeOpen = false" @changed="onStreetWardrobeChanged" />
		<StreetSettings :visible="settingsOpen" :settings="gameplaySettings" @close="settingsOpen = false" @setting="changeGameplaySetting" @guide="openGuide" @home="leaveForCity" />

		<!-- 街景切换器（牌匾翻转）-->
		<div class="street-stage__switch">
			<div class="street-stage__switch-arrow" @click="switchStreet(-1)">
				<span>‹</span>
			</div>
			<div class="street-stage__switch-arrow" @click="switchStreet(1)">
				<span>›</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import streetRenderer from './street-renderer.js'
import StreetHud from '@/components/StreetHud.vue'
import StreetSettings from '@/components/StreetSettings.vue'
import NpcOwl from '@/components/NpcOwl.vue'
import InteractionButton from '@/components/InteractionButton.vue'
import BrushLoader from '@/components/BrushLoader.vue'
import RewardPopup from '@/components/RewardPopup.vue'
import FloatingText from '@/components/FloatingText.vue'
import LevelUpEffect from '@/components/LevelUpEffect.vue'
import GateTransition from '@/components/GateTransition.vue'
import streetScenes from '@/common/data/streets.js'
import { roleList } from '@/common/data/roles.js'
import { getStorage, patchStorageObject, hasSelectedRole, STORAGE_KEYS } from '@/common/utils/storage.js'
import { getLevelMeta, getLevelProgress } from '@/common/utils/level.js'
import { playBGM, stopBGM, resumeBGM, playSFX, SFX, BGM } from '@/common/utils/audio.js'
import {
	getCurrentStreetScene,
	getExploreDirectionLabel,
	getScenePoiList,
	getGameSnapshot,
	markNpcTalk,
	markPageVisit,
	markPoiVisited,
	markPrologueComplete,
	markStreetSceneVisited,
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
import { stepBuffer } from '@/common/utils/step-buffer.js'
import { getGameplaySettings, updateGameplaySetting } from '@/common/utils/game-settings.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { getCurrentPhase, getPhase, getPhaseList } from '@/common/utils/phase.js'
import { getContextualNpcCue } from '@/common/utils/npc-cue.js'
import { getEquippedCostumeSkin } from '@/common/data/costumes.js'
import { loadingTips, poiDeepLines } from '@/common/data/culture-tips.js'
import { toggleFavoritePoi, isFavoritePoi, getJournalNote, setJournalNote } from '@/common/utils/journal.js'
import { buildStreetWorldLayout } from '@/common/utils/street-world.js'
import { lockGameLandscape, releaseOrientationLock } from '@/common/utils/orientation.js'
import MiniMap from '@/components/MiniMap.vue'
import OutfitWardrobe from '@/components/OutfitWardrobe.vue'
import SceneControls from '@/components/SceneControls.vue'
import DesktopGuide from '@/components/DesktopGuide.vue'
import { onPageLoad, onPageHide, onPageShow } from '@/platform/lifecycle.js'
import { showToast } from '@/platform/toast.js'
import { showModal } from '@/platform/modal.js'
import { navigateTo, switchTab, reLaunch } from '@/platform/navigation.js'

defineOptions({ name: 'StreetPage' })

const statusLabelMap = { nearby: '已靠近', discoverable: '待点亮', quest: '主线热点', hot: '必看地标', route: '顺路可达' }

const userProfile = ref(getStorage(STORAGE_KEYS.userProfile, {}))
const userProgress = ref(getStorage(STORAGE_KEYS.userProgress, {}))
const currentStreetIndex = ref(0)
const activePoiId = ref('')
const poiProgressFailure = ref(null)
/* 当前是否正贴在某 POI 的进入半径内（独立于驱动卷轴遮罩的 activePoiId）：
   进入 poi-enter 置位、离开 poi-leave 清空，供附近查看入口及 approach 预告使用。*/
const nearActivePoiId = ref('')
const npcVisible = ref(false)
const npcMessage = ref('')
const npcAutoHide = ref(false)
const isLoading = ref(true)
const pageVisible = ref(true)
const loadProgress = ref(0)
const loadFailed = ref(false)
/* 加载可观测面包屑 + 兜底逃生（三轮排查的教训：盲调太久。stage 停在哪一步=卡在哪一步） */
const loadStage = ref('正在唤起街景…')
const loadHint = ref('')
const showEscape = ref(false)
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
const phaseMode = ref('auto')
const runningMode = ref(false)
const portraitMode = ref(false)
const sceneControlOpen = ref(false)
const settingsOpen = ref(false)
const gameplaySettings = ref(getGameplaySettings())
const playerWorldPos = ref({ x: 0, z: 13 })
const playerHeading = ref(0)
const wardrobeOpen = ref(false)
const journalTick = ref(0) // 收藏/札记写入后自增，驱动 poiFavorited/poiNote 重算（数据在 storage，非响应式）
let phaseWatchTimer = null

const streetCanvas = ref(null)
let rendererMounted = false
/* 最近一次场景请求用于加载失败后的重试。 */
let lastSceneCmdPayload = null
let lastSceneCmdAction = 'init'
let loadWatchdog = null
let initAttempts = 0
let sceneRequestId = 0
let completedSceneRequestId = 0
const MAX_INIT_ATTEMPTS = 2
const LOAD_TIMEOUT = 10000
/* 绝对兜底（独立于 initScene 是否被调用）：onMounted 里无条件武装，杜绝任何「init 从未触发」的路径永久卡死。
   entryEscapeTimer：到点显示重试和返回；entryFailsafeTimer：视图无回应时显示失败状态。 */
let entryEscapeTimer = null
let entryFailsafeTimer = null
const ENTRY_ESCAPE_DELAY = 5000
const ENTRY_FAILSAFE_TIMEOUT = 25000

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
const nearbyPoi = computed(() => streetPois.value.find((item) => item.id === nearActivePoiId.value) || null)
const poiProgressError = computed(() => Boolean(activePoiId.value && poiProgressFailure.value?.poiId === activePoiId.value))
/* 当前 POI 的收藏/札记态（journalTick 变化时重算）。 */
const poiFavorited = computed(() => { journalTick.value; return activePoiId.value ? isFavoritePoi(activePoiId.value) : false })
const poiNote = computed(() => { journalTick.value; return activePoiId.value ? getJournalNote(activePoiId.value) : '' })
const levelMeta = computed(() => getLevelMeta(userProgress.value.exp || 0))
const silverKey = computed(() => Number(userProgress.value.silverKey || 0))
const userScore = computed(() => Number(userProgress.value.score || 0))
const displaySteps = computed(() => Number(userProgress.value.steps || 0))
const expPercent = computed(() => getLevelProgress(userProgress.value.exp || 0))
const roleAvatarChar = computed(() => roleMap[userProfile.value.roleId]?.avatar || '客')
const snapshot = ref(getGameSnapshot())
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
		kicker: '世界文化遗产 · 晋商故里',
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
const interactionCard = computed(() => nearbyPoi.value && !activePoi.value && !isLoading.value && !wardrobeOpen.value && !settingsOpen.value && !showRewardPopup.value && !showEntranceAnim.value && !sceneControlOpen.value
	? { label: `查看${nearbyPoi.value.name}` } : null)

/* 逻辑层与 渲染器 共用同一份街巷世界坐标，避免画面和迷你地图各算一套。 */
const streetWorldLayout = computed(() => buildStreetWorldLayout(currentStreet.value, streetPois.value))

const miniMapBuildings = computed(() => {
	return streetWorldLayout.value.facades.map((building) => ({
		id: building.id,
		x: building.x,
		z: building.z,
		width: building.depth,
		depth: building.width
	}))
})

const miniMapPois = computed(() => {
	return streetWorldLayout.value.pois.map((placement) => {
		const poi = streetPois.value.find((item) => item.id === placement.id) || placement
		return {
			id: placement.id,
			x: placement.x,
			z: placement.z,
			isQuest: placement.id === questTargetPoiId.value || poi.status === 'quest',
			isHot: poi.status === 'hot'
		}
	})
})

/* 顶栏时辰印章数据 */
const phaseStamp = computed(() => ({
	label: currentPhase.value.label,
	caption: currentPhase.value.caption,
	tone: currentPhase.value.toneClass || ''
}))

/* 把 phase 配置序列化成 渲染器 可消费的纯 JSON */
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

/* 「画面特效」总开关：关闭则 渲染器 跳过 Bloom 后处理（直接渲染），既让设置真实生效，也给低端机降负载。 */
function readEffectsEnabled() {
	return getStorage(STORAGE_KEYS.gameSettings, {}).enableEffect !== false
}

/* 统一构造下发给 渲染器 的场景载荷（init / loadScene 共用，便于一处补齐特效开关与化身皮肤等跨端字段）。 */
function buildScenePayload() {
	return {
		streetData: currentStreet.value,
		pois: streetPois.value,
		questTargetPoiId: questTargetPoiId.value,
		phase: serializePhase(currentPhase.value),
		effectsEnabled: readEffectsEnabled(),
		playerSkin: getEquippedCostumeSkin(userProfile.value.roleId),
		controls: { running: runningMode.value, portrait: portraitMode.value, blocked: Boolean(isLoading.value || activePoiId.value || wardrobeOpen.value || settingsOpen.value || showRewardPopup.value || showEntranceAnim.value) },
		worldLayout: streetWorldLayout.value
	}
}

watch(currentStreet, (street) => {
	activePoiId.value = ''
	poiProgressFailure.value = null
	nearActivePoiId.value = ''            // 切换街景后清空贴靠态，否则新街景的 approach 预告被旧 poiId 门控住而哑火
	playerWorldPos.value = { ...streetWorldLayout.value.spawn }
	playerHeading.value = 0
	setCurrentStreetScene(street.id, { sceneMode: 'story' })
	plaqueFlipping.value = true
	if (plaqueTimer) clearTimeout(plaqueTimer)
	plaqueTimer = setTimeout(() => { plaqueFlipping.value = false; plaqueTimer = null }, 600)
})

const renderCommandQueue = []
let renderCommandDisposed = false
function sendToRenderer(type, data) {
	if (renderCommandDisposed) return
	renderCommandQueue.push({ action: type, data: data || {} })
	flushRenderCommands()
}
function flushRenderCommands() {
	if (!rendererMounted || renderCommandDisposed) return
	while (renderCommandQueue.length) streetRenderer.methods.onSceneCmd(renderCommandQueue.shift())
}

/* 渲染器通过挂载时注入的回调回传消息。 */
function handleRenderMsg(msg) {
	if (!msg || !msg.detail) return
	const { type, data } = msg.detail
	if (type === 'desktop-action') { handleDesktopAction(data?.action); return }
	if (type === 'view-ready') {
		loadStage.value = '正在准备古城画面…'
	} else if (type === 'render-stage') {
		// 渲染器 各阶段面包屑：卡住时这行会停在最后到达的阶段，直接指明失败点。
		if (data && !loadFailed.value) loadStage.value = String(data)
	} else if (type === 'render-ready') {
		if (!matchesSceneRequest(data)) return
		clearLoadWatchdog()
		clearEntryTimers()
		loadStage.value = ''
		loadHint.value = ''
		showEscape.value = false
		loadFailed.value = false
		isLoading.value = false
		if (completedSceneRequestId !== data.requestId) {
			completedSceneRequestId = data.requestId
			settleLoadedScene()
		}
	} else if (type === 'render-progress') {
		loadProgress.value = Math.max(0, Math.min(100, Number(data) || 0))
	} else if (type === 'render-error') {
		if (!matchesSceneRequest(data)) return
		console.warn('[street] render failed:', data.error)
		setSceneLoadFailure(data.contextLost ? '画面暂时中断，正在等待恢复。也可以重新加载院落。' : undefined)
	} else if (type === 'poi-enter') {
		handlePoiEnter(data)
	} else if (type === 'poi-leave') {
		handlePoiLeave(data)
	} else if (type === 'poi-near') {
		handlePoiApproach(data)
	} else if (type === 'player-move') {
		handlePlayerMove(data)
	}
}

function matchesSceneRequest(data) {
	return !renderCommandDisposed && data?.requestId === lastSceneCmdPayload?.requestId && data?.sceneId === currentStreet.value.id
}

function refreshRuntimeState() {
	refreshProgressFeedback()
	userProfile.value = getStorage(STORAGE_KEYS.userProfile, {})
	trackedQuest.value = ensureJourneyQuest()
	snapshot.value = getGameSnapshot()
	questTargetPoiId.value = trackedQuest.value ? getQuestTargetPoi(trackedQuest.value.id) || '' : ''
	patchRuntimeState({
		lastQuestId: trackedQuest.value?.id || '',
		lastQuestStageLine: snapshot.value.journeyCopy?.approachLine || ''
	})
	sendToRenderer('highlightPoi', { poiId: questTargetPoiId.value })
}

let levelUpTimer = null
let entranceTimer = null
let plaqueTimer = null

/* 保留发奖前的页面等级，再读入微奖励、任务、步数与成就的最终存档。 */
function refreshProgressFeedback() {
	const oldLevel = getLevelMeta(userProgress.value.exp || 0)
	const sync = syncAchievementUnlocks()
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	const next = getLevelMeta(userProgress.value.exp || 0)
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((item) => item.name).join('、')
		showToast({ title: `点亮成就：${labels}`, icon: 'none', duration: 2200 })
		playSFX(SFX.ACHIEVEMENT)
	}
	if (next.level > oldLevel.level) {
		levelUpData.value = { oldLevel: oldLevel.level, newLevel: next.level, oldLevelName: oldLevel.title, newLevelName: next.title }
		showLevelUp.value = true
		if (levelUpTimer) clearTimeout(levelUpTimer)
		levelUpTimer = setTimeout(() => { showLevelUp.value = false; levelUpTimer = null }, 3200)
		playSFX(SFX.LEVEL_UP)
	}
}

function clearFeedbackTimers() {
	for (const timer of [levelUpTimer, entranceTimer, plaqueTimer]) if (timer) clearTimeout(timer)
	levelUpTimer = entranceTimer = plaqueTimer = null
	showLevelUp.value = false
	floatingText.value.visible = false
	plaqueFlipping.value = false
}

function clearLoadWatchdog() {
	if (loadWatchdog) {
		clearTimeout(loadWatchdog)
		loadWatchdog = null
	}
}

/* 未收到首帧确认时自动重试一次，仍失败则保留可操作的错误界面。 */
function armLoadWatchdog() {
	clearLoadWatchdog()
	loadWatchdog = setTimeout(() => {
		if (!isLoading.value || loadFailed.value) return
		initAttempts += 1
		if (initAttempts < MAX_INIT_ATTEMPTS && lastSceneCmdPayload) {
			beginSceneLoad('reinit')
		} else {
			setSceneLoadFailure('院落准备时间较长，请重新加载或先返回古城。')
		}
	}, LOAD_TIMEOUT)
}

function clearEntryTimers() {
	if (entryEscapeTimer) { clearTimeout(entryEscapeTimer); entryEscapeTimer = null }
	if (entryFailsafeTimer) { clearTimeout(entryFailsafeTimer); entryFailsafeTimer = null }
}

/* 独立于视图回传的超时出口，保留用户重试和返回的选择。 */
function armEntryFailsafe() {
	clearEntryTimers()
	entryEscapeTimer = setTimeout(() => {
		if (isLoading.value) showEscape.value = true
	}, ENTRY_ESCAPE_DELAY)
	entryFailsafeTimer = setTimeout(() => {
		if (isLoading.value) setSceneLoadFailure('院落准备时间较长，请重新加载或先返回古城。')
	}, ENTRY_FAILSAFE_TIMEOUT)
}

function setSceneLoadFailure(hint = '院落暂未加载成功。请重新加载，或返回古城稍后再来。') {
	clearLoadWatchdog()
	clearEntryTimers()
	isLoading.value = true
	loadFailed.value = true
	showEscape.value = true
	loadProgress.value = 0
	loadStage.value = ''
	loadHint.value = hint
}

function beginSceneLoad(action) {
	isLoading.value = true
	loadFailed.value = false
	showEscape.value = false
	loadProgress.value = 0
	loadHint.value = ''
	loadStage.value = action === 'loadScene' ? '正在前往下一座院落…' : '正在准备古城院落…'
	lastSceneCmdAction = action
	lastSceneCmdPayload = { ...buildScenePayload(), requestId: ++sceneRequestId }
	armLoadWatchdog()
	armEntryFailsafe()
	sendToRenderer(action, lastSceneCmdPayload)
}

function retryScene() {
	if (!showEscape.value) return
	activePoiId.value = ''
	nearActivePoiId.value = ''
	initAttempts = 0
	beginSceneLoad('reinit')
}

function returnToCity() {
	clearLoadWatchdog()
	clearEntryTimers()
	sendToRenderer('pause')
	switchTab({ url: '/home' })
}

function initScene() {
	initAttempts = 0
	beginSceneLoad('init')
}

function loadCurrentScene() {
	initAttempts = 0
	beginSceneLoad('loadScene')
}

function settleLoadedScene() {
	markStreetSceneVisited(currentStreet.value.id)
	const result = advanceQuestByEvent(EVENT_TYPES.sceneLoaded, { sceneId: currentStreet.value.id })
	if (result.updated) {
		scenePulseText.value = result.stageLine
		announceMicroReward(result.microReward)
	}
	// sceneLoaded 也可能是任务收尾事件：当 load-* 的 explore 目标是最后一个未完成目标时（目标可乱序完成），
	// 换幕补满会使整条任务通关。必须与 enter/talk/interact 三处一致结算，否则任务变成"全目标满但仍 active"
	// 的僵尸态——getTrackedQuest 持续返回它、ensureJourneyQuest 早退，卡住后续主线且漏发最终奖励。
	if (result.completed && trackedQuest.value) {
		handleQuestComplete(trackedQuest.value.id)
		return
	}
	refreshRuntimeState()
	// 换幕开场白：接通此前从未被调用的 SCENE_CUES（kind:'scene'），晋小鸦按街景道一句开场，
	// 强化"切场也有引导"。不覆盖常驻消息（刚领奖 / 任务卷轴等 autoHide=false 的气泡）。
	if (!(npcVisible.value && !npcAutoHide.value)) {
		npcMessage.value = getContextualNpcCue({
			kind: 'scene',
			sceneId: currentStreet.value.id,
			phaseKey: currentPhase.value.key,
			roleId: userProfile.value.roleId
		})
		npcVisible.value = true
		npcAutoHide.value = true
	}
}

/* 新任务可能就在脚下的街巷开启；只在已显示的场景补记抵达。
   领奖卷轴关闭后再推进，避免后续完成事件覆盖尚未收下的奖励。 */
watch(() => [trackedQuest.value?.id, isLoading.value, showRewardPopup.value], () => {
	if (isLoading.value || showRewardPopup.value || stepSavingSuspended || renderCommandDisposed) return
	const objectives = trackedQuest.value?.progress?.objectives || []
	if (objectives.some((item) => item.type === 'explore' && item.target === currentStreet.value.id && item.current < item.required)) {
		settleLoadedScene()
	}
})

function applyPhaseToScene() {
	sendToRenderer('applyPhase', { phase: serializePhase(currentPhase.value) })
}

function selectScenePhase(key) {
	phaseMode.value = key
	currentPhase.value = key === 'auto' ? getCurrentPhase() : getPhase(key)
	applyPhaseToScene()
}

function handleSceneControl(action) {
	if (action === 'run') runningMode.value = !runningMode.value
	if (action === 'portrait') portraitMode.value = !portraitMode.value
	if (action === 'reset') portraitMode.value = false
	sendToRenderer('sceneControl', { action, running: runningMode.value, portrait: portraitMode.value })
}

function handleDesktopAction(action) {
	if (isLoading.value || showEntranceAnim.value || showRewardPopup.value) return
	if (action === 'escape') {
		if (wardrobeOpen.value) wardrobeOpen.value = false
		else if (settingsOpen.value) settingsOpen.value = false
		else if (activePoiId.value) closePoi()
		else if (sceneControlOpen.value) sceneControlOpen.value = false
		else settingsOpen.value = true
		return
	}
	if (wardrobeOpen.value || settingsOpen.value || activePoiId.value) return
	if (action === 'interact') openNearbyPoi()
	else if (action === 'inventory' || action === 'quest') handleHudAction(action)
	else if (['portrait', 'reset', 'greet'].includes(action)) handleSceneControl(action)
}

watch(() => Boolean(isLoading.value || activePoiId.value || wardrobeOpen.value || settingsOpen.value || showRewardPopup.value || showEntranceAnim.value), (blocked) => {
	sendToRenderer('blockInput', { blocked })
})

function watchPhase() {
	if (phaseWatchTimer) return
	phaseWatchTimer = setInterval(() => {
		if (phaseMode.value !== 'auto') return
		const next = getCurrentPhase()
		if (next.key !== currentPhase.value.key) {
			currentPhase.value = next
			applyPhaseToScene()
			// 换幕时晋小鸦按时辰/角色道一句情境寒暄（不打断常驻消息 / POI 卷轴）
			if (!activePoiId.value && !(npcVisible.value && !npcAutoHide.value)) {
				npcMessage.value = getContextualNpcCue({
					kind: 'phase',
					roleId: userProfile.value.roleId,
					phaseKey: next.key
				})
				npcVisible.value = true
				npcAutoHide.value = true
			}
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
	nearActivePoiId.value = poiId
	const visited = markPoiVisited(poiId)
	setCurrentPoi(poiId, poi.npcTopic)
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	if (visited === null) { recordPoiProgressFailure('visit', poiId); return }

	const result = advanceQuestByEvent(EVENT_TYPES.poiEntered, { poiId, sceneId: currentStreet.value.id })
	if (result.error) { recordPoiProgressFailure('visit', poiId); return }
	clearPoiProgressFailure('visit', poiId)
	scenePulseText.value = result.stageLine || poi.npcTopic
	npcMessage.value = getContextualNpcCue({
		kind: 'enter',
		roleId: userProfile.value.roleId,
		phaseKey: currentPhase.value.key,
		poiId,
		poi,
		questHint: result.stageLine || getQuestNpcHint(trackedQuest.value?.id) || ''
	})
	npcVisible.value = true
	npcAutoHide.value = true

	if (result.microReward) {
		announceMicroReward(result.microReward)
	}

	refreshProgressFeedback()

	if (result.completed && trackedQuest.value) {
		handleQuestComplete(trackedQuest.value.id)
		return
	}

	refreshRuntimeState()
}

function handlePoiLeave(poiId) {
	if (poiId && poiId !== nearActivePoiId.value) return
	nearActivePoiId.value = ''
	if (npcAutoHide.value) {
		npcVisible.value = false
	}
}

/* 由远及近的浮空预告（第7轮）：玩家走近 POI 外圈时，晋小鸦先按角色/时辰给一句情境提示，
   不推进任务、不开 POI 卷轴；带每点位冷却，避免来回走动反复弹气泡。 */
const approachCooldown = {}
function handlePoiApproach(poiId) {
	if (!poiId) return
	if (nearActivePoiId.value) return                   // 已贴在某 POI 进入半径内，交给 enter 流程
	if (npcVisible.value && !npcAutoHide.value) return  // 有常驻消息时不打扰
	const now = Date.now()
	if (now - (approachCooldown[poiId] || 0) < 15000) return
	approachCooldown[poiId] = now
	const poi = streetPois.value.find((item) => item.id === poiId)
	if (!poi) return
	npcMessage.value = getContextualNpcCue({
		kind: 'approach',
		roleId: userProfile.value.roleId,
		phaseKey: currentPhase.value.key,
		poiId,
		poi
	})
	npcVisible.value = true
	npcAutoHide.value = true
}

function playPoiTopic() {
	if (!activePoi.value) return
	const result = advanceQuestByEvent(EVENT_TYPES.npcDialogCompleted, {
		poiId: activePoi.value.id,
		topic: activePoi.value.npcTopic
	})
	if (result.error) { recordPoiProgressFailure('talk', activePoi.value.id); return }
	clearPoiProgressFailure('talk', activePoi.value.id)
	const talk = markNpcTalk(activePoi.value.npcTopic || activePoi.value.id)
	if (talk?.ok === false) { recordPoiProgressFailure('talk', activePoi.value.id); return }
	playSFX(SFX.NPC_TALK)
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
	if (result.error) { recordPoiProgressFailure('explore', activePoi.value.id); return }
	clearPoiProgressFailure('explore', activePoi.value.id)
	scenePulseText.value = result.stageLine || `你已查看 ${activePoi.value.name} 的线索。`
	if (result.microReward) {
		announceMicroReward(result.microReward)
	} else {
		showFloatingText(result.objectiveCompleted ? '线索已记入行旅册' : '已查看此处线索', 'exp')
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
	const result = completeQuestAndCollectFeedback(questId)
	if (!result) {
		showToast({ title: '奖励未保存，请再次交互重试', icon: 'none' })
		return
	}
	playSFX(SFX.QUEST_COMPLETE)

	rewardData.value = {
		title: result.mainJustCompleted ? '五街行旅 · 圆满' : `${result.quest.title} 已点亮`,
		rewards: result.rewards,
		roleBonus: result.roleBonus,
		npcMessage: result.nextLine || result.quest.completionLine || '新的路已经在城里为你点亮。'
	}
	showRewardPopup.value = true
	pendingSceneAfterClaim.value = !result.mainJustCompleted && result.nextQuest?.type !== 'daily' && result.nextQuest?.sceneId && result.nextQuest.sceneId !== currentStreet.value.id ? result.nextQuest.sceneId : ''

	refreshRuntimeState()
}

function handleClaimReward() {
	showRewardPopup.value = false
	closePoi()
	const rewards = rewardData.value.rewards || {}
	if (rewards.silverKey) {
		showFloatingText(`银钥 +${rewards.silverKey}`, 'silverKey')
	} else if (rewards.exp) {
		showFloatingText(`EXP +${rewards.exp}`, 'exp')
	}
	playSFX(SFX.COIN)

	refreshProgressFeedback()

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
		playSFX(SFX.COIN)
	}
	refreshProgressFeedback()
}

function handleNpcClose() {
	npcVisible.value = false
}

function closePoi() {
	activePoiId.value = ''
	npcVisible.value = false
}

function openNearbyPoi() {
	if (!interactionCard.value) return
	activePoiId.value = nearbyPoi.value.id
	setCurrentPoi(nearbyPoi.value.id, nearbyPoi.value.npcTopic)
	npcVisible.value = false
}

function recordPoiProgressFailure(action, poiId) {
	poiProgressFailure.value = { action, poiId }
	floatingText.value.visible = false
	npcVisible.value = false
	refreshRuntimeState()
}

function clearPoiProgressFailure(action, poiId) {
	const failure = poiProgressFailure.value
	if (failure?.action === action && failure.poiId === poiId) poiProgressFailure.value = null
}

function retryPoiProgress() {
	if (!poiProgressError.value) return
	const { action, poiId } = poiProgressFailure.value
	if (action === 'visit') handlePoiEnter(poiId)
	else if (action === 'talk') playPoiTopic()
	else if (action === 'explore') handleSceneInteraction()
}

/* 收藏当前 POI（行旅册「心头好」）。 */
function toggleFav() {
	if (!activePoi.value) return
	const r = toggleFavoritePoi(activePoi.value.id)
	if (!r.ok) { showToast({ title: '保存失败，请重试', icon: 'none' }); return }
	journalTick.value++
	playSFX(SFX.REWARD)
	showToast({ title: r.favorited ? '已收入心头好' : '已取消收藏', icon: 'none' })
}

/* 为当前 POI 写/改一条私人札记（确认框 可编辑输入；≤60 字）。 */
function editNote() {
	if (!activePoi.value) return
	const poiId = activePoi.value.id
	showModal({
		title: `札记 · ${activePoi.value.name}`,
		editable: true,
		placeholderText: '写一句此处的心得（≤60 字）',
		content: getJournalNote(poiId),
		success: (res) => {
			if (!res.confirm) return
			if (setJournalNote(poiId, res.content || '') === null) {
				showToast({ title: '保存失败，请重试', icon: 'none' })
				return
			}
			journalTick.value++
			showToast({ title: '已记入行旅册', icon: 'none' })
		}
	})
}

function handleHudAction(action) {
	if (action === 'inventory') {
		// 行囊 → 衣橱：街景内换装，确认后即时热切换到 3D 化身（无需重进街景）
		wardrobeOpen.value = true
	} else if (action === 'quest') {
		switchTab({ url: '/user' })
	} else if (action === 'settings') {
		gameplaySettings.value = getGameplaySettings()
		sceneControlOpen.value = false
		settingsOpen.value = true
	}
}

function changeGameplaySetting({ key, enabled }) {
	const result = updateGameplaySetting(key, enabled)
	gameplaySettings.value = result.settings
	if (!result.ok) {
		showToast({ title: '设置未能保存，请重试', icon: 'none' })
		return
	}
	if (key === 'enableEffect') sendToRenderer('applySettings', { effectsEnabled: result.settings.enableEffect })
}

function openGuide() {
	settingsOpen.value = false
	navigateTo({ url: '/dialog' })
}

function leaveForCity() {
	settingsOpen.value = false
	returnToCity()
}

/* 街景内换装回调：把新装备的化身皮肤热下发给 渲染器，立刻重建玩家化身（不重载整场景）。 */
function onStreetWardrobeChanged() {
	userProfile.value = getStorage(STORAGE_KEYS.userProfile, {})
	sendToRenderer('reskinPlayer', { playerSkin: getEquippedCostumeSkin(userProfile.value.roleId) })
}

function switchStreet(direction) {
	isLoading.value = true
	const nextIndex = (currentStreetIndex.value + direction + streetScenes.length) % streetScenes.length
	currentStreetIndex.value = nextIndex
	refreshRuntimeState()
	loadCurrentScene()
}

function switchStreetById(sceneId) {
	if (!streetMap[sceneId]) return
	isLoading.value = true
	currentStreetIndex.value = streetMap[sceneId].index
	refreshRuntimeState()
	loadCurrentScene()
}

// 步数批量写入：停止移动也会定时落盘，失败不丢增量、不高频重试。
let lastStepFlush = 0
let stepFlushTimer = null
let stepRetryAt = 0
let stepSavingSuspended = false
let stepSaveWarningShown = false
const STEP_FLUSH_INTERVAL = 800
const STEP_FLUSH_MIN_DELTA = 5
const STEP_RETRY_INTERVAL = 3000

function clearStepFlushTimer() {
	if (stepFlushTimer !== null) clearTimeout(stepFlushTimer)
	stepFlushTimer = null
}

function scheduleStepFlush(delay) {
	if (stepSavingSuspended || renderCommandDisposed || stepFlushTimer !== null || !stepBuffer.pending) return
	stepFlushTimer = setTimeout(() => { stepFlushTimer = null; flushSteps(true) }, delay)
}

function flushSteps(force = false) {
	if (force) clearStepFlushTimer()
	if (!stepBuffer.pending) return
	const now = Date.now()
	const wait = Math.max(0, stepRetryAt - now, lastStepFlush + STEP_FLUSH_INTERVAL - now)
	if (!force && (now < stepRetryAt || (stepBuffer.pending < STEP_FLUSH_MIN_DELTA && wait > 0))) {
		scheduleStepFlush(wait)
		return
	}
	clearStepFlushTimer()
	const stepResult = stepBuffer.flush()
	lastStepFlush = now
	if (!stepResult.ok) {
		stepRetryAt = now + STEP_RETRY_INTERVAL
		if (!stepSaveWarningShown) showToast({ title: '步数暂未保存，请保留游戏，将自动重试', icon: 'none', duration: 2600 })
		stepSaveWarningShown = true
		scheduleStepFlush(STEP_RETRY_INTERVAL)
	} else {
		stepRetryAt = 0
		stepSaveWarningShown = false
	}
	if (stepResult.accepted) {
		refreshProgressFeedback()
	}
	if (stepResult.completed.length) {
		refreshRuntimeState()
		const done = stepResult.completed[0]
		showToast({ title: `${done.quest.title} 达成 · 银钥+${done.rewards.silverKey}`, icon: 'none', duration: 2200 })
	}
}

function handlePlayerMove(detail) {
	// 渲染器 按碰撞后真实移动距离计步；只有明确的有限正整数增量能进入存档。
	stepBuffer.add(detail?.steps)
	flushSteps(Boolean(detail?.flush) || stepSavingSuspended || renderCommandDisposed)
	if (Number.isFinite(detail?.x) && Number.isFinite(detail?.z)) {
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
	if (entranceTimer) clearTimeout(entranceTimer)
	entranceTimer = setTimeout(() => {
		entranceTimer = null
		showEntranceAnim.value = false
		try {
			markPrologueComplete(currentStreet.value.id)
			npcMessage.value = trackedQuest.value?.introLine || '城门已开，顺着第一段引线往前走吧。'
			npcVisible.value = true
			npcAutoHide.value = false
		} catch (e) {
			// 入城前置（标记序章 / 文案）失败绝不能阻断 initScene——否则首装用户永久卡「张望」。
		}
		initScene()
	}, 3000)
}

onPageLoad(() => {
	try {
		lockGameLandscape()
		// 身份守卫：街景是主线核心场景，必须已择身份才可进入。无 roleId 直接进来（深链 / 异常重置）会让化身退化为「客」、
		// 角色加成与支线全部失效。无身份则退回启动页重新择身份。
		const guardProfile = getStorage(STORAGE_KEYS.userProfile, {})
		if (!hasSelectedRole(guardProfile)) {
			reLaunch({ url: '/splash' })
			return
		}

		markPageVisit('street', { returnPage: '/street' })
		rememberReturnContext('/street', '')

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
			// 容器挂载完成后再初始化场景。
		}
	} catch (e) {
		// onLoad 任一步抛错都不应让街景失去初始化机会：直接补一次 initScene（绝对兜底计时器在 onMounted 已武装）。
		initScene()
	}
})

onMounted(() => {
	// 绝对兜底最先武装：不依赖 initScene / onLoad 的任何分支，保证所有路径都不会永久卡在加载层。
	streetRenderer.mount(streetCanvas.value, handleRenderMsg)
	rendererMounted = true
	flushRenderCommands()
	armEntryFailsafe()
	loadStage.value = '正在准备古城画面…'
	try {
		// 非序章玩家在容器与消息回调就绪后初始化。
		const runtime = getStorage(STORAGE_KEYS.appRuntime, {})
		if (runtime.hasCompletedPrologue) {
			initScene()
		}
		watchPhase()
		// 街景是核心沉浸场景：进入即起环境 BGM（受"音效"开关与素材是否就位双重兜底，缺文件不报错）。
		playBGM(BGM.STREET_AMBIENT)
	} catch (e) {
		setSceneLoadFailure()
	}
})

onUnmounted(() => {
	streetRenderer.unmount()
	rendererMounted = false
	renderCommandDisposed = true
	stepSavingSuspended = true
	renderCommandQueue.length = 0
	releaseOrientationLock()
	flushSteps(true)
	stopWatchPhase()
	stopBGM()
	clearLoadWatchdog()
	clearEntryTimers()
	clearFeedbackTimers()
})

onPageHide(() => {
	pageVisible.value = false
	stepSavingSuspended = true
	sendToRenderer('pause')
	flushSteps(true)
	clearLoadWatchdog()
	clearEntryTimers()
	stopWatchPhase()
	clearFeedbackTimers()
	npcVisible.value = false
	stopBGM()
})
onPageShow(() => {
	pageVisible.value = true
	watchPhase()
	if (isLoading.value && !loadFailed.value) { armLoadWatchdog(); armEntryFailsafe() }
	stepSavingSuspended = false
	flushSteps(true)
	gameplaySettings.value = getGameplaySettings()
	const desiredStreet = getCurrentStreetScene()
	refreshRuntimeState()
	if (phaseMode.value === 'auto') currentPhase.value = getCurrentPhase()
	sendToRenderer('applySettings', { effectsEnabled: gameplaySettings.value.enableEffect })
	if (rendererMounted && lastSceneCmdPayload && desiredStreet?.id !== currentStreet.value.id && streetMap[desiredStreet?.id]) {
		switchStreetById(desiredStreet.id)
	} else if (rendererMounted && lastSceneCmdPayload) {
		applyPhaseToScene()
		const playerSkin = getEquippedCostumeSkin(userProfile.value.roleId)
		if (JSON.stringify(lastSceneCmdPayload.playerSkin) !== JSON.stringify(playerSkin)) {
			lastSceneCmdPayload.playerSkin = playerSkin
			sendToRenderer('reskinPlayer', { playerSkin })
		}
	}
	if (showEntranceAnim.value && !entranceTimer) playEntranceAnimation()
	resumeBGM(); playBGM(BGM.STREET_AMBIENT); sendToRenderer('resume')
})

</script>


<style lang="scss" scoped>.street-stage {
	position: relative;
	width: 100vw;
	height: 100vh;
	height: 100dvh;
	overflow: hidden;
	background: #000;
}

.street-stage__canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.street-stage__move-pad {
	position: absolute;
	left: 14%;
	top: 72%;
	z-index: 12;
	width: 136rpx;
	height: 136rpx;
	border: 2rpx solid rgba(232, 210, 169, 0.42);
	border-radius: 50%;
	background: rgba(24, 18, 14, 0.28);
	box-shadow: inset 0 0 24rpx rgba(0, 0, 0, 0.35), 0 8rpx 22rpx rgba(0, 0, 0, 0.22);
	backdrop-filter: blur(4rpx);
	transform: translate(-50%, -50%);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.12s ease;
}

.street-stage__move-knob {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 58rpx;
	height: 58rpx;
	border: 2rpx solid rgba(245, 232, 208, 0.72);
	border-radius: 50%;
	background: rgba(126, 45, 39, 0.76);
	box-shadow: 0 5rpx 14rpx rgba(0, 0, 0, 0.38);
	transform: translate(-50%, -50%);
	will-change: transform;
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
	right: 160px;
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
	width: min(560px, calc(100vw - 32px));
	max-height: calc(100vh - 32px);
	max-height: calc(100dvh - 32px);
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 240, 232, 0.95) 100%);
	border-radius: 6rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.6);
	animation: scrollUnfurlV 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: top center;
}

.street-stage__poi-content {
	position: relative;
	max-height: inherit;
	padding: 36rpx 48rpx;
	box-sizing: border-box;
	overflow-y: auto;
	border-radius: inherit;
	scroll-padding-block: 16px;
}

.street-stage__poi-backdrop { position: absolute; inset: 0; }

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
	left: -6px;
	right: -6px;
	height: 14px;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
	pointer-events: none;
}

.street-stage__poi-roll--top { top: -7px; }
.street-stage__poi-roll--bot { bottom: -7px; }

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
	font-size: 26px;
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

.street-stage__poi-stamp > span { white-space: nowrap; }

.street-stage__poi-desc {
	position: relative;
	z-index: 1;
	display: block;
	margin-top: 22rpx;
	font-size: 14px;
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

.street-stage__poi-story-deep {
	display: block;
	margin-top: 10rpx;
	padding-top: 8rpx;
	border-top: 1rpx dashed rgba(139, 69, 19, 0.25);
	font-size: 20rpx;
	line-height: 1.8;
	color: rgba(74, 42, 24, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-style: italic;
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

.street-stage__poi-error {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 12px;
	padding: 8px 10px;
	border: 1px solid #aa473e55;
	border-radius: 4px;
	background: #a8403010;
	color: #8a3029;
	font-size: 13px;
	line-height: 1.5;
}
.street-stage__poi-error button {
	flex-shrink: 0;
	min-width: 84px;
	min-height: 44px;
	margin: 0;
	padding: 10px;
	border: 1px solid #aa473e88;
	border-radius: 4px;
	background: #fff8ec;
	color: #8a3029;
	font-size: 13px;
	line-height: 1.5;
}
.street-stage__poi-error button::after { border: 0; }

.street-stage__poi-distance {
	font-size: 20rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 2rpx;
}

/* 收藏 / 札记 工具 + 我的札记展示 */
.street-stage__poi-tools {
	display: flex;
	gap: 12rpx;
}

.street-stage__poi-tool {
	padding: 8rpx 18rpx;
	border: 1rpx solid rgba(139, 69, 19, 0.4);
	border-radius: 999rpx;
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: #6b3510;
	background: rgba(212, 165, 116, 0.12);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transition: transform 0.16s ease;
}

.street-stage__poi-tool:active { transform: scale(0.94); }

.street-stage__poi-tool--on {
	color: $py-paper-warm;
	background: linear-gradient(135deg, #c41e3a 0%, #8b1a2e 100%);
	border-color: rgba(255, 220, 220, 0.5);
}

.street-stage__poi-mynote {
	position: relative;
	z-index: 1;
	margin-top: 18rpx;
	padding: 16rpx 20rpx;
	background: rgba(196, 30, 58, 0.06);
	border-left: 4rpx solid $py-red;
	border-radius: 0 8rpx 8rpx 0;
}

.street-stage__poi-mynote-label {
	display: block;
	font-size: 16rpx;
	letter-spacing: 6rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.street-stage__poi-mynote-text {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	line-height: 1.8;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
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

.street-stage__poi-tool, .street-stage__poi-action, .street-stage__poi-close {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 44px;
	min-height: 44px;
	box-sizing: border-box;
	padding: 4px 12px;
	font-size: 13px;
	letter-spacing: 0;
	white-space: nowrap;
}

.street-stage__poi-footer { flex-wrap: wrap; }
.street-stage__poi-story-label, .street-stage__poi-eyebrow { font-size: 11px; letter-spacing: 1px; }
.street-stage__poi-story-text, .street-stage__poi-story-deep { font-size: 14px; line-height: 1.6; }

@keyframes scrollUnfurlV {
	0%   { transform: scaleY(0); opacity: 0.4; }
	60%  { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}

/* 右上角：时辰印章 + 迷你地图 */
.street-stage__rightcorner {
	position: absolute;
	right: 24rpx;
	top: calc(env(safe-area-inset-top) + 176px);
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

@media screen and (orientation: landscape) and (max-height: 520px) {
	.street-stage__move-pad { width: 96px; height: 96px; border-width: 1px; }
	.street-stage__move-knob { width: 42px; height: 42px; border-width: 1px; }

	.street-stage__rightcorner {
		top: 155px;
		right: 10px;
		flex-direction: row;
		align-items: flex-start;
		gap: 6px;
	}
	.street-stage__phase { gap: 2px; min-width: 60px; padding: 5px 7px 6px; border-width: 1px; }
	.street-stage__phase::before { inset: 2px; }
	.street-stage__phase-label { font-size: 15px; letter-spacing: 2px; }
	.street-stage__phase-caption { font-size: 8px; letter-spacing: 1px; white-space: nowrap; }

	.street-stage__switch { left: 10px; right: 230px; }
	.street-stage__switch-arrow { width: 40px; height: 40px; border-width: 1px; font-size: 22px; }

	.street-stage__poi-paper {
		width: min(640px, calc(100vw - 80px));
		max-width: none;
		max-height: calc(100vh - 24px);
		max-height: calc(100dvh - max(24px, env(safe-area-inset-top)) - env(safe-area-inset-bottom));
		box-sizing: border-box;
	}
	.street-stage__poi-content { padding: 20px 24px; }
	.street-stage__poi-name { font-size: 24px; letter-spacing: 3px; }
	.street-stage__poi-desc { margin-top: 12px; font-size: 14px; line-height: 1.55; }
	.street-stage__poi-story { margin-top: 12px; padding: 10px 14px; }
	.street-stage__poi-footer { margin-top: 10px; gap: 8px; flex-wrap: wrap; }
	.street-stage__poi-story-label, .street-stage__poi-eyebrow { font-size: 11px; letter-spacing: 0; }
	.street-stage__poi-story-text, .street-stage__poi-story-deep { font-size: 13px; line-height: 1.5; }
	.street-stage__poi-stamp { width: auto; min-width: 76px; height: 40px; padding: 0 10px; border-width: 2px; box-sizing: border-box; font-size: 12px; letter-spacing: 2px; }
	.street-stage__poi-tool, .street-stage__poi-action, .street-stage__poi-close { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 4px 12px; box-sizing: border-box; font-size: 13px; letter-spacing: 0; }
}

/* 旋转被系统禁止时保留完整竖屏 HUD，避免头像、牌匾、任务卷轴叠成一团。 */
@media screen and (orientation: portrait) and (max-width: 600px) {
	.street-stage__rightcorner {
		top: calc(env(safe-area-inset-top) + 244px);
		right: 8px;
		gap: 7px;
	}
	.street-stage__phase { min-width: 62px; padding: 6px 8px 7px; border-width: 1px; }
	.street-stage__phase::before { inset: 2px; }
	.street-stage__phase-label { font-size: 16px; letter-spacing: 2px; }
	.street-stage__phase-caption { font-size: 9px; letter-spacing: 1px; }

	.street-stage__switch { left: 10px; right: 10px; }
	.street-stage__switch-arrow { width: 42px; height: 42px; border-width: 1px; font-size: 23px; }
	.street-stage__move-pad { width: 94px; height: 94px; border-width: 1px; }
	.street-stage__move-knob { width: 40px; height: 40px; border-width: 1px; }

	.street-stage__poi-paper {
		width: calc(100vw - 28px);
		max-width: none;
		max-height: calc(100dvh - 32px);
	}
	.street-stage__poi-content { padding: 20px 18px; }
	.street-stage__poi-name { font-size: 23px; letter-spacing: 3px; }
	.street-stage__poi-desc { margin-top: 12px; font-size: 14px; line-height: 1.6; }
	.street-stage__poi-story { margin-top: 12px; padding: 10px 12px; }
	.street-stage__poi-footer { margin-top: 14px; gap: 8px; flex-wrap: wrap; }
	.street-stage__poi-tool, .street-stage__poi-action, .street-stage__poi-close { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 4px 12px; box-sizing: border-box; font-size: 13px; letter-spacing: 0; }
}
@media screen and (min-width: 1000px) and (min-height: 560px) {
	.street-stage__rightcorner { top: 127px; right: 32px; gap: 14px; }
	.street-stage__phase { min-width: 88px; padding: 10px 16px; }
	.street-stage__phase-label { font-size: 23px; }
	.street-stage__phase-caption { font-size: 11px; }
	.street-stage__switch { top: 35px; left: calc(50% - 188px); right: auto; width: 376px; }
	.street-stage__switch-arrow { width: 40px; height: 40px; font-size: 28px; cursor: pointer; }
	.street-stage__poi-paper { width: min(620px, 70vw); max-height: 80vh; }
	.street-stage__poi-content { padding: 32px 40px; max-height: 76vh; }
	.street-stage__poi-name { font-size: 28px; }
	.street-stage__poi-desc { font-size: 16px; line-height: 1.9; }
	.street-stage__poi-story-text, .street-stage__poi-story-deep { font-size: 15px; }
	:deep(.mini-map:not(.mini-map--collapsed) .mini-map__frame) { width: 156px; height: 156px; }
	:deep(.mini-map__label) { font-size: 12px; }
	:deep(.owl-float) { max-width: 300px; bottom: 110px; }
	:deep(.interact-stage) { bottom: 128px; }
}
</style>
