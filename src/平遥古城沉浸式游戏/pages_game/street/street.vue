<template>
	<view class="street-stage" :sceneCmd="sceneCmd" :change:sceneCmd="render.onSceneCmd">
		<!-- 3D 街景容器：renderjs 会让 THREE 自建 WebGL canvas 并挂入此 view。
		     绝不能用 <canvas type="2d">——那是 2D 上下文画布，new THREE.WebGLRenderer({canvas}) 取不到 WebGL 上下文会抛错（「一直在张望」根因之一）。 -->
		<view id="street-canvas" class="street-stage__canvas"></view>

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

		<!-- 加载（毛笔画圈 + 灯笼 + 晋小鸦正在张望…）；stage/hint 为可观测面包屑，escape 为兜底逃生 -->
		<BrushLoader
			:visible="isLoading"
			:progress="loadProgress"
			:stage="loadStage"
			:hint="loadHint"
			:tips="loadingTips"
			:show-escape="showEscape"
			@escape="forceEnterCity"
		/>

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
					<text v-if="poiDeepLines[activePoi.id]" class="street-stage__poi-story-deep">{{ poiDeepLines[activePoi.id] }}</text>
				</view>

				<!-- 我的札记（写过才显示）-->
				<view v-if="poiNote" class="street-stage__poi-mynote">
					<text class="street-stage__poi-mynote-label">— 我的札记 —</text>
					<text class="street-stage__poi-mynote-text">{{ poiNote }}</text>
				</view>

				<view class="street-stage__poi-footer">
					<view class="street-stage__poi-tools">
						<view class="street-stage__poi-tool" :class="{ 'street-stage__poi-tool--on': poiFavorited }" @tap="toggleFav">
							<text>{{ poiFavorited ? '★ 收藏' : '☆ 收藏' }}</text>
						</view>
						<view class="street-stage__poi-tool" @tap="editNote">
							<text>{{ poiNote ? '✎ 改札记' : '✎ 札记' }}</text>
						</view>
					</view>
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
			:kicker="entranceCopy.kicker"
			:title="entranceCopy.title"
			:desc="entranceCopy.desc"
		/>

		<!-- 街景内衣橱：从 HUD「行囊」唤起，换装即时热切换到 3D 化身 -->
		<OutfitWardrobe :visible="wardrobeOpen" @close="wardrobeOpen = false" @changed="onStreetWardrobeChanged" />

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
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
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
import { getStorage, patchStorageObject, hasSelectedRole, STORAGE_KEYS } from '@/common/utils/storage.js'
import { getLevelMeta, getLevelProgress } from '@/common/utils/level.js'
import { playBGM, stopBGM, playSFX, SFX, BGM } from '@/common/utils/audio.js'
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
	getQuestTargetPoi,
	recordSteps
} from '@/common/utils/quest-manager.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'
import { getCurrentPhase } from '@/common/utils/phase.js'
import { getContextualNpcCue } from '@/common/utils/npc-cue.js'
import { getEquippedCostumeSkin } from '@/common/data/costumes.js'
import { loadingTips, poiDeepLines } from '@/common/data/culture-tips.js'
import { toggleFavoritePoi, isFavoritePoi, getJournalNote, setJournalNote } from '@/common/utils/journal.js'
import MiniMap from '@/components/MiniMap.vue'
import OutfitWardrobe from '@/components/OutfitWardrobe.vue'

const statusLabelMap = { nearby: '已靠近', discoverable: '待点亮', quest: '主线热点', hot: '必看地标', route: '顺路可达' }

const userProfile = ref(getStorage(STORAGE_KEYS.userProfile, {}))
const userProgress = ref(getStorage(STORAGE_KEYS.userProgress, {}))
const currentStreetIndex = ref(0)
const activePoiId = ref('')
/* 当前是否正贴在某 POI 的进入半径内（独立于驱动卷轴遮罩的 activePoiId）：
   进入 poi-enter 置位、离开 poi-leave 清空，仅供 approach 浮空门控用，避免 activePoiId 粘滞导致预告哑火。*/
const nearActivePoiId = ref('')
const npcVisible = ref(false)
const npcMessage = ref('')
const npcAutoHide = ref(false)
const isLoading = ref(true)
const loadProgress = ref(0)
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
const playerWorldPos = ref({ x: 0, z: 10 })
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
const MAX_INIT_ATTEMPTS = 2
const LOAD_TIMEOUT = 10000
/* 绝对兜底（独立于 initScene 是否被调用）：onMounted 里无条件武装，杜绝任何「init 从未触发」的路径永久卡死。
   entryEscapeTimer：到点亮出「直接进入古城」按钮；entryFailsafeTimer：到点强制收起加载层。 */
let entryEscapeTimer = null
let entryFailsafeTimer = null
const ENTRY_ESCAPE_DELAY = 5000
const ENTRY_FAILSAFE_TIMEOUT = 14000

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
		playerSkin: getEquippedCostumeSkin(userProfile.value.roleId)
	}
}

watch(currentStreet, (street) => {
	activePoiId.value = ''
	nearActivePoiId.value = ''            // 切换街景后清空贴靠态，否则新街景的 approach 预告被旧 poiId 门控住而哑火
	setCurrentStreetScene(street.id, { sceneMode: 'story' })
	plaqueFlipping.value = true
	setTimeout(() => { plaqueFlipping.value = false }, 600)
})

function sendToRenderjs(type, data) {
	// 逻辑层 → renderjs：改变响应式 prop sceneCmd，触发 renderjs 的 :change 观察器。
	// APP 端逻辑层与视图层是两个 JS 上下文、不共享 window，故不能再用 window 事件。
	sceneCmd.value = { action: type, data: data || {}, ts: Date.now() }
}

/* renderjs → 逻辑层：renderjs 通过 this.$ownerInstance.callMethod('handleRenderMsg', {detail}) 回调。
   <script setup> 顶层函数可被 callMethod 命中（与 3d-test.vue 的 handleRenderMsg 同机制）。 */
function handleRenderMsg(msg) {
	if (!msg || !msg.detail) return
	const { type, data } = msg.detail
	if (type === 'view-ready') {
		// renderjs 视图层已挂载、:change 观察器就绪：若仍在加载且有缓存命令，补发一次，
		// 杜绝首帧 init 在观察器注册前被当「初始值」丢弃而永不 bootScene。
		renderViewReady = true
		loadStage.value = '视图就绪 · 加载 3D 引擎…'
		if (isLoading.value && lastSceneCmdPayload) {
			sendToRenderjs(lastSceneCmdAction, lastSceneCmdPayload)
		}
	} else if (type === 'render-stage') {
		// renderjs 各阶段面包屑：卡住时这行会停在最后到达的阶段，直接指明失败点。
		if (data) loadStage.value = String(data)
	} else if (type === 'render-ready') {
		clearLoadWatchdog()
		clearEntryTimers()
		loadStage.value = ''
		loadHint.value = ''
		showEscape.value = false
		isLoading.value = false
	} else if (type === 'render-progress') {
		loadProgress.value = Math.max(0, Math.min(100, Number(data) || 0))
	} else if (type === 'render-error') {
		// 终态错误：把错误文案留在加载层（而非一闪而过的 toast）并亮出逃生按钮，供定位与继续；
		// 不主动收起加载层——让开发者读到错误；绝对兜底计时器仍会在到点自动放行。
		clearLoadWatchdog()
		loadHint.value = '加载未完成：' + ((data && data.error) || '街景渲染失败')
		showEscape.value = true
		uni.showToast({ title: (data && data.error) || '街景加载失败', icon: 'none' })
	} else if (type === 'poi-enter') {
		handlePoiEnter(data)
	} else if (type === 'poi-leave') {
		handlePoiLeave()
	} else if (type === 'poi-near') {
		handlePoiApproach(data)
	} else if (type === 'player-move') {
		handlePlayerMove(data)
	}
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

/* 加载兜底：到点仍未收到 render-ready/render-error 就先重试一次，再不行也强制收起加载层，绝不永久卡「张望」。 */
function armLoadWatchdog() {
	clearLoadWatchdog()
	loadWatchdog = setTimeout(() => {
		if (!isLoading.value) return
		initAttempts += 1
		if (initAttempts < MAX_INIT_ATTEMPTS && lastSceneCmdPayload) {
			// 再给一次机会：init 用 reinit（renderjs 端会先 dispose 旧场景再重建、绕过 isInitialized 闩锁）；切街景用 loadScene。
			sendToRenderjs(lastSceneCmdAction === 'init' ? 'reinit' : 'loadScene', lastSceneCmdPayload)
			armLoadWatchdog()
		} else {
			isLoading.value = false
			uni.showToast({ title: '街景加载较慢，已先带你入城', icon: 'none', duration: 2200 })
		}
	}, LOAD_TIMEOUT)
}

function clearEntryTimers() {
	if (entryEscapeTimer) { clearTimeout(entryEscapeTimer); entryEscapeTimer = null }
	if (entryFailsafeTimer) { clearTimeout(entryFailsafeTimer); entryFailsafeTimer = null }
}

/* 绝对兜底：onMounted 无条件武装，完全独立于 initScene / renderjs。
   即便 init 因任何路径从未被调用（如 onLoad 早抛），到点也必亮出逃生按钮并强制放行——
   「永不被困在加载层」对所有代码路径成立，补上 watchdog 仅在 init 内武装的盲区。 */
function armEntryFailsafe() {
	clearEntryTimers()
	entryEscapeTimer = setTimeout(() => {
		if (isLoading.value) showEscape.value = true
	}, ENTRY_ESCAPE_DELAY)
	entryFailsafeTimer = setTimeout(() => {
		if (isLoading.value) {
			isLoading.value = false
			uni.showToast({ title: '街景加载较慢，已先带你入城', icon: 'none', duration: 2200 })
		}
	}, ENTRY_FAILSAFE_TIMEOUT)
}

/* 逃生按钮回调：用户主动放行，立即收起加载层并停掉所有计时器。 */
function forceEnterCity() {
	clearLoadWatchdog()
	clearEntryTimers()
	loadHint.value = ''
	showEscape.value = false
	isLoading.value = false
}

function initScene() {
	isLoading.value = true
	loadProgress.value = 0
	loadStage.value = '正在准备街景数据…'
	initAttempts = 0
	lastSceneCmdAction = 'init'
	lastSceneCmdPayload = buildScenePayload()
	armLoadWatchdog()
	sendToRenderjs('init', lastSceneCmdPayload)
}

function loadCurrentScene() {
	isLoading.value = true
	loadProgress.value = 0
	loadStage.value = '正在切换街景…'
	initAttempts = 0
	lastSceneCmdAction = 'loadScene'
	lastSceneCmdPayload = buildScenePayload()
	armLoadWatchdog()
	sendToRenderjs('loadScene', lastSceneCmdPayload)
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

function watchPhase() {
	if (phaseWatchTimer) return
	phaseWatchTimer = setInterval(() => {
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
	markPoiVisited(poiId)
	setCurrentPoi(poiId, poi.npcTopic)
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})

	const result = advanceQuestByEvent(EVENT_TYPES.poiEntered, { poiId, sceneId: currentStreet.value.id })
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

function handlePoiLeave() {
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
	markNpcTalk(activePoi.value.npcTopic)
	playSFX(SFX.NPC_TALK)
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
}

/* 收藏当前 POI（行旅册「心头好」）。 */
function toggleFav() {
	if (!activePoi.value) return
	const r = toggleFavoritePoi(activePoi.value.id)
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
			setJournalNote(poiId, res.content || '')
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
		uni.navigateTo({ url: '/pages_game/dialog/dialog' })
	}
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

// 步数批量写入：避免每步都触发 storage 同步
let pendingStepDelta = 0
let lastStepFlush = 0
const STEP_FLUSH_INTERVAL = 800  // ms
const STEP_FLUSH_MIN_DELTA = 5   // 至少累积 5 步再写

function flushSteps(force = false) {
	if (pendingStepDelta <= 0) return
	const now = Date.now()
	if (!force && pendingStepDelta < STEP_FLUSH_MIN_DELTA && now - lastStepFlush < STEP_FLUSH_INTERVAL) return
	const delta = pendingStepDelta
	const nextSteps = Number(userProgress.value.steps || 0) + delta
	pendingStepDelta = 0
	lastStepFlush = now
	patchStorageObject(STORAGE_KEYS.userProgress, { steps: nextSteps })
	userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
	// 把步数增量结算进「古城漫步」等步数任务（此前步数与任务系统零耦合，每日任务永远 0/1000）
	const stepResult = recordSteps(delta)
	if (stepResult.completed && stepResult.completed.length) {
		userProgress.value = getStorage(STORAGE_KEYS.userProgress, {})
		const done = stepResult.completed[0]
		uni.showToast({ title: `${done.quest.title} 达成 · 银钥+${done.rewards.silverKey}`, icon: 'none', duration: 2200 })
	}
}

function handlePlayerMove(detail) {
	// steps 为 renderjs 节流上报时累计的移动帧数；显式传入即按其计（含 0），未传入按 1 兜底——保证步数总量与逐帧上报时一致。
	const stepDelta = (detail && detail.steps !== undefined) ? Math.max(0, Number(detail.steps) || 0) : 1
	pendingStepDelta += stepDelta
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
		// 身份守卫：街景是主线核心场景，必须已择身份才可进入。无 roleId 直接进来（深链 / 异常重置）会让化身退化为「客」、
		// 角色加成与支线全部失效。无身份则退回启动页重新择身份。
		const guardProfile = getStorage(STORAGE_KEYS.userProfile, {})
		if (!hasSelectedRole(guardProfile)) {
			uni.reLaunch({ url: '/pages_game/splash/splash' })
			return
		}

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
	loadStage.value = '等待 3D 视图就绪…'
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
		// 即便初始化链抛错，加载层也由 armEntryFailsafe 到点兜底放行，绝不永久卡死。
	}
})

onUnmounted(() => {
	uni.showTabBar()
	flushSteps(true)
	stopWatchPhase()
	stopBGM()
	clearLoadWatchdog()
	clearEntryTimers()
})

/* 显式暴露给 renderjs 的 $ownerInstance.callMethod('handleRenderMsg') 调用：
   确保 Vue3 <script setup> 下回传通道可达，不依赖编译器隐式暴露（否则 render-ready 可能永远到不了逻辑层）。 */
defineExpose({ handleRenderMsg })

/* H5(vue3) 关键修复：uni-h5 的 callMethod 实现是 `this.$vm[funcName]`，即在「页面公共实例代理」上找方法；
   而 <script setup> 里 defineExpose 的方法只进 instance.exposed、不在公共代理上，故 H5 端 callMethod 静默落空、
   renderjs→逻辑层桥彻底失效（render-ready/poi/player-move 全到不了，加载层只能靠 14s 兜底收起）。
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
/* 移动上报节流：累计移动帧数（即步数增量），每 ~110ms 汇报一次，避免每帧 emit 以 ~60次/秒 轰炸
   渲染层↔逻辑层桥（callMethod）并触发 MiniMap 每帧重渲。步数总量与朝向解算保持不变。 */
let moveStepAccum = 0
let lastMoveEmit = 0
let wasMoving = false
let currentPhaseData = null
let ownerInstanceRef = null
let resizeHandlerRef = null
/* 复用对象，杜绝每帧分配：相机跟随目标向量（原先 animate 每帧 new THREE.Vector3，60fps 下每分钟 ~3600 次分配 → GC 抖动）。*/
let cameraTargetVec = null
/* 摇杆监听清理句柄：createJoystick 绑定时赋值，dispose/reinit 时调用，避免重复进入时监听堆叠（僵尸监听泄漏）。*/
let joystickCleanup = null
/* 画面特效（Bloom 后处理）总开关：由逻辑层依 gameSettings.enableEffect 下发。关闭则直接渲染、跳过 composer，
   既尊重「画面特效」设置，也给低端机一条降负载逃生路。*/
let effectsEnabled = true
/* 化身皮肤：由逻辑层依已装备服饰下发（body/head/hat 颜色等），createPlayer 据此着色玩家化身。null 则用默认配色。*/
let playerSkinData = null

/* 程序化纹理缓存：跨场景复用，避免每次 loadScene 重复生成上传 GPU。
   只在 dispose() 里统一释放，clearScene 不动它们（material.dispose 不级联 texture）。*/
let textureCache = {}
let skyTextureCache = {}

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
		/* ===== 程序化纹理工具（CanvasTexture，零外部图片） ===== */
		getTexture(key, factory) {
			if (textureCache[key]) return textureCache[key]
			const tex = factory()
			if (tex) textureCache[key] = tex
			return tex
		},
		makeCanvas(size) {
			const canvas = document.createElement('canvas')
			canvas.width = size
			canvas.height = size
			return canvas
		},
		/* 青砖墙：横向砖块 + 砖缝 + 轻微做旧斑驳 */
		makeBrickTexture(baseHex, mortarHex) {
			return this.getTexture('brick_' + baseHex + '_' + mortarHex, () => {
				const size = 512
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = mortarHex
				ctx.fillRect(0, 0, size, size)

				const rows = 14
				const brickH = size / rows
				for (let r = 0; r < rows; r++) {
					const y = r * brickH
					const offset = (r % 2) * (size / 12)
					const cols = 6
					const brickW = size / cols
					for (let c = -1; c <= cols; c++) {
						const x = c * brickW + offset
						// 每块砖在基色上做轻微明暗扰动，营造做旧感
						const shade = 0.86 + Math.random() * 0.18
						ctx.fillStyle = this.tintHex(baseHex, shade)
						ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4)
						// 偶尔点缀风化斑点
						if (Math.random() < 0.3) {
							ctx.fillStyle = 'rgba(60, 48, 36, 0.10)'
							const sx = x + 4 + Math.random() * (brickW - 10)
							const sy = y + 4 + Math.random() * (brickH - 8)
							ctx.fillRect(sx, sy, 2 + Math.random() * 6, 1 + Math.random() * 3)
						}
					}
				}
				const tex = new THREE.CanvasTexture(canvas)
				tex.wrapS = THREE.RepeatWrapping
				tex.wrapT = THREE.RepeatWrapping
				tex.colorSpace = THREE.SRGBColorSpace
				tex.needsUpdate = true
				return tex
			})
		},
		/* 灰瓦屋顶：纵向瓦垄条纹 + 高光 */
		makeRoofTexture(tileHex) {
			return this.getTexture('roof_' + tileHex, () => {
				const size = 256
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = tileHex
				ctx.fillRect(0, 0, size, size)
				const ridges = 16
				const w = size / ridges
				for (let i = 0; i < ridges; i++) {
					const x = i * w
					ctx.fillStyle = this.tintHex(tileHex, 1.18)
					ctx.fillRect(x, 0, w * 0.32, size)
					ctx.fillStyle = this.tintHex(tileHex, 0.72)
					ctx.fillRect(x + w * 0.78, 0, w * 0.22, size)
				}
				// 横向瓦当暗缝
				ctx.fillStyle = 'rgba(20, 20, 24, 0.18)'
				for (let y = 0; y < size; y += size / 6) {
					ctx.fillRect(0, y, size, 2)
				}
				const tex = new THREE.CanvasTexture(canvas)
				tex.wrapS = THREE.RepeatWrapping
				tex.wrapT = THREE.RepeatWrapping
				tex.colorSpace = THREE.SRGBColorSpace
				tex.needsUpdate = true
				return tex
			})
		},
		/* 木纹：竖向木纹 + 节疤，用于门框 / 木柱 */
		makeWoodTexture(woodHex) {
			return this.getTexture('wood_' + woodHex, () => {
				const size = 256
				const canvas = this.makeCanvas(size)
				const ctx = canvas.getContext('2d')
				ctx.fillStyle = woodHex
				ctx.fillRect(0, 0, size, size)
				for (let i = 0; i < 40; i++) {
					const x = Math.random() * size
					ctx.strokeStyle = Math.random() < 0.5
						? this.tintHex(woodHex, 0.82)
						: this.tintHex(woodHex, 1.14)
					ctx.lineWidth = 0.5 + Math.random() * 1.5
					ctx.beginPath()
					ctx.moveTo(x, 0)
					ctx.bezierCurveTo(x + 6, size * 0.33, x - 6, size * 0.66, x + 2, size)
					ctx.stroke()
				}
				const tex = new THREE.CanvasTexture(canvas)
				tex.wrapS = THREE.RepeatWrapping
				tex.wrapT = THREE.RepeatWrapping
				tex.colorSpace = THREE.SRGBColorSpace
				tex.needsUpdate = true
				return tex
			})
		},
		/* 木格窗：透明底 + 暖色窗棂格栅，作为窗扇贴图 */
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
				tex.colorSpace = THREE.SRGBColorSpace
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
				tex.repeat.set(8, 8)
				tex.colorSpace = THREE.SRGBColorSpace
				tex.needsUpdate = true
				return tex
			})
		},
		/* 天空渐变（顶→底两色），夜晚追加星点 */
		makeSkyTexture(topHex, bottomHex, withStars) {
			const key = 'sky_' + topHex + '_' + bottomHex + (withStars ? '_star' : '')
			if (skyTextureCache[key]) return skyTextureCache[key]
			const w = 256
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
			if (withStars) {
				// 仅在上半部撒星，避免压到地平线
				for (let i = 0; i < 110; i++) {
					const sx = Math.random() * w
					const sy = Math.random() * h * 0.55
					const r = Math.random() < 0.85 ? 0.6 + Math.random() * 0.8 : 1.4 + Math.random() * 1.0
					ctx.fillStyle = `rgba(255, 250, 235, ${0.45 + Math.random() * 0.5})`
					ctx.beginPath()
					ctx.arc(sx, sy, r, 0, Math.PI * 2)
					ctx.fill()
				}
				// 少量带光晕的亮星
				for (let i = 0; i < 6; i++) {
					const sx = Math.random() * w
					const sy = Math.random() * h * 0.4
					const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6)
					halo.addColorStop(0, 'rgba(255, 248, 220, 0.9)')
					halo.addColorStop(1, 'rgba(255, 248, 220, 0)')
					ctx.fillStyle = halo
					ctx.beginPath()
					ctx.arc(sx, sy, 6, 0, Math.PI * 2)
					ctx.fill()
				}
			}
			const tex = new THREE.CanvasTexture(canvas)
			tex.colorSpace = THREE.SRGBColorSpace
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
					ctx.loadScene(data)
					/* 换幕 / 路由重建完成即发 render-ready 隐藏加载层：动画循环在首次 init 时已启动，
					   重建后的场景下一帧即呈现；首次 init 的 render-ready 仍由 initScene 末尾发出，故首屏不闪。*/
					emit('render-ready')
				} else if (action === 'highlightPoi') {
					ctx.highlightQuestPoi(data.poiId)
				} else if (action === 'applyPhase') {
					ctx.applyPhase(data.phase)
				} else if (action === 'reskinPlayer') {
					ctx.reskinPlayer(data.playerSkin)
				}
			} catch (err) {
				// 观察器内任何同步抛错都转成终态信号，避免逻辑层永远收不到 ready/error 而卡「张望」。
				emit('render-error', { error: (err && err.message) || '街景命令处理失败' })
			}
		},
		loadScript(src) {
			return new Promise((resolve, reject) => {
				const script = document.createElement('script')
				let settled = false
				const done = (fn, arg) => { if (!settled) { settled = true; clearTimeout(timer); fn(arg) } }
				// 超时兜底：<script> 既不 onload 也不 onerror（APP 云打包后 /static 路径异常）时不至于永久挂起。
				const timer = setTimeout(() => done(reject, new Error(src + ' 加载超时')), 8000)
				script.src = src
				script.onload = () => done(resolve)
				script.onerror = () => done(reject, new Error(src + ' 加载失败'))
				document.head.appendChild(script)
			})
		},
		async bootScene(data) {
			try {
				// 快速路径：reinit / 二次进入时 window.THREE 及后处理类已就位，跳过 7 个 <script> 的重复注入，加速恢复。
				if (window.THREE && window.THREE.EffectComposer && window.THREE.RenderPass && window.THREE.UnrealBloomPass) {
					THREE = window.THREE
					emit('render-progress', 70)
					emit('render-stage', '渲染环境就绪 · 搭建街景…')
					this.initScene(data)
					return
				}
				// 依赖顺序至关重要：EffectComposer.js 定义 THREE.Pass，必须先于 RenderPass/ShaderPass/UnrealBloomPass 加载——
				// 后三者在脚本求值期就 `class X extends THREE.Pass`，若 Pass 未定义会同步抛 TypeError，
				// 致 THREE.RenderPass/ShaderPass 为 undefined，随后 new THREE.EffectComposer() 内部 new THREE.ShaderPass 再崩。
				// 旧顺序把 ShaderPass/RenderPass 排在 EffectComposer 之前，是 3D 必崩的第二处根因。
				const libs = [
					'/static/libs/three.min.js',
					'/static/libs/CopyShader.js',
					'/static/libs/LuminosityHighPassShader.js',
					'/static/libs/EffectComposer.js',
					'/static/libs/RenderPass.js',
					'/static/libs/ShaderPass.js',
					'/static/libs/UnrealBloomPass.js'
				]
				for (let i = 0; i < libs.length; i++) {
					emit('render-stage', '加载 3D 引擎库 ' + (i + 1) + '/' + libs.length + '…')
					await this.loadScript(libs[i])
					emit('render-progress', Math.round(((i + 1) / libs.length) * 70))
				}
				THREE = window.THREE
				if (!THREE) {
					isInitialized = false
					emit('render-error', { error: 'Three.js 未能加载' })
					return
				}
				// 校验后处理类是否就位：任一缺失即发终态，避免到 new EffectComposer 才静默崩。
				if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) {
					isInitialized = false
					emit('render-error', { error: '后处理库未就位（加载顺序/缺文件）' })
					return
				}
				emit('render-stage', '渲染环境就绪 · 搭建街景…')
				this.initScene(data)
			} catch (err) {
				isInitialized = false
				emit('render-error', { error: (err && err.message) || '街景资源加载失败' })
			}
		},

		initScene(data) {
			if (!THREE) {
				emit('render-error', { error: 'Three.js 未准备完成' })
				return
			}

			// 画面特效开关 + 化身皮肤：由逻辑层随载荷下发，先存模块态供 createPlayer / 后处理分支读取。
			effectsEnabled = data.effectsEnabled !== false
			playerSkinData = data.playerSkin || null

			// 渲染目标用普通容器 <view id="street-canvas">，让 THREE 自建 WebGL canvas 再挂入；
			// 绝不能把 <canvas type="2d"> 喂给 new WebGLRenderer({canvas})——取不到 WebGL 上下文会同步抛错（「一直在张望」根因之一）。
			const container = document.getElementById('street-canvas')
			if (!container) {
				emit('render-error', { error: '未找到街景容器' })
				return
			}

			// 幂等防护：极端慢加载（7 库累计 10~14s）下，10s watchdog 的 reinit 可能与「仍在进行的首个 boot」竞态，
			// 致两次进到 initScene。若已存在 renderer，先彻底拆除旧场景（dispose 会取消旧 rAF、摘除旧 canvas、释放纹理并复位状态），
			// 再重建——保证任何路径下都只有一个 WebGL 上下文 / 一块 canvas / 一个渲染循环，杜绝叠加重影与上下文泄漏。
			if (renderer) this.dispose()

			const width = container.clientWidth || window.innerWidth
			const height = container.clientHeight || window.innerHeight
			scene = new THREE.Scene()

			const phase = data.phase || null
			const fallbackSky = colorHex(data.streetData.sceneTone?.skyTop, 0xD7C0A2)
			const skyColor = phase ? colorHex(phase.sky?.top, fallbackSky) : fallbackSky
			const fogColor = phase ? colorHex(phase.fog?.color, skyColor) : skyColor
			const fogDensity = phase?.fog?.density || data.streetData.ambience?.fogDensity || 0.02

			/* 渐变天空（夜晚带星空），替代单色背景 */
			currentPhaseData = phase
			this.refreshSky(phase, data.streetData.sceneTone?.skyTop, data.streetData.sceneTone?.skyBottom)
			scene.fog = new THREE.FogExp2(fogColor, fogDensity)

			camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
			camera.position.set(0, 5, 10)

			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
			renderer.setSize(width, height)
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
			renderer.shadowMap.enabled = true
			renderer.shadowMap.type = THREE.PCFSoftShadowMap
			renderer.toneMapping = THREE.ACESFilmicToneMapping
			renderer.toneMappingExposure = phase?.exposure || 1.15
			renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
			container.appendChild(renderer.domElement)

			/* 后处理（Bloom）：失败则降级为直接渲染，绝不因后处理异常而黑屏或卡死。
			   「画面特效」关闭时直接跳过 composer，省下整条 Bloom pass 的逐帧开销（低端机降负载）。*/
			composer = null
			bloomPassRef = null
			if (effectsEnabled) {
				try {
					composer = new THREE.EffectComposer(renderer)
					composer.addPass(new THREE.RenderPass(scene, camera))
					bloomPassRef = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), phase?.bloomStrength || 0.85, 0.5, 0.6)
					composer.addPass(bloomPassRef)
				} catch (err) {
					composer = null
					bloomPassRef = null
				}
			}

			/* 横屏/尺寸变化时同步相机与渲染尺寸 */
			if (!resizeHandlerRef) {
				resizeHandlerRef = () => {
					const w = container.clientWidth || window.innerWidth
					const h = container.clientHeight || window.innerHeight
					if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix() }
					if (renderer) renderer.setSize(w, h)
					if (composer) composer.setSize(w, h)
				}
				window.addEventListener('resize', resizeHandlerRef)
			}

			currentPhaseData = phase
			this.loadScene(data)
			emit('render-stage', '点亮街景…')
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
				map: this.makeStoneGroundTexture(),
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
				/* 青砖墙纹理：庙宇/城门偏暖砖，民居/商铺偏青灰砖 */
				const warmStyle = building.style === 'gate' || building.style === 'temple'
				const brickBase = warmStyle ? '#b89a72' : '#9aa093'
				const brickTex = this.makeBrickTexture(brickBase, '#5b5247')
				const bodyMaterial = new THREE.MeshStandardMaterial({
					color: building.style === 'gate' ? 0xe8dcc4 : building.style === 'temple' ? 0xf0e6d4 : 0xe6ddcc,
					map: brickTex,
					roughness: 0.92,
					flatShading: true
				})
				const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
				body.position.y = 1.6
				body.castShadow = true
				body.receiveShadow = true
				group.add(body)

				const roofGeometry = new THREE.ConeGeometry(3.1, 1.3, 4)
				const roofMaterial = new THREE.MeshStandardMaterial({
					color: building.style === 'gate' ? 0xb89a86 : 0xcfcfcf,
					map: this.makeRoofTexture(building.style === 'gate' ? '#5a3a2b' : '#3d3d3d'),
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

				/* 程序化建筑细节：门框 / 木格窗 / 檐下斗拱 / 正脊 */
				this.addBuildingDetails(group, building, depth)

				group.position.set(x, 0, z)
				group.userData = { buildingId: building.id, poiId: building.poiId || '', type: building.style || 'building' }
				scene.add(group)
				buildings.push(group)
			})
		},
		/* 给单栋建筑 group 追加几何细节（全部 add 进 group，随 clearScene 一起回收） */
		addBuildingDetails(group, building, depth) {
			const bodyH = 3.2 + depth * 0.2
			const halfW = 2.15
			const frontZ = 1.56  // body 半深 3.1/2 ≈ 1.55，贴在朝玩家正面
			const woodTex = this.makeWoodTexture('#5a3320')
			const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.85, flatShading: true })

			/* 门框 + 门洞（朝玩家正面，居中偏下） */
			const doorW = 1.1
			const doorH = Math.min(2.0, bodyH * 0.62)
			const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.34, doorH + 0.28, 0.16), frameMat)
			doorFrame.position.set(0, doorH / 2 + 0.05, frontZ)
			group.add(doorFrame)
			const doorPanel = new THREE.Mesh(
				new THREE.PlaneGeometry(doorW, doorH),
				new THREE.MeshStandardMaterial({ color: 0x3a2415, map: woodTex, roughness: 0.8, side: THREE.DoubleSide, flatShading: true })
			)
			doorPanel.position.set(0, doorH / 2 + 0.05, frontZ + 0.09)
			group.add(doorPanel)
			// 门钉/门环点缀
			const knob = new THREE.Mesh(
				new THREE.SphereGeometry(0.07, 8, 8),
				new THREE.MeshStandardMaterial({ color: 0xC9A227, emissive: 0x3a2c00, roughness: 0.4, metalness: 0.6 })
			)
			knob.position.set(0.22, doorH / 2 + 0.05, frontZ + 0.12)
			group.add(knob)

			/* 木格窗：正面门两侧各一扇，夜里靠 emissive 透光（userData.isWindowGlow） */
			const latticeTex = this.makeLatticeTexture('#6b3a1c')
			const winSize = 0.95
			const winY = Math.min(bodyH * 0.7, doorH + 0.55)
			const winMatBase = () => new THREE.MeshStandardMaterial({
				color: 0xffffff,
				map: latticeTex,
				emissive: 0xffcf85,
				emissiveMap: latticeTex,
				emissiveIntensity: 0.0,
				roughness: 0.7,
				side: THREE.DoubleSide,
				flatShading: true
			})
			;[-1, 1].forEach((sign) => {
				const win = new THREE.Mesh(new THREE.PlaneGeometry(winSize, winSize), winMatBase())
				win.position.set(sign * 1.25, winY, frontZ + 0.02)
				win.userData.isWindowGlow = true
				group.add(win)
				// 窗楣木条
				const lintel = new THREE.Mesh(new THREE.BoxGeometry(winSize + 0.2, 0.12, 0.14), frameMat)
				lintel.position.set(sign * 1.25, winY + winSize / 2 + 0.12, frontZ)
				group.add(lintel)
			})

			/* 檐下斗拱：屋檐下沿一排小木块 */
			const eaveY = bodyH + 0.42
			const dougongMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2c, map: woodTex, roughness: 0.85, flatShading: true })
			for (let i = -2; i <= 2; i++) {
				const dg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.34), dougongMat)
				dg.position.set(i * 0.85, eaveY, frontZ - 0.1)
				group.add(dg)
			}
			// 檐枋横木（贯穿正面屋檐）
			const beam = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.3, 0.22, 0.26), frameMat)
			beam.position.set(0, eaveY + 0.22, frontZ - 0.06)
			group.add(beam)

			/* 正脊：屋顶顶端一根脊，配两端小脊兽 */
			const ridge = new THREE.Mesh(
				new THREE.BoxGeometry(2.4, 0.16, 0.16),
				new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.9, flatShading: true })
			)
			ridge.position.set(0, 4.7 + depth * 0.1, 0)
			ridge.rotation.y = Math.PI / 4
			group.add(ridge)
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
				/* 预置 nearHinted：出生点(0,0,10)附近(<8)的信标视为“已在身边”，不在加载首帧弹由远及近预告
				   （否则瞬间盖掉入城/任务引导语）；玩家走远(>=9)再回来才会触发。*/
				const spawnDist = Math.sqrt(x * x + (z - 10) * (z - 10))
				group.userData = { poiId: poi.id, type: 'poi', isHighlighted: poi.status === 'quest', entered: false, nearHinted: spawnDist < 8 }
				scene.add(group)
				poiBeacons.push(group)
			})
		},
		createPlayer() {
			// 化身按已装备服饰着色：body/head 必有，robe（长衫下摆）/hat（冠帽）/accent（足部光环）按服饰可选，
			// 让「换装」在第一视角街景里真实可见。playerSkinData 为 null 时回退默认票号行客配色。
			const skin = playerSkinData || {}
			const group = new THREE.Group()

			const body = new THREE.Mesh(
				new THREE.CylinderGeometry(0.32, 0.38, 1.2, 8),
				new THREE.MeshStandardMaterial({ color: colorHex(skin.body, 0x8B4513), roughness: 0.72, flatShading: true })
			)
			body.position.y = 0.6
			body.castShadow = true
			group.add(body)

			/* 长衫下摆：装备含 robe 时加一圈锥形裙摆，远看即知换了身衣裳 */
			if (skin.robe) {
				const robe = new THREE.Mesh(
					new THREE.ConeGeometry(0.52, 0.95, 10, 1, true),
					new THREE.MeshStandardMaterial({ color: colorHex(skin.robe, colorHex(skin.body, 0x8B4513)), roughness: 0.7, side: THREE.DoubleSide, flatShading: true })
				)
				robe.position.y = 0.5
				group.add(robe)
			}

			const head = new THREE.Mesh(
				new THREE.SphereGeometry(0.26, 10, 8),
				new THREE.MeshStandardMaterial({ color: colorHex(skin.head, 0xD4A574), roughness: 0.6, flatShading: true })
			)
			head.position.y = 1.42
			group.add(head)

			/* 冠帽：装备含 hat 时戴一顶（账房瓜皮帽 / 镖师笠帽 / 书生纶巾等以颜色区分） */
			if (skin.hat) {
				const hat = new THREE.Mesh(
					new THREE.ConeGeometry(0.3, 0.32, 10),
					new THREE.MeshStandardMaterial({ color: colorHex(skin.hat, 0x2c2c2c), roughness: 0.6, flatShading: true })
				)
				hat.position.y = 1.74
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

			group.position.set(0, 0, 10)
			scene.add(group)
			player = group
		},
		/* 热换装：按新皮肤重建玩家化身，不重载整场景；保留当前所在位置（不把玩家弹回出生点）。 */
		reskinPlayer(skin) {
			if (!scene) return
			playerSkinData = skin || null
			const prevPos = player ? { x: player.position.x, y: player.position.y, z: player.position.z } : null
			if (player) {
				scene.remove(player)
				player.traverse((item) => {
					if (item.geometry) item.geometry.dispose()
					if (item.material) item.material.dispose()
				})
				player = null
			}
			this.createPlayer()
			if (prevPos && player) player.position.set(prevPos.x, prevPos.y, prevPos.z)
		},
		createDecorations(streetData) {
			/* 沿玩家可视区域均匀放置装饰物：石灯 / 古槐 / 旗幡 / 鼓 / 盆栽 / 石阶 / 招幌 / 风铃 */
			const decorPlan = [
				{ kind: 'lantern-post', x: -14, z: 4 },
				{ kind: 'lantern-post', x: 14, z: 4 },
				{ kind: 'tree', x: -10, z: -2 },
				{ kind: 'tree', x: 10, z: -2 },
				{ kind: 'banner', x: -6, z: 1 },
				{ kind: 'banner', x: 6, z: 1 },
				{ kind: 'drum', x: 0, z: 7 },
				{ kind: 'potted', x: -3.4, z: 5.5 },
				{ kind: 'potted', x: 3.4, z: 5.5 },
				{ kind: 'stone-step', x: -8.5, z: 3 },
				{ kind: 'stone-step', x: 8.5, z: 3 },
				{ kind: 'hanging-sign', x: -11.5, z: 1.5 },
				{ kind: 'hanging-sign', x: 11.5, z: 1.5 },
				{ kind: 'wind-chime', x: -14, z: 4 },
				{ kind: 'wind-chime', x: 14, z: 4 }
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

					/* 挑杆横木：从灯柱顶端探出，灯笼悬于杆端 */
					const arm = new THREE.Mesh(
						new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6),
						new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9, flatShading: true })
					)
					arm.rotation.z = Math.PI / 2
					arm.position.set(0.4, 2.55, 0)
					group.add(arm)

					const lantern = new THREE.Mesh(
						new THREE.SphereGeometry(0.36, 12, 10),
						new THREE.MeshStandardMaterial({
							color: 0xC41E3A,
							emissive: 0xC41E3A,
							emissiveIntensity: 0.85,
							flatShading: true
						})
					)
					lantern.position.set(0.8, 2.35, 0)
					group.add(lantern)
					// 灯穗
					const tassel = new THREE.Mesh(
						new THREE.ConeGeometry(0.06, 0.24, 6),
						new THREE.MeshStandardMaterial({ color: 0xE8B84B, emissive: 0x4a3200, roughness: 0.6, flatShading: true })
					)
					tassel.position.set(0.8, 1.95, 0)
					group.add(tassel)
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
					line.position.y = 2.4
					group.add(line)
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
				}

				group.position.set(d.x, 0, d.z)
				scene.add(group)
				decorations.push(group)
			})
		},
		createParticles(phase) {
			const type = phase?.fallingType || 'leaf'
			// 粒子数下调（firefly 80→50，其余 40→26）：animate 每帧对每个粒子做 sin/cos + 改写 position buffer 并整体上传 GPU，
			// 是逐帧最重的一项。减量后视觉仍连贯，低端机帧时间明显下降。
			const count = type === 'firefly' ? 50 : 26
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
			/* 渐变天空（夜晚带星空），随时辰刷新 */
			this.refreshSky(phase)
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

			/* 灯笼 / 旗幡 / 招幌：夜间增强发光 */
			const lit = phase.lanternsLit
			decorations.forEach((group) => {
				if (group.userData?.isLantern) {
					group.traverse((mesh) => {
						if (mesh.isMesh && mesh.material && mesh.material.emissive) {
							mesh.material.emissiveIntensity = lit ? 1.4 : 0.55
						}
					})
				}
				if (group.userData?.isBanner || group.userData?.isSign) {
					group.traverse((mesh) => {
						if (mesh.isMesh && mesh.material && mesh.material.emissive) {
							mesh.material.emissiveIntensity = lit ? 0.45 : 0.18
						}
					})
				}
			})

			/* 建筑窗格：入夜后窗纸透暖光，配合 Bloom 晕染出灯火气 */
			this.updateWindowGlow(phase)
		},
		/* 根据时辰调整建筑木格窗的透光强度（晨/午暗、昏微亮、夜最亮） */
		updateWindowGlow(phase) {
			const key = phase?.key
			const glow = key === 'night' ? 1.15 : key === 'dusk' ? 0.6 : 0.0
			buildings.forEach((group) => {
				group.traverse((mesh) => {
					if (mesh.isMesh && mesh.userData?.isWindowGlow && mesh.material) {
						mesh.material.emissiveIntensity = glow
					}
				})
			})
		},
		createJoystick() {
			const canvas = document.getElementById('street-canvas')
			if (!canvas) return

			// reinit 时先解绑上一轮，避免触摸监听重复堆叠（僵尸监听）。
			if (joystickCleanup) { joystickCleanup(); joystickCleanup = null }

			let isTouching = false
			let touchStartX = 0
			let touchStartY = 0

			const onTouchStart = (event) => {
				const touch = event.touches[0]
				if (touch.clientX < window.innerWidth * 0.4 && touch.clientY > window.innerHeight * 0.5) {
					isTouching = true
					touchStartX = touch.clientX
					touchStartY = touch.clientY
				}
			}
			const onTouchMove = (event) => {
				if (!isTouching) return
				const touch = event.touches[0]
				const dx = (touch.clientX - touchStartX) / 70
				const dy = (touch.clientY - touchStartY) / 70
				joystickInput.dx = Math.max(-1, Math.min(1, dx))
				joystickInput.dy = Math.max(-1, Math.min(1, dy))
			}
			const onTouchEnd = () => {
				isTouching = false
				joystickInput.dx = 0
				joystickInput.dy = 0
			}

			canvas.addEventListener('touchstart', onTouchStart)
			canvas.addEventListener('touchmove', onTouchMove)
			canvas.addEventListener('touchend', onTouchEnd)

			// 句柄留给 dispose() 解绑：renderer.domElement 切场会重建，但监听挂在常驻容器 #street-canvas 上，必须显式移除。
			joystickCleanup = () => {
				canvas.removeEventListener('touchstart', onTouchStart)
				canvas.removeEventListener('touchmove', onTouchMove)
				canvas.removeEventListener('touchend', onTouchEnd)
				joystickInput.dx = 0
				joystickInput.dy = 0
			}
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
						} else {
							// color 复位移出 emissive 门控：体积光柱 beam 是 MeshBasicMaterial（只有 .color、无 .emissive），
							// 旧写法 else if (emissive) 会跳过它，导致取消高亮后旧目标光柱卡在金色 0xFFD700。
							if (mesh.material.color) mesh.material.color.setHex(0xD4A574)
							if (mesh.material.emissive) {
								mesh.material.emissive.setHex(0xD4A574)
								mesh.material.emissiveIntensity = 0.7
							}
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

			/* 玩家化身每次 loadScene 都会 createPlayer 重建；若不在此移除旧 player，
			   切换街景后旧化身会残留并逐次叠加（视觉重影 + 几何/材质泄漏）。比照 particles 一并清理。*/
			if (player) {
				scene.remove(player)
				player.traverse((item) => {
					if (item.geometry) item.geometry.dispose()
					if (item.material) item.material.dispose()
				})
				player = null
			}
		},
		startAnimation() {
			// 幂等：先取消可能残留的上一轮 rAF，确保任何路径（含极端竞态）下都只有一个动画循环，杜绝孤儿循环空转。
			if (animationId) { cancelAnimationFrame(animationId); animationId = null }
			const animate = () => {
				animationId = requestAnimationFrame(animate)
				const now = Date.now()
				const deltaTime = (now - lastTime) / 1000
				lastTime = now

				const moving = player && (joystickInput.dx !== 0 || joystickInput.dy !== 0)
				if (moving) {
					player.position.x = Math.max(-18, Math.min(18, player.position.x + joystickInput.dx * 4 * deltaTime))
					player.position.z = Math.max(-18, Math.min(16, player.position.z + joystickInput.dy * 4 * deltaTime))
					moveStepAccum += 1
					// 节流上报：累计步数、每 ~150ms 汇报一次（含步数增量 steps），桥调用 ~60→~6.7 次/秒、MiniMap 同比少重渲，
					// 步数总量与朝向解算不变（停步时补发最终坐标+残余步数）。
					if (now - lastMoveEmit >= 150) {
						emit('player-move', { x: player.position.x, z: player.position.z, steps: moveStepAccum })
						moveStepAccum = 0
						lastMoveEmit = now
					}
					wasMoving = true
				} else if (wasMoving) {
					// 刚停下：补发最终坐标 + 残余步数，避免短促移动（<110ms）丢步或 MiniMap 停在旧位。
					if (player) emit('player-move', { x: player.position.x, z: player.position.z, steps: moveStepAccum })
					moveStepAccum = 0
					wasMoving = false
				}

				if (camera && player) {
					const target = player.position
					if (!cameraTargetVec) cameraTargetVec = new THREE.Vector3()
					cameraTargetVec.set(target.x + 0.2, target.y + 6, target.z + 9)
					camera.position.lerp(cameraTargetVec, 0.08)
					camera.lookAt(target.x, target.y + 1.3, target.z - 5)
				}

				poiBeacons.forEach((beacon) => {
					beacon.position.y = beacon.userData.isHighlighted ? 0.2 + Math.sin(now * 0.003) * 0.18 : 0.06
					beacon.rotation.y += deltaTime * (beacon.userData.isHighlighted ? 1.2 : 0.4)
				})

				/* 装饰物：旗幡轻晃，灯笼微呼吸，招幌摇曳，风铃轻摆 */
				decorations.forEach((group, idx) => {
					if (group.userData?.isBanner) {
						group.rotation.y = Math.sin(now * 0.0012 + idx) * 0.18
					}
					if (group.userData?.isLantern) {
						const scale = 1 + Math.sin(now * 0.002 + idx) * 0.04
						group.scale.set(scale, scale, scale)
						group.rotation.z = Math.sin(now * 0.0014 + idx) * 0.05
					}
					if (group.userData?.isSign) {
						group.rotation.z = Math.sin(now * 0.0016 + idx) * 0.08
					}
					if (group.userData?.isWindChime) {
						group.rotation.x = Math.sin(now * 0.0026 + idx) * 0.12
						group.rotation.z = Math.cos(now * 0.0021 + idx) * 0.1
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
						/* 外圈预告：进入 3.2~8 区间发一次 poi-near（由远及近的浮空提示），离开 9 复位（带迟滞） */
						if (distance >= 3.2 && distance < 8 && !beacon.userData.nearHinted) {
							beacon.userData.nearHinted = true
							emit('poi-near', beacon.userData.poiId)
						} else if (distance >= 9 && beacon.userData.nearHinted) {
							beacon.userData.nearHinted = false
						}
					})
				}

				if (composer) composer.render()
				else if (renderer && scene && camera) renderer.render(scene, camera)
			}
			animate()
		},
		dispose() {
			if (animationId) cancelAnimationFrame(animationId)
			// 解绑摇杆触摸监听（挂在常驻容器 #street-canvas 上，不随 canvas 重建而清，必须显式移除）。
			if (joystickCleanup) { joystickCleanup(); joystickCleanup = null }
			this.clearScene()
			/* 释放程序化纹理缓存（共享纹理不在 clearScene 里清，统一在此释放） */
			Object.keys(textureCache).forEach((k) => { if (textureCache[k]) textureCache[k].dispose() })
			Object.keys(skyTextureCache).forEach((k) => { if (skyTextureCache[k]) skyTextureCache[k].dispose() })
			textureCache = {}
			skyTextureCache = {}
			if (resizeHandlerRef) {
				window.removeEventListener('resize', resizeHandlerRef)
				resizeHandlerRef = null
			}
			if (renderer) {
				renderer.dispose()
				// renderer.dispose() 不会移除 DOM：手动把自建的 canvas 从容器摘除，避免切场/重试时残留叠加与 WebGL 上下文泄漏。
				const container = document.getElementById('street-canvas')
				if (container && renderer.domElement && renderer.domElement.parentNode === container) {
					try { container.removeChild(renderer.domElement) } catch (e) {}
				}
			}
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
