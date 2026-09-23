<script setup>
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { STORAGE_KEYS, ensureStorageDefaults, patchStorageObject } from './common/utils/storage'
import { syncAchievementUnlocks } from './common/utils/achievements'
import { pauseBGM, resumeBGM } from './common/utils/audio.js'

function getPlatformName() {
	try {
		return uni.getSystemInfoSync().platform || 'unknown'
	} catch (error) {
		console.warn('[app] 获取系统信息失败', error)
		return 'unknown'
	}
}

onLaunch(() => {
	ensureStorageDefaults()
	patchStorageObject(STORAGE_KEYS.appRuntime, {
		lastLaunchAt: Date.now(),
		platform: getPlatformName()
	})
	// 启动时同步一次成就（迁移用户数据 / 首次进入）
	try {
		syncAchievementUnlocks()
	} catch (e) {
		console.warn('[app] sync achievements failed', e)
	}
})

onShow(() => {
	resumeBGM()
	patchStorageObject(STORAGE_KEYS.appRuntime, {
		lastShowAt: Date.now()
	})
})

onHide(() => {
	pauseBGM()
	patchStorageObject(STORAGE_KEYS.appRuntime, {
		lastHideAt: Date.now()
	})
})
</script>

<style lang="scss">
@import '@/uni.scss';

/* ===== 页面底色（夜墨 / 深褐）===== */
page {
	background: #0d0907;
	color: $py-paper;
	font-family: 'Noto Serif SC', 'STSong', 'Songti SC', 'KaiTi', serif;
	font-size: $py-font-size-base;
	line-height: 1.65;
	-webkit-font-smoothing: antialiased;
	min-height: 100%;
}

uni-page-body {
	min-height: 100%;
}

view, text, button, input, textarea, scroll-view, swiper, swiper-item, navigator {
	box-sizing: border-box;
}

button {
	margin: 0;
	padding: 0;
	line-height: 1.4;
	border: none;
	border-radius: 0;
	background: transparent;
}

button::after {
	border: none;
}

/* ============================================================
   一、舞台容器（取代 page-shell 的"页面"思维）
   ============================================================ */
.stage {
	position: relative;
	min-height: 100vh;
	min-height: 100dvh;
	overflow: hidden;
	background: #0d0907;
}

.stage--scroll {
	min-height: 100vh;
	min-height: 100dvh;
	overflow-y: auto;
}

/* ============================================================
   二、纸面（宣纸 + 纤维纹理）
   ============================================================ */
.paper-surface {
	position: relative;
	background: $py-panel-paper;
	background-blend-mode: multiply;

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		background: $py-paper-fiber;
		pointer-events: none;
		opacity: 0.7;
		mix-blend-mode: multiply;
	}
}

.paper-dark {
	position: relative;
	background: linear-gradient(180deg, rgba(26, 20, 17, 0.92) 0%, rgba(44, 28, 20, 0.88) 100%);

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		background: $py-paper-fiber;
		pointer-events: none;
		opacity: 0.25;
	}
}

/* ============================================================
   三、铜框（沙金内描边 + 墨黑外阴影 + 沙金外发光高亮态）
   ============================================================ */
.bronze-frame {
	position: relative;
	border-radius: 24rpx;
	border: 2rpx solid rgba(212, 165, 116, 0.55);
	box-shadow:
		inset 0 0 0 1rpx rgba(255, 248, 239, 0.06),
		inset 0 1rpx 0 rgba(255, 248, 239, 0.18),
		0 6rpx 18rpx rgba(26, 20, 17, 0.55);
}

.bronze-frame--lit {
	border-color: rgba(212, 165, 116, 0.85);
	box-shadow:
		inset 0 0 0 1rpx rgba(255, 248, 239, 0.1),
		inset 0 1rpx 0 rgba(255, 248, 239, 0.25),
		0 6rpx 18rpx rgba(26, 20, 17, 0.55),
		0 0 28rpx $py-gold-glow;
}

.bronze-frame__corners::before,
.bronze-frame__corners::after {
	content: '';
	position: absolute;
	width: 22rpx;
	height: 22rpx;
	pointer-events: none;
	border: 2rpx solid rgba(212, 165, 116, 0.7);
}

.bronze-frame__corners::before {
	left: -1rpx;
	top: -1rpx;
	border-right: none;
	border-bottom: none;
	border-top-left-radius: 22rpx;
}

.bronze-frame__corners::after {
	right: -1rpx;
	bottom: -1rpx;
	border-left: none;
	border-top: none;
	border-bottom-right-radius: 22rpx;
}

/* 牌匾（带飞檐 + 红绸）*/
.plaque {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 76rpx;
	padding: 12rpx 38rpx;
	color: $py-paper-warm;
	font-size: 30rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	background: $py-grad-bronze-button;
	border: 2rpx solid rgba(255, 220, 170, 0.4);
	border-radius: 8rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.45),
		inset 0 -3rpx 8rpx rgba(0, 0, 0, 0.32),
		0 8rpx 18rpx rgba(0, 0, 0, 0.55);
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.4);
}

.plaque::before,
.plaque::after {
	content: '';
	position: absolute;
	top: -10rpx;
	width: 28rpx;
	height: 18rpx;
	background: #4a2a18;
	border-radius: 4rpx 4rpx 0 0;
	box-shadow: 0 2rpx 0 rgba(0, 0, 0, 0.6);
}

.plaque::before { left: 16rpx; transform: skewX(-20deg); }
.plaque::after  { right: 16rpx; transform: skewX(20deg); }

.plaque__ribbon {
	position: absolute;
	top: -28rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 56rpx;
	height: 32rpx;
	background: linear-gradient(180deg, $py-red 0%, #8b1a2e 100%);
	clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.4);
}

/* ============================================================
   四、卷轴（纵向 / 横向）
   ============================================================ */
.scroll-panel {
	position: relative;
	padding: 32rpx 56rpx;
	background: $py-panel-paper-strong;
	color: $py-ink;
	border-radius: 6rpx;
	box-shadow: 0 14rpx 40rpx rgba(26, 20, 17, 0.45);
}

.scroll-panel::before {
	content: '';
	position: absolute;
	inset: 0;
	background: $py-paper-fiber;
	pointer-events: none;
	border-radius: 6rpx;
	mix-blend-mode: multiply;
}

/* 卷轴左右滚轴 */
.scroll-panel--horizontal::before,
.scroll-panel--horizontal::after {
	content: '';
	position: absolute;
	top: -8rpx;
	bottom: -8rpx;
	width: 36rpx;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #6b3510 0%, $py-bronze 30%, $py-gold 50%, $py-bronze 70%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 170, 0.18),
		0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.scroll-panel--horizontal::before { left: -18rpx; }
.scroll-panel--horizontal::after  { right: -18rpx; }

/* 卷轴上下轴（纵向）*/
.scroll-panel--vertical::before,
.scroll-panel--vertical::after {
	content: '';
	position: absolute;
	left: -8rpx;
	right: -8rpx;
	height: 36rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #6b3510 0%, $py-bronze 30%, $py-gold 50%, $py-bronze 70%, #4a2a18 100%);
	box-shadow:
		inset 0 0 0 2rpx rgba(255, 220, 170, 0.18),
		0 4rpx 12rpx rgba(0, 0, 0, 0.55);
	z-index: 2;
}

.scroll-panel--vertical::before { top: -18rpx; }
.scroll-panel--vertical::after  { bottom: -18rpx; }

/* 卷轴展开动画（横向）*/
@keyframes scrollUnfurlH {
	0% { transform: scaleX(0); opacity: 0.4; }
	60% { opacity: 1; }
	100% { transform: scaleX(1); opacity: 1; }
}

@keyframes scrollUnfurlV {
	0% { transform: scaleY(0); opacity: 0.4; }
	60% { opacity: 1; }
	100% { transform: scaleY(1); opacity: 1; }
}

.scroll-unfurl-h { animation: scrollUnfurlH 0.65s cubic-bezier(0.2, 0.7, 0.3, 1) both; transform-origin: center; }
.scroll-unfurl-v { animation: scrollUnfurlV 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both; transform-origin: center; }

/* ============================================================
   五、铜质按钮（金属感 + 三连反馈：缩放 + 内阴影 + 金粉粒子）
   ============================================================ */
.copper-button {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 92rpx;
	padding: 0 40rpx;
	border-radius: 999rpx;
	background: $py-grad-bronze-button;
	background-size: 200% 100%;
	color: $py-paper-warm;
	font-size: $py-font-size-lg;
	font-weight: 700;
	letter-spacing: 4rpx;
	border: 2rpx solid rgba(255, 220, 170, 0.42);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 235, 200, 0.55),
		inset 0 -4rpx 10rpx rgba(0, 0, 0, 0.38),
		0 8rpx 20rpx rgba(0, 0, 0, 0.52),
		0 0 28rpx rgba(212, 165, 116, 0.18);
	text-shadow: 0 1rpx 0 rgba(255, 235, 200, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.45);
	animation: copperShimmer 4s ease-in-out infinite;
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.18s ease;
}

.copper-button:active {
	transform: scale(0.96) translateY(2rpx);
	box-shadow:
		inset 0 2rpx 6rpx rgba(0, 0, 0, 0.5),
		0 2rpx 8rpx rgba(0, 0, 0, 0.45);
}

.copper-button.is-disabled,
.copper-button[disabled] {
	background: linear-gradient(135deg, #4a3a2a 0%, #3d2f22 100%);
	box-shadow: inset 0 2rpx 6rpx rgba(0, 0, 0, 0.45);
	color: rgba(245, 240, 232, 0.34);
	border-color: rgba(212, 165, 116, 0.12);
	animation: none;
	text-shadow: none;
}

/* 红色印章按钮（重要 / 危险 / 重置）*/
.stamp-button {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 92rpx;
	padding: 0 40rpx;
	border-radius: 12rpx;
	background: $py-grad-stamp;
	color: $py-paper-warm;
	font-size: $py-font-size-lg;
	font-weight: 700;
	letter-spacing: 8rpx;
	border: 2rpx solid rgba(255, 200, 200, 0.32);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.45),
		inset 0 -3rpx 10rpx rgba(0, 0, 0, 0.42),
		0 8rpx 20rpx rgba(196, 30, 58, 0.42);
	text-shadow: 0 1rpx 0 rgba(255, 220, 220, 0.4), 0 2rpx 0 rgba(0, 0, 0, 0.5);
	transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.18s ease;
}

.stamp-button:active {
	transform: scale(0.94) rotate(-2deg);
	box-shadow:
		inset 0 2rpx 6rpx rgba(0, 0, 0, 0.5),
		0 2rpx 8rpx rgba(0, 0, 0, 0.45);
}

/* 兼容老的 ghost-button */
.ghost-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 88rpx;
	padding: 0 32rpx;
	border-radius: 999rpx;
	border: 2rpx solid rgba(212, 165, 116, 0.45);
	background: rgba(255, 251, 245, 0.06);
	backdrop-filter: blur(12rpx);
	color: $py-gold;
	font-size: $py-font-size-lg;
	font-weight: 600;
	letter-spacing: 4rpx;
	transition: all 0.2s ease;
}

.ghost-button:active {
	background: rgba(255, 251, 245, 0.12);
	border-color: rgba(212, 165, 116, 0.7);
}

/* ============================================================
   六、印章（圆形 / 方形）
   ============================================================ */
.stamp-mark {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 88rpx;
	min-height: 88rpx;
	padding: 14rpx 18rpx;
	color: $py-red;
	font-size: 24rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 4rpx;
	background: rgba(196, 30, 58, 0.05);
	border: 4rpx solid $py-red;
	border-radius: 8rpx;
	transform: rotate(-4deg);
	text-shadow: 0 0 1rpx rgba(196, 30, 58, 0.55);

	&::before {
		content: '';
		position: absolute;
		inset: 4rpx;
		border: 1rpx solid rgba(196, 30, 58, 0.4);
		border-radius: 4rpx;
		pointer-events: none;
	}
}

.stamp-mark--round {
	min-width: 92rpx;
	min-height: 92rpx;
	border-radius: 50%;

	&::before {
		border-radius: 50%;
	}
}

.stamp-mark--lit {
	animation: stampPulse 1.6s ease-in-out infinite;
}

@keyframes stampPulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(196, 30, 58, 0.6); }
	50%      { box-shadow: 0 0 0 14rpx rgba(196, 30, 58, 0); }
}

/* 印章拍下动画（盖章）*/
@keyframes stampSlam {
	0%   { transform: scale(2.4) rotate(8deg); opacity: 0; }
	60%  { transform: scale(0.92) rotate(-6deg); opacity: 1; }
	80%  { transform: scale(1.08) rotate(-3deg); }
	100% { transform: scale(1) rotate(-4deg); opacity: 1; }
}

.stamp-slam { animation: stampSlam 0.6s cubic-bezier(0.36, 1.6, 0.5, 1) both; }

/* ============================================================
   七、HUD 文本辅助类
   ============================================================ */
.hud-label {
	font-size: 18rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.65);
	text-transform: uppercase;
}

.hud-value {
	font-size: 32rpx;
	font-weight: 700;
	color: $py-paper-warm;
	font-family: 'Noto Serif SC', 'STSong', serif;
	text-shadow: 0 2rpx 0 rgba(0, 0, 0, 0.5), 0 0 14rpx rgba(212, 165, 116, 0.35);
	letter-spacing: 2rpx;
}

.hud-desc {
	font-size: 22rpx;
	line-height: 1.7;
	color: rgba(245, 240, 232, 0.66);
}

/* 名词高亮（人名 / 地名 / 任务）*/
.ink-highlight {
	display: inline-block;
	padding: 0 6rpx;
	color: $py-paper-warm;
	background: rgba(196, 30, 58, 0.78);
	border-radius: 4rpx;
}

/* ============================================================
   八、墨条经验槽 / 数据条
   ============================================================ */
.stat-bar {
	position: relative;
	width: 100%;
	height: 18rpx;
	border-radius: 999rpx;
	background: rgba(26, 20, 17, 0.55);
	border: 1rpx solid rgba(212, 165, 116, 0.22);
	overflow: hidden;
	box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.stat-bar__fill {
	position: relative;
	height: 100%;
	border-radius: 999rpx;
	background: linear-gradient(90deg, $py-bronze 0%, $py-gold 50%, $py-gold-light 100%);
	box-shadow: 0 0 14rpx rgba(212, 165, 116, 0.55);
	transition: width 0.7s cubic-bezier(0.2, 0.8, 0.4, 1);
}

.stat-bar__fill::after {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(90deg, transparent 30%, rgba(255, 248, 239, 0.45) 50%, transparent 70%);
	animation: barShine 2.5s ease-in-out infinite;
}

.stat-bar__fill--accent {
	background: linear-gradient(90deg, $py-red 0%, #ff6c80 100%);
	box-shadow: 0 0 16rpx rgba(196, 30, 58, 0.55);
}

.stat-bar--lg { height: 26rpx; }

@keyframes barShine {
	0%, 100% { transform: translateX(-100%); }
	50%      { transform: translateX(120%); }
}

/* ============================================================
   九、徽章（官印 / 等级 / 称号）
   ============================================================ */
.game-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 60rpx;
	height: 60rpx;
	padding: 0 18rpx;
	border-radius: 14rpx;
	background: linear-gradient(135deg, rgba(212, 165, 116, 0.22) 0%, rgba(139, 69, 19, 0.32) 100%);
	border: 2rpx solid rgba(212, 165, 116, 0.5);
	color: $py-gold;
	font-size: 22rpx;
	font-weight: 700;
	font-family: 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
	box-shadow: inset 0 1rpx 0 rgba(255, 248, 239, 0.18);
}

.game-badge--accent {
	background: linear-gradient(135deg, rgba(196, 30, 58, 0.25) 0%, rgba(139, 20, 40, 0.34) 100%);
	border-color: rgba(196, 30, 58, 0.55);
	color: #ff7a92;
}

.game-badge--gold {
	background: linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(212, 165, 116, 0.32) 100%);
	border-color: rgba(255, 215, 0, 0.55);
	color: #ffd96a;
	box-shadow: 0 0 18rpx rgba(255, 215, 0, 0.28);
}

/* ============================================================
   十、过场遮罩（卷轴展开 / 墨晕 / 城门）
   ============================================================ */
.transition-veil {
	position: fixed;
	inset: 0;
	z-index: 999;
	pointer-events: none;
}

@keyframes inkSpread {
	0%   { clip-path: circle(0% at 50% 50%); }
	60%  { clip-path: circle(120% at 50% 50%); }
	100% { clip-path: circle(0% at 50% 50%); }
}

@keyframes gateClose {
	0%   { transform: translateX(-100%); }
	50%  { transform: translateX(0); }
	100% { transform: translateX(0); opacity: 0; }
}

/* ============================================================
   十一、动画关键帧
   ============================================================ */
@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(30rpx); }
	to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
	from { opacity: 0; }
	to   { opacity: 1; }
}

@keyframes pulseGlow {
	0%, 100% { box-shadow: 0 0 22rpx rgba(212, 165, 116, 0.22); }
	50%      { box-shadow: 0 0 44rpx rgba(212, 165, 116, 0.5); }
}

@keyframes copperShimmer {
	0%, 100% { background-position: 0% center; }
	50%      { background-position: 100% center; }
}

@keyframes floatY {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-12rpx); }
}

@keyframes lanternSway {
	0%, 100% { transform: rotate(-3deg); }
	50%      { transform: rotate(3deg); }
}

@keyframes breathe {
	0%, 100% { opacity: 0.6; transform: scale(1); }
	50%      { opacity: 1; transform: scale(1.04); }
}

@keyframes shimmerBorder {
	0%   { border-color: rgba(212, 165, 116, 0.2); }
	50%  { border-color: rgba(212, 165, 116, 0.6); }
	100% { border-color: rgba(212, 165, 116, 0.2); }
}

@keyframes coinFlip {
	0%   { transform: rotateY(0); }
	50%  { transform: rotateY(180deg); }
	100% { transform: rotateY(360deg); }
}

@keyframes inkDraw {
	0%   { stroke-dashoffset: 100; opacity: 0.4; }
	60%  { opacity: 1; }
	100% { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes leafFall {
	0%   { transform: translate3d(0, -10vh, 0) rotate(0); opacity: 0; }
	10%  { opacity: 0.9; }
	100% { transform: translate3d(40rpx, 110vh, 0) rotate(360deg); opacity: 0; }
}

@keyframes lightBeam {
	0%, 100% { opacity: 0.4; transform: scaleY(1); }
	50%      { opacity: 0.8; transform: scaleY(1.08); }
}

/* ============================================================
   十二、时辰光层（晨/午/昏/夜）—— 给 .stage 添加修饰类
   ============================================================ */
.stage--dawn   { background: linear-gradient(180deg, #f0c89c 0%, #e0a075 35%, #6b3510 90%, #1a1411 100%); }
.stage--noon   { background: linear-gradient(180deg, #c8d8ec 0%, #b8a878 50%, #2c1810 100%); }
.stage--dusk   { background: linear-gradient(180deg, #f59e4a 0%, #c41e3a 35%, #5a2d0e 75%, #0d0907 100%); }
.stage--night  { background: linear-gradient(180deg, #1a2438 0%, #0e1422 50%, #050308 100%); }

/* ============================================================
   兼容旧类名（保留以防回归）
   ============================================================ */
.page-shell {
	position: relative;
	min-height: 100vh;
	padding: calc(env(safe-area-inset-top) + 16rpx) 20rpx calc(env(safe-area-inset-bottom) + #{$py-tabbar-safe});
	background: #0d0907;
	overflow: hidden;
}

.ink-card {
	position: relative;
	padding: 24rpx;
	border-radius: 20rpx;
	background: rgba(26, 20, 17, 0.7);
	backdrop-filter: blur(20rpx);
	border: 2rpx solid rgba(212, 165, 116, 0.28);
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.42), inset 0 1rpx 0 rgba(255, 248, 239, 0.08);
}

.game-panel {
	position: relative;
	padding: 24rpx;
	border-radius: 20rpx;
	background: rgba(26, 20, 17, 0.7);
	backdrop-filter: blur(20rpx);
	border: 2rpx solid rgba(212, 165, 116, 0.28);
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.42), inset 0 1rpx 0 rgba(255, 248, 239, 0.08);
}

.game-panel--light {
	background: rgba(255, 251, 244, 0.12);
	border-color: rgba(212, 165, 116, 0.22);
}

.game-panel--accent {
	border-color: rgba(196, 30, 58, 0.45);
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.42), 0 0 24rpx rgba(196, 30, 58, 0.18);
}

.paper-eyebrow {
	display: inline-flex;
	align-items: center;
	padding: 6rpx 16rpx;
	border-radius: 8rpx;
	font-size: 18rpx;
	letter-spacing: 4rpx;
	color: rgba(212, 165, 116, 0.85);
	background: rgba(212, 165, 116, 0.1);
	border: 1rpx solid rgba(212, 165, 116, 0.22);
	text-transform: uppercase;
}

.game-label {
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: rgba(212, 165, 116, 0.6);
}

.game-value {
	font-size: 28rpx;
	font-weight: 700;
	color: $py-paper;
	font-family: 'Noto Serif SC', serif;
}

.game-desc {
	font-size: 22rpx;
	line-height: 1.75;
	color: rgba(245, 240, 232, 0.6);
}

.page-stack {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.mobile-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: $py-spacing-sm;
}

.mobile-toolbar__title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: $py-paper;
}

.mobile-toolbar__desc {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(245, 240, 232, 0.55);
}

.mobile-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 48rpx;
	padding: 0 18rpx;
	border-radius: 999rpx;
	background: rgba(212, 165, 116, 0.12);
	border: 1rpx solid rgba(212, 165, 116, 0.28);
	color: $py-gold;
	font-size: 20rpx;
}

.mobile-bottom-safe {
	padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);
}
</style>
