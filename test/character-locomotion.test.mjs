import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T, loadCharacter } from '../scripts/measure-character-envelope.mjs'

const source = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url), 'utf8')
function harness() {
  const context = vm.createContext({ engine: T, console })
  const render = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE=engine; this.api=component.methods;', context)
  return { context, api: context.api }
}

async function playerFixture() {
  const { context, api } = harness(), gltf = await loadCharacter(), root = gltf.scene
  const mixer = new T.AnimationMixer(root)
  const names = { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', wave: 'Interact' }
  const actions = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, mixer.clipAction(gltf.animations.find(c => c.name === name)).play().setEffectiveWeight(key === 'idle' ? 1 : 0)]))
  root.userData = { isGltf: true, mixer, actions }
  api.getTexture = () => new T.Texture()
  api.prepareCharacterDeformation(root)
  context.subject = root
  vm.runInContext('player=subject', context)
  return { root, api, actions, mixer }
}

test('walk/run blending retains a common left/right foot phase while idle time continues', async () => {
  const { api, root, actions, mixer } = await playerFixture()
  const meshes = [], point = new T.Vector3()
  root.traverse(mesh => { if (mesh.isSkinnedMesh) meshes.push(mesh) })
  let blendRadius = 0
  for (let i = 0; i < 360; i++) {
    const speed = i < 120 ? 2.2 : i < 240 ? 4.15 : 3.25
    api.updatePlayerMixer(speed, true, 1 / 60)
    const walk = actions.walk.time / actions.walk.getClip().duration
    const run = actions.run.time / actions.run.getClip().duration
    assert.ok(Math.abs(walk - run) < 1e-6, 'the two clips must never step with opposite legs during a blend')
    assert.ok(walk >= 0 && walk < 1)
    if ((i >= 120 && i < 160) || (i >= 240 && i < 280)) {
      root.updateMatrixWorld(true)
      for (const mesh of meshes) {
        mesh.skeleton.update()
        for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
          point.fromBufferAttribute(mesh.geometry.attributes.position, j)
          mesh.boneTransform(j, point).applyMatrix4(mesh.matrixWorld)
          blendRadius = Math.max(blendRadius, Math.hypot(point.x, point.z))
        }
      }
    }
  }
  assert.ok(blendRadius + .025 < .79, `blended clothing/feet must fit the player collider: ${blendRadius}`)
  const phase = root.userData.locomotionPhase, time = mixer.time
  for (let i = 0; i < 100; i++) api.updatePlayerMixer(0, false, 1 / 60)
  assert.equal(root.userData.locomotionPhase, phase, 'standing still must not advance the gait')
  assert.ok(mixer.time > time + 1, 'idle breathing must continue')
  assert.ok(actions.idle.getEffectiveWeight() > .999)
})

test('skinned soles remain grounded when walking and retain a bounded flight phase when running', async () => {
  const { root, api, actions } = await playerFixture()
  const soles = []
  root.traverse(mesh => { if (mesh.isSkinnedMesh && mesh.material.name === 'Soles') soles.push(mesh) })
  const p = new T.Vector3()
  const sample = () => {
    root.updateMatrixWorld(true)
    let floor = Infinity
    for (const mesh of soles) {
      mesh.skeleton.update()
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        p.fromBufferAttribute(mesh.geometry.attributes.position, i)
        mesh.boneTransform(i, p).applyMatrix4(mesh.matrixWorld)
        floor = Math.min(floor, p.y)
      }
    }
    return floor
  }
  actions.idle.setEffectiveWeight(0); actions.walk.setEffectiveWeight(1)
  for (let i = 0; i < 180; i++) {
    api.updatePlayerMixer(2.2, true, 1 / 120)
    const floor = sample()
    assert.ok(floor > .075 && floor < .091, `walking floor ${floor}`)
  }
  actions.walk.setEffectiveWeight(0); actions.run.setEffectiveWeight(1)
  let lowest = Infinity, highest = -Infinity, head = 0
  for (let i = 0; i < 180; i++) {
    api.updatePlayerMixer(4.15, true, 1 / 120)
    const floor = sample()
    lowest = Math.min(lowest, floor); highest = Math.max(highest, floor)
    if (i % 6 === 0) root.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return
      mesh.skeleton.update()
      for (let j = 0; j < mesh.geometry.attributes.position.count; j += 7) {
        p.fromBufferAttribute(mesh.geometry.attributes.position, j)
        mesh.boneTransform(j, p).applyMatrix4(mesh.matrixWorld)
        head = Math.max(head, p.y)
      }
    })
  }
  assert.ok(lowest > .075 && lowest < .091, `run contact ${lowest}`)
  assert.ok(highest > .18 && highest < .4, `run flight ${highest}`)
  assert.ok(head < 2.15, `running head must fit the existing vertical collision envelope: ${head}`)
})

function pedestrianFixture(kind = 'rigged-pedestrian') {
  const { api, context } = harness(), actor = new T.Object3D()
  actor.userData = { kind, direction: 1, startZ: 0, range: .6, speed: .72, collisionRadius: .56 }
  context.subject = actor
  vm.runInContext('ambientActors=[subject]', context)
  return { api, actor, context }
}

test('pedestrians brake at the end of their route and turn before moving back', () => {
  const { api, actor } = pedestrianFixture()
  let turnFrames = 0, reversals = 0
  for (let i = 0; i < 720; i++) {
    const z = actor.position.z, yaw = actor.rotation.y, direction = actor.userData.direction
    api.updatePedestrianMotion(actor, 1 / 60)
    const delta = actor.position.z - z
    assert.ok(delta * Math.cos(actor.rotation.y) >= -1e-6, 'translation must agree with the facing direction')
    assert.ok(Math.abs(actor.position.z) <= .601, 'route endpoint is respected')
    assert.ok(Math.abs(actor.rotation.y - yaw) <= 3.2 / 60 + 1e-6, 'no instantaneous half-turn')
    if (Math.abs(actor.rotation.y - yaw) > .001 && Math.abs(delta) < .00001) turnFrames++
    if (direction !== actor.userData.direction) reversals++
  }
  assert.ok(turnFrames > 80)
  assert.ok(reversals >= 3, 'the actor must continue patrolling after each turn')
})

test('fallback pedestrians obey walls, turn after blockage, and avoid the player', () => {
  const { api, actor, context } = pedestrianFixture('pedestrian')
  actor.position.z = 1; actor.rotation.y = Math.PI
  Object.assign(actor.userData, { direction: -1, startZ: 1, range: 3 })
  vm.runInContext('worldColliders=[new THREE.Box3(new THREE.Vector3(-2,-1,-.1),new THREE.Vector3(2,3,.1))]', context)
  for (let i = 0; i < 300; i++) {
    api.updatePedestrianMotion(actor, 1 / 60)
    assert.ok(actor.position.z >= .66 - 1e-6)
  }
  assert.ok(actor.position.z > 1.3, 'a blocked fallback must turn and move away')
  vm.runInContext('worldColliders=[]; player=new THREE.Object3D(); player.userData.collisionRadius=.79; player.position.set(0,0,5)', context)
  api.resolveStreetMotion(actor.position, 0, 8, .56)
  assert.ok(actor.position.z <= 5 - .56 - .79 + 1e-5, 'fallback NPCs cannot pass through the player')
})
