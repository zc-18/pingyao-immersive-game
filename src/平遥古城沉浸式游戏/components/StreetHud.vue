<template>
	<view class="street-hud">
		<!-- 顶部正中：地点牌匾（飞檐 + 红绸）-->
		<view class="street-hud__plaque-wrap">
			<view class="street-hud__plaque" :class="{ 'street-hud__plaque--flip': plaqueFlipping }">
				<view class="street-hud__plaque-ribbon"></view>
				<text class="street-hud__plaque-text">{{ location }}</text>
			</view>
			<text v-if="quest" class="street-hud__quest-tag">— {{ quest }} —</text>
		</view>

		<!-- 左上角：头像 + 等级官印 + 墨条经验槽 -->
		<view class="street-hud__profile">
			<view class="street-hud__avatar">
				<view class="street-hud__avatar-rim"></view>
				<view class="street-hud__avatar-inner">
					<image v-if="avatarImage" class="street-hud__avatar-img" :src="avatarImage" mode="aspectFill" />
					<text v-else class="street-hud__avatar-char">{{ roleAvatarChar }}</text>
				</view>
				<view class="street-hud__seal">
					<text class="street-hud__seal-num">{{ level }}</text>
				</view>
			</view>

			<view class="street-hud__profile-info">
				<text class="street-hud__role">{{ roleName }}</text>
				<text class="street-hud__title">{{ levelName }}</text>
				<view class="street-hud__exp-bar">
					<view class="street-hud__exp-fill" :style="{ width: expPercent + '%' }"></view>
				</view>
			</view>
		</view>

		<!-- 右上角：三枚铜钱（背包 / 任务 / 设置）-->
		<view class="street-hud__coins">
			<view class="street-hud__coin" @tap="$emit('action', 'inventory')">
				<view class="street-hud__coin-rim"></view>
				<view class="street-hud__coin-face">
					<text class="street-hud__coin-char">袋</text>
				</view>
				<view class="street-hud__coin-hole"></view>
			</view>
			<view class="street-hud__coin" @tap="$emit('action', 'quest')">
				<view class="street-hud__coin-rim"></view>
				<view class="street-hud__coin-face">
					<text class="street-hud__coin-char">册</text>
				</view>
				<view class="street-hud__coin-hole"></view>
				<view v-if="quest" class="street-hud__coin-dot"></view>
			</view>
			<view class="street-hud__coin" @tap="$emit('action', 'settings')">
				<view class="street-hud__coin-rim"></view>
				<view class="street-hud__coin-face">
					<text class="street-hud__coin-char">匣</text>
				</view>
				<view class="street-hud__coin-hole"></view>
			</view>
		</view>

		<!-- 右上角下方：任务追踪（横向小卷轴）-->
		<view v-if="questTracker" class="street-hud__tracker">
			<view class="street-hud__tracker-roll street-hud__tracker-roll--l"></view>
			<view class="street-hud__tracker-roll street-hud__tracker-roll--r"></view>
			<view class="street-hud__tracker-paper">
				<text class="street-hud__tracker-eyebrow">主 线 引 路</text>
				<text class="street-hud__tracker-title">{{ questTracker.title }}</text>
				<text class="street-hud__tracker-line">{{ questTracker.currentObjective }}</text>
				<view class="street-hud__tracker-progress">
					<view class="street-hud__tracker-progress-bar">
						<view class="street-hud__tracker-progress-fill" :style="{ width: questTracker.progress + '%' }"></view>
					</view>
					<text class="street-hud__tracker-pct">{{ questTracker.progress }}%</text>
				</view>
			</view>
		</view>

		<!-- 角色加成 -->
		<view v-if="roleBonus" class="street-hud__bonus">
			<view class="street-hud__bonus-stamp">+</view>
			<text class="street-hud__bonus-text">{{ roleBonus }}</text>
		</view>

		<!-- 底部正中：横向小卷轴（步数 / 银钥 / 积分）-->
		<view class="street-hud__bottom-scroll">
			<view class="street-hud__bs-roll street-hud__bs-roll--l"></view>
			<view class="street-hud__bs-roll street-hud__bs-roll--r"></view>
			<view class="street-hud__bs-paper">
				<view class="street-hud__bs-cell">
					<view class="street-hud__bs-icon street-hud__bs-icon--steps">
						<view class="street-hud__bs-step-print step-print--1"></view>
						<view class="street-hud__bs-step-print step-print--2"></view>
					</view>
					<text class="street-hud__bs-value">{{ steps }}</text>
					<text class="street-hud__bs-label">步</text>
				</view>
				<view class="street-hud__bs-divider"></view>
				<view class="street-hud__bs-cell">
					<view class="street-hud__bs-icon street-hud__bs-icon--coin">
						<view class="street-hud__bs-coin"></view>
					</view>
					<text class="street-hud__bs-value">{{ silverKey }}</text>
					<text class="street-hud__bs-label">银钥</text>
				</view>
				<view class="street-hud__bs-divider"></view>
				<view class="street-hud__bs-cell">
					<view class="street-hud__bs-icon street-hud__bs-icon--seal">
						<text class="street-hud__bs-seal-char">印</text>
					</view>
					<text class="street-hud__bs-value">{{ score }}</text>
					<text class="street-hud__bs-label">积分</text>
				</view>
			</view>
		</view>

		<!-- 场景提示（飘在底部卷轴上方）-->
		<view v-if="sceneHint" class="street-hud__scene-hint">
			<text class="street-hud__scene-hint-text">{{ sceneHint }}</text>
		</view>
	</view>
</template>

<script setup>
defineProps({
	level:        { type: Number, default: 1 },
	levelName:    { type: String, default: '票号学徒' },
	roleName:     { type: String, default: '研学者' },
	roleAvatarChar: { type: String, default: '学' },
	avatarImage:  { type: String, default: '' },
	location:     { type: String, default: '票号街景' },
	quest:        { type: String, default: '' },
	steps:        { type: [String, Number], default: 0 },
	silverKey:    { type: [String, Number], default: 0 },
	score:        { type: [String, Number], default: 0 },
	expPercent:   { type: Number, default: 0 },
	questTracker: { type: Object, default: null },
	roleBonus:    { type: String, default: '' },
	sceneHint:    { type: String, default: '' },
	plaqueFlipping: { type: Boolean, default: false }
})

defineEmits(['action'])
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.street-hud {
	position: fixed;
	inset: 0;
	z-index: 12;
	pointer-events: none;
}

.street-hud > * {
	pointer-events: auto;
}

/* ===== 顶部牌匾 ===== */
.street-hud__plaque-wrap {
	position: absolute;
	top: 28rpx;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
	animation: hudFadeInUpCentered 0.6s ease both;
}

.street-hud__plaque {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 360rpx;
	padding: 14rpx 56rpx;
	background:
		radial-gradient(ellipse at 50% 30%, rgba(255, 220, 170, 0.28) 0%, transparent 60%),
		linear-gradient(135deg, #4a2a18 0%, #6b3510 30%, #8b4513 50%, #6b3510 70%, #3d2010 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	border-radius: 4rpx;
	color: $py-paper-warm;
	font-size: 28rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.4),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.4),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
}

.street-hud__plaque::before,
.street-hud__plaque::after {
	content: '';
	position: absolute;
	top: -10rpx;
	width: 28rpx;
	height: 18rpx;
	background: #2a1810;
	border-radius: 4rpx 4rpx 0 0;
}

.street-hud__plaque::before { left: 16rpx; transform: skewX(-20deg); }
.street-hud__plaque::after  { right: 16rpx; transform: skewX(20deg); }

.street-hud__plaque-ribbon {
	position: absolute;
	top: -22rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 44rpx;
	height: 26rpx;
	background: linear-gradient(180deg, $py-red 0%, #6b1622 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.street-hud__plaque-text {
	display: block;
	white-space: nowrap;
}

.street-hud__plaque--flip {
	animation: plaqueFlip 0.6s cubic-bezier(0.4, 0, 0.6, 1);
}

@keyframes plaqueFlip {
	0%   { transform: rotateY(0); }
	50%  { transform: rotateY(90deg); }
	100% { transform: rotateY(0); }
}

.street-hud__quest-tag {
	font-size: 18rpx;
	letter-spacing: 6rpx;
	color: rgba(212, 165, 116, 0.78);
	text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.6);
}

/* ===== 左上角：头像 ===== */
.street-hud__profile {
	position: absolute;
	top: 30rpx;
	left: 28rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	animation: fadeInUp 0.6s ease 0.1s both;
}

.street-hud__avatar {
	position: relative;
	width: 110rpx;
	height: 110rpx;
}

.street-hud__avatar-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.6) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.32),
		0 6rpx 14rpx rgba(0, 0, 0, 0.55);
}

.street-hud__avatar-inner {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	overflow: hidden;
	background: linear-gradient(135deg, rgba(139, 69, 19, 0.85) 0%, rgba(196, 150, 90, 0.95) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.street-hud__avatar-img {
	width: 100%;
	height: 100%;
}

.street-hud__avatar-char {
	font-size: 44rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
	color: $py-paper-warm;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

.street-hud__seal {
	position: absolute;
	right: -8rpx;
	bottom: -4rpx;
	width: 44rpx;
	height: 44rpx;
	background: $py-red;
	border: 2rpx solid rgba(255, 200, 200, 0.45);
	border-radius: 6rpx;
	transform: rotate(-6deg);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.55), 0 0 0 1rpx rgba(196, 30, 58, 0.4);
}

.street-hud__seal::before {
	content: '';
	position: absolute;
	inset: 4rpx;
	border: 1rpx solid rgba(255, 220, 220, 0.4);
	border-radius: 3rpx;
}

.street-hud__seal-num {
	position: relative;
	font-size: 22rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
	z-index: 2;
}

.street-hud__profile-info {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 200rpx;
	max-width: 260rpx;
}

.street-hud__role {
	font-size: 22rpx;
	color: rgba(212, 165, 116, 0.75);
	letter-spacing: 4rpx;
}

.street-hud__title {
	font-size: 26rpx;
	font-weight: 700;
	color: $py-paper-warm;
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.6);
}

.street-hud__exp-bar {
	margin-top: 4rpx;
	width: 200rpx;
	height: 12rpx;
	border-radius: 999rpx;
	background: rgba(26, 20, 17, 0.65);
	border: 1rpx solid rgba(212, 165, 116, 0.32);
	overflow: hidden;
	box-shadow: inset 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

.street-hud__exp-fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, $py-bronze 0%, $py-gold 50%, $py-gold-light 100%);
	box-shadow: 0 0 12rpx rgba(212, 165, 116, 0.55);
	transition: width 0.7s cubic-bezier(0.2, 0.8, 0.4, 1);
}

/* ===== 右上角铜钱组 ===== */
.street-hud__coins {
	position: absolute;
	top: 28rpx;
	right: 28rpx;
	display: flex;
	gap: 18rpx;
	animation: fadeInUp 0.6s ease 0.2s both;
}

.street-hud__coin {
	position: relative;
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1);
	cursor: pointer;
}

.street-hud__coin:active {
	transform: rotateY(180deg) scale(0.94);
}

.street-hud__coin-rim {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #4a2a18 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #3d2010 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 235, 195, 0.3),
		0 6rpx 12rpx rgba(0, 0, 0, 0.55);
}

.street-hud__coin-face {
	position: absolute;
	inset: 8rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 35% 30%, rgba(255, 240, 200, 0.4) 0%, transparent 35%),
		linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(196, 150, 90, 0.95) 50%, rgba(139, 69, 19, 0.9) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.street-hud__coin-char {
	font-size: 24rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.65);
}

.street-hud__coin-hole {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 14rpx;
	height: 14rpx;
	background: #0d0907;
	transform: translate(-50%, -50%);
	z-index: 2;
	box-shadow: 0 0 4rpx rgba(0, 0, 0, 0.85);
}

.street-hud__coin-dot {
	position: absolute;
	top: -2rpx;
	right: -2rpx;
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: $py-red;
	box-shadow: 0 0 12rpx rgba(196, 30, 58, 0.8);
	animation: breathe 1.6s ease-in-out infinite;
	z-index: 3;
}

/* ===== 任务卷轴 ===== */
.street-hud__tracker {
	position: absolute;
	top: 140rpx;
	right: 28rpx;
	width: 360rpx;
	animation: fadeInUp 0.6s ease 0.3s both;
}

.street-hud__tracker-roll {
	position: absolute;
	top: -6rpx;
	bottom: -6rpx;
	width: 18rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.street-hud__tracker-roll--l { left: -8rpx; }
.street-hud__tracker-roll--r { right: -8rpx; }

.street-hud__tracker-paper {
	position: relative;
	padding: 16rpx 24rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.96) 0%, rgba(245, 240, 232, 0.94) 100%);
	border-radius: 4rpx;
	box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.45);
}

.street-hud__tracker-paper::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	mix-blend-mode: multiply;
	pointer-events: none;
}

.street-hud__tracker-paper > * { position: relative; z-index: 1; }

.street-hud__tracker-eyebrow {
	display: block;
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.street-hud__tracker-title {
	display: block;
	margin-top: 4rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #6b3510;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
}

.street-hud__tracker-line {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	line-height: 1.6;
	color: rgba(110, 85, 65, 0.92);
}

.street-hud__tracker-progress {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 10rpx;
}

.street-hud__tracker-progress-bar {
	flex: 1;
	height: 8rpx;
	border-radius: 999rpx;
	background: rgba(110, 85, 65, 0.15);
	overflow: hidden;
}

.street-hud__tracker-progress-fill {
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, $py-bronze 0%, $py-gold 100%);
	transition: width 0.7s ease;
}

.street-hud__tracker-pct {
	font-size: 22rpx;
	font-weight: 700;
	color: $py-red;
	font-family: 'Noto Serif SC', serif;
}

/* ===== 角色加成 ===== */
.street-hud__bonus {
	position: absolute;
	top: 156rpx;
	left: 28rpx;
	display: flex;
	align-items: center;
	gap: 10rpx;
	max-width: 320rpx;
	padding: 8rpx 18rpx 8rpx 8rpx;
	background: rgba(196, 30, 58, 0.85);
	border-radius: 999rpx;
	box-shadow: 0 6rpx 14rpx rgba(196, 30, 58, 0.35);
	animation: breathe 2.4s ease-in-out infinite;
}

.street-hud__bonus-stamp {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32rpx;
	height: 32rpx;
	background: $py-paper-warm;
	color: $py-red;
	font-size: 22rpx;
	font-weight: 700;
	border-radius: 4rpx;
	transform: rotate(-6deg);
}

.street-hud__bonus-text {
	font-size: 20rpx;
	color: $py-paper-warm;
	letter-spacing: 2rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

/* ===== 底部横向小卷轴 ===== */
.street-hud__bottom-scroll {
	position: absolute;
	bottom: 32rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 86%;
	max-width: 880rpx;
	animation: hudFadeInUpCentered 0.6s ease 0.4s both;
}

.street-hud__bs-roll {
	position: absolute;
	top: -6rpx;
	bottom: -6rpx;
	width: 26rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #4a2a18 0%, #8b4513 30%, #d4a574 50%, #8b4513 70%, #3d2010 100%);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.street-hud__bs-roll--l { left: -12rpx; }
.street-hud__bs-roll--r { right: -12rpx; }

.street-hud__bs-roll::before,
.street-hud__bs-roll::after {
	content: '';
	position: absolute;
	left: 50%;
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	background: radial-gradient(circle at 30% 30%, #f0d28e 0%, #8b4513 70%);
	transform: translateX(-50%);
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.55);
}

.street-hud__bs-roll::before { top: -12rpx; }
.street-hud__bs-roll::after  { bottom: -12rpx; }

.street-hud__bs-paper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding: 18rpx 40rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 240, 232, 0.95) 100%);
	border-radius: 4rpx;
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.55);
}

.street-hud__bs-paper::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.04) 0, rgba(139, 69, 19, 0.04) 1rpx, transparent 1rpx, transparent 7rpx);
	pointer-events: none;
	mix-blend-mode: multiply;
}

.street-hud__bs-cell {
	position: relative;
	display: flex;
	align-items: center;
	gap: 12rpx;
	z-index: 1;
}

.street-hud__bs-divider {
	position: relative;
	width: 1rpx;
	height: 40rpx;
	background: rgba(110, 85, 65, 0.32);
	z-index: 1;
}

.street-hud__bs-icon {
	position: relative;
	width: 44rpx;
	height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 步数：脚印 */
.street-hud__bs-step-print {
	position: absolute;
	width: 14rpx;
	height: 18rpx;
	background: #6b3510;
	border-radius: 50% 50% 30% 30%;
}

.step-print--1 { left: 4rpx; top: 8rpx; transform: rotate(-12deg); }
.step-print--2 { right: 4rpx; bottom: 6rpx; transform: rotate(15deg); opacity: 0.7; }

.street-hud__bs-step-print::before {
	content: '';
	position: absolute;
	left: 50%;
	top: -6rpx;
	width: 6rpx;
	height: 6rpx;
	background: #6b3510;
	border-radius: 50%;
	transform: translateX(-50%);
}

/* 银钥：铜钱 */
.street-hud__bs-coin {
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background:
		radial-gradient(circle at 30% 28%, rgba(255, 235, 195, 0.55) 0%, transparent 30%),
		linear-gradient(135deg, #6b3510 0%, #b07b3a 30%, #f0d28e 50%, #b07b3a 70%, #4a2a18 100%);
	position: relative;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.street-hud__bs-coin::after {
	content: '';
	position: absolute;
	left: 50%;
	top: 50%;
	width: 8rpx;
	height: 8rpx;
	background: #1a1411;
	transform: translate(-50%, -50%);
}

/* 积分：印章 */
.street-hud__bs-icon--seal {
	background: $py-red;
	border: 2rpx solid rgba(255, 220, 220, 0.4);
	border-radius: 4rpx;
	transform: rotate(-4deg);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.45);
}

.street-hud__bs-seal-char {
	font-size: 22rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 1rpx rgba(0, 0, 0, 0.5);
}

.street-hud__bs-value {
	font-size: 28rpx;
	font-weight: 700;
	color: #6b3510;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}

.street-hud__bs-label {
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 2rpx;
}

/* ===== 场景提示 ===== */
.street-hud__scene-hint {
	position: absolute;
	bottom: 160rpx;
	left: 50%;
	transform: translateX(-50%);
	max-width: 80%;
	padding: 12rpx 28rpx;
	background: rgba(13, 9, 7, 0.7);
	border: 1rpx solid rgba(212, 165, 116, 0.32);
	border-radius: 999rpx;
	backdrop-filter: blur(12rpx);
	animation: hudFadeInUpCentered 0.6s ease 0.5s both;
}

.street-hud__scene-hint-text {
	font-size: 22rpx;
	color: $py-paper-warm;
	letter-spacing: 3rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

@keyframes breathe {
	0%, 100% { opacity: 0.85; transform: scale(1); }
	50%      { opacity: 1; transform: scale(1.04); }
}

@keyframes hudFadeInUpCentered {
	from { opacity: 0; transform: translate(-50%, 18rpx); }
	to   { opacity: 1; transform: translate(-50%, 0); }
}

/* 手机横屏按可用高度重新排布，不沿用会随屏宽放大的 rpx 尺寸。 */
@media screen and (orientation: landscape) and (max-height: 520px) {
	.street-hud__plaque-wrap { top: 8px; gap: 4px; }
	.street-hud__plaque { min-width: 180px; padding: 7px 22px; border-width: 1px; font-size: 14px; letter-spacing: 3px; }
	.street-hud__plaque::before,
	.street-hud__plaque::after { top: -5px; width: 14px; height: 9px; border-radius: 2px 2px 0 0; }
	.street-hud__plaque-ribbon { top: -11px; width: 22px; height: 13px; }
	.street-hud__quest-tag { font-size: 9px; letter-spacing: 2px; }

	.street-hud__profile { top: 8px; left: 10px; gap: 8px; }
	.street-hud__avatar { width: 52px; height: 52px; }
	.street-hud__avatar-inner { inset: 4px; }
	.street-hud__avatar-char { font-size: 22px; }
	.street-hud__seal { right: -4px; bottom: -2px; width: 22px; height: 22px; border-width: 1px; border-radius: 3px; }
	.street-hud__seal::before { inset: 2px; }
	.street-hud__seal-num { font-size: 11px; }
	.street-hud__profile-info { gap: 2px; min-width: 88px; max-width: 108px; }
	.street-hud__role { font-size: 11px; letter-spacing: 1px; }
	.street-hud__title { font-size: 13px; letter-spacing: 1px; }
	.street-hud__exp-bar { margin-top: 2px; width: 96px; height: 6px; border-width: 1px; }

	.street-hud__coins { top: 8px; right: 10px; gap: 8px; }
	.street-hud__coin { width: 42px; height: 42px; }
	.street-hud__coin-face { inset: 4px; }
	.street-hud__coin-char { font-size: 12px; }
	.street-hud__coin-hole { width: 7px; height: 7px; }
	.street-hud__coin-dot { width: 9px; height: 9px; }

	.street-hud__tracker { top: 58px; right: 10px; width: 190px; }
	.street-hud__tracker-roll { top: -3px; bottom: -3px; width: 9px; }
	.street-hud__tracker-roll--l { left: -4px; }
	.street-hud__tracker-roll--r { right: -4px; }
	.street-hud__tracker-paper { padding: 7px 12px; }
	.street-hud__tracker-eyebrow { font-size: 9px; letter-spacing: 3px; }
	.street-hud__tracker-title { margin-top: 2px; font-size: 13px; letter-spacing: 1px; }
	.street-hud__tracker-line { margin-top: 4px; font-size: 10px; line-height: 1.35; }
	.street-hud__tracker-progress { gap: 6px; margin-top: 5px; }
	.street-hud__tracker-progress-bar { height: 4px; }
	.street-hud__tracker-pct { font-size: 11px; }

	.street-hud__bonus { top: 70px; left: 10px; gap: 5px; max-width: 180px; padding: 4px 9px 4px 4px; }
	.street-hud__bonus-stamp { width: 18px; height: 18px; font-size: 11px; }
	.street-hud__bonus-text { font-size: 10px; letter-spacing: 0; line-height: 1.3; }

	.street-hud__bottom-scroll { bottom: 8px; width: 390px; max-width: calc(100vw - 220px); }
	.street-hud__bs-roll { top: -3px; bottom: -3px; width: 13px; }
	.street-hud__bs-roll--l { left: -6px; }
	.street-hud__bs-roll--r { right: -6px; }
	.street-hud__bs-roll::before,
	.street-hud__bs-roll::after { width: 18px; height: 18px; }
	.street-hud__bs-roll::before { top: -6px; }
	.street-hud__bs-roll::after { bottom: -6px; }
	.street-hud__bs-paper { padding: 9px 18px; }
	.street-hud__bs-cell { gap: 6px; }
	.street-hud__bs-divider { height: 20px; }
	.street-hud__bs-icon { width: 22px; height: 22px; }
	.street-hud__bs-value { font-size: 14px; }
	.street-hud__bs-label { font-size: 9px; letter-spacing: 1px; }
	.street-hud__bs-coin { width: 16px; height: 16px; }
	.street-hud__bs-coin::after { width: 4px; height: 4px; }
	.street-hud__bs-seal-char { font-size: 11px; }

	.street-hud__scene-hint { bottom: 58px; max-width: 52%; padding: 6px 14px; border-width: 1px; }
	.street-hud__scene-hint-text { font-size: 11px; letter-spacing: 1px; }
}
</style>
