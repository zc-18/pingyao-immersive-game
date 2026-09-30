<template>
	<div class="dialog-stage" :class="'dialog-stage--' + activeDialogId">
		<!-- 街景虚化背景（保留 3D 街景的氛围） -->
		<div class="dialog-stage__bg-blur"></div>
		<div class="dialog-stage__bg-glow"></div>

		<!-- 飘动萤火 -->
		<FallingLeaves type="firefly" :density="14" />

		<!-- 左侧：晋小鸦立绘 -->
		<div class="dialog-stage__owl">
			<div class="dialog-stage__owl-glow"></div>
			<img class="dialog-stage__owl-img" src="/static/img/npc_owl_full.png" data-fit="contain"  alt="" draggable="false" />
			<div class="dialog-stage__owl-shadow"></div>
			<div class="dialog-stage__owl-card">
				<span class="dialog-stage__owl-name">晋 小 鸦</span>
				<span class="dialog-stage__owl-role">— 晋商向导 —</span>
				<span class="dialog-stage__owl-desc">{{ activeDialog.atmosphere }}</span>
			</div>
		</div>

		<!-- 右侧：折扇展开承载文字 -->
		<div class="dialog-stage__fan">
			<!-- 折扇骨 -->
			<div class="dialog-stage__fan-rib dialog-stage__fan-rib--1"></div>
			<div class="dialog-stage__fan-rib dialog-stage__fan-rib--2"></div>
			<div class="dialog-stage__fan-rib dialog-stage__fan-rib--3"></div>
			<div class="dialog-stage__fan-rib dialog-stage__fan-rib--4"></div>

			<!-- 折扇纸面 -->
			<div class="dialog-stage__fan-paper">
				<div class="dialog-stage__fan-fiber"></div>

				<div class="dialog-stage__fan-head">
					<div>
						<span class="dialog-stage__fan-eyebrow">— {{ activeDialog.sceneTag }} —</span>
						<span class="dialog-stage__fan-title">{{ activeDialog.sceneTitle }}</span>
					</div>
					<div class="dialog-stage__fan-stamp">
						<span>{{ activeDialog.badgeText }}</span>
					</div>
				</div>

				<span class="dialog-stage__fan-subtitle">{{ activeDialog.sceneSubtitle }}</span>

				<!-- 话题切换：横排铜钱 -->
				<div class="dialog-stage__topic-row">
					<div
						v-for="dialog in npcDialogs"
						:key="dialog.id"
						class="dialog-stage__topic-coin"
						role="button" tabindex="0" :aria-label="dialog.sceneTitle" :aria-pressed="dialog.id === activeDialogId"
						@keydown.enter.prevent="switchDialog(dialog.id)" @keydown.space.prevent="switchDialog(dialog.id)"
						:class="{ 'dialog-stage__topic-coin--active': dialog.id === activeDialogId }"
						@click="switchDialog(dialog.id)"
					>
						<div class="dialog-stage__topic-coin-rim"></div>
						<div class="dialog-stage__topic-coin-face">
							<span class="dialog-stage__topic-coin-text">{{ dialog.sceneTitle.charAt(0) }}</span>
						</div>
						<div class="dialog-stage__topic-coin-hole"></div>
					</div>
				</div>

				<!-- 消息（卷轴文）-->
				<div ref="messageScroll" class="dialog-stage__scroll" aria-live="polite">
					<div class="dialog-stage__msg-list">
						<div
							v-for="item in currentMessages"
							:key="item.id"
							class="dialog-stage__msg"
							:class="'dialog-stage__msg--' + item.role"
						>
							<div class="dialog-stage__msg-meta">
								<span v-if="item.role === 'npc'" class="dialog-stage__msg-meta-stamp">话</span>
								<span v-else class="dialog-stage__msg-meta-stamp dialog-stage__msg-meta-stamp--player">问</span>
								<span class="dialog-stage__msg-meta-text">{{ item.meta }}</span>
							</div>
							<div class="dialog-stage__msg-bubble">
								<span class="dialog-stage__msg-text">{{ item.text }}</span>
							</div>
						</div>
						<div :id="messageAnchorId" class="dialog-stage__msg-anchor"></div>
					</div>
				</div>

				<!-- 快捷话题 -->
				<div class="dialog-stage__quick">
					<span class="dialog-stage__quick-label">— 可 聊 话 题 —</span>
					<div class="dialog-stage__quick-list">
						<div
							v-for="topic in activeDialog.quickTopics"
							:key="topic.id"
							class="dialog-stage__quick-chip"
							role="button" tabindex="0" @keydown.enter.prevent="askTopic(topic)" @keydown.space.prevent="askTopic(topic)"
							@click="askTopic(topic)"
						>
							{{ topic.label }}
						</div>
					</div>
				</div>

				<!-- 快捷动作 -->
				<div class="dialog-stage__action-row">
					<div
						v-for="action in activeDialog.quickActions"
						:key="action.key"
						class="dialog-stage__action"
						role="button" tabindex="0" @keydown.enter.prevent="triggerAction(action)" @keydown.space.prevent="triggerAction(action)"
						:class="{
							'dialog-stage__action--primary': action.variant === 'primary',
							'dialog-stage__action--accent': action.variant === 'secondary'
						}"
						@click="triggerAction(action)"
					>
						{{ action.label }}
					</div>
				</div>

				<!-- 输入区（暂用占位）-->
				<div class="dialog-stage__input">
					<div class="dialog-stage__shortcut-list">
						<span
							v-for="shortcut in activeDialog.shortcutQuestions"
							:key="shortcut.id"
							class="dialog-stage__shortcut"
							role="button" tabindex="0" @keydown.enter.prevent="triggerShortcut(shortcut)" @keydown.space.prevent="triggerShortcut(shortcut)"
							@click="triggerShortcut(shortcut)"
						>
							{{ shortcut.label }}
						</span>
					</div>
					<p class="dialog-stage__input-row dialog-stage__input-placeholder">点选话题，听晋小鸦细说古城；点「带我去看看」便可前往街巷。</p>
				</div>
			</div>
		</div>

		<!-- 退出按钮（铜钱）-->
		<div class="dialog-stage__close" role="button" tabindex="0" aria-label="退出夜话" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack" @click="goBack">
			<div class="dialog-stage__close-rim"></div>
			<div class="dialog-stage__close-face">
				<span>退</span>
			</div>
			<div class="dialog-stage__close-hole"></div>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import FallingLeaves from '@/components/FallingLeaves.vue'
import npcDialogs from '@/common/data/npc-dialogs.js'
import { markPageVisit, getRuntimeState, markNpcTalk, setCurrentStreetScene } from '@/common/utils/game-state.js'
import { lockGameLandscape } from '@/common/utils/orientation.js'
import { onPageShow } from '@/platform/lifecycle.js'
import { navigateBack, redirectTo } from '@/platform/navigation.js'
import { showToast } from '@/platform/toast.js'
import { useRoute } from 'vue-router'

defineOptions({ name: 'DialogPage' })

const route = useRoute()
const activeDialogId = ref(resolveInitialDialogId())
const dialogMessageMap = ref(buildInitialMessages())
const messageScroll = ref(null)

const activeDialog = computed(() => npcDialogs.find((item) => item.id === activeDialogId.value) || npcDialogs[0])
const currentMessages = computed(() => dialogMessageMap.value[activeDialogId.value] || [])
const messageAnchorId = computed(() => `message-anchor-${activeDialogId.value}`)

watch(activeDialogId, (value) => {
	scrollToBottom()
}, { immediate: true })

watch(() => currentMessages.value.length, () => {
	scrollToBottom()
})

watch(() => route.query.topic, () => {
	activeDialogId.value = resolveInitialDialogId()
})

onPageShow(() => {
	lockGameLandscape()
	markPageVisit('dialog')
	activeDialogId.value = resolveInitialDialogId()
	scrollToBottom()
})

function resolveInitialDialogId() {
	const requestedId = typeof route.query.topic === 'string' ? route.query.topic : ''
	const savedId = getRuntimeState().lastNpcTopic.split(':')[0]
	return [requestedId, savedId].find((id) => npcDialogs.some((item) => item.id === id)) || npcDialogs[0].id
}

function buildInitialMessages() {
	return npcDialogs.reduce((result, dialog) => {
		result[dialog.id] = dialog.messages.map((item, index) => ({
			...item,
			meta: item.meta || (item.role === 'npc' ? `夜话第 ${index + 1} 段` : '旅人回应')
		}))
		return result
	}, {})
}

function switchDialog(id) {
	if (id !== activeDialogId.value) activeDialogId.value = id
	// 此处铜铃声 ding 留给后期接入
}

function askTopic(topic) {
	if (!recordReply(topic.id)) return
	appendMessage('player', topic.prompt || topic.label, topic.meta || '快捷提问')
	appendMessage('npc', topic.reply, topic.replyMeta || '晋小鸦答')
}

function recordReply(id) {
	if (!markNpcTalk(`${activeDialogId.value}:${id}`).ok) {
		showToast({ title: '讲解记录未能保存，请重试' })
		return false
	}
	return true
}

function triggerAction(action) {
	if (action.intent === 'route') {
		if (!setCurrentStreetScene(action.targetScene)) {
			showToast({ title: '目的地未能保存，请重试' })
			return
		}
		redirectTo('/street')
		return
	}
	if (!recordReply(action.key)) return
	appendMessage('player', action.playerText || action.label, action.meta || '快捷动作')
	appendMessage('npc', action.reply, action.replyMeta || '夜话引导')
}

function triggerShortcut(shortcut) {
	if (shortcut.intent === 'route') {
		triggerAction(shortcut)
		return
	}
	if (!recordReply(shortcut.id)) return
	appendMessage('player', shortcut.playerText || shortcut.label, shortcut.meta || '快捷问题')
	appendMessage('npc', shortcut.reply, shortcut.replyMeta || '夜话补充')
}

function appendMessage(role, text, meta) {
	const nextList = [...currentMessages.value, {
		id: `${activeDialogId.value}-${Date.now()}-${currentMessages.value.length}`,
		role, text, meta
	}]
	dialogMessageMap.value = { ...dialogMessageMap.value, [activeDialogId.value]: nextList }
}

function scrollToBottom() {
	nextTick(() => {
		const scroll = messageScroll.value
		if (scroll) scroll.scrollTop = scroll.scrollHeight
	})
}

function goBack() {
	navigateBack({ fallback: '/street' })
}
</script>

<style lang="scss" scoped>.dialog-stage {
	position: relative;
	width: 100vw;
	min-height: 100vh;
	overflow: hidden;
	background: #0d0907;
	padding: 32rpx 36rpx;
	box-sizing: border-box;
}

.dialog-stage__bg-blur {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(135deg, rgba(40, 26, 18, 0.92) 0%, rgba(13, 9, 7, 0.96) 100%),
		repeating-linear-gradient(45deg, rgba(212, 165, 116, 0.012) 0, rgba(212, 165, 116, 0.012) 2rpx, transparent 2rpx, transparent 24rpx);
	filter: blur(2rpx);
}

.dialog-stage__bg-glow {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse at 20% 30%, rgba(255, 200, 130, 0.16) 0%, transparent 35%),
		radial-gradient(ellipse at 70% 60%, rgba(196, 30, 58, 0.08) 0%, transparent 40%);
	pointer-events: none;
	transition: background 0.6s ease;
}

/* 场景调色：随话题切换氛围 */
.dialog-stage--county-office-history .dialog-stage__bg-glow {
	background:
		radial-gradient(ellipse at 22% 28%, rgba(255, 206, 128, 0.22) 0%, transparent 38%),
		radial-gradient(ellipse at 72% 62%, rgba(176, 123, 58, 0.12) 0%, transparent 42%);
}

.dialog-stage--baozheng-case .dialog-stage__bg-glow {
	background:
		radial-gradient(ellipse at 24% 26%, rgba(150, 180, 200, 0.14) 0%, transparent 38%),
		radial-gradient(ellipse at 70% 64%, rgba(196, 30, 58, 0.16) 0%, transparent 44%);
}

.dialog-stage--nearby-shops .dialog-stage__bg-glow {
	background:
		radial-gradient(ellipse at 18% 32%, rgba(255, 170, 92, 0.24) 0%, transparent 40%),
		radial-gradient(ellipse at 74% 58%, rgba(255, 120, 60, 0.12) 0%, transparent 42%);
}

/* ===== 左侧晋小鸦立绘 ===== */
.dialog-stage__owl {
	position: absolute;
	left: 24rpx;
	bottom: 0;
	z-index: 5;
	width: 36%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	pointer-events: none;
}

.dialog-stage__owl-glow {
	position: absolute;
	left: 50%;
	bottom: 70rpx;
	width: 320rpx;
	height: 90rpx;
	transform: translateX(-50%);
	background: radial-gradient(ellipse at 50% 50%, rgba(255, 210, 130, 0.4) 0%, transparent 68%);
	pointer-events: none;
	z-index: 0;
	animation: owlGlowBreath 3.6s ease-in-out infinite;
}

@keyframes owlGlowBreath {
	0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
	50%      { opacity: 1; transform: translateX(-50%) scale(1.16); }
}

.dialog-stage__owl-img {
	width: 100%;
	max-width: 380rpx;
	height: 460rpx;
	position: relative;
	z-index: 1;
	animation: owlBreathe 3.4s ease-in-out infinite;
	filter: drop-shadow(0 16rpx 36rpx rgba(0, 0, 0, 0.7));
}

@keyframes owlBreathe {
	0%, 100% { transform: scale(1) translateY(0); }
	50%      { transform: scale(1.03) translateY(-6rpx); }
}

.dialog-stage__owl-shadow {
	position: absolute;
	bottom: 80rpx;
	left: 50%;
	width: 240rpx;
	height: 30rpx;
	background: radial-gradient(ellipse at 50% 50%, rgba(255, 200, 130, 0.32) 0%, transparent 65%);
	transform: translateX(-50%);
	z-index: -1;
	animation: floatY 3.4s ease-in-out infinite;
}

.dialog-stage__owl-card {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	margin-bottom: 60rpx;
	padding: 16rpx 24rpx;
	background: rgba(255, 248, 239, 0.92);
	border: 2rpx solid rgba(196, 30, 58, 0.35);
	border-radius: 6rpx;
	box-shadow: 0 8rpx 22rpx rgba(0, 0, 0, 0.55);
	pointer-events: auto;
	max-width: 360rpx;
}

.dialog-stage__owl-name {
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.dialog-stage__owl-role {
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 6rpx;
}

.dialog-stage__owl-desc {
	position: relative;
	margin-top: 6rpx;
	padding: 0 18rpx;
	font-size: 20rpx;
	line-height: 1.7;
	color: $py-ink-soft;
	letter-spacing: 1rpx;
	text-align: center;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.dialog-stage__owl-desc::before,
.dialog-stage__owl-desc::after {
	position: absolute;
	top: -4rpx;
	font-size: 28rpx;
	line-height: 1;
	color: rgba(196, 30, 58, 0.55);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.dialog-stage__owl-desc::before { content: '“'; left: 0; }
.dialog-stage__owl-desc::after  { content: '”'; right: 0; top: auto; bottom: -4rpx; }

/* ===== 右侧折扇 ===== */
.dialog-stage__fan {
	position: relative;
	margin-left: 38%;
	max-width: calc(62% - 36rpx);
	min-height: calc(100vh - 64rpx);
	z-index: 4;
	animation: fanOpen 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both;
	transform-origin: bottom left;
}

@keyframes fanOpen {
	0%   { transform: scale(0.6) rotate(-30deg); opacity: 0; }
	100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* 折扇骨架 */
.dialog-stage__fan-rib {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 4rpx;
	background: linear-gradient(180deg, rgba(212, 165, 116, 0.45) 0%, #4a2a18 100%);
	transform-origin: bottom left;
	z-index: 1;
}

.dialog-stage__fan-rib--1 { height: 100%; transform: rotate(-12deg); left: 8%; }
.dialog-stage__fan-rib--2 { height: 100%; transform: rotate(-6deg); left: 28%; }
.dialog-stage__fan-rib--3 { height: 100%; transform: rotate(0deg);  left: 52%; }
.dialog-stage__fan-rib--4 { height: 100%; transform: rotate(8deg);  left: 78%; }

.dialog-stage__fan-paper {
	position: relative;
	z-index: 2;
	padding: 30rpx 36rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(243, 233, 215, 0.95) 100%);
	border-radius: 6rpx 6rpx 80rpx 6rpx / 6rpx 6rpx 30rpx 6rpx;
	box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.55);
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.dialog-stage__fan-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.025) 0, rgba(139, 69, 19, 0.025) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
	border-radius: 6rpx 6rpx 80rpx 6rpx / 6rpx 6rpx 30rpx 6rpx;
}

.dialog-stage__fan-paper > :not(.dialog-stage__fan-fiber) { position: relative; z-index: 1; }

.dialog-stage__fan-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.dialog-stage__fan-eyebrow {
	display: block;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.dialog-stage__fan-title {
	display: block;
	margin-top: 8rpx;
	font-size: 38rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 8rpx;
}

.dialog-stage__fan-stamp {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 100rpx;
	height: 56rpx;
	padding: 0 18rpx;
	color: $py-red;
	font-size: 20rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 4rpx solid $py-red;
	border-radius: 6rpx;
	transform: rotate(-4deg);
}

.dialog-stage__fan-subtitle {
	display: block;
	margin-top: 14rpx;
	padding-left: 16rpx;
	border-left: 4rpx solid rgba(196, 30, 58, 0.55);
	font-size: 22rpx;
	line-height: 1.85;
	color: rgba(110, 85, 65, 0.95);
	letter-spacing: 1rpx;
}

/* ===== 话题切换：横排铜钱 ===== */
.dialog-stage__topic-row {
	display: flex;
	flex-wrap: wrap;
	gap: 24rpx;
	margin-top: 22rpx;
}

.dialog-stage__topic-coin {
	position: relative;
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1);
}

.dialog-stage__topic-coin:active {
	transform: rotateY(180deg) scale(0.94);
}

.dialog-stage__topic-coin-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	box-shadow: inset 0 0 0 2rpx rgba(255, 235, 195, 0.3), 0 4rpx 8rpx rgba(0, 0, 0, 0.4);
}

.dialog-stage__topic-coin--active .dialog-stage__topic-coin-rim {
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 220, 220, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #6b1622 0%, #c41e3a 50%, #6b1622 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 220, 0.4),
		0 4rpx 8rpx rgba(0, 0, 0, 0.4),
		0 0 16rpx rgba(196, 30, 58, 0.45);
}

.dialog-stage__topic-coin-face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%),
		linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 50%, rgba(139, 69, 19, 0.9) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.dialog-stage__topic-coin--active .dialog-stage__topic-coin-face {
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 220, 220, 0.45) 0%, transparent 35%),
		linear-gradient(135deg, rgba(196, 30, 58, 0.85) 0%, rgba(232, 72, 96, 0.95) 50%, rgba(196, 30, 58, 0.85) 100%);
}

.dialog-stage__topic-coin-text {
	font-size: 24rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.dialog-stage__topic-coin-hole {
	position: absolute;
	left: 50%;
	top: 78%;
	width: 12rpx;
	height: 12rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
	z-index: 2;
}

/* ===== 消息列表 ===== */
.dialog-stage__scroll {
	flex: 1;
	overflow-y: auto;
	overscroll-behavior: contain;
	min-height: 200rpx;
	max-height: 540rpx;
	margin-top: 22rpx;
}

.dialog-stage__msg-list {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.dialog-stage__msg {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	animation: msgIn 0.4s cubic-bezier(0.2, 0.8, 0.4, 1) both;
}

@keyframes msgIn {
	0%   { opacity: 0; transform: translateY(12rpx); }
	100% { opacity: 1; transform: translateY(0); }
}

.dialog-stage__msg--player .dialog-stage__msg-meta {
	justify-content: flex-end;
}

.dialog-stage__msg--player .dialog-stage__msg-bubble {
	margin-left: auto;
	background: linear-gradient(135deg, #6b3510 0%, #8b4513 50%, #6b3510 100%);
	color: $py-paper-warm;
}

.dialog-stage__msg-meta {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.dialog-stage__msg-meta-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28rpx;
	height: 28rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 18rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.4);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.dialog-stage__msg-meta-stamp--player {
	background: $py-bronze;
}

.dialog-stage__msg-meta-text {
	font-size: 16rpx;
	letter-spacing: 4rpx;
	color: rgba(110, 85, 65, 0.7);
}

.dialog-stage__msg-bubble {
	position: relative;
	color: #4a2a18;
	max-width: 88%;
	padding: 14rpx 20rpx;
	border-radius: 6rpx;
	background: linear-gradient(180deg, rgba(255, 248, 239, 0.95) 0%, rgba(245, 240, 232, 0.92) 100%);
	border: 1rpx solid rgba(212, 165, 116, 0.35);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
}

/* NPC 气泡：左上尖角朝向晋小鸦 */
.dialog-stage__msg--npc .dialog-stage__msg-bubble::before {
	content: '';
	position: absolute;
	left: -10rpx;
	top: 18rpx;
	width: 0;
	height: 0;
	border-top: 8rpx solid transparent;
	border-bottom: 8rpx solid transparent;
	border-right: 12rpx solid rgba(255, 248, 239, 0.95);
	filter: drop-shadow(-1rpx 0 0 rgba(212, 165, 116, 0.35));
}

/* 旅人气泡：右上尖角 */
.dialog-stage__msg--player .dialog-stage__msg-bubble::after {
	content: '';
	position: absolute;
	right: -10rpx;
	top: 18rpx;
	width: 0;
	height: 0;
	border-top: 8rpx solid transparent;
	border-bottom: 8rpx solid transparent;
	border-left: 12rpx solid #6b3510;
}

.dialog-stage__msg-text {
	display: block;
	font-size: 22rpx;
	line-height: 1.85;
	color: inherit;
	letter-spacing: 1rpx;
}

.dialog-stage__msg-anchor {
	height: 2rpx;
}

/* ===== 快捷话题 ===== */
.dialog-stage__quick {
	margin-top: 22rpx;
	padding: 18rpx 22rpx;
	background: rgba(255, 248, 239, 0.55);
	border: 2rpx dashed rgba(196, 30, 58, 0.32);
	border-radius: 6rpx;
}

.dialog-stage__quick-label {
	display: block;
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.dialog-stage__quick-list {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 12rpx;
	justify-content: center;
}

.dialog-stage__quick-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 56rpx;
	padding: 0 22rpx;
	border-radius: 999rpx;
	background: rgba(212, 165, 116, 0.18);
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	color: #6b3510;
	font-size: 22rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	transition: transform 0.16s ease, background 0.16s ease;
}

.dialog-stage__quick-chip:active {
	transform: scale(0.94);
	background: rgba(196, 30, 58, 0.16);
}

/* ===== 快捷动作 ===== */
.dialog-stage__action-row {
	display: flex;
	gap: 14rpx;
	margin-top: 18rpx;
}

.dialog-stage__action {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	border-radius: 6rpx;
	background: rgba(212, 165, 116, 0.18);
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	color: #6b3510;
	font-size: 24rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transition: transform 0.18s ease;
}

.dialog-stage__action:active { transform: scale(0.96); }

.dialog-stage__action--primary {
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 50%, #4a2a18 100%);
	color: $py-paper-warm;
	border-color: rgba(255, 220, 170, 0.45);
	box-shadow: inset 0 1rpx 0 rgba(255, 235, 200, 0.45), 0 4rpx 12rpx rgba(0, 0, 0, 0.45);
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.5);
}

.dialog-stage__action--accent {
	background: linear-gradient(135deg, rgba(196, 30, 58, 0.85) 0%, rgba(139, 26, 46, 0.92) 100%);
	color: $py-paper-warm;
	border-color: rgba(255, 220, 220, 0.4);
}

/* ===== 输入区 ===== */
.dialog-stage__input {
	margin-top: 18rpx;
	padding: 18rpx 22rpx;
	background: rgba(255, 248, 239, 0.55);
	border: 2rpx solid rgba(212, 165, 116, 0.4);
	border-radius: 6rpx;
}

.dialog-stage__shortcut-list {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.dialog-stage__shortcut {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 50rpx;
	padding: 0 18rpx;
	border-radius: 999rpx;
	background: rgba(245, 240, 232, 0.85);
	color: #6b3510;
	font-size: 20rpx;
	border: 1rpx solid rgba(201, 174, 138, 0.5);
	transition: transform 0.16s ease, background 0.16s ease;
}

.dialog-stage__shortcut:active {
	transform: scale(0.94);
	background: rgba(212, 165, 116, 0.28);
}

.dialog-stage__input-row {
	display: flex;
	gap: 12rpx;
	margin-top: 12rpx;
}

.dialog-stage__input-frame {
	flex: 1;
	display: flex;
	align-items: center;
	min-height: 80rpx;
	padding: 0 24rpx;
	background: $py-paper-warm;
	border: 2rpx solid rgba(212, 165, 116, 0.45);
	border-radius: 6rpx;
}

.dialog-stage__input-placeholder {
	font-size: 20rpx;
	line-height: 1.5;
	color: rgba(44, 24, 16, 0.5);
}

.dialog-stage__send {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80rpx;
	height: 80rpx;
	background: linear-gradient(135deg, $py-red 0%, #8b1a2e 100%);
	color: $py-paper-warm;
	font-size: 28rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 6rpx;
	box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.35);
}

/* ===== 退出铜钱 ===== */
.dialog-stage__close {
	position: fixed;
	top: 28rpx;
	right: 28rpx;
	z-index: 20;
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	transition: transform 0.18s ease;
}

.dialog-stage__close:active {
	transform: rotateY(180deg) scale(0.92);
}

.dialog-stage__close-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow: inset 0 0 0 2rpx rgba(255, 235, 195, 0.3), 0 6rpx 12rpx rgba(0, 0, 0, 0.55);
}

.dialog-stage__close-face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%),
		linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 50%, rgba(139, 69, 19, 0.9) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	color: $py-paper-warm;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.dialog-stage__close-hole {
	position: absolute;
	left: 50%;
	top: 78%;
	width: 12rpx;
	height: 12rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
	z-index: 2;
}

@media screen and (max-width: 720px) {
	.dialog-stage { padding: 24rpx; }

	.dialog-stage__owl { display: none; }

	.dialog-stage__fan {
		margin-left: 0;
		max-width: 100%;
	}
}
@media (min-width: 1000px) and (min-height: 560px) {
	.dialog-stage { min-height: 100vh; box-sizing: border-box; padding: 6vh 7vw; }
	.dialog-stage__owl { width: 25%; }
	.dialog-stage__owl-img { width: 220px; height: 280px; }
	.dialog-stage__owl-desc { font-size: 14px; line-height: 1.9; }
	.dialog-stage__fan { width: 64%; max-width: 900px; margin-left: 30%; }
	.dialog-stage__fan-paper { padding: 36px; }
	.dialog-stage__fan-title { font-size: 28px; }
	.dialog-stage__fan-subtitle { font-size: 15px; }
}

/* 扇面固定在可用视口内，只有对话记录滚动。 */
.dialog-stage { height: 100dvh; min-height: 0; }
.dialog-stage [role='button'] { cursor: pointer; }
.dialog-stage [role='button']:focus-visible { outline: 2px solid #8b4513; outline-offset: 3px; }
.dialog-stage__fan { height: 100%; min-height: 0; }
.dialog-stage__fan-paper { height: 100%; min-height: 0; box-sizing: border-box; }
.dialog-stage__scroll { min-height: 70px; max-height: none; }
@media (orientation: landscape) and (max-height: 559px) {
	.dialog-stage { padding: 12px 46px 12px 12px; }
	.dialog-stage__owl { display: none; }
	.dialog-stage__fan { width: 100%; max-width: none; margin: 0; }
	.dialog-stage__fan-paper { padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) 230px; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: 8px 18px; }
	.dialog-stage__fan-head { grid-column: 1; grid-row: 1; }
	.dialog-stage__fan-eyebrow { font-size: 10px; letter-spacing: 3px; }
	.dialog-stage__fan-title { font-size: 21px; margin-top: 3px; letter-spacing: 4px; }
	.dialog-stage__fan-stamp, .dialog-stage__fan-subtitle, .dialog-stage__input-row { display: none; }
	.dialog-stage__topic-row { grid-column: 1; grid-row: 2; margin: 0; gap: 12px; }
	.dialog-stage__topic-coin { width: 34px; height: 34px; }
	.dialog-stage__topic-coin-text { font-size: 12px; }
	.dialog-stage__topic-coin-face { inset: 3px; }
	.dialog-stage__topic-coin-hole { width: 4px; height: 4px; }
	.dialog-stage__scroll { grid-column: 1; grid-row: 3 / 5; margin: 0; min-height: 0; }
	.dialog-stage__msg-list { gap: 10px; }
	.dialog-stage__msg-meta-text { font-size: 9px; letter-spacing: 1px; }
	.dialog-stage__msg-meta-stamp { width: 16px; height: 16px; font-size: 10px; }
	.dialog-stage__msg-bubble { padding: 7px 10px; }
	.dialog-stage__msg-text { font-size: 12px; line-height: 1.65; }
	.dialog-stage__quick { grid-column: 2; grid-row: 1 / 3; margin: 0; padding: 9px; }
	.dialog-stage__quick-label { font-size: 10px; letter-spacing: 3px; }
	.dialog-stage__quick-list { gap: 6px; margin-top: 7px; }
	.dialog-stage__quick-chip { font-size: 12px; min-height: 27px; padding: 0 10px; letter-spacing: 0; }
	.dialog-stage__input { grid-column: 2; grid-row: 3; margin: 0; padding: 8px; align-self: start; }
	.dialog-stage__shortcut-list { gap: 6px; }
	.dialog-stage__shortcut { font-size: 11px; min-height: 26px; padding: 0 9px; }
	.dialog-stage__action-row { grid-column: 2; grid-row: 4; gap: 6px; margin: 0; }
	.dialog-stage__action { font-size: 11px; letter-spacing: 0; height: 38px; padding: 0 5px; text-align: center; }
	.dialog-stage__close { top: 12px; right: 8px; width: 32px; height: 32px; }
	.dialog-stage__close-face { inset: 3px; font-size: 12px; }
	.dialog-stage__close-hole { width: 4px; height: 4px; }
}
@media (orientation: portrait) and (max-width: 999px) {
	.dialog-stage { padding: 16px 12px; }
	.dialog-stage__fan { width: 100%; margin: 0; max-width: none; }
	.dialog-stage__fan-paper { padding: 20px 16px; }
	.dialog-stage__fan-head { padding-right: 35px; }
	.dialog-stage__fan-stamp { display: none; }
	.dialog-stage__fan-title { font-size: 25px; }
	.dialog-stage__fan-subtitle { font-size: 12px; line-height: 1.6; }
	.dialog-stage__topic-row { margin-top: 12px; gap: 16px; }
	.dialog-stage__topic-coin { width: 40px; height: 40px; }
	.dialog-stage__scroll { margin-top: 12px; }
	.dialog-stage__msg-text { font-size: 13px; line-height: 1.75; }
	.dialog-stage__quick { margin-top: 12px; padding: 10px; }
	.dialog-stage__quick-chip { font-size: 12px; min-height: 30px; padding: 0 11px; }
	.dialog-stage__action { font-size: 12px; letter-spacing: 1px; height: 40px; }
	.dialog-stage__input { margin-top: 10px; padding: 9px; }
	.dialog-stage__input-row { display: none; }
	.dialog-stage__shortcut { min-height: 27px; font-size: 11px; padding: 0 9px; }
	.dialog-stage__close { top: 24px; right: 22px; width: 36px; height: 36px; }
}
</style>
