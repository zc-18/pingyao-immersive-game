import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source=fs.readFileSync(new URL('../src/pages_game/street/street.vue',import.meta.url),'utf8')

function fixture() {
  let clock=0,id=0
  const timers=new Map(),commands=[],events=[]
  const state=Object.fromEntries(['isLoading','loadFailed','showEscape','loadProgress','loadStage','loadHint','activePoiId','nearActivePoiId','scenePulseText','npcVisible','npcAutoHide','npcMessage'].map(k=>[k,{value:k==='isLoading'}]))
  const context=vm.createContext({...state,console:{warn(){}},watch(){},
    currentStreet:{value:{id:'bank-house'}},currentPhase:{value:{key:'noon'}},userProfile:{value:{roleId:'study'}},trackedQuest:{value:{id:'main-rishengchang'}},
    setTimeout(fn,ms){const key=++id;timers.set(key,{at:clock+ms,fn});return key},clearTimeout(key){timers.delete(key)},
    sendToRenderer(action,data){commands.push({action,data})},buildScenePayload(){return {streetData:{id:context.currentStreet.value.id}}},
    EVENT_TYPES:{sceneLoaded:'scene_loaded'},advanceQuestByEvent(type,data){events.push({type,data});return {updated:false}},
    refreshRuntimeState(){},markStreetSceneVisited(){},announceMicroReward(){},handleQuestComplete(){},getContextualNpcCue(){return '院落已开'},
    switchTab(data){commands.push({action:'return',data})}
  })
  vm.runInContext(`let renderCommandDisposed=false,renderViewReady=false,lastSceneCmdPayload=null,lastSceneCmdAction='init',
    loadWatchdog=null,entryEscapeTimer=null,entryFailsafeTimer=null,initAttempts=0,sceneRequestId=0,completedSceneRequestId=0;
    const MAX_INIT_ATTEMPTS=2,LOAD_TIMEOUT=10000,ENTRY_ESCAPE_DELAY=5000,ENTRY_FAILSAFE_TIMEOUT=25000;
    ${source.slice(source.indexOf('function handleRenderMsg'),source.indexOf('function refreshRuntimeState'))}
    ${source.slice(source.indexOf('function clearLoadWatchdog'),source.indexOf('function applyPhaseToScene'))}
    this.api={initScene,loadCurrentScene,retryScene,returnToCity,handleRenderMsg,armEntryFailsafe};`,context)
  const advance=ms=>{
    const end=clock+ms
    while(true){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}
    clock=end
  }
  const emit=(type,data)=>context.api.handleRenderMsg({detail:{type,data}})
  const request=()=>{const c=commands.findLast(c=>c.data?.requestId);return {requestId:c.data.requestId,sceneId:c.data.streetData.id}}
  return {state,context,api:context.api,commands,events,advance,emit,request,timers}
}

test('timeouts retain an actionable loading screen and bound automatic retries',()=>{
  const f=fixture();f.api.initScene();f.advance(5000)
  assert.equal(f.state.showEscape.value,true)
  f.advance(16000)
  assert.equal(f.commands.length,2)
  assert.equal(f.commands[1].action,'reinit')
  assert.equal(f.state.isLoading.value,true)
  assert.equal(f.state.loadFailed.value,true)
  assert.equal(f.timers.size,0)
  f.advance(60000)
  assert.equal(f.commands.length,2)
  assert.equal(f.events.length,0)
})

test('a failed load is not dismissed by its old failsafe, and a retry ignores stale callbacks',()=>{
  const f=fixture();f.api.initScene();const old=f.request()
  f.emit('render-error',{...old,error:'missing library'});f.advance(30000)
  assert.equal(f.state.isLoading.value,true)
  assert.equal(f.state.loadFailed.value,true)
  f.api.retryScene();const current=f.request()
  f.api.retryScene()
  assert.equal(f.commands.length,2,'double taps cannot issue overlapping retries')
  f.emit('render-ready',old);f.emit('render-error',{...old,error:'late reject'})
  assert.equal(f.state.isLoading.value,true)
  assert.equal(f.state.loadFailed.value,false)
  assert.equal(f.events.length,0)
  f.emit('render-ready',current)
  assert.equal(f.state.isLoading.value,false)
  assert.equal(f.events.length,1)
  f.emit('render-error',{...current,contextLost:true,error:'context lost'})
  assert.equal(f.state.isLoading.value,true)
  f.emit('render-ready',current)
  assert.equal(f.state.isLoading.value,false)
  assert.equal(f.events.length,1,'context restore cannot replay scene arrival')
})

test('switch dispatch and wrong-scene replies cannot advance arrival objectives',()=>{
  const f=fixture();f.context.currentStreet.value.id='south-avenue';f.api.loadCurrentScene()
  const current=f.request()
  assert.equal(f.events.length,0)
  f.emit('render-ready',{...current,sceneId:'bank-house'})
  assert.equal(f.state.isLoading.value,true)
  assert.equal(f.events.length,0)
  f.emit('render-ready',current)
  assert.equal(f.events.length,1)
  assert.equal(f.events[0].data.sceneId,'south-avenue')
})

test('the independent failsafe provides an exit when no init command was issued',()=>{
  const f=fixture();f.api.armEntryFailsafe();f.advance(26000)
  assert.equal(f.state.loadFailed.value,true)
  f.api.returnToCity()
  assert.equal(f.commands.at(-1).data.url,'/home')
  assert.equal(f.timers.size,0)
  assert.equal(f.events.length,0)
})

test('an obsolete asynchronous boot failure cannot interrupt a newer scene',async()=>{
  const sent=[],pending=[]
  const context=vm.createContext({window:{},console,Promise})
  const render=fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  vm.runInContext(render.replace('export default','const component =')+';this.api=component.methods;',context)
  context.callback=msg=>sent.push(msg.detail)
  vm.runInContext('messageCallback=callback',context)
  context.api.loadScript=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))
  const first=context.api.bootScene({requestId:1,streetData:{id:'bank-house'}})
  const second=context.api.bootScene({requestId:2,streetData:{id:'south-avenue'}})
  pending[0].reject(new Error('old failure'));await first
  assert.equal(sent.filter(e=>e.type==='render-error').length,0)
  pending[1].reject(new Error('current failure'));await second
  const error=sent.find(e=>e.type==='render-error')
  assert.equal(error.data.requestId,2)
  assert.equal(error.data.sceneId,'south-avenue')
})

test('a registered loader wins over a delayed onload timeout; a missing loader still fails and can retry', async () => {
  const scripts=[],timers=[],registered={}
  let removed=0
  const context=vm.createContext({window:{THREE:registered},console,Promise,URL,
    document:{baseURI:'http://localhost:5219/',createElement:()=>({remove(){removed++}}),head:{appendChild(script){scripts.push(script)}}},
    setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){}})
  const render=fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js',import.meta.url),'utf8')
  vm.runInContext(render.replace('export default','const component =')+';this.api=component.methods;',context)
  const pending=context.api.loadScript('static/libs/GLTFLoader.js')
  registered.GLTFLoader=class {}
  timers.at(-1)();await pending
  assert.equal(removed,0)
  scripts[0].onload()
  await context.api.loadScript('static/libs/GLTFLoader.js')
  assert.equal(scripts.length,1,'registered plugins are not injected again')
  const missing=context.api.loadScript('static/libs/SkeletonUtils.js')
  const rejected=assert.rejects(missing,/加载超时/)
  timers.at(-1)();await rejected
  assert.equal(removed,1)
  const retry=context.api.loadScript('static/libs/SkeletonUtils.js')
  registered.SkeletonUtils={clone(){}}
  scripts.at(-1).onload();await retry
  assert.equal(scripts.length,3,'a failed loader does not poison the pending-load cache')
})

test('the warm boot loads model plugins before expensive scene construction and keeps fallback available',async()=>{
  const events=[],engine={EffectComposer(){},RenderPass(){},UnrealBloomPass(){}}
  const context=vm.createContext({window:{THREE:engine},console,Promise})
  const render=fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js',import.meta.url),'utf8')
  vm.runInContext(render.replace('export default','const component =')+';this.api=component.methods;',context)
  context.api.loadScript=async src=>{events.push(src);if(src.includes('GLTFLoader'))throw Error('offline')}
  context.api.loadCalligraphyFont=async()=>events.push('font')
  context.api.initScene=()=>events.push('scene')
  await context.api.bootScene({requestId:1,streetData:{id:'bank-house'}})
  assert.deepEqual(events,['static/libs/GLTFLoader.js','static/libs/SkeletonUtils.js','font','scene'])
})
