<template>
	<transition name="app-modal">
		<div v-if="modalState.visible" class="app-modal" @keydown.esc.stop="cancel">
			<div class="app-modal__veil" @click="cancel"></div>
			<div class="app-modal__paper" role="dialog" aria-modal="true" :aria-label="modalState.title || '提示'">
				<span v-if="modalState.title" class="app-modal__title">{{ modalState.title }}</span>
				<span v-if="modalState.content" class="app-modal__content">{{ modalState.content }}</span>
				<textarea
					v-if="modalState.editable"
					ref="input"
					v-model="modalState.value"
					class="app-modal__input"
					:placeholder="modalState.placeholderText"
					:maxlength="modalState.maxLength"
					rows="3"
					@keydown.enter.exact.prevent="confirm"
				></textarea>
				<div class="app-modal__actions">
					<button v-if="modalState.showCancel" class="app-modal__button" @click="cancel">{{ modalState.cancelText }}</button>
					<button ref="confirmButton" class="app-modal__button app-modal__button--confirm" @click="confirm">{{ modalState.confirmText }}</button>
				</div>
			</div>
		</div>
	</transition>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { modalState, settleModal } from '@/platform/modal.js'

const input = ref(null)
const confirmButton = ref(null)

watch(() => modalState.visible, async (visible) => {
	if (!visible) return
	await nextTick()
	;(input.value || confirmButton.value)?.focus()
})

function confirm() {
	settleModal(true)
}

function cancel() {
	settleModal(false)
}
</script>

<style lang="scss" scoped>
.app-modal {
	position: fixed;
	inset: 0;
	z-index: 2500;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}

.app-modal__veil {
	position: absolute;
	inset: 0;
	background: rgba(13, 9, 7, 0.62);
	backdrop-filter: blur(4px);
}

.app-modal__paper {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: min(88vw, 400px);
	max-height: calc(100vh - 32px);
	max-height: calc(100dvh - 32px);
	overflow-y: auto;
	padding: 22px 22px 18px;
	background: linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(243, 233, 215, 0.97) 100%);
	border: 1px solid rgba(139, 69, 19, 0.35);
	border-radius: 6px;
	box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
	color: #2c1810;
	font-family: 'Noto Serif SC', 'STSong', 'Songti SC', 'KaiTi', serif;
}

.app-modal__title {
	font-size: 17px;
	font-weight: 700;
	letter-spacing: 2px;
	color: #6b3510;
	text-align: center;
}

.app-modal__content {
	font-size: 14px;
	line-height: 1.75;
	color: #4a2a18;
	text-align: center;
}

.app-modal__input {
	width: 100%;
	min-height: 84px;
	padding: 10px 12px;
	border: 1px solid rgba(139, 69, 19, 0.35);
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.72);
	color: #2c1810;
	font: inherit;
	font-size: 15px;
	line-height: 1.6;
	resize: none;
	-webkit-user-select: text;
	user-select: text;
}

.app-modal__actions {
	display: flex;
	gap: 10px;
	margin-top: 4px;
}

.app-modal__button {
	flex: 1;
	min-height: 40px;
	padding: 8px 12px;
	border: 1px solid rgba(139, 69, 19, 0.4);
	border-radius: 999px;
	background: rgba(255, 248, 239, 0.9);
	color: #6b3510;
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 2px;
}

.app-modal__button--confirm {
	border-color: rgba(196, 30, 58, 0.6);
	background: linear-gradient(135deg, #c41e3a 0%, #8b1a2e 100%);
	color: #fff8ef;
}

.app-modal-enter-active,
.app-modal-leave-active {
	transition: opacity 0.2s ease;
}

.app-modal-enter-from,
.app-modal-leave-to {
	opacity: 0;
}
</style>
