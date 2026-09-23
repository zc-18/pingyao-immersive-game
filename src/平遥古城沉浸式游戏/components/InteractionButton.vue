<template>
	<view class="interact-stage">
		<button ref="token" class="interact-stage__token" role="button" tabindex="0" :aria-label="label" @tap="$emit('action')">
			<view class="interact-stage__seal" aria-hidden="true">览</view>
			<view class="interact-stage__copy"><text class="interact-stage__hint">古城点位</text><text class="interact-stage__label">{{ label }}</text></view>
			<text class="interact-stage__arrow" aria-hidden="true">›</text>
		</button>
	</view>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
defineProps({ label: { type: String, default: '走近看看' } })
const emit = defineEmits(['action'])
const token = ref(null)
let keyboardElement = null
function activateWithKeyboard(event) {
	if (event.key !== 'Enter' && event.key !== ' ') return
	event.preventDefault()
	if (!event.repeat) emit('action')
}
onMounted(() => {
	if (typeof document === 'undefined') return
	keyboardElement = token.value?.$el || token.value
	keyboardElement?.addEventListener('keydown', activateWithKeyboard)
})
onBeforeUnmount(() => keyboardElement?.removeEventListener('keydown', activateWithKeyboard))
</script>

<style lang="scss" scoped>
@import '@/uni.scss';
.interact-stage { position: fixed; left: 50%; bottom: max(68px, calc(env(safe-area-inset-bottom) + 60px)); transform: translateX(-50%); z-index: 25; width: 232px; max-width: calc(100vw - 32px); }
.interact-stage__token { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 54px; margin: 0; padding: 7px 12px 7px 8px; box-sizing: border-box; border: 1px solid #d4a574; border-radius: 7px; background: linear-gradient(135deg, #553721f5, #2c2119f5); color: $py-paper-warm; box-shadow: 0 5px 18px #0005, inset 0 0 0 3px #d4a57418; text-align: left; cursor: pointer; transition: transform .15s; }
.interact-stage__token::after { border: 0; }
.interact-stage__token:active { transform: scale(.97); }
.interact-stage__token:focus-visible { outline: 2px solid #f6d695; outline-offset: 3px; }
.interact-stage__seal { display: flex; align-items: center; justify-content: center; flex: 0 0 34px; height: 34px; border: 1px solid #d1ad71; border-radius: 50%; background: linear-gradient(135deg, #b58343, #694125); font: 700 20px 'KaiTi', 'STKaiti', serif; }
.interact-stage__copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.interact-stage__hint { font-size: 10px; line-height: 1.2; letter-spacing: 2px; color: #d4b88a; }
.interact-stage__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 1.4; font-weight: 600; }
.interact-stage__arrow { font-size: 23px; line-height: 1; color: #d4b88a; }
@media (orientation: portrait) { .interact-stage { bottom: calc(env(safe-area-inset-bottom) + 120px); } }
</style>
