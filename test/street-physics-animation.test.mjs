import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { buildStreetWorldLayout } from '../src/common/utils/street-world.js'
import streets from '../src/common/data/streets.js'

const app = new URL('../src/', import.meta.url)
const source = fs.readFileSync(new URL('pages_game/street/street.vue', app), 'utf8')
function harness() {
  const engine = vm.createContext({ console: { warn() {} } })
  vm.runInContext(fs.readFileSync(new URL('../public/static/libs/three.min.js', app), 'utf8'), engine)
  const context = vm.createContext({ engine: engine.THREE, console })
  const render = fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  vm.runInContext(render.replace('export default', 'const component =') + '\nTHREE = engine; scene = new THREE.Scene(); this.api = component.methods;', context)
  return { context, api: context.api, T: engine.THREE }
}

test('swept character motion blocks a thin obstacle even with a large delta', () => {
  const { context, api, T } = harness()
  vm.runInContext('worldColliders = [new THREE.Box3(new THREE.Vector3(-1,-1,-.08), new THREE.Vector3(1,3,.08))]', context)
  const p = new T.Vector3(0, 0, 3)
  api.resolveStreetMotion(p, 0, -8, .43)
  assert.ok(p.z >= .51 && p.z < .53)
  api.resolveStreetMotion(p, 1.7, -1, .43)
  assert.ok(p.x > 1.5, 'character must slide along the obstacle')
  assert.ok(p.z < .52, 'character can round the corner')
})

test('character recovers from an overlap and respects road edges', () => {
  const { context, api, T } = harness()
  vm.runInContext('worldColliders = [new THREE.Box3(new THREE.Vector3(-.4,-1,-.4), new THREE.Vector3(.4,3,.4))]', context)
  const p = new T.Vector3(.1,0,0)
  api.resolveStreetMotion(p,0,0,.43)
  assert.ok(p.x > .83)
  api.resolveStreetMotion(p,100,0,.43)
  assert.equal(p.x,4.15)
})

test('camera boom retracts before solid geometry', () => {
  const { context, api, T } = harness()
  vm.runInContext('cameraProbe = new THREE.Ray(); cameraProbeDirection = new THREE.Vector3(); cameraOccluders = [new THREE.Box3(new THREE.Vector3(-2,0,2),new THREE.Vector3(2,5,3))]',context)
  const end = new T.Vector3(0,2,7)
  api.resolveCameraBoom(new T.Vector3(0,1.35,0),end)
  assert.ok(end.z < 2)
  assert.ok(end.z > 1.5)
})

test('interaction animation survives idle frames and movement cancels it', () => {
  const { context, api, T } = harness()
  const root = new T.Object3D(), mixer = new T.AnimationMixer(root)
  const actions = Object.fromEntries(['idle','walk','run','wave'].map(name => [name,mixer.clipAction(new T.AnimationClip(name,2,[])).play().setEffectiveWeight(name === 'idle' ? 1 : 0)]))
  root.userData = { isGltf:true,mixer,actions }
  context.subject = root
  vm.runInContext('player = subject',context)
  api.playPlayerWave()
  for(let i=0;i<20;i++) api.updatePlayerMixer(0,false,1/60)
  assert.ok(root.userData.gestureTime > 1.6)
  assert.ok(actions.wave.getEffectiveWeight() > .9)
  for(let i=0;i<30;i++) api.updatePlayerMixer(2.2,true,1/60)
  assert.equal(root.userData.gestureTime,0)
  assert.ok(actions.walk.getEffectiveWeight() > .9)
  assert.ok(actions.wave.getEffectiveWeight() < .01)
})

test('all streets retain a clear central path and reachable POI approach zones', () => {
  for(const street of streets) {
    const layout=buildStreetWorldLayout(street,street.buildings.filter(b=>b.poiId).map(b=>({id:b.poiId,status:'quest'})))
    assert.ok(layout.facades.every(f=>Math.abs(f.x)-f.depth/2 > 4))
    for(const poi of layout.pois) assert.ok(Math.abs(poi.x)-poi.trigger.interactionRadius < layout.roadBounds.xMax - .7, `${street.id}/${poi.id}`)
  }
})

test('scene reconstruction restores controls without retaining a previous page input lock', () => {
  const { context, api } = harness()
  api.restoreSceneControls({ blocked:true, running:true, portrait:true })
  assert.equal(vm.runInContext('inputBlocked && runningEnabled && portraitCamera && cameraDistance === 3.2',context),true)
  api.restoreSceneControls()
  assert.equal(vm.runInContext('inputBlocked || runningEnabled || portraitCamera',context),false)
  assert.equal(vm.runInContext('joystickInput.dx + joystickInput.dy',context),0)
})

test('rendered courtyard walls block all four directions and leave galleries traversable', () => {
  for (const street of streets) {
    const {context,api,T}=harness()
    const layout=buildStreetWorldLayout(street,[])
    context.layout=layout
    vm.runInContext('currentWorldLayout=layout',context)
    for(const method of ['makeBrickTexture','makeRoofTexture','makeWoodTexture','makeStoneGroundTexture','makeSignTexture','getCourtyardTexture','getTexture']) api[method]=()=>new T.Texture()
    api.loadStoneMaterial=()=>{}
    api.createStreetEnvironment(street,layout)
    api.createBuildings(street,layout)
    api.buildStreetColliders()
    // Test the physical shell with the final road clamp disabled.
    vm.runInContext('currentWorldLayout={roadBounds:{xMin:-100,xMax:100,zMin:-100,zMax:100}}',context)
    for(const [dx,dz] of [[25,0],[-25,0],[0,48],[0,-48]]) {
      const position=new T.Vector3(0,.08,13)
      api.resolveStreetMotion(position,dx,dz,.79)
      assert.ok(position.x<layout.enclosure.xMax && position.x>layout.enclosure.xMin,street.id)
      assert.ok(position.z<layout.enclosure.zMax && position.z>layout.enclosure.zMin,street.id)
    }
    const center=new T.Vector3(0,.08,13)
    api.resolveStreetMotion(center,0,-35,.79)
    assert.ok(Math.abs(center.z+22)<.01,`${street.id}: galleries blocked center at ${center.toArray()}`)
    const cameraEnd=new T.Vector3(0,2,30)
    api.resolveCameraBoom(new T.Vector3(0,1.35,18),cameraEnd)
    assert.ok(cameraEnd.z<layout.enclosure.zMax,'camera must stay in front of the sealed gate')
  }
})

test('holding into a gatepost and road edge settles instead of accumulating collision jitter', (t) => {
  const {context,api,T}=harness(),street=streets[0],layout=buildStreetWorldLayout(street,[])
  context.layout=layout;vm.runInContext('currentWorldLayout=layout',context)
  for(const method of ['makeBrickTexture','makeRoofTexture','makeWoodTexture','makeStoneGroundTexture','makeSignTexture','getCourtyardTexture','getTexture']) api[method]=()=>new T.Texture()
  api.loadStoneMaterial=()=>{}
  api.createStreetEnvironment(street,layout);api.createBuildings(street,layout);api.buildStreetColliders()
  const position=new T.Vector3(0,.083,13)
  let vx=0,vz=0,lateDistance=0
  for(let i=0;i<1200;i++) {
    const dt=[1/60,1/55,1/65][i%3],response=1-Math.exp(-11*dt)
    vx+=(Math.sin(.2)*2.2-vx)*response;vz+=(Math.cos(.2)*2.2-vz)*response
    const x=position.x,z=position.z
    api.resolveStreetMotion(position,vx*dt,vz*dt,.79)
    if(position.x===layout.roadBounds.xMin||position.x===layout.roadBounds.xMax)vx=0
    if(position.z===layout.roadBounds.zMin||position.z===layout.roadBounds.zMax)vz=0
    if(i>=1000)lateDistance+=Math.hypot(position.x-x,position.z-z)
  }
  assert.ok(lateDistance<.025,`Blocked gate accumulated ${lateDistance} m at ${position.toArray()}`)
  t.diagnostic(`Final 200 frames of blocked movement: ${lateDistance} m`)
  const stoppedZ=position.z
  api.resolveStreetMotion(position,0,-1,.79)
  assert.ok(position.z<stoppedZ-.99,'the player must still be able to move away from contact')
})
