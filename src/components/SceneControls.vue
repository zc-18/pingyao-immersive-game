<template>
	<div class="scene-controls">
		<button class="scene-controls__trigger" aria-label="场景设置" title="场景设置" :aria-expanded="open" @click="$emit('toggle')"><PyIcon :name="open ? 'close' : 'compass'" size="23px" variant="plain" /></button>
		<div v-if="open" class="scene-controls__panel">
			<div class="scene-controls__heading"><span>古城时光</span><button class="scene-controls__auto" :class="{ selected: phaseMode === 'auto' }" @click="$emit('phase', 'auto')">随时辰</button></div>
			<div class="scene-controls__phases" role="group" aria-label="时辰">
				<button v-for="phase in phases" :key="phase.key" :class="{ selected: phaseMode === phase.key }" :aria-pressed="phaseMode === phase.key" @click="$emit('phase', phase.key)">{{ phase.label }}</button>
			</div>
			<div class="scene-controls__modes">
				<button :class="{ selected: running }" :aria-pressed="running" @click="$emit('action', 'run')"><PyIcon name="step" size="20px" variant="plain" /><span>{{ running ? '快行' : '漫步' }}</span></button>
				<button :class="{ selected: portrait }" :aria-pressed="portrait" @click="$emit('action', 'portrait')"><PyIcon name="role" size="20px" variant="plain" /><span>观衣</span></button>
			</div>
			<div class="scene-controls__tools">
				<button aria-label="拉近镜头" title="拉近镜头" @click="$emit('action', 'zoom-in')">+</button>
				<button aria-label="拉远镜头" title="拉远镜头" @click="$emit('action', 'zoom-out')">−</button>
				<button aria-label="镜头归位" title="镜头归位" @click="$emit('action', 'reset')"><PyIcon name="compass" size="20px" variant="plain" /></button>
				<button aria-label="拱手致意" title="拱手致意" @click="$emit('action', 'greet')"><PyIcon name="chat" size="20px" variant="plain" /></button>
			</div>
		</div>
	</div>
</template>

<script setup>
import PyIcon from '@/components/PyIcon.vue'
defineProps({ open: Boolean, phases: Array, phaseMode: String, running: Boolean, portrait: Boolean })
defineEmits(['toggle', 'phase', 'action'])
</script>

<style lang="scss" scoped>.scene-controls { position: absolute; z-index: 19; right: max(18px, env(safe-area-inset-right)); bottom: max(22px, env(safe-area-inset-bottom)); }
.scene-controls button { display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; min-height: 44px; line-height: 1; border: 0; border-radius: 4px; font-size: 14px; letter-spacing: 0; color: #eee5d6; background: transparent; }
.scene-controls button::after { border: 0; }
.scene-controls button:hover, .scene-controls button:focus-visible { background: #51483c; outline: 1px solid #d4a574; }
.scene-controls__trigger { width: 46px; height: 46px; border: 1px solid #9b8060 !important; background: #2c302bec !important; }
.scene-controls__panel { position: absolute; width: 224px; padding: 14px; right: 0; bottom: 58px; box-sizing: border-box; background: #262d29f5; border: 1px solid #957a59; border-radius: 6px; box-shadow: 0 10px 30px #0004; }
.scene-controls__heading { display: flex; justify-content: space-between; align-items: center; font-size: 15px; color: #eee5d6; }
.scene-controls__auto { padding: 0 8px !important; font-size: 12px !important; }
.scene-controls__phases, .scene-controls__tools { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 10px; }
.scene-controls__phases { background: #141c18; padding: 3px; }
.scene-controls__modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; border-bottom: 1px solid #ffffff20; padding-bottom: 10px; }
.scene-controls__modes button { gap: 8px; }
.scene-controls button.selected { background: #7d302d; color: #fff5de; }
.scene-controls__tools button { font-size: 24px; background: #ffffff09; }
@media (orientation: portrait) { .scene-controls { bottom: max(184px, calc(env(safe-area-inset-bottom) + 164px)); right: 12px; } }
@media (max-height: 440px) and (orientation: landscape) { .scene-controls { bottom: 12px; right: max(12px, env(safe-area-inset-right)); } .scene-controls__panel { right: 58px; bottom: 0; } }
</style>
