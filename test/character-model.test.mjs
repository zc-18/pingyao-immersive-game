import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { COSTUMES } from '../src/平遥古城沉浸式游戏/common/data/costumes.js'

const streetSource = fs.readFileSync(
	new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url),
	'utf8'
)
const wardrobeSource = fs.readFileSync(
	new URL('../src/平遥古城沉浸式游戏/components/OutfitWardrobe.vue', import.meta.url),
	'utf8'
)
const brocadePath = new URL(
	'../src/平遥古城沉浸式游戏/static/img/3d/pingyao-brocade-pattern.jpg',
	import.meta.url
)

test('每套服饰都提供可驱动 3D 轮廓的建模参数', () => {
	assert.equal(COSTUMES.length, 7)
	COSTUMES.forEach((costume) => {
		assert.ok(costume.skin.silhouette, `${costume.id} 缺 silhouette`)
		assert.ok(costume.skin.headwear, `${costume.id} 缺 headwear`)
		assert.ok(costume.skin.sleeve, `${costume.id} 缺 sleeve`)
		assert.ok(costume.skin.accessory, `${costume.id} 缺 accessory`)
	})
	assert.ok(COSTUMES.filter((costume) => costume.skin.pattern === 'brocade').length >= 3)
})

test('街景角色使用二代模型、生成式织锦贴图和兼容兜底', () => {
	assert.match(streetSource, /pingyao-player-v2/)
	assert.match(streetSource, /modelVersion:\s*2/)
	assert.match(streetSource, /getBrocadeTexture\(\)/)
	assert.match(streetSource, /pingyao-brocade-pattern\.jpg/)
	assert.match(streetSource, /createLegacyPlayer\(\)/)
	assert.match(streetSource, /reskinPlayer\(skin\)/)
})

test('移动端衣橱预览与 3D 参数共用并保持可滚动', () => {
	assert.match(wardrobeSource, /item\.skin\.silhouette/)
	assert.match(wardrobeSource, /item\.skin\.headwear/)
	assert.match(wardrobeSource, /item\.skin\.pattern/)
	assert.match(wardrobeSource, /\.wardrobe__scroll\s*\{[\s\S]*?min-height:\s*0/)
})

test('织锦运行时贴图经过移动端压缩', () => {
	const stat = fs.statSync(brocadePath)
	assert.ok(stat.size > 40_000, '贴图体积过小，可能为空或过度压缩')
	assert.ok(stat.size < 150_000, '贴图体积过大，会拖慢移动端热换装')
})
