export const THEME_COLORS = {
	primary: '#8B4513',
	secondary: '#D4A574',
	accent: '#C41E3A',
	background: '#F5F0E8',
	backgroundSoft: '#F5F5DC',
	text: '#2C1810',
	textLight: '#6E5541',
	border: '#C9AE8A',
	mask: 'rgba(44, 24, 16, 0.42)'
}

export const THEME_FONT_SIZE = {
	xs: '20rpx',
	sm: '24rpx',
	base: '28rpx',
	lg: '32rpx',
	xl: '40rpx',
	title: '44rpx',
	hero: '56rpx'
}

export const THEME_RADIUS = {
	sm: '12rpx',
	md: '20rpx',
	lg: '28rpx',
	xl: '40rpx',
	pill: '999rpx'
}

export const THEME_SHADOW = {
	card: '0 18rpx 40rpx rgba(92, 55, 24, 0.12)',
	button: '0 12rpx 28rpx rgba(139, 69, 19, 0.24)',
	panel: '0 24rpx 56rpx rgba(76, 45, 21, 0.14)',
	soft: '0 12rpx 28rpx rgba(92, 55, 24, 0.08)'
}

export const THEME_SPACING = {
	xs: '12rpx',
	sm: '16rpx',
	md: '24rpx',
	lg: '32rpx',
	xl: '40rpx',
	xxl: '56rpx'
}

export const THEME_SURFACE = {
	paper: 'linear-gradient(180deg, rgba(255, 252, 245, 0.98) 0%, rgba(245, 240, 232, 0.96) 100%)',
	paperStrong: 'linear-gradient(135deg, rgba(255, 252, 247, 0.98) 0%, rgba(243, 233, 215, 0.96) 100%)',
	paperSoft: 'rgba(255, 251, 244, 0.84)',
	copper: 'linear-gradient(135deg, rgba(139, 69, 19, 0.94) 0%, rgba(196, 109, 45, 0.9) 100%)',
	dark: 'linear-gradient(135deg, rgba(44, 24, 16, 0.92) 0%, rgba(110, 85, 65, 0.9) 100%)',
	line: 'rgba(201, 174, 138, 0.58)'
}

export const THEME_ASSETS = {
	npcName: '晋小鸦',
	defaultLevelName: '票号学徒',
	worldName: '平遥古城'
}

export const THEME_LAYOUT = {
	preferredOrientation: 'landscape',
	customNavbar: true,
	usePlaceholderAssets: true
}

const theme = {
	colors: THEME_COLORS,
	fontSize: THEME_FONT_SIZE,
	radius: THEME_RADIUS,
	shadow: THEME_SHADOW,
	spacing: THEME_SPACING,
	surface: THEME_SURFACE,
	assets: THEME_ASSETS,
	layout: THEME_LAYOUT
}

export default theme
