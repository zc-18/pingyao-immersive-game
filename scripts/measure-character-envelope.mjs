import fs from 'node:fs'
import vm from 'node:vm'
import { TextDecoder } from 'node:util'
import { pathToFileURL } from 'node:url'

const base = new URL('../public/static/', import.meta.url)
const engine = vm.createContext({console:{warn(){}}, TextDecoder, setTimeout, clearTimeout, URL, Blob, ArrayBuffer, self:{URL}, navigator:{userAgent:'Node'}})
vm.runInContext(fs.readFileSync(new URL('libs/three.min.js',base),'utf8'),engine)
vm.runInContext(fs.readFileSync(new URL('libs/GLTFLoader.js',base),'utf8'),engine)
engine.THREE.TextureLoader.prototype.load = function (_, onLoad) {
  const texture = new engine.THREE.Texture()
  onLoad?.(texture)
  return texture
}
export const T = engine.THREE
export async function loadCharacter(filename = 'pingyao-merchant-hero.glb') {
  const bytes=fs.readFileSync(new URL('models/' + filename,base))
  return new Promise((resolve,reject)=>new T.GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject))
}
export function measureEnvelopes(gltf, samples = 60) {
 const root=gltf.scene, mixer=new T.AnimationMixer(root), p=new T.Vector3(), result={}
 for(const clip of gltf.animations) {
  mixer.stopAllAction();mixer.clipAction(clip).reset().play()
  let radius=0, extreme=null, minY=Infinity,maxY=-Infinity
  for(let frame=0;frame<=samples;frame++) {
    mixer.setTime(clip.duration*frame/samples);root.updateMatrixWorld(true)
    root.traverse(mesh=>{
      if(!mesh.isSkinnedMesh)return
      mesh.skeleton.update()
      for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
        p.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,p).applyMatrix4(mesh.matrixWorld)
        const r=Math.hypot(p.x,p.z)
        if(r>radius){radius=r;extreme={mesh:mesh.name,frame,point:p.toArray()}}
        minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)
      }
    })
  }
  result[clip.name]={radius,minY,maxY,extreme}
 }
 mixer.stopAllAction()
 return result
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(measureEnvelopes(await loadCharacter()),null,2))
