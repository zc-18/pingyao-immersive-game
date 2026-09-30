import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { T, loadCharacter, measureEnvelopes } from '../scripts/measure-character-envelope.mjs'

const source=fs.readFileSync(new URL('../src/pages_game/street/street.vue',import.meta.url),'utf8')
function harness() {
  const context=vm.createContext({engine:T,console})
  const render=fs.readFileSync(new URL('../src/pages_game/street/street-renderer.js', import.meta.url), 'utf8')
  vm.runInContext(render.replace('export default','const component =')+'\nTHREE=engine; this.api=component.methods; this.radii=CHARACTER_COLLISION_RADIUS;',context)
  return {context,api:context.api,radii:context.radii}
}

test('collision radii contain every skinned vertex throughout player and pedestrian clips',async()=>{
  const {radii}=harness()
  const model=await loadCharacter(), envelopes=measureEnvelopes(model,120)
  for(const name of ['Idle','Walking_A','Running_A','Interact']) {
    assert.ok(envelopes[name].radius+.025<radii.player,`${name}: ${envelopes[name].radius} exceeds player clearance`)
  }
  for(const name of ['Idle','Walking_A']) assert.ok(envelopes[name].radius+.025<radii.pedestrian,`${name}: sleeves exceed pedestrian collider`)
  const boots=model.scene.getObjectByName('Detail_Shoes').geometry
  boots.computeBoundingBox()
  const size=boots.boundingBox.getSize(new T.Vector3())
  assert.ok(size.y<.25,'adult boots must not inherit exaggerated leg stretch')
  assert.ok(size.z<.30,'foot length remains proportionate to the adult rig')
})

test('a pedestrian cannot walk through another pedestrian or player',()=>{
  const {context,api,radii}=harness()
  vm.runInContext(`player=new THREE.Object3D(); player.position.set(0,0,0); player.userData.collisionRadius=${radii.player};
    ambientActors=[new THREE.Object3D(),new THREE.Object3D()];
    ambientActors.forEach((a,i)=>{a.userData={kind:'rigged-pedestrian',collisionRadius:${radii.pedestrian}};a.position.set(0,0,2+i*2)});
    this.first=ambientActors[0];this.second=ambientActors[1];`,context)
  api.resolveStreetMotion(context.first.position,0,-6,radii.pedestrian)
  assert.ok(context.first.position.z>=radii.player+radii.pedestrian-.0001)
  api.resolveStreetMotion(context.second.position,0,-6,radii.pedestrian)
  assert.ok(context.second.position.distanceTo(context.first.position)>=2*radii.pedestrian-.0001)
})

test('neighbor avoidance cannot push a clear player through a wall',()=>{
  const {context,api,radii}=harness()
  vm.runInContext(`worldColliders=[new THREE.Box3(new THREE.Vector3(-3,-1,-5),new THREE.Vector3(0,3,5))];
    player=new THREE.Object3D();player.position.set(1,0,3);player.userData.collisionRadius=${radii.player};
    ambientActors=[new THREE.Object3D()];ambientActors[0].position.set(1.2,0,0);ambientActors[0].userData={kind:'rigged-pedestrian',collisionRadius:${radii.pedestrian}};
    this.p=player;this.npc=ambientActors[0];`,context)
  for(let i=0;i<200;i++) {
    api.resolveStreetMotion(context.p.position,0,-.04,radii.player)
    assert.ok(context.p.position.x>=radii.player-.0001)
    assert.ok(context.p.position.distanceTo(context.npc.position)>=radii.player+radii.pedestrian-.0001)
  }
})
