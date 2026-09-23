// Uses the shipped GLTFLoader and the page's actual animation methods, without WebGL.
import fs from 'node:fs'
import vm from 'node:vm'
import { pathToFileURL } from 'node:url'
import { T, loadCharacter } from './measure-character-envelope.mjs'

export async function footworkFixture({ planting = true, scale = 1, cadence } = {}) {
  const source = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url), 'utf8')
  const context = vm.createContext({ engine: T, console })
  const render = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE=engine; this.api=component.methods;', context)
  const api = context.api, gltf = await loadCharacter(), root = gltf.scene
  if (cadence) { context.cadence = cadence; vm.runInContext('Object.assign(CHARACTER_GAIT_SPEED, cadence)', context) }
  const mixer = new T.AnimationMixer(root)
  const actions = Object.fromEntries(Object.entries({ idle: 'Idle', walk: 'Walking_A', run: 'Running_A', wave: 'Interact' }).map(([key, name]) => [key, mixer.clipAction(gltf.animations.find(c => c.name === name)).play().setEffectiveWeight(key === 'idle' ? 1 : 0)]))
  root.scale.setScalar(scale)
  root.userData = { isGltf: true, detailed: true, mixer, actions, collisionRadius: .79 * scale }
  api.getTexture = () => new T.Texture()
  api.prepareCharacterDeformation(root)
  if (!planting) api.updateCharacterFootPlant = () => {}
  context.subject = root
  vm.runInContext('player=subject', context)
  const mesh = root.getObjectByName('Detail_Soles'), point = new T.Vector3()
  const indices = { l: [], r: [] }
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    const name = mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getX(i)].name
    indices[name.endsWith('l') ? 'l' : 'r'].push(i)
  }
  const sample = () => {
    root.updateMatrixWorld(true); mesh.skeleton.update()
    return Object.fromEntries(Object.entries(indices).map(([side, entries]) => {
      const centroid = new T.Vector3(); let minY = Infinity
      for (const index of entries) {
        point.fromBufferAttribute(mesh.geometry.attributes.position, index)
        mesh.boneTransform(index, point).applyMatrix4(mesh.matrixWorld)
        centroid.add(point); minY = Math.min(minY, point.y)
      }
      centroid.divideScalar(entries.length)
      return [side, { x: centroid.x, y: minY, z: centroid.z }]
    }))
  }
  return { root, api, actions, mixer, sample, context }
}

export async function measureFootwork({ speed = 2.2, planting = true, scale = 1, cadence } = {}) {
  const fixture = await footworkFixture({ planting, scale, cadence }), { root, api, actions, sample } = fixture
  actions.idle.setEffectiveWeight(0); actions[speed > 3.8 ? 'run' : 'walk'].setEffectiveWeight(1)
  let previous, drift = 0, contactSeconds = 0, maxDrift = 0, minFloor = Infinity, maxLift = 0, plantedFrames = 0
  const dt = 1 / 120, spans = { l: null, r: null }, excursions = []
  for (let frame = 0; frame < 720; frame++) {
    root.position.z += speed * dt
    api.updatePlayerMixer(speed, true, dt)
    const feet = sample()
    minFloor = Math.min(minFloor, feet.l.y, feet.r.y)
    maxLift = Math.max(maxLift, Math.min(feet.l.y, feet.r.y) - .083)
    plantedFrames += (root.userData.footPlant?.feet || []).filter(f => f.weight > .95).length
    for (const side of ['l', 'r']) {
      const foot = feet[side], last = previous?.[side]
      if (foot.y < .094 && last?.y < .094 && frame > 120) {
        const distance = Math.hypot(foot.x - last.x, foot.z - last.z)
        drift += distance; contactSeconds += dt; maxDrift = Math.max(maxDrift, distance / dt)
        if (!spans[side]) spans[side] = { x: foot.x, z: foot.z, maximum: 0 }
        const span = spans[side]
        span.maximum = Math.max(span.maximum, Math.hypot(foot.x - span.x, foot.z - span.z))
      } else if (spans[side]) { excursions.push(spans[side].maximum); spans[side] = null }
    }
    previous = feet
  }
  return { speed, scale, planting, cadence: cadence || 'current', meanContactSpeed: drift / contactSeconds, maxContactSpeed: maxDrift,
    meanContactExcursion: excursions.reduce((a, b) => a + b, 0) / excursions.length,
    minFloor, maxLift, plantedFrames }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = []
  for (const speed of [2.2, 4.15]) {
    result.push(await measureFootwork({ speed, planting: false, cadence: { walk: 1.65, run: 4.1 } }))
    for (const planting of [false, true]) result.push(await measureFootwork({ speed, planting }))
  }
  console.log(JSON.stringify(result, null, 2))
}
