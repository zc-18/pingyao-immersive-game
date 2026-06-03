<template>
	<view v-if="visible" class="scene-dialog-overlay" @tap="handleClose">
		<view class="scene-dialog-panel" @tap.stop>
			<!-- 宣纸纹理背景 -->
			<image class="dialog-bg" src="/static/img/texture_xuan_paper.png" mode="aspectFill" />

			<!-- 晋小鸦形象 -->
			<view class="dialog-npc">
				<image class="dialog-npc-img" src="/static/img/npc_owl_full.png" mode="aspectFit" />
			</view>

			<!-- 对话气泡 -->
			<view class="dialog-bubble">
				<text class="dialog-text">{{ message }}</text>
			</view>

			<!-- 快捷选项 -->
			<view v-if="options.length > 0" class="dialog-options">
				<view
					v-for="(option, index) in options"
					:key="index"
					class="dialog-option"
					@tap="handleOptionTap(option)"
				>
					{{ option.label }}
				</view>
			</view>

			<!-- 关闭按钮 -->
			<view class="dialog-close" @tap="handleClose">
				<text class="dialog-close-text">×</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	},
	message: {
		type: String,
		default: ''
	},
	options: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['close', 'option-select'])

function handleClose() {
	emit('close')
}

function handleOptionTap(option) {
	emit('option-select', option)
}
</script>

<style lang="scss" scoped>
.scene-dialog-overlay {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 60vh;
	z-index: 150;
	display: flex;
	align-items: flex-end;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%);
	animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
	from {
		transform: translateY(100%);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

.scene-dialog-panel {
	position: relative;
	width: 100%;
	min-height: 50vh;
	padding: 40rpx 32rpx 60rpx;
	border-radius: 40rpx 40rpx 0 0;
	background: rgba(255, 248, 239, 0.98);
	border: 2rpx solid rgba(201, 174, 138, 0.8);
	border-bottom: none;
	box-shadow: 0 -20rpx 60rpx rgba(92, 55, 24, 0.2);
	overflow: hidden;
}

.dialog-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0.3;
	z-index: 0;
}

.dialog-npc {
	position: relative;
	z-index: 1;
	display: flex;
	justify-content: center;
	margin-bottom: 24rpx;
}

.dialog-npc-img {
	width: 160rpx;
	height: 200rpx;
}

.dialog-bubble {
	position: relative;
	z-index: 1;
	padding: 32rpx 28rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(201, 174, 138, 0.5);
	margin-bottom: 24rpx;
}

.dialog-text {
	font-size: 26rpx;
	font-family: "Noto Serif SC", serif;
	line-height: 1.8;
	color: #2c1810;
}

.dialog-options {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.dialog-option {
	padding: 20rpx 24rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%);
	border: 2rpx solid rgba(201, 174, 138, 0.6);
	font-size: 24rpx;
	font-family: "Noto Serif SC", serif;
	color: #8b4513;
	text-align: center;
	transition: all 0.2s ease;
}

.dialog-option:active {
	background: linear-gradient(135deg, #8b4513 0%, #6f3611 100%);
	color: #fff8ef;
	transform: scale(0.98);
}

.dialog-close {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60rpx;
	height: 60rpx;
	border-radius: 50%;
	background: rgba(139, 69, 19, 0.1);
}

.dialog-close-text {
	font-size: 48rpx;
	font-weight: 300;
	color: #8b4513;
	line-height: 1;
}
</style>
