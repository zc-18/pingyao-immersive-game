import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { COSTUMES } from '../src/common/data/costumes.js'

const streetSource = fs.readFileSync(
	new URL('../src/pages_game/street/street-renderer.js', import.meta.url),
	'utf8'
)
const wardrobeSource = fs.readFileSync(
	new URL('../src/components/OutfitWardrobe.vue', import.meta.url),
	'utf8'
)
const brocadePath = new URL(
	'../public/static/img/3d/pingyao-brocade-pattern.jpg',
	import.meta.url
)
const playerModelPath = new URL(
	'../public/static/models/pingyao-character.glb',
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

test('离线骨骼角色满足移动端面数、体积和动画预算', () => {
	const buffer = fs.readFileSync(playerModelPath)
	assert.ok(buffer.length < 8 * 1024 * 1024, '角色 GLB 超过 8MiB 单体预算')
	assert.equal(buffer.toString('ascii', 0, 4), 'glTF')
	const jsonLength = buffer.readUInt32LE(12)
	const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'))
	let triangles = 0
	for (const mesh of gltf.meshes || []) {
		for (const primitive of mesh.primitives || []) {
			if (primitive.indices != null) triangles += gltf.accessors[primitive.indices].count / 3
		}
	}
	assert.ok(triangles <= 8000, `角色为 ${triangles} 三角面，超过 8k`)
	const animations = (gltf.animations || []).map((clip) => clip.name || '')
	assert.ok(animations.some((name) => /^Idle$/i.test(name)))
	assert.ok(animations.some((name) => /Walking/i.test(name)))
	assert.ok(animations.some((name) => /Running/i.test(name)))
	assert.ok(animations.some((name) => /Cheer|Interact|Wave/i.test(name)))
	assert.match(streetSource, /readBinaryAsset\(src\)/)
	assert.match(streetSource, /GLTFLoader\(\)\.parse\(buffer/)
})
