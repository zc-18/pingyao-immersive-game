import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { TextDecoder } from 'node:util'

const base=new URL('../public/static/',import.meta.url)
const bytes=fs.readFileSync(new URL('models/pingyao-merchant-hero.glb',base))
const length=bytes.readUInt32LE(12), gltf=JSON.parse(bytes.subarray(20,20+length)), binary=bytes.subarray(28+length)
function values(index) {
  const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView]
  const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type]
  const offset=(v.byteOffset||0)+(a.byteOffset||0), type=a.componentType===5123?Uint16Array:Float32Array
  return new type(Uint8Array.from(binary.subarray(offset,offset+a.count*size*type.BYTES_PER_ELEMENT)).buffer)
}
test('detailed avatar stays within its asset budget and has normalized skin weights', () => {
  assert.ok(bytes.length<2.25*1024*1024)
  assert.equal(gltf.nodes.find(node=>node.name==='Rig')?.extras?.assetRole,'merchant-scholar')
  let triangles=0, blended=0
  for(const mesh of gltf.meshes) for(const p of mesh.primitives) {
    triangles+=gltf.accessors[p.indices].count/3
    const weights=values(p.attributes.WEIGHTS_0), joints=values(p.attributes.JOINTS_0)
    for(let i=0;i<weights.length;i+=4) {
      assert.ok(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)<1e-5)
      if(weights[i+1]>0 && weights[i]>0) blended++
      assert.ok(joints[i]<gltf.skins[0].joints.length)
    }
    assert.ok([...values(p.attributes.POSITION)].every(Number.isFinite))
  }
  assert.ok(triangles<32000)
  assert.ok(blended>1000, 'continuous garments must blend across joints')
})

test('new model parses in the installed engine and every clip deforms valid geometry', async () => {
  const engine=vm.createContext({console,TextDecoder,setTimeout,clearTimeout,URL,Blob,ArrayBuffer,self:{URL},navigator:{userAgent:'Node'}})
  vm.runInContext(fs.readFileSync(new URL('libs/three.min.js',base),'utf8'),engine)
  vm.runInContext(fs.readFileSync(new URL('libs/GLTFLoader.js',base),'utf8'),engine)
  const T=engine.THREE
  T.TextureLoader.prototype.load=function (_,onLoad) { const texture=new T.Texture();onLoad?.(texture);return texture }
  const parsed=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject))
  const mixer=new T.AnimationMixer(parsed.scene)
  for(const clip of parsed.animations) {
    mixer.stopAllAction();mixer.clipAction(clip).reset().play()
    for(const fraction of [0,.25,.5,.75,.99]) {
      mixer.setTime(clip.duration*fraction);parsed.scene.updateMatrixWorld(true)
      parsed.scene.traverse(mesh=>{
        if(!mesh.isSkinnedMesh) return
        mesh.skeleton.update()
        const p=new T.Vector3()
        for(let i=0;i<mesh.geometry.attributes.position.count;i+=31) {
          p.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,p)
          assert.ok(p.toArray().every(Number.isFinite),`${clip.name}/${mesh.name}`)
          assert.ok(p.length()<4,`${clip.name}/${mesh.name}: exploded skin`)
        }
      })
    }
  }
})
