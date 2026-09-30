import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const streetSource = fs.readFileSync(
	new URL('../src/pages_game/street/street-renderer.js', import.meta.url),
	'utf8'
)
const clearScene = streetSource.match(/clearScene\(\) \{([\s\S]*?)\r?\n\s*\},\r?\n\s*updatePoiProximity/)?.[1]

test('切换街景前清理上一场景的环境灯光', () => {
	assert.ok(clearScene, '未找到 clearScene 实现')
	assert.match(clearScene, /ambientLightRef/)
	assert.match(clearScene, /directionalLightRef/)
	assert.match(clearScene, /hemiLightRef/)
	assert.match(clearScene, /ground/)
	assert.match(clearScene, /scene\.remove\(/)
})

test('changing the destination while cached applies the latest outfit before building the player', () => {
	const start = streetSource.indexOf('\t\tloadScene(data) {')
	const body = streetSource.slice(start, streetSource.indexOf('\n\t\t\tconst phase =', start)).replace('\t\tloadScene(data) {', '')
	const skin = { silhouette: 'clerk', body: '#3f5a6b' }
	const context = vm.createContext({ scene: {}, renderer: {}, pendingSceneReady: {}, playerSkinData: { silhouette: 'traveler' }, data: { playerSkin: skin }, clearScene() {} })
	vm.runInContext(body, context)
	assert.equal(context.playerSkinData, skin)
	assert.equal(context.pendingSceneReady, null)
})
