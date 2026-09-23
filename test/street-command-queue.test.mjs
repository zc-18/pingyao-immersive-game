import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

test('reward dismissal cannot overwrite a scene load in the same Vue flush', async () => {
  const source=fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue',import.meta.url),'utf8')
  const start=source.indexOf('const renderCommandQueue = []')
  const end=source.indexOf('function handleRenderMsg',start)
  const observed=[],sceneCmd={value:null}
  const context=vm.createContext({sceneCmd,Date,nextTick:async()=>{await Promise.resolve();observed.push(sceneCmd.value.action)}})
  vm.runInContext(source.slice(start,end)+'\nthis.send=sendToRenderjs;',context)
  await Promise.all([context.send('loadScene',{scene:'south-avenue'}),context.send('blockInput',{blocked:false}),context.send('highlightPoi',{poiId:'county-office'})])
  assert.deepEqual(observed,['loadScene','blockInput','highlightPoi'])
})
