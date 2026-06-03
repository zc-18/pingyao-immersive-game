<template>
	<view>
		<!-- 触发铜钱（左下角浮动）-->
		<view class="game-menu__trigger" @tap="toggleMenu">
			<view class="game-menu__trigger-rim"></view>
			<view class="game-menu__trigger-face">
				<text>菜</text>
			</view>
			<view class="game-menu__trigger-hole"></view>
		</view>

		<!-- 菜单面板 -->
		<view v-if="visible" class="game-menu__overlay" @tap="closeMenu">
			<view class="game-menu__panel" :class="{ 'game-menu__panel--show': visible }" @tap.stop>
				<view class="game-menu__panel-fiber"></view>

				<view class="game-menu__header">
					<text class="game-menu__eyebrow">— 游 历 抽 屉 —</text>
					<text class="game-menu__title">且 看 行 旅 何 去</text>
					<view class="game-menu__close" @tap="closeMenu">
						<text>×</text>
					</view>
				</view>

				<view class="game-menu__items">
					<view
						v-for="item in menuItems"
						:key="item.key"
						class="game-menu__item"
						@tap="handleMenuTap(item)"
					>
						<view class="game-menu__item-stamp" :class="`game-menu__item-stamp--${item.key}`">
							<text>{{ item.glyph }}</text>
						</view>
						<view class="game-menu__item-info">
							<text class="game-menu__item-label">{{ item.label }}</text>
							<text class="game-menu__item-desc">{{ item.desc }}</text>
						</view>
						<text class="game-menu__item-arrow">›</text>
					</view>
				</view>

				<view class="game-menu__seal">
					<text>晋商旧路 · 行旅有据</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { markPageVisit } from '@/common/utils/game-state.js'

const visible = ref(false)

const menuItems = [
	{
		key: 'overview',
		label: '旅 程 总 览',
		desc: '回看当前目标与古城进度',
		glyph: '总',
		path: '/pages/index/index',
		tab: true
	},
	{
		key: 'map',
		label: '古 城 览 胜',
		desc: '查看路线、点位与下一步',
		glyph: '图',
		path: '/pages/map/map',
		tab: true
	},
	{
		key: 'shop',
		label: '票 号 铺 面',
		desc: '把银钥换成票券与体验',
		glyph: '肆',
		path: '/pages/shop/shop',
		tab: true
	},
	{
		key: 'user',
		label: '行 旅 账 本',
		desc: '查看等级、徽章与成长',
		glyph: '册',
		path: '/pages/user/user',
		tab: true
	},
	{
		key: 'dialog',
		label: '晋 小 鸦 夜 话',
		desc: '翻看话题与补充讲解',
		glyph: '话',
		path: '/pages_game/dialog/dialog'
	}
]

function toggleMenu() {
	visible.value = !visible.value
	// 此处铜铃声 ding 留给后期接入
}

function closeMenu() {
	visible.value = false
}

function handleMenuTap(item) {
	closeMenu()
	markPageVisit(`menu:${item.key}`)
	if (item.tab) {
		uni.switchTab({ url: item.path })
		return
	}
	uni.navigateTo({ url: item.path })
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

/* 触发铜钱 */
.game-menu__trigger {
	position: fixed;
	left: 28rpx;
	bottom: 220rpx;
	z-index: 50;
	width: 100rpx;
	height: 100rpx;
	transition: transform 0.18s ease;
}

.game-menu__trigger:active {
	transform: rotateY(180deg) scale(0.92);
}

.game-menu__trigger-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.3),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55),
		0 0 24rpx rgba(255, 200, 130, 0.28);
	animation: pulseGlow 3s ease-in-out infinite;
}

.game-menu__trigger-face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%), linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 50%, rgba(139, 69, 19, 0.9) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	color: $py-paper-warm;
	font-size: 30rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.game-menu__trigger-hole {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 14rpx;
	height: 14rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
	z-index: 2;
}

/* 遮罩 */
.game-menu__overlay {
	position: fixed;
	inset: 0;
	z-index: 150;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(10rpx);
}

/* 抽屉面板（卷轴风）*/
.game-menu__panel {
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	width: 540rpx;
	max-width: 80vw;
	padding: calc(env(safe-area-inset-top) + 60rpx) 36rpx 40rpx;
	background:
		linear-gradient(180deg, rgba(245, 232, 208, 0.97) 0%, rgba(232, 215, 180, 0.95) 100%);
	border-right: 4rpx solid $py-bronze;
	box-shadow: 16rpx 0 40rpx rgba(0, 0, 0, 0.55);
	transform: translateX(-100%);
	transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1);
}

.game-menu__panel--show {
	transform: translateX(0);
}

.game-menu__panel-fiber {
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.045) 0, rgba(139, 69, 19, 0.045) 1rpx, transparent 1rpx, transparent 7rpx),
		repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.025) 0, rgba(139, 69, 19, 0.025) 1rpx, transparent 1rpx, transparent 12rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.game-menu__panel > * { position: relative; z-index: 1; }

.game-menu__header {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	padding-bottom: 24rpx;
	border-bottom: 1rpx dashed rgba(110, 85, 65, 0.45);
}

.game-menu__eyebrow {
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.game-menu__title {
	font-size: 32rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 6rpx;
}

.game-menu__close {
	position: absolute;
	top: 0;
	right: 0;
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 36rpx;
	font-weight: 300;
	border-radius: 4rpx;
	transform: rotate(-6deg);
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.5);
}

.game-menu__items {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	margin-top: 28rpx;
}

.game-menu__item {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 18rpx 20rpx;
	background: rgba(255, 248, 239, 0.6);
	border: 1rpx solid rgba(110, 85, 65, 0.32);
	border-left: 4rpx solid $py-bronze;
	border-radius: 4rpx;
	transition: all 0.18s ease;
}

.game-menu__item:active {
	background: rgba(212, 165, 116, 0.22);
	transform: translateX(4rpx);
}

.game-menu__item-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60rpx;
	height: 60rpx;
	background: rgba(196, 30, 58, 0.06);
	border: 3rpx solid $py-red;
	color: $py-red;
	font-size: 26rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	border-radius: 6rpx;
	transform: rotate(-6deg);
	flex-shrink: 0;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.32);
	position: relative;
}

.game-menu__item-stamp::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(196, 30, 58, 0.4);
	border-radius: 4rpx;
}

.game-menu__item-info {
	flex: 1;
	min-width: 0;
}

.game-menu__item-label {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #4a2a18;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.game-menu__item-desc {
	display: block;
	margin-top: 4rpx;
	font-size: 18rpx;
	line-height: 1.55;
	color: rgba(110, 85, 65, 0.85);
}

.game-menu__item-arrow {
	font-size: 32rpx;
	color: $py-bronze;
	font-weight: 300;
}

.game-menu__seal {
	margin-top: 32rpx;
	padding-top: 20rpx;
	border-top: 1rpx dashed rgba(110, 85, 65, 0.35);
	text-align: center;
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: rgba(110, 85, 65, 0.7);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}
</style>
