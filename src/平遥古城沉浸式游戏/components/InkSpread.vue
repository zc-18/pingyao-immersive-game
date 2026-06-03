<template>
	<view v-if="visible" class="ink-spread" :class="{ 'ink-spread--reverse': reverse }">
		<view class="ink-spread__veil"></view>
	</view>
</template>

<script setup>
defineProps({
	visible: { type: Boolean, default: false },
	reverse: { type: Boolean, default: false } // true=收起，false=展开
})
</script>

<style lang="scss" scoped>
.ink-spread {
	position: fixed;
	inset: 0;
	z-index: 900;
	pointer-events: none;
}

.ink-spread__veil {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(circle at 50% 50%, rgba(13, 9, 7, 0.95) 0%, rgba(26, 16, 8, 0.92) 60%, rgba(74, 42, 24, 0.7) 100%);
	clip-path: circle(0% at 50% 50%);
	animation: inkExpand 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.ink-spread--reverse .ink-spread__veil {
	clip-path: circle(150% at 50% 50%);
	animation: inkContract 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes inkExpand {
	0%   { clip-path: circle(0% at 50% 50%); }
	100% { clip-path: circle(150% at 50% 50%); }
}

@keyframes inkContract {
	0%   { clip-path: circle(150% at 50% 50%); }
	100% { clip-path: circle(0% at 50% 50%); }
}
</style>
