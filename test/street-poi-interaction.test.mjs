import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source=fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue',import.meta.url),'utf8')
function fixture() {
  const ref=value=>({value}), computed=read=>({get value(){return read()}})
  const flags=Object.fromEntries(['isLoading','wardrobeOpen','settingsOpen','showRewardPopup','showEntranceAnim','sceneControlOpen','npcVisible','npcAutoHide'].map(key=>[key,ref(false)]))
  const points=[{id:'rishengchang',name:'日升昌',npcTopic:'汇通天下',type:'bank'},{id:'other',name:'另一个点位'}]
  const activePoiId=ref(''),nearActivePoiId=ref(''),poiProgressFailure=ref(null),events=[]
  const f={events,result:{updated:false},visitSaved:{},activePoiId,nearActivePoiId,poiProgressFailure,...flags}
  const activePoi=computed(()=>points.find(p=>p.id===activePoiId.value)),nearbyPoi=computed(()=>points.find(p=>p.id===nearActivePoiId.value))
  const context=vm.createContext({...flags,activePoiId,nearActivePoiId,poiProgressFailure,activePoi,nearbyPoi,computed,
    poiProgressError:computed(()=>Boolean(activePoiId.value&&poiProgressFailure.value?.poiId===activePoiId.value)),
    streetPois:ref(points),userProgress:ref({}),userProfile:ref({roleId:'study'}),currentStreet:ref({id:'bank-house'}),currentPhase:ref({key:'noon'}),trackedQuest:ref({id:'main-rishengchang'}),
    floatingText:ref({visible:false,text:''}),scenePulseText:ref(''),npcMessage:ref(''),
    getStorage:()=>({}),STORAGE_KEYS:{userProgress:'progress'},setCurrentPoi:id=>events.push(['runtime',id]),
    markPoiVisited:id=>{events.push(['visit',id]);return f.visitSaved},advanceQuestByEvent:(type,payload)=>{events.push(['quest',type,payload]);return f.result},
    syncAchievementUnlocks:()=>({newlyUnlocked:[]}),refreshRuntimeState:()=>events.push(['refresh']),
    getContextualNpcCue:()=>'',getQuestNpcHint:()=>'',markNpcTalk:topic=>events.push(['talk',topic]),
    playSFX:type=>events.push(['sound',type]),SFX:{NPC_TALK:'talk'},announceMicroReward:reward=>events.push(['reward',reward]),
    showFloatingText:text=>events.push(['floating',text]),handleQuestComplete:id=>events.push(['complete',id]),uni:{showToast:message=>events.push(['toast',message])},
    EVENT_TYPES:{poiEntered:'poi_entered',npcDialogCompleted:'npc_dialog_completed',buildingInteracted:'building_interacted'}
  })
  vm.runInContext(`${source.slice(source.indexOf('const interactionCard ='),source.indexOf('/* 逻辑层与 renderjs 共用'))}
    ${source.slice(source.indexOf('function handlePoiEnter'),source.indexOf('function handleQuestComplete'))}
    ${source.slice(source.indexOf('function closePoi'),source.indexOf('/* 收藏当前 POI'))}
    this.api={openNearbyPoi,closePoi,handlePoiEnter,handlePoiLeave,playPoiTopic,handleSceneInteraction,retryPoiProgress};this.card=interactionCard;`,context)
  return {...f,context,api:context.api,card:context.card,setResult:result=>{f.result=result},setVisit:value=>{f.visitSaved=value}}
}

test('nearby point can reopen without movement or replaying visit/reward events, gated by overlays',()=>{
  const f=fixture();f.nearActivePoiId.value='rishengchang'
  assert.equal(f.card.value.label,'查看日升昌')
  for(const key of ['isLoading','wardrobeOpen','settingsOpen','showRewardPopup','showEntranceAnim','sceneControlOpen']) {
    f[key].value=true;f.api.openNearbyPoi();assert.equal(f.activePoiId.value,'');f[key].value=false
  }
  f.api.openNearbyPoi();assert.equal(f.activePoiId.value,'rishengchang');assert.equal(f.card.value,null)
  f.api.closePoi();assert.equal(f.nearActivePoiId.value,'rishengchang');assert.ok(f.card.value)
  f.api.openNearbyPoi()
  assert.deepEqual(f.events.map(e=>e[0]),['runtime','runtime'])
  f.api.closePoi();f.nearActivePoiId.value='foreign-scene-point';f.api.openNearbyPoi();assert.equal(f.activePoiId.value,'')
})

test('leaving one point cannot erase the currently nearby different point',()=>{
  const f=fixture();f.nearActivePoiId.value='other'
  f.api.handlePoiLeave('rishengchang');assert.equal(f.nearActivePoiId.value,'other')
  f.api.handlePoiLeave('other');assert.equal(f.nearActivePoiId.value,'');assert.equal(f.card.value,null)
})

test('failed arrival can be retried from the same open point with no false completion',()=>{
  const f=fixture();f.setVisit(null);f.api.handlePoiEnter('rishengchang')
  assert.equal(f.poiProgressFailure.value.action,'visit')
  assert.equal(f.events.filter(e=>e[0]==='quest').length,0)
  f.setVisit({});f.setResult({updated:true,microReward:{silverKey:5}});f.api.retryPoiProgress()
  assert.equal(f.poiProgressFailure.value,null)
  assert.equal(f.events.filter(e=>e[0]==='reward').length,1)
  assert.equal(f.events.find(e=>e[0]==='quest')[1],'poi_entered')
})

test('talk and clue write failures keep their retry action and emit no success feedback',()=>{
  for(const [method,action,event] of [['playPoiTopic','talk','npc_dialog_completed'],['handleSceneInteraction','explore','building_interacted']]) {
    const f=fixture();f.activePoiId.value='rishengchang';f.nearActivePoiId.value='rishengchang'
    f.setResult({error:'storage',stageLine:'This text must not be announced',completed:false})
    f.api[method]()
    assert.equal(f.poiProgressFailure.value.action,action)
    assert.ok(!f.events.some(e=>['talk','sound','floating','reward','complete'].includes(e[0])))
    f.api.closePoi();f.api.openNearbyPoi();assert.equal(f.poiProgressFailure.value.action,action)
    f.setResult({updated:true,completed:false,objectiveCompleted:true,microReward:{silverKey:5}})
    f.api.retryPoiProgress()
    assert.equal(f.poiProgressFailure.value,null)
    assert.equal(f.events.filter(e=>e[0]==='quest').at(-1)[1],event)
    assert.equal(f.events.filter(e=>e[0]==='reward').length,1)
  }
})
