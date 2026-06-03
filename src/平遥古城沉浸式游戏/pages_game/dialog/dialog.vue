<template>
	<view class="dialog-stage">
		<!-- 街景虚化背景（保留 3D 街景的氛围） -->
		<view class="dialog-stage__bg-blur"></view>
		<view class="dialog-stage__bg-glow"></view>

		<!-- 飘动萤火 -->
		<FallingLeaves type="firefly" :density="14" />

		<!-- 左侧：晋小鸦立绘 -->
		<view class="dialog-stage__owl">
			<image class="dialog-stage__owl-img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
			<view class="dialog-stage__owl-shadow"></view>
			<view class="dialog-stage__owl-card">
				<text class="dialog-stage__owl-name">晋 小 鸦</text>
				<text class="dialog-stage__owl-role">— 晋商向导 —</text>
				<text class="dialog-stage__owl-desc">{{ activeDialog.atmosphere }}</text>
			</view>
		</view>

		<!-- 右侧：折扇展开承载文字 -->
		<view class="dialog-stage__fan">
			<!-- 折扇骨 -->
			<view class="dialog-stage__fan-rib dialog-stage__fan-rib--1"></view>
			<view class="dialog-stage__fan-rib dialog-stage__fan-rib--2"></view>
			<view class="dialog-stage__fan-rib dialog-stage__fan-rib--3"></view>
			<view class="dialog-stage__fan-rib dialog-stage__fan-rib--4"></view>

			<!-- 折扇纸面 -->
			<view class="dialog-stage__fan-paper">
				<view class="dialog-stage__fan-fiber"></view>

				<view class="dialog-stage__fan-head">
					<view>
						<text class="dialog-stage__fan-eyebrow">— {{ activeDialog.sceneTag }} —</text>
						<text class="dialog-stage__fan-title">{{ activeDialog.sceneTitle }}</text>
					</view>
					<view class="dialog-stage__fan-stamp">
						<text>{{ activeDialog.badgeText }}</text>
					</view>
				</view>

				<text class="dialog-stage__fan-subtitle">{{ activeDialog.sceneSubtitle }}</text>

				<!-- 话题切换：横排铜钱 -->
				<view class="dialog-stage__topic-row">
					<view
						v-for="dialog in npcDialogs"
						:key="dialog.id"
						class="dialog-stage__topic-coin"
						:class="{ 'dialog-stage__topic-coin--active': dialog.id === activeDialogId }"
						@tap="switchDialog(dialog.id)"
					>
						<view class="dialog-stage__topic-coin-rim"></view>
						<view class="dialog-stage__topic-coin-face">
							<text class="dialog-stage__topic-coin-text">{{ dialog.sceneTitle.charAt(0) }}</text>
						</view>
						<view class="dialog-stage__topic-coin-hole"></view>
					</view>
				</view>

				<!-- 消息（卷轴文）-->
				<scroll-view scroll-y class="dialog-stage__scroll" :scroll-into-view="scrollIntoView">
					<view class="dialog-stage__msg-list">
						<view
							v-for="item in currentMessages"
							:key="item.id"
							class="dialog-stage__msg"
							:class="'dialog-stage__msg--' + item.role"
						>
							<view class="dialog-stage__msg-meta">
								<text v-if="item.role === 'npc'" class="dialog-stage__msg-meta-stamp">话</text>
								<text v-else class="dialog-stage__msg-meta-stamp dialog-stage__msg-meta-stamp--player">问</text>
								<text class="dialog-stage__msg-meta-text">{{ item.meta }}</text>
							</view>
							<view class="dialog-stage__msg-bubble">
								<text class="dialog-stage__msg-text">{{ item.text }}</text>
							</view>
						</view>
						<view :id="messageAnchorId" class="dialog-stage__msg-anchor"></view>
					</view>
				</scroll-view>

				<!-- 快捷话题 -->
				<view class="dialog-stage__quick">
					<text class="dialog-stage__quick-label">— 可 聊 话 题 —</text>
					<view class="dialog-stage__quick-list">
						<view
							v-for="topic in activeDialog.quickTopics"
							:key="topic.id"
							class="dialog-stage__quick-chip"
							@tap="askTopic(topic)"
						>
							{{ topic.label }}
						</view>
					</view>
				</view>

				<!-- 快捷动作 -->
				<view class="dialog-stage__action-row">
					<view
						v-for="action in activeDialog.quickActions"
						:key="action.key"
						class="dialog-stage__action"
						:class="{
							'dialog-stage__action--primary': action.variant === 'primary',
							'dialog-stage__action--accent': action.variant === 'secondary'
						}"
						@tap="triggerAction(action)"
					>
						{{ action.label }}
					</view>
				</view>

				<!-- 输入区（暂用占位）-->
				<view class="dialog-stage__input">
					<view class="dialog-stage__shortcut-list">
						<text
							v-for="shortcut in activeDialog.shortcutQuestions"
							:key="shortcut.id"
							class="dialog-stage__shortcut"
							@tap="triggerShortcut(shortcut)"
						>
							{{ shortcut.label }}
						</text>
					</view>
					<view class="dialog-stage__input-row">
						<view class="dialog-stage__input-frame" @tap="mockSend">
							<text class="dialog-stage__input-placeholder">{{ activeDialog.inputPlaceholder }}</text>
						</view>
						<view class="dialog-stage__send" @tap="mockSend">
							<text>发</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 退出按钮（铜钱）-->
		<view class="dialog-stage__close" @tap="goBack">
			<view class="dialog-stage__close-rim"></view>
			<view class="dialog-stage__close-face">
				<text>退</text>
			</view>
			<view class="dialog-stage__close-hole"></view>
		</view>
	</view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FallingLeaves from '@/components/FallingLeaves.vue'
import npcDialogs from '@/common/data/npc-dialogs.js'
import { markPageVisit } from '@/common/utils/game-state.js'

const STORAGE_KEY = 'pingyao.dialog.active'
const activeDialogId = ref(resolveInitialDialogId())
const dialogMessageMap = ref(buildInitialMessages())
const scrollIntoView = ref('')

const activeDialog = computed(() => npcDialogs.find((item) => item.id === activeDialogId.value) || npcDialogs[0])
const currentMessages = computed(() => dialogMessageMap.value[activeDialogId.value] || [])
const messageAnchorId = computed(() => `message-anchor-${activeDialogId.value}`)

watch(activeDialogId, (value) => {
	uni.setStorageSync(STORAGE_KEY, value)
	scrollToBottom()
}, { immediate: true })

watch(() => currentMessages.value.length, () => {
	scrollToBottom()
})

onShow(() => {
	markPageVisit('dialog')
})

function resolveInitialDialogId() {
	const savedId = uni.getStorageSync(STORAGE_KEY)
	return npcDialogs.some((item) => item.id === savedId) ? savedId : npcDialogs[0].id
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
	appendMessage('player', topic.prompt || topic.label, topic.meta || '快捷提问')
	appendMessage('npc', topic.reply, topic.replyMeta || '晋小鸦答')
}

function triggerAction(action) {
	appendMessage('player', action.playerText || action.label, action.meta || '快捷动作')
	appendMessage('npc', action.reply, action.replyMeta || '夜话引导')
}

function triggerShortcut(shortcut) {
	appendMessage('player', shortcut.playerText || shortcut.label, shortcut.meta || '快捷问题')
	appendMessage('npc', shortcut.reply, shortcut.replyMeta || '夜话补充')
}

function mockSend() {
	appendMessage('player', '我想自己问一句，把这条先记进夜话册里。', '夜话记录')
	appendMessage('npc', activeDialog.value.systemHint, '晋小鸦提醒')
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
		scrollIntoView.value = ''
		nextTick(() => {
			scrollIntoView.value = messageAnchorId.value
		})
	})
}

function goBack() {
	uni.navigateBack()
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.dialog-stage {
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

.dialog-stage__owl-img {
	width: 100%;
	max-width: 380rpx;
	height: 460rpx;
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
	margin-top: 6rpx;
	font-size: 20rpx;
	line-height: 1.7;
	color: $py-ink-soft;
	letter-spacing: 1rpx;
	text-align: center;
}

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

.dialog-stage__fan-paper > * { position: relative; z-index: 1; }

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
	top: 50%;
	width: 12rpx;
	height: 12rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
	z-index: 2;
}

/* ===== 消息列表 ===== */
.dialog-stage__scroll {
	flex: 1;
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
	max-width: 88%;
	padding: 14rpx 20rpx;
	border-radius: 6rpx;
	background: linear-gradient(180deg, rgba(255, 248, 239, 0.95) 0%, rgba(245, 240, 232, 0.92) 100%);
	border: 1rpx solid rgba(212, 165, 116, 0.35);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
}

.dialog-stage__msg-text {
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
	top: 50%;
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
</style>
