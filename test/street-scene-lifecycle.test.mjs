import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const streetSource = fs.readFileSync(
	new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url),
	'utf8'
)
const clearScene = streetSource.match(/clearScene\(\) \{([\s\S]*?)\r?\n\s*\},\r?\n\s*startAnimation/)?.[1]

test('切换街景前清理上一场景的环境灯光', () => {
	assert.ok(clearScene, '未找到 clearScene 实现')
	assert.match(clearScene, /ambientLightRef/)
	assert.match(clearScene, /directionalLightRef/)
	assert.match(clearScene, /hemiLightRef/)
	assert.match(clearScene, /ground/)
	assert.match(clearScene, /scene\.remove\(/)
})
