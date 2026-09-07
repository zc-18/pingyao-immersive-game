import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const streetSource = fs.readFileSync(
	new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url),
	'utf8'
)

test('APP 动态资源从 _www 包内路径解析并保留 H5 兜底', () => {
	assert.match(streetSource, /convertLocalFileSystemURL\('_www\/' \+ clean\)/)
	assert.match(streetSource, /document\.baseURI/)
	assert.match(streetSource, /getAssetCandidates/)
	assert.doesNotMatch(streetSource, /['"]\/static\/libs\/three\.min\.js['"]/)
})

test('Three.js 纹理同样经过跨端资源路径解析', () => {
	assert.match(streetSource, /resolveAssetUrl\('static\/img\/3d\/pingyao-brocade-pattern\.jpg'\)/)
	assert.match(streetSource, /resolveAssetUrl\('static\/img\/3d\/pingyao-roofline-panorama\.webp'\)/)
})

test('街景提供 APP 横屏锁定与竖屏降级布局', () => {
	assert.match(streetSource, /lockGameLandscape\(\)/)
	assert.match(streetSource, /orientation:\s*portrait/)
	assert.match(streetSource, /height:\s*100dvh/)
})
