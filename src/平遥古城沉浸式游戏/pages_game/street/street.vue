<template>
	<view class="street-stage" :sceneCmd="sceneCmd" :change:sceneCmd="render.onSceneCmd">
		<!-- 3D 街景容器：renderjs 会让 THREE 自建 WebGL canvas 并挂入此 view。
		     绝不能用 <canvas type="2d">——那是 2D 上下文画布，new THREE.WebGLRenderer({canvas}) 取不到 WebGL 上下文会抛错（「一直在张望」根因之一）。 -->
		<view id="street-canvas" class="street-stage__canvas"></view>

		<!-- 上方暗角光层（暮色 / 夜灯笼） -->
		<view class="street-stage__vignette"></view>

		<!-- 左半屏触控移动反馈；renderjs 仅更新位置与摇杆帽偏移，不参与 Vue 响应式渲染。 -->
		<view id="street-move-pad" class="street-stage__move-pad" aria-hidden="true">
			<view id="street-move-knob" class="street-stage__move-knob"></view>
		</view>

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
				:map-size="54"
				:enclosure="streetWorldLayout.enclosure"
				:label="currentStreet.title"
			/>
		</view>

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
			:visible="isLoading"
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
		<view v-if="activePoi" class="street-stage__poi-overlay">
			<view class="street-stage__poi-backdrop" @tap="closePoi"></view>
			<view class="street-stage__poi-paper" @tap.stop>
				<view class="street-stage__poi-roll street-stage__poi-roll--top"></view>
				<view class="street-stage__poi-roll street-stage__poi-roll--bot"></view>
				<view class="street-stage__poi-content" @touchmove.stop="$event.stopPropagation && $event.stopPropagation()">
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
						<text v-if="poiDeepLines[activePoi.id]" class="street-stage__poi-story-deep">{{ poiDeepLines[activePoi.id] }}</text>
					</view>

					<!-- 我的札记（写过才显示）-->
					<view v-if="poiNote" class="street-stage__poi-mynote">
						<text class="street-stage__poi-mynote-label">— 我的札记 —</text>
						<text class="street-stage__poi-mynote-text">{{ poiNote }}</text>
					</view>

					<view v-if="poiProgressError" class="street-stage__poi-error" role="alert">
						<text>本次进度未保存，请重试。</text>
						<button role="button" tabindex="0" aria-label="重试保存点位进度" @tap.stop="retryPoiProgress">重试保存</button>
					</view>

					<view class="street-stage__poi-footer">
						<view class="street-stage__poi-tools">
							<view class="street-stage__poi-tool" :class="{ 'street-stage__poi-tool--on': poiFavorited }" @tap.stop="toggleFav">
								<text>{{ poiFavorited ? '★ 收藏' : '☆ 收藏' }}</text>
							</view>
							<view class="street-stage__poi-tool" @tap.stop="editNote">
								<text>{{ poiNote ? '✎ 改札记' : '✎ 札记' }}</text>
							</view>
						</view>
						<view class="street-stage__poi-action" @tap.stop="playPoiTopic">
							<text>继续讲解 ›</text>
						</view>
						<view class="street-stage__poi-action street-stage__poi-investigate" @tap.stop="handleSceneInteraction">
							<text>查看线索</text>
						</view>
					</view>

					<view class="street-stage__poi-close" @tap="closePoi">
						<text>收起</text>
					</view>
				</view>
			</view>
		</view>

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
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onLoad, onHide, onShow } from '@dcloudio/uni-app'
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

/* 逻辑层 → renderjs 的唯一通道：响应式命令对象，renderjs 用 :change 观察其变化
   （取代原先 window.dispatchEvent，后者在 APP 端逻辑层/视图层不共享 window 而失效）。
   每次都带新的 ts 以保证引用变化、触发观察器。*/
const sceneCmd = ref({ action: 'noop', ts: 0 })

/* 加载兜底 + 首帧握手状态（修复「一直在张望」永久卡死）：
   - renderViewReady：renderjs 视图层 mounted 后回发 view-ready，证明 :change 观察器已就绪，可安全(补)发 init；
   - lastSceneCmdPayload/Action：缓存最近一次 init/loadScene 载荷，供 view-ready 补发与 watchdog 重试；
   - loadWatchdog/initAttempts：加载超时兜底——任何一环静默失败都不会让用户永久卡在加载层。 */
let renderViewReady = false
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

/* 逻辑层与 renderjs 共用同一份街巷世界坐标，避免画面和迷你地图各算一套。 */
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

/* 「画面特效」总开关：关闭则 renderjs 跳过 Bloom 后处理（直接渲染），既让设置真实生效，也给低端机降负载。 */
function readEffectsEnabled() {
	return getStorage(STORAGE_KEYS.gameSettings, {}).enableEffect !== false
}

/* 统一构造下发给 renderjs 的场景载荷（init / loadScene 共用，便于一处补齐特效开关与化身皮肤等跨端字段）。 */
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
	setTimeout(() => { plaqueFlipping.value = false }, 600)
})

const renderCommandQueue = []
let renderCommandFlushing = false
let renderCommandDisposed = false
async function sendToRenderjs(type, data) {
	// 逻辑层 → renderjs：改变响应式 prop sceneCmd，触发 renderjs 的 :change 观察器。
	// APP 端逻辑层与视图层是两个 JS 上下文、不共享 window，故不能再用 window 事件。
	if (renderCommandDisposed) return
	renderCommandQueue.push({ action: type, data: data || {}, ts: Date.now() })
	if (renderCommandFlushing) return
	renderCommandFlushing = true
	try {
		while (renderCommandQueue.length && !renderCommandDisposed) {
			sceneCmd.value = renderCommandQueue.shift()
			// Reward dismissal, scene change and input unlock can share one Vue tick.
			// Commit each command separately so the final unlock cannot erase loadScene.
			await nextTick()
		}
	} finally { renderCommandFlushing = false }
}

/* renderjs → 逻辑层：renderjs 通过 this.$ownerInstance.callMethod('handleRenderMsg', {detail}) 回调。
   <script setup> 顶层函数可被 callMethod 命中（与 3d-test.vue 的 handleRenderMsg 同机制）。 */
function handleRenderMsg(msg) {
	if (!msg || !msg.detail) return
	const { type, data } = msg.detail
	if (type === 'desktop-action') { handleDesktopAction(data?.action); return }
	if (type === 'view-ready') {
		// renderjs 视图层已挂载、:change 观察器就绪：若仍在加载且有缓存命令，补发一次，
		// 杜绝首帧 init 在观察器注册前被当「初始值」丢弃而永不 bootScene。
		renderViewReady = true
		loadStage.value = '正在准备古城画面…'
		if (isLoading.value && !loadFailed.value && lastSceneCmdPayload) {
			sendToRenderjs(lastSceneCmdAction, lastSceneCmdPayload)
		}
	} else if (type === 'render-stage') {
		// renderjs 各阶段面包屑：卡住时这行会停在最后到达的阶段，直接指明失败点。
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
	sendToRenderjs(action, lastSceneCmdPayload)
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
	sendToRenderjs('pause')
	uni.switchTab({ url: '/pages/index/index' })
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

function applyPhaseToScene() {
	sendToRenderjs('applyPhase', { phase: serializePhase(currentPhase.value) })
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
	sendToRenderjs('sceneControl', { action, running: runningMode.value, portrait: portraitMode.value })
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
	sendToRenderjs('blockInput', { blocked })
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

	// 进入新 POI 是常见成就触发点（五处掌纹 / 三街连珠等）
	const sync = syncAchievementUnlocks()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		const gr = sync.grantedReward || {}
		const bonus = gr.silverKey ? ` · 银钥+${gr.silverKey}` : (gr.exp ? ` · 经验+${gr.exp}` : '')
		uni.showToast({ title: `点亮成就：${labels}${bonus}`, icon: 'none', duration: 2200 })
	}

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
	markNpcTalk(activePoi.value.npcTopic)
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
	const oldLevel = getLevelMeta(userProgress.value.exp || 0)
	const result = completeQuestAndCollectFeedback(questId)
	if (!result) {
		uni.showToast({ title: '奖励未保存，请再次交互重试', icon: 'none' })
		return
	}
	playSFX(SFX.QUEST_COMPLETE)

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
		playSFX(SFX.LEVEL_UP)
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
	playSFX(SFX.COIN)

	// 同步成就（任务领奖后是常见的成就解锁时机）
	const sync = syncAchievementUnlocks()
	if (sync.newlyUnlocked?.length) {
		const labels = sync.newlyUnlocked.map((a) => a.name).join('、')
		const gr = sync.grantedReward || {}
		const bonus = gr.silverKey ? ` · 银钥+${gr.silverKey}` : (gr.exp ? ` · 经验+${gr.exp}` : '')
		uni.showToast({ title: `点亮成就：${labels}${bonus}`, icon: 'none', duration: 2200 })
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
		playSFX(SFX.COIN)
	}
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
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
	if (!r.ok) { uni.showToast({ title: '保存失败，请重试', icon: 'none' }); return }
	journalTick.value++
	playSFX(SFX.REWARD)
	uni.showToast({ title: r.favorited ? '已收入心头好' : '已取消收藏', icon: 'none' })
}

/* 为当前 POI 写/改一条私人札记（uni.showModal 可编辑输入；≤60 字）。 */
function editNote() {
	if (!activePoi.value) return
	const poiId = activePoi.value.id
	uni.showModal({
		title: `札记 · ${activePoi.value.name}`,
		editable: true,
		placeholderText: '写一句此处的心得（≤60 字）',
		content: getJournalNote(poiId),
		success: (res) => {
			if (!res.confirm) return
			if (setJournalNote(poiId, res.content || '') === null) {
				uni.showToast({ title: '保存失败，请重试', icon: 'none' })
				return
			}
			journalTick.value++
			uni.showToast({ title: '已记入行旅册', icon: 'none' })
		}
	})
}

function handleHudAction(action) {
	if (action === 'inventory') {
		// 行囊 → 衣橱：街景内换装，确认后即时热切换到 3D 化身（无需重进街景）
		wardrobeOpen.value = true
	} else if (action === 'quest') {
		uni.switchTab({ url: '/pages/user/user' })
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
		uni.showToast({ title: '设置未能保存，请重试', icon: 'none' })
		return
	}
	if (key === 'enableEffect') sendToRenderjs('applySettings', { effectsEnabled: result.settings.enableEffect })
}

function openGuide() {
	settingsOpen.value = false
	uni.navigateTo({ url: '/pages_game/dialog/dialog' })
}

function leaveForCity() {
	settingsOpen.value = false
	returnToCity()
}

/* 街景内换装回调：把新装备的化身皮肤热下发给 renderjs，立刻重建玩家化身（不重载整场景）。 */
function onStreetWardrobeChanged() {
	userProfile.value = getStorage(STORAGE_KEYS.userProfile, {})
	sendToRenderjs('reskinPlayer', { playerSkin: getEquippedCostumeSkin(userProfile.value.roleId) })
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
		if (!stepSaveWarningShown) uni.showToast({ title: '步数暂未保存，请保留游戏，将自动重试', icon: 'none', duration: 2600 })
		stepSaveWarningShown = true
		scheduleStepFlush(STEP_RETRY_INTERVAL)
	} else {
		stepRetryAt = 0
		stepSaveWarningShown = false
	}
	if (stepResult.accepted) {
		userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	}
	if (stepResult.completed.length) {
		refreshRuntimeState()
		const done = stepResult.completed[0]
		uni.showToast({ title: `${done.quest.title} 达成 · 银钥+${done.rewards.silverKey}`, icon: 'none', duration: 2200 })
	}
}

function handlePlayerMove(detail) {
	// renderjs 按碰撞后真实移动距离计步；只有明确的有限正整数增量能进入存档。
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
	setTimeout(() => {
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

onLoad(() => {
	try {
		lockGameLandscape()
		// 身份守卫：街景是主线核心场景，必须已择身份才可进入。无 roleId 直接进来（深链 / 异常重置）会让化身退化为「客」、
		// 角色加成与支线全部失效。无身份则退回启动页重新择身份。
		const guardProfile = getStorage(STORAGE_KEYS.userProfile, {})
		if (!hasSelectedRole(guardProfile)) {
			uni.reLaunch({ url: '/pages_game/splash/splash' })
			return
		}

		markPageVisit('street', { returnPage: '/pages_game/street/street' })
		rememberReturnContext('/pages_game/street/street', '')

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
			// initScene 移到 onMounted：确保 'init' 命令在 renderjs 视图挂载后再下发，
			// 这样 :change:sceneCmd 观察器才能稳定捕获到变更（onLoad 早于挂载）。
		}
	} catch (e) {
		// onLoad 任一步抛错都不应让街景失去初始化机会：直接补一次 initScene（绝对兜底计时器在 onMounted 已武装）。
		initScene()
	}
})

onMounted(() => {
	// 绝对兜底最先武装：不依赖 initScene / onLoad 的任何分支，保证所有路径都不会永久卡在加载层。
	armEntryFailsafe()
	loadStage.value = '正在准备古城画面…'
	try {
		// 非序章玩家：在此触发场景初始化。此时 renderjs 视图已挂载，
		// sceneCmd 的变更会被 :change 观察器稳定捕获（renderjs → 逻辑层回调走 callMethod('handleRenderMsg')）。
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
	renderCommandDisposed = true
	stepSavingSuspended = true
	renderCommandQueue.length = 0
	releaseOrientationLock()
	flushSteps(true)
	stopWatchPhase()
	stopBGM()
	clearLoadWatchdog()
	clearEntryTimers()
})

onHide(() => { stepSavingSuspended = true; flushSteps(true); stopBGM(); sendToRenderjs('pause') })
onShow(() => {
	stepSavingSuspended = false
	flushSteps(true)
	gameplaySettings.value = getGameplaySettings()
	sendToRenderjs('applySettings', { effectsEnabled: gameplaySettings.value.enableEffect })
	resumeBGM(); playBGM(BGM.STREET_AMBIENT); sendToRenderjs('resume')
})

/* 显式暴露给 renderjs 的 $ownerInstance.callMethod('handleRenderMsg') 调用：
   确保 Vue3 <script setup> 下回传通道可达，不依赖编译器隐式暴露（否则 render-ready 可能永远到不了逻辑层）。 */
defineExpose({ handleRenderMsg })

/* H5(vue3) 关键修复：uni-h5 的 callMethod 实现是 `this.$vm[funcName]`，即在「页面公共实例代理」上找方法；
   而 <script setup> 里 defineExpose 的方法只进 instance.exposed、不在公共代理上，故 H5 端 callMethod 静默落空、
   renderjs→逻辑层桥彻底失效（render-ready/poi/player-move 全到不了，成功画面也无法解除加载状态）。
   这里把 handleRenderMsg 直接挂到实例代理上，让 callMethod 能命中。APP 端走 ownerId/JSBridge 路径，不受影响。 */
const __inst = getCurrentInstance()
if (__inst && __inst.proxy) {
	__inst.proxy.handleRenderMsg = handleRenderMsg
}
</script>

<script module="render" lang="renderjs">
let THREE = null
let scene = null
let camera = null
let renderer = null
let composer = null
let bloomPassRef = null
let bloomPrepared = false
let fxaaPassRef = null
let gradePassRef = null
let environmentTarget = null
let ambientLightRef = null
let directionalLightRef = null
let hemiLightRef = null
let player = null
let ground = null
let environment = []
let buildings = []
let poiBeacons = []
let decorations = []
let decorationBatchRoot = null
let lanternLights = []
let particles = null
let ambientActors = []
let animationMixers = []
let phaseTransition = null
let phaseVisualState = { environment: .36, effects: 0, warmth: .018, bloom: .16 }
let calligraphyReady = false
let calligraphyLoading = null
let playerModelGeneration = 0
let playerModelBufferCache = null
let animationId = null
let isInitialized = false
let lastTime = Date.now()
let joystickInput = { dx: 0, dy: 0 }
let movementVelocity = { x: 0, z: 0 }
let stepDistanceCarry = 0
let moveStepAccum = 0
let lastMoveEmit = 0
let wasMoving = false
let lastPlayerMotionAt = 0
let currentPhaseData = null
let currentWorldLayout = null
let ownerInstanceRef = null
let resizeHandlerRef = null
let cameraTargetVec = null
let cameraOriginVec = null
let cameraPlacementCandidate = null
let cameraPlacementBest = null
let cameraProbeHit = null
let cameraPositionVec = null
let cameraYaw = 0
let cameraYawCenter = 0
let cameraPitch = 0.38
let cameraDistance = 7.8
let walkCycle = 0
let renderPixelRatio = 1
let qualitySampleStartedAt = 0
let qualityFrameCount = 0
let qualityAdjusted = false
let assetLoadGeneration = 0
let bootGeneration = 0
let activeRenderRequest = null
let pendingSceneReady = null
let pagePaused = false
let visibilityHandlerRef = null
let contextLostHandlerRef = null
let contextRestoredHandlerRef = null
let bloomSuppressed = false
let bloomRetryAfter = 0
let bloomRecoverySamples = 0
let lanternLightSources = []
let lanternShellMaterials = []
let lastLightUpdate = 0
let sceneMaterialPool = new Map()
let worldColliders = []
let cameraOccluders = []
let windClothMeshes = []
let collisionSphere = null, collisionNearest = null, collisionNearby = []
let cameraProbe = null
let cameraProbeDirection = null
let inputBlocked = false
let sprintHeld = false
let runningEnabled = false
let portraitCamera = false
let phaseSkyBlend = null
let stoneTextureLoading = false
/* 摇杆监听清理句柄：createJoystick 绑定时赋值，dispose/reinit 时调用，避免重复进入时监听堆叠（僵尸监听泄漏）。*/
let joystickCleanup = null
/* 画面特效（Bloom 后处理）总开关：由逻辑层依 gameSettings.enableEffect 下发。关闭则直接渲染、跳过 composer，
   既尊重「画面特效」设置，也给低端机一条降负载逃生路。*/
let effectsEnabled = true
/* 化身皮肤：由逻辑层依已装备服饰下发（body/head/hat 颜色等），createPlayer 据此着色玩家化身。null 则用默认配色。*/
let playerSkinData = null
const loadedScriptUrls = Object.create(null)
const pendingScriptLoads = Object.create(null)

/* 动态资源不能使用 `/static/...`：APP 云打包后页面运行在包内 file:// WebView，
   前导斜杠会指向设备文件系统根目录。优先将资源解析到 `_www`，H5 则相对 document.baseURI。 */
function getAssetCandidates(src) {
	const clean = String(src || '').replace(/^\/+/, '')
	const candidates = []
	const add = (value) => {
		if (value && candidates.indexOf(value) === -1) candidates.push(value)
	}

	try {
		const bridge = typeof plus !== 'undefined' ? plus : window.plus
		if (bridge && bridge.io && typeof bridge.io.convertLocalFileSystemURL === 'function') {
			add(bridge.io.convertLocalFileSystemURL('_www/' + clean))
		}
	} catch (_) {}

	try { add(new URL(clean, document.baseURI || window.location.href).href) } catch (_) {}
	if (/^https?:$/.test(window.location.protocol || '')) add('/' + clean)
	add(clean)
	return candidates
}

function resolveAssetUrl(src) {
	return getAssetCandidates(src)[0] || src
}

/* 程序化纹理缓存：跨场景复用，避免每次 loadScene 重复生成上传 GPU。
   只在 dispose() 里统一释放，clearScene 不动它们（material.dispose 不级联 texture）。*/
let textureCache = {}
let skyTextureCache = {}
let brocadeTextureLoading = false
let rooflineTextureLoading = false

const PLAYER_MODEL_PATH = 'static/models/pingyao-hanfu-human.glb'
// Mesh samples across the actual clips, with clearance for interpolation and cloth motion.
const CHARACTER_COLLISION_RADIUS = { player: .79, pedestrian: .56 }
// UAL 跑步抬腿的靴尖包络约 .91 m，旧模型的 .79 m 会让鞋尖穿过墙角。
const HUMAN_COLLISION_RADIUS = { player: .96, pedestrian: .66 }
// Calibrated against actual sole travel during contact, in model metres/clip second.
const CHARACTER_GAIT_SPEED = { walk: 1.15, run: 5.1 }
// 写实人体（Quaternius UAL 动作，3D/scripts/build_pingyao_human_hero.py 导出）：
// Walk_Formal 触地期脚踝后移约 1.04 m/s，Jog 约 5.7 m/s。移动速度按真人步频配套，
// 否则 2.2 m/s 会把 1.33 s 的步态压成快进，看起来像小碎步赶路。
const HUMAN_GAIT_SPEED = { walk: 1.04, run: 5.7 }
const PLAYER_MOVE_SPEED = { walk: 2.2, run: 4.15 }
const HUMAN_MOVE_SPEED = { walk: 1.6, run: 4.4 }
// 服饰 JSON → 写实人体的换装部件（sl_* 袖型、ol_* 下摆）。
const HUMAN_SLEEVE = { narrow: 'narrow', braced: 'narrow', formal: 'formal', wide: 'wide', ceremonial: 'wide' }
const HUMAN_HEM = { traveler: 'short', escort: 'short' }
const CALLIGRAPHY_FAMILY = 'PingyaoBrush'

/* renderjs → 逻辑层：通过 $ownerInstance.callMethod 回调逻辑层的 handleRenderMsg。
   APP 端逻辑层无共享 window，不能再用 window.dispatchEvent。ownerInstanceRef 在 mounted/onSceneCmd 赋值。
   健壮化：代理未就绪时把消息入队，待拿到 ownerInstance 后 flushEmits 冲刷——终态 render-ready/render-error 绝不静默丢弃。 */
let pendingEmits = []
function emit(name, detail) {
	if (ownerInstanceRef && ownerInstanceRef.callMethod) {
		ownerInstanceRef.callMethod('handleRenderMsg', { detail: { type: name, data: detail } })
	} else {
		pendingEmits.push({ name, detail })
	}
}
function flushEmits() {
	if (!ownerInstanceRef || !ownerInstanceRef.callMethod || !pendingEmits.length) return
	const queued = pendingEmits
	pendingEmits = []
	queued.forEach((item) => ownerInstanceRef.callMethod('handleRenderMsg', { detail: { type: item.name, data: item.detail } }))
}

function sceneRequest(data) {
	return { requestId: data?.requestId, sceneId: data?.streetData?.id }
}

function emitRenderError(error, request = activeRenderRequest, contextLost = false) {
	emit('render-error', { ...request, error: error?.message || String(error), contextLost })
}

function colorHex(value, fallback) {
	const raw = typeof value === 'string' && value.startsWith('#') ? value.slice(1) : null
	if (raw && /^[0-9a-fA-F]{6}$/.test(raw)) return parseInt('0x' + raw)
	return fallback
}

export default {
	mounted() {
		// 保存逻辑层代理并冲刷早到的消息；随后回发 view-ready，告知逻辑层 :change 观察器已就绪、可安全(补)发 init。
		ownerInstanceRef = this.$ownerInstance
		flushEmits()
		emit('view-ready')
	},
	beforeUnmount() {
		this.dispose()
	},
	methods: {
		configureColorManagement() {
			// r146 defaults to legacy input colors; hexadecimal art colors are sRGB.
			if (THREE.ColorManagement && 'legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false
		},
		makeSceneColor(value) {
			const color = new THREE.Color(value)
			return THREE.ColorManagement?.legacyMode === false ? color : color.convertSRGBToLinear()
		},
		setColorTexture(texture) {
			if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace
			else texture.encoding = THREE.sRGBEncoding
			return texture
		},
		prepareSurfaceColorTexture(texture) {
			this.setColorTexture(texture)
			// r146 disables mipmaps for WebGL1 EXT_sRGB textures. Decode static
			// surface images once so distant masonry and paving can use mipmaps.
			// Keep animated sky canvases on their existing live sRGB path.
			if (renderer?.capabilities?.isWebGL2 === false && texture.image) {
				if (texture.userData.linearSurfaceImage !== texture.image) {
					texture.image = this.decodeSurfaceColorImage(texture.image)
					texture.userData.linearSurfaceImage = texture.image
				}
				texture.encoding = THREE.LinearEncoding
				texture.format = THREE.RGBAFormat
				texture.generateMipmaps = true
				texture.minFilter = THREE.LinearMipmapLinearFilter
			}
			return texture
		},
		decodeSurfaceColorImage(image) {
			let canvas = null, context = null, pixels
			if (image.data) pixels = { data: image.data.slice(), width: image.width, height: image.height }
			else {
				canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
				context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
				pixels = context.getImageData(0, 0, image.width, image.height)
			}
			const lookup = new Uint8Array(256)
			for (let value = 0; value < 256; value++) {
				const channel = value / 255
				lookup[value] = Math.round(255 * (channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4)))
			}
			// Alpha is coverage, not an sRGB color channel. The r146 ImageUtils
			// conversion also changes alpha, so use an explicit RGB-only pass.
			for (let index = 0; index < pixels.data.length; index += 4) {
				for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] = lookup[pixels.data[index + channel]]
			}
			if (context) { context.putImageData(pixels, 0, 0); return canvas }
			return pixels
		},
		readBinaryAsset(src) {
			const candidates = getAssetCandidates(src)
			const bridge = typeof plus !== 'undefined' ? plus : (typeof window !== 'undefined' ? window.plus : null)
			if (bridge?.io?.resolveLocalFileSystemURL) {
				return new Promise((resolve, reject) => {
					const tryCandidate = (index, lastError) => {
						if (index >= candidates.length) { reject(lastError || new Error(src + ' 读取失败')); return }
						bridge.io.resolveLocalFileSystemURL(candidates[index], (entry) => {
							entry.file((file) => {
								const reader = new FileReader()
								reader.onload = () => resolve(reader.result)
								reader.onerror = () => tryCandidate(index + 1, reader.error)
								reader.readAsArrayBuffer(file)
							}, (error) => tryCandidate(index + 1, error))
						}, (error) => tryCandidate(index + 1, error))
					}
					tryCandidate(0)
				})
			}
			return (async () => {
				let lastError = null
				for (const url of candidates) {
					try {
						const response = await fetch(url)
						if (!response.ok) throw new Error('HTTP ' + response.status)
						return await response.arrayBuffer()
					} catch (error) { lastError = error }
				}
				throw lastError || new Error(src + ' 读取失败')
			})()
		},
		loadCalligraphyFont() {
			if (calligraphyReady) return Promise.resolve(true)
			if (calligraphyLoading) return calligraphyLoading
			calligraphyLoading = (async () => {
				if (typeof FontFace === 'undefined' || !document.fonts) return false
				const face = new FontFace(CALLIGRAPHY_FAMILY, `url(${resolveAssetUrl('static/fonts/MaShanZheng-Pingyao.woff2')})`, { style: 'normal', weight: '400' })
				await face.load()
				document.fonts.add(face)
				await document.fonts.ready
				calligraphyReady = true
				return true
			})().catch(() => false).finally(() => { calligraphyLoading = null })
			return calligraphyLoading
		},
		createEnvironmentMap() {
			if (!renderer || !scene || !THREE.RoomEnvironment) return
			try {
				if (environmentTarget) environmentTarget.dispose()
				const pmrem = new THREE.PMREMGenerator(renderer)
				pmrem.compileEquirectangularShader()
				environmentTarget = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04)
				scene.environment = environmentTarget.texture
				pmrem.dispose()
			} catch (_) { scene.environment = null }
		},
		applyEnvironmentIntensity(root, intensity) {
			root?.traverse((item) => {
				const materials = Array.isArray(item.material) ? item.material : [item.material]
				materials.filter(Boolean).forEach((material) => {
					if ('envMapIntensity' in material) {
						material.envMapIntensity = intensity
						phaseTransition?.environmentMaterials.add(material)
					}
				})
			})
		},
		// World-space UVs keep brick and tile dimensions independent of facade size.
		mapSurfaceUV(geometry, scaleU, scaleV) {
			const pos = geometry.attributes.position
			const normal = geometry.attributes.normal
			const uv = geometry.attributes.uv
			if (!uv) return geometry
			for (let i = 0; i < pos.count; i++) {
				const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i))
				const u = nx > 0.5 ? pos.getZ(i) : pos.getX(i)
				const v = ny > 0.5 ? pos.getZ(i) : pos.getY(i)
				uv.setXY(i, u / scaleU, v / scaleV)
			}
			uv.needsUpdate = true
			return geometry
		},
		// Scene-owned batches: phase-sensitive windows stay separate from opaque walls.
		batchStaticRoots(roots) {
			const removedGeometries = new Set(), removedMaterials = new Set()
			roots.filter((root) => root.isGroup).forEach((root) => {
				root.updateMatrixWorld(true)
				const inverse = root.matrixWorld.clone().invert()
				const buckets = new Map()
				root.traverse((mesh) => {
					const m = mesh.material
					if (!mesh.isMesh || !m || Array.isArray(m) || m.transparent || mesh.isInstancedMesh) return
					const materialKey = JSON.stringify([m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity,
						m.map?.uuid, m.emissiveMap?.uuid, m.bumpMap?.uuid, m.bumpScale, m.roughnessMap?.uuid, m.roughness, m.metalness, m.side, m.flatShading, m.toneMapped,
						Boolean(mesh.userData.isWindowGlow), Boolean(mesh.userData.isBuildingLantern), Boolean(mesh.userData.isLanternShell)])
					if (!sceneMaterialPool.has(materialKey)) sceneMaterialPool.set(materialKey, m)
					const key = materialKey + ':' + mesh.castShadow + ':' + mesh.receiveShadow
					if (!buckets.has(key)) buckets.set(key, { material: sceneMaterialPool.get(materialKey), meshes: [] })
					buckets.get(key).meshes.push(mesh)
				})
				buckets.forEach(({ material, meshes }) => {
					const positions = [], normals = [], uvs = []
					meshes.forEach((mesh) => {
						const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
						g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
						positions.push(...g.attributes.position.array)
						normals.push(...g.attributes.normal.array)
						if (g.attributes.uv) uvs.push(...g.attributes.uv.array)
						else uvs.push(...new Float32Array(g.attributes.position.count * 2))
						g.dispose()
						removedGeometries.add(mesh.geometry)
						removedMaterials.add(mesh.material)
						mesh.removeFromParent()
					})
					const geometry = new THREE.BufferGeometry()
					geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
					geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
					geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
					geometry.computeBoundingSphere()
					const batch = new THREE.Mesh(geometry, material)
					batch.castShadow = meshes[0].castShadow
					batch.receiveShadow = meshes[0].receiveShadow
					batch.userData = { ...meshes[0].userData }
					root.add(batch)
				})
			})
			const liveMaterials = new Set(), liveGeometries = new Set()
			scene.traverse((mesh) => {
				if (mesh.geometry) liveGeometries.add(mesh.geometry)
				;(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean).forEach((m) => liveMaterials.add(m))
			})
			removedGeometries.forEach((g) => { if (!liveGeometries.has(g)) g.dispose() })
			removedMaterials.forEach((m) => { if (!liveMaterials.has(m)) m.dispose() })
		},
		getRenderResolutionLimit(width, height) {
			const compact = Math.min(width, height) <= 520
			const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
			// Bound render-target area as well as pixel density. High-DPI phones can
			// recover finer detail without allocating their full native-resolution buffers.
			const pixelBudget = compact ? 1600000 : 3200000
			return Math.min(deviceRatio, compact ? 1.75 : 1.6, Math.sqrt(pixelBudget / Math.max(1, width * height)))
		},
		setRenderResolution(width, height, pixelRatio = renderPixelRatio) {
			if (!renderer) return
			const limit = this.getRenderResolutionLimit(width, height)
			renderPixelRatio = Math.max(Math.min(.85, limit), Math.min(limit, pixelRatio))
			renderer.setPixelRatio(renderPixelRatio)
			renderer.setSize(width, height)
			if (composer) {
				if (composer.setPixelRatio) composer.setPixelRatio(renderPixelRatio)
				composer.setSize(width, height)
			}
			this.syncPostprocessingSize()
		},
		syncPostprocessingSize() {
			if (!renderer) return
			const size = renderer.getSize(new THREE.Vector2())
			const bufferWidth = Math.max(1, Math.floor(size.x * renderPixelRatio))
			const bufferHeight = Math.max(1, Math.floor(size.y * renderPixelRatio))
			if (fxaaPassRef) fxaaPassRef.material.uniforms.resolution.value.set(1 / bufferWidth, 1 / bufferHeight)
			const compact = Math.min(size.x, size.y) <= 520
			if (bloomPassRef) bloomPassRef.setSize(Math.max(1, Math.floor(bufferWidth * (compact ? 0.5 : 0.75))), Math.max(1, Math.floor(bufferHeight * (compact ? 0.5 : 0.75))))
		},
		pauseRendering() {
			this.flushPendingMovement()
			if (animationId) cancelAnimationFrame(animationId)
			animationId = null
			joystickInput = { dx: 0, dy: 0 }
			movementVelocity.x = 0
			movementVelocity.z = 0
			if (player?.userData) { player.userData.motionTurning = false; player.userData.turnRate = 0 }
		},
		disposeEffects() {
			for (const pass of [bloomPassRef, fxaaPassRef, gradePassRef]) if (pass?.dispose) pass.dispose()
			if (composer?.dispose) composer.dispose()
			else if (composer) {
				composer.renderTarget1?.dispose()
				composer.renderTarget2?.dispose()
			}
			composer = null; bloomPassRef = null; fxaaPassRef = null; gradePassRef = null; bloomPrepared = false
		},
		setEffectsEnabled(enabled) {
			effectsEnabled = enabled
			if (!renderer || !scene || !camera) return
			if (composer) {
				try {
					if (!enabled && bloomPassRef) {
						composer.removePass(bloomPassRef); bloomPassRef.dispose(); bloomPassRef = null; bloomPrepared = false
					} else if (enabled && !bloomPassRef) {
						const size = renderer.getSize(new THREE.Vector2())
						bloomPassRef = new THREE.UnrealBloomPass(size, phaseVisualState.bloom, .28, .78)
						composer.insertPass(bloomPassRef, 1); bloomPrepared = false
						bloomSuppressed = false; bloomRecoverySamples = 0; bloomRetryAfter = 0
						this.syncPostprocessingSize()
					}
					this.syncPhaseEffects()
				} catch (error) {
					this.disposeEffects()
					console.warn('[street] 灯光特效暂不可用', error)
				}
				return
			}
			const size = renderer.getSize(new THREE.Vector2()), width = size.x, height = size.y
			const compact = Math.min(width, height) <= 520 || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || ''))
			let target = null
			try {
				target = renderer.capabilities.isWebGL2
					? new THREE.WebGLRenderTarget(width, height, { samples: compact ? 0 : 4, type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType })
					: undefined
				composer = new THREE.EffectComposer(renderer, target)
				composer.addPass(new THREE.RenderPass(scene, camera))
				if (composer.setPixelRatio) composer.setPixelRatio(renderPixelRatio)
				if (enabled) {
					bloomPassRef = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), phaseVisualState.bloom, .28, .78)
					composer.addPass(bloomPassRef)
				}
				// Compact WebGL2 targets have no MSAA; they need the same edge pass
				// as WebGL1. Canvas antialiasing does not apply to offscreen targets.
				if ((!renderer.capabilities.isWebGL2 || compact) && THREE.FXAAShader) {
					fxaaPassRef = new THREE.ShaderPass(THREE.FXAAShader)
					fxaaPassRef.material.uniforms.resolution.value.set(1 / (width * renderPixelRatio), 1 / (height * renderPixelRatio))
					composer.addPass(fxaaPassRef)
				}
				gradePassRef = new THREE.ShaderPass({
					uniforms: { tDiffuse: { value: null }, warmth: { value: phaseVisualState.warmth }, effectAmount: { value: phaseVisualState.effects } },
					vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
					// r146 RenderPass tone-maps into a linear target. Encode only at screen output.
					fragmentShader: 'uniform sampler2D tDiffuse;uniform float warmth;uniform float effectAmount;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(tDiffuse,vUv);float v=1.-smoothstep(.22,.78,distance(vUv,vec2(.5)));c.rgb*=mix(1.,mix(.9,1.,v),effectAmount);c.r+=warmth*effectAmount;c.b-=warmth*.42*effectAmount;c.rgb+=(hash(vUv*900.)-.5)*.003*effectAmount;gl_FragColor=c;\n#include <encodings_fragment>\n}'
				})
				gradePassRef.material.toneMapped = false
				composer.addPass(gradePassRef)
				this.syncPhaseEffects()
				bloomSuppressed = false; bloomRecoverySamples = 0; bloomRetryAfter = 0
				this.syncPostprocessingSize()
			} catch (error) {
				if (!composer && target) target.dispose()
				this.disposeEffects()
				console.warn('[street] 灯光特效暂不可用', error)
			}
		},
		flushPendingMovement() {
			if (!player || moveStepAccum <= 0) return
			const steps = moveStepAccum
			moveStepAccum = 0
			emit('player-move', { x: player.position.x, z: player.position.z, steps, flush: true })
		},
		updateBloomBudget(fps, now) {
			if (!composer || !effectsEnabled) return
			if (fps < 30) {
				bloomRecoverySamples = 0
					// The base color/AA pipeline remains active; suppress only the costly glow.
				if (currentPhaseData?.lanternsLit || phaseVisualState.effects > 0) {
					bloomSuppressed = true; bloomRetryAfter = now + 20000
				}
			} else if (bloomSuppressed) {
				bloomRecoverySamples = fps > 55 ? bloomRecoverySamples + 1 : 0
				if (bloomRecoverySamples >= 3 && now >= bloomRetryAfter) {
					bloomSuppressed = false; bloomRecoverySamples = 0
				}
			}
		},
		/* ===== 程序化纹理工具（CanvasTexture，零外部图片） ===== */
		getTexture(key, factory) {
			if (textureCache[key]) return textureCache[key]
			const tex = factory()
			if (tex) {
				if (tex.encoding === THREE.sRGBEncoding) this.prepareSurfaceColorTexture(tex)
				textureCache[key] = tex
			}
			return tex
		},
		makeCanvas(size) {
			const canvas = document.createElement('canvas')
			canvas.width = size
			canvas.height = size
			return canvas
		},
		makeClothWeaveTexture() {
			return this.getTexture('hanfu_weave', () => {
				const canvas = this.makeCanvas(256), ctx = canvas.getContext('2d')
				ctx.fillStyle = '#858585'; ctx.fillRect(0, 0, 256, 256)
				for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
					ctx.fillStyle = (x + y) % 8 ? '#a4a4a4' : '#676767'
					ctx.fillRect(x, y, 3, 1); ctx.fillRect(x, y + 1, 1, 3)
				}
				const texture = new THREE.CanvasTexture(canvas)
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 5)
				return texture
			})
		},
		prepareCharacterDeformation(root) {
			const blinkMeshes = [], clothMeshes = []
			root.traverse((mesh) => {
				if (!mesh.isSkinnedMesh) return
				// 旧角色的眼睑/衣摆顶点坐标不适用于 UAL 骨架；新汉服由蒙皮随动作变形。
				if (root.userData.rigType === 'human') return
				const blinking = /^(Eyes|Irises|Pupils|Eye_glints|Eyelids|Lashes)/.test(mesh.name)
				const cloth = /^(Skirt_Robe|Hem_Trim|Sash_tails)/.test(mesh.name)
				if (!blinking && !cloth) return
				const base = mesh.geometry.attributes.position, target = base.clone()
				for (let i = 0; i < base.count; i++) {
					if (blinking) {
						target.setY(i, 1.64818 + (base.getY(i) - 1.64818) * 0.035)
						// The lids close over the eye instead of leaving a bright white slit.
						if (!/^(Eyelids|Lashes)/.test(mesh.name)) target.setZ(i, base.getZ(i) - .006)
						else {
							// Preserve the rim's thickness while its centreline closes. Flattening
							// every vertex makes eyelashes disappear into a subpixel line.
							const side = Math.sign(base.getX(i)), center = side * .0365
							const u = THREE.MathUtils.clamp((base.getX(i) - center) / .039 + .5, 0, 1)
							const arch = Math.pow(Math.sin(u * Math.PI), .78)
							const baseline = 1.64818 + side * (base.getX(i) - center) * .0378
							const lash = /^Lashes/.test(mesh.name), upper = lash || base.getY(i) >= baseline
							const openY = baseline + (upper ? 1 : -1) * .00675 * arch + (lash ? .000162 : 0)
							target.setY(i, baseline - .0007 * arch + (base.getY(i) - openY) * .75)
							target.setZ(i, base.getZ(i) + .0008)
						}
					}
					else {
						const hem = Math.max(0, (0.99 - base.getY(i)) / 0.68)
						target.setZ(i, base.getZ(i) + Math.sin(base.getX(i) * 12) * 0.028 * hem)
					}
				}
				mesh.geometry.morphAttributes.position = [target]
				mesh.updateMorphTargets()
				;(blinking ? blinkMeshes : clothMeshes).push(mesh)
			})
			root.userData.blinkMeshes = blinkMeshes; root.userData.clothMeshes = clothMeshes
			const groundSamples = []
			root.traverse(mesh => {
				if (!mesh.isSkinnedMesh || !['Soles', 'ShoeSole'].includes(mesh.material?.name)) return
				const positions = mesh.geometry.attributes.position
				// Only the two soles (550 vertices), not the complete character mesh.
				// Sparse sampling misses the heel during foot roll and sinks it into the paving.
				for (let i=0; i<positions.count; i++) groundSamples.push({ mesh, index:i })
			})
			root.userData.groundSamples = groundSamples
			root.userData.groundSkeletons = [...new Set(groundSamples.map(sample=>sample.mesh.skeleton))]
			root.userData.groundPoint = new THREE.Vector3()
			this.prepareCharacterFootPlant(root)
			const texture = this.getTexture('contact_shadow', () => {
				const canvas = this.makeCanvas(128), ctx = canvas.getContext('2d')
				const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
				gradient.addColorStop(0, 'rgba(0,0,0,.5)'); gradient.addColorStop(.5, 'rgba(0,0,0,.22)'); gradient.addColorStop(1, 'rgba(0,0,0,0)')
				ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
				return new THREE.CanvasTexture(canvas)
			})
			const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.75), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }))
			shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.006; root.add(shadow)
			root.userData.contactShadow = shadow
		},
		prepareCharacterFootPlant(root) {
			const human = root.userData.rigType === 'human'
			if (!human && !root.getObjectByName('Detail_Soles')) return
			root.updateMatrixWorld(true)
			const feet = []
			for (const side of ['l', 'r']) {
				const upper = root.getObjectByName((human ? 'thigh_' : 'upperleg') + side), lower = root.getObjectByName((human ? 'calf_' : 'lowerleg') + side), foot = root.getObjectByName((human ? 'foot_' : 'foot') + side)
				if (!upper || !lower || !foot) continue
				const sole = [], inverse = foot.matrixWorld.clone().invert()
				for (const sample of root.userData.groundSamples) {
					const mesh = sample.mesh, indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight
					// This solver is only for the detailed model's rigidly weighted shoes.
					if (mesh.skeleton.bones[indices.getX(sample.index)] !== foot || weights.getX(sample.index) < .999) continue
					const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, sample.index)
					;(mesh.applyBoneTransform || mesh.boneTransform).call(mesh, sample.index, point)
					sole.push(point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse))
				}
				if (!sole.length) continue
				feet.push({ side, upper, lower, foot, sole, weight: 0, anchor: new THREE.Vector3(), rotation: new THREE.Quaternion(),
					offset: new THREE.Vector3(), rotationOffset: new THREE.Quaternion(),
					target: new THREE.Vector3(), desiredRotation: new THREE.Quaternion(),
					bendPole: new THREE.Vector3(),
					pose: [upper.quaternion.clone(), lower.quaternion.clone(), foot.quaternion.clone()], saved: false, wasContact: false })
			}
			const pelvis = root.getObjectByName(human ? 'pelvis' : 'hips')
			root.userData.footPlant = { feet, pelvis, pelvisPose: pelvis?.position.clone(), pelvisSaved: false, pelvisDrop: 0,
				previous: root.position.clone(), yaw: root.rotation.y,
				v: Array.from({ length: 12 }, () => new THREE.Vector3()), q: Array.from({ length: 6 }, () => new THREE.Quaternion()) }
		},
		restoreCharacterFootPose(root) {
			// AnimationMixer caches its last output; restore it before every update so an
			// unchanged track cannot accidentally accumulate last frame's IK rotations.
			for (const leg of root.userData.footPlant?.feet || []) if (leg.saved) {
				leg.upper.quaternion.copy(leg.pose[0]); leg.lower.quaternion.copy(leg.pose[1]); leg.foot.quaternion.copy(leg.pose[2])
				leg.saved = false
			}
			const rig = root.userData.footPlant
			if (rig?.pelvisSaved) { rig.pelvis.position.copy(rig.pelvisPose); rig.pelvisSaved = false }
		},
		releaseCharacterFootPlant(root) {
			const rig = root.userData.footPlant
			if (!rig) return
			for (const leg of rig.feet) { leg.wasContact = false; leg.weight = 0; leg.offset.set(0, 0, 0); leg.rotationOffset.identity() }
			rig.pelvisDrop = 0
		},
		updateCharacterFootPlant(root, speed, deltaTime) {
			const data = root.userData, rig = data.footPlant
			if (!rig || deltaTime <= 0) return
			// Every bone read below goes through getWorld*(), which refreshes its own ancestor
			// chain, so the whole 100-node hierarchy is not traversed again here.
			const traveled = Math.hypot(root.position.x - rig.previous.x, root.position.z - rig.previous.z)
			const yawChange = Math.abs(Math.atan2(Math.sin(root.rotation.y - rig.yaw), Math.cos(root.rotation.y - rig.yaw)))
			const turning = yawChange / deltaTime > 1.1
			const valid = speed > .08 && traveled > .00001 && traveled < .3 * root.scale.x && !turning && !data.gestureTime
			rig.previous.copy(root.position); rig.yaw = root.rotation.y
			if (!valid && rig.pelvisDrop < .000001 && rig.feet.every(leg => leg.weight < .001)) { this.releaseCharacterFootPlant(root); return }
			const run = data.actions?.run?.getEffectiveWeight() || 0
			const walk = data.actions?.walk || data.action
			const phase = data.locomotionPhase ?? (walk ? walk.time / walk.getClip().duration : 0)
			const [hip, knee, ankle, target, axis, pole, wantedKnee, from, to, point, scale, rawTarget] = rig.v
			const [rawRotation, desiredRotation, worldRotation, parentRotation, rotationDelta, requestedRotation] = rig.q
			let requiredDrop = 0
			if (rig.pelvis) { rig.pelvisPose.copy(rig.pelvis.position); rig.pelvisSaved = true }
			for (const leg of rig.feet) {
				leg.pose[0].copy(leg.upper.quaternion); leg.pose[1].copy(leg.lower.quaternion); leg.pose[2].copy(leg.foot.quaternion); leg.saved = true
				leg.upper.getWorldPosition(hip); leg.lower.getWorldPosition(knee); leg.foot.getWorldPosition(ankle)
				axis.subVectors(ankle, hip).normalize()
				leg.bendPole.subVectors(knee, hip).addScaledVector(axis, -leg.bendPole.dot(axis))
				// The retargeted clip crosses straight by a fraction of a degree. That
				// numerical bend must not become a deeply backwards knee after planting.
				if (leg.bendPole.lengthSq() < .0001 * root.scale.x * root.scale.x) leg.bendPole.set(0, 0, 1).applyQuaternion(root.quaternion)
				leg.foot.getWorldQuaternion(rawRotation); leg.foot.getWorldScale(scale)
				let floor = Infinity
				for (const vertex of leg.sole) floor = Math.min(floor, point.copy(vertex).multiply(scale).applyQuaternion(rawRotation).y + ankle.y)
				const localPhase = (phase + (leg.side === 'r' ? .5 : 0)) % 1
				const human = data.rigType === 'human'
				// UAL 的跑步落脚位于周期起点；旧 KayKit 的接触窗晚约 0.15 周期。
				const start = human ? .01 : THREE.MathUtils.lerp(.045, .155, run)
				const end = human ? THREE.MathUtils.lerp(.43, .15, run) : THREE.MathUtils.lerp(.535, .275, run)
				const contact = valid && floor < .098 && localPhase >= start && localPhase < end && (data.airborneLift || 0) < .012
				if (contact && !leg.wasContact) { leg.anchor.copy(ankle); leg.rotation.copy(rawRotation) }
				leg.wasContact = contact
				const envelope = THREE.MathUtils.smoothstep(localPhase, start, start + .035)
				const offset = Math.hypot(ankle.x - leg.anchor.x, ankle.z - leg.anchor.z) / root.scale.x
				const limit = THREE.MathUtils.lerp(.18, .09, run)
				const release = 1 - THREE.MathUtils.smoothstep(offset, limit * .65, limit)
				if (contact) {
					leg.weight = THREE.MathUtils.clamp(envelope * release, Math.max(0, leg.weight - deltaTime * 8), Math.min(1, leg.weight + deltaTime * 24))
					desiredRotation.copy(rawRotation).slerp(leg.rotation, leg.weight)
					target.copy(ankle).lerp(leg.anchor, leg.weight)
					const correction = Math.hypot(target.x - ankle.x, target.z - ankle.z)
					if (correction > limit * root.scale.x) {
						const fraction = limit * root.scale.x / correction
						target.x = ankle.x + (target.x - ankle.x) * fraction; target.z = ankle.z + (target.z - ankle.z) * fraction
					}
				} else {
					// Carry the last correction into the swing/stop and release it smoothly.
					// Returning immediately to the clip on liftoff creates a visible foot snap.
					const decay = Math.exp(-26 * deltaTime)
					leg.weight *= decay; leg.offset.multiplyScalar(decay)
					leg.rotationOffset.slerp(rotationDelta.identity(), 1 - decay)
					target.copy(ankle).add(leg.offset)
					desiredRotation.copy(leg.rotationOffset).multiply(rawRotation)
				}
				if (leg.weight < .001) {
					leg.weight = 0; leg.offset.set(0, 0, 0); leg.rotationOffset.identity()
					target.copy(ankle); desiredRotation.copy(rawRotation)
				}
				let bottom = Infinity
				for (const vertex of leg.sole) bottom = Math.min(bottom, point.copy(vertex).multiply(scale).applyQuaternion(desiredRotation).y)
				// Preserve foot roll on release, while keeping every sole vertex above the paving.
				target.y = floor - bottom
				const a = hip.distanceTo(knee), b = knee.distanceTo(ankle), maximum = a + b - .00001
				rawTarget.copy(target)
				requestedRotation.copy(desiredRotation)
				// Fit the fixed-length leg and the existing collider. Reduce the correction,
				// never scale a bone or move the collision body to reach an impossible anchor.
				let fraction = 1, lowerFraction = 0, upperFraction = 1, safe = false
				for (let attempt = 0; attempt < 10; attempt++) {
					target.copy(ankle).lerp(rawTarget, fraction)
					desiredRotation.copy(rawRotation).slerp(requestedRotation, fraction)
					bottom = Infinity
					for (const vertex of leg.sole) bottom = Math.min(bottom, point.copy(vertex).multiply(scale).applyQuaternion(desiredRotation).y)
					target.y = floor - bottom
					let radius = 0
					for (const vertex of leg.sole) {
						point.copy(vertex).multiply(scale).applyQuaternion(desiredRotation).add(target)
						radius = Math.max(radius, Math.hypot(point.x - root.position.x, point.z - root.position.z))
					}
					const horizontal = Math.hypot(target.x - hip.x, target.z - hip.z)
					const drop = hip.y - target.y - Math.sqrt(Math.max(0, maximum*maximum - horizontal*horizontal))
					safe = horizontal < maximum && drop < .035 * root.scale.y && radius < (data.collisionRadius || .79 * root.scale.x) - .03 * root.scale.x
					if (safe) { lowerFraction = fraction; if (attempt === 0 || attempt === 9) break }
					else upperFraction = fraction
					// Last pass returns the known safe point, without a half-weight discontinuity.
					fraction = attempt === 8 ? lowerFraction : (lowerFraction + upperFraction) * .5
				}
				leg.weight *= fraction
				if (!safe) { leg.weight = 0; target.copy(ankle); desiredRotation.copy(rawRotation) }
				leg.offset.subVectors(target, ankle)
				leg.rotationOffset.copy(rawRotation).invert().premultiply(desiredRotation)
				leg.target.copy(target); leg.desiredRotation.copy(desiredRotation)
				const horizontal = Math.hypot(target.x - hip.x, target.z - hip.z)
				requiredDrop = Math.max(requiredDrop, hip.y - target.y - Math.sqrt(Math.max(0, maximum*maximum - horizontal*horizontal)))
			}
			// A small pelvis adjustment gives a planted, almost straight leg room to bend.
			// Both ankles are solved afterwards, so lowering the hips cannot sink the other shoe.
			rig.pelvisDrop = Math.min(.035 * root.scale.y, Math.max(requiredDrop, rig.pelvisDrop * Math.exp(-18 * deltaTime)))
			if (rig.pelvis && rig.pelvisDrop > .000001) {
				rig.pelvis.getWorldPosition(point); point.y -= rig.pelvisDrop
				rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(point))
			}
			for (const leg of rig.feet) {
				if (!leg.weight && rig.pelvisDrop < .000001) continue
				leg.upper.getWorldPosition(hip); leg.lower.getWorldPosition(knee); leg.foot.getWorldPosition(ankle)
				target.copy(leg.target); desiredRotation.copy(leg.desiredRotation)
				const a = hip.distanceTo(knee), b = knee.distanceTo(ankle)
				axis.subVectors(target, hip); const distance = axis.length(); axis.multiplyScalar(1 / Math.max(.00001, distance))
				// Preserve the animated bend plane. Projecting the old knee directly onto
				// the new ankle axis can flip the knee when a nearly straight leg plants.
				pole.copy(leg.bendPole).addScaledVector(axis, -pole.dot(axis))
				if (pole.lengthSq() < .000001) pole.set(0, 0, 1).applyQuaternion(root.quaternion).addScaledVector(axis, -pole.dot(axis))
				pole.normalize()
				const along = (a*a - b*b + distance*distance) / (2 * distance)
				wantedKnee.copy(hip).addScaledVector(axis, along).addScaledVector(pole, Math.sqrt(Math.max(0, a*a - along*along)))
				from.subVectors(knee, hip).normalize(); to.subVectors(wantedKnee, hip).normalize()
				rotationDelta.setFromUnitVectors(from, to)
				leg.upper.getWorldQuaternion(worldRotation); leg.upper.parent.getWorldQuaternion(parentRotation).invert()
				leg.upper.quaternion.copy(parentRotation.multiply(rotationDelta.multiply(worldRotation)))
				leg.upper.updateMatrixWorld(true)
				leg.lower.getWorldPosition(knee); leg.foot.getWorldPosition(ankle)
				from.subVectors(ankle, knee).normalize(); to.subVectors(target, knee).normalize()
				rotationDelta.setFromUnitVectors(from, to)
				leg.lower.getWorldQuaternion(worldRotation); leg.lower.parent.getWorldQuaternion(parentRotation).invert()
				leg.lower.quaternion.copy(parentRotation.multiply(rotationDelta.multiply(worldRotation)))
				leg.lower.updateMatrixWorld(true)
				leg.foot.parent.getWorldQuaternion(parentRotation).invert()
				leg.foot.quaternion.copy(parentRotation.multiply(desiredRotation)); leg.foot.updateMatrixWorld(true)
			}
		},
		/* 生成式晋商织锦贴图按需加载：只有高阶服饰会触发，普通玩家首屏不增加下载负担。 */
		getBrocadeTexture() {
			if (textureCache.pingyao_brocade) return textureCache.pingyao_brocade
			if (brocadeTextureLoading || !THREE) return null
			brocadeTextureLoading = true
			const generation = assetLoadGeneration
			new THREE.TextureLoader().load(resolveAssetUrl('static/img/3d/pingyao-brocade-pattern.jpg'), (texture) => {
				if (generation !== assetLoadGeneration || !renderer) {
					texture.dispose()
					return
				}
				brocadeTextureLoading = false
				texture.wrapS = THREE.RepeatWrapping
				texture.wrapT = THREE.RepeatWrapping
				texture.repeat.set(2.25, 2.25)
				this.prepareSurfaceColorTexture(texture)
				texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
				texture.needsUpdate = true
				textureCache.pingyao_brocade = texture
				if (player) {
					player.traverse((item) => {
						const materials = Array.isArray(item.material) ? item.material : [item.material]
						materials.filter(Boolean).forEach((material) => {
							if (!material.userData?.useBrocade) return
							material.map = texture
							material.needsUpdate = true
						})
					})
				}
			}, undefined, () => { if (generation === assetLoadGeneration) brocadeTextureLoading = false })
			return null
		},
		/* 青砖墙：横向砖块 + 砖缝 + 轻微做旧斑驳 */
		makeBrickTexture() { return this.getCourtyardTexture('brick') },

		makeRoofTexture() { return this.getCourtyardTexture('roof') },

		makeWoodTexture() { return this.getCourtyardTexture('wood') },
		getCourtyardTexture(kind, channel = 'albedo') {
			const key = 'courtyard_' + kind + '_' + channel
			return this.getTexture(key, () => {
				const canvas = this.makeCanvas(16), ctx = canvas.getContext('2d')
				ctx.fillStyle = channel === 'height' ? '#808080' : ({ brick: '#777970', wood: '#50382a', roof: '#484b4a', cloth: '#eeeeea' }[kind])
				ctx.fillRect(0, 0, 16, 16)
				const texture = new THREE.CanvasTexture(canvas)
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping
				texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1
				if (channel === 'albedo') this.setColorTexture(texture)
				new THREE.ImageLoader().load(resolveAssetUrl('static/textures/courtyard/' + kind + '-' + channel + '.jpg'), image => {
					if (textureCache[key] !== texture) return
					// r146 WebGL2 uses immutable storage: retire the 16px fallback allocation.
					texture.dispose()
					texture.image = image
					if (channel === 'albedo') this.prepareSurfaceColorTexture(texture)
					texture.needsUpdate = true
				})
				return texture
			})
		},

		makeLatticeTexture(frameHex) {
			return this.getTexture('lattice_' + frameHex, () => {
				const size = 256
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				// 窗纸暖底（夜里靠 emissive 透光）
				ctx.fillStyle = '#f3e3bd'
				ctx.fillRect(0, 0, size, size)
				ctx.strokeStyle = frameHex
				ctx.lineWidth = 10
				ctx.strokeRect(4, 4, size - 8, size - 8)
				ctx.lineWidth = 5
				const lines = 5
				const step = size / lines
				for (let i = 1; i < lines; i++) {
					ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke()
					ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke()
				}
				const tex = new THREE.CanvasTexture(canvas)
				this.setColorTexture(tex)
				tex.needsUpdate = true
				return tex
			})
		},
		/* 青石板路：不规则石块 + 石缝 + 轻微做旧 */
		makeStoneGroundTexture() {
			return this.getTexture('stone_ground', () => {
				const size = 512
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = '#3a382f'
				ctx.fillRect(0, 0, size, size)
				const rows = 7
				const tileH = size / rows
				for (let r = 0; r < rows; r++) {
					const y = r * tileH
					const offset = (r % 2) * (size / 10)
					const cols = 5
					const tileW = size / cols
					for (let c = -1; c <= cols; c++) {
						const x = c * tileW + offset
						const g = 120 + Math.floor(Math.random() * 36)
						ctx.fillStyle = `rgb(${g - 8},${g - 4},${g - 14})`
						ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6)
						// 做旧：斑块
						if (Math.random() < 0.5) {
							ctx.fillStyle = 'rgba(40, 40, 36, 0.12)'
							ctx.beginPath()
							ctx.arc(x + tileW * (0.3 + Math.random() * 0.4), y + tileH * (0.3 + Math.random() * 0.4), 4 + Math.random() * 10, 0, Math.PI * 2)
							ctx.fill()
						}
					}
				}
				const tex = new THREE.CanvasTexture(canvas)
				tex.wrapS = THREE.RepeatWrapping
				tex.wrapT = THREE.RepeatWrapping
				tex.repeat.set(5, 16)
				this.setColorTexture(tex)
				if (renderer && renderer.capabilities) tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
				tex.needsUpdate = true
				return tex
			})
		},
		/* 夯土地面：街道两侧压暗，避免整屏都铺同一块青石纹理。 */
		makeEarthTexture() {
			return this.getTexture('packed_earth', () => {
				const size = 512
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = '#665d4f'
				ctx.fillRect(0, 0, size, size)
				for (let i = 0; i < 420; i++) {
					const shade = 72 + Math.floor(Math.random() * 42)
					ctx.fillStyle = `rgba(${shade},${shade - 5},${shade - 12},${0.05 + Math.random() * 0.1})`
					ctx.beginPath()
					ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 5, 0, Math.PI * 2)
					ctx.fill()
				}
				const tex = new THREE.CanvasTexture(canvas)
				tex.wrapS = THREE.RepeatWrapping
				tex.wrapT = THREE.RepeatWrapping
				tex.repeat.set(7, 10)
				this.setColorTexture(tex)
				tex.needsUpdate = true
				return tex
			})
		},
		makeLanternGlowTexture() {
			return this.getTexture('lantern_glow', () => {
				const canvas = this.makeCanvas(128), ctx = canvas.getContext('2d')
				const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
				gradient.addColorStop(0, 'rgba(245,240,232,.95)')
				gradient.addColorStop(0.22, 'rgba(212,165,116,.62)')
				gradient.addColorStop(1, 'rgba(196,30,58,0)')
				ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
				const texture = new THREE.CanvasTexture(canvas); this.setColorTexture(texture); return texture
			})
		},
		makeInkLayerTexture(kind) {
			return this.getTexture('ink_layer_' + kind, () => {
				const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256
				const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height)
				ctx.fillStyle = kind === 'mountain' ? 'rgba(79,78,73,.72)' : 'rgba(48,48,46,.76)'
				ctx.beginPath(); ctx.moveTo(0, 256)
				for (let x = 0; x <= 1024; x += 48) {
					const y = kind === 'mountain' ? 110 + Math.sin(x * 0.021) * 34 + Math.sin(x * 0.008) * 28 : 162 - (x % 192 < 96 ? 24 : 0)
					ctx.lineTo(x, y)
				}
				ctx.lineTo(1024, 256); ctx.closePath(); ctx.fill()
				const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; return texture
			})
		},
		makeCloudTexture() {
			return this.getTexture('ink_cloud', () => {
				const canvas = this.makeCanvas(128), ctx = canvas.getContext('2d')
				const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 58)
				gradient.addColorStop(0, 'rgba(245,240,232,.45)'); gradient.addColorStop(0.55, 'rgba(245,240,232,.18)'); gradient.addColorStop(1, 'rgba(245,240,232,0)')
				ctx.save(); ctx.scale(1, 0.42); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 300); ctx.restore()
				return new THREE.CanvasTexture(canvas)
			})
		},
		makeSignTexture(label, style) {
			const safeLabel = String(label || '古城人家').slice(0, 8)
			return this.getTexture('sign_' + style + '_' + safeLabel, () => {
				const canvas = document.createElement('canvas')
				canvas.width = 512
				canvas.height = 192
				const ctx = canvas.getContext('2d')
				const red = style === 'temple' || style === 'gate' ? '#7e2527' : '#48281b'
				ctx.fillStyle = red
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				ctx.strokeStyle = '#c9a45f'
				ctx.lineWidth = 12
				ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
				ctx.strokeStyle = 'rgba(255,232,180,0.42)'
				ctx.lineWidth = 3
				ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50)
				ctx.fillStyle = '#f2ddb0'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				const brush = calligraphyReady ? CALLIGRAPHY_FAMILY + ', ' : ''
				ctx.font = safeLabel.length > 5 ? `400 58px ${brush}KaiTi, STKaiti, serif` : `400 72px ${brush}KaiTi, STKaiti, serif`
				ctx.fillText(safeLabel, canvas.width / 2, canvas.height / 2 + 3)
				const tex = new THREE.CanvasTexture(canvas)
				this.setColorTexture(tex)
				tex.needsUpdate = true
				return tex
			})
		},
		makePoiLabelTexture(label) {
			const safeLabel = String(label || '古城点位').slice(0, 8)
			return this.getTexture('poi_label_' + safeLabel, () => {
				const canvas = document.createElement('canvas')
				canvas.width = 512
				canvas.height = 128
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = 'rgba(24,16,11,0.9)'
				ctx.fillRect(8, 12, 496, 104)
				ctx.strokeStyle = 'rgba(224,190,118,0.9)'
				ctx.lineWidth = 5
				ctx.strokeRect(13, 17, 486, 94)
				ctx.fillStyle = '#f3dfb2'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.font = `400 52px ${calligraphyReady ? CALLIGRAPHY_FAMILY + ', ' : ''}KaiTi, STKaiti, serif`
				ctx.fillText(safeLabel, 256, 65)
				const tex = new THREE.CanvasTexture(canvas)
				this.setColorTexture(tex)
				tex.needsUpdate = true
				return tex
			})
		},
		/* 天空渐变（顶→底两色），夜晚追加星点 */
		makeSkyTexture(topHex, bottomHex, withStars) {
			const key = 'sky_' + topHex + '_' + bottomHex + (withStars ? '_star' : '')
			if (skyTextureCache[key]) return skyTextureCache[key]
			/* 2:1 画布匹配横屏，避免小星点被背景纹理横向拉成白色椭圆。 */
			const w = 1024
			const h = 512
			const canvas = document.createElement('canvas')
			canvas.width = w
			canvas.height = h
			const ctx = canvas.getContext('2d')
			const grad = ctx.createLinearGradient(0, 0, 0, h)
			grad.addColorStop(0, topHex)
			grad.addColorStop(1, bottomHex)
			ctx.fillStyle = grad
			ctx.fillRect(0, 0, w, h)
			// Soft cloud banks live in the cached sky texture: no extra mobile draw calls.
			for (let bank = 0; bank < 3; bank++) {
				for (let puff = 0; puff < 9; puff++) {
					const x = bank * 370 + puff * 29 - 100, y = h * (.18 + bank * .12) + Math.sin(puff * .9) * 8
					ctx.save(); ctx.translate(x, y); ctx.scale(1, .2)
					const cloud = ctx.createRadialGradient(0, 0, 2, 0, 0, 83)
					cloud.addColorStop(0, withStars ? 'rgba(168,186,196,.035)' : 'rgba(255,247,227,.13)'); cloud.addColorStop(1, 'rgba(255,247,227,0)')
					ctx.fillStyle = cloud; ctx.fillRect(-84, -84, 168, 168); ctx.restore()
				}
			}
			if (withStars) {
				ctx.fillStyle = 'rgba(238,232,205,.8)'; ctx.beginPath(); ctx.arc(w * .7, h * .22, 9, 0, Math.PI * 2); ctx.fill()
				// 仅在上半部撒星，避免压到地平线
				for (let i = 0; i < 150; i++) {
					const sx = Math.random() * w
					const sy = Math.random() * h * 0.62
					const r = Math.random() < 0.92 ? 0.35 + Math.random() * 0.55 : 0.9 + Math.random() * 0.55
					ctx.fillStyle = `rgba(228, 224, 202, ${0.28 + Math.random() * 0.42})`
					ctx.beginPath()
					ctx.arc(sx, sy, r, 0, Math.PI * 2)
					ctx.fill()
				}
			}
			const tex = new THREE.CanvasTexture(canvas)
			this.setColorTexture(tex)
			tex.needsUpdate = true
			skyTextureCache[key] = tex
			return tex
		},
		/* 颜色明暗扰动：传入 #rrggbb 与系数，返回 rgb() 字符串 */
		tintHex(hex, factor) {
			const raw = hex.replace('#', '')
			const r = Math.min(255, Math.round(parseInt(raw.slice(0, 2), 16) * factor))
			const g = Math.min(255, Math.round(parseInt(raw.slice(2, 4), 16) * factor))
			const b = Math.min(255, Math.round(parseInt(raw.slice(4, 6), 16) * factor))
			return `rgb(${r},${g},${b})`
		},
		/* 设置/刷新天空：scene.background 用渐变纹理，夜晚带星空 */
		refreshSky(phase, fallbackTopHex, fallbackBottomHex) {
			if (!scene) return
			const topHex = (phase && phase.sky && phase.sky.top) ? phase.sky.top : (fallbackTopHex || '#d7c0a2')
			const botHex = (phase && phase.sky && phase.sky.bottom) ? phase.sky.bottom : (fallbackBottomHex || '#f6ead7')
			const isNight = phase && phase.key === 'night'
			scene.background = this.makeSkyTexture(topHex, botHex, isNight)
		},
		/* 逻辑层 → renderjs 命令入口（:change:sceneCmd 观察器）。
		   observer 内 this 不可靠，必须用传入的 instance 调用方法。
		   跨端：APP 端方法挂在第 4 参 instance 上；H5(vue3) 端观察器是组件 Proxy 的方法、挂在 this 上而 instance 不带方法。
		   取「确实带 bootScene 的那个」作为方法上下文（ctx），两端通用。 */
		onSceneCmd(newVal, oldVal, ownerInstance, instance) {
			if (ownerInstance) { ownerInstanceRef = ownerInstance; flushEmits() }
			if (!newVal || !newVal.action) return
			const action = newVal.action
			const data = newVal.data || {}
			const ctx = (this && typeof this.bootScene === 'function') ? this : instance
			try {
				if (action === 'init') {
					if (!isInitialized) {
						isInitialized = true
						ctx.bootScene(data)
					}
				} else if (action === 'reinit') {
					// watchdog 重试：先彻底拆除旧场景（dispose 会移除残留 canvas 并把 isInitialized 复位），再重新引导。
					ctx.dispose()
					isInitialized = true
					ctx.bootScene(data)
				} else if (action === 'loadScene') {
					activeRenderRequest = sceneRequest(data)
					ctx.loadScene(data)
					if (!animationId) ctx.startAnimation()
				} else if (action === 'highlightPoi') {
					ctx.highlightQuestPoi(data.poiId)
				} else if (action === 'applyPhase') {
					ctx.applyPhase(data.phase)
				} else if (action === 'applySettings') {
					ctx.setEffectsEnabled(data.effectsEnabled !== false)
				} else if (action === 'reskinPlayer') {
					ctx.reskinPlayer(data.playerSkin)
				} else if (action === 'blockInput') {
					inputBlocked = Boolean(data.blocked)
					sprintHeld = false
					joystickInput = { dx: 0, dy: 0 }
					movementVelocity = { x: 0, z: 0 }
				} else if (action === 'sceneControl') {
					ctx.applySceneControl(data)
				} else if (action === 'pause') {
					pagePaused = true
					sprintHeld = false
					ctx.pauseRendering()
				} else if (action === 'resume') {
					pagePaused = false
					if (renderer && !document.hidden) ctx.startAnimation()
				}
			} catch (err) {
				// 观察器内任何同步抛错都转成终态信号，避免逻辑层永远收不到 ready/error 而卡「张望」。
				if (ctx?.pauseRendering) ctx.pauseRendering()
				emitRenderError(err, data.requestId ? sceneRequest(data) : activeRenderRequest)
			}
		},
		loadScript(src) {
			if (loadedScriptUrls[src]) return Promise.resolve()
			if (pendingScriptLoads[src]) return pendingScriptLoads[src]

			const candidates = getAssetCandidates(src)
			pendingScriptLoads[src] = (async () => {
				let lastError = null
				for (let i = 0; i < candidates.length; i++) {
					const url = candidates[i]
					try {
						await new Promise((resolve, reject) => {
							const script = document.createElement('script')
							let settled = false
							const done = (fn, arg) => {
								if (settled) return
								settled = true
								clearTimeout(timer)
								fn(arg)
							}
							const timer = setTimeout(() => {
								script.remove()
								done(reject, new Error(url + ' 加载超时'))
							}, 6000)
							script.src = url
							script.onload = () => done(resolve)
							script.onerror = () => {
								script.remove()
								done(reject, new Error(url + ' 加载失败'))
							}
							document.head.appendChild(script)
						})
						loadedScriptUrls[src] = true
						return
					} catch (error) {
						lastError = error
					}
				}
				throw lastError || new Error(src + ' 加载失败')
			})()

			return pendingScriptLoads[src].finally(() => { delete pendingScriptLoads[src] })
		},
		async bootScene(data) {
			const generation = ++bootGeneration
			activeRenderRequest = sceneRequest(data)
			try {
				// 快速路径：reinit / 二次进入时 window.THREE 及后处理类已就位，跳过 7 个 <script> 的重复注入，加速恢复。
				if (window.THREE && window.THREE.EffectComposer && window.THREE.RenderPass && window.THREE.UnrealBloomPass) {
					THREE = window.THREE
					await this.loadCalligraphyFont()
					if (generation !== bootGeneration) return
					emit('render-progress', 70)
					emit('render-stage', '正在布置院落与灯火…')
					this.initScene(data)
					return
				}
				// 依赖顺序至关重要：EffectComposer.js 定义 THREE.Pass，必须先于 RenderPass/ShaderPass/UnrealBloomPass 加载——
				// 后三者在脚本求值期就 `class X extends THREE.Pass`，若 Pass 未定义会同步抛 TypeError，
				// 致 THREE.RenderPass/ShaderPass 为 undefined，随后 new THREE.EffectComposer() 内部 new THREE.ShaderPass 再崩。
				// 旧顺序把 ShaderPass/RenderPass 排在 EffectComposer 之前，是 3D 必崩的第二处根因。
				const libs = [
					'static/libs/three.min.js',
					'static/libs/CopyShader.js',
					'static/libs/LuminosityHighPassShader.js',
					'static/libs/EffectComposer.js',
					'static/libs/RenderPass.js',
					'static/libs/ShaderPass.js',
					'static/libs/UnrealBloomPass.js'
				]
				for (let i = 0; i < libs.length; i++) {
					emit('render-stage', '正在准备古城画面…')
					await this.loadScript(libs[i])
					if (generation !== bootGeneration) return
					emit('render-progress', Math.round(((i + 1) / libs.length) * 70))
				}
				THREE = window.THREE
				if (!THREE) {
					isInitialized = false
					emitRenderError('Three.js 未能加载', sceneRequest(data))
					return
				}
				// 校验后处理类是否就位：任一缺失即发终态，避免到 new EffectComposer 才静默崩。
				if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) {
					isInitialized = false
					emitRenderError('后处理库未就位（加载顺序/缺文件）', sceneRequest(data))
					return
				}
				/* 小型可选插件均为离线文件；任一失败只关闭对应画质能力。 */
				for (const plugin of ['static/libs/RoomEnvironment.js', 'static/libs/Sky.js', 'static/libs/FXAAShader.js']) {
					try { await this.loadScript(plugin) } catch (_) {}
					if (generation !== bootGeneration) return
				}
				await this.loadCalligraphyFont()
				if (generation !== bootGeneration) return
				emit('render-stage', '正在布置院落与灯火…')
				this.initScene(data)
			} catch (err) {
				if (generation !== bootGeneration) return
				isInitialized = false
				emitRenderError(err, sceneRequest(data))
			}
		},

		initScene(data) {
			if (!THREE) {
				emitRenderError('Three.js 未准备完成', sceneRequest(data))
				return
			}
			this.configureColorManagement()

			// 画面特效开关 + 化身皮肤：由逻辑层随载荷下发，先存模块态供 createPlayer / 后处理分支读取。
			effectsEnabled = data.effectsEnabled !== false
			playerSkinData = data.playerSkin || null

			// 渲染目标用普通容器 <view id="street-canvas">，让 THREE 自建 WebGL canvas 再挂入；
			// 绝不能把 <canvas type="2d"> 喂给 new WebGLRenderer({canvas})——取不到 WebGL 上下文会同步抛错（「一直在张望」根因之一）。
			const container = document.getElementById('street-canvas')
			if (!container) {
				emitRenderError('未找到街景容器', sceneRequest(data))
				return
			}

			// 幂等防护：极端慢加载（7 库累计 10~14s）下，10s watchdog 的 reinit 可能与「仍在进行的首个 boot」竞态，
			// 致两次进到 initScene。若已存在 renderer，先彻底拆除旧场景（dispose 会取消旧 rAF、摘除旧 canvas、释放纹理并复位状态），
			// 再重建——保证任何路径下都只有一个 WebGL 上下文 / 一块 canvas / 一个渲染循环，杜绝叠加重影与上下文泄漏。
			if (renderer) this.dispose()
			activeRenderRequest = sceneRequest(data)

			const width = container.clientWidth || window.innerWidth
			const height = container.clientHeight || window.innerHeight
			scene = new THREE.Scene()
			currentWorldLayout = data.worldLayout || null

			const phase = data.phase || null
			const fallbackSky = colorHex(data.streetData.sceneTone?.skyTop, 0xD7C0A2)
			const skyColor = phase ? colorHex(phase.sky?.top, fallbackSky) : fallbackSky
			const fogColor = phase ? colorHex(phase.fog?.color, skyColor) : skyColor
			const fogDensity = phase?.fog?.density ?? data.streetData.ambience?.fogDensity ?? 0.02

			/* 渐变天空（夜晚带星空），替代单色背景 */
			currentPhaseData = phase
			this.refreshSky(phase, data.streetData.sceneTone?.skyTop, data.streetData.sceneTone?.skyBottom)
			scene.fog = new THREE.FogExp2(fogColor, fogDensity)

			const wideLandscape = width / Math.max(1, height) > 1.85
			camera = new THREE.PerspectiveCamera(wideLandscape ? 55 : 58, width / height, 0.1, 100)
			camera.position.set(0, 4.4, 12)
			cameraYawCenter = Number(data.streetData.recommendedCamera?.azimuth || 0)
			cameraYaw = cameraYawCenter
			cameraPitch = 0.38
			cameraDistance = Math.max(5.6, Math.min(6.6, Number(data.streetData.recommendedCamera?.distance || 10) * 0.58))

			const compactDevice = Math.min(width, height) <= 520 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '')
			renderPixelRatio = Math.min(this.getRenderResolutionLimit(width, height), compactDevice ? 1.25 : 1.6)
			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
			renderer.setSize(width, height)
			renderer.setPixelRatio(renderPixelRatio)
			renderer.shadowMap.enabled = !compactDevice
			renderer.shadowMap.type = THREE.PCFSoftShadowMap
			if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace
			else renderer.outputEncoding = THREE.sRGBEncoding
			renderer.toneMapping = THREE.ACESFilmicToneMapping
			renderer.toneMappingExposure = phase?.exposure ?? 1.05
			renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
			container.appendChild(renderer.domElement)
			bloomSuppressed = false
			bloomRetryAfter = 0; bloomRecoverySamples = 0
			contextLostHandlerRef = (event) => {
				event.preventDefault()
				this.pauseRendering()
				emitRenderError('图形上下文已中断，请重试街景', activeRenderRequest, true)
			}
			contextRestoredHandlerRef = () => {
				pendingSceneReady = activeRenderRequest
				if (!pagePaused && !document.hidden) this.startAnimation()
			}
			renderer.domElement.addEventListener('webglcontextlost', contextLostHandlerRef)
			renderer.domElement.addEventListener('webglcontextrestored', contextRestoredHandlerRef)
			this.createEnvironmentMap()
			visibilityHandlerRef = () => {
				if (document.hidden) this.pauseRendering()
				else if (!pagePaused && renderer) this.startAnimation()
			}
			document.addEventListener('visibilitychange', visibilityHandlerRef)

			this.setEffectsEnabled(effectsEnabled)

			/* 横屏/尺寸变化时同步相机与渲染尺寸 */
			if (!resizeHandlerRef) {
				resizeHandlerRef = () => {
					const w = container.clientWidth || window.innerWidth
					const h = container.clientHeight || window.innerHeight
					if (camera) { camera.aspect = w / h; camera.fov = w / h > 1.85 ? 55 : 58; camera.updateProjectionMatrix() }
					this.setRenderResolution(w, h)
					qualitySampleStartedAt = performance.now() + 1000; qualityFrameCount = 0
				}
				window.addEventListener('resize', resizeHandlerRef)
			}

			currentPhaseData = phase
			qualitySampleStartedAt = performance.now()
			qualityFrameCount = 0
			qualityAdjusted = false
			movementVelocity.x = 0
			movementVelocity.z = 0
			stepDistanceCarry = 0
			this.loadScene(data)
			emit('render-stage', '点亮街景…')
			this.createJoystick()
			this.startAnimation()
			isInitialized = true
		},
		loadScene(data) {
			if (!scene || !renderer) throw new Error('街景尚未初始化')
			pendingSceneReady = null
			this.clearScene()

			const phase = data.phase || currentPhaseData
			currentWorldLayout = data.worldLayout || currentWorldLayout
			cameraYawCenter = Number(data.streetData.recommendedCamera?.azimuth || 0)
			cameraYaw = cameraYawCenter
			cameraPitch = 0.38
			cameraDistance = Math.max(5.6, Math.min(6.6, Number(data.streetData.recommendedCamera?.distance || 10) * 0.58))

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
			directionalLightRef.shadow.mapSize.set(1024, 1024)
			directionalLightRef.shadow.camera.left = -24
			directionalLightRef.shadow.camera.right = 24
			directionalLightRef.shadow.camera.top = 28
			directionalLightRef.shadow.camera.bottom = -26
			directionalLightRef.shadow.camera.near = 0.5
			directionalLightRef.shadow.camera.far = 70
			directionalLightRef.shadow.bias = -0.00035
			directionalLightRef.shadow.normalBias = 0.025
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

			this.createStreetEnvironment(data.streetData, currentWorldLayout)
			this.createBuildings(data.streetData, currentWorldLayout)
			this.createPoiBeacons(data.pois, data.streetData, currentWorldLayout)
			this.createDecorations(data.streetData, currentWorldLayout)
			this.buildStreetColliders()
			this.createParticles(phase)
			this.createPlayer()
			this.tryLoadPlayerModel(playerSkinData?.modelPath || PLAYER_MODEL_PATH)
			this.createAmbientLife(data.streetData)
			decorationBatchRoot = new THREE.Group()
			decorations.forEach((group) => decorationBatchRoot.add(group))
			scene.add(decorationBatchRoot)
			const facadeRows = [-1, 1].map((side) => {
				const row = new THREE.Group()
				buildings.filter((building) => Math.sign(building.position.x) === side).forEach((building) => row.add(building))
				scene.add(row)
				return row
			})
			buildings = facadeRows
			this.batchStaticRoots([...buildings, decorationBatchRoot, ...environment])
			windClothMeshes = []
			decorationBatchRoot.traverse(mesh => { if (mesh.userData?.isWindCloth && mesh.geometry?.attributes?.position) windClothMeshes.push(mesh) })
			const shellMaterials = new Set()
			decorationBatchRoot.traverse(mesh => { if (mesh.userData.isLanternShell && mesh.material) shellMaterials.add(mesh.material) })
			lanternShellMaterials = [...shellMaterials]
			scene.updateMatrixWorld(true)
			lanternLightSources = lanternLights.map((light) => light.getWorldPosition(new THREE.Vector3()))
			lanternLights.forEach((light) => light.removeFromParent())
			const lightBudget = Math.min(window.innerWidth, window.innerHeight) <= 520 ? 2 : 4
			lanternLights = lanternLights.slice(0, lightBudget)
			lanternLights.forEach((light, index) => { light.position.copy(lanternLightSources[index]); scene.add(light) })
			lastLightUpdate = 0
			this.highlightQuestPoi(data.questTargetPoiId)

			if (phase) this.applyPhase(phase)
			this.restoreSceneControls(data.controls)
			// Do not count synchronous scene construction and initial shader uploads as play FPS.
			qualitySampleStartedAt = performance.now() + 1500; qualityFrameCount = 0
			emit('render-progress', 100)
			pendingSceneReady = sceneRequest(data)
		},
		restoreSceneControls(controls = {}) {
			inputBlocked = Boolean(controls.blocked)
			runningEnabled = Boolean(controls.running)
			portraitCamera = Boolean(controls.portrait)
			joystickInput = { dx: 0, dy: 0 }
			if (portraitCamera) this.applySceneControl({ action: 'portrait', portrait: true })
		},
		applySceneControl(data) {
			if (data.action === 'run') runningEnabled = Boolean(data.running)
			if (data.action === 'portrait') {
				portraitCamera = Boolean(data.portrait)
				cameraDistance = portraitCamera ? 3.2 : 6.2
				cameraPitch = portraitCamera ? 0.12 : 0.38
				if (portraitCamera && player) cameraYaw = player.rotation.y
			}
			if (data.action === 'zoom-in') cameraDistance = Math.max(2.6, cameraDistance - 0.8)
			if (data.action === 'zoom-out') cameraDistance = Math.min(10, cameraDistance + 0.8)
			if (data.action === 'reset') { portraitCamera = false; cameraYaw = cameraYawCenter; cameraPitch = 0.38; cameraDistance = 6.2 }
			if (data.action === 'greet') this.playPlayerWave()
		},
		buildStreetColliders() {
			worldColliders = []; cameraOccluders = []
			scene.updateMatrixWorld(true)
			// Bounds come from the rendered solid geometry, including stairs and stalls.
			for (const root of [...buildings, ...decorations, ...environment.filter(root => root.userData.isSolidEnvironment)]) root.traverse(mesh => {
				if (!mesh.isMesh || mesh.isInstancedMesh || !mesh.geometry || mesh.material?.transparent || mesh.userData?.isWindCloth || mesh.userData?.noCollision) return
				if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
				const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)
				if (box.max.y > .18 && box.min.y < 8) cameraOccluders.push(box.clone().expandByScalar(.2))
				if (box.max.y > .18 && box.min.y < 2.15) {
					box.min.y = -1; box.max.y = 3
					worldColliders.push(box)
				}
			})
			cameraProbe = new THREE.Ray(); cameraProbeDirection = new THREE.Vector3()
		},
		resolveStreetMotion(position, dx, dz, radius = .38) {
			const bounds = currentWorldLayout?.roadBounds || { xMin: -4.15, xMax: 4.15, zMin: -23, zMax: 15 }
			const isPedestrian = actor => actor.userData.kind === 'rigged-pedestrian' || actor.userData.kind === 'pedestrian'
			const movingCharacter = player?.position === position || ambientActors.some(actor => actor.position === position && isPedestrian(actor))
			const neighbors = movingCharacter ? [player, ...ambientActors].filter(actor => actor && actor.position !== position && (actor === player || isPedestrian(actor))) : []
			const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * .4)))
			if (!collisionSphere) { collisionSphere = new THREE.Sphere(); collisionNearest = new THREE.Vector3() }
			const sphere = collisionSphere, nearest = collisionNearest
			sphere.center.set(position.x, 1, position.z); sphere.radius = radius
			// Broad phase: only colliders that can touch the swept segment (plus the depenetration margin).
			// Distances are strictly smaller inside this window, so the narrow phase below is unchanged.
			const margin = radius * 4 + Math.hypot(dx, dz) + .1
			const minX = Math.min(position.x, position.x + dx) - margin, maxX = Math.max(position.x, position.x + dx) + margin
			const minZ = Math.min(position.z, position.z + dz) - margin, maxZ = Math.max(position.z, position.z + dz) + margin
			collisionNearby.length = 0
			for (const box of worldColliders) if (box.max.x >= minX && box.min.x <= maxX && box.max.z >= minZ && box.min.z <= maxZ) collisionNearby.push(box)
			const colliders = collisionNearby
			const hasClearance = () => {
				for (const box of colliders) {
					box.clampPoint(sphere.center, nearest)
					if (Math.hypot(sphere.center.x-nearest.x, sphere.center.z-nearest.z) < radius-.0001) return false
				}
				return neighbors.every(actor => Math.hypot(sphere.center.x-actor.position.x, sphere.center.z-actor.position.z) >= radius+(actor.userData.collisionRadius || .43)-.0001)
			}
			for (let step = 0; step < steps; step++) {
				const startX = sphere.center.x, startZ = sphere.center.z, validStart = hasClearance()
				sphere.center.x += dx / steps; sphere.center.z += dz / steps
				for (let pass = 0; pass < 3; pass++) {
					for (const box of colliders) {
						if (!sphere.intersectsBox(box)) continue
						box.clampPoint(sphere.center, nearest)
						const x = sphere.center.x - nearest.x, z = sphere.center.z - nearest.z
						const distance = Math.hypot(x, z)
						if (distance > 0.00001) {
							const depth = radius - distance + .001
							sphere.center.x += x / distance * depth; sphere.center.z += z / distance * depth
						} else {
							const faces = [sphere.center.x - box.min.x, box.max.x - sphere.center.x, sphere.center.z - box.min.z, box.max.z - sphere.center.z]
							const face = faces.indexOf(Math.min(...faces))
							if (face === 0) sphere.center.x = box.min.x - radius - .001
							if (face === 1) sphere.center.x = box.max.x + radius + .001
							if (face === 2) sphere.center.z = box.min.z - radius - .001
							if (face === 3) sphere.center.z = box.max.z + radius + .001
						}
					}
					for (const actor of neighbors) {
						const x = sphere.center.x - actor.position.x, z = sphere.center.z - actor.position.z
						const distance = Math.hypot(x, z), separation = radius + (actor.userData.collisionRadius || .43)
						if (distance < separation) {
							if (distance > .0001) { sphere.center.x += x / distance * (separation - distance); sphere.center.z += z / distance * (separation - distance) }
							else sphere.center.x += separation
						}
					}
					sphere.center.x = THREE.MathUtils.clamp(sphere.center.x, bounds.xMin, bounds.xMax)
					sphere.center.z = THREE.MathUtils.clamp(sphere.center.z, bounds.zMin, bounds.zMax)
				}
				// A neighbor's push cannot undo wall separation. If there is no room
				// for both constraints, keep the last clear position for this substep.
				// At a gatepost/edge corner, alternating projections can push backward
				// and oscillate despite a clear start. Only accept motion that advances
				// along the requested direction; true wall sliding still advances.
				const advance = (sphere.center.x - startX) * dx + (sphere.center.z - startZ) * dz
				if (validStart && (!hasClearance() || advance <= 1e-10)) { sphere.center.x = startX; sphere.center.z = startZ }
			}
			position.x = sphere.center.x; position.z = sphere.center.z
		},
		updateFollowCamera(deltaTime) {
			if (!cameraTargetVec) cameraTargetVec = new THREE.Vector3()
			if (!cameraPositionVec) cameraPositionVec = new THREE.Vector3()
			if (!cameraOriginVec) cameraOriginVec = new THREE.Vector3()
			const horizontalDistance = Math.cos(cameraPitch) * cameraDistance
			const idleOrbit = 0
			const viewYaw = cameraYaw + idleOrbit
			cameraPositionVec.set(
				player.position.x + Math.sin(viewYaw) * horizontalDistance,
				1.2 + Math.sin(cameraPitch) * cameraDistance,
				player.position.z + Math.cos(viewYaw) * horizontalDistance
			)
			const cameraBounds = currentWorldLayout?.cameraBounds
			if (cameraBounds) {
				cameraPositionVec.x = Math.max(cameraBounds.xMin, Math.min(cameraBounds.xMax, cameraPositionVec.x))
				cameraPositionVec.z = Math.max(cameraBounds.zMin, Math.min(cameraBounds.zMax, cameraPositionVec.z))
			}
			const boomOrigin = cameraOriginVec.set(player.position.x, 1.35, player.position.z)
			this.fitFollowCamera(boomOrigin, cameraPositionVec)
			camera.position.lerp(cameraPositionVec, 1 - Math.exp(-8.5 * deltaTime))
			this.resolveCameraBoom(boomOrigin, camera.position)
			cameraTargetVec.set(player.position.x, player.position.y + 1.24, player.position.z)
			const speedLength = Math.hypot(movementVelocity.x, movementVelocity.z)
			const narrow = camera.aspect < .8 && !portraitCamera
			const framing = THREE.MathUtils.smoothstep(camera.position.distanceTo(boomOrigin), 2.4, 4.4)
			const ahead = .6 * framing * (narrow ? .25 : 1)
			if (speedLength > 0.08) { cameraTargetVec.x += movementVelocity.x / speedLength * ahead; cameraTargetVec.z += movementVelocity.z / speedLength * ahead }
			const offset = portraitCamera || narrow ? 0 : .65 * framing
			cameraTargetVec.x -= Math.sin(viewYaw) * offset
			cameraTargetVec.z -= Math.cos(viewYaw) * offset
			cameraTargetVec.y = portraitCamera ? 1.35 : THREE.MathUtils.lerp(1.02, narrow ? 1.1 : 1.5, framing)
			camera.lookAt(cameraTargetVec)
			const baseFov = narrow ? 70 : camera.aspect > 1.85 ? 55 : 58
			const wantedFov = baseFov + Math.min(3, speedLength * 0.72)
			if (Math.abs(camera.fov - wantedFov) > 0.03) { camera.fov += (wantedFov - camera.fov) * (1 - Math.exp(-4 * deltaTime)); camera.updateProjectionMatrix() }
		},
		fitFollowCamera(origin, destination) {
			this.resolveCameraBoom(origin, destination)
			if (portraitCamera) return
			const minimum = camera.aspect < .8 ? 3.6 : 2.8
			let distance = destination.distanceTo(origin)
			if (distance >= minimum) return
			if (!cameraPlacementCandidate) cameraPlacementCandidate = new THREE.Vector3()
			if (!cameraPlacementBest) cameraPlacementBest = new THREE.Vector3()
			cameraPlacementBest.copy(destination)
			const bounds = currentWorldLayout?.cameraBounds
			// Search nearby views when a wall leaves too little room for a whole body.
			// Every candidate respects the same shell and camera occluders as the main boom.
			for (const offset of [.7, -.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
				const angle = cameraYaw + offset, horizontal = Math.cos(cameraPitch) * cameraDistance
				cameraPlacementCandidate.set(origin.x + Math.sin(angle) * horizontal, 1.2 + Math.sin(cameraPitch) * cameraDistance, origin.z + Math.cos(angle) * horizontal)
				if (bounds) {
					cameraPlacementCandidate.x = THREE.MathUtils.clamp(cameraPlacementCandidate.x, bounds.xMin, bounds.xMax)
					cameraPlacementCandidate.z = THREE.MathUtils.clamp(cameraPlacementCandidate.z, bounds.zMin, bounds.zMax)
				}
				this.resolveCameraBoom(origin, cameraPlacementCandidate)
				const available = cameraPlacementCandidate.distanceTo(origin)
				if (available > distance + .05) { cameraPlacementBest.copy(cameraPlacementCandidate); distance = available }
				if (distance >= minimum) break
			}
			destination.copy(cameraPlacementBest)
		},
		resolveCameraBoom(origin, destination) {
			if (!cameraProbe) return
			cameraProbeDirection.subVectors(destination, origin)
			const length = cameraProbeDirection.length()
			if (length < .001) return
			cameraProbeDirection.divideScalar(length)
			cameraProbe.set(origin, cameraProbeDirection)
			if (!cameraProbeHit) cameraProbeHit = new THREE.Vector3()
			const hit = cameraProbeHit
			let available = length
			for (const box of cameraOccluders) {
				if (cameraProbe.intersectBox(box, hit)) available = Math.min(available, Math.max(.65, origin.distanceTo(hit) - .12))
			}
			if (available < length) destination.copy(origin).addScaledVector(cameraProbeDirection, available)
		},
		loadStoneMaterial(road) {
			const apply = () => {
				if (!textureCache.stone_albedo) return
				road.material.map = textureCache.stone_albedo
				road.material.bumpMap = textureCache.stone_height || null
				road.material.bumpScale = .045
				road.material.roughnessMap = textureCache.stone_roughness || null
				road.material.roughness = .94; road.material.color.setHex(0xb6bcb4)
				road.material.needsUpdate = true
			}
			apply()
			if (stoneTextureLoading || textureCache.stone_albedo) return
			stoneTextureLoading = true
			const generation = assetLoadGeneration
			let pending = 3
			for (const kind of ['albedo', 'height', 'roughness']) {
				new THREE.TextureLoader().load(resolveAssetUrl('static/textures/pingyao-stone-' + kind + '.jpg'), texture => {
					if (generation !== assetLoadGeneration || !renderer) { texture.dispose(); return }
					if (kind === 'albedo') this.prepareSurfaceColorTexture(texture)
					texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3.25, 11.6)
					texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
					textureCache['stone_' + kind] = texture
					environment.filter(item => item.userData.isStoneRoad).forEach(item => {
						item.material[kind === 'albedo' ? 'map' : kind === 'height' ? 'bumpMap' : 'roughnessMap'] = texture
						item.material.bumpScale = .045; item.material.color.setHex(0xb6bcb4); item.material.needsUpdate = true
					})
					if (--pending === 0) stoneTextureLoading = false
				}, undefined, () => { if (generation === assetLoadGeneration && --pending === 0) stoneTextureLoading = false })
			}
		},
		makeCourtyardInlayTexture() {
			return this.getTexture('courtyard_stone_inlay', () => {
				const canvas = this.makeCanvas(1024), ctx = canvas.getContext('2d')
				ctx.fillStyle = '#62675e'; ctx.fillRect(0, 0, 1024, 1024)
				// A pebble mosaic, with an octagonal stone border and a square coin eye.
				for (let row = 0; row < 58; row++) for (let col = 0; col < 58; col++) {
					const n = Math.sin(row * 17.17 + col * 71.3) * .5 + .5
					const shade = Math.round(116 + n * 38)
					ctx.fillStyle = `rgb(${shade},${shade + 2},${shade - 7})`
					ctx.beginPath(); ctx.ellipse(col * 18 + (row % 2) * 9, row * 18, 7, 4.5 + n * 2, n * Math.PI, 0, Math.PI * 2); ctx.fill()
				}
				ctx.strokeStyle = '#494f48'; ctx.lineWidth = 25; ctx.strokeRect(18, 18, 988, 988)
				ctx.strokeStyle = '#b8b09a'; ctx.lineWidth = 9; ctx.strokeRect(47, 47, 930, 930)
				const octagon = radius => {
					ctx.beginPath()
					for (let i = 0; i <= 8; i++) {
						const a = i * Math.PI / 4 + Math.PI / 8
						const x = 512 + Math.cos(a) * radius, y = 512 + Math.sin(a) * radius
						i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
					}
					ctx.stroke()
				}
				ctx.strokeStyle = '#515b51'; ctx.lineWidth = 27; octagon(375); octagon(320)
				ctx.strokeStyle = '#b8af94'; ctx.lineWidth = 10; octagon(348)
				ctx.strokeStyle = '#515b51'; ctx.lineWidth = 25; ctx.strokeRect(412, 412, 200, 200)
				ctx.lineWidth = 14
				for (let i = 0; i < 8; i++) {
					const a = i * Math.PI / 4
					ctx.beginPath(); ctx.moveTo(512 + Math.cos(a) * 170, 512 + Math.sin(a) * 170)
					ctx.lineTo(512 + Math.cos(a) * 276, 512 + Math.sin(a) * 276); ctx.stroke()
				}
				const texture = this.setColorTexture(new THREE.CanvasTexture(canvas))
				texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1
				return texture
			})
		},
		makeCourtyardShadeTexture(enclosure) {
			const length = enclosure.zMax - enclosure.zMin
			return this.getTexture('courtyard_contact_' + length, () => {
				const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 2048
				const ctx = canvas.getContext('2d')
				ctx.scale(512 / 13, 2048 / length); ctx.translate(6.5, -enclosure.zMin)
				for (const side of [-1, 1]) {
					const edge = side * 6.5, gradient = ctx.createLinearGradient(edge, 0, edge - side * 2, 0)
					gradient.addColorStop(0, 'rgba(25,29,23,.48)'); gradient.addColorStop(1, 'rgba(25,29,23,0)')
					ctx.fillStyle = gradient; ctx.fillRect(side < 0 ? -6.5 : 4.5, enclosure.zMin, 2, length)
				}
				for (const z of [1, -11, enclosure.zMin, enclosure.zMax]) {
					const gradient = ctx.createLinearGradient(0, z - 1.45, 0, z + 1.45)
					gradient.addColorStop(0, 'rgba(25,29,23,0)'); gradient.addColorStop(.5, 'rgba(25,29,23,.24)'); gradient.addColorStop(1, 'rgba(25,29,23,0)')
					ctx.fillStyle = gradient; ctx.fillRect(-6.5, z - 1.45, 13, 2.9)
				}
				const pool = (x, z, radius, strength) => {
					const gradient = ctx.createRadialGradient(x, z, radius * .08, x, z, radius)
					gradient.addColorStop(0, `rgba(20,27,20,${strength})`); gradient.addColorStop(1, 'rgba(20,27,20,0)')
					ctx.fillStyle = gradient; ctx.fillRect(x - radius, z - radius, radius * 2, radius * 2)
				}
				for (const x of [-4.8, 4.8]) for (const z of [13.8, -22.2]) pool(x, z, 1.9, .5)
				for (const x of [-6.1, -3.9, 3.9, 6.1]) for (const z of [1, -11]) pool(x, z, .7, .42)
				return new THREE.CanvasTexture(canvas)
			})
		},
		addCourtyardTree(parent, x, z) {
			const barkMap = this.getTexture('sophora_bark', () => {
				const canvas = this.makeCanvas(256), ctx = canvas.getContext('2d')
				ctx.fillStyle = '#685947'; ctx.fillRect(0, 0, 256, 256)
				for (let i = 0; i < 110; i++) {
					ctx.strokeStyle = i % 3 ? '#463e32' : '#887861'; ctx.lineWidth = i % 3 + 1
					ctx.beginPath(); ctx.moveTo((i * 37) % 256, 0)
					for (let y = 0; y <= 256; y += 16) ctx.lineTo((i * 37) % 256 + Math.sin(i + y * .04) * 3, y)
					ctx.stroke()
				}
				return this.setColorTexture(new THREE.CanvasTexture(canvas))
			})
			const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 1 })
			const branch = (a, b, radius) => {
				const start = new THREE.Vector3(x + a[0], a[1], z + a[2]), end = new THREE.Vector3(x + b[0], b[1], z + b[2])
				const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .56, radius, start.distanceTo(end), 9), bark)
				mesh.position.copy(start).add(end).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize())
				mesh.castShadow = true; parent.add(mesh)
			}
			branch([0, .4, 0], [.13, 2.55, .04], .17)
			for (let i = 0; i < 5; i++) {
				const a = i * 2.39996, dx = Math.cos(a), dz = Math.sin(a)
				branch([.1, 1.95 + i * .1, .03], [dx * .76, 3.18, dz * .76], .085)
				branch([dx * .55, 2.94, dz * .55], [dx * 1.3, 3.55, dz * 1.3], .037)
			}
			const leafMap = this.getTexture('sophora_compound_leaf', () => {
				const canvas = this.makeCanvas(128), ctx = canvas.getContext('2d')
				ctx.strokeStyle = '#a1a87a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 64); ctx.lineTo(122, 64); ctx.stroke()
				for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
					ctx.fillStyle = i % 2 ? '#a9ba78' : '#8d9f63'
					ctx.beginPath(); ctx.ellipse(20 + i * 16, 64 + side * 17, 15 - i * .55, 6.5, side * .85, 0, Math.PI * 2); ctx.fill()
				}
				ctx.beginPath(); ctx.ellipse(117, 64, 10, 6, 0, 0, Math.PI * 2); ctx.fill()
				return this.setColorTexture(new THREE.CanvasTexture(canvas))
			})
			const foliage = new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .4, side: THREE.DoubleSide, roughness: 1 })
			const count = 760, leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(.64, .38), foliage, count), dummy = new THREE.Object3D()
			leaves.name = 'sophora-compound-foliage'
			for (let i = 0; i < count; i++) {
				const a = i * 2.39996, r = Math.sqrt((i + .5) / count) * 1.56
				dummy.position.set(x + Math.cos(a) * r, 3.2 + Math.sin(i * 13.37) * .42 + (1 - r / 1.7) * .72, z + Math.sin(a) * r)
				dummy.rotation.set(Math.sin(i) * 1.3, Math.cos(i * 3.1) * Math.PI, a)
				dummy.scale.setScalar(.78 + (i % 7) * .06); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix)
				leaves.setColorAt(i, new THREE.Color().setHSL(.21 + (i % 5) * .008, .22, .42 + (i % 7) * .045))
			}
			leaves.userData.noCollision = true; leaves.castShadow = true; leaves.receiveShadow = true; parent.add(leaves)
		},
		addCourtyardLantern(parent, x, y, z, metal) {
			const paper = this.getTexture('courtyard_lantern_paper', () => {
				const canvas = this.makeCanvas(256), ctx = canvas.getContext('2d')
				ctx.fillStyle = '#c04b35'; ctx.fillRect(0, 0, 256, 256)
				for (let i = 0; i < 16; i++) {
					const g = ctx.createLinearGradient(i * 16, 0, i * 16 + 16, 0)
					g.addColorStop(0, '#913325'); g.addColorStop(.45, '#d46542'); g.addColorStop(1, '#913325')
					ctx.fillStyle = g; ctx.fillRect(i * 16, 0, 16, 256)
				}
				ctx.fillStyle = '#b38b4a'; ctx.fillRect(0, 20, 256, 5); ctx.fillRect(0, 231, 256, 5)
				return this.setColorTexture(new THREE.CanvasTexture(canvas))
			})
			const body = new THREE.Mesh(new THREE.SphereGeometry(.255, 20, 12), new THREE.MeshStandardMaterial({ map: paper, emissive: 0xffbb73, emissiveMap: paper, emissiveIntensity: .08, roughness: .82 }))
			body.position.set(x, y, z); body.scale.y = 1.18; body.userData.isBuildingLantern = true; parent.add(body)
			for (const side of [-1, 1]) {
				const cap = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .06, 12), metal)
				cap.position.set(x, y + side * .28, z); parent.add(cap)
			}
			const cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .23, 5), metal); cord.position.set(x, y + .41, z); parent.add(cord)
			const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.026, .052, .19, 8), new THREE.MeshStandardMaterial({ color: 0x8e3426, roughness: 1 }))
			tassel.position.set(x, y - .42, z); parent.add(tassel)
		},
		createStreetEnvironment(streetData, worldLayout) {
			const e = worldLayout.enclosure
			const width = e.xMax - e.xMin, length = e.zMax - e.zMin, middleZ = (e.zMax + e.zMin) / 2
			const shell = new THREE.Group(); shell.name = 'closed-courtyard'; shell.userData.isSolidEnvironment = true
			const brick = new THREE.MeshStandardMaterial({ color: 0xd6d5c9, map: this.makeBrickTexture(), bumpMap: this.getCourtyardTexture('brick', 'height'), bumpScale: .024, roughness: .93 })
			const stone = new THREE.MeshStandardMaterial({ color: 0x767c71, roughness: .94 })
			const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.makeWoodTexture(), bumpMap: this.getCourtyardTexture('wood', 'height'), bumpScale: .018, roughness: .8 })
			const red = new THREE.MeshStandardMaterial({ color: 0x75392c, map: this.makeWoodTexture(), roughness: .8 })
			const brass = new THREE.MeshStandardMaterial({ color: 0xb89959, roughness: .38, metalness: .6 })
			const trim = new THREE.MeshStandardMaterial({ color: 0xb6ad95, roughness: .9 })
			const darkStone = new THREE.MeshStandardMaterial({ color: 0x4f5c52, roughness: .95 })
			const box = (parent, w, h, d, x, y, z, material) => {
				const mesh = new THREE.Mesh(this.mapSurfaceUV(new THREE.BoxGeometry(w, h, d), material === brick ? 1.8 : 3.2, material === brick ? 1.6 : 3.2), material)
				mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
			}
			ground = new THREE.Mesh(new THREE.BoxGeometry(width+.6,.16,length+.6), stone)
			ground.position.set(0,-.08,middleZ); ground.receiveShadow = true; scene.add(ground)
			const road = new THREE.Mesh(new THREE.BoxGeometry(13,.12,length), new THREE.MeshStandardMaterial({ map: this.makeStoneGroundTexture(), roughness:.96 }))
			road.position.set(0,.02,middleZ); road.receiveShadow = true; road.userData.isStoneRoad = true
			scene.add(road); environment.push(road); this.loadStoneMaterial(road)
			// Flush paving details enrich the route without adding steps or obstructions.
			const inlayMaterial = new THREE.MeshStandardMaterial({ map: this.makeCourtyardInlayTexture(), roughness: .94 })
			for (const z of [8, -5, -18]) {
				const inlay = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), inlayMaterial)
				inlay.rotation.x = -Math.PI / 2; inlay.position.set(0, .081, z); inlay.receiveShadow = true; inlay.userData.noCollision = true; shell.add(inlay)
			}
			for (const x of [-2.6, 2.6]) {
				box(shell, .1, .002, length, x, .08, middleZ, darkStone).userData.noCollision = true
				box(shell, .03, .002, length, x + Math.sign(x) * .1, .08, middleZ, trim).userData.noCollision = true
			}
			for (const z of [1, -11]) box(shell, 12.4, .002, .18, 0, .08, z, darkStone).userData.noCollision = true
			// All four sides are physical walls. Side infill joins every building bay.
			for (const side of [-1,1]) {
				box(shell,e.thickness,e.height,length,side*(e.xMax-e.thickness/2),e.height/2,middleZ,brick)
				box(shell,.4,2.9,length,side*(e.facadeLine+.22),1.45,middleZ,brick)
				box(shell,.46,.3,length,side*(e.facadeLine+.22),.25,middleZ,stone)
				const coping = new THREE.Group(); coping.position.set(side*(e.facadeLine+.22),0,middleZ); coping.rotation.y = Math.PI/2
				this.addPitchedRoof(coping,length,.42,2.9,'#454741'); shell.add(coping)
				// Recessed stone drain; flush edge does not create invisible walking barriers.
				box(shell,.16,.035,length,side*6.22,.088,middleZ,stone).userData.noCollision = true
				for (const z of [13.8,-22.2]) {
					box(shell,1.05,.32,1.05,side*4.8,.24,z,stone)
					box(shell,.86,.05,.86,side*4.8,.42,z,new THREE.MeshStandardMaterial({color:0x453d2e,roughness:1}))
					for (const dx of [-.5, .5]) box(shell, .1, .07, 1.12, side * 4.8 + dx, .43, z, trim)
					for (const dz of [-.5, .5]) box(shell, 1.12, .07, .1, side * 4.8, .43, z + dz, trim)
					this.addCourtyardTree(shell, side * 4.8, z)
				}
			}
			for (const [z, rotation] of [[e.zMin,0],[e.zMax,Math.PI]]) {
				const gate = new THREE.Group(); gate.position.z=z; gate.rotation.y=rotation; gate.name='sealed-courtyard-gate'
				// Inward-facing gatehouse with closed double doors and continuous lintel.
				box(gate,(width-3.8)/2,e.height,.65,-(width+3.8)/4,e.height/2,0,brick)
				box(gate,(width-3.8)/2,e.height,.65,(width+3.8)/4,e.height/2,0,brick)
				box(gate,3.8,1.15,.65,0,e.height-.575,0,brick)
				box(gate,width,.32,.78,0,.24,.06,stone)
				box(gate,width,.12,.8,0,3.98,.06,trim)
				box(gate,4.55,.2,.66,0,3.36,.28,wood)
				box(gate,4.65,.07,.74,0,3.51,.28,trim)
				for (const side of [-1,1]) {
					box(gate,1.89,3.25,.2,side*.95,1.625,.11,red)
					box(gate,.18,3.65,.5,side*2.02,1.825,.28,wood)
					for (let row=0;row<5;row++) for(let col=0;col<3;col++) {
						const stud=new THREE.Mesh(new THREE.SphereGeometry(.038,8,6),brass); stud.position.set(side*(.3+col*.57),.6+row*.43,.23); gate.add(stud)
					}
					const ring=new THREE.Mesh(new THREE.TorusGeometry(.11,.024,8,20),brass); ring.position.set(side*.24,1.65,.27); gate.add(ring)
					box(gate,.19,3.65,.13,side*3.2,1.9,.4,stone)
					box(gate,.36,.13,.2,side*3.2,3.69,.43,trim)
					box(gate,.1,3.1,.1,side*2.21,1.92,.57,trim)
					// Solid wall-backed lattice medallions, not walk-through openings.
					const centerX = side * 4.8, centerY = 2.35
					const recess = new THREE.Mesh(new THREE.CircleGeometry(.69,32), darkStone); recess.position.set(centerX,centerY,.335); gate.add(recess)
					const rim = new THREE.Mesh(new THREE.TorusGeometry(.7,.075,8,36),trim); rim.position.set(centerX,centerY,.37); gate.add(rim)
					for (let i = -3; i <= 3; i++) {
						const offset = i * .17, span = 2 * Math.sqrt(.64 * .64 - offset * offset)
						box(gate,.025,span,.04,centerX+offset,centerY,.37,wood)
						box(gate,span,.025,.04,centerX,centerY+offset,.37,wood)
					}
					const drum = new THREE.Mesh(new THREE.CylinderGeometry(.27,.31,.35,16),stone); drum.position.set(side*2.02,.3,.44); gate.add(drum)
					this.addCourtyardLantern(gate, side * 2.65, 3.12, .63, brass)
				}
				this.addPitchedRoof(gate,width,.9,e.height,'#343b37')
				this.addPitchedRoof(gate,5.3,2.5,e.height+.25,'#343b37',true)
				const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.64),new THREE.MeshBasicMaterial({map:this.makeSignTexture(z<0?streetData.title:'平遥古城','gate'),transparent:true,toneMapped:false}))
				sign.position.set(0,3.84,.4); gate.add(sign); shell.add(gate)
			}
			// A pair of transverse covered galleries creates three connected courtyard rooms.
			for (const z of [1,-11]) {
				const gallery=new THREE.Group(); gallery.position.z=z; gallery.name='courtyard-gallery'
				for (const x of [-6.1,-3.9,3.9,6.1]) {
					box(gallery,.42,.22,.42,x,.19,0,stone)
					const post=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,3.05,12),wood); post.position.set(x,1.72,0); post.castShadow=true; gallery.add(post)
					box(gallery,.52,.14,.42,x,3.16,0,red)
					for (const side of [-1, 1]) {
						const bracket = box(gallery,.55,.09,.18,x+side*.23,2.98,0,wood); bracket.rotation.z=side*.55
					}
				}
				box(gallery,12.9,.2,.3,0,3.22,0,wood)
				box(gallery,12.8,.065,.36,0,3.08,0,trim)
				box(gallery,7.5,.08,.14,0,2.8,0,wood)
				for (let i = -8; i <= 8; i++) {
					box(gallery,.045,.25,.07,i*.42,2.95,0,wood)
					const rafter=box(gallery,.065,.09,1.7,i*.72,3.33,0,wood); rafter.castShadow=true
				}
				this.addPitchedRoof(gallery,12.8,1.4,3.36,'#343b37')
				for(const x of [-5,5]) this.addCourtyardLantern(gallery,x,2.68,.25,brass)
				shell.add(gallery)
			}
			scene.add(shell); environment.push(shell)
			// Contact shade remains visible on phones when dynamic shadows are disabled.
			const shadeRoot=new THREE.Group(); shadeRoot.name='courtyard-contact-shade'
			const shade=new THREE.Mesh(new THREE.PlaneGeometry(13,length),new THREE.MeshBasicMaterial({map:this.makeCourtyardShadeTexture(e),transparent:true,depthWrite:false,toneMapped:false,opacity:.8}))
			shade.rotation.x=-Math.PI/2; shade.position.set(0,.083,middleZ); shadeRoot.add(shade)
			scene.add(shadeRoot); environment.push(shadeRoot)
		},

		getBuildingPalette(style) {
			const palettes = {
				gate: { brick: '#8f7357', mortar: '#443c35', wall: 0xb99e79, wood: '#4b1e19', roof: '#292220', accent: 0x832827 },
				tower: { brick: '#777169', mortar: '#3e3a36', wall: 0xa79b88, wood: '#42241b', roof: '#292827', accent: 0x842c28 },
				temple: { brick: '#937c65', mortar: '#483f38', wall: 0xbcaa8e, wood: '#53241c', roof: '#2d2825', accent: 0x902a27 },
				bank: { brick: '#747b75', mortar: '#41443f', wall: 0xa8aa9e, wood: '#43271d', roof: '#282a2a', accent: 0x742422 },
				shop: { brick: '#7c807b', mortar: '#41443f', wall: 0xaaa79c, wood: '#4a2a1d', roof: '#2c2d2d', accent: 0x942f2b },
				craft: { brick: '#887461', mortar: '#473e37', wall: 0xae9c84, wood: '#4a291c', roof: '#2e2b2a', accent: 0x792a24 },
				food: { brick: '#8b7561', mortar: '#493f37', wall: 0xb19d83, wood: '#50281b', roof: '#302b28', accent: 0x923128 },
				wall: { brick: '#79786f', mortar: '#41413c', wall: 0x9f9b8f, wood: '#43271d', roof: '#2d2d2d', accent: 0x772a25 },
				courtyard: { brick: '#7b7e78', mortar: '#41443f', wall: 0xa5a398, wood: '#45281d', roof: '#292b2b', accent: 0x812b27 }
			}
			return palettes[style] || palettes.courtyard
		},
		addPitchedRoof(group, width, depth, baseY, roofHex, ceremonial = false) {
			const roofMaterial = new THREE.MeshStandardMaterial({
				color: 0xffffff,
				map: this.makeRoofTexture(roofHex),
				bumpMap: this.getCourtyardTexture('roof', 'height'),
				bumpScale: 0.018,
				roughness: 0.96,
				metalness: 0,
				flatShading: true
			})
			const half = depth / 2 + 0.48
			const rise = Math.max(.19, depth * (ceremonial ? 0.3 : 0.24))
			const eaveLift = ceremonial ? 0.16 : 0.07
			const profile = new THREE.Shape()
			profile.moveTo(-half, eaveLift)
			profile.lineTo(-half * 0.78, 0.14)
			profile.lineTo(0, rise)
			profile.lineTo(half * 0.78, 0.14)
			profile.lineTo(half, eaveLift)
			profile.lineTo(half, eaveLift - 0.14)
			profile.lineTo(half * 0.78, 0)
			profile.lineTo(0, rise - 0.14)
			profile.lineTo(-half * 0.78, 0)
			profile.lineTo(-half, eaveLift - 0.14)
			profile.closePath()
			const roofGeometry = new THREE.ExtrudeGeometry(profile, { depth: width + 0.8, bevelEnabled: false, steps: 1 })
			roofGeometry.rotateY(Math.PI / 2)
			roofGeometry.translate(-(width + 0.8) / 2, 0, 0)
			// Match the tile pitch across differently sized roofs. V follows the
			// actual bent slope, so the rows do not stretch on steep roof sections.
			const columns = Math.max(1, Math.round((width + .8) / .18))
			const tilePitch = (width + .8) / columns
			const outerRun = half * .22, innerRun = half * .78
			const outerLength = Math.hypot(outerRun, .14 - eaveLift)
			const innerLength = Math.hypot(innerRun, rise - .14)
			const positions = roofGeometry.attributes.position, uvs = roofGeometry.attributes.uv
			for (let i = 0; i < positions.count; i++) {
				const fromEave = half - Math.abs(positions.getZ(i))
				const alongSlope = fromEave <= outerRun ? fromEave / outerRun * outerLength : outerLength + (fromEave - outerRun) / innerRun * innerLength
				uvs.setXY(i, (positions.getX(i) + (width + .8) / 2) / (tilePitch * 16), alongSlope / 3.2)
			}
			// The cut edge is solid clay, not another stretched tile course.
			// Split it from the upward faces so both can still join static batches.
			const faces = [{ position: [], normal: [], uv: [] }, { position: [], normal: [], uv: [] }]
			const normals = roofGeometry.attributes.normal
			for (let i = 0; i < positions.count; i += 3) {
				const target = faces[normals.getY(i) > .1 ? 0 : 1]
				for (let j = i; j < i + 3; j++) {
					target.position.push(positions.getX(j), positions.getY(j), positions.getZ(j))
					target.normal.push(normals.getX(j), normals.getY(j), normals.getZ(j))
					target.uv.push(uvs.getX(j), uvs.getY(j))
				}
			}
			const [surfaceGeometry, edgeGeometry] = faces.map(attributes => {
				const geometry = new THREE.BufferGeometry()
				for (const key of ['position', 'normal', 'uv']) geometry.setAttribute(key, new THREE.Float32BufferAttribute(attributes[key], key === 'uv' ? 2 : 3))
				return geometry
			})
			roofGeometry.dispose()
			const roof = new THREE.Mesh(surfaceGeometry, roofMaterial)
			roof.position.y = baseY + 0.1
			roof.castShadow = true
			roof.receiveShadow = true
			roof.userData.isRoofShell = true
			group.add(roof)
			const ridge = new THREE.Mesh(
				new THREE.CylinderGeometry(0.1, 0.1, width + 1.05, 8),
				new THREE.MeshStandardMaterial({ color: 0x42453e, roughness: 0.96 })
			)
			ridge.rotation.z = Math.PI / 2
			ridge.position.y = baseY + 0.1 + rise
			ridge.castShadow = true
			group.add(ridge)
			const edge = new THREE.Mesh(edgeGeometry, ridge.material)
			edge.position.y = roof.position.y
			edge.castShadow = edge.receiveShadow = true
			group.add(edge)
			;[-1, 1].forEach((side) => {
				const end = new THREE.Mesh(new THREE.BoxGeometry(0.16, ceremonial ? 0.38 : 0.2, 0.18), ridge.material)
				end.position.set(side * (width / 2 + 0.38), baseY + rise + (ceremonial ? 0.23 : 0.14), 0)
				group.add(end)
			})
			// Short half-round eave tiles supply the silhouette; the tiled bump
			// surface supplies the remaining courses. Narrow wall coping needs no
			// extra instances. Each full roof still uses one instanced tile draw.
			if (depth < .6) return
			const radius = tilePitch * .46
			const tileGeo = new THREE.CylinderGeometry(radius, radius * .92, .26, 6, 1, false, Math.PI / 2, Math.PI)
			tileGeo.rotateX(Math.PI / 2)
			tileGeo.scale(1, .58, 1)
			const tileMat = new THREE.MeshStandardMaterial({ color: 0x65675f, roughness: .96, metalness: 0 })
			const tiles = new THREE.InstancedMesh(tileGeo, tileMat, columns * 2)
			const dummy = new THREE.Object3D()
			const tileColor = new THREE.Color()
			const eaveSlope = (.14 - eaveLift) / outerRun
			let tileIndex = 0
			for (let column = 0; column < columns; column += 1) {
				const x = -(width + .8) / 2 + (column + .5) * tilePitch
				;[-1, 1].forEach((side) => {
					dummy.position.set(x, baseY + .1 + eaveLift + .10 * eaveSlope - .012, side * (half - .10))
					dummy.rotation.set(side * Math.atan(eaveSlope), 0, 0)
					dummy.updateMatrix()
					tiles.setMatrixAt(tileIndex, dummy.matrix)
					tileColor.setScalar(.92 + ((column * 7 + (side + 1) * 3) % 11) * .012)
					tiles.setColorAt(tileIndex++, tileColor)
				})
			}
			tiles.castShadow = true
			tiles.receiveShadow = true
			tiles.userData.isRoofTiles = true
			group.add(tiles)
		},
		createBuildings(streetData, worldLayout) {
			const facades = worldLayout?.facades || []
			facades.forEach((building) => {
				const group = new THREE.Group()
				const palette = this.getBuildingPalette(building.style)
				const bodyMaterial = new THREE.MeshStandardMaterial({
					color: building.slot % 2 ? 0xd5d5ca : 0xe2dfd2,
					map: this.makeBrickTexture(palette.brick, palette.mortar),
					roughness: 0.95,
					metalness: 0,
					flatShading: true
				})
				bodyMaterial.bumpMap = this.getCourtyardTexture('brick', 'height'); bodyMaterial.bumpScale = .024
				const body = new THREE.Mesh(this.mapSurfaceUV(new THREE.BoxGeometry(building.width, building.height, building.depth), 1.8, 1.6), bodyMaterial)
				body.position.y = building.height / 2 + 0.16
				body.castShadow = true
				body.receiveShadow = true
				group.add(body)

				const plinth = new THREE.Mesh(
					new THREE.BoxGeometry(building.width + 0.22, 0.32, building.depth + 0.18),
					new THREE.MeshStandardMaterial({ color: 0x747267, roughness: 1 })
				)
				plinth.position.y = 0.16
				plinth.receiveShadow = true
				group.add(plinth)

				this.addPitchedRoof(group, building.width, building.depth, building.height + 0.16, palette.roof, ['gate', 'temple', 'tower'].includes(building.style))
				// Solid gables close the gap below the pitched roof.
				const gableShape = new THREE.Shape()
				const rise = building.depth * (['gate', 'temple', 'tower'].includes(building.style) ? 0.3 : 0.24)
				gableShape.moveTo(-building.depth / 2, 0)
				gableShape.lineTo(0, rise)
				gableShape.lineTo(building.depth / 2, 0)
				gableShape.closePath()
				;[-1, 1].forEach((side) => {
					const geo = new THREE.ShapeGeometry(gableShape)
					geo.rotateY(side * Math.PI / 2)
					this.mapSurfaceUV(geo, 1.8, 1.6)
					const gable = new THREE.Mesh(geo, bodyMaterial)
					gable.position.set(side * building.width / 2, building.height + 0.16, 0)
					group.add(gable)
				})
				this.addBuildingDetails(group, building, palette)
				/* 后院矮屋与烟囱抬高屋脊层次，位置仍随主立面整体旋转。 */
				const rearHeight = 2.15 + (building.slot % 2) * 0.35
				const rear = new THREE.Mesh(new THREE.BoxGeometry(building.width * 0.76, rearHeight, 2.7), bodyMaterial)
				rear.position.set(0, rearHeight / 2, -building.depth * 0.9)
				rear.castShadow = true
				group.add(rear)
				const rearRoof = new THREE.Mesh(new THREE.BoxGeometry(building.width * 0.88, 0.18, 3.25), new THREE.MeshStandardMaterial({ color: 0x343432, roughness: 0.95 }))
				rearRoof.position.set(0, rearHeight + 0.08, -building.depth * 0.9)
				rearRoof.rotation.z = (building.slot % 2 ? 1 : -1) * 0.035
				group.add(rearRoof)
				const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.1, 0.38), bodyMaterial)
				chimney.position.set(building.width * 0.22, rearHeight + 0.45, -building.depth * 0.98)
				chimney.userData.isChimney = true
				group.add(chimney)

				if (building.style === 'tower' || building.style === 'gate') {
					const upper = new THREE.Mesh(
						new THREE.BoxGeometry(building.width * 0.55, 1.15, building.depth * 0.72),
						bodyMaterial
					)
					upper.position.y = building.height + 1.45
					upper.castShadow = true
					group.add(upper)
					this.addPitchedRoof(group, building.width * 0.68, building.depth * 0.8, building.height + 2.0, palette.roof)
				}

				group.position.set(building.x, 0, building.z)
				group.rotation.y = building.rotationY
				group.userData = { buildingId: building.id, poiId: building.poiId || '', type: building.style || 'building' }
				scene.add(group)
				buildings.push(group)
			})
		},
		addBuildingDetails(group, building, palette) {
			const width = building.width
			const height = building.height
			const depth = building.depth
			const frontZ = depth / 2 + 0.025
			const woodTex = this.makeWoodTexture(palette.wood)
			const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.86, flatShading: true })
			const storefront = ['shop', 'craft', 'food'].includes(building.style)
			const doorW = building.style === 'gate' ? 2.1 : storefront ? 1.8 : 1.35
			const doorH = Math.min(2.35, height * 0.62)
			const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a291c, map: woodTex, roughness: 0.88, side: THREE.DoubleSide })
			const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorMat)
			door.position.set(0, doorH / 2 + 0.18, frontZ + 0.02)
			group.add(door)

			const threshold = new THREE.Mesh(
				new THREE.BoxGeometry(doorW + 0.52, 0.16, 0.46),
				new THREE.MeshStandardMaterial({ color: 0x68665e, roughness: 1 })
			)
			threshold.position.set(0, 0.08, frontZ + 0.18)
			threshold.receiveShadow = true
			group.add(threshold)

			if (building.style === 'gate' || building.style === 'bank') {
				const studMaterial = new THREE.MeshStandardMaterial({ color: 0xb08a45, roughness: 0.58, metalness: 0.3 })
				;[-1, 1].forEach((column) => {
					;[0.7, 1.25, 1.8].forEach((y) => {
						const stud = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), studMaterial)
						stud.position.set(column * doorW * 0.27, Math.min(y, doorH - 0.18), frontZ + 0.06)
						group.add(stud)
					})
				})
			}

			;[-1, 1].forEach((side) => {
				const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, doorH + 0.28, 0.18), frameMat)
				post.position.set(side * (doorW / 2 + 0.09), doorH / 2 + 0.18, frontZ + 0.01)
				post.castShadow = true
				group.add(post)
			})
			const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.48, 0.18, 0.2), frameMat)
			doorLintel.position.set(0, doorH + 0.27, frontZ + 0.01)
			group.add(doorLintel)

			const latticeTex = this.makeLatticeTexture('#60351f')
			const winW = storefront ? 1.55 : Math.min(1.15, width * 0.15)
			const winH = storefront ? 1.35 : building.style === 'temple' ? 1.45 : 1.1
			;[-1, 1].forEach((side) => {
				const winMaterial = new THREE.MeshStandardMaterial({
					color: 0xf4e5c6,
					map: latticeTex,
					emissive: 0xffc777,
					emissiveMap: latticeTex,
					emissiveIntensity: 0,
					roughness: 0.78,
					side: THREE.DoubleSide
				})
				const win = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), winMaterial)
				win.position.set(side * width * 0.28, Math.min(height * 0.6, 2.25), frontZ + 0.025)
				win.userData.isWindowGlow = true
				group.add(win)
				for (const edge of [-1, 1]) {
					const upright = new THREE.Mesh(new THREE.BoxGeometry(.065, winH+.12, .07), frameMat)
					upright.position.set(side*width*.28+edge*winW/2,win.position.y,frontZ+.058); group.add(upright)
					const rail = new THREE.Mesh(new THREE.BoxGeometry(winW+.12,.065,.07),frameMat)
					rail.position.set(side*width*.28,win.position.y+edge*winH/2,frontZ+.058);group.add(rail)
				}
			})

			const sign = new THREE.Mesh(
				new THREE.PlaneGeometry(Math.min(3.2, width * 0.42), Math.min(3.2, width * 0.42) * 192 / 512),
				new THREE.MeshBasicMaterial({ map: this.makeSignTexture(building.label, building.style), toneMapped: false })
			)
			sign.position.set(0, Math.min(height - 0.45, doorH + 0.92), frontZ + 0.055)
			sign.renderOrder = 2
			group.add(sign)

			const eaveY = height + 0.05
			for (let i = -3; i <= 3; i += 1) {
				const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.42), frameMat)
				bracket.position.set(i * (width * 0.12), eaveY, frontZ - 0.05)
				bracket.castShadow = true
				group.add(bracket)
			}
			const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.2, 0.22), frameMat)
			beam.position.set(0, eaveY + 0.18, frontZ - 0.04)
			beam.castShadow = true
			group.add(beam)
			if (storefront) {
				const counter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.12, 0.24), frameMat)
				counter.position.set(0, 1.05, frontZ + 0.1)
				group.add(counter)
			}
			/* 椽头、斗拱和雀替形成连续檐下节奏。 */
			for (let i = -4; i <= 4; i += 1) {
				const rafter = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 6), new THREE.MeshStandardMaterial({ color: 0x4b291c, roughness: 0.9, flatShading: true }))
				rafter.rotation.x = Math.PI / 2
				rafter.position.set(i * width * 0.105, eaveY + 0.3, frontZ + 0.15)
				group.add(rafter)
			}
			;[-1, 1].forEach((side) => {
				const queTi = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.16), frameMat)
				queTi.position.set(side * (doorW / 2 + 0.28), doorH + 0.48, frontZ + 0.03)
				queTi.rotation.z = side * 0.38
				group.add(queTi)
			})
			if (building.style === 'bank') {
				for (let i = 0; i < 3; i += 1) {
					const step = new THREE.Mesh(new THREE.BoxGeometry(doorW + 1.1 - i * 0.22, 0.14, 0.52), threshold.material)
					step.position.set(0, 0.07 + i * 0.14, frontZ + 0.44 + i * 0.2)
					group.add(step)
				}
			}

			;[-1, 1].forEach((side) => {
				const lantern = new THREE.Mesh(
					new THREE.CylinderGeometry(0.2, 0.25, 0.55, 12),
					new THREE.MeshStandardMaterial({
						color: palette.accent,
						emissive: palette.accent,
						emissiveIntensity: 0.12,
						roughness: 0.55
					})
				)
				lantern.position.set(side * Math.min(width * 0.25, 1.8), Math.min(height - 0.6, 2.65), frontZ + 0.18)
				lantern.userData.isBuildingLantern = true
				group.add(lantern)
				const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, Math.max(0.12, eaveY - lantern.position.y - 0.28), 4), frameMat)
				cord.position.set(lantern.position.x, (eaveY + lantern.position.y + 0.28) / 2, frontZ + 0.18)
				group.add(cord)
			})
		},
		createPoiBeacons(pois, streetData, worldLayout) {
			const placements = worldLayout?.pois || []
			;(pois || []).forEach((poi, index) => {
				const placement = placements.find((item) => item.id === poi.id) || {
					x: index % 2 === 0 ? -2.6 : 2.6,
					z: 4 - index * 7.5
				}
				const x = placement.x
				const z = placement.z

				const group = new THREE.Group()
				const baseColor = poi.status === 'quest' ? 0xC99224 : 0xB98C4A

				/* 低矮印章式地标：保留可发现性，但不再用四米高光柱遮挡建筑。 */
				const ringGeometry = new THREE.TorusGeometry(0.72, 0.07, 10, 28)
				const ringMaterial = new THREE.MeshStandardMaterial({
					color: baseColor,
					emissive: baseColor,
					emissiveIntensity: poi.status === 'quest' ? 0.72 : 0.34,
					roughness: 0.58,
					flatShading: true
				})
				const ring = new THREE.Mesh(ringGeometry, ringMaterial)
				ring.rotation.x = Math.PI / 2
				ring.position.y = 0.1
				ring.userData = { poiPart: 'ring', baseColor, baseEmissive: baseColor, baseIntensity: poi.status === 'quest' ? 0.72 : 0.34 }
				group.add(ring)

				/* 漂浮印章：尺寸克制，任务目标才使用更强的金色。 */
				const crystal = new THREE.Mesh(
					new THREE.OctahedronGeometry(0.3, 0),
					new THREE.MeshStandardMaterial({
						color: poi.status === 'quest' ? 0xA62E32 : 0xE6CF9F,
						emissive: baseColor,
						emissiveIntensity: poi.status === 'quest' ? 0.7 : 0.3,
						roughness: 0.5,
						flatShading: true
					})
				)
				crystal.position.y = 0.82
				crystal.userData = {
					poiPart: 'crystal',
					baseColor: poi.status === 'quest' ? 0xA62E32 : 0xE6CF9F,
					baseEmissive: baseColor,
					baseIntensity: poi.status === 'quest' ? 0.7 : 0.3
				}
				group.add(crystal)

				const label = new THREE.Sprite(new THREE.SpriteMaterial({
					map: this.makePoiLabelTexture(poi.name),
					transparent: true,
					depthWrite: false,
					depthTest: true,
					toneMapped: false
				}))
				label.position.y = 2.05
				label.scale.set(3.2, 0.8, 1)
				label.renderOrder = 3
				group.add(label)

				group.position.set(x, 0, z)
				/* 预置 nearHinted：出生点附近(<8)的信标视为“已在身边”，不在加载首帧弹由远及近预告
				   （否则瞬间盖掉入城/任务引导语）；玩家走远(>=9)再回来才会触发。*/
				const spawn = worldLayout?.spawn || { x: 0, z: 13 }
				const spawnDist = Math.sqrt((x - spawn.x) * (x - spawn.x) + (z - spawn.z) * (z - spawn.z))
				const trigger = placement.trigger || { discoveryRadius: 7.2, interactionRadius: 3, exitRadius: 3.5, resetRadius: 8.2 }
				group.userData = {
					poiId: poi.id,
					type: 'poi',
					baseColor,
					crystal,
					ring,
					label,
					trigger,
					proximityState: spawnDist < trigger.discoveryRadius ? 'near' : 'far',
					isHighlighted: poi.status === 'quest',
					entered: false,
					nearHinted: spawnDist < trigger.discoveryRadius
				}
				scene.add(group)
				poiBeacons.push(group)
			})
		},
		createPlayer() {
			try {
				const skin = playerSkinData || {}
				const silhouette = skin.silhouette || 'traveler'
				const presetMap = {
					traveler: { shoulder: 0.35, torsoTop: 0.29, torsoBottom: 0.35, torsoHeight: 0.88, robeHeight: 0.62, robeBottom: 0.43, sleeveRadius: 0.115, height: 1 },
					clerk: { shoulder: 0.36, torsoTop: 0.30, torsoBottom: 0.36, torsoHeight: 0.92, robeHeight: 0.82, robeBottom: 0.48, sleeveRadius: 0.125, height: 1.01 },
					scholar: { shoulder: 0.39, torsoTop: 0.29, torsoBottom: 0.36, torsoHeight: 0.90, robeHeight: 0.90, robeBottom: 0.52, sleeveRadius: 0.17, height: 1.02 },
					escort: { shoulder: 0.39, torsoTop: 0.34, torsoBottom: 0.35, torsoHeight: 0.84, robeHeight: 0.50, robeBottom: 0.40, sleeveRadius: 0.14, height: 1.03 },
					merchant: { shoulder: 0.38, torsoTop: 0.33, torsoBottom: 0.39, torsoHeight: 0.94, robeHeight: 0.88, robeBottom: 0.52, sleeveRadius: 0.15, height: 1.01 },
					festival: { shoulder: 0.43, torsoTop: 0.31, torsoBottom: 0.39, torsoHeight: 0.92, robeHeight: 0.94, robeBottom: 0.57, sleeveRadius: 0.19, height: 1.02 },
					legend: { shoulder: 0.44, torsoTop: 0.35, torsoBottom: 0.41, torsoHeight: 0.96, robeHeight: 0.92, robeBottom: 0.56, sleeveRadius: 0.18, height: 1.05 }
				}
				const shape = presetMap[silhouette] || presetMap.traveler
				const group = new THREE.Group()
				group.name = 'pingyao-player-v2'
				const bodyColor = colorHex(skin.body, 0x8B4513)
				const robeColor = colorHex(skin.robe, bodyColor)
				const trimColor = colorHex(skin.trim, 0xD2B48C)
				const skinColor = colorHex(skin.head, 0xD4A574)
				const hatColor = colorHex(skin.hat, 0x30251F)
				const brocadeTexture = skin.pattern === 'brocade' ? this.getBrocadeTexture() : null

				const material = (color, roughness = 0.78, useBrocade = false, extras = {}) => {
					const mat = new THREE.MeshStandardMaterial({
						color: useBrocade ? 0xfff4df : color,
						roughness,
						metalness: extras.metalness || 0,
						map: useBrocade ? brocadeTexture : null,
						flatShading: extras.flatShading !== false,
						side: extras.side ?? THREE.FrontSide
					})
					mat.userData.useBrocade = useBrocade
					return mat
				}
				const clothMat = material(bodyColor, 0.82)
				const robeMat = material(robeColor, 0.80, skin.pattern === 'brocade')
				const trimMat = material(trimColor, 0.62, false, { metalness: skin.accent ? 0.12 : 0 })
				const skinMat = material(skinColor, 0.68, false, { flatShading: false })
				const hairMat = material(0x241c18, 0.92)
				const shoeMat = material(silhouette === 'escort' ? 0x171516 : 0x29241F, 0.9)
				const eyeMat = new THREE.MeshBasicMaterial({ color: 0x241b17 })
				const eyes = []

				const addMesh = (geometry, mat, x, y, z, parent = group) => {
					const mesh = new THREE.Mesh(geometry, mat)
					mesh.position.set(x, y, z)
					mesh.castShadow = true
					parent.add(mesh)
					return mesh
				}

				/* 躯干与下装均使用有肩腰比例的截锥，消除旧版“圆柱玩偶”轮廓。 */
				const torsoY = 1.22
				const torso = addMesh(
					new THREE.CylinderGeometry(shape.torsoTop, shape.torsoBottom, shape.torsoHeight, 12),
					clothMat, 0, torsoY, 0
				)
				const robeY = 0.63
				const robeProfile = [
					new THREE.Vector2(shape.robeBottom, 0),
					new THREE.Vector2(shape.robeBottom * 0.97, shape.robeHeight * 0.12),
					new THREE.Vector2(shape.torsoBottom, shape.robeHeight * 0.9),
					new THREE.Vector2(shape.torsoBottom * 0.9, shape.robeHeight)
				]
				const robe = addMesh(
					new THREE.LatheGeometry(robeProfile, 14),
					robeMat, 0, robeY, 0
				)
				robe.position.y -= shape.robeHeight * 0.5
				if (skin.pattern === 'brocade') robe.userData.costumeTexture = 'brocade'

				const sash = addMesh(new THREE.TorusGeometry(shape.torsoBottom + 0.018, 0.045, 7, 20), trimMat, 0, 0.91, 0)
				sash.rotation.x = Math.PI / 2
				/* 交领与前襟用独立镶边建立传统汉服结构，近景旋转时仍有细节。 */
				;[-1, 1].forEach((side) => {
					const lapel = addMesh(new THREE.BoxGeometry(0.062, 0.49, 0.035), trimMat, side * 0.075, 1.43, 0.31)
					lapel.rotation.z = side * 0.40
				})
				addMesh(new THREE.BoxGeometry(0.055, 0.48, 0.035), trimMat, -0.02, 1.08, 0.355)

				/* 双段四肢：肩袖/腕袖、裤腿/鞋靴分离，动画仍由原有四个关节组驱动。 */
				const makeArm = (side) => {
					const pivot = new THREE.Group()
					pivot.position.set(side * shape.shoulder, 1.49, 0)
					group.add(pivot)
					const sleeveLength = skin.sleeve === 'ceremonial' ? 0.68 : skin.sleeve === 'wide' ? 0.64 : 0.58
					const upper = addMesh(new THREE.CylinderGeometry(shape.sleeveRadius * 0.82, shape.sleeveRadius, sleeveLength, 9), clothMat, 0, -sleeveLength / 2, 0, pivot)
					upper.rotation.z = side * 0.04
					const cuffRadius = skin.sleeve === 'ceremonial' ? shape.sleeveRadius * 1.35 : shape.sleeveRadius * 1.08
					const cuff = addMesh(new THREE.CylinderGeometry(cuffRadius * 0.88, cuffRadius, 0.18, 9), trimMat, 0, -sleeveLength - 0.07, 0, pivot)
					if (skin.sleeve === 'braced') cuff.material = material(0x35251c, 0.62, false, { metalness: 0.16 })
					addMesh(new THREE.SphereGeometry(0.105, 9, 7), skinMat, 0, -sleeveLength - 0.22, 0, pivot)
					return pivot
				}
				const makeLeg = (side) => {
					const pivot = new THREE.Group()
					pivot.position.set(side * 0.16, 0.43, 0)
					group.add(pivot)
					addMesh(new THREE.CylinderGeometry(0.095, 0.11, 0.48, 8), clothMat, 0, -0.24, 0, pivot)
					const bootHeight = silhouette === 'escort' ? 0.28 : 0.17
					addMesh(new THREE.CylinderGeometry(0.115, 0.125, bootHeight, 8), shoeMat, 0, -0.48, 0, pivot)
					const shoe = addMesh(new THREE.BoxGeometry(0.25, 0.13, 0.37), shoeMat, 0, -0.58, 0.055, pivot)
					shoe.geometry.translate(0, 0, 0.04)
					return pivot
				}
				const leftLeg = makeLeg(-1)
				const rightLeg = makeLeg(1)
				const leftArm = makeArm(-1)
				const rightArm = makeArm(1)

				/* 头面采用柔和曲面，补上耳、眉眼、鼻与发髻；低面数但不再是无脸球体。 */
				const head = addMesh(new THREE.SphereGeometry(0.255, 16, 12), skinMat, 0, 1.88, 0)
				head.scale.set(0.94, 1.08, 0.92)
				;[-1, 1].forEach((side) => {
					const ear = addMesh(new THREE.SphereGeometry(0.055, 8, 6), skinMat, side * 0.246, 1.88, 0)
					ear.scale.set(0.55, 1, 0.55)
					const eye = addMesh(new THREE.SphereGeometry(0.024, 7, 5), eyeMat, side * 0.088, 1.91, 0.229)
					eye.scale.set(1, 0.8, 0.42)
					eyes.push(eye)
					const brow = addMesh(new THREE.BoxGeometry(0.075, 0.016, 0.018), hairMat, side * 0.088, 1.978, 0.226)
					brow.rotation.z = side * -0.08
				})
				const nose = addMesh(new THREE.ConeGeometry(0.03, 0.075, 7), skinMat, 0, 1.86, 0.258)
				nose.rotation.x = Math.PI / 2
				const mouth = addMesh(new THREE.BoxGeometry(0.09, 0.014, 0.018), material(0x8c4d43, 0.8), 0, 1.79, 0.235)
				mouth.rotation.z = -0.02

				const hairCap = addMesh(new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat, 0, 2.00, -0.005)
				hairCap.scale.set(0.96, 0.86, 0.96)
				const headwear = skin.headwear || 'hair-bun'
				if (headwear === 'hair-bun') {
					addMesh(new THREE.SphereGeometry(0.105, 10, 8), hairMat, 0, 2.10, -0.20)
				} else if (headwear === 'skullcap') {
					addMesh(new THREE.CylinderGeometry(0.235, 0.265, 0.14, 12), material(hatColor, 0.84), 0, 2.105, 0)
					addMesh(new THREE.SphereGeometry(0.085, 9, 7), material(hatColor, 0.84), 0, 2.19, 0)
				} else if (headwear === 'scholar-scarf') {
					addMesh(new THREE.BoxGeometry(0.43, 0.16, 0.31), material(hatColor, 0.84), 0, 2.12, -0.01)
					;[-1, 1].forEach((side) => {
						const tail = addMesh(new THREE.BoxGeometry(0.08, 0.32, 0.055), material(hatColor, 0.88), side * 0.13, 1.99, -0.22)
						tail.rotation.z = side * 0.12
					})
				} else if (headwear === 'guard-cap') {
					addMesh(new THREE.CylinderGeometry(0.31, 0.31, 0.045, 14), material(hatColor, 0.88), 0, 2.08, 0)
					addMesh(new THREE.ConeGeometry(0.26, 0.24, 12), material(hatColor, 0.78), 0, 2.22, 0)
				} else {
					const cap = addMesh(new THREE.CylinderGeometry(0.22, 0.27, headwear === 'merchant-crown' ? 0.27 : 0.19, 12), material(hatColor, 0.72), 0, 2.15, 0)
					cap.scale.z = headwear === 'festival-cap' ? 1.08 : 1
					addMesh(new THREE.SphereGeometry(0.06, 9, 7), trimMat, 0, headwear === 'merchant-crown' ? 2.34 : 2.28, 0)
				}

				/* 配饰决定职业辨识度，均保持在身体碰撞盒内，不改变移动判定。 */
				let tassel = null
				if (skin.accessory === 'satchel') {
					const bag = addMesh(new THREE.BoxGeometry(0.30, 0.34, 0.16), material(0x51301f, 0.92), 0.39, 0.84, -0.03)
					bag.rotation.z = -0.08
					const strap = addMesh(new THREE.TorusGeometry(0.43, 0.022, 5, 20, Math.PI * 1.38), material(0x69452d, 0.9), 0, 1.23, 0)
					strap.rotation.set(Math.PI / 2, 0.2, -0.72)
				} else if (skin.accessory === 'ledger' || skin.accessory === 'scroll') {
					const caseMat = skin.accessory === 'scroll' ? material(0xe2d1aa, 0.9) : material(0x4c2c20, 0.92)
					const caseMesh = addMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.62, 9), caseMat, 0.37, 0.92, -0.17)
					caseMesh.rotation.z = 0.16
				} else if (skin.accessory === 'scabbard') {
					const scabbard = addMesh(new THREE.CylinderGeometry(0.045, 0.065, 0.92, 8), material(0x241b18, 0.74, false, { metalness: 0.1 }), -0.38, 0.72, -0.08)
					scabbard.rotation.z = -0.26
					addMesh(new THREE.BoxGeometry(0.30, 0.055, 0.08), trimMat, -0.49, 1.13, -0.08).rotation.z = -0.26
				} else if (skin.accessory === 'jade' || skin.accessory === 'seal') {
					const pendant = addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, skin.accessory === 'seal' ? 4 : 12), material(skin.accessory === 'jade' ? 0x78a58d : trimColor, 0.46, false, { metalness: 0.16 }), 0, 1.08, 0.39)
					pendant.rotation.x = Math.PI / 2
				} else if (skin.accessory === 'tassel') {
					tassel = new THREE.Group()
					tassel.position.set(0.23, 1.15, 0.37)
					group.add(tassel)
					addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), trimMat, 0, -0.16, 0, tassel)
					addMesh(new THREE.SphereGeometry(0.052, 8, 6), trimMat, 0, -0.34, 0, tassel)
				}

				if (skin.pattern === 'brocade') {
					const panelMat = material(0xffffff, 0.68, true)
					const chestPanel = addMesh(new THREE.BoxGeometry(0.34, 0.48, 0.032), panelMat, 0, 1.28, 0.345)
					chestPanel.rotation.z = silhouette === 'festival' ? -0.04 : 0
				}
				if (silhouette === 'legend') {
					;[-1, 1].forEach((side) => addMesh(new THREE.BoxGeometry(0.25, 0.075, 0.30), trimMat, side * 0.36, 1.59, 0))
				}

				const contactShadow = addMesh(
					new THREE.CircleGeometry(0.52, 20),
					new THREE.MeshBasicMaterial({ color: 0x17130f, transparent: true, opacity: 0.25, depthWrite: false }),
					0, 0.012, 0
				)
				contactShadow.rotation.x = -Math.PI / 2
				contactShadow.scale.set(1, 0.58, 1)
				contactShadow.castShadow = false

				if (skin.accent) {
					const accentColor = colorHex(skin.accent, 0xFFD700)
					const halo = addMesh(new THREE.TorusGeometry(0.46, 0.035, 8, 28), new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.62, roughness: 0.5 }), 0, 0.065, 0)
					halo.rotation.x = Math.PI / 2
					halo.castShadow = false
				}

				const spawn = currentWorldLayout?.spawn || { x: 0, z: 13 }
				group.position.set(spawn.x, 0, spawn.z)
				group.rotation.y = Math.PI
				group.scale.y = shape.height
				group.userData = { leftLeg, rightLeg, leftArm, rightArm, body: torso, robe, head, eyes, tassel, modelVersion: 2, silhouette, procedural: true }
				scene.add(group)
				player = group
				if (camera && !cameraTargetVec) {
					cameraTargetVec = new THREE.Vector3(group.position.x, 1.24, group.position.z)
					cameraPositionVec = new THREE.Vector3()
					const horizontalDistance = Math.cos(cameraPitch) * cameraDistance
					cameraPositionVec.set(group.position.x + Math.sin(cameraYaw) * horizontalDistance, 1.2 + Math.sin(cameraPitch) * cameraDistance, group.position.z + Math.cos(cameraYaw) * horizontalDistance)
					camera.position.copy(cameraPositionVec)
					camera.lookAt(cameraTargetVec)
				}
			} catch (err) {
				/* 单个高级部件在旧 WebView 不兼容时，保留原低模作为可玩性兜底。 */
				this.createLegacyPlayer()
			}
		},
		async tryLoadPlayerModel(modelPath = PLAYER_MODEL_PATH) {
			const generation = ++playerModelGeneration
			try {
				if (!THREE.GLTFLoader) await this.loadScript('static/libs/GLTFLoader.js')
				if (!THREE.SkeletonUtils) await this.loadScript('static/libs/SkeletonUtils.js')
				const buffer = playerModelBufferCache?.path === modelPath ? playerModelBufferCache.buffer : await this.readBinaryAsset(modelPath)
				playerModelBufferCache = { path: modelPath, buffer }
				if (generation !== playerModelGeneration || !scene) return
				const gltf = await new Promise((resolve, reject) => new THREE.GLTFLoader().parse(buffer, '', resolve, reject))
				gltf.scene.traverse((item) => {
					const materials = Array.isArray(item.material) ? item.material : [item.material]
					materials.filter(Boolean).forEach((material) => {
						;['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach((key) => {
							if (material[key]) material[key].userData.playerModelOwned = true
						})
					})
				})
				if (generation !== playerModelGeneration || !scene) { this.disposeObjectResources(gltf.scene); return }
				const root = gltf.scene
				root.name = 'pingyao-player-gltf'
				root.scale.setScalar(1.15)
				root.traverse((item) => { if (item.isMesh) { item.castShadow = true; item.frustumCulled = false } })
				root.userData.detailed = Boolean(root.getObjectByName('Face_Skin'))
				if (root.getObjectByName('Robe_Upper')) {
					root.scale.setScalar(1)
					Object.assign(root.userData, { detailed: true, rigType: 'human', gait: HUMAN_GAIT_SPEED, moveSpeed: HUMAN_MOVE_SPEED })
				}
				this.shareCharacterSkeletons(root)
				this.applyGlbSkin(root, playerSkinData || {})
				this.applyEnvironmentIntensity(root, phaseVisualState.environment)
				this.upgradePedestrians(root, gltf.animations)
				const mixer = new THREE.AnimationMixer(root)
				const actions = {}
				;(gltf.animations || []).forEach((clip) => {
					const key = /run/i.test(clip.name) ? 'run' : /walk/i.test(clip.name) ? 'walk' : /^idle$/i.test(clip.name) ? 'idle' : ''
					if (key && !actions[key]) actions[key] = mixer.clipAction(clip)
				})
				const gestureClip = (gltf.animations || []).find((clip) => /interact|wave/i.test(clip.name))
					|| (gltf.animations || []).find((clip) => /cheer/i.test(clip.name))
				if (gestureClip) actions.wave = mixer.clipAction(gestureClip)
				if (!actions.idle || !actions.walk) { mixer.stopAllAction(); this.disposeObjectResources(root); return }
				const oldPlayer = player
				root.position.copy(oldPlayer.position)
				root.position.y = .08
				root.rotation.copy(oldPlayer.rotation)
				scene.add(root)
				scene.remove(oldPlayer)
				this.disposeObjectResources(oldPlayer)
				for (const key of ['idle', 'walk', 'run']) actions[key]?.play().setEffectiveWeight(key === 'idle' ? 1 : 0)
				root.userData = { ...root.userData, isGltf: true, mixer, actions, activeAction: actions.idle, modelVersion: 5, gestureTime: 0, collisionRadius: (root.userData.rigType === 'human' ? HUMAN_COLLISION_RADIUS : CHARACTER_COLLISION_RADIUS).player }
				this.prepareCharacterDeformation(root)
				animationMixers.push(mixer)
				player = root
				this.applyEnvironmentIntensity(scene, phaseVisualState.environment)
			} catch (_) { /* 程序化角色已经可玩，模型失败无需打断加载。 */ }
		},
		shareCharacterSkeletons(root) {
			// GLTFLoader creates one Skeleton per skinned mesh even when every mesh uses the same bones,
			// so a 49-part character updates 49 skeletons and uploads 49 bone textures per frame.
			const shared = new Map()
			root.traverse(mesh => {
				if (!mesh.isSkinnedMesh) return
				const key = mesh.skeleton.bones.map(bone => bone.uuid).join(',')
				if (!shared.has(key)) { shared.set(key, mesh.skeleton); return }
				const previous = mesh.skeleton
				mesh.bind(shared.get(key), mesh.bindMatrix)
				previous.dispose()
			})
		},
		upgradePedestrians(source, clips) {
			if (!source.userData.detailed || !THREE.SkeletonUtils) return
			const clip = clips.find(item => /^Walking_A$/i.test(item.name))
			if (!clip) return
			source.updateMatrixWorld(true)
			ambientActors = ambientActors.map((old, index) => {
				if (old.userData.kind !== 'pedestrian') return old
				const actor = THREE.SkeletonUtils.clone(source)
				actor.name = 'pingyao-pedestrian-' + index
				const materialCopies = new Map()
				const skeletonCopies = new Map()
				actor.traverse(mesh => {
					if (!mesh.isMesh) return
					mesh.geometry = mesh.geometry.clone()
					if (mesh.isSkinnedMesh) {
						const key = mesh.skeleton.bones.map(bone => bone.uuid).join(',')
						if (!skeletonCopies.has(key)) skeletonCopies.set(key, mesh.skeleton)
						mesh.bind(skeletonCopies.get(key), mesh.bindMatrix)
					}
					if (!materialCopies.has(mesh.material)) materialCopies.set(mesh.material, mesh.material.clone())
					mesh.material = materialCopies.get(mesh.material)
				})
				this.applyGlbSkin(actor, { body: index % 2 ? '#587269' : '#64737d', robe: index % 2 ? '#354a41' : '#434d57', head: '#d8b18d', trim: '#c2ba9e', headwear: index % 2 ? 'scholar-scarf' : 'skullcap', accessory: index % 2 ? 'scroll' : 'ledger' })
				actor.scale.setScalar(.93 + index*.035); actor.position.copy(old.position); actor.position.y = .08
				actor.rotation.copy(old.rotation)
				const mixer = new THREE.AnimationMixer(actor), action = mixer.clipAction(clip).play()
				const idle = mixer.clipAction(clips.find(item=>item.name==='Idle')).play().setEffectiveWeight(0)
				const gait = source.userData.gait || CHARACTER_GAIT_SPEED
				action.timeScale = old.userData.speed / (gait.walk * actor.scale.x)
				action.time = (index * .37 % 1) * clip.duration
				actor.userData = { ...old.userData, rigType: source.userData.rigType, kind: 'rigged-pedestrian', gait, mixer, action, idle, expressionOffset: .73 + index * 1.37, collisionRadius: (source.userData.rigType === 'human' ? HUMAN_COLLISION_RADIUS : CHARACTER_COLLISION_RADIUS).pedestrian * actor.scale.x }
				this.prepareCharacterDeformation(actor)
				actor.updateMatrixWorld(true)
				animationMixers.push(mixer); old.removeFromParent(); this.disposeObjectResources(old); scene.add(actor)
				return actor
			})
		},
		applyGlbSkin(root, skin) {
			if (root.userData.rigType === 'human') return this.applyHumanSkin(root, skin)
			if (root.userData.detailed) {
				const slots = { Cloth: skin.body || '#8B4513', Robe: skin.robe || skin.body || '#754019', Trim: skin.trim || '#D2B48C', Skin: skin.head || '#e1b996', Hat: skin.hat || '#302d29' }
				root.scale.setScalar(1)
				const materials = new Set()
				root.traverse((mesh) => {
					if (!mesh.isMesh) return
					const mat = mesh.material
					if (!materials.has(mat)) {
						materials.add(mat)
						if (slots[mat.name]) {
							mat.color.set(slots[mat.name])
							if (THREE.ColorManagement?.legacyMode !== false) mat.color.convertSRGBToLinear()
						}
						if (['Cloth', 'Robe', 'Hat'].includes(mat.name)) {
							mat.bumpMap = this.makeClothWeaveTexture(); mat.bumpScale = 0.003
							mat.roughness = mat.name === 'Robe' && skin.pattern === 'brocade' ? 0.65 : 0.89
							mat.map = mat.name === 'Robe' && skin.pattern === 'brocade' ? this.getBrocadeTexture() : this.getCourtyardTexture('cloth')
							mat.userData.useBrocade = mat.name === 'Robe' && skin.pattern === 'brocade'
						}
						mat.needsUpdate = true
					}
					if (mesh.name.startsWith('hw_')) mesh.visible = mesh.name.replace(/_\d+$/, '') === 'hw_' + (skin.headwear || 'hair-bun')
					if (mesh.name.startsWith('acc_')) mesh.visible = mesh.name.replace(/_\d+$/, '') === 'acc_' + (skin.accessory || 'satchel')
				})
				return
			}
			const slots = { Cloth: skin.body, Robe: skin.robe || skin.body, Trim: skin.trim, Skin: skin.head, Hair: skin.hat, Hat: skin.hat }
			const proportions = { traveler: [0.98, 1], clerk: [1, 1.01], scholar: [0.97, 1.04], escort: [1.06, 1.03], merchant: [1.04, 1], festival: [1.08, 1.03], legend: [1.1, 1.06] }
			const [width, height] = proportions[skin.silhouette] || proportions.traveler
			root.scale.set(1.15 * width, 1.15 * height, 1.15 * width)
			root.traverse((item) => {
				if (!item.isMesh) return
				const slot = Object.keys(slots).find((name) => item.name.includes(name) || item.material?.name?.includes(name))
					|| (/Head/i.test(item.name) ? 'Skin' : /Hat/i.test(item.name) ? 'Hat' : /Body|Arm/i.test(item.name) ? 'Cloth' : /Leg|Cape/i.test(item.name) ? 'Robe' : '')
				if (slot && slots[slot] && item.material?.color) {
					const previous = item.material
					item.material = previous.clone()
					item.material.userData.pingyaoSkinClone = true
					item.material.color.set(slots[slot])
					if (slot === 'Robe' && skin.pattern === 'brocade') {
						item.material.map = this.getBrocadeTexture()
						item.material.userData.useBrocade = true
					}
					if (previous.userData?.pingyaoSkinClone) previous.dispose()
				}
				if (item.name.startsWith('hw_')) item.visible = item.name === 'hw_' + skin.headwear
				if (item.name.startsWith('acc_')) item.visible = item.name === 'acc_' + skin.accessory
				if (/Spellbook|Wand|Staff|Mage_Cape|Mage_Hat/.test(item.name)) item.visible = false
			})
			this.attachHanfuToRig(root, skin)
		},
		applyHumanSkin(root, skin) {
			// 写实人体的皮肤、发色、眼睛自带贴图，不按 skin.head 着色；织物是中性色可平铺贴图，只乘服饰色。
			const tints = { Cloth: skin.body || '#8B4513', Robe: skin.robe || skin.body || '#754019', Trim: skin.trim || '#D2B48C', Hat: skin.hat || '#26211d', Belt: skin.accent || skin.hat || '#3a2418' }
			const sleeve = 'sl_' + (HUMAN_SLEEVE[skin.sleeve] || 'formal')
			const hem = 'ol_' + (HUMAN_HEM[skin.silhouette] || 'long')
			const beard = skin.beard ?? ['merchant', 'legend', 'escort'].includes(skin.silhouette)
			const tinted = new Set()
			root.traverse((item) => {
				const part = item.name.replace(/_\d+$/, '')
				if (part.startsWith('hw_')) item.visible = part === 'hw_' + (skin.headwear || 'hair-bun')
				else if (part.startsWith('acc_')) item.visible = part === 'acc_' + (skin.accessory || 'satchel')
				else if (part.startsWith('sl_')) item.visible = part === sleeve
				else if (part.startsWith('ol_')) item.visible = part === hem
				else if (part === 'Trousers') item.visible = hem === 'ol_short'
				else if (part === 'fh_goatee') item.visible = beard
				if (!item.isMesh || tinted.has(item.material)) return
				const mat = item.material
				tinted.add(mat)
				if (tints[mat.name]) {
					mat.color.set(tints[mat.name])
					if (THREE.ColorManagement?.legacyMode !== false) mat.color.convertSRGBToLinear()
				}
				// 锦袍略提亮泽，与素布拉开质感差距。
				if (mat.name === 'Cloth' || mat.name === 'Robe') mat.roughness = skin.pattern === 'brocade' ? .58 : .8
			})
		},
		attachHanfuToRig(root, skin) {
			const stale = []
			root.traverse((item) => { if (item.userData?.pingyaoAttachment) stale.push(item) })
			stale.forEach((item) => { item.removeFromParent(); this.disposeObjectResources(item) })
			const findBone = (pattern) => {
				let found = null
				root.traverse((item) => { if (!found && item.isBone && pattern.test(item.name)) found = item })
				return found
			}
			const hips = findBone(/^hips$/i) || root
			const head = findBone(/^head$/i) || root
			const hand = findBone(/^hand\.r$/i) || hips
			const robeColor = colorHex(skin.robe || skin.body, 0x8B4513)
			const trimColor = colorHex(skin.trim, 0xD4A574)
			const robeMat = new THREE.MeshStandardMaterial({ color: skin.pattern === 'brocade' ? 0xF5F0E8 : robeColor, map: skin.pattern === 'brocade' ? this.getBrocadeTexture() : null, roughness: 0.86, side: THREE.DoubleSide, flatShading: true })
			robeMat.userData.useBrocade = skin.pattern === 'brocade'
			const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, skin.silhouette === 'festival' || skin.silhouette === 'legend' ? 0.52 : 0.44, skin.silhouette === 'escort' ? 0.5 : 0.72, 12, 1, true), robeMat)
			robe.position.set(0, -0.25, 0); robe.userData.pingyaoAttachment = true; robe.name = 'Robe_Attachment'; hips.add(robe)
			const sash = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 7, 18), new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.62, metalness: 0.08 }))
			sash.rotation.x = Math.PI / 2; sash.position.y = 0.08; sash.userData.pingyaoAttachment = true; hips.add(sash)
			const hatMat = new THREE.MeshStandardMaterial({ color: colorHex(skin.hat, 0x29241f), roughness: 0.88, flatShading: true })
			const hat = new THREE.Group(); hat.name = 'hw_' + (skin.headwear || 'hair-bun'); hat.userData.pingyaoAttachment = true
			const brim = new THREE.Mesh(new THREE.CylinderGeometry(skin.headwear === 'guard-cap' ? 0.34 : 0.25, 0.27, 0.1, 12), hatMat); brim.position.y = 0.17; hat.add(brim)
			const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, skin.headwear === 'merchant-crown' ? 0.34 : 0.2, 10), hatMat); crown.position.y = 0.3; hat.add(crown)
			hat.position.set(0, 0.16, 0); head.add(hat)
			const eyelidMat = new THREE.MeshBasicMaterial({ color: colorHex(skin.head, 0xD4A574), transparent: true, opacity: 0, depthWrite: false })
			const eyelids = []
			;[-1, 1].forEach((side) => {
				const eyelid = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.028), eyelidMat)
				eyelid.position.set(side * 0.085, 0.055, 0.205); eyelid.userData = { pingyaoAttachment: true, isEyelid: true }; head.add(eyelid); eyelids.push(eyelid)
			})
			root.userData.eyes = eyelids
			if (skin.accessory) {
				const accessory = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, skin.accessory === 'scroll' ? 0.5 : 0.32, 8), new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.7 }))
				accessory.name = 'acc_' + skin.accessory; accessory.rotation.z = Math.PI / 2; accessory.position.set(0, -0.1, 0.08); accessory.userData.pingyaoAttachment = true; hand.add(accessory)
			}
		},
		disposeObjectResources(root) {
			const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set()
			root?.traverse((item) => {
				if (item.skeleton) skeletons.add(item.skeleton)
				if (item.geometry) geometries.add(item.geometry)
				;(Array.isArray(item.material) ? item.material : [item.material]).filter(Boolean).forEach((material) => {
					materials.add(material)
					;['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach((key) => { if (material[key]?.userData?.playerModelOwned) textures.add(material[key]) })
				})
			})
			geometries.forEach((geometry) => geometry.dispose())
			materials.forEach((material) => material.dispose())
			textures.forEach((texture) => texture.dispose())
			skeletons.forEach((skeleton) => skeleton.dispose())
		},
		createLegacyPlayer() {
			// 化身按已装备服饰着色：body/head 必有，robe（长衫下摆）/hat（冠帽）/accent（足部光环）按服饰可选，
			// 让「换装」在第一视角街景里真实可见。playerSkinData 为 null 时回退默认票号行客配色。
			const skin = playerSkinData || {}
			const group = new THREE.Group()
			const bodyColor = colorHex(skin.body, 0x8B4513)
			const clothMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.76, flatShading: true })
			const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x29241F, roughness: 0.9, flatShading: true })

			const body = new THREE.Mesh(
				new THREE.CylinderGeometry(0.32, 0.38, 1.2, 8),
				clothMaterial
			)
			body.position.y = 1.02
			body.castShadow = true
			group.add(body)

			const contactShadow = new THREE.Mesh(
				new THREE.CircleGeometry(0.52, 18),
				new THREE.MeshBasicMaterial({ color: 0x17130f, transparent: true, opacity: 0.24, depthWrite: false })
			)
			contactShadow.rotation.x = -Math.PI / 2
			contactShadow.position.y = 0.012
			contactShadow.scale.set(1, 0.58, 1)
			group.add(contactShadow)

			const sash = new THREE.Mesh(
				new THREE.TorusGeometry(0.355, 0.045, 6, 16),
				new THREE.MeshStandardMaterial({ color: 0x37241a, roughness: 0.82, flatShading: true })
			)
			sash.rotation.x = Math.PI / 2
			sash.position.y = 0.9
			group.add(sash)

			const collar = new THREE.Mesh(
				new THREE.TorusGeometry(0.255, 0.045, 6, 14, Math.PI * 1.25),
				new THREE.MeshStandardMaterial({ color: 0xe0c59a, roughness: 0.82, flatShading: true })
			)
			collar.rotation.set(Math.PI / 2, 0, -Math.PI * 0.12)
			collar.position.set(0, 1.58, -0.02)
			group.add(collar)

			/* 四肢使用关节组作为旋转轴，行走时只旋转关节，不改世界坐标。 */
			const makeLimb = (x, y, length, radius, material, isLeg) => {
				const pivot = new THREE.Group()
				pivot.position.set(x, y, 0)
				const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, length, 7), material)
				limb.position.y = -length / 2
				limb.castShadow = true
				pivot.add(limb)
				if (isLeg) {
					const shoe = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.3, 0.14, 0.34), shoeMaterial)
					shoe.position.set(0, -length + 0.02, -0.07)
					shoe.castShadow = true
					pivot.add(shoe)
				}
				group.add(pivot)
				return pivot
			}
			const leftLeg = makeLimb(-0.17, 0.54, 0.58, 0.12, clothMaterial, true)
			const rightLeg = makeLimb(0.17, 0.54, 0.58, 0.12, clothMaterial, true)
			const leftArm = makeLimb(-0.39, 1.43, 0.68, 0.1, clothMaterial, false)
			const rightArm = makeLimb(0.39, 1.43, 0.68, 0.1, clothMaterial, false)

			/* 长衫下摆：装备含 robe 时加一圈锥形裙摆，远看即知换了身衣裳 */
			if (skin.robe) {
				const robe = new THREE.Mesh(
					new THREE.ConeGeometry(0.52, 0.95, 10, 1, true),
					new THREE.MeshStandardMaterial({ color: colorHex(skin.robe, colorHex(skin.body, 0x8B4513)), roughness: 0.7, side: THREE.DoubleSide, flatShading: true })
				)
				robe.position.y = 0.78
				group.add(robe)
			}

			const head = new THREE.Mesh(
				new THREE.SphereGeometry(0.26, 10, 8),
				new THREE.MeshStandardMaterial({ color: colorHex(skin.head, 0xD4A574), roughness: 0.6, flatShading: true })
			)
			head.position.y = 1.82
			head.castShadow = true
			group.add(head)

			if (!skin.hat) {
				const hairCap = new THREE.Mesh(
					new THREE.SphereGeometry(0.268, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.52),
					new THREE.MeshStandardMaterial({ color: 0x30251f, roughness: 0.9, flatShading: true })
				)
				hairCap.position.y = 1.96
				hairCap.castShadow = true
				group.add(hairCap)
			}

			/* 冠帽：装备含 hat 时戴一顶（账房瓜皮帽 / 镖师笠帽 / 书生纶巾等以颜色区分） */
			if (skin.hat) {
				const hat = new THREE.Mesh(
					new THREE.ConeGeometry(0.3, 0.32, 10),
					new THREE.MeshStandardMaterial({ color: colorHex(skin.hat, 0x2c2c2c), roughness: 0.6, flatShading: true })
				)
				hat.position.y = 2.13
				hat.castShadow = true
				group.add(hat)
			}

			/* 服饰光环：稀有服饰（accent）在足下加一圈发光环，凸显尊贵（夜里配合 Bloom 更亮） */
			if (skin.accent) {
				const halo = new THREE.Mesh(
					new THREE.TorusGeometry(0.42, 0.05, 8, 22),
					new THREE.MeshStandardMaterial({ color: colorHex(skin.accent, 0xFFD700), emissive: colorHex(skin.accent, 0xFFD700), emissiveIntensity: 0.85, flatShading: true })
				)
				halo.rotation.x = Math.PI / 2
				halo.position.y = 0.07
				group.add(halo)
			}

			const spawn = currentWorldLayout?.spawn || { x: 0, z: 13 }
			group.position.set(spawn.x, 0, spawn.z)
			group.userData.leftLeg = leftLeg
			group.userData.rightLeg = rightLeg
			group.userData.leftArm = leftArm
			group.userData.rightArm = rightArm
			group.userData.body = body
			group.userData.head = head
			scene.add(group)
			player = group
			if (camera && !cameraTargetVec) {
				cameraTargetVec = new THREE.Vector3(group.position.x, 1.24, group.position.z)
				cameraPositionVec = new THREE.Vector3()
				const horizontalDistance = Math.cos(cameraPitch) * cameraDistance
				cameraPositionVec.set(
					group.position.x + Math.sin(cameraYaw) * horizontalDistance,
					1.2 + Math.sin(cameraPitch) * cameraDistance,
					group.position.z + Math.cos(cameraYaw) * horizontalDistance
				)
				camera.position.copy(cameraPositionVec)
				camera.lookAt(cameraTargetVec)
			}
		},
		/* 热换装：按新皮肤重建玩家化身，不重载整场景；保留当前所在位置（不把玩家弹回出生点）。 */
		reskinPlayer(skin) {
			if (!scene) return
			playerSkinData = skin || null
			if (player?.userData?.isGltf) {
				this.applyGlbSkin(player, playerSkinData)
				return
			}
			const prevPos = player ? { x: player.position.x, y: player.position.y, z: player.position.z } : null
			if (player) {
				scene.remove(player)
				this.disposeObjectResources(player)
				player = null
			}
			this.createPlayer()
			if (prevPos && player) player.position.set(prevPos.x, prevPos.y, prevPos.z)
		},
		createDecorations(streetData, worldLayout) {
			/* 所有街区共用坐标模型，但以主题陈设建立票号、县衙、书院、市集、灯街的辨识度。 */
			const fallbackDecorPlan = [
				{ kind: 'lantern-post', x: -5.15, z: 10, side: -1 },
				{ kind: 'lantern-post', x: 5.15, z: 10, side: 1 },
				{ kind: 'banner', x: -5.25, z: 2.5, side: -1 },
				{ kind: 'hanging-sign', x: 5.25, z: 0.5, side: 1 },
				{ kind: 'potted', x: -5.18, z: -4, side: -1 },
				{ kind: 'stone-step', x: 5.22, z: -5, side: 1 },
				{ kind: 'wind-chime', x: -5.55, z: 6, side: -1 },
				{ kind: 'wind-chime', x: 5.55, z: -7, side: 1 }
			]
			const decorPlan = worldLayout?.setPieces?.length ? worldLayout.setPieces : fallbackDecorPlan

			decorPlan.forEach((d) => {
				const group = new THREE.Group()

				if (d.kind === 'lantern-post') {
					const reach = -d.side * 0.72
					const post = new THREE.Mesh(
						new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6),
						new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9, flatShading: true })
					)
					post.position.y = 1.3
					group.add(post)

					/* 挑杆横木：从灯柱顶端探出，灯笼悬于杆端 */
					const arm = new THREE.Mesh(
						new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6),
						new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9, flatShading: true })
					)
					arm.rotation.z = Math.PI / 2
					arm.position.set(reach * 0.5, 2.55, 0)
					group.add(arm)

					const lantern = new THREE.Mesh(
						new THREE.SphereGeometry(0.36, 12, 10),
						new THREE.MeshStandardMaterial({
							color: this.makeSceneColor(0xC41E3A),
							emissive: this.makeSceneColor(0xff752e),
							emissiveIntensity: 0.22,
							roughness: .83,
							flatShading: false
						})
					)
					lantern.position.set(reach, 2.35, 0)
					group.add(lantern)
					const ribs = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.018, 5, 16), new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.72 }))
					ribs.position.copy(lantern.position); ribs.rotation.x = Math.PI / 2; group.add(ribs)
					const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.makeLanternGlowTexture(), color: 0xD4A574, transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending }))
					halo.position.copy(lantern.position); halo.scale.set(1.45, 1.45, 1); halo.userData.isLanternHalo = true; group.add(halo)
					const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), new THREE.MeshBasicMaterial({ map: this.makeLanternGlowTexture(), color: 0xD4A574, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }))
					pool.position.set(reach, 0.018, 0); pool.rotation.x = -Math.PI / 2; pool.userData.isLanternPool = true; group.add(pool)
					// 灯穗
					const tassel = new THREE.Mesh(
						new THREE.ConeGeometry(0.06, 0.24, 6),
						new THREE.MeshStandardMaterial({ color: 0xE8B84B, emissive: 0x4a3200, roughness: 0.6, flatShading: true })
					)
					tassel.position.set(reach, 1.95, 0)
					group.add(tassel)
					const glow = new THREE.PointLight(0xffa85a, 0, 7.5, 2)
					glow.position.set(reach, 2.35, 0)
					glow.castShadow = false
					group.add(glow)
					lanternLights.push(glow)
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
							color: this.makeSceneColor(0xC41E3A),
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
				} else if (d.kind === 'potted') {
					/* 盆栽：陶盆 + 几丛叶团 */
					const pot = new THREE.Mesh(
						new THREE.CylinderGeometry(0.26, 0.18, 0.4, 10),
						new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9, flatShading: true })
					)
					pot.position.y = 0.2
					group.add(pot)
					const leafColors = [0x4f7a1f, 0x6b8e23, 0x3f6b1a]
					for (let i = 0; i < 3; i++) {
						const leaf = new THREE.Mesh(
							new THREE.IcosahedronGeometry(0.3 + i * 0.06, 0),
							new THREE.MeshStandardMaterial({ color: leafColors[i % leafColors.length], roughness: 0.9, flatShading: true })
						)
						leaf.position.set((i - 1) * 0.18, 0.55 + i * 0.16, (i - 1) * 0.12)
						group.add(leaf)
					}
				} else if (d.kind === 'stone-step') {
					/* 石阶：三级渐窄青石台阶 */
					const stepMat = new THREE.MeshStandardMaterial({ color: 0x8f8f82, roughness: 0.96, flatShading: true })
					for (let i = 0; i < 3; i++) {
						const w = 1.6 - i * 0.36
						const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.7 - i * 0.14), stepMat)
						step.position.set(0, 0.09 + i * 0.18, -i * 0.22)
						step.receiveShadow = true
						group.add(step)
					}
				} else if (d.kind === 'hanging-sign') {
					/* 招幌：竖立木杆 + 竖向招牌 + 飘穗，区别于旗幡 */
					const pole = new THREE.Mesh(
						new THREE.CylinderGeometry(0.06, 0.07, 3.4, 6),
						new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.88, flatShading: true })
					)
					pole.position.y = 1.7
					group.add(pole)
					const board = new THREE.Mesh(
						new THREE.BoxGeometry(0.46, 1.5, 0.08),
						new THREE.MeshStandardMaterial({
							color: 0xC41E3A,
							emissive: 0x3a0a14,
							emissiveIntensity: 0.2,
							roughness: 0.7,
							flatShading: true
						})
					)
					board.position.set(0.3, 2.4, 0)
					group.add(board)
					const trim = new THREE.Mesh(
						new THREE.BoxGeometry(0.5, 0.12, 0.1),
						new THREE.MeshStandardMaterial({ color: 0xE8B84B, emissive: 0x3a2c00, roughness: 0.5, flatShading: true })
					)
					trim.position.set(0.3, 3.18, 0)
					group.add(trim)
					group.userData.isSign = true
				} else if (d.kind === 'wind-chime') {
					/* 檐角风铃：悬线 + 小铃铛，随风轻摆 */
					const line = new THREE.Mesh(
						new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4),
						new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.9, flatShading: true })
					)
					line.scale.y = 2.2
					line.position.y = 2.7
					group.add(line)
					const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.07), line.material)
					hook.position.set(-d.side * 0.2, 3.25, 0)
					group.add(hook)
					const bell = new THREE.Mesh(
						new THREE.ConeGeometry(0.1, 0.18, 8),
						new THREE.MeshStandardMaterial({ color: 0xC9A227, emissive: 0x2a2000, roughness: 0.45, metalness: 0.55, flatShading: true })
					)
					bell.position.y = 2.1
					group.add(bell)
					const clapper = new THREE.Mesh(
						new THREE.SphereGeometry(0.04, 6, 6),
						new THREE.MeshStandardMaterial({ color: 0xE8B84B, roughness: 0.5, metalness: 0.5 })
					)
					clapper.position.y = 1.98
					group.add(clapper)
					group.userData.isWindChime = true
				} else if (d.kind === 'ledger-chest') {
					const chestMat = new THREE.MeshStandardMaterial({ color: 0x4b2c1d, roughness: 0.86, flatShading: true })
					const brassMat = new THREE.MeshStandardMaterial({ color: 0x9d7939, roughness: 0.5, metalness: 0.38 })
					const chest = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.72), chestMat)
					chest.position.y = 0.31
					chest.castShadow = true
					group.add(chest)
					;[-0.42, 0.42].forEach((x) => {
						const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.68, 0.76), brassMat)
						band.position.set(x, 0.34, 0)
						group.add(band)
					})
					const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.08), brassMat)
					lock.position.set(0, 0.38, 0.4)
					group.add(lock)
				} else if (d.kind === 'stone-lion') {
					const stoneMat = new THREE.MeshStandardMaterial({ color: 0x76766f, roughness: 1, flatShading: true })
					const base = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.28, 0.78), stoneMat)
					base.position.y = 0.14
					base.receiveShadow = true
					group.add(base)
					const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), stoneMat)
					body.scale.set(0.9, 1.25, 0.8)
					body.position.y = 0.58
					body.castShadow = true
					group.add(body)
					const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 1), stoneMat)
					head.position.set(0, 1.02, -d.side * 0.06)
					head.castShadow = true
					group.add(head)
					;[-1, 1].forEach((side) => {
						const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), stoneMat)
						paw.position.set(side * 0.22, 0.38, -d.side * 0.25)
						group.add(paw)
					})
				} else if (d.kind === 'stele') {
					const stoneMat = new THREE.MeshStandardMaterial({ color: 0x686963, roughness: 1, flatShading: true })
					const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 0.72), stoneMat)
					base.position.y = 0.16
					group.add(base)
					const slab = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.55, 0.2), stoneMat)
					slab.position.y = 1.06
					slab.castShadow = true
					group.add(slab)
					const cap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 0.34), stoneMat)
					cap.position.y = 1.88
					group.add(cap)
				} else if (d.kind === 'book-stall') {
					const woodMat = new THREE.MeshStandardMaterial({ color: 0x513120, roughness: 0.9, flatShading: true })
					const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.82), woodMat)
					top.position.y = 0.88
					top.castShadow = true
					group.add(top)
					;[-1, 1].forEach((x) => {
						const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.62), woodMat)
						leg.position.set(x * 0.68, 0.42, 0)
						group.add(leg)
					})
					const bookColors = [0x6d2b28, 0x40594f, 0xb28a4a, 0x49433c]
					for (let i = 0; i < 5; i += 1) {
						const book = new THREE.Mesh(
							new THREE.BoxGeometry(0.3, 0.05 + (i % 2) * 0.02, 0.48),
							new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.9 })
						)
						book.position.set(-0.58 + i * 0.28, 0.99 + (i % 2) * 0.035, 0)
						group.add(book)
					}
				} else if (d.kind === 'market-stall') {
					const woodMat = new THREE.MeshStandardMaterial({ color: 0x4b2c1d, roughness: 0.9, flatShading: true })
					const clothMat = new THREE.MeshStandardMaterial({ color: 0x8c302a, roughness: 0.9, side: THREE.DoubleSide })
					const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.9), woodMat)
					counter.position.y = 0.82
					counter.castShadow = true
					group.add(counter)
					;[-1, 1].forEach((x) => {
						const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.25, 6), woodMat)
						pole.position.set(x * 0.78, 1.125, 0)
						group.add(pole)
					})
					const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.1, 1.18), clothMat)
					canopy.rotation.z = -d.side * 0.06
					canopy.position.y = 2.18
					canopy.castShadow = true
					group.add(canopy)
					;[-0.5, 0, 0.5].forEach((x, index) => {
						const crate = new THREE.Mesh(
							new THREE.BoxGeometry(0.34, 0.28 + index * 0.04, 0.34),
							new THREE.MeshStandardMaterial({ color: index === 1 ? 0x9a7040 : 0x69513a, roughness: 0.94 })
						)
						crate.position.set(x, 1.05, 0)
						group.add(crate)
					})
				} else if (d.kind === 'jar-stack') {
					const jarColors = [0x6f4b34, 0x8a5c38, 0x55483b]
					;[-0.34, 0, 0.34].forEach((x, index) => {
						const jar = new THREE.Mesh(
							new THREE.SphereGeometry(0.28 + index * 0.03, 10, 7),
							new THREE.MeshStandardMaterial({ color: jarColors[index], roughness: 0.92, flatShading: true })
						)
						jar.scale.y = 1.25
						jar.position.set(x, 0.35 + index * 0.03, 0)
						jar.castShadow = true
						group.add(jar)
					})
				} else if (['horse-post', 'mounting-stone', 'water-vat', 'well', 'bench', 'pickle-jars'].includes(d.kind)) {
					const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77766f, roughness: 0.98, flatShading: true })
					const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a321f, roughness: 0.9, flatShading: true })
					if (d.kind === 'horse-post') {
						const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.25, 7), stoneMat)
						post.position.y = 0.625; group.add(post)
						const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 14), stoneMat)
						ring.position.set(0, 0.94, 0.13); ring.rotation.x = Math.PI / 2; group.add(ring)
					} else if (d.kind === 'mounting-stone') {
						for (let i = 0; i < 2; i += 1) { const step = new THREE.Mesh(new THREE.BoxGeometry(0.9 - i * 0.2, 0.28, 0.62), stoneMat); step.position.set(0, 0.14 + i * 0.28, -i * 0.12); group.add(step) }
					} else if (d.kind === 'water-vat' || d.kind === 'pickle-jars') {
						const count = d.kind === 'pickle-jars' ? 3 : 1
						for (let i = 0; i < count; i += 1) { const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.62, 10), d.kind === 'pickle-jars' ? woodMat : stoneMat); vat.position.set((i - (count - 1) / 2) * 0.55, 0.31, 0); group.add(vat) }
					} else if (d.kind === 'well') {
						const well = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.66, 12, 1, true), stoneMat); well.position.y = 0.33; group.add(well)
						;[-1, 1].forEach((side) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.6, 6), woodMat); post.position.set(side * 0.62, 1.0, 0); group.add(post) })
						const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 6), woodMat); beam.rotation.z = Math.PI / 2; beam.position.y = 1.72; group.add(beam)
					} else {
						const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.42), woodMat); seat.position.y = 0.55; group.add(seat)
						;[-1, 1].forEach((side) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.55, 0.32), woodMat); leg.position.set(side * 0.52, 0.275, 0); group.add(leg) })
					}
				} else if (['wine-flag', 'door-curtain', 'drying-cloth', 'bird-cage', 'tea-stall'].includes(d.kind)) {
					const woodMat = new THREE.MeshStandardMaterial({ color: 0x4b291c, roughness: 0.9, flatShading: true })
					if (d.kind === 'bird-cage') {
						const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.65, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x8B4513, wireframe: true, roughness: 0.8 })); cage.position.y = 1.15; group.add(cage)
						const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 5), woodMat); hook.position.y = 0.72; group.add(hook)
					} else if (d.kind === 'tea-stall') {
						const table = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 0.72), woodMat); table.position.y = 0.78; group.add(table)
						;[-1, 1].forEach((x) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.55), woodMat); leg.position.set(x * 0.62, 0.38, 0); group.add(leg) })
						for (let i = -1; i <= 1; i += 1) { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.7 })); bowl.position.set(i * 0.35, 0.91, 0); group.add(bowl) }
					} else {
						const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 3, 6), woodMat); pole.position.y = 1.5; group.add(pole)
						const cloth = new THREE.Mesh(new THREE.PlaneGeometry(d.kind === 'drying-cloth' ? 1.8 : 0.62, d.kind === 'door-curtain' ? 1.65 : 1.35, 5, 4), new THREE.MeshStandardMaterial({ color: d.kind === 'wine-flag' ? 0xC41E3A : 0xD4A574, side: THREE.DoubleSide, roughness: 0.92 })); cloth.position.set(d.kind === 'drying-cloth' ? 0 : 0.35, 2.05, 0); cloth.userData.isWindCloth = true; group.add(cloth)
						group.userData.isBanner = true
					}
				} else if (d.kind === 'lantern-string') {
					const cable = new THREE.Mesh(
						new THREE.CylinderGeometry(0.018, 0.018, 9, 5),
						new THREE.MeshStandardMaterial({ color: 0x31231d, roughness: 0.92 })
					)
					cable.rotation.z = Math.PI / 2
					cable.position.y = 4.25
					group.add(cable)
					for (let i = -3; i <= 3; i += 1) {
						const lantern = new THREE.Mesh(
							new THREE.CylinderGeometry(0.18, 0.22, 0.45, 10),
							new THREE.MeshStandardMaterial({ color: 0xb73531, emissive: 0x8a1f1f, emissiveIntensity: 0.32, roughness: 0.56 })
						)
						lantern.position.set(i * 1.28, 3.88 - Math.abs(i) * 0.025, 0)
						group.add(lantern)
						const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.25 - lantern.position.y - 0.225, 4), cable.material)
						tie.position.set(lantern.position.x, (4.25 + lantern.position.y + 0.225) / 2, 0)
						group.add(tie)
					}
					;[-1, 1].forEach((side) => {
						const support = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 4.3, 6), cable.material)
						support.position.set(side * 4.48, 2.15, 0)
						group.add(support)
					})
					const glow = new THREE.PointLight(0xff9d55, 0, 8.5, 2)
					glow.position.set(0, 3.8, 0)
					group.add(glow)
					lanternLights.push(glow)
					group.userData.isLanternString = true
				}

				group.position.set(d.x, 0, d.z)
				if (group.userData.isLantern || group.userData.isLanternString) group.traverse(mesh => {
					if (mesh.material?.emissive?.getHex()) mesh.userData.isLanternShell = true
				})
				scene.add(group)
				decorations.push(group)
			})
		},
		createAmbientLife(streetData) {
			const compact = Math.min(window.innerWidth, window.innerHeight) <= 520
			const npcCount = 2
			const clothColors = [0x8B4513, 0x6f7470, 0xC41E3A]
			for (let i = 0; i < npcCount; i += 1) {
				const npc = new THREE.Group()
				const cloth = new THREE.MeshStandardMaterial({ color: clothColors[i], roughness: 0.9, flatShading: true })
				const skin = new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.75 })
				const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.68, 8), cloth); torso.position.y = 1.03; npc.add(torso)
				const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.36, 0.58, 8), cloth); robe.position.y = 0.47; npc.add(robe)
				const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skin); head.position.y = 1.52; npc.add(head)
				const hair = new THREE.Mesh(new THREE.SphereGeometry(0.185, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: 0x29241f, roughness: 0.95 })); hair.position.y = 1.58; npc.add(hair)
				const limbs = []
				;[-1, 1].forEach((side) => {
					const arm = new THREE.Group(); arm.position.set(side * 0.23, 1.2, 0); npc.add(arm)
					const movingCloth = cloth.clone(); movingCloth.transparent = true; movingCloth.opacity = 0.999
					const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 7), movingCloth); sleeve.position.y = -0.24; arm.add(sleeve); limbs.push(arm)
				})
				npc.scale.setScalar(0.9 + i * 0.035)
				npc.position.set((i % 2 ? 1 : -1) * (3.15 + i * 0.16), 0, 10 - i * 8.5)
				npc.userData = { kind: 'pedestrian', startZ: npc.position.z, range: 9 + i * 2, speed: .72 + i * .12, direction: i % 2 ? -1 : 1, collisionRadius: CHARACTER_COLLISION_RADIUS.pedestrian * npc.scale.x, limbs, phase: i * 2.1 }
				npc.rotation.y = npc.userData.direction > 0 ? 0 : Math.PI
				scene.add(npc); this.batchStaticRoots([npc]); ambientActors.push(npc)
			}

			/* 晋小鸦停在檐边，靠近后以抛物线飞往下一处。 */
			const crow = new THREE.Group()
			const crowMat = new THREE.MeshStandardMaterial({ color: 0x292827, roughness: 0.88, flatShading: true })
			const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), crowMat); body.scale.set(0.8, 0.9, 1.35); crow.add(body)
			const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), crowMat); head.position.set(0, 0.12, 0.16); crow.add(head)
			const beak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.8 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.11, 0.33); crow.add(beak)
			const wings = []
			;[-1, 1].forEach((side) => { const wingMat = crowMat.clone(); wingMat.transparent = true; wingMat.opacity = 0.999; const wing = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), wingMat); wing.position.x = side * 0.16; wing.rotation.z = side * 1.25; crow.add(wing); wings.push(wing) })
			crow.position.set(-5.0, 4.9, 4)
			crow.userData = { kind: 'crow', wings, perch: 0, flying: false, from: new THREE.Vector3(), to: new THREE.Vector3(), flight: 0, perches: [new THREE.Vector3(-5, 4.9, 4), new THREE.Vector3(5, 4.6, -5), new THREE.Vector3(-5, 5.1, -16)] }
			scene.add(crow); this.batchStaticRoots([crow]); ambientActors.push(crow)

			const cat = new THREE.Group()
			const catMat = new THREE.MeshStandardMaterial({ color: 0x6f7470, roughness: 0.92, flatShading: true })
			const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), catMat); catBody.scale.set(1.45, 0.72, 0.72); cat.add(catBody)
			const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), catMat); catHead.position.set(0, 0.1, 0.3); cat.add(catHead)
			;[-1, 1].forEach((side) => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.17, 4), catMat); ear.position.set(side * 0.09, 0.27, 0.31); cat.add(ear) })
			const tailMat = catMat.clone(); tailMat.transparent = true; tailMat.opacity = 0.999
			const tail = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 5, 12, Math.PI * 1.35), tailMat); tail.position.set(-0.31, 0.1, -0.02); tail.rotation.y = Math.PI / 2; cat.add(tail)
			cat.position.set(5.55, 3.95, -10); cat.rotation.y = -0.7; cat.userData = { kind: 'cat', tail }
			scene.add(cat); this.batchStaticRoots([cat]); ambientActors.push(cat)

			const smokeTexture = this.getTexture('smoke_sprite', () => {
				const canvas = this.makeCanvas(128), ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 60)
				gradient.addColorStop(0, 'rgba(245,240,232,.5)'); gradient.addColorStop(1, 'rgba(245,240,232,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
				return new THREE.CanvasTexture(canvas)
			})
			for (let i = 0; i < (compact ? 4 : 7); i += 1) {
				const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0.28, depthWrite: false, color: 0xF5F0E8 }))
				smoke.position.set(i % 2 ? 8.1 : -8.2, 4.4 + (i % 3) * 0.45, -14 + (i % 2) * 9)
				smoke.scale.setScalar(0.65 + (i % 3) * 0.2)
				smoke.userData = { kind: 'smoke', originY: smoke.position.y, phase: i * 0.9 }
				scene.add(smoke); ambientActors.push(smoke)
			}
		},
		createParticles(phase) {
			const type = phase?.fallingType || 'leaf'
			const count = type === 'firefly' ? 36 : 24
			const positions = new Float32Array(count * 3)
			const colorStr = type === 'firefly' ? 0xfff3a0 : type === 'cherry' ? 0xffcad4 : 0xd4a574
			// Emit beside the four tree canopies, respecting scene depth and occlusion.
			for (let i = 0; i < count; i++) {
				positions[i * 3] = (i % 2 ? -4.8 : 4.8) + Math.sin(i * 2.4) * 1.2
				positions[i * 3 + 1] = .5 + (i % 7) * .45
				positions[i * 3 + 2] = (i % 4 < 2 ? 13.8 : -22.2) + Math.cos(i * 2.4) * 1.2
			}

			const geom = new THREE.BufferGeometry()
			geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

			const mat = new THREE.PointsMaterial({
				color: colorStr,
				map: this.getTexture('courtyard_particle_' + type, () => {
					const canvas = this.makeCanvas(32), ctx = canvas.getContext('2d')
					if (type === 'firefly') {
						const glow = ctx.createRadialGradient(16, 16, 1, 16, 16, 15)
						glow.addColorStop(0, '#ffffff'); glow.addColorStop(.3, 'rgba(255,255,255,.8)'); glow.addColorStop(1, 'rgba(255,255,255,0)')
						ctx.fillStyle = glow; ctx.fillRect(0, 0, 32, 32)
					} else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(16, 16, 11, 6, .7, 0, Math.PI * 2); ctx.fill() }
					return new THREE.CanvasTexture(canvas)
				}),
				size: type === 'firefly' ? .09 : .065,
				transparent: true,
				depthWrite: false,
				opacity: type === 'firefly' ? .85 : .55,
				sizeAttenuation: true
			})

			particles = new THREE.Points(geom, mat)
			particles.userData.kind = type
			scene.add(particles)
		},
		updatePhaseParticles(phase, seconds) {
			if (!particles) return
			const kind = phase.fallingType || 'leaf'
			if (particles.userData.kind !== kind) {
				particles.material.opacity = Math.max(0, particles.material.opacity - seconds * 1.4)
				if (particles.material.opacity === 0) {
					particles.removeFromParent(); particles.geometry.dispose(); particles.material.dispose()
					particles = null; this.createParticles(phase); particles.material.opacity = 0
				}
			} else {
				const target = kind === 'firefly' ? .85 : .55
				particles.material.opacity = Math.min(target, particles.material.opacity + seconds * 1.4)
			}
		},
		capturePhaseTargets(phase) {
			const key = phase.key, lit = Boolean(phase.lanternsLit)
			const tracks = [], seen = new Map(), environmentMaterials = new Set()
			const add = (object, property, target) => {
				if (!object || object[property] == null || target == null) return
				if (!seen.has(object)) seen.set(object, new Map())
				const properties = seen.get(object)
				if (properties.has(property)) { properties.get(property).to = target; return }
				const value = object[property]
				const track = { object, property, from: value.clone ? value.clone() : value, to: target }
				properties.set(property, track); tracks.push(track)
			}
			const color = (object, property, hex) => { if (hex) add(object, property, this.makeSceneColor(colorHex(hex, 0xffffff))) }
			add(phaseVisualState, 'environment', key === 'night' ? .16 : key === 'dusk' ? .28 : .36)
			add(phaseVisualState, 'effects', lit ? 1 : 0)
			add(phaseVisualState, 'warmth', key === 'night' ? .005 : .018)
			add(phaseVisualState, 'bloom', phase.bloomStrength ?? .3)
			add(renderer, 'toneMappingExposure', phase.exposure ?? 1)
			color(scene?.fog, 'color', phase.fog?.color); add(scene?.fog, 'density', phase.fog?.density)
			for (const [light, values] of [[ambientLightRef, phase.lighting?.ambient], [directionalLightRef, phase.lighting?.directional], [hemiLightRef, phase.lighting?.hemi]]) {
				if (!light || !values) continue
				color(light, 'color', values.color || values.sky)
				add(light, 'intensity', values.intensity)
				if (values.ground) color(light, 'groundColor', values.ground)
				if (values.angle) add(light, 'position', new THREE.Vector3(values.angle.x, values.angle.y, values.angle.z))
			}
			lanternLights.forEach(light => add(light, 'intensity', lit ? (key === 'night' ? .72 : .42) : .04))
			const backdropTints = { dawn: 0xB59678, noon: 0x8F8A80, dusk: 0x765044, night: 0x31384A }
			scene?.traverse(mesh => {
				const flags = mesh.userData || {}
				for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean)) {
					if ('envMapIntensity' in material) environmentMaterials.add(material)
					if (flags.isWindowGlow) add(material, 'emissiveIntensity', key === 'night' ? .68 : key === 'dusk' ? .34 : 0)
					if (flags.isBuildingLantern) add(material, 'emissiveIntensity', key === 'night' ? .72 : key === 'dusk' ? .42 : .08)
					if (flags.isLanternShell) add(material, 'emissiveIntensity', lit ? (key === 'night' ? .55 : .25) : .02)
					if (flags.isLanternHalo) add(material, 'opacity', lit ? .58 : 0)
					if (flags.isLanternPool) add(material, 'opacity', lit ? .2 : 0)
					if (flags.isRooflineBackdrop) {
						add(material, 'color', this.makeSceneColor(backdropTints[key] || backdropTints.noon))
						add(material, 'opacity', key === 'night' ? .48 : .42)
					}
					if (flags.isParallaxLayer) add(material, 'opacity', key === 'night' ? .16 : flags.isParallaxLayer === 'mountain' ? .24 : .3)
					if (flags.isCloudLayer) add(material, 'opacity', key === 'night' ? .11 : key === 'dusk' ? .22 : .3)
				}
			})
			decorations.filter(group => group.userData?.isBanner || group.userData?.isSign).forEach(group => group.traverse(mesh => {
				if (mesh.material?.emissive) add(mesh.material, 'emissiveIntensity', lit ? .3 : .1)
			}))
			return { tracks, environmentMaterials }
		},
		syncPhaseEffects() {
			if (bloomPassRef) bloomPassRef.strength = phaseVisualState.bloom * phaseVisualState.effects
			if (gradePassRef) {
				gradePassRef.uniforms.warmth.value = phaseVisualState.warmth
				gradePassRef.uniforms.effectAmount.value = effectsEnabled ? phaseVisualState.effects : 0
			}
		},
		renderSceneFrame() {
			if (composer) {
				// Keep scene materials in the same linear target by day and night.
				// The first zero-strength glow draw happens behind the entrance loader.
				if (bloomPassRef) bloomPassRef.enabled = effectsEnabled && (!bloomPrepared || (phaseVisualState.effects > .00001 && !bloomSuppressed))
				composer.render()
				if (bloomPassRef?.enabled) bloomPrepared = true
			} else if (renderer && scene && camera) renderer.render(scene, camera)
		},
		applyPhaseTracks(snapshot, t) {
			for (const track of snapshot.tracks) {
				if (track.from.clone) track.object[track.property].copy(track.from).lerp(track.to, t)
				else track.object[track.property] = THREE.MathUtils.lerp(track.from, track.to, t)
			}
			snapshot.environmentMaterials.forEach(material => { material.envMapIntensity = phaseVisualState.environment })
			this.syncPhaseEffects()
		},
		applyPhase(phase, immediate = false) {
			if (!scene || !phase) return
			if (!immediate && phaseTransition && phaseTransition.target.key === phase.key) return
			const previousPhase = currentPhaseData
			currentPhaseData = phase
			const animate = !immediate && renderer && previousPhase?.key && previousPhase.key !== phase.key
			if (!animate && particles && particles.userData.kind !== (phase.fallingType || 'leaf')) {
				particles.removeFromParent(); particles.geometry.dispose(); particles.material.dispose()
				particles = null; this.createParticles(phase)
			}
			const snapshot = this.capturePhaseTargets(phase)
			if (animate) {
				// Capture the visible sky and material values, including an interrupted transition.
				const from = this.makeCanvas(1024); from.height = 512
				from.getContext('2d').drawImage(scene.background.image, 0, 0, 1024, 512)
				if (phaseSkyBlend) phaseSkyBlend.texture.dispose()
				const canvas = this.makeCanvas(1024); canvas.height = 512
				canvas.getContext('2d').drawImage(from, 0, 0)
				const texture = new THREE.CanvasTexture(canvas); this.setColorTexture(texture)
				phaseSkyBlend = { from, canvas, texture, target: this.makeSkyTexture(phase.sky.top, phase.sky.bottom, phase.key === 'night').image, lastDraw: -Infinity }
				scene.background = texture
				phaseTransition = { ...snapshot, lastTime: performance.now(), elapsed: 0, duration: 2200, target: phase }
				return
			}
			phaseTransition = null
			this.applyPhaseTracks(snapshot, 1)
			if (particles) particles.material.opacity = particles.userData.kind === 'firefly' ? .85 : .55
			if (phaseSkyBlend) { phaseSkyBlend.texture.dispose(); phaseSkyBlend = null }
			this.refreshSky(phase)
		},
		updatePhaseTransition(now) {
			const transition = phaseTransition
			if (!transition || !scene || !renderer) return
			// Shader compilation, backgrounding or a slow frame must not skip the whole dissolve.
			const frameTime = Math.min(50, Math.max(0, now - transition.lastTime))
			transition.elapsed += frameTime
			transition.lastTime = now
			const raw = Math.min(1, transition.elapsed / transition.duration), t = raw * raw * (3 - 2 * raw)
			this.applyPhaseTracks(transition, t)
			this.updatePhaseParticles(transition.target, frameTime / 1000)
			if (phaseSkyBlend && (now - phaseSkyBlend.lastDraw >= 32 || raw === 1)) {
				const ctx = phaseSkyBlend.canvas.getContext('2d')
				ctx.globalAlpha = 1; ctx.drawImage(phaseSkyBlend.from, 0, 0, 1024, 512)
				ctx.globalAlpha = t; ctx.drawImage(phaseSkyBlend.target, 0, 0, 1024, 512); ctx.globalAlpha = 1
				phaseSkyBlend.texture.needsUpdate = true
				phaseSkyBlend.lastDraw = now
			}
			if (raw >= 1) {
				phaseTransition = null
				if (phaseSkyBlend) { phaseSkyBlend.texture.dispose(); phaseSkyBlend = null }
				this.refreshSky(transition.target)
			}
		},
		updatePlayerMotion(desiredX, desiredZ, deltaTime) {
			const data = player.userData
			const previousYaw = player.rotation.y
			if (inputBlocked || portraitCamera || pagePaused) { desiredX = 0; desiredZ = 0 }
			const hasInput = Math.hypot(desiredX, desiredZ) > .02
			const angleDelta = (target) => Math.atan2(Math.sin(target - player.rotation.y), Math.cos(target - player.rotation.y))
			const wantedYaw = hasInput ? Math.atan2(desiredX, desiredZ) : player.rotation.y
			const inputAngle = angleDelta(wantedYaw)
			if (!hasInput || Math.abs(inputAngle) < .35) data.motionTurning = false
			else if (Math.abs(inputAngle) > 1.75) data.motionTurning = true
			// Brake along the old heading before a reversal. Ordinary corners retain their arc.
			const response = 1 - Math.exp(-(data.motionTurning ? 18 : hasInput ? 11 : 7) * deltaTime)
			movementVelocity.x += ((data.motionTurning ? 0 : desiredX) - movementVelocity.x) * response
			movementVelocity.z += ((data.motionTurning ? 0 : desiredZ) - movementVelocity.z) * response
			let velocity = Math.hypot(movementVelocity.x, movementVelocity.z)
			let targetYaw = velocity > .02 ? Math.atan2(movementVelocity.x, movementVelocity.z) : player.rotation.y
			if (data.motionTurning && velocity < .16) {
				movementVelocity.x = 0; movementVelocity.z = 0; velocity = 0
				targetYaw = wantedYaw
			}
			const yawStep = THREE.MathUtils.clamp(angleDelta(targetYaw), -7 * deltaTime, 7 * deltaTime)
			player.rotation.y += yawStep
			data.turnRate = yawStep / deltaTime
			// Input cancellation also cancels an unfinished pivot; it cannot finish by itself.
			if (!hasInput && velocity < .02) {
				movementVelocity.x = 0; movementVelocity.z = 0; data.turnRate = 0
			}
			const forwardX = Math.sin(player.rotation.y), forwardZ = Math.cos(player.rotation.y)
			const backwards = Math.min(0, movementVelocity.x * forwardX + movementVelocity.z * forwardZ)
			movementVelocity.x -= backwards * forwardX
			movementVelocity.z -= backwards * forwardZ
			const previousX = player.position.x, previousZ = player.position.z
			const bounds = currentWorldLayout?.roadBounds || { xMin: -4.15, xMax: 4.15, zMin: -23, zMax: 15 }
			this.resolveStreetMotion(player.position, movementVelocity.x * deltaTime, movementVelocity.z * deltaTime, data.collisionRadius || .43)
			if (player.position.x === bounds.xMin || player.position.x === bounds.xMax) movementVelocity.x = 0
			if (player.position.z === bounds.zMin || player.position.z === bounds.zMax) movementVelocity.z = 0
			const movedX = player.position.x - previousX, movedZ = player.position.z - previousZ
			const movedDistance = Math.hypot(movedX, movedZ)
			if (movedDistance > .0004 && !data.motionTurning) {
				// Sliding along a wall should face the resolved travel, within the same frame's turn budget.
				const heading = Math.atan2(movedX, movedZ) - previousYaw
				const resolvedStep = THREE.MathUtils.clamp(Math.atan2(Math.sin(heading), Math.cos(heading)), -7 * deltaTime, 7 * deltaTime)
				player.rotation.y = previousYaw + resolvedStep
				data.turnRate = resolvedStep / deltaTime
			}
			if (movedDistance < .00001) { movementVelocity.x = 0; movementVelocity.z = 0 }
			const speed = movedDistance / deltaTime
			return { movedDistance, speed, moving: movedDistance > .0004 && speed > .045 }
		},
		updatePlayerMixer(speed, moving, deltaTime) {
			if (!player?.userData?.isGltf) return
			const data = player.userData
			const turn = moving ? 0 : Math.min(.45, Math.abs(data.turnRate || 0) * .07)
			if (moving || turn > .01) data.gestureTime = 0
			data.gestureTime = Math.max(0, (data.gestureTime || 0) - deltaTime)
			const gesture = data.gestureTime > 0 ? Math.min(1, data.gestureTime / 0.22) : 0
			const walk = moving ? THREE.MathUtils.smoothstep(speed, 0.03, 0.42) : turn
			const run = data.actions.run ? THREE.MathUtils.smoothstep(speed, 2.7, 3.85) : 0
			const weights = { idle: (1 - walk) * (1 - gesture), walk: walk * (1 - run) * (1 - gesture), run: walk * run * (1 - gesture), wave: gesture }
			const response = 1 - Math.exp(-14 * deltaTime)
			for (const key of Object.keys(weights)) {
				const action = data.actions[key]
				if (!action) continue
				action.setEffectiveWeight(THREE.MathUtils.lerp(action.getEffectiveWeight(), weights[key], response))
			}
			// Both clips share the same left/right step phase while their weights change.
			// An independent run clock can otherwise blend a left stride into a right stride.
			const walkAction = data.actions.walk, runAction = data.actions.run
			const walkDuration = walkAction?.getClip().duration || 1
			const runDuration = runAction?.getClip().duration || walkDuration
			const walkWeight = walkAction?.getEffectiveWeight() || 0, runWeight = runAction?.getEffectiveWeight() || 0
			const runBlend = runWeight / Math.max(.001, walkWeight + runWeight)
			const gait = data.gait || CHARACTER_GAIT_SPEED
			const stride = THREE.MathUtils.lerp(walkDuration * gait.walk, runDuration * gait.run, runBlend) * player.scale.x
			// Small alternating steps support a pivot without adding virtual travel or quest steps.
			const phaseSpeed = Math.max(Math.max(0, speed) / stride, turn > .01 ? .8 : 0)
			data.locomotionPhase = ((data.locomotionPhase || 0) + phaseSpeed * deltaTime) % 1
			for (const action of [walkAction, runAction]) if (action) {
				action.setEffectiveTimeScale(0)
				action.time = data.locomotionPhase * action.getClip().duration
			}
			this.restoreCharacterFootPose(player)
			data.mixer.update(deltaTime)
			this.groundCharacter(player)
			this.updateCharacterFootPlant(player, speed, deltaTime)
			this.updateCharacterDetailMotion(player, speed, moving)
		},
		updateCharacterDetailMotion(root, speed, moving) {
			const data = root.userData, time = data.mixer.time + (data.expressionOffset || 0)
			const blinkTime = time % 4.3
			const blink = blinkTime > 3.98 ? Math.sin(Math.min(1, (blinkTime - 3.98) / .24) * Math.PI) : 0
			data.blinkMeshes?.forEach(mesh => { mesh.morphTargetInfluences[0] = blink })
			data.clothMeshes?.forEach(mesh => { mesh.morphTargetInfluences[0] = Math.sin(time * (moving ? 8 : 2.1)) * Math.min(1, .16 + speed * .19) })
		},
		groundCharacter(root) {
			const data = root.userData
			// Correct ground penetration while preserving the run clip's flight phase.
			if (data.groundSamples?.length) {
				let floor = Infinity
				if (data.footPlant?.feet.length) {
					// The shoes are rigidly bound to the foot bones (weight 1, identity bind), so the
					// foot-local sole points through foot.matrixWorld equal the skinned vertices.
					// This replaces 550 boneTransform calls, the skeleton updates and the full
					// hierarchy refresh per character; only the two ankle chains are refreshed.
					for (const leg of data.footPlant.feet) {
						leg.foot.updateWorldMatrix(true, false)
						for (const vertex of leg.sole) floor = Math.min(floor, data.groundPoint.copy(vertex).applyMatrix4(leg.foot.matrixWorld).y)
					}
				} else {
					root.updateMatrixWorld(true)
					data.groundSkeletons.forEach(skeleton=>skeleton.update())
					for (const sample of data.groundSamples) {
						data.groundPoint.fromBufferAttribute(sample.mesh.geometry.attributes.position,sample.index)
						const deform = sample.mesh.applyBoneTransform || sample.mesh.boneTransform
						deform.call(sample.mesh,sample.index,data.groundPoint).applyMatrix4(sample.mesh.matrixWorld)
						floor = Math.min(floor,data.groundPoint.y)
					}
				}
				const groundedY = root.position.y + .083 - floor
				const runWeight = data.actions?.run?.getEffectiveWeight() || 0
				root.position.y = THREE.MathUtils.lerp(groundedY, Math.max(.083, groundedY), runWeight)
				data.airborneLift = Math.max(0, root.position.y - groundedY)
				if (data.contactShadow) {
					data.contactShadow.position.y = (.085-root.position.y)/root.scale.y
					data.contactShadow.scale.setScalar(1 - Math.min(.2, data.airborneLift * .4))
					data.contactShadow.material.opacity = 1 - Math.min(.45, data.airborneLift * .9)
				}
			}
		},
		playPlayerWave() {
			const data = player?.userData
			if (!data?.isGltf || !data.actions.wave || data.gestureTime > 0) return
			const wave = data.actions.wave.reset()
			wave.setLoop(THREE.LoopOnce, 1); wave.clampWhenFinished = true; wave.setEffectiveWeight(0).setEffectiveTimeScale(1).play()
			data.gestureTime = wave.getClip().duration
		},
		updatePedestrianMotion(actor, deltaTime) {
			const data = actor.userData
			if (deltaTime <= 0) return 0
			const heading = data.direction > 0 ? 0 : Math.PI
			const angle = Math.atan2(Math.sin(heading - actor.rotation.y), Math.cos(heading - actor.rotation.y))
			const turn = THREE.MathUtils.clamp(angle, -3.2 * deltaTime, 3.2 * deltaTime)
			actor.rotation.y += turn; data.turnRate = Math.abs(turn) / deltaTime
			if (Math.abs(angle) > .035) {
				data.motionSpeed = 0; data.blockedTime = 0
				return 0
			}
			actor.rotation.y = heading
			const remaining = data.direction * (data.startZ + data.direction * data.range - actor.position.z)
			if (remaining <= .025) {
				data.direction *= -1; data.motionSpeed = 0; data.blockedTime = 0
				return 0
			}
			const yieldDistance = data.collisionRadius + (player?.userData.collisionRadius || .43) + .22
			const yielding = player && Math.hypot(actor.position.x-player.position.x, actor.position.z-player.position.z) < yieldDistance
			const targetSpeed = yielding ? 0 : Math.min(data.speed, Math.sqrt(1.8 * remaining))
			data.motionSpeed = THREE.MathUtils.lerp(data.motionSpeed || 0, targetSpeed, 1 - Math.exp(-6 * deltaTime))
			const distance = Math.min(remaining, data.motionSpeed * deltaTime)
			const x = actor.position.x, z = actor.position.z
			this.resolveStreetMotion(actor.position, 0, data.direction * distance, data.collisionRadius)
			const traveled = Math.hypot(actor.position.x-x, actor.position.z-z)
			data.blockedTime = !yielding && distance > .0001 && traveled < distance * .1 ? (data.blockedTime || 0) + deltaTime : 0
			if (data.blockedTime > .2) {
				data.direction *= -1; data.motionSpeed = 0; data.blockedTime = 0
			}
			return traveled / deltaTime
		},
		updateAmbientLife(now, deltaTime) {
			ambientActors.forEach((actor, index) => {
				const data = actor.userData
				if (data.kind === 'rigged-pedestrian') {
					const speed = this.updatePedestrianMotion(actor, deltaTime)
					const turnWeight = Math.min(.45, data.turnRate * .15)
					data.action.timeScale = turnWeight > .01 ? .7 : speed / ((data.gait || CHARACTER_GAIT_SPEED).walk * actor.scale.x)
					const weight = THREE.MathUtils.lerp(data.action.getEffectiveWeight(), speed > .015 ? 1 : turnWeight, 1-Math.exp(-10*deltaTime))
					data.action.setEffectiveWeight(weight); data.idle.setEffectiveWeight(1-weight)
					this.restoreCharacterFootPose(actor)
					data.mixer.update(deltaTime)
					this.groundCharacter(actor)
					// Foot planting is invisible beyond ~14 m; release it there instead of solving both legs.
					if (camera && actor.position.distanceToSquared(camera.position) > 196) this.releaseCharacterFootPlant(actor)
					else this.updateCharacterFootPlant(actor, speed, deltaTime)
					this.updateCharacterDetailMotion(actor, speed, speed > .015 || turnWeight > .01)
				} else if (data.kind === 'pedestrian') {
					const speed = this.updatePedestrianMotion(actor, deltaTime)
					const activity = Math.min(1, speed / data.speed + data.turnRate * .1)
					const swing = Math.sin(now * 0.004 + data.phase) * .35 * activity
					data.limbs.forEach((limb, limbIndex) => { limb.rotation.x = limbIndex ? swing : -swing })
					actor.position.y = .08 + Math.abs(Math.sin(now * 0.004 + data.phase)) * .018 * activity
				} else if (data.kind === 'crow') {
					if (!data.flying && player && actor.position.distanceTo(player.position) < 4.2) {
						data.flying = true; data.flight = 0; data.from.copy(actor.position); data.perch = (data.perch + 1) % data.perches.length; data.to.copy(data.perches[data.perch])
					}
					if (data.flying) {
						data.flight = Math.min(1, data.flight + deltaTime * 0.48); actor.position.lerpVectors(data.from, data.to, data.flight); actor.position.y += Math.sin(data.flight * Math.PI) * 0.085
						data.wings.forEach((wing, wingIndex) => { wing.rotation.z = (wingIndex ? -1 : 1) * (0.7 + Math.sin(now * 0.025) * 0.55) })
						if (data.flight >= 1) data.flying = false
					}
				} else if (data.kind === 'cat') data.tail.rotation.z = Math.sin(now * 0.002) * 0.18
				else if (data.kind === 'smoke') {
					const cycle = (now * 0.00012 + data.phase) % 1
					actor.position.y = data.originY + cycle * 2.2; actor.position.x += Math.sin(now * 0.0008 + index) * deltaTime * 0.025
					actor.scale.setScalar(0.55 + cycle * 1.2); actor.material.opacity = (1 - cycle) * 0.3
				}
			})
			// The cloth list is collected once per scene in loadScene (after batching), so the
			// per-frame cost is only the vertex wave itself, not a traversal of every decoration.
			windClothMeshes.forEach((mesh, index) => {
				const pos = mesh.geometry.attributes.position, array = pos.array
				if (!mesh.userData.basePositions) mesh.userData.basePositions = new Float32Array(array)
				const base = mesh.userData.basePositions, t = now * 0.002 + index
				for (let i = 0; i < pos.count; i += 1) array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t + array[i * 3] * 4) * 0.035
				pos.needsUpdate = true
			})
		},
		/* 根据时辰调整建筑木格窗的透光强度（晨/午暗、昏微亮、夜最亮） */
		updateWindowGlow(phase) {
			const key = phase?.key
			const glow = key === 'night' ? 0.68 : key === 'dusk' ? 0.34 : 0.0
			;[...buildings, ...environment].forEach((group) => {
				group.traverse((mesh) => {
					if (mesh.isMesh && mesh.userData?.isWindowGlow && mesh.material) {
						mesh.material.emissiveIntensity = glow
					}
					if (mesh.isMesh && mesh.userData?.isBuildingLantern && mesh.material) {
						mesh.material.emissiveIntensity = key === 'night' ? 0.72 : key === 'dusk' ? 0.42 : 0.08
					}
				})
			})
		},
		createJoystick() {
			const canvas = document.getElementById('street-canvas')
			if (!canvas) return

			if (joystickCleanup) { joystickCleanup(); joystickCleanup = null }
			const movePad = document.getElementById('street-move-pad')
			const moveKnob = document.getElementById('street-move-knob')
			const pressedKeys = new Set()
			let moveTouchId = null
			let lookTouchId = null
			let moveOriginX = 0
			let moveOriginY = 0
			let touchMoveX = 0
			let touchMoveY = 0
			let lookLastX = 0
			let lookLastY = 0
			let mouseLooking = false
			let mouseLastX = 0
			let mouseLastY = 0
			let pinchDistance = 0
			const keyDirections = {
				w: [0, -1],
				a: [-1, 0],
				s: [0, 1],
				d: [1, 0],
				arrowup: [0, -1],
				arrowleft: [-1, 0],
				arrowdown: [0, 1],
				arrowright: [1, 0]
			}

			const getKeyboardVector = () => {
				let dx = 0
				let dy = 0
				pressedKeys.forEach((key) => {
					const direction = keyDirections[key]
					if (!direction) return
					dx += direction[0]
					dy += direction[1]
				})
				const length = Math.sqrt(dx * dx + dy * dy)
				if (length > 1) {
					dx /= length
					dy /= length
				}
				return { dx, dy }
			}

			const syncMoveInput = () => {
				if (moveTouchId !== null) {
					joystickInput.dx = touchMoveX
					joystickInput.dy = touchMoveY
					return
				}
				const keyboard = getKeyboardVector()
				joystickInput.dx = keyboard.dx
				joystickInput.dy = keyboard.dy
			}

			const showMoveFeedback = (clientX, clientY) => {
				if (!movePad) return
				const bounds = canvas.getBoundingClientRect()
				movePad.style.left = (clientX - bounds.left) + 'px'
				movePad.style.top = (clientY - bounds.top) + 'px'
				movePad.style.opacity = '1'
			}

			const hideMoveFeedback = () => {
				if (movePad) movePad.style.opacity = '0'
				if (moveKnob) moveKnob.style.transform = 'translate(-50%, -50%)'
			}

			const updateTouchMove = (clientX, clientY) => {
				const maxRadius = Math.max(44, Math.min(72, window.innerHeight * 0.16))
				let dx = clientX - moveOriginX
				let dy = clientY - moveOriginY
				const length = Math.sqrt(dx * dx + dy * dy)
				if (length > maxRadius) {
					dx = dx / length * maxRadius
					dy = dy / length * maxRadius
				}
				touchMoveX = dx / maxRadius
				touchMoveY = dy / maxRadius
				if (moveKnob) moveKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`
				syncMoveInput()
			}

			const rotateCamera = (dx, dy, sensitivity) => {
				cameraYaw -= dx * sensitivity
				cameraPitch = Math.max(0.06, Math.min(0.82, cameraPitch + dy * sensitivity * 0.72))
			}

			const getTouch = (list, id) => {
				for (let i = 0; i < list.length; i += 1) {
					if (list[i].identifier === id) return list[i]
				}
				return null
			}

			const onTouchStart = (event) => {
				if (inputBlocked) return
				const bounds = canvas.getBoundingClientRect()
				let handled = false
				for (let i = 0; i < event.changedTouches.length; i += 1) {
					const touch = event.changedTouches[i]
					const inMoveZone = touch.clientX < bounds.left + bounds.width * 0.46 && touch.clientY > bounds.top + bounds.height * 0.34
					if (inMoveZone && moveTouchId === null) {
						moveTouchId = touch.identifier
						moveOriginX = touch.clientX
						moveOriginY = touch.clientY
						touchMoveX = 0
						touchMoveY = 0
						showMoveFeedback(touch.clientX, touch.clientY)
						handled = true
					} else if (lookTouchId === null && touch.clientX >= bounds.left + bounds.width * 0.42) {
						lookTouchId = touch.identifier
						lookLastX = touch.clientX
						lookLastY = touch.clientY
						handled = true
					}
				}
				if (handled) event.preventDefault()
			}
			const onTouchMove = (event) => {
				if (inputBlocked) return
				let handled = false
				const lookTouches = Array.from(event.touches).filter(touch => touch.identifier !== moveTouchId)
				if (lookTouches.length >= 2) {
					const distance = Math.hypot(lookTouches[0].clientX - lookTouches[1].clientX, lookTouches[0].clientY - lookTouches[1].clientY)
					if (pinchDistance) cameraDistance = THREE.MathUtils.clamp(cameraDistance * pinchDistance / Math.max(1, distance), 2.6, 10)
					pinchDistance = distance; event.preventDefault(); return
				}
				pinchDistance = 0
				if (moveTouchId !== null) {
					const touch = getTouch(event.touches, moveTouchId)
					if (touch) {
						updateTouchMove(touch.clientX, touch.clientY)
						handled = true
					}
				}
				if (lookTouchId !== null) {
					const touch = getTouch(event.touches, lookTouchId)
					if (touch) {
						rotateCamera(touch.clientX - lookLastX, touch.clientY - lookLastY, 0.0052)
						lookLastX = touch.clientX
						lookLastY = touch.clientY
						handled = true
					}
				}
				if (handled) event.preventDefault()
			}
			const onTouchEnd = (event) => {
				pinchDistance = 0
				for (let i = 0; i < event.changedTouches.length; i += 1) {
					const id = event.changedTouches[i].identifier
					if (id === moveTouchId) {
						moveTouchId = null
						touchMoveX = 0
						touchMoveY = 0
						hideMoveFeedback()
						syncMoveInput()
					}
					if (id === lookTouchId) lookTouchId = null
				}
			}

			const onMouseDown = (event) => {
				if (inputBlocked || event.button !== 0) return
				mouseLooking = true
				mouseLastX = event.clientX
				mouseLastY = event.clientY
				canvas.style.cursor = 'grabbing'
			}
			const onMouseMove = (event) => {
				if (!mouseLooking) return
				rotateCamera(event.clientX - mouseLastX, event.clientY - mouseLastY, 0.0058)
				mouseLastX = event.clientX
				mouseLastY = event.clientY
			}
			const onMouseUp = () => {
				mouseLooking = false
				canvas.style.cursor = 'grab'
			}
			const onWheel = (event) => {
				if (inputBlocked) return
				cameraDistance = Math.max(2.6, Math.min(10, cameraDistance + event.deltaY * 0.008))
				event.preventDefault()
			}

			const onKeyDown = (event) => {
				if (event.target?.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return
				const key = event.key.toLowerCase()
				const tag = event.target && event.target.tagName
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
				if (key === 'escape') {
					if (!event.repeat) emit('desktop-action', { action: 'escape' })
					event.preventDefault(); return
				}
				if (inputBlocked) return
				if (key === 'shift') { sprintHeld = true; return }
				const shortcut = { e: 'interact', i: 'inventory', j: 'quest', c: 'portrait', r: 'reset', g: 'greet' }[key]
				if (shortcut) {
					if (!event.repeat) emit('desktop-action', { action: shortcut })
					event.preventDefault(); return
				}
				if (!keyDirections[key]) return
				pressedKeys.add(key)
				syncMoveInput()
				event.preventDefault()
			}
			const onKeyUp = (event) => {
				const key = event.key.toLowerCase()
				if (key === 'shift') { sprintHeld = false; return }
				if (!keyDirections[key]) return
				pressedKeys.delete(key)
				syncMoveInput()
				event.preventDefault()
			}
			const onWindowBlur = () => {
				sprintHeld = false
				pressedKeys.clear()
				moveTouchId = null
				lookTouchId = null
				mouseLooking = false
				touchMoveX = 0
				touchMoveY = 0
				hideMoveFeedback()
				syncMoveInput()
			}

			canvas.style.touchAction = 'none'
			canvas.style.cursor = 'grab'
			canvas.addEventListener('touchstart', onTouchStart, { passive: false })
			canvas.addEventListener('touchmove', onTouchMove, { passive: false })
			canvas.addEventListener('touchend', onTouchEnd)
			canvas.addEventListener('touchcancel', onTouchEnd)
			canvas.addEventListener('mousedown', onMouseDown)
			canvas.addEventListener('wheel', onWheel, { passive: false })
			window.addEventListener('mousemove', onMouseMove)
			window.addEventListener('mouseup', onMouseUp)
			window.addEventListener('keydown', onKeyDown)
			window.addEventListener('keyup', onKeyUp)
			window.addEventListener('blur', onWindowBlur)

			joystickCleanup = () => {
				sprintHeld = false
				canvas.removeEventListener('touchstart', onTouchStart)
				canvas.removeEventListener('touchmove', onTouchMove)
				canvas.removeEventListener('touchend', onTouchEnd)
				canvas.removeEventListener('touchcancel', onTouchEnd)
				canvas.removeEventListener('mousedown', onMouseDown)
				canvas.removeEventListener('wheel', onWheel)
				window.removeEventListener('mousemove', onMouseMove)
				window.removeEventListener('mouseup', onMouseUp)
				window.removeEventListener('keydown', onKeyDown)
				window.removeEventListener('keyup', onKeyUp)
				window.removeEventListener('blur', onWindowBlur)
				pressedKeys.clear()
				moveTouchId = null
				lookTouchId = null
				mouseLooking = false
				touchMoveX = 0
				touchMoveY = 0
				hideMoveFeedback()
				joystickInput.dx = 0
				joystickInput.dy = 0
				canvas.style.cursor = ''
			}
		},
		highlightQuestPoi(targetPoiId) {
			poiBeacons.forEach((beacon) => {
				const isTarget = beacon.userData.poiId === targetPoiId
				beacon.userData.isHighlighted = isTarget
				beacon.traverse((mesh) => {
					if (mesh.isMesh && mesh.material && mesh.userData?.poiPart) {
						if (isTarget) {
							if (mesh.material.color) mesh.material.color.setHex(0xFFD700)
							if (mesh.material.emissive) mesh.material.emissive.setHex(0xFFD700)
							mesh.material.emissiveIntensity = 0.86
						} else {
							if (mesh.material.color) mesh.material.color.setHex(mesh.userData.baseColor)
							if (mesh.material.emissive) {
								mesh.material.emissive.setHex(mesh.userData.baseEmissive)
								mesh.material.emissiveIntensity = mesh.userData.baseIntensity
							}
						}
					}
				})
			})
		},
		clearScene() {
			this.flushPendingMovement()
			if (phaseSkyBlend) { phaseSkyBlend.texture.dispose(); phaseSkyBlend = null }
			worldColliders = []; cameraOccluders = []; cameraProbe = null
			const releasedGeometries = new Set(), releasedMaterials = new Set()
			const disposeObject = (object) => {
				if (!object) return
				const skeletons = new Set()
				if (scene) scene.remove(object)
				object.traverse((item) => {
					if (item.skeleton) skeletons.add(item.skeleton)
					if (item.geometry && !releasedGeometries.has(item.geometry)) {
						releasedGeometries.add(item.geometry)
						item.geometry.dispose()
					}
					;(Array.isArray(item.material) ? item.material : [item.material]).filter(Boolean).forEach((material) => {
						if (!releasedMaterials.has(material)) { releasedMaterials.add(material); material.dispose() }
					})
				})
				skeletons.forEach(skeleton => skeleton.dispose())
			}

			/* 换幕前移除灯光与阴影贴图，防止叠灯导致过曝。 */
			[ambientLightRef, directionalLightRef, hemiLightRef].forEach((light) => {
				if (!light) return
				if (light.shadow?.map) light.shadow.map.dispose()
				if (scene) scene.remove(light)
			})
			ambientLightRef = null
			directionalLightRef = null
			hemiLightRef = null
			disposeObject(ground)
			ground = null

			;[...environment, ...buildings, ...poiBeacons, decorationBatchRoot].filter(Boolean).forEach(disposeObject)
			environment = []
			buildings = []
			poiBeacons = []
			decorations = []
			decorationBatchRoot = null
			windClothMeshes = []
			lanternLights.forEach((light) => { if (scene) scene.remove(light) })
			lanternLights = []
			lanternLightSources = []
			lanternShellMaterials = []
			sceneMaterialPool.clear()
			animationMixers.forEach((mixer) => { try { mixer.stopAllAction(); if (mixer.getRoot) mixer.uncacheRoot(mixer.getRoot()) } catch (_) {} })
			animationMixers = []
			ambientActors.forEach(disposeObject)
			ambientActors = []
			phaseTransition = null
			playerModelGeneration += 1

			disposeObject(particles)
			particles = null

			disposeObject(player)
			player = null
			movementVelocity.x = 0
			movementVelocity.z = 0
			walkCycle = 0
		},
		updatePoiProximity(beacon, distance) {
			const trigger = beacon.userData.trigger
			const previousState = beacon.userData.proximityState || 'far'
			let nextState = previousState
			if (previousState === 'active') {
				if (distance >= trigger.exitRadius) nextState = distance < trigger.resetRadius ? 'near' : 'far'
			} else if (previousState === 'near') {
				if (distance <= trigger.interactionRadius) nextState = 'active'
				else if (distance >= trigger.resetRadius) nextState = 'far'
			} else if (distance <= trigger.interactionRadius) {
				nextState = 'active'
			} else if (distance <= trigger.discoveryRadius) {
				nextState = 'near'
			}
			if (nextState !== previousState) {
				if (nextState === 'active') { emit('poi-enter', beacon.userData.poiId); this.playPlayerWave() }
				else if (previousState === 'active') emit('poi-leave', beacon.userData.poiId)
				if (nextState === 'near' && previousState === 'far') emit('poi-near', beacon.userData.poiId)
				beacon.userData.proximityState = nextState
				beacon.userData.entered = nextState === 'active'
				beacon.userData.nearHinted = nextState !== 'far'
			}
		},
		startAnimation() {
			if (animationId) { cancelAnimationFrame(animationId); animationId = null }
			if (!renderer || pagePaused || document.hidden) return
			lastTime = performance.now()
			lastMoveEmit = lastTime
			lastPlayerMotionAt = lastTime
			// Ignore shader compilation and the first texture uploads in adaptive quality.
			qualitySampleStartedAt = lastTime + 1800
			qualityFrameCount = 0
			const animate = () => {
				animationId = requestAnimationFrame(animate)
				const now = performance.now()
				const deltaTime = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000))
				lastTime = now

				if (player) {
					const inputLength = inputBlocked || portraitCamera ? 0 : Math.min(1, Math.hypot(joystickInput.dx, joystickInput.dy))
					const pace = player.userData.moveSpeed || PLAYER_MOVE_SPEED
					const movementSpeed = inputLength > .08 ? ((runningEnabled || sprintHeld) ? pace.run : pace.walk) : 0
					const desiredX = (joystickInput.dx * Math.cos(cameraYaw) + joystickInput.dy * Math.sin(cameraYaw)) * movementSpeed
					const desiredZ = (-joystickInput.dx * Math.sin(cameraYaw) + joystickInput.dy * Math.cos(cameraYaw)) * movementSpeed
					const { movedDistance, speed, moving } = this.updatePlayerMotion(desiredX, desiredZ, deltaTime)
					if (moving) {
						walkCycle += speed * deltaTime * 4.6
						const swing = Math.sin(walkCycle) * Math.min(0.62, speed * 0.14)
						if (player.userData.leftLeg) {
							player.userData.leftLeg.rotation.x = swing
							player.userData.rightLeg.rotation.x = -swing
							player.userData.leftArm.rotation.x = -swing * 0.78
							player.userData.rightArm.rotation.x = swing * 0.78
							player.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.035
						}

						stepDistanceCarry += movedDistance
						while (stepDistanceCarry >= 0.72) {
							moveStepAccum += 1
							stepDistanceCarry -= 0.72
						}
						if (now - lastMoveEmit >= 140) {
							emit('player-move', { x: player.position.x, z: player.position.z, steps: moveStepAccum })
							moveStepAccum = 0
							lastMoveEmit = now
						}
						wasMoving = true
						lastPlayerMotionAt = now
					} else {
						const settle = 1 - Math.exp(-10 * deltaTime)
						if (player.userData.leftLeg) {
							player.userData.leftLeg.rotation.x += (0 - player.userData.leftLeg.rotation.x) * settle
							player.userData.rightLeg.rotation.x += (0 - player.userData.rightLeg.rotation.x) * settle
							player.userData.leftArm.rotation.x += (0 - player.userData.leftArm.rotation.x) * settle
							player.userData.rightArm.rotation.x += (0 - player.userData.rightArm.rotation.x) * settle
						}
						if (!player.userData.isGltf) player.position.y += (0 - player.position.y) * settle
						if (wasMoving && speed < 0.08) {
							emit('player-move', { x: player.position.x, z: player.position.z, steps: moveStepAccum })
							moveStepAccum = 0
							wasMoving = false
						}
					}
					/* 极轻的呼吸与流苏惯性，让静止角色也保持生命感，不额外创建逐帧对象。 */
					if (player.userData.body) {
						player.userData.body.scale.y = 1 + Math.sin(now * 0.0018) * 0.006
					}
					if (player.userData.tassel) {
						player.userData.tassel.rotation.z = Math.sin(walkCycle * 1.35) * Math.min(0.18, speed * 0.035)
					}
					if (player.userData.robe) player.userData.robe.rotation.z = Math.sin(walkCycle) * Math.min(0.035, speed * 0.008)
					if (player.userData.eyes?.length) {
						const blink = Math.sin(now * 0.0017) > 0.985 ? 0.08 : 0.8
						player.userData.eyes.forEach((eye) => {
							if (eye.userData?.isEyelid) eye.material.opacity += ((blink < 0.2 ? 0.96 : 0) - eye.material.opacity) * (1 - Math.exp(-24 * deltaTime))
							else eye.scale.y += (blink - eye.scale.y) * (1 - Math.exp(-24 * deltaTime))
						})
					}
					this.updatePlayerMixer(speed, moving, deltaTime)
				}
				this.updateAmbientLife(now, deltaTime)
				this.updatePhaseTransition(now)

				if (camera && player) this.updateFollowCamera(deltaTime)
				if (player && now - lastLightUpdate > 300) {
					const nearest = lanternLightSources.slice().sort((a, b) => a.distanceToSquared(player.position) - b.distanceToSquared(player.position))
					lanternLights.forEach((light, index) => { if (nearest[index]) light.position.copy(nearest[index]) })
					lastLightUpdate = now
				}

				poiBeacons.forEach((beacon, index) => {
					const highlighted = beacon.userData.isHighlighted
					const crystal = beacon.userData.crystal
					const ring = beacon.userData.ring
					const label = beacon.userData.label
					const trigger = beacon.userData.trigger
					const distanceToPlayer = player
						? Math.hypot(player.position.x - beacon.position.x, player.position.z - beacon.position.z)
						: Number.POSITIVE_INFINITY
					if (player) this.updatePoiProximity(beacon, distanceToPlayer)
					if (crystal) {
						crystal.position.y = 0.82 + Math.sin(now * 0.0024 + index) * (highlighted ? 0.12 : 0.06)
						crystal.rotation.y += deltaTime * (highlighted ? 1.35 : 0.55)
					}
					if (ring) {
						const pulse = 1 + Math.sin(now * 0.0022 + index) * (highlighted ? 0.08 : 0.025)
						ring.scale.set(pulse, pulse, pulse)
					}
					if (label?.material) {
						const targetOpacity = highlighted || distanceToPlayer <= (trigger?.discoveryRadius || 7.2) + 1.4 ? 1 : 0
						label.material.opacity += (targetOpacity - label.material.opacity) * (1 - Math.exp(-8 * deltaTime))
						label.visible = label.material.opacity > 0.035
					}
				})

				/* 檐下软装只做小幅摆动，避免整根灯柱缩放造成漂浮感。 */
				decorations.forEach((group, idx) => {
					if (group.userData?.isBanner) {
						group.rotation.y = Math.sin(now * 0.0012 + idx) * 0.18
					}
				})
				environment.forEach((item) => { if (item.userData?.isCloudLayer) item.rotation.y += deltaTime * 0.0035 })

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
								const emitter = i / 3
								arr[i + 1] = 3.3 + Math.random() * .5
								arr[i] = (emitter % 2 ? -4.8 : 4.8) + (Math.random() - .5) * 2.4
								arr[i + 2] = (emitter % 4 < 2 ? 13.8 : -22.2) + (Math.random() - .5) * 2.4
							}
						}
					}
					pos.needsUpdate = true
				}

				if (now >= qualitySampleStartedAt) qualityFrameCount += 1
				const qualityElapsed = now - qualitySampleStartedAt
				if (renderer && qualityElapsed >= 3500) {
					const fps = qualityFrameCount * 1000 / qualityElapsed
					renderer.domElement.dataset.sceneStats = JSON.stringify({ fps: Math.round(fps), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, pixelRatio: renderPixelRatio, model: player?.userData?.modelVersion || 0, colliders: worldColliders.length, x: Number(player?.position.x.toFixed(2)), z: Number(player?.position.z.toFixed(2)) })
					const renderContainer = renderer.domElement?.parentElement
					const width = renderContainer?.clientWidth || window.innerWidth
					const height = renderContainer?.clientHeight || window.innerHeight
					const maxRatio = this.getRenderResolutionLimit(width, height)
					let nextRatio = renderPixelRatio
					if (fps < 43) nextRatio = Math.max(Math.min(.85, maxRatio), renderPixelRatio - 0.16)
					else if (fps > 57) nextRatio = Math.min(maxRatio, renderPixelRatio + 0.08)
					if (Math.abs(nextRatio - renderPixelRatio) >= 0.05) {
						this.setRenderResolution(width, height, nextRatio)
						qualityAdjusted = true
					}
					if (fps < 36 && renderer.shadowMap.enabled) {
						renderer.shadowMap.enabled = false
						renderer.shadowMap.needsUpdate = false
						qualityAdjusted = true
					}
					this.updateBloomBudget(fps, now)
					qualitySampleStartedAt = now
					qualityFrameCount = 0
				}

				try {
					this.renderSceneFrame()
					if (pendingSceneReady && renderer && !renderer.getContext().isContextLost()) {
						qualitySampleStartedAt = performance.now() + 1500; qualityFrameCount = 0
						lastTime = performance.now()
						const ready = pendingSceneReady
						pendingSceneReady = null
						emit('render-ready', ready)
					}
				} catch (error) {
					this.pauseRendering()
					emitRenderError(error)
				}
			}
			animate()
		},
		dispose() {
			bootGeneration += 1
			pendingSceneReady = null
			activeRenderRequest = null
			if (animationId) cancelAnimationFrame(animationId)
			animationId = null
			assetLoadGeneration += 1
			if (visibilityHandlerRef) document.removeEventListener('visibilitychange', visibilityHandlerRef)
			visibilityHandlerRef = null
			if (renderer) {
				renderer.domElement.removeEventListener('webglcontextlost', contextLostHandlerRef)
				renderer.domElement.removeEventListener('webglcontextrestored', contextRestoredHandlerRef)
			}
			contextLostHandlerRef = null
			contextRestoredHandlerRef = null
			// 解绑摇杆触摸监听（挂在常驻容器 #street-canvas 上，不随 canvas 重建而清，必须显式移除）。
			if (joystickCleanup) { joystickCleanup(); joystickCleanup = null }
			this.clearScene()
			this.disposeEffects()
			if (environmentTarget) environmentTarget.dispose()
			environmentTarget = null
			/* 释放程序化纹理缓存（共享纹理不在 clearScene 里清，统一在此释放） */
			Object.keys(textureCache).forEach((k) => { if (textureCache[k]) textureCache[k].dispose() })
			Object.keys(skyTextureCache).forEach((k) => { if (skyTextureCache[k]) skyTextureCache[k].dispose() })
			textureCache = {}
			skyTextureCache = {}
			brocadeTextureLoading = false
			rooflineTextureLoading = false
			stoneTextureLoading = false
			if (resizeHandlerRef) {
				window.removeEventListener('resize', resizeHandlerRef)
				resizeHandlerRef = null
			}
			if (renderer) {
				renderer.dispose()
				if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss()
				// renderer.dispose() 不会移除 DOM：手动把自建的 canvas 从容器摘除，避免切场/重试时残留叠加与 WebGL 上下文泄漏。
				const container = document.getElementById('street-canvas')
				if (container && renderer.domElement && renderer.domElement.parentNode === container) {
					try { container.removeChild(renderer.domElement) } catch (e) {}
				}
			}
			scene = null
			camera = null
			renderer = null
			ambientLightRef = null
			directionalLightRef = null
			hemiLightRef = null
			player = null
			environment = []
			buildings = []
			poiBeacons = []
			decorations = []
			decorationBatchRoot = null
			windClothMeshes = []
			lanternLights = []
			ambientActors = []
			animationMixers = []
			phaseTransition = null
			cameraTargetVec = null
			cameraOriginVec = null; cameraPlacementCandidate = null; cameraPlacementBest = null; cameraProbeHit = null
			cameraPositionVec = null
			currentWorldLayout = null
			movementVelocity = { x: 0, z: 0 }
			joystickInput = { dx: 0, dy: 0 }
			moveStepAccum = 0
			stepDistanceCarry = 0
			wasMoving = false
			qualityFrameCount = 0
			qualityAdjusted = false
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

.street-stage__poi-stamp > text { white-space: nowrap; }

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
