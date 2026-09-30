import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T } from '../scripts/measure-character-envelope.mjs'

function fixture() {
  const context = vm.createContext({ engine: T, console, window: { innerWidth: 1440, innerHeight: 900 } })
  const source = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  vm.runInContext(source.replace('export default', 'const component =') + '\nTHREE=engine; scene=new THREE.Scene(); this.api=component.methods; this.world=scene;', context)
  context.api.getTexture = () => new T.Texture()
  return { context, api: context.api, scene: context.world }
}

test('eave crow reacts to horizontal proximity, climbs a real arc, lands exactly and folds its wings', () => {
  const { context, api, scene } = fixture()
  api.createAmbientLife({})
  api.updatePedestrianMotion = () => 0
  const crow = scene.children.find(o => o.userData.kind === 'crow')
  vm.runInContext('player=new THREE.Group(); player.position.set(-4.8,0,4)', context)
  assert.ok(crow.position.y > 4.2, 'its height must not prevent proximity from triggering')
  let apex = 0
  for (let i = 0; i < 300; i++) {
    api.updateAmbientLife(i * 1000 / 60, 1 / 60)
    apex = Math.max(apex, crow.position.y)
  }
  assert.ok(apex > 5.8, `crow should fly above the eaves: ${apex}`)
  assert.equal(crow.userData.perch, 1)
  assert.equal(crow.userData.flying, false)
  assert.ok(crow.position.distanceTo(crow.userData.perches[1]) < 1e-6)
  assert.ok(crow.userData.wings.every(wing => Math.abs(Math.abs(wing.rotation.z) - 1.25) < .001))
})

test('batching retains the animated cloth and its top seam stays fixed while free vertices and normals move', () => {
  const { context, api, scene } = fixture()
  const root = new T.Group()
  const cloth = new T.Mesh(new T.PlaneGeometry(.62, 1.65, 5, 8), new T.MeshStandardMaterial({ color: 0xc41e3a, side: T.DoubleSide }))
  cloth.userData.isWindCloth = true
  root.add(cloth, new T.Mesh(new T.BoxGeometry(.06, 3, .06), new T.MeshStandardMaterial()))
  scene.add(root)
  api.batchStaticRoots([root])
  assert.equal(cloth.parent, root)
  const before = cloth.geometry.attributes.position.array.slice()
  context.cloth = cloth
  vm.runInContext('windClothMeshes=[cloth]', context)
  for (let i = 0; i < 120; i++) api.updateAmbientLife(i * 16, 1 / 60)
  const after = cloth.geometry.attributes.position.array
  let freeMoved = false
  for (let i = 0; i < after.length; i += 3) {
    assert.equal(after[i], before[i])
    assert.equal(after[i + 1], before[i + 1])
    if (before[i + 1] > .824) assert.equal(after[i + 2], before[i + 2])
    else if (Math.abs(after[i + 2] - before[i + 2]) > .005) freeMoved = true
    assert.ok(Math.abs(after[i + 2] - before[i + 2]) <= .086)
  }
  assert.equal(freeMoved, true)
  assert.ok([...cloth.geometry.attributes.normal.array].every(Number.isFinite))
})

test('ambient time ignores wall-clock gaps on resume and smoke stays around its source', () => {
  const { api, scene } = fixture()
  api.createAmbientLife({})
  api.updatePedestrianMotion = () => 0
  const smoke = scene.children.find(o => o.userData.kind === 'smoke')
  api.updateAmbientLife(0, 1 / 60)
  const position = smoke.position.clone()
  api.updateAmbientLife(3600000, 1 / 60)
  assert.ok(smoke.position.distanceTo(position) < .02, 'returning from background must not jump the effect')
  for (let i = 0; i < 10000; i++) api.updateAmbientLife(i * 1000, .05)
  assert.ok(Math.abs(smoke.position.x - smoke.userData.originX) < .33)
  assert.ok(smoke.material.opacity >= 0 && smoke.material.opacity <= .24)
})
