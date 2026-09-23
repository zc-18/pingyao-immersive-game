import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const root = new URL('../src/平遥古城沉浸式游戏/', import.meta.url)
const source = fs.readFileSync(new URL('pages_game/street/street.vue', root), 'utf8')
const render = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]

function fixture({ width = 844, height = 390, webgl2 = true, dpr = 3 } = {}) {
  const engineContext = vm.createContext({ console })
  for (const file of ['three.min.js', 'CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js', 'FXAAShader.js']) {
    vm.runInContext(fs.readFileSync(new URL('static/libs/' + file, root), 'utf8'), engineContext)
  }
  const T = engineContext.THREE
  const renderer = {
    width, height, ratio: 1.25,
    capabilities: { isWebGL2: webgl2 }, extensions: { has: () => false },
    getSize(v) { return v.set(this.width, this.height) },
    getPixelRatio() { return this.ratio },
    setPixelRatio(value) { this.ratio = value },
    setSize(w, h) { this.width = w; this.height = h }
  }
  const context = vm.createContext({ engine: T, rendererFixture: renderer, window: { devicePixelRatio: dpr }, console })
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE = engine; renderer = rendererFixture; renderPixelRatio = 1.25; scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(); this.api = component.methods;', context)
  return { api: context.api, renderer, context, engineContext, get: expression => vm.runInContext(expression, context) }
}

test('compact WebGL2 and WebGL1 night paths use FXAA when their targets have no MSAA', () => {
  for (const webgl2 of [true, false]) {
    const f = fixture({ webgl2 })
    f.api.setEffectsEnabled(true)
    assert.ok(f.get('fxaaPassRef'), 'unsampled offscreen rendering must have edge antialiasing')
    assert.equal(f.get('composer.readBuffer.samples'), 0)
    assert.equal(f.get('composer.passes.indexOf(fxaaPassRef)'), 2)
    assert.equal(f.get('composer.passes.indexOf(gradePassRef)'), 3)
    f.api.disposeEffects()
  }
  const desktop = fixture({ width: 1440, height: 900 })
  desktop.api.setEffectsEnabled(true)
  assert.equal(desktop.get('composer.readBuffer.samples'), 4)
  assert.equal(desktop.get('fxaaPassRef'), null, 'MSAA already covers the desktop target')
  desktop.api.disposeEffects()
})

test('resolution changes and rotations keep real composer targets and FXAA texels synchronized', () => {
  const f = fixture()
  f.api.setEffectsEnabled(true)
  const original = f.get('composer')
  for (const [width, height, ratio, expected] of [
    [844, 390, 1.09, [919, 425]],
    [844, 390, 1.73, [1460, 674]],
    [390, 844, 1.73, [674, 1460]],
    [1440, 900, 1.25, [1800, 1125]]
  ]) {
    f.api.setRenderResolution(width, height, ratio)
    assert.equal(f.get('composer'), original, 'resize the existing resources')
    const target = f.get('composer.readBuffer')
    assert.deepEqual([Math.floor(target.width), Math.floor(target.height)], expected)
    const resolution = f.get('fxaaPassRef.material.uniforms.resolution.value')
    assert.ok(Math.abs(1 / resolution.x - expected[0]) < .001)
    assert.ok(Math.abs(1 / resolution.y - expected[1]) < .001)
  }
  let releases = 0
  f.get('fxaaPassRef.material').addEventListener('dispose', () => releases++)
  f.api.disposeEffects(); f.api.disposeEffects()
  assert.equal(releases, 1)
})

test('high-DPI recovery is bounded by device density and render-target pixel budgets', () => {
  const f = fixture()
  assert.equal(f.api.getRenderResolutionLimit(844, 390), 1.75)
  for (const [width, height, budget] of [[390, 844, 1600000], [2560, 1440, 3200000], [4096, 520, 1600000]]) {
    f.api.setRenderResolution(width, height, 3)
    assert.ok(width * height * f.renderer.ratio ** 2 <= budget + 1)
    assert.ok(f.renderer.ratio <= 3)
  }
  const lowDpi = fixture({ dpr: 1 })
  lowDpi.api.setRenderResolution(844, 390, 2)
  assert.equal(lowDpi.renderer.ratio, 1)
  f.api.setRenderResolution(844, 390, .2)
  assert.equal(f.renderer.ratio, .85, 'preserve readable detail at the lowest normal tier')
})

test('effects enabled after a resize inherit the current resolution', () => {
  const f = fixture()
  f.api.setRenderResolution(390, 844, 1.73)
  f.api.setEffectsEnabled(true)
  const resolution = f.get('fxaaPassRef.material.uniforms.resolution.value')
  assert.ok(Math.abs(1 / resolution.x - 674) < .001)
  assert.ok(Math.abs(1 / resolution.y - 1460) < .001)
  f.api.disposeEffects()
})

test('glow switches preserve the base target and antialiasing while releasing all bloom targets', () => {
  const f = fixture(); f.api.setEffectsEnabled(true)
  const base = f.get('composer'), target = base.renderTarget1, fxaa = f.get('fxaaPassRef')
  const bloom = f.get('bloomPassRef'), outputs = [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]
  let released = 0, baseReleased = 0
  outputs.forEach(t => t.addEventListener('dispose', () => released++))
  target.addEventListener('dispose', () => baseReleased++)
  f.api.setEffectsEnabled(false)
  assert.equal(f.get('composer'), base)
  assert.equal(f.get('fxaaPassRef'), fxaa)
  assert.equal(f.get('bloomPassRef'), null)
  assert.equal(released, 11)
  assert.equal(baseReleased, 0)
  assert.equal(base.passes.length, 3)
  f.api.setEffectsEnabled(true)
  assert.equal(base.renderTarget1, target)
  assert.equal(base.passes[1], f.get('bloomPassRef'))
  assert.equal(base.passes.length, 4)
  f.api.disposeEffects()
  assert.equal(baseReleased, 1)
})

test('daylight prepares glow once and day/night/disabled modes share the same color pipeline', () => {
  const f = fixture(); f.api.setEffectsEnabled(true)
  const draws = [], base = f.get('composer')
  base.render = () => draws.push({ glow: f.get('bloomPassRef?.enabled') || false, effect: f.get('gradePassRef.uniforms.effectAmount.value') })
  f.renderer.render = () => assert.fail('switching to a different color target would recompile scene shaders')
  f.api.renderSceneFrame(); f.api.renderSceneFrame()
  assert.deepEqual(draws.map(x => x.glow), [true, false])
  assert.equal(f.get('bloomPassRef.strength'), 0, 'the preparation frame cannot flash daylight glow')
  f.get('phaseVisualState.effects=1'); f.api.syncPhaseEffects(); f.api.renderSceneFrame()
  assert.equal(draws.at(-1).glow, true)
  f.get('bloomSuppressed=true'); f.api.renderSceneFrame()
  assert.equal(draws.at(-1).glow, false)
  assert.equal(draws.at(-1).effect, 1, 'a slow device can reduce bloom without changing color output')
  f.api.setEffectsEnabled(false); f.api.renderSceneFrame()
  assert.equal(draws.at(-1).effect, 0)
  assert.equal(f.get('composer'), base)
  f.api.disposeEffects()
})

test('a failed preparation draw remains retryable and full disposal resets preparation', () => {
  const f = fixture(); f.api.setEffectsEnabled(true)
  f.get('composer').render = () => { throw Error('injected first draw failure') }
  assert.throws(() => f.api.renderSceneFrame(), /first draw failure/)
  assert.equal(f.get('bloomPrepared'), false)
  f.get('composer').render = () => {}
  f.api.renderSceneFrame()
  assert.equal(f.get('bloomPrepared'), true)
  f.api.disposeEffects()
  assert.equal(f.get('bloomPrepared'), false)
  let direct = 0
  f.renderer.render = () => direct++
  f.api.renderSceneFrame()
  assert.equal(direct, 1, 'a device without the base target still has a playable renderer fallback')
})

test('WebGL1 static albedo decodes once and preserves alpha so mipmaps can filter distant details', () => {
  const f = fixture({ webgl2: false })
  const texture = vm.runInContext('new THREE.Texture({ data: new Uint8Array([128, 64, 32, 127]), width: 1, height: 1 })', f.engineContext)
  f.api.prepareSurfaceColorTexture(texture)
  assert.deepEqual([...texture.image.data], [55, 13, 4, 127])
  assert.equal(texture.encoding, f.get('THREE.LinearEncoding'))
  assert.equal(texture.generateMipmaps, true)
  assert.equal(texture.minFilter, f.get('THREE.LinearMipmapLinearFilter'))
  const decoded = texture.image
  f.api.prepareSurfaceColorTexture(texture)
  assert.equal(texture.image, decoded, 'cached images must not be decoded twice')
  texture.image = vm.runInContext('({ data: new Uint8Array([255, 128, 0, 255]), width: 1, height: 1 })', f.engineContext)
  f.api.prepareSurfaceColorTexture(texture)
  assert.deepEqual([...texture.image.data], [255, 55, 0, 255], 'async replacement must also be decoded')
  const modern = fixture()
  const image = texture.image
  modern.api.prepareSurfaceColorTexture(texture)
  assert.equal(texture.image, image, 'WebGL2 retains the GPU sRGB path')
  assert.equal(texture.encoding, modern.get('THREE.sRGBEncoding'))
})
