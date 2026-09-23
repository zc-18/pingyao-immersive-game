import test, { beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { STORAGE_KEYS as K, ensureStorageDefaults, getStorage, patchStorageObject } from '../src/平遥古城沉浸式游戏/common/utils/storage.js'
import { getGameplaySettings, updateGameplaySetting } from '../src/平遥古城沉浸式游戏/common/utils/game-settings.js'

const memory = new Map()
let failed = false
globalThis.uni = {
  getStorageSync: key => structuredClone(memory.get(key) ?? ''),
  setStorageSync(key,value) { if (failed) throw Error('settings write failure'); memory.set(key,structuredClone(value)) }
}
beforeEach(() => { failed=false;memory.clear();ensureStorageDefaults() })
after(() => { delete globalThis.uni })

test('settings persist through the shared API without changing unrelated preferences', () => {
  patchStorageObject(K.gameSettings,{preferredOrientation:'portrait'})
  assert.deepEqual(getGameplaySettings(),{enableMusic:true,enableEffect:true})
  assert.equal(updateGameplaySetting('enableMusic',false).ok,true)
  assert.equal(updateGameplaySetting('enableEffect',false).ok,true)
  assert.deepEqual(getGameplaySettings(),{enableMusic:false,enableEffect:false})
  assert.equal(getStorage(K.gameSettings).preferredOrientation,'portrait')
  assert.equal(updateGameplaySetting('enableEffect',true).settings.enableEffect,true)
})

test('failed or invalid settings return the persisted state instead of optimistic success', () => {
  failed=true
  const result=updateGameplaySetting('enableMusic',false)
  assert.equal(result.ok,false)
  assert.equal(result.settings.enableMusic,true)
  assert.equal(getGameplaySettings().enableMusic,true)
  failed=false
  assert.equal(updateGameplaySetting('preferredOrientation',false).ok,false)
  assert.equal(updateGameplaySetting('enableEffect','false').ok,false)
  assert.equal(getGameplaySettings().enableEffect,true)
})

function renderFixture() {
  const live=new Set(), created=[]
  let failAt=''
  function resource(name) {
    if(failAt===name)throw Error('unsupported '+name)
    const value={name,dispose(){assert.ok(live.delete(value),'resource released twice: '+name)}}
    live.add(value);created.push(value);return value
  }
  class Vector { constructor(x=0,y=0){this.set(x,y)} set(x,y){this.x=x;this.y=y;return this} }
  const T={Vector2:Vector,Vector3:Vector,
    WebGLRenderTarget:class {constructor(){return resource('target')}},
    EffectComposer:class {constructor(renderer,target){const r=resource('composer'),release=r.dispose;r.addPass=()=>{};r.removePass=()=>{};r.insertPass=()=>{};r.setPixelRatio=()=>{};r.dispose=()=>{target?.dispose();release()};return r}},
    RenderPass:class {},
    UnrealBloomPass:class {constructor(){return Object.assign(resource('bloom'),{setSize(){}})}},
    ShaderPass:class {constructor(shader){return Object.assign(resource('grade'),{material:{},uniforms:shader.uniforms})}}
  }
  const source=fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue',import.meta.url),'utf8')
  const render=source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  const context=vm.createContext({engine:T,console:{warn(){}},rendererFixture:{getSize:v=>v.set(844,390),capabilities:{isWebGL2:true},extensions:{has:()=>false}}})
  vm.runInContext(render.replace('export default','const component=')+';THREE=engine;this.api=component.methods;',context)
  const mount=()=>vm.runInContext('renderer=rendererFixture;scene={};camera={};player={id:17};activeRenderRequest={requestId:8};',context)
  return {api:context.api,context,live,created,mount,fail(name){failAt=name}}
}

test('live glow toggle releases bloom while retaining the color/AA pipeline and player', () => {
  const f=renderFixture();f.mount()
  for(let i=0;i<5;i++) {
    f.api.setEffectsEnabled(true)
    assert.equal(f.live.size,4)
    const count=f.created.length
    f.api.setEffectsEnabled(true)
    assert.equal(f.created.length,count,'repeated state does not allocate a second composer')
    f.api.setEffectsEnabled(false);f.api.setEffectsEnabled(false)
    assert.equal(f.live.size,3,'base target, composer and output pass retain the same scene programs')
  }
  assert.equal(vm.runInContext('player.id',f.context),17)
  assert.equal(vm.runInContext('activeRenderRequest.requestId',f.context),8)
  f.api.disposeEffects();assert.equal(f.live.size,0,'leaving the renderer releases the base pipeline as well')
})

test('settings arriving before WebGL init remain safe and initialize when a renderer is ready', () => {
  const f=renderFixture()
  f.api.setEffectsEnabled(false);f.api.setEffectsEnabled(true)
  assert.equal(f.live.size,0)
  f.mount();f.api.setEffectsEnabled(true)
  assert.equal(f.live.size,4)
  f.api.disposeEffects();f.api.disposeEffects()
  assert.equal(f.live.size,0)
})

test('partial postprocessing failures release their target and passes and allow a later retry', () => {
  for(const failure of ['composer','bloom','grade']) {
    const f=renderFixture();f.mount();f.fail(failure)
    f.api.setEffectsEnabled(true)
    assert.equal(f.live.size,0,failure)
    assert.equal(vm.runInContext('composer',f.context),null)
    f.fail('');f.api.setEffectsEnabled(true)
    assert.equal(f.live.size,4)
    f.api.disposeEffects();assert.equal(f.live.size,0)
  }
})

test('a failed glow re-enable releases its base resources and can recover on retry', () => {
  const f=renderFixture();f.mount();f.api.setEffectsEnabled(false)
  assert.equal(f.live.size,3)
  f.fail('bloom');f.api.setEffectsEnabled(true)
  assert.equal(f.live.size,0)
  assert.equal(vm.runInContext('composer',f.context),null)
  f.fail('');f.api.setEffectsEnabled(true)
  assert.equal(f.live.size,4)
  f.api.disposeEffects();assert.equal(f.live.size,0)
})
