import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T, loadCharacter } from '../scripts/measure-character-envelope.mjs'

const source = fs.readFileSync(new URL('../src/平遥古城沉浸式游戏/pages_game/street/street.vue', import.meta.url), 'utf8')
async function fixture() {
  const context = vm.createContext({ engine:T, console })
  const script = source.match(/<script module="render" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  vm.runInContext(script.replace('export default','const component =')+'\nTHREE=engine;this.api=component.methods;this.gait=HUMAN_GAIT_SPEED;', context)
  const {scene:root, animations} = await loadCharacter('pingyao-hanfu-human.glb')
  const mixer = new T.AnimationMixer(root), actions = {}
  for (const [key,name] of Object.entries({idle:'Idle',walk:'Walking_A',run:'Running_A',wave:'Interact'})) {
    actions[key] = mixer.clipAction(animations.find(a=>a.name===name)).play().setEffectiveWeight(key==='idle'?1:0)
  }
  root.userData = {rigType:'human',isGltf:true,mixer,actions,gait:context.gait,collisionRadius:.96}
  root.position.y=.08
  context.api.getTexture=()=>new T.Texture()
  context.api.applyHumanSkin(root,{sleeve:'formal',silhouette:'scholar'})
  context.api.prepareCharacterDeformation(root)
  context.subject=root
  vm.runInContext('player=subject',context)
  return {root,actions,api:context.api}
}

test('human rig exposes two grounded feet and independent costume variants', async()=>{
  const {root,api}=await fixture()
  assert.equal(root.userData.footPlant.feet.length,2)
  assert.ok(root.userData.groundSamples.length>100)
  api.applyHumanSkin(root,{sleeve:'wide',silhouette:'merchant',headwear:'merchant-cap',accessory:'ledger'})
  for(const [name,visible] of Object.entries({sl_wide:true,sl_narrow:false,sl_formal:false,ol_long:true,ol_short:false})) {
    assert.equal(root.getObjectByName(name).visible,visible,name)
  }
  assert.equal(root.getObjectByName('hw_merchant-cap').visible,true)
  api.applyHumanSkin(root,{sleeve:'narrow',silhouette:'traveler'})
  assert.equal(root.getObjectByName('ol_short').visible,true)
  assert.equal(root.getObjectByName('ol_long').visible,false)
})

test('human walk/run/stop transitions keep finite poses, planted soles and bounded cloth', async()=>{
  const {root,actions,api}=await fixture(), point=new T.Vector3()
  let minFloor=Infinity,maxWalkFloor=-Infinity,maxRadius=0,maxFrameDrop=0,previousY=root.position.y,extreme=''
  const planted={walk:0,run:0}
  for(let frame=0;frame<480;frame++) {
    const speed=frame<150?1.6:frame<330?4.4:0
    root.position.z+=speed/60
    api.updatePlayerMixer(speed,speed>0,1/60)
    if(speed) planted[frame<150?'walk':'run']+=root.userData.footPlant.feet.filter(f=>f.weight>.5).length
    assert.ok(Math.abs(actions.walk.time/actions.walk.getClip().duration-actions.run.time/actions.run.getClip().duration)<1e-6)
    root.updateMatrixWorld(true)
    root.userData.groundSkeletons.forEach(s=>s.update())
    let floor=Infinity
    for(const {mesh,index} of root.userData.groundSamples) {
      point.fromBufferAttribute(mesh.geometry.attributes.position,index)
      mesh.boneTransform(index,point).applyMatrix4(mesh.matrixWorld)
      assert.ok(point.toArray().every(Number.isFinite))
      floor=Math.min(floor,point.y)
    }
    minFloor=Math.min(minFloor,floor)
    if(frame<150) maxWalkFloor=Math.max(maxWalkFloor,floor)
    maxFrameDrop=Math.max(maxFrameDrop,Math.abs(root.position.y-previousY));previousY=root.position.y
    if(frame%12===0) root.traverseVisible(mesh=>{
      if(!mesh.isSkinnedMesh)return
      mesh.skeleton.update()
      for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
        point.fromBufferAttribute(mesh.geometry.attributes.position,i)
        mesh.boneTransform(i,point).applyMatrix4(mesh.matrixWorld)
        const radius=Math.hypot(point.x-root.position.x,point.z-root.position.z)
        if(radius>maxRadius) {maxRadius=radius;extreme=mesh.name+' frame '+frame}
      }
    })
  }
  assert.ok(minFloor>.068,`sole below paving: ${minFloor}`)
  assert.ok(maxWalkFloor<.11,`floating walk: ${maxWalkFloor}`)
  assert.ok(maxRadius<root.userData.collisionRadius,`cloth escapes collider: ${maxRadius} ${extreme}`)
  assert.ok(maxFrameDrop<.09,`root height snaps: ${maxFrameDrop}`)
  assert.ok(actions.idle.getEffectiveWeight()>.99)
  assert.ok(planted.walk>20 && planted.run>5,`both clips must have working contact windows: ${JSON.stringify(planted)}`)
})
