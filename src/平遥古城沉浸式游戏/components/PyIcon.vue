<template>
	<view
		class="py-icon"
		:class="[
			`py-icon--${tone}`,
			{ 'py-icon--ring': variant === 'ring', 'py-icon--plain': variant === 'plain' }
		]"
		:style="boxStyle"
	>
		<text class="py-icon__glyph" :style="glyphStyle">{{ glyph }}</text>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	name: {
		type: String,
		default: 'spark'
	},
	size: {
		type: [Number, String],
		default: 40
	},
	color: {
		type: String,
		default: ''
	},
	tone: {
		type: String,
		default: 'primary'
	},
	variant: {
		type: String,
		default: 'solid'
	}
})

const glyphMap = {
	close: '\u00d7',
	home: '\u5b85',
	map: '\u56fe',
	shop: '\u8086',
	user: '\u543e',
	task: '\u4ee4',
	role: '\u89d2',
	coin: '\u94f6',
	key: '\u94a5',
	step: '\u6b65',
	story: '\u5377',
	compass: '\u9488',
	route: '\u9014',
	poi: '\u57ce',
	chat: '\u8bed',
	mic: '\u97f3',
	send: '\u53d1',
	music: '\u4e50',
	record: '\u5f55',
	badge: '\u7ae0',
	crown: '\u51a0',
	gift: '\u793c',
	camera: '\u5f71',
	service: '\u52a1',
	quest: '\u52a1',
	trend: '\u52bf',
	spark: '\u5149'
}

const glyph = computed(() => glyphMap[props.name] || glyphMap.spark)

const pixelSize = computed(() => typeof props.size === 'string' && /^\d+(\.\d+)?px$/.test(props.size))
const normalizedSize = computed(() => Number.parseFloat(props.size) || 40)

const boxStyle = computed(() => {
	if (props.variant === 'plain') {
		return {
			width: 'auto',
			height: 'auto'
		}
	}

	return {
		width: `${normalizedSize.value}${pixelSize.value ? 'px' : 'rpx'}`,
		height: `${normalizedSize.value}${pixelSize.value ? 'px' : 'rpx'}`
	}
})

const glyphStyle = computed(() => ({
	fontSize: pixelSize.value ? `${normalizedSize.value}px` : `${Math.max(20, Math.round(normalizedSize.value * 0.44))}rpx`,
	color: props.color || ''
}))
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.py-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 20rpx;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.12) 0%, rgba(212, 165, 116, 0.26) 100%);
	border: 2rpx solid rgba(201, 174, 138, 0.58);
	flex-shrink: 0;
}

.py-icon--ring {
	background: rgba(255, 251, 244, 0.78);
}

.py-icon--plain {
	background: transparent;
	border: 0;
	border-radius: 0;
}

.py-icon--primary {
	color: $py-color-primary;
}

.py-icon--accent {
	color: $py-color-accent;
	background: linear-gradient(135deg, rgba(196, 30, 58, 0.1) 0%, rgba(212, 165, 116, 0.18) 100%);
}

.py-icon--dark {
	color: #fff8ef;
	background: linear-gradient(135deg, rgba(44, 24, 16, 0.92) 0%, rgba(110, 85, 65, 0.92) 100%);
	border-color: rgba(110, 85, 65, 0.6);
}

.py-icon--light {
	color: #fff8ef;
	background: linear-gradient(135deg, rgba(212, 165, 116, 0.92) 0%, rgba(139, 69, 19, 0.92) 100%);
}

.py-icon__glyph {
	font-weight: 700;
	line-height: 1;
	letter-spacing: 1rpx;
	color: inherit;
}
</style>
