import { createRouter, createWebHashHistory } from 'vue-router'

/* 路由即页面：meta.page 与页面组件 defineOptions 的 name 一致，供 keep-alive 缓存判定；
   alias 保留旧版链接（#/pages_game/...），已分享的地址和旧存档里的返回路径仍可打开。 */
const routes = [
	{ path: '/', redirect: '/splash' },
	{
		path: '/splash',
		name: 'splash',
		alias: '/pages_game/splash/splash',
		component: () => import('./pages_game/splash/splash.vue'),
		meta: { page: 'SplashPage', title: '沉浸式行旅', game: true }
	},
	{
		path: '/role-select',
		name: 'role-select',
		alias: '/pages_game/role-select/role-select',
		component: () => import('./pages_game/role-select/role-select.vue'),
		meta: { page: 'RoleSelectPage', title: '择身入城', game: true }
	},
	{
		path: '/street',
		name: 'street',
		alias: '/pages_game/street/street',
		component: () => import('./pages_game/street/street.vue'),
		meta: { page: 'StreetPage', title: '古城街巷', game: true }
	},
	{
		path: '/dialog',
		name: 'dialog',
		alias: '/pages_game/dialog/dialog',
		component: () => import('./pages_game/dialog/dialog.vue'),
		meta: { page: 'DialogPage', title: '晋小鸦夜话', game: true }
	},
	{
		path: '/home',
		name: 'home',
		alias: '/pages/index/index',
		component: () => import('./pages/index/index.vue'),
		meta: { page: 'HomePage', title: '古城', tab: true }
	},
	{
		path: '/map',
		name: 'map',
		alias: '/pages/map/map',
		component: () => import('./pages/map/map.vue'),
		meta: { page: 'MapPage', title: '水墨地图', tab: true }
	},
	{
		path: '/shop',
		name: 'shop',
		alias: '/pages/shop/shop',
		component: () => import('./pages/shop/shop.vue'),
		meta: { page: 'ShopPage', title: '古城商铺', tab: true }
	},
	{
		path: '/user',
		name: 'user',
		alias: '/pages/user/user',
		component: () => import('./pages/user/user.vue'),
		meta: { page: 'UserPage', title: '行旅册', tab: true }
	},
	{
		path: '/redeem',
		name: 'redeem',
		alias: '/pages_shop/redeem/redeem',
		component: () => import('./pages_shop/redeem/redeem.vue'),
		meta: { page: 'RedeemPage', title: '兑换票券' }
	},
	{ path: '/:pathMatch(.*)*', redirect: '/splash' }
]

export const TAB_ROUTES = routes.filter((route) => route.meta?.tab).map((route) => route.path)

const router = createRouter({
	history: createWebHashHistory(),
	routes,
	scrollBehavior(to, from, savedPosition) {
		return savedPosition || { top: 0 }
	}
})

router.afterEach((to) => {
	document.title = to.meta.title ? `${to.meta.title} · 平遥古城` : '平遥古城 · 沉浸式行旅'
})

export default router

// 路由属于应用单例；替换配置时重新挂载整个应用，避免旧视图持有另一套路由。
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
