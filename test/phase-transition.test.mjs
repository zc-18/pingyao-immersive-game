import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T } from '../scripts/measure-character-envelope.mjs'
import { PHASES } from '../src/common/utils/phase.js'

const source = fs.readFileSync(new URL('../src/pages_game/street/street.vue', import.meta.url), 'utf8')
function fixture() {
  const context = vm.createContext({ engine: T, console, clock: 0 })
  vm.runInContext('this.performance={now:()=>clock}', context)
  const render = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  vm.runInContext(render.replace('export default', 'const component =') + `
    THREE=engine; this.api=component.methods; scene=new THREE.Scene(); renderer={toneMappingExposure:1};
    scene.fog=new THREE.FogExp2(0xffffff,.01); ambientLightRef=new THREE.AmbientLight();
    directionalLightRef=new THREE.DirectionalLight(); hemiLightRef=new THREE.HemisphereLight();
    lanternLights=[new THREE.PointLight()]; scene.add(...lanternLights);
    gradePassRef={uniforms:{warmth:{value:.018},effectAmount:{value:0}}}; bloomPassRef={strength:0};
    this.world=scene; this.state=phaseVisualState;
  `, context)
  const api = context.api, world = context.world, objects = {}
  api.makeCanvas = size => ({ width: size, height: size, getContext: () => ({ drawImage() {} }) })
  api.makeSkyTexture = () => new T.Texture({ width: 1024, height: 512 })
  for (const flag of ['isWindowGlow', 'isBuildingLantern', 'isLanternShell', 'isLanternHalo', 'isLanternPool', 'isCloudLayer', 'isRooflineBackdrop']) {
    const m = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial())
    m.userData[flag] = true; objects[flag] = m; world.add(m)
  }
  api.applyPhase(PHASES.noon, true)
  const read = () => ({
    window: objects.isWindowGlow.material.emissiveIntensity,
    lamp: objects.isBuildingLantern.material.emissiveIntensity,
    shell: objects.isLanternShell.material.emissiveIntensity,
    halo: objects.isLanternHalo.material.opacity,
    pool: objects.isLanternPool.material.opacity,
    cloud: objects.isCloudLayer.material.opacity,
    env: objects.isWindowGlow.material.envMapIntensity,
    effects: context.state.effects,
    warmth: context.state.warmth
  })
  const advance = ms => { context.clock += ms; api.updatePhaseTransition(context.clock) }
  return { api, context, objects, world, read, advance, get: s => vm.runInContext(s, context) }
}

test('all day/night material channels dissolve continuously and finish at the same values as immediate application', () => {
  for (const ms of [1000 / 120, 1000 / 60, 1000 / 30, 50]) {
    const f = fixture()
    for (const phase of [PHASES.night, PHASES.dawn, PHASES.dusk, PHASES.noon]) {
      let last = f.read()
      f.api.applyPhase(phase)
      for (let i = 0; i < Math.ceil(2400 / ms); i++) {
        f.advance(ms); const next = f.read()
        for (const key of Object.keys(next)) assert.ok(Math.abs(next[key] - last[key]) < .055, `${ms} ms ${phase.key}/${key} flashed`)
        last = next
      }
      assert.equal(f.get('phaseTransition'), null)
      const final = f.read(); f.api.applyPhase(phase, true)
      for (const key of Object.keys(final)) assert.ok(Math.abs(final[key] - f.read()[key]) < 1e-10, `end correction changed ${key}`)
    }
  }
})

test('interruption starts from the displayed values and repeated selection does not restart a dissolve', () => {
  const f = fixture()
  for (const phase of [PHASES.night, PHASES.dusk, PHASES.dawn, PHASES.night]) {
    const before = f.read(); f.api.applyPhase(phase)
    assert.deepEqual(f.read(), before)
    for (let i = 0; i < 35; i++) f.advance(16)
    const active = f.get('phaseTransition'), elapsed = active.elapsed
    f.api.applyPhase(phase)
    assert.equal(f.get('phaseTransition'), active)
    assert.equal(active.elapsed, elapsed)
  }
  for (let i = 0; i < 150; i++) f.advance(16)
  assert.equal(f.read().window, .68)
  assert.equal(f.read().lamp, .72)
  assert.equal(f.read().shell, .55)
  assert.equal(f.read().env, .16)
})

test('shader stalls and background gaps preserve the remaining dissolve instead of skipping to its end', () => {
  const f = fixture(); f.api.applyPhase(PHASES.night)
  for (let i = 0; i < 25; i++) f.advance(16)
  const before = f.read(); f.advance(15000)
  assert.ok(f.get('phaseTransition'), 'still transitioning after a suspended frame')
  for (const [key, value] of Object.entries(f.read())) assert.ok(Math.abs(value - before[key]) < .04, key)
  for (let i = 0; i < 150; i++) f.advance(16)
  assert.equal(f.get('phaseTransition'), null)
})

test('models loaded during a dissolve join the current environment light and reach its endpoint', () => {
  const f = fixture(); f.api.applyPhase(PHASES.night)
  for (let i = 0; i < 50; i++) f.advance(16)
  const late = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial())
  f.world.add(late); f.api.applyEnvironmentIntensity(late, f.read().env)
  assert.equal(late.material.envMapIntensity, f.read().env)
  for (let i = 0; i < 100; i++) {
    f.advance(16)
    assert.equal(late.material.envMapIntensity, f.read().env)
  }
  assert.equal(late.material.envMapIntensity, .16)
})

test('shared phase materials update once, and interrupted sky textures are disposed', () => {
  const f = fixture(), shared = f.objects.isWindowGlow.material
  const duplicate = f.objects.isWindowGlow.clone(); duplicate.material = shared; f.world.add(duplicate)
  const snapshot = f.api.capturePhaseTargets(PHASES.night)
  assert.equal(snapshot.tracks.filter(t => t.object === shared && t.property === 'emissiveIntensity').length, 1)
  let releases = 0
  f.api.applyPhase(PHASES.night)
  f.get('phaseSkyBlend.texture').addEventListener('dispose', () => releases++)
  f.advance(20); f.api.applyPhase(PHASES.dusk)
  assert.equal(releases, 1)
  f.get('phaseSkyBlend.texture').addEventListener('dispose', () => releases++)
  f.api.applyPhase(PHASES.noon, true)
  assert.equal(releases, 2)
  assert.equal(f.get('phaseSkyBlend'), null)
  assert.equal(f.get('phaseTransition'), null)
})

test('postprocessing approaches identity at daylight and keeps its current blend when effects reattach', () => {
  const f = fixture(); f.api.applyPhase(PHASES.night, true)
  f.api.applyPhase(PHASES.noon)
  let last = 1
  for (let i = 0; i < 140; i++) {
    f.advance(16)
    assert.ok(f.get('gradePassRef.uniforms.effectAmount.value') <= last)
    last = f.get('gradePassRef.uniforms.effectAmount.value')
  }
  assert.equal(last, 0)
  assert.equal(f.get('bloomPassRef.strength'), 0)
  f.api.applyPhase(PHASES.night)
  for (let i = 0; i < 50; i++) f.advance(16)
  const amount = f.read().effects
  vm.runInContext('gradePassRef={uniforms:{warmth:{value:0},effectAmount:{value:0}}};bloomPassRef={strength:0}', f.context)
  f.api.syncPhaseEffects()
  assert.equal(f.get('gradePassRef.uniforms.effectAmount.value'), amount)
  assert.ok(f.get('bloomPassRef.strength') > 0)
})

test('leaves and fireflies exchange only at zero opacity and rapid changes retain one particle buffer', () => {
  const f = fixture()
  // Real buffer/material ownership with a canvas substitute; browser audit checks rendered sprites.
  f.api.makeCanvas = size => ({ width:size, height:size, getContext:()=>({ drawImage(){}, fillRect(){}, beginPath(){}, ellipse(){}, fill(){}, createRadialGradient:()=>({addColorStop(){}}) }) })
  f.api.createParticles(PHASES.noon)
  let old = f.get('particles'), released = 0, swaps = 0
  old.geometry.addEventListener('dispose', () => released++)
  old.material.addEventListener('dispose', () => released++)
  f.api.applyPhase(PHASES.night)
  for (let i = 0; i < 160; i++) {
    const previous = old.material.opacity
    if (i === 10) f.api.applyPhase(PHASES.dawn)
    if (i === 20) f.api.applyPhase(PHASES.night)
    f.advance(16)
    const current = f.get('particles')
    if (current !== old) {
      swaps++; assert.equal(old.material.opacity, 0); assert.equal(current.material.opacity, 0)
    } else assert.ok(Math.abs(current.material.opacity - previous) < .024)
    old = current
    assert.equal(f.world.children.filter(o => o.isPoints).length, 1)
  }
  assert.equal(swaps, 1)
  assert.equal(released, 2)
  assert.equal(old.userData.kind, 'firefly')
  assert.equal(old.material.opacity, .85)
})
