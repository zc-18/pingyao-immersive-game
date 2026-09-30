<template>
	<div class="mini-map" :class="{ 'mini-map--collapsed': collapsed }">
		<div class="mini-map__frame" @click="toggleCollapse">
			<div v-if="!collapsed" class="mini-map__canvas">
				<div v-if="enclosure" class="mini-map__enclosure" :style="getEnclosureStyle()"></div>
				<!-- 与 3D 世界一致的南北主街走廊 -->
				<div class="mini-map__road mini-map__road--v"></div>

				<!-- 建筑剪影 -->
				<div
					v-for="building in buildings"
					:key="building.id"
					class="mini-map__building"
					:style="getBuildingStyle(building)"
				></div>

				<!-- POI 印章 -->
				<div
					v-for="poi in pois"
					:key="poi.id"
					class="mini-map__poi"
					:class="{
						'mini-map__poi--quest': poi.isQuest,
						'mini-map__poi--hot': poi.isHot
					}"
					:style="getPoiStyle(poi)"
				>
					<div v-if="poi.isQuest || poi.isHot" class="mini-map__poi-pulse"></div>
				</div>

				<!-- 玩家位置（红印章 + 朝向锥）-->
				<div class="mini-map__player" :style="getPlayerStyle()">
					<div class="mini-map__player-cone" :style="{ transform: `translate(-50%, -100%) rotate(${playerRotation}deg)` }"></div>
					<div class="mini-map__player-stamp">
						<span>我</span>
					</div>
					<div class="mini-map__player-pulse"></div>
				</div>

				<!-- 罗盘北方指针 -->
				<div class="mini-map__compass">
					<span>北</span>
				</div>
			</div>

			<!-- 收起状态图标 -->
			<div v-else class="mini-map__icon">
				<span>图</span>
			</div>
		</div>
		<span v-if="!collapsed && label" class="mini-map__label">{{ label }}</span>
	</div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
	playerPosition: { type: Object, default: () => ({ x: 0, z: 0 }) },
	playerRotation: { type: Number, default: 0 },
	buildings: { type: Array, default: () => [] }, // [{ id, x, z, width, depth }]
	pois: { type: Array, default: () => [] },      // [{ id, x, z, isQuest, isHot }]
	mapSize: { type: Number, default: 60 },        // 世界地图尺寸（米）
	enclosure: { type: Object, default: null },
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

function getEnclosureStyle() {
	const e=props.enclosure, topLeft=worldToMapPercent(e.xMin,e.zMin)
	return { left: `${topLeft.x}%`, top: `${topLeft.z}%`, width: `${(e.xMax-e.xMin)/props.mapSize*100}%`, height: `${(e.zMax-e.zMin)/props.mapSize*100}%` }
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

<style lang="scss" scoped>.mini-map__enclosure { position: absolute; border: 2px solid #68543e; background: #e9d9bc55; box-sizing: border-box; }

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
	background:
		linear-gradient(90deg, rgba(74, 42, 24, 0.18), rgba(245, 232, 208, 0.42) 18%, rgba(245, 232, 208, 0.42) 82%, rgba(74, 42, 24, 0.18));
	border-left: 1rpx solid rgba(74, 42, 24, 0.38);
	border-right: 1rpx solid rgba(74, 42, 24, 0.38);
}

.mini-map__road--v {
	left: 41%;
	top: 5%;
	width: 18%;
	height: 90%;
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

@media (prefers-reduced-motion: reduce) {
	.mini-map__frame,
	.mini-map__poi-pulse,
	.mini-map__player-pulse {
		transition: none;
		animation: none;
	}
}

@media screen and (orientation: landscape) and (max-height: 520px) {
	.mini-map { gap: 3px; }
	.mini-map__frame { width: 96px; height: 96px; border-width: 2px; }
	.mini-map--collapsed .mini-map__frame { width: 42px; height: 42px; }
	.mini-map__poi { width: 7px; height: 7px; border-radius: 2px; }
	.mini-map__poi-pulse { width: 10px; height: 10px; border-width: 1px; }
	.mini-map__player { width: 10px; height: 10px; }
	.mini-map__player-cone { border-left-width: 5px; border-right-width: 5px; border-bottom-width: 10px; }
	.mini-map__player-stamp { width: 14px; height: 14px; font-size: 8px; border-radius: 2px; }
	.mini-map__player-pulse { width: 14px; height: 14px; border-width: 1px; }
	.mini-map__compass { top: 3px; font-size: 9px; }
	.mini-map__icon { font-size: 16px; }
	.mini-map__label { font-size: 10px; letter-spacing: 1px; }
}
</style>
