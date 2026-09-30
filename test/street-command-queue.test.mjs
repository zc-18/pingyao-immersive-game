import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { getLevelMeta } from '../src/common/utils/level.js'

test('reward dismissal cannot overwrite a scene load in the same Vue flush', async () => {
  const source=fs.readFileSync(new URL('../src/pages_game/street/street.vue',import.meta.url),'utf8')
  const start=source.indexOf('const renderCommandQueue = []')
  const end=source.indexOf('function handleRenderMsg',start)
  const observed=[]
  const context=vm.createContext({rendererMounted:false,streetRenderer:{methods:{onSceneCmd:cmd=>observed.push(cmd.action)}}})
  vm.runInContext(source.slice(start,end)+'\nthis.send=sendToRenderer;this.flush=flushRenderCommands;',context)
  context.send('loadScene',{scene:'south-avenue'})
  context.send('blockInput',{blocked:false})
  context.send('highlightPoi',{poiId:'county-office'})
  assert.deepEqual(observed,[],'mount前不丢命令也不访问容器')
  context.rendererMounted=true;context.flush()
  assert.deepEqual(observed,['loadScene','blockInput','highlightPoi'])
  context.flush();assert.equal(observed.length,3,'每条命令只投递一次')
})

test('micro rewards and achievement experience share the pre-reward level and never replay feedback', () => {
  const source=fs.readFileSync(new URL('../src/pages_game/street/street.vue',import.meta.url),'utf8')
  const notices=[],sounds=[],timers=new Map()
  let saved={exp:610}, unlock=true, id=0
  const context=vm.createContext({
    getLevelMeta,userProgress:{value:{exp:590}},showLevelUp:{value:false},levelUpData:{value:{}},plaqueFlipping:{value:false},floatingText:{value:{visible:false}},
    STORAGE_KEYS:{userProgress:'progress'},getStorage:()=>({...saved}),
    syncAchievementUnlocks(){if(!unlock)return {newlyUnlocked:[]};unlock=false;saved.exp+=24;return {newlyUnlocked:[{name:'初识古城'}]}},
    showToast:notice=>notices.push(notice),playSFX:sound=>sounds.push(sound),SFX:{ACHIEVEMENT:'achievement',LEVEL_UP:'level'},
    setTimeout(fn){timers.set(++id,fn);return id},clearTimeout(key){timers.delete(key)}
  })
  vm.runInContext(source.slice(source.indexOf('let levelUpTimer ='),source.indexOf('function clearLoadWatchdog'))+';this.refresh=refreshProgressFeedback;this.clear=clearFeedbackTimers;',context)
  context.refresh()
  assert.equal(context.levelUpData.value.oldLevel,1)
  assert.equal(context.levelUpData.value.newLevel,2)
  assert.equal(context.userProgress.value.exp,634)
  assert.equal(notices.length,1)
  assert.deepEqual(sounds,['achievement','level'])
  context.refresh();assert.equal(notices.length,1);assert.equal(sounds.length,2)
  context.clear();assert.equal(timers.size,0);assert.equal(context.showLevelUp.value,false)
  saved={exp:1610};context.refresh()
  assert.equal(context.levelUpData.value.oldLevel,2)
  assert.equal(context.levelUpData.value.newLevel,3)
})
