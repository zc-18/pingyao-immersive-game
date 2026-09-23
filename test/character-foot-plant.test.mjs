import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { T } from '../scripts/measure-character-envelope.mjs'
import { footworkFixture, measureFootwork } from '../scripts/measure-character-footwork.mjs'

test('actual sole contact travel improves for walking and running, including the IK contribution', async () => {
  for (const speed of [2.2, 4.15]) {
    const previous = await measureFootwork({ speed, planting: false, cadence: { walk: 1.65, run: 4.1 } })
    const calibrated = await measureFootwork({ speed, planting: false })
    const planted = await measureFootwork({ speed })
    assert.ok(planted.meanContactExcursion < previous.meanContactExcursion * .2)
    assert.ok(planted.meanContactExcursion < calibrated.meanContactExcursion * .5)
    assert.ok(planted.meanContactSpeed < calibrated.meanContactSpeed * .5)
    assert.ok(planted.maxContactSpeed < calibrated.maxContactSpeed)
    assert.ok(planted.plantedFrames > 50)
    assert.ok(planted.minFloor > .0829)
    assert.ok(speed < 3 ? planted.maxLift < .001 : planted.maxLift > .18)
  }
})

test('fixed-length legs and actual mesh stay within floor/collision bounds through acceleration, turns and stops', async () => {
  for (const scale of [1, .93, .965]) {
    const { root, api, sample } = await footworkFixture({ scale })
    const bones = root.userData.footPlant.feet, p = new T.Vector3(), h = new T.Vector3(), k = new T.Vector3(), a = new T.Vector3()
    root.updateMatrixWorld(true)
    const lengths = bones.map(f => {
      f.upper.getWorldPosition(h); f.lower.getWorldPosition(k); f.foot.getWorldPosition(a)
      return [h.distanceTo(k), k.distanceTo(a)]
    })
    let radius = 0, height = 0, minimum = Infinity
    for (let i = 0; i < 480; i++) {
      const pedestrian = scale < 1
      const speed = i < 60 ? (pedestrian ? .72 : 2.2) * i / 60 : i < 150 ? (pedestrian ? .72 : 2.2) : i < 240 ? (pedestrian ? .84 : 4.15) : i < 300 ? 0 : i < 380 ? (pedestrian ? .72 : 2.2) : 0
      const dt = i % 13 === 0 ? 1 / 30 : 1 / 60
      if (i >= 300 && i < 330) root.rotation.y += .09
      root.position.x += Math.sin(root.rotation.y) * speed * dt
      root.position.z += Math.cos(root.rotation.y) * speed * dt
      api.updatePlayerMixer(speed, speed > .01, dt)
      const feet = sample()
      minimum = Math.min(minimum, feet.l.y, feet.r.y)
      assert.ok(root.userData.footPlant.pelvisDrop <= .035 * scale + 1e-6)
      for (const [index, f] of bones.entries()) {
        f.upper.getWorldPosition(h); f.lower.getWorldPosition(k); f.foot.getWorldPosition(a)
        assert.ok(Math.abs(h.distanceTo(k) - lengths[index][0]) < .00001)
        assert.ok(Math.abs(k.distanceTo(a) - lengths[index][1]) < .00001)
      }
      if (i % 4 === 0) root.traverse(mesh => {
        if (!mesh.isSkinnedMesh) return
        mesh.skeleton.update()
        for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
          p.fromBufferAttribute(mesh.geometry.attributes.position, j)
          mesh.boneTransform(j, p).applyMatrix4(mesh.matrixWorld)
          radius = Math.max(radius, Math.hypot(p.x - root.position.x, p.z - root.position.z))
          height = Math.max(height, p.y)
        }
      })
    }
    assert.ok(minimum > .0828, `sole penetration at scale ${scale}: ${minimum}`)
    assert.ok(radius + .025 * scale < (scale < 1 ? .56 : .79) * scale, `mesh radius ${radius} at scale ${scale}`)
    assert.ok(height < 2.15)
    assert.ok(bones.every(f => f.weight < .001 && f.offset.length() < .001))
  }
})

test('wall blockage, sharp reversal, teleport and greeting release old world anchors', async () => {
  const { root, api, sample, context } = await footworkFixture()
  for (let i = 0; i < 90; i++) { root.position.z += 2.2 / 60; api.updatePlayerMixer(2.2, true, 1 / 60) }
  const z = root.position.z
  context.wallZ = z + .79
  vm.runInContext('worldColliders=[new THREE.Box3(new THREE.Vector3(-3,-1,wallZ),new THREE.Vector3(3,3,wallZ+.2))]', context)
  for (let i = 0; i < 80; i++) {
    const before = root.position.z
    api.resolveStreetMotion(root.position, 0, 2.2 / 60, .79)
    api.updatePlayerMixer(Math.abs(root.position.z - before) * 60, false, 1 / 60)
    assert.ok(sample().l.y > .0828)
  }
  assert.ok(Math.abs(root.position.z - z) < .001)
  assert.ok(root.userData.footPlant.feet.every(f => !f.wasContact && f.weight < .001))
  root.rotation.y += Math.PI; root.position.z -= 2.2 / 60
  api.updatePlayerMixer(2.2, true, 1 / 60)
  assert.ok(root.userData.footPlant.feet.every(f => !f.wasContact))
  root.position.z -= 9
  api.updatePlayerMixer(2.2, true, 1 / 60)
  assert.ok(root.userData.footPlant.feet.every(f => !f.wasContact))
  api.playPlayerWave()
  for (let i = 0; i < 100; i++) {
    api.updatePlayerMixer(0, false, 1 / 60)
    assert.ok(Math.min(sample().l.y, sample().r.y) > .0828)
  }
  assert.ok(root.userData.footPlant.feet.every(f => f.weight < .001))
})

test('asset fallback does not require detailed foot bones', async () => {
  const { api } = await footworkFixture()
  const root = new T.Object3D()
  api.prepareCharacterFootPlant(root)
  api.restoreCharacterFootPose(root)
  api.updateCharacterFootPlant(root, 1, 1 / 60)
  assert.equal(root.userData.footPlant, undefined)
})

test('support knee bend follows the animated bend plane instead of flipping backwards', async () => {
  const fixed = await footworkFixture(), raw = await footworkFixture({ planting: false })
  const h = new T.Vector3(), k = new T.Vector3(), a = new T.Vector3(), normal = new T.Vector3()
  const plane = leg => {
    leg.upper.getWorldPosition(h); leg.lower.getWorldPosition(k); leg.foot.getWorldPosition(a)
    return normal.crossVectors(k.sub(h), a.sub(h)).clone()
  }
  let compared = 0
  for (let i = 0; i < 240; i++) {
    const speed = i < 90 ? 2.2 : i < 170 ? 4.15 : 3.1
    for (const f of [fixed, raw]) {
      f.root.position.z += speed / 60; f.api.updatePlayerMixer(speed, true, 1 / 60); f.root.updateMatrixWorld(true)
    }
    for (let side = 0; side < 2; side++) {
      const f = plane(fixed.root.userData.footPlant.feet[side]), r = plane(raw.root.userData.footPlant.feet[side])
      if (f.length() > .0001 && r.length() > .0065) {
        assert.ok(f.normalize().dot(r.normalize()) > .9, `knee plane flipped at frame ${i}`)
        compared++
      } else if (r.length() <= .0065) assert.ok(f.x >= Math.min(0, r.x) - .0001, `nearly straight animation amplified a backward knee at ${i}`)
    }
  }
  assert.ok(compared > 250)
})
