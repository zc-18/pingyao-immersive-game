import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T } from '../scripts/measure-character-envelope.mjs'
import { footworkFixture } from '../scripts/measure-character-footwork.mjs'

const source = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url), 'utf8')
function fixture() {
  const context = vm.createContext({ engine: T, console })
  const render = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE=engine; this.api=component.methods; player=new THREE.Object3D(); player.userData.collisionRadius=.79; this.root=player;', context)
  return { context, api: context.api, root: context.root }
}
const angle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

test('walking, running and analog reversals brake, step around, and resume across frame rates', () => {
  for (const hz of [20, 30, 60, 120]) for (const speed of [.66, 2.2, 4.15]) {
    const { api, root } = fixture(), dt = 1 / hz
    for (let i = 0; i < hz; i++) api.updatePlayerMotion(0, speed, dt)
    let backward = 0, turnSeconds = 0, result
    for (let i = 0; i < hz * 1.2; i++) {
      const p = root.position.clone(), yaw = root.rotation.y
      result = api.updatePlayerMotion(0, -speed, dt)
      const dx = root.position.x - p.x, dz = root.position.z - p.z
      backward += Math.max(0, -dx * Math.sin(root.rotation.y) - dz * Math.cos(root.rotation.y))
      assert.ok(Math.abs(angle(root.rotation.y, yaw)) <= 7 * dt + 1e-9, 'turn rate cannot jump on a slow frame')
      if (result.movedDistance < .0001 && Math.abs(angle(root.rotation.y, yaw)) > .001) turnSeconds += dt
    }
    assert.ok(backward < 1e-6, `${hz} Hz / ${speed}: backward travel ${backward}`)
    assert.ok(turnSeconds > .3 && turnSeconds < .6, `pivot should be visible and responsive: ${turnSeconds}`)
    assert.ok(result.speed > speed * .95, `reverse input must resume full movement: ${result.speed}`)
    assert.ok(Math.abs(angle(root.rotation.y, Math.PI)) < .01)
  }
})

test('ordinary corners stay moving and changing direction during a pivot takes effect immediately', () => {
  const { api, root } = fixture(), dt = 1 / 60
  for (let i = 0; i < 60; i++) api.updatePlayerMotion(0, 2.2, dt)
  for (let i = 0; i < 35; i++) {
    const state = api.updatePlayerMotion(2.2, 0, dt)
    assert.ok(state.speed > 1.4, 'a right-angle corner should be an arc, without a stop')
  }
  for (let i = 0; i < 18; i++) api.updatePlayerMotion(-2.2, 0, dt)
  const yaw = root.rotation.y
  for (let i = 0; i < 12; i++) api.updatePlayerMotion(Math.sin(yaw) * 2.2, Math.cos(yaw) * 2.2, dt)
  assert.equal(root.userData.motionTurning, false)
  assert.ok(Math.abs(angle(root.rotation.y, yaw)) < .01, 'new input must cancel the old target heading')
})

test('release, modal and portrait locks cancel stationary pivots without drifting or finishing the turn', () => {
  for (const gate of ['release', 'inputBlocked', 'portraitCamera', 'pagePaused']) {
    const { api, root, context } = fixture()
    api.updatePlayerMotion(0, -2.2, 1 / 60)
    const yaw = root.rotation.y, p = root.position.clone()
    if (gate !== 'release') vm.runInContext(`${gate}=true`, context)
    for (let i = 0; i < 60; i++) api.updatePlayerMotion(0, gate === 'release' ? 0 : -2.2, 1 / 60)
    assert.equal(root.userData.motionTurning, false)
    assert.equal(root.userData.turnRate, 0)
    assert.equal(root.rotation.y, yaw)
    assert.equal(root.position.distanceTo(p), 0)
  }
})

test('turning beside a thin wall and an NPC preserves clearance and can move away', () => {
  const { api, root, context } = fixture()
  vm.runInContext('worldColliders=[new THREE.Box3(new THREE.Vector3(-5,-1,2),new THREE.Vector3(5,3,2.08))]; ambientActors=[new THREE.Object3D()]; ambientActors[0].position.set(2,0,.8); ambientActors[0].userData={kind:"rigged-pedestrian",collisionRadius:.56};', context)
  for (let i = 0; i < 120; i++) api.updatePlayerMotion(0, 4.15, 1 / 60)
  assert.ok(root.position.z <= 1.210001)
  const start = root.position.z
  for (let i = 0; i < 90; i++) {
    api.updatePlayerMotion(1, -4, 1 / 60)
    assert.ok(root.position.z <= 1.210001, 'reversal must use the swept collision solver')
    assert.ok(Math.hypot(root.position.x - 2, root.position.z - .8) >= 1.35 - .00001)
  }
  assert.ok(root.position.z < start - 2, 'contact must not trap a turning player')
})

test('actual pivot animation lifts alternating feet, keeps phases aligned and fits the clothing collider', async () => {
  const { api, root, actions, sample } = await footworkFixture(), dt = 1 / 60
  const point = new T.Vector3(), meshes = []
  root.traverse(m => { if (m.isSkinnedMesh) meshes.push(m) })
  for (let i = 0; i < 60; i++) {
    const s = api.updatePlayerMotion(0, 4.15, dt)
    api.updatePlayerMixer(s.speed, s.moving, dt)
  }
  let stepping = 0, radius = 0, minFloor = Infinity, footLift = 0
  for (let i = 0; i < 90; i++) {
    const s = api.updatePlayerMotion(0, -4.15, dt)
    api.updatePlayerMixer(s.speed, s.moving, dt)
    assert.ok(Math.abs(actions.walk.time / actions.walk.getClip().duration - actions.run.time / actions.run.getClip().duration) < 1e-6)
    const feet = sample()
    minFloor = Math.min(minFloor, feet.l.y, feet.r.y)
    if (s.movedDistance < .0001 && Math.abs(root.userData.turnRate) > 1) {
      stepping += actions.walk.getEffectiveWeight() > .12 ? 1 : 0
      footLift = Math.max(footLift, feet.l.y - feet.r.y, feet.r.y - feet.l.y)
    }
    if (i % 4 === 0) for (const mesh of meshes) {
      mesh.skeleton.update()
      for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
        point.fromBufferAttribute(mesh.geometry.attributes.position, j)
        mesh.boneTransform(j, point).applyMatrix4(mesh.matrixWorld)
        radius = Math.max(radius, Math.hypot(point.x - root.position.x, point.z - root.position.z))
      }
    }
  }
  assert.ok(stepping > 12, `pivot steps: ${stepping}`)
  assert.ok(footLift > .01, `feet should visibly alternate during the pivot: ${footLift}`)
  assert.ok(minFloor > .075, `soles penetrate the ground: ${minFloor}`)
  assert.ok(radius + .025 < .79, `clothing exceeds collider while turning: ${radius}`)
  for (let i = 0; i < 150; i++) {
    const s = api.updatePlayerMotion(0, 0, dt); api.updatePlayerMixer(s.speed, s.moving, dt)
  }
  const phase = root.userData.locomotionPhase
  for (let i = 0; i < 30; i++) api.updatePlayerMixer(0, false, dt)
  assert.equal(root.userData.locomotionPhase, phase)
  assert.ok(actions.idle.getEffectiveWeight() > .999)
  api.playPlayerWave()
  const pivot = api.updatePlayerMotion(0, 2.2, dt)
  api.updatePlayerMixer(pivot.speed, pivot.moving, dt)
  assert.equal(root.userData.gestureTime, 0, 'starting a pivot must cancel the two-handed greeting')
})

test('wall sliding faces actual travel without exceeding the turn budget or losing movement', () => {
  const { api, root, context } = fixture()
  root.position.x = .8
  vm.runInContext('worldColliders=[new THREE.Box3(new THREE.Vector3(-2,-1,-20),new THREE.Vector3(0,3,20))]', context)
  for (let i = 0; i < 120; i++) {
    const yaw = root.rotation.y, state = api.updatePlayerMotion(-1.5, 1.5, 1 / 60)
    assert.ok(root.position.x >= .79 - .00001)
    assert.ok(Math.abs(angle(root.rotation.y, yaw)) <= 7 / 60 + 1e-9)
    if (i > 60) {
      assert.ok(state.speed > 1.4)
      assert.ok(Math.abs(root.rotation.y) < .01, 'feet must point along the wall instead of skating diagonally into it')
    }
  }
})
