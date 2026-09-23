import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { T } from '../scripts/measure-character-envelope.mjs'
import { footworkFixture } from '../scripts/measure-character-footwork.mjs'

test('normal exploration keeps the real avatar inside portrait and landscape frames beside solid walls', async () => {
  const { root, api, context } = await footworkFixture()
  context.view = new T.PerspectiveCamera(58, 1, .1, 100)
  vm.runInContext(`camera=view; cameraProbe=new THREE.Ray(); cameraProbeDirection=new THREE.Vector3();
    movementVelocity={x:0,z:0}; cameraDistance=6.2; cameraPitch=.38;
    currentWorldLayout={cameraBounds:{xMin:-6.1,xMax:6.1,zMin:-24.4,zMax:20}};
    cameraOccluders=[new THREE.Box3(new THREE.Vector3(4.6,0,-15),new THREE.Vector3(7,4.4,15)),
      new THREE.Box3(new THREE.Vector3(-7,0,-25.6),new THREE.Vector3(7,4.4,-24.7)),
      new THREE.Box3(new THREE.Vector3(-7,0,20.55),new THREE.Vector3(7,4.4,21))];`, context)
  const p = new T.Vector3()
  for (const aspect of [390 / 844, 430 / 932, 844 / 390, 667 / 375]) {
    context.view.aspect = aspect; context.view.updateProjectionMatrix()
    for (const [x, z, yaw] of [[1,19.5,0],[0,-23.6,Math.PI],[3.5,2,Math.PI/2],[3.5,-23.6,2.4]]) {
      root.position.set(x,.083,z);context.heading=yaw;vm.runInContext('cameraYaw=heading',context)
      api.updatePlayerMixer(0,false,1/60)
      for(let frame=0;frame<160;frame++)api.updateFollowCamera(1/60)
      root.updateMatrixWorld(true);context.view.updateMatrixWorld(true)
      let maxX=0,maxY=0
      root.traverse(mesh=>{
        if(!mesh.isSkinnedMesh)return
        mesh.skeleton.update()
        for(let i=0;i<mesh.geometry.attributes.position.count;i++){
          p.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,p).applyMatrix4(mesh.matrixWorld).project(context.view)
          maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y))
        }
      })
      assert.ok(maxX<.95 && maxY<.95,`avatar cropped at ${aspect}, ${x}/${z}: ${maxX}, ${maxY}`)
      const cam=context.view.position
      assert.ok(cam.x>=-6.1 && cam.x<=6.1 && cam.z>=-24.4 && cam.z<=20)
      assert.ok(vm.runInContext('cameraOccluders.every(box=>!box.containsPoint(camera.position))',context),'camera entered solid geometry')
    }
  }
})
