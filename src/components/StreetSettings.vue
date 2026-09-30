<template>
	<div v-if="visible" ref="root" class="street-settings">
		<div class="street-settings__backdrop" @click="$emit('close')"></div>
		<div class="street-settings__paper" role="dialog" aria-modal="true" aria-label="行旅设置" @click.stop @touchmove.stop="$event.stopPropagation && $event.stopPropagation()">
			<div class="street-settings__header">
				<div><span class="street-settings__eyebrow">平 遥 · 行 旅</span><span class="street-settings__title">行旅设置</span></div>
				<button class="street-settings__close" role="button" tabindex="0" aria-label="关闭设置" @click="$emit('close')">×</button>
			</div>
			<span class="street-settings__intro">停步片刻，调好声音与灯光，再看古城。</span>
			<div class="street-settings__rows">
				<button v-for="item in options" :key="item.key" class="street-settings__option" role="switch" tabindex="0" :aria-label="item.label" :aria-checked="settings[item.key]" @click="$emit('setting', { key: item.key, enabled: !settings[item.key] })">
					<div class="street-settings__copy"><span class="street-settings__label">{{ item.label }}</span><span class="street-settings__hint">{{ item.hint }}</span></div>
					<div class="street-settings__status" :class="{ 'street-settings__status--on': settings[item.key] }"><span>{{ settings[item.key] ? '开' : '关' }}</span><div></div></div>
				</button>
			</div>
			<div class="street-settings__links">
				<button role="button" tabindex="0" @click="$emit('guide')">问问向导 <span>›</span></button>
				<button role="button" tabindex="0" @click="$emit('home')">返回古城 <span>›</span></button>
			</div>
			<button class="street-settings__continue" role="button" tabindex="0" @click="$emit('close')">继续游历</button>
		</div>
	</div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({ visible: Boolean, settings: { type: Object, required: true } })
const emit = defineEmits(['close', 'setting', 'guide', 'home'])
const root = ref(null)
let previousFocus = null
let keyboardRoot = null
function detachKeyboard() {
	keyboardRoot?.removeEventListener('keydown', handleKeydown)
	keyboardRoot = null
}
const buttons = () => {
	const element = root.value?.$el || root.value
	return [...(element?.querySelectorAll?.('button:not([disabled]), uni-button:not([disabled])') || [])]
		.filter(control => control.getClientRects().length > 0)
}
watch(() => props.visible, async (visible) => {
	// 打开设置后将浏览器键盘焦点移到面板。
	if (typeof document === 'undefined') return
	if (visible) {
		previousFocus = document.activeElement
		await nextTick()
		if (props.visible) {
			detachKeyboard()
			keyboardRoot = root.value?.$el || root.value
			keyboardRoot?.addEventListener('keydown', handleKeydown)
			buttons()[0]?.focus()
		}
	} else {
		detachKeyboard()
		if (previousFocus?.isConnected) previousFocus.focus()
	}
})
onBeforeUnmount(detachKeyboard)
function handleKeydown(event) {
	const active = typeof document !== 'undefined' ? document.activeElement : null
	if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close') }
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		if (!event.repeat) active?.closest?.('button, uni-button')?.click()
	}
	if (event.key !== 'Tab') return
	const controls = buttons()
	if (!controls.length) return
	event.preventDefault()
	const current = controls.indexOf(active)
	controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus()
}
const options = [
	{ key: 'enableMusic', label: '游戏声音', hint: '古城音乐与互动提示音' },
	{ key: 'enableEffect', label: '灯光特效', hint: '灯笼柔光；关闭可减轻画面负担' }
]
</script>

<style lang="scss" scoped>.street-settings { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center; padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); box-sizing: border-box; }
.street-settings__backdrop { position: absolute; inset: 0; background: #140e09ad; }
.street-settings__paper { position: relative; width: 380px; max-width: 100%; max-height: 100%; overflow-y: auto; box-sizing: border-box; padding: 20px 24px; border: 1px solid #bc9367; border-radius: 10px; background: repeating-linear-gradient(90deg, #8b451305 0, #8b451305 1px, transparent 1px, transparent 7px), #f5f0e8; box-shadow: 0 18px 60px #0007, inset 0 0 0 5px #b58a5420; color: #4e3421; }
.street-settings button { margin: 0; padding: 0; min-height: 44px; background: none; border: 0; border-radius: 4px; font-size: 14px; line-height: 1.4; color: inherit; cursor: pointer; }
.street-settings button::after { border: 0; }
.street-settings button:focus-visible { outline: 2px solid #8b4513; outline-offset: 2px; }
.street-settings button:active { filter: brightness(.92); }
.street-settings__header { display: flex; align-items: center; justify-content: space-between; }
.street-settings__eyebrow { display: block; color: #947456; font-size: 10px; letter-spacing: 2px; }
.street-settings__title { display: block; margin-top: 5px; font-family: 'KaiTi', 'STKaiti', serif; font-size: 26px; font-weight: 700; letter-spacing: 3px; }
.street-settings .street-settings__close { width: 44px; height: 44px; flex-shrink: 0; color: #805635; font-size: 28px; }
.street-settings__intro { display: block; margin: 12px 0 14px; font-size: 12px; line-height: 1.6; color: #806a54; }
.street-settings__rows { border-top: 1px solid #ac825338; border-bottom: 1px solid #ac825338; }
.street-settings .street-settings__option { width: 100%; min-height: 68px; display: flex; align-items: center; justify-content: space-between; text-align: left; gap: 12px; }
.street-settings__option + .street-settings__option { border-top: 1px solid #ac825320; }
.street-settings__copy { display: flex; flex-direction: column; gap: 4px; }
.street-settings__label { font-size: 15px; font-weight: 700; }
.street-settings__hint { font-size: 11px; color: #806a54; }
.street-settings__status { display: flex; align-items: center; gap: 7px; flex-shrink: 0; font-size: 12px; color: #897966; }
.street-settings__status > div { position: relative; width: 34px; height: 20px; border-radius: 20px; background: #b6ad9e; }
.street-settings__status > div::after { content: ''; position: absolute; width: 14px; height: 14px; top: 3px; left: 3px; border-radius: 50%; background: #fff8ea; transition: transform .18s; }
.street-settings__status--on { color: #913b31; }
.street-settings__status--on > div { background: #9d3d32; }
.street-settings__status--on > div::after { transform: translateX(14px); }
.street-settings__links { display: flex; gap: 14px; margin: 10px 0; }
.street-settings__links button { display: flex; align-items: center; justify-content: space-between; flex: 1; padding: 0 9px; font-size: 13px; }
.street-settings__links span { color: #a57c4e; font-size: 21px; }
.street-settings .street-settings__continue { width: 100%; background: #813128; color: #fff2dc; letter-spacing: 3px; box-shadow: inset 0 0 0 1px #c09a5c; }
@media (max-height: 440px) and (orientation: landscape) { .street-settings__paper { width: 480px; padding: 14px 22px; } .street-settings__title { font-size: 22px; } .street-settings__intro { margin: 5px 0 8px; } .street-settings .street-settings__option { min-height: 57px; } .street-settings__links { margin: 5px 0; } }
</style>
