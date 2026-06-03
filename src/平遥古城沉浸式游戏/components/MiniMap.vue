<template>
	<view class="mini-map" :class="{ 'mini-map--collapsed': collapsed }">
		<view class="mini-map__frame" @tap="toggleCollapse">
			<view v-if="!collapsed" class="mini-map__canvas">
				<!-- 道路十字 -->
				<view class="mini-map__road mini-map__road--h"></view>
				<view class="mini-map__road mini-map__road--v"></view>

				<!-- 建筑剪影 -->
				<view
					v-for="building in buildings"
					:key="building.id"
					class="mini-map__building"
					:style="getBuildingStyle(building)"
				></view>

				<!-- POI 印章 -->
				<view
					v-for="poi in pois"
					:key="poi.id"
					class="mini-map__poi"
					:class="{
						'mini-map__poi--quest': poi.isQuest,
						'mini-map__poi--hot': poi.isHot
					}"
					:style="getPoiStyle(poi)"
				>
					<view v-if="poi.isQuest || poi.isHot" class="mini-map__poi-pulse"></view>
				</view>

				<!-- 玩家位置（红印章 + 朝向锥）-->
				<view class="mini-map__player" :style="getPlayerStyle()">
					<view class="mini-map__player-cone" :style="{ transform: `translate(-50%, -100%) rotate(${playerRotation}deg)` }"></view>
					<view class="mini-map__player-stamp">
						<text>我</text>
					</view>
					<view class="mini-map__player-pulse"></view>
				</view>

				<!-- 罗盘北方指针 -->
				<view class="mini-map__compass">
					<text>北</text>
				</view>
			</view>

			<!-- 收起状态图标 -->
			<view v-else class="mini-map__icon">
				<text>图</text>
			</view>
		</view>
		<text v-if="!collapsed && label" class="mini-map__label">{{ label }}</text>
	</view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
	playerPosition: { type: Object, default: () => ({ x: 0, z: 0 }) },
	playerRotation: { type: Number, default: 0 },
	buildings: { type: Array, default: () => [] }, // [{ id, x, z, width, depth }]
	pois: { type: Array, default: () => [] },      // [{ id, x, z, isQuest, isHot }]
	mapSize: { type: Number, default: 60 },        // 世界地图尺寸（米）
	label: { type: String, default: '' }
})

const collapsed = ref(false)

function worldToMapPercent(worldX, worldZ) {
	const halfSize = props.mapSize / 2
	const x = ((worldX + halfSize) / props.mapSize) * 100
	const z = ((worldZ + halfSize) / props.mapSize) * 100
	return { x: Math.max(0, Math.min(100, x)), z: Math.max(0, Math.min(100, z)) }
}

function getBuildingStyle(building) {
	const pos = worldToMapPercent(building.x, building.z)
	const width = ((building.width || 4) / props.mapSize) * 100
	const depth = ((building.depth || 3) / props.mapSize) * 100
	return {
		left: `${pos.x}%`,
		top: `${pos.z}%`,
		width: `${width}%`,
		height: `${depth}%`
	}
}

function getPoiStyle(poi) {
	const pos = worldToMapPercent(poi.x, poi.z)
	return { left: `${pos.x}%`, top: `${pos.z}%` }
}

function getPlayerStyle() {
	const pos = worldToMapPercent(props.playerPosition.x, props.playerPosition.z)
	return { left: `${pos.x}%`, top: `${pos.z}%` }
}

function toggleCollapse() {
	collapsed.value = !collapsed.value
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.mini-map {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	pointer-events: none;
}

.mini-map__frame {
	position: relative;
	width: 220rpx;
	height: 220rpx;
	border-radius: 50%;
	pointer-events: auto;
	background:
		radial-gradient(circle at center, rgba(245, 232, 208, 0.95) 0%, rgba(218, 196, 158, 0.92) 100%);
	border: 4rpx solid rgba(110, 85, 65, 0.6);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 248, 239, 0.55),
		inset 0 0 18rpx rgba(110, 85, 65, 0.2),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	overflow: hidden;
	transition: width 0.3s ease, height 0.3s ease;
}

.mini-map--collapsed .mini-map__frame {
	width: 80rpx;
	height: 80rpx;
}

.mini-map__canvas {
	position: relative;
	width: 100%;
	height: 100%;
	background:
		repeating-linear-gradient(0deg, rgba(110, 85, 65, 0.05) 0, rgba(110, 85, 65, 0.05) 1rpx, transparent 1rpx, transparent 14rpx),
		repeating-linear-gradient(90deg, rgba(110, 85, 65, 0.05) 0, rgba(110, 85, 65, 0.05) 1rpx, transparent 1rpx, transparent 14rpx);
}

.mini-map__road {
	position: absolute;
	background: rgba(74, 42, 24, 0.32);
	border-radius: 999rpx;
}

.mini-map__road--h {
	left: 12%;
	top: 48%;
	width: 76%;
	height: 4%;
}

.mini-map__road--v {
	left: 48%;
	top: 12%;
	width: 4%;
	height: 76%;
}

.mini-map__building {
	position: absolute;
	background: rgba(139, 69, 19, 0.5);
	border: 1rpx solid rgba(74, 42, 24, 0.55);
	border-radius: 2rpx;
	transform: translate(-50%, -50%);
}

.mini-map__poi {
	position: absolute;
	width: 14rpx;
	height: 14rpx;
	border-radius: 3rpx;
	background: rgba(212, 165, 116, 0.85);
	border: 1rpx solid rgba(74, 42, 24, 0.55);
	transform: translate(-50%, -50%) rotate(-6deg);
	box-shadow: 0 0 6rpx rgba(212, 165, 116, 0.55);
}

.mini-map__poi--hot {
	background: $py-gold;
	border-color: $py-bronze;
	box-shadow: 0 0 10rpx rgba(255, 215, 100, 0.7);
}

.mini-map__poi--quest {
	background: $py-red;
	border-color: rgba(255, 220, 220, 0.55);
	box-shadow: 0 0 12rpx rgba(196, 30, 58, 0.8);
}

.mini-map__poi-pulse {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 18rpx;
	height: 18rpx;
	border: 2rpx solid currentColor;
	border-radius: 50%;
	color: $py-red;
	transform: translate(-50%, -50%);
	animation: poi-pulse 1.6s ease-out infinite;
	pointer-events: none;
}

.mini-map__poi--hot .mini-map__poi-pulse { color: $py-gold; }
.mini-map__poi--quest .mini-map__poi-pulse { color: $py-red; }

@keyframes poi-pulse {
	0%   { opacity: 0.85; transform: translate(-50%, -50%) scale(0.8); }
	100% { opacity: 0;    transform: translate(-50%, -50%) scale(2.4); }
}

.mini-map__player {
	position: absolute;
	width: 18rpx;
	height: 18rpx;
	transform: translate(-50%, -50%);
	z-index: 10;
}

.mini-map__player-cone {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 0;
	height: 0;
	border-left: 9rpx solid transparent;
	border-right: 9rpx solid transparent;
	border-bottom: 18rpx solid rgba(196, 30, 58, 0.65);
	pointer-events: none;
}

.mini-map__player-stamp {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24rpx;
	height: 24rpx;
	background: $py-red;
	color: $py-paper-warm;
	font-size: 14rpx;
	font-weight: 700;
	border-radius: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow: 0 0 6rpx rgba(196, 30, 58, 0.55);
	z-index: 2;
}

.mini-map__player-pulse {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 24rpx;
	height: 24rpx;
	border: 2rpx solid rgba(196, 30, 58, 0.55);
	border-radius: 50%;
	transform: translate(-50%, -50%);
	animation: poi-pulse 2.2s ease-out infinite;
	pointer-events: none;
}

.mini-map__compass {
	position: absolute;
	top: 6rpx;
	left: 50%;
	transform: translateX(-50%);
	font-size: 14rpx;
	color: $py-red;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
	text-shadow: 0 0 4rpx rgba(255, 248, 239, 0.7);
}

.mini-map__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	font-size: 30rpx;
	color: $py-red;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.mini-map__label {
	font-size: 18rpx;
	color: rgba(245, 240, 232, 0.85);
	letter-spacing: 4rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.55);
}
</style>
