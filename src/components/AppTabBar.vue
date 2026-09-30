<template>
	<nav class="app-tabbar" aria-label="主导航">
		<a class="app-tabbar__brand" href="#/home" @click="open($event, items[0])" aria-label="平遥行旅 · 古城首页">
			<span class="app-tabbar__seal" aria-hidden="true">平<br />遥</span>
			<span class="app-tabbar__wordmark"><strong>平遥行旅</strong><small>PINGYAO · A LIVING HERITAGE</small></span>
		</a>
		<div class="app-tabbar__links">
		<a
			v-for="item in items"
			:key="item.path"
			:href="'#' + item.path"
			class="app-tabbar__item"
			:class="{ 'app-tabbar__item--active': isActive(item) }"
			:aria-current="isActive(item) ? 'page' : undefined"
			@click="open($event, item)"
		>
			<img class="app-tabbar__icon" :src="isActive(item) ? item.activeIcon : item.icon" alt="" draggable="false" />
			<span class="app-tabbar__label app-tabbar__label--mobile">{{ item.text }}</span>
			<span class="app-tabbar__label app-tabbar__label--desktop">{{ item.desktopText }}</span>
		</a>
		</div>
		<a class="app-tabbar__explore" href="#/street" @click="explore"><span>继续游历</span><span aria-hidden="true">↗</span></a>
	</nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { navigateTo, switchTab } from '@/platform/navigation.js'

const route = useRoute()
const items = [
	{ path: '/home', page: 'HomePage', text: '古城', desktopText: '古城总览', icon: '/static/tabbar/home.png', activeIcon: '/static/tabbar/home-active.png' },
	{ path: '/map', page: 'MapPage', text: '地图', desktopText: '览胜地图', icon: '/static/tabbar/map.png', activeIcon: '/static/tabbar/map-active.png' },
	{ path: '/shop', page: 'ShopPage', text: '商城', desktopText: '瑞蚨祥旧铺', icon: '/static/tabbar/shop.png', activeIcon: '/static/tabbar/shop-active.png' },
	{ path: '/user', page: 'UserPage', text: '我的', desktopText: '我的行旅册', icon: '/static/tabbar/user.png', activeIcon: '/static/tabbar/user-active.png' }
]

function isActive(item) {
	return route.meta.page === item.page
}

function plainClick(event) {
	return !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0
}

function open(event, item) {
	if (!plainClick(event)) return
	event.preventDefault()
	if (!isActive(item)) switchTab(item.path)
}

function explore(event) {
	if (!plainClick(event)) return
	event.preventDefault()
	navigateTo('/street')
}
</script>

<style lang="scss" scoped>
.app-tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 998;
	display: flex;
	height: calc(var(--tab-bar-height, 50px) + env(safe-area-inset-bottom));
	padding-bottom: env(safe-area-inset-bottom);
	background: #f5f0e8;
	box-shadow: 0 -4px 14px rgba(26, 20, 17, 0.12);
}

.app-tabbar__links {
	display: flex;
	width: 100%;
}

.app-tabbar__brand, .app-tabbar__explore, .app-tabbar__label--desktop {
	display: none;
}

.app-tabbar__item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 3px;
	height: var(--tab-bar-height, 50px);
	color: #6e5541;
	font-size: 10px;
	line-height: 1.2;
	text-decoration: none;
	transition: color 160ms, background-color 160ms;
}

.app-tabbar a:focus-visible { outline: 2px solid $py-bronze; outline-offset: -4px; }

.app-tabbar__item--active {
	color: #8b4513;
	font-weight: 700;
}

.app-tabbar__icon {
	width: 24px;
	height: 24px;
}

.app-tabbar__label {
	font-size: 10px;
	letter-spacing: 1px;
}

@media (min-width: 1000px) {
	.app-tabbar {
		top: 0;
		bottom: auto;
		z-index: 80;
		height: 76px;
		padding: 0 max(32px, calc((100vw - 1320px) / 2));
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		border-top: 3px solid $py-bronze-deep;
		border-bottom: 1px solid rgba($py-bronze, 0.18);
		background: $py-paper;
		box-shadow: 0 4px 24px rgba($py-ink, 0.1);
		box-sizing: border-box;
	}
	.app-tabbar__brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; text-decoration: none; color: $py-ink; }
	.app-tabbar__seal { display: grid; place-content: center; width: 31px; height: 42px; border: 1px solid rgba($py-paper, 0.5); outline: 1px solid $py-red; outline-offset: 2px; color: $py-paper; background: $py-red; font: 16px/1.05 'KaiTi', 'STKaiti', serif; text-align: center; }
	.app-tabbar__wordmark { display: flex; flex-direction: column; gap: 4px; }
	.app-tabbar__wordmark strong { font: 23px/1.1 'KaiTi', 'STKaiti', 'Noto Serif SC', serif; letter-spacing: 3px; }
	.app-tabbar__wordmark small { font: 8px/1.4 Georgia, serif; letter-spacing: 1.2px; color: #806c59; }
	.app-tabbar__links { width: auto; align-self: stretch; gap: clamp(12px, 2.4vw, 36px); }
	.app-tabbar__item { position: relative; flex: none; height: 100%; padding: 0 6px; }
	.app-tabbar__item::after { content: ''; position: absolute; bottom: -1px; left: 6px; right: 6px; height: 3px; background: $py-bronze; transform: scaleX(0); transition: transform 160ms; }
	.app-tabbar__item:hover { color: $py-bronze; }
	.app-tabbar__item--active::after { transform: scaleX(1); }
	.app-tabbar__label--desktop { display: inline; font-size: 14px; letter-spacing: 1px; }
	.app-tabbar__icon, .app-tabbar__label--mobile { display: none; }
	.app-tabbar__explore { display: flex; align-items: center; justify-content: center; gap: 18px; flex-shrink: 0; padding: 11px 18px; border: 1px solid $py-bronze; background: $py-bronze; color: $py-paper; text-decoration: none; font-size: 13px; letter-spacing: 1px; transition: background 160ms; }
	.app-tabbar__explore:hover { background: $py-bronze-deep; }
	.app-tabbar__explore:focus-visible { outline-color: $py-gold; }
}

@media (prefers-reduced-motion: reduce) {
	.app-tabbar a, .app-tabbar__item::after { transition: none; }
}
</style>
