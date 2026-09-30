import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageSource = fs.readFileSync(
	new URL('../src/pages_game/street/street.vue', import.meta.url),
	'utf8'
)

const streetSource = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')

test('Web 动态资源相对站点根页面解析', () => {
	assert.match(streetSource, /new URL\(clean, document\.baseURI\)/)
	assert.doesNotMatch(streetSource, /_www|convertLocalFileSystemURL/)
	assert.match(streetSource, /document\.baseURI/)
	assert.match(streetSource, /getAssetCandidates/)
	assert.doesNotMatch(streetSource, /['"]\/static\/libs\/three\.min\.js['"]/)
})

test('Three.js 纹理同样经过Web 资源路径解析', () => {
	assert.match(streetSource, /resolveAssetUrl\('static\/img\/3d\/pingyao-brocade-pattern\.jpg'\)/)
	assert.match(streetSource, /resolveAssetUrl\('static\/textures\/courtyard\/' \+ kind/)
})

test('街景提供 浏览器横屏请求与竖屏降级布局', () => {
	assert.match(pageSource, /lockGameLandscape\(\)/)
	assert.match(pageSource, /orientation:\s*portrait/)
	assert.match(pageSource, /height:\s*100dvh/)
})
