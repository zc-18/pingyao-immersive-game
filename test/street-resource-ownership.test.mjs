import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/pages_game/street/street.vue', import.meta.url), 'utf8')
const engine = fs.readFileSync(new URL('../public/static/libs/three.min.js', import.meta.url), 'utf8')

function harness() {
  const engineContext = vm.createContext({ console: { warn() {} } })
  vm.runInContext(engine, engineContext)
  const context = vm.createContext({ engine: engineContext.THREE, console })
  const render = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
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
  api.getCourtyardTexture = () => null
  for (const depth of [.42, .9, 1.4, 2.6, 4.2, 4.8]) {
    const root = new THREE.Group()
    api.addPitchedRoof(root, 9.2, depth, 4, '#333333', true)
    const roof = root.children[0], ridge = root.children[1]
    roof.geometry.computeBoundingBox()
    assert.ok([...roof.geometry.attributes.normal.array].every(Number.isFinite))
    assert.ok([...roof.geometry.attributes.uv.array].every(Number.isFinite))
    assert.ok(Math.abs(roof.geometry.boundingBox.max.y + roof.position.y - ridge.position.y) < 1e-5)
  }
})

test('phase particle replacement disposes old buffers and keeps one particle system', () => {
  const { api, scene } = harness()
  api.refreshSky = () => {}
  // Canvas drawing is exercised in the browser audit; retain the real texture cache here.
  api.makeCanvas = () => ({ getContext: () => ({ fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, createRadialGradient: () => ({ addColorStop() {} }) }) })
  api.createParticles({ fallingType: 'leaf' })
  const first = scene.children[0]
  let released = 0
  first.geometry.addEventListener('dispose', () => released++)
  first.material.addEventListener('dispose', () => released++)
  let textureReleases = 0
  first.material.map.addEventListener('dispose', () => textureReleases++)
  api.applyPhase({ fallingType: 'firefly' })
  assert.equal(released, 2)
  assert.equal(scene.children.length, 1)
  assert.equal(scene.children[0].userData.kind, 'firefly')
  const second = scene.children[0]
  api.applyPhase({ fallingType: 'firefly' })
  assert.equal(scene.children[0], second)
  api.applyPhase({ fallingType: 'leaf' })
  assert.equal(scene.children[0].material.map, first.material.map)
  assert.equal(textureReleases, 0, 'cached sprite maps survive a phase change')
})

test('courtyard gallery and gate lanterns follow the same day/night cycle as facade lights', () => {
  const { context, api, THREE, scene } = harness()
  const facade = new THREE.Group(), enclosure = new THREE.Group()
  ;[facade, enclosure].forEach(root => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.25), new THREE.MeshStandardMaterial({ emissive: 0xffbb73 }))
    lamp.userData.isBuildingLantern = true; root.add(lamp); scene.add(root)
  })
  context.facade = facade; context.enclosure = enclosure
  vm.runInContext('buildings = [facade]; environment = [enclosure]', context)
  api.batchStaticRoots([facade, enclosure])
  for (const [key, expected] of [['night', .72], ['noon', .08], ['dusk', .42], ['dawn', .08]]) {
    api.updateWindowGlow({ key })
    for (const root of [facade, enclosure]) assert.equal(root.children[0].material.emissiveIntensity, expected)
  }
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

test('sRGB art colors and phase colors enter the linear renderer exactly once', () => {
  const { api, THREE } = harness()
  const expected = new THREE.Color(0x808080).convertSRGBToLinear()
  assert.ok(Math.abs(expected.r - .21586) < .00001)
  assert.ok(api.makeSceneColor(0x808080).equals(expected), 'legacy engine fallback')
  api.configureColorManagement()
  assert.ok(new THREE.MeshStandardMaterial({ color: 0x808080 }).color.equals(expected))
  assert.ok(api.makeSceneColor(0x808080).equals(expected), 'lights must not be decoded twice')
  assert.equal(new THREE.Color().fromArray([.5, .5, .5]).r, .5, 'GLTF linear factors stay linear')
})

test('bloom recovers after sustained spare performance without rapid quality oscillation', () => {
  const { api, context } = harness()
  vm.runInContext('composer = {}; currentPhaseData = { lanternsLit: true }', context)
  const suppressed = () => vm.runInContext('bloomSuppressed', context)
  api.updateBloomBudget(25, 1000)
  assert.equal(suppressed(), true)
  for (const now of [4500, 8000, 11500, 15000, 18500]) api.updateBloomBudget(60, now)
  assert.equal(suppressed(), true, 'cooldown avoids repeatedly toggling an expensive effect')
  api.updateBloomBudget(60, 22000)
  assert.equal(suppressed(), false, 'an initial shader stall must not disable lighting forever')
  api.updateBloomBudget(25, 25500)
  for (const now of [30000, 35000, 40000, 46000]) api.updateBloomBudget(45, now)
  assert.equal(suppressed(), true, 'only sustained headroom can restore bloom')
  vm.runInContext('bloomSuppressed = false; currentPhaseData = { lanternsLit: false }', context)
  api.updateBloomBudget(20, 50000)
  assert.equal(suppressed(), false, 'a daytime slowdown is not caused by the inactive composer')
})
