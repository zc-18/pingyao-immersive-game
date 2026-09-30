<template>
	<transition name="app-toast">
		<div v-if="toastState.visible" :key="toastState.id" class="app-toast" role="status" aria-live="polite">
			<span v-if="toastState.icon === 'success'" class="app-toast__icon">✓</span>
			<span v-else-if="toastState.icon === 'error' || toastState.icon === 'fail'" class="app-toast__icon">✕</span>
			<span class="app-toast__text">{{ toastState.title }}</span>
		</div>
	</transition>
</template>

<script setup>
import { toastState } from '@/platform/toast.js'
</script>

<style lang="scss" scoped>
.app-toast {
	position: fixed;
	left: 50%;
	top: 50%;
	z-index: 3000;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	max-width: min(82vw, 420px);
	padding: 12px 20px;
	transform: translate(-50%, -50%);
	background: rgba(26, 20, 17, 0.9);
	border: 1px solid rgba(212, 165, 116, 0.45);
	border-radius: 8px;
	box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
	color: #fff8ef;
	font-family: 'Noto Serif SC', 'STSong', 'Songti SC', 'KaiTi', serif;
	font-size: 14px;
	line-height: 1.6;
	letter-spacing: 1px;
	text-align: center;
	pointer-events: none;
}

.app-toast__icon {
	font-size: 22px;
	line-height: 1;
	color: #d4a574;
}

.app-toast-enter-active,
.app-toast-leave-active {
	transition: opacity 0.22s ease, transform 0.22s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
	opacity: 0;
	transform: translate(-50%, calc(-50% + 8px));
}
</style>
