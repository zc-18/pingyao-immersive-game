<template>
	<div class="desktop-guide" aria-label="键鼠操作">
		<div class="desktop-guide__movement"><span class="desktop-guide__key">W A S D</span><span>漫步</span><span class="desktop-guide__key">Shift</span><span>快行</span><span class="desktop-guide__mouse">拖动环顾 · 滚轮远近</span></div>
		<div class="desktop-guide__actions">
			<button @click="$emit('action', 'interact')" :disabled="!nearby"><span class="desktop-guide__key">E</span> {{ nearby ? '查看身旁线索' : '靠近地标探索' }}</button>
			<button @click="$emit('action', 'portrait')"><span class="desktop-guide__key">C</span> {{ portrait ? '继续行走' : '观衣' }}</button>
			<button @click="$emit('action', 'reset')"><span class="desktop-guide__key">R</span> 镜头归位</button>
		</div>
	</div>
</template>

<script setup>
defineProps({ nearby: Boolean, portrait: Boolean })
defineEmits(['action'])
</script>

<style lang="scss" scoped>
.desktop-guide { display: none; }
@media (min-width: 1000px) and (min-height: 560px) and (pointer: fine) {
	.desktop-guide { display: flex; position: absolute; z-index: 15; bottom: 26px; left: 50%; transform: translateX(-50%); flex-direction: column; gap: 12px; color: #e9ddc8; font-size: 12px; white-space: nowrap; }
	.desktop-guide__movement { display: flex; align-items: center; justify-content: center; gap: 9px; text-shadow: 0 1px 3px #000; }
	.desktop-guide__key { padding: 3px 6px; border: 1px solid #d4a57460; border-radius: 3px; background: #1b211ee8; color: #f4e5c9; font: 11px Georgia, serif; letter-spacing: 1px; }
	.desktop-guide__mouse { margin-left: 10px; }
	.desktop-guide__actions { display: flex; gap: 8px; justify-content: center; }
	.desktop-guide button { display: flex; align-items: center; gap: 8px; min-height: 40px; margin: 0; padding: 6px 12px; color: #eee2ce; font-size: 12px; line-height: 1; border: 1px solid #d4a57450; border-radius: 4px; background: #1b211ee8; cursor: pointer; }
	.desktop-guide button::after { border: 0; }
	.desktop-guide button:disabled { opacity: .55; cursor: default; }
	.desktop-guide button:hover:not(:disabled), .desktop-guide button:focus-visible { background: #654728; outline: 1px solid #d4a574; }
}
</style>
