import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url), 'utf8')
const engine = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/static/libs/three.min.js', import.meta.url), 'utf8')

function harness() {
  const engineContext = vm.createContext({ console: { warn() {} } })
  vm.runInContext(engine, engineContext)
  const context = vm.createContext({ engine: engineContext.THREE, console })
  const render = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE = engine; scene = new THREE.Scene(); this.api = component.methods; this.world = scene;', context)
  return { context, api: context.api, THREE: engineContext.THREE, scene: context.world }
}

test('static batching preserves world bounds and phase-sensitive materials', () => {
  const { api, THREE, scene } = harness()
  const row = new THREE.Group()
  scene.add(row)
  const texture = new THREE.Texture()
  let textureReleases = 0
  texture.addEventListener('dispose', () => textureReleases++)
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), new THREE.MeshStandardMaterial({ map: texture }))
    mesh.position.set(i * 3, 1.5, -i)
    mesh.rotation.y = i * 0.25
    mesh.userData.isWindowGlow = i === 3
    row.add(mesh)
  }
  const before = new THREE.Box3().setFromObject(row)
  api.batchStaticRoots([row])
  const after = new THREE.Box3().setFromObject(row)
  assert.ok(before.min.distanceTo(after.min) < 1e-5)
  assert.ok(before.max.distanceTo(after.max) < 1e-5)
  assert.equal(row.children.length, 2)
  const window = row.children.find(m => m.userData.isWindowGlow)
  const wall = row.children.find(m => !m.userData.isWindowGlow)
  window.material.emissiveIntensity = 0.8
  assert.notEqual(window.material, wall.material)
  assert.equal(wall.material.emissiveIntensity, 1)
  assert.equal(textureReleases, 0)
})

test('clearScene releases shared scene materials once and preserves cache-owned textures', () => {
  const { context, api, THREE, scene } = harness()
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  let materials = 0, geometries = 0, textures = 0
  material.addEventListener('dispose', () => materials++)
  geometry.addEventListener('dispose', () => geometries++)
  texture.addEventListener('dispose', () => textures++)
  const roots = [new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material)]
  roots.forEach(root => scene.add(root))
  context.roots = roots
  vm.runInContext('buildings = roots', context)
  api.clearScene()
  api.clearScene()
  assert.equal(materials, 1)
  assert.equal(geometries, 1)
  assert.equal(textures, 0)
  assert.equal(scene.children.length, 0)
})

test('continuous roof has finite normals and a ridge attached at the roof peak', () => {
  const { api, THREE } = harness()
  api.makeRoofTexture = () => null
  for (const depth of [2.6, 4.2, 4.8]) {
    const root = new THREE.Group()
    api.addPitchedRoof(root, 9.2, depth, 4, '#333333', true)
    const roof = root.children[0], ridge = root.children[1]
    roof.geometry.computeBoundingBox()
    assert.ok([...roof.geometry.attributes.normal.array].every(Number.isFinite))
    assert.ok(Math.abs(roof.geometry.boundingBox.max.y + roof.position.y - ridge.position.y) < 1e-5)
  }
})

test('phase particle replacement disposes old buffers and keeps one particle system', () => {
  const { api, scene } = harness()
  api.refreshSky = () => {}
  api.createParticles({ fallingType: 'leaf' })
  const first = scene.children[0]
  let released = 0
  first.geometry.addEventListener('dispose', () => released++)
  first.material.addEventListener('dispose', () => released++)
  api.applyPhase({ fallingType: 'firefly' })
  assert.equal(released, 2)
  assert.equal(scene.children.length, 1)
  assert.equal(scene.children[0].userData.kind, 'firefly')
  const second = scene.children[0]
  api.applyPhase({ fallingType: 'firefly' })
  assert.equal(scene.children[0], second)
})

test('color textures use the installed engine encoding API and support colorSpace', () => {
  const { api, THREE } = harness()
  const legacy = new THREE.Texture()
  api.setColorTexture(legacy)
  assert.equal(legacy.encoding, THREE.sRGBEncoding)
  const modern = { colorSpace: '' }
  api.setColorTexture(modern)
  assert.equal(modern.colorSpace, THREE.SRGBColorSpace)
})
