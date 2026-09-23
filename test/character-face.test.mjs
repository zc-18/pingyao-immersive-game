import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { T, loadCharacter } from '../scripts/measure-character-envelope.mjs'
import { footworkFixture } from '../scripts/measure-character-footwork.mjs'

function worldVertex(mesh, index, target) {
  const base=mesh.geometry.attributes.position, morph=mesh.geometry.morphAttributes.position?.[0]
  target.fromBufferAttribute(base,index)
  if(morph && mesh.morphTargetInfluences[0]) {
    const weight=mesh.morphTargetInfluences[0]
    target.x+=(morph.getX(index)-base.getX(index))*weight
    target.y+=(morph.getY(index)-base.getY(index))*weight
    target.z+=(morph.getZ(index)-base.getZ(index))*weight
  }
  return mesh.boneTransform(index,target).applyMatrix4(mesh.matrixWorld)
}

test('iris surfaces remain in front of the curved whites and disappear beneath the closing lids', async () => {
  const {root,api}=await footworkFixture(), point=new T.Vector3(), origin=new T.Vector3(), ray=new T.Raycaster()
  for(const closed of [false,true]) {
    api.updatePlayerMixer(0,false,closed?3.8:.3)
    root.updateMatrixWorld(true)
    const baked=[]
    root.traverse(mesh=>{
      if(!mesh.isSkinnedMesh || /^(hw_|acc_)/.test(mesh.name))return
      mesh.skeleton.update()
      const values=new Float32Array(mesh.geometry.attributes.position.count*3)
      for(let i=0;i<values.length/3;i++)worldVertex(mesh,i,point).toArray(values,i*3)
      const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(values,3))
      geometry.setIndex(mesh.geometry.index.clone())
      const proxy=new T.Mesh(geometry,new T.MeshBasicMaterial());proxy.name=mesh.material.name;proxy.updateMatrixWorld(true);baked.push(proxy)
    })
    const iris=root.getObjectByName('Irises')
    assert.ok(iris)
    if(closed) {
      assert.ok(iris.morphTargetInfluences[0]>.99)
      for(const prefix of ['Eyelids','Lashes'])assert.ok(root.userData.blinkMeshes.some(m=>m.name===prefix && m.morphTargetInfluences[0]>.99))
    }
    // Each iris has 25 angular samples x 5 radial rings. Sample four points
    // at 75% radius, beyond the pupils and glints and inside the eyelid rim.
    for(const side of [0,1])for(const column of [0,6,12,18]) {
      worldVertex(iris,side*125+3*25+column,point)
      origin.copy(point);origin.z+=.3;ray.set(origin,new T.Vector3(0,0,-1))
      const hit=ray.intersectObjects(baked)[0]
      assert.ok(hit)
      if(closed)assert.ok(['Skin','Hair'].includes(hit.object.name),`closed eye exposed ${hit.object.name}`)
      else assert.equal(hit.object.name,'Eye_iris','a white/skin surface cut into the iris')
    }
    for(const mesh of baked){mesh.geometry.dispose();mesh.material.dispose()}
  }
})

test('the real pedestrian update loop drives eyelids and cloth, with an offset from player blinking', async () => {
  const {root,api,actions,context}=await footworkFixture()
  Object.assign(root.userData,{kind:'rigged-pedestrian',action:actions.walk,idle:actions.idle,direction:1,startZ:0,range:2,speed:.72,collisionRadius:.56,expressionOffset:.73})
  vm.runInContext('ambientActors=[subject];player=null',context)
  let peakBlink=0,peakCloth=0,firstBlink=null
  for(let i=0;i<330;i++) {
    api.updateAmbientLife(i*1000/60,1/60)
    const blink=root.userData.blinkMeshes[0].morphTargetInfluences[0]
    peakBlink=Math.max(peakBlink,blink)
    peakCloth=Math.max(peakCloth,Math.abs(root.userData.clothMeshes[0].morphTargetInfluences[0]))
    if(blink>.1 && firstBlink===null)firstBlink=root.userData.mixer.time
  }
  assert.ok(peakBlink>.99 && peakCloth>.1)
  assert.ok(firstBlink>3.2 && firstBlink<3.5,'the actor uses its individual blink offset')
})

test('both lip surfaces face outward and stay above the face in every shipped animation', async () => {
  const gltf=await loadCharacter(), root=gltf.scene, mixer=new T.AnimationMixer(root)
  const lips=root.getObjectByName('Detail_Face_lip'), head=root.getObjectByName('head')
  const ray=new T.Raycaster(), point=new T.Vector3(), outward=new T.Vector3(), rotation=new T.Quaternion()
  assert.ok(lips && head)
  const proxies=[]
  for(const name of ['Face_Skin','Detail_Face_lip','Detail_Face_shadow']) {
    const mesh=root.getObjectByName(name)
    const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3),3))
    geometry.setIndex(mesh.geometry.index.clone())
    const proxy=new T.Mesh(geometry,new T.MeshBasicMaterial());proxy.name=mesh.material.name
    proxies.push({mesh,proxy})
  }
  try {
    for(const clip of gltf.animations) {
      mixer.stopAllAction();mixer.clipAction(clip).reset().play()
      for(const fraction of [0,.25,.5,.75,.99]) {
        mixer.setTime(clip.duration*fraction);root.updateMatrixWorld(true)
        for(const {mesh,proxy} of proxies) {
          mesh.skeleton.update()
          const position=proxy.geometry.attributes.position
          for(let i=0;i<position.count;i++)worldVertex(mesh,i,point).toArray(position.array,i*3)
          proxy.geometry.computeBoundingSphere();proxy.updateMatrixWorld(true)
        }
        outward.set(0,0,1).applyQuaternion(head.getWorldQuaternion(rotation))
        for(const lip of [0,1]) for(const column of [6,12,18]) {
          worldVertex(lips,lip*125+2*25+column,point)
          ray.set(point.addScaledVector(outward,.02),outward.clone().negate())
          const hit=ray.intersectObjects(proxies.map(p=>p.proxy))[0]
          assert.equal(hit?.object.name,'Face_lip',`${clip.name}/${fraction}/${lip}: lip is hidden or faces inward`)
        }
      }
    }
  } finally {
    for(const {proxy} of proxies){proxy.geometry.dispose();proxy.material.dispose()}
  }
})
