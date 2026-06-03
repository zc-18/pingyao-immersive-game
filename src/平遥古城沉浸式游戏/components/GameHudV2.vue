<template>
	<view class="game-hud-v2">
		<!-- 底栏胶囊 -->
		<view class="hud-capsule">
			<!-- 左区：角色+等级 -->
			<view class="hud-section hud-left">
				<image class="hud-icon" src="/static/img/icon_level.png" mode="aspectFit" />
				<view class="hud-text-group">
					<text class="hud-label">{{ roleName }}</text>
					<text class="hud-value">{{ levelName }}</text>
				</view>
			</view>

			<!-- 中区：位置+步数 -->
			<view class="hud-section hud-center">
				<view class="hud-location">
					<text class="hud-location-text">{{ location }}</text>
				</view>
				<view class="hud-steps">
					<image class="hud-icon-small" src="/static/img/icon_steps.png" mode="aspectFit" />
					<text class="hud-steps-value">{{ steps }}</text>
				</view>
			</view>

			<!-- 右区：银钥 -->
			<view class="hud-section hud-right">
				<image class="hud-icon" src="/static/img/icon_silver_key.png" mode="aspectFit" />
				<text class="hud-value">{{ silverKey }}</text>
			</view>
		</view>

		<!-- 任务追踪条（HUD上方） -->
		<view v-if="questTracker" class="quest-tracker">
			<view class="quest-tracker-content">
				<image class="quest-icon" src="/static/img/icon_quest.png" mode="aspectFit" />
				<view class="quest-info">
					<text class="quest-title">{{ questTracker.title }}</text>
					<text class="quest-objective">{{ questTracker.currentObjective }}</text>
				</view>
				<view class="quest-progress">
					<text class="quest-progress-text">{{ questTracker.progress }}%</text>
				</view>
			</view>
			<text v-if="sceneHint" class="quest-scene-hint">{{ sceneHint }}</text>
		</view>

		<!-- 无任务提示 -->
		<view v-else-if="showIdleHint" class="idle-hint">
			<text class="idle-hint-text">🚶 自由探索中</text>
		</view>

		<!-- 角色加成提示（右上角） -->
		<view v-if="roleBonus" class="role-bonus-hint">
			<text class="role-bonus-text">{{ roleBonus }}</text>
		</view>
	</view>
</template>

<script setup>
defineProps({
	level: { type: Number, default: 1 },
	levelName: { type: String, default: '票号学徒' },
	roleName: { type: String, default: '研学者' },
	location: { type: String, default: '票号街景' },
	steps: { type: [String, Number], default: 2680 },
	silverKey: { type: [String, Number], default: 120 },
	questTracker: { type: Object, default: null }, // { title, currentObjective, progress }
	showIdleHint: { type: Boolean, default: false },
	roleBonus: { type: String, default: '' }, // 角色加成文本
	sceneHint: { type: String, default: '' }
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.game-hud-v2 {
	position: fixed;
	bottom: 30rpx;
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	width: 90%;
	max-width: 1200rpx;
}

.hud-capsule {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 120rpx;
	padding: 0 24rpx;
	border-radius: 60rpx;
	background: rgba(13, 9, 7, 0.75);
	backdrop-filter: blur(24rpx);
	border: 2rpx solid rgba(212, 165, 116, 0.2);
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.4);
}

.hud-section {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.hud-left,
.hud-right {
	flex: 0 0 auto;
}

.hud-center {
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	min-width: 0;
}

.hud-icon {
	width: 64rpx;
	height: 64rpx;
	flex-shrink: 0;
}

.hud-icon-small {
	width: 32rpx;
	height: 32rpx;
	flex-shrink: 0;
}

.hud-text-group {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}

.hud-label {
	font-size: 20rpx;
	color: rgba(212, 165, 116, 0.55);
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hud-value {
	font-size: 28rpx;
	font-weight: 700;
	color: #f5f0e8;
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
}

.hud-location {
	display: flex;
	align-items: center;
	justify-content: center;
}

.hud-location-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #d4a574;
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 300rpx;
}

.hud-steps {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.hud-steps-value {
	font-size: 22rpx;
	font-weight: 600;
	color: rgba(245, 240, 232, 0.6);
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
}

/* 任务追踪条 */
.quest-tracker {
	position: absolute;
	bottom: 140rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 90%;
	max-width: 800rpx;
}

.quest-tracker-content {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 24rpx;
	border-radius: 40rpx;
	background: rgba(13, 9, 7, 0.75);
	backdrop-filter: blur(20rpx);
	border: 2rpx solid rgba(212, 165, 116, 0.2);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.35);
}

.quest-scene-hint {
	display: block;
	margin-top: 10rpx;
	padding: 0 20rpx;
	font-size: 20rpx;
	line-height: 1.6;
	text-align: center;
	color: rgba(255, 248, 239, 0.82);
	text-shadow: 0 2rpx 10rpx rgba(44, 24, 16, 0.45);
}

.quest-icon {
	width: 48rpx;
	height: 48rpx;
	flex-shrink: 0;
}

.quest-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	min-width: 0;
}

.quest-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #f5f0e8;
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.quest-objective {
	font-size: 20rpx;
	color: rgba(245, 240, 232, 0.55);
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.quest-progress {
	flex-shrink: 0;
}

.quest-progress-text {
	font-size: 22rpx;
	font-weight: 700;
	color: #d4a574;
	font-family: "Noto Serif SC", serif;
}

/* 无任务提示 */
.idle-hint {
	position: absolute;
	bottom: 140rpx;
	left: 50%;
	transform: translateX(-50%);
	padding: 12rpx 32rpx;
	border-radius: 40rpx;
	background: rgba(13, 9, 7, 0.7);
	backdrop-filter: blur(20rpx);
	border: 1rpx solid rgba(212, 165, 116, 0.15);
}

.idle-hint-text {
	font-size: 22rpx;
	color: rgba(245, 240, 232, 0.5);
	line-height: 1.2;
	font-family: "Noto Serif SC", serif;
}

/* 角色加成提示 */
.role-bonus-hint {
	position: absolute;
	top: -60rpx;
	right: 0;
	padding: 8rpx 20rpx;
	border-radius: 20rpx;
	background: rgba(196, 30, 58, 0.9);
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.3);
	animation: bonus-pulse 2s ease-in-out infinite;
}

.role-bonus-text {
	font-size: 20rpx;
	font-weight: 600;
	color: #fffbf4;
	line-height: 1.2;
	white-space: nowrap;
}

@keyframes bonus-pulse {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.85;
		transform: scale(1.05);
	}
}

/* 横屏适配 */
@media screen and (orientation: landscape) {
	.game-hud-v2 {
		bottom: 40rpx;
		width: 85%;
	}

	.hud-capsule {
		height: 100rpx;
		padding: 0 32rpx;
	}

	.quest-tracker {
		bottom: 120rpx;
	}

	.idle-hint {
		bottom: 120rpx;
	}
}
</style>
