import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Original animation rig is CC0 KayKit. All visible geometry below is authored here.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(repo, 'public', 'static')
const engine = vm.createContext({ console: { warn() {} } })
vm.runInContext(fs.readFileSync(path.join(assets, 'libs/three.min.js'), 'utf8'), engine)
const T = engine.THREE
// Retarget the complete bind pose, vertices and animation translations together.
// The source rig is stylized; the new avatar uses approximately seven head heights.
const bodyY = y => y <= .52 ? y * 1.7 : y <= 1.2 ? .884 + (y-.52)*.88 : 1.4824 + (y-1.2)*.54
const bodyScale = y => y <= .52 ? 1.7 : y <= 1.2 ? .88 : .54
const widthScale = y => y <= 1.2 ? .82 : .82 - Math.min(1,(y-1.2)/.1)*.32
const reshape = p => new T.Vector3(p.x*widthScale(p.y),bodyY(p.y),p.z*widthScale(p.y))
const original = fs.readFileSync(path.join(assets, 'models/pingyao-character.glb'))
const jsonLength = original.readUInt32LE(12)
const source = JSON.parse(original.subarray(20, 20 + jsonLength))
const sourceBin = original.subarray(28 + jsonLength)
const gltf = { asset: { version: '2.0', generator: 'Pingyao Hanfu Atelier 1.0', copyright: 'Original geometry; KayKit CC0 animation rig' }, scene: 0, scenes: [{ nodes: [53] }], nodes: structuredClone(source.nodes), skins: structuredClone(source.skins), animations: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] }
gltf.nodes.forEach(n => { delete n.mesh; delete n.skin })
gltf.nodes[53].extras = { pingyaoDetailed: true, adultProportions: true, faceRevision: 2, finishRevision: 1 }
const originalNodes = source.nodes.map(n => {
  const o = new T.Object3D(); o.position.fromArray(n.translation || [0,0,0]); o.quaternion.fromArray(n.rotation || [0,0,0,1]); o.scale.fromArray(n.scale || [1,1,1]); return o
})
source.nodes.forEach((n,i) => n.children?.forEach(c => originalNodes[i].add(originalNodes[c])))
originalNodes[53].updateMatrixWorld(true)
const parents = new Map()
source.nodes.forEach((n,i) => n.children?.forEach(c => parents.set(c,i)))
const newPositions = originalNodes.map(o => reshape(o.getWorldPosition(new T.Vector3())))
gltf.nodes.forEach((n,i) => {
  const parent = parents.get(i)
  n.translation = parent === undefined ? newPositions[i].toArray() : newPositions[i].clone().sub(newPositions[parent]).applyQuaternion(originalNodes[parent].getWorldQuaternion(new T.Quaternion()).invert()).toArray()
})
const bindNodes = gltf.nodes.map(n => { const o=new T.Object3D();o.position.fromArray(n.translation);o.quaternion.fromArray(n.rotation||[0,0,0,1]);return o })
gltf.nodes.forEach((n,i)=>n.children?.forEach(c=>bindNodes[i].add(bindNodes[c])))
bindNodes[53].updateMatrixWorld(true)
let byteLength = 0
const chunks = []
function accessor(array, type, size, target) {
  const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
  const padded = Buffer.alloc(Math.ceil(buffer.length / 4) * 4)
  buffer.copy(padded)
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.length, ...(target ? { target } : {}) }) - 1
  chunks.push(padded); byteLength += padded.length
  const count = array.length / size
  const componentType = array instanceof Uint16Array ? 5123 : array instanceof Uint32Array ? 5125 : 5126
  const min = Array.from({ length: size }, (_, i) => { let v = Infinity; for (let j = i; j < array.length; j += size) v = Math.min(v, array[j]); return v })
  const max = Array.from({ length: size }, (_, i) => { let v = -Infinity; for (let j = i; j < array.length; j += size) v = Math.max(v, array[j]); return v })
  return gltf.accessors.push({ bufferView: view, componentType, count, type, ...(type !== 'MAT4' ? { min, max } : {}) }) - 1
}
const copied = new Map()
function copyAccessor(index) {
  if (copied.has(index)) return copied.get(index)
  const a = source.accessors[index], v = source.bufferViews[a.bufferView]
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type]
  const raw = sourceBin.subarray((v.byteOffset || 0) + (a.byteOffset || 0), (v.byteOffset || 0) + (a.byteOffset || 0) + a.count * size * 4)
  const result = accessor(new Float32Array(Uint8Array.from(raw).buffer), a.type, size)
  copied.set(index, result)
  return result
}
gltf.skins.forEach(s => { s.inverseBindMatrices = accessor(new Float32Array(s.joints.flatMap(i=>bindNodes[i].matrixWorld.clone().invert().toArray())), 'MAT4', 16) })
for (const name of ['Idle', 'Walking_A', 'Running_A', 'Interact', 'Cheer']) {
  const animation = structuredClone(source.animations.find(a => a.name === name))
  animation.channels.forEach(channel => {
    const sampler=animation.samplers[channel.sampler], originalIndex=sampler.output
    const a=source.accessors[originalIndex], v=source.bufferViews[a.bufferView]
    if(channel.target.path === 'translation') {
      const raw=sourceBin.subarray((v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+a.count*12)
      const data=new Float32Array(Uint8Array.from(raw).buffer), id=channel.target.node, parent=parents.get(id)
      const parentQ=parent===undefined?new T.Quaternion():originalNodes[parent].getWorldQuaternion(new T.Quaternion())
      const parentPos=parent===undefined?new T.Vector3():originalNodes[parent].getWorldPosition(new T.Vector3())
      for(let i=0;i<data.length;i+=3) {
        const mapped=reshape(new T.Vector3().fromArray(data,i).applyQuaternion(parentQ).add(parentPos)).sub(parent===undefined?new T.Vector3():newPositions[parent]).applyQuaternion(parentQ.clone().invert())
        mapped.toArray(data,i)
      }
      sampler.output=accessor(data,'VEC3',3)
    } else if(channel.target.path === 'rotation' && /^upperarm\./.test(source.nodes[channel.target.node].name)) {
      const raw=sourceBin.subarray((v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+a.count*16)
      const data=new Float32Array(Uint8Array.from(raw).buffer)
      const side=source.nodes[channel.target.node].name.endsWith('.l')?1:-1
      // Relax the wide cartoon idle/locomotion pose without changing the elbow curve.
      const correction=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-side*(name==='Interact'||name==='Cheer'?.1:.36))
      for(let i=0;i<data.length;i+=4) new T.Quaternion().fromArray(data,i).premultiply(correction).normalize().toArray(data,i)
      sampler.output=accessor(data,'VEC4',4)
    } else if(channel.target.path === 'rotation' && /^(upperleg|lowerleg|foot)\./.test(source.nodes[channel.target.node].name) && /Walking|Running/.test(name)) {
      const raw=sourceBin.subarray((v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+a.count*16)
      const data=new Float32Array(Uint8Array.from(raw).buffer), rest=new T.Quaternion().fromArray(source.nodes[channel.target.node].rotation||[0,0,0,1])
      for(let i=0;i<data.length;i+=4) rest.clone().slerp(new T.Quaternion().fromArray(data,i),name==='Walking_A'?.64:.82).normalize().toArray(data,i)
      sampler.output=accessor(data,'VEC4',4)
    } else sampler.output=copyAccessor(originalIndex)
    sampler.input=copyAccessor(sampler.input)
  })
  gltf.animations.push(animation)
}
// Bake a restrained two-arm bow into the actual rig. Hands meet in front of the
// chest; the sleeves stay outside the torso. Runtime uses the same clip blending.
{
  const duration=2.4, frames=73, times=Float32Array.from({length:frames},(_,i)=>i*duration/(frames-1))
  const tracks=new Map(), hipsId=source.nodes.findIndex(n=>n.name==='hips')
  const record=(id,q)=>{if(!tracks.has(id))tracks.set(id,[]);tracks.get(id).push(...q.toArray())}
  const worldRotation=(o,q)=>o.quaternion.copy(o.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q))
  const orient=(id,target)=>{
    const o=bindNodes[id],from=new T.Vector3(0,1,0).applyQuaternion(o.getWorldQuaternion(new T.Quaternion()))
    const to=target.clone().sub(o.getWorldPosition(new T.Vector3())).normalize()
    worldRotation(o,new T.Quaternion().setFromUnitVectors(from,to).multiply(o.getWorldQuaternion(new T.Quaternion())))
    bindNodes[53].updateMatrixWorld(true)
  }
  const poses=[]
  for(const raised of [false,true]) {
    gltf.nodes.forEach((n,i)=>bindNodes[i].quaternion.fromArray(n.rotation||[0,0,0,1]))
    bindNodes[53].updateMatrixWorld(true)
    for(const side of [-1,1]) {
      const suffix=side>0?'l':'r', id=name=>source.nodes.findIndex(n=>n.name===name+'.'+suffix)
      orient(id('upperarm'),new T.Vector3(side*(raised?.315:.245),raised?1.20:1.15,raised?.085:.015))
      orient(id('lowerarm'),new T.Vector3(side*(raised?.048:.265),raised?1.245:.95,raised?.275:.085))
      orient(id('wrist'),new T.Vector3(side*(raised?-.016:.26),raised?1.248:.88,raised?.285:.09))
    }
    poses.push(bindNodes.map(o=>o.quaternion.clone()))
  }
  const armIds=source.nodes.map((n,i)=>/^upperarm\.|^lowerarm\.|^wrist\./.test(n.name)?i:-1).filter(i=>i>=0)
  const chestId=source.nodes.findIndex(n=>n.name==='chest'), headId=source.nodes.findIndex(n=>n.name==='head')
  for(let i=0;i<frames;i++) {
    const time=times[i],ramp=time<.65?time/.65:time>1.7?(duration-time)/.7:1
    const weight=T.MathUtils.smoothstep(ramp,0,1)
    for(const id of armIds) record(id,poses[0][id].clone().slerp(poses[1][id],weight))
    for(const [id,bend] of [[chestId,.085],[headId,.095]]) record(id,new T.Quaternion().fromArray(gltf.nodes[id].rotation||[0,0,0,1]).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),bend*weight)))
  }
  const input=accessor(times,'SCALAR',1), gesture={name:'Interact',samplers:[],channels:[]}
  for(const [id,values] of tracks) {
    const sampler=gesture.samplers.push({input,output:accessor(new Float32Array(values),'VEC4',4),interpolation:'LINEAR'})-1
    gesture.channels.push({sampler,target:{node:id,path:'rotation'}})
  }
  gltf.animations[gltf.animations.findIndex(a=>a.name==='Interact')]=gesture
}
const joints = source.skins[0].joints
const joint = name => joints.indexOf(source.nodes.findIndex(n => n.name === name))
const material = (name, hex, roughness = 0.8, metallic = 0) => {
  const color = new T.Color(hex)
  if (T.ColorManagement?.legacyMode !== false) color.convertSRGBToLinear()
  return gltf.materials.push({ name, pbrMetallicRoughness: { baseColorFactor: [...color.toArray(), 1], roughnessFactor: roughness, metallicFactor: metallic }, doubleSided: false }) - 1
}
const mats = {
  cloth: material('Cloth', '#8B4513'), robe: material('Robe', '#754019'), trim: material('Trim', '#D2B48C', 0.62),
  skin: material('Skin', '#e1b996', 0.78), hair: material('Hair', '#201d1b', 0.66), strand: material('Hair_detail', '#282320', 0.72),
  white: material('Eye_white', '#f2e9d9', 0.38), iris: material('Eye_iris', '#41332a', 0.28), pupil: material('Eye_pupil', '#141614', 0.25),
  lip: material('Face_lip', '#b88072', 0.72), ear: material('Face_ear', '#bf8b76', 0.85), shoe: material('Shoes', '#252b2b', 0.8),
  faceShadow: material('Face_shadow', '#705241', .95),
  sole: material('Soles', '#b0a394'), leather: material('Leather', '#59402f', 0.82), gold: material('Metal', '#b59151', 0.35, 0.65),
  jade: material('Jade', '#769f8c', 0.3), paper: material('Paper', '#ddd6c2'), hat: material('Hat', '#302d29', 0.86)
}
const groups = new Map()
const clamp = T.MathUtils.clamp
function rigid(name) { return () => [[joint(name), 1]] }
function blend(a, b, t) { t = clamp(t, 0, 1); return [[joint(a), 1 - t], [joint(b), t]] }
const torsoWeights = p => p.y < 0.65 ? blend('hips', 'spine', (p.y - 0.44) / 0.21) : blend('spine', 'chest', (p.y - 0.68) / 0.28)
const skirtWeights = p => {
  const leg = p.x >= 0 ? 'upperleg.l' : 'upperleg.r'
  return blend('hips', leg, clamp((0.6 - p.y) / 0.5, 0, 0.72) * Math.min(1, Math.abs(p.x) / 0.16))
}
function add(name, geometry, mat, weights = rigid('head')) {
  // Skinning weights allow compatible parts to share a draw call, including hands and face.
  if (!/^(hw_|acc_)/.test(name) && !['Skirt_Robe','Hem_Trim','Sash_tails','Eyes','Irises','Pupils','Eye_glints','Eyelids','Lashes'].includes(name)) {
    name = mat === mats.skin ? 'Face_Skin' : mat === mats.cloth ? 'Tunic_Cloth' : mat === mats.trim ? 'Tailored_Trim' : 'Detail_' + gltf.materials[mat].name
  }
  if (name === 'Eye_glints') name = 'Eyes'
  const key = `${name}:${mat}`
  if (!groups.has(key)) groups.set(key, { name, mat, positions: [], normals: [], uvs: [], colors: [], joints: [], weights: [], indices: [] })
  const out = groups.get(key), base = out.positions.length / 3
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const point = new T.Vector3().fromBufferAttribute(p, i)
    const influence = weights(point)
    const shaped = reshape(point)
    out.positions.push(shaped.x, shaped.y, shaped.z)
    if(mat===mats.skin) {
      const spot=(x,y,rx,ry)=>Math.exp(-(((Math.abs(point.x)-x)/rx)**2+((point.y-y)/ry)**2))
      const front=clamp((point.z-.09)/.08,0,1)
      const warm=(spot(.115,1.456,.057,.047)*.13+spot(0,1.436,.036,.03)*.07)*front
      // Local creases retain depth under diffuse courtyard light. This is
      // gentle baked occlusion, independent of the sun's changing direction.
      const shade=(spot(.074,1.491,.045,.016)*.085+spot(0,1.35,.051,.014)*.075
        +spot(0,1.413,.033,.012)*.15+spot(.032,1.432,.014,.024)*.065
        +spot(0,1.292,.11,.025)*.13)*front
      out.colors.push(1-shade,1-shade-warm*.7,1-shade-warm)
    } else if(mat===mats.iris) {
      const x=point.x-Math.sign(point.x)*.073,y=(point.y-1.507)*(.012/.0105)
      const radius=clamp(Math.hypot(x,y)/.012,0,1), angle=Math.atan2(y,x)
      const fibers=(.5+.5*Math.sin(angle*37+radius*10))*(.5+.5*Math.sin(angle*71-radius*7))
      const tone=.66+.28*Math.sin(radius*Math.PI)+fibers*.15-.27*T.MathUtils.smoothstep(radius,.83,1)
      out.colors.push(tone,tone*.94,tone*.83)
    } else if(mat===mats.lip) {
      const upper=point.y>1.374 ? .91 : 1
      out.colors.push(upper,upper,upper)
    }
    const normal = new T.Vector3(n.getX(i)/widthScale(point.y),n.getY(i)/bodyScale(point.y),n.getZ(i)/widthScale(point.y)).normalize()
    out.normals.push(normal.x,normal.y,normal.z)
    out.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0)
    for (let k = 0; k < 4; k++) { out.joints.push(influence[k]?.[0] || 0); out.weights.push(influence[k]?.[1] || 0) }
  }
  if (geometry.index) for (const index of geometry.index.array) out.indices.push(base + index)
  else for (let i = 0; i < p.count; i++) out.indices.push(base + i)
  geometry.dispose()
}
function ellipsoid(name, mat, xyz, scale, weights = rigid('head'), segments = 20, rings = 12) {
  const g = new T.SphereGeometry(1, segments, rings)
  g.scale(...scale); g.translate(...xyz); add(name, g, mat, weights)
}
function tube(name, mat, points, radius, weights = rigid('head'), segments = 18, sides = 6) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)))
  add(name, new T.TubeGeometry(curve, segments, radius, sides, false), mat, weights)
}
function ribbon(name, mat, points, width, weights) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)))
  const positions = [], uvs = [], indices = []
  for (let i = 0; i <= 28; i++) {
    const p = curve.getPoint(i / 28), tangent = curve.getTangent(i / 28)
    const edge = new T.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(width / 2)
    for (const side of [-1, 1]) { positions.push(p.x + side*edge.x, p.y + side*edge.y, p.z + .008); uvs.push(side < 0 ? 0 : 1, i / 28) }
    if (i) { const b = i*2; indices.push(b-2,b,b-1,b-1,b,b+1) }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals()
  add(name,g,mat,weights)
}
function loft(name, mat, rings, weights, segments = 32, pleats = 0, axis = 'y') {
  const positions = [], uvs = [], indices = []
  rings.forEach(([height, width, depth, offset = 0], row) => {
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2
      const fold = 1 + Math.cos(a * 12) * pleats * (1 - row / rings.length * 0.4)
      const x = Math.cos(a) * width * fold, z = Math.sin(a) * depth * fold + offset
      positions.push(...(axis === 'y' ? [x, height, z] : [height, 1.107 + x, z]))
      uvs.push(i / segments, row / (rings.length - 1))
      if (row && i) { const b = row * (segments + 1) + i; indices.push(b, b - 1, b - segments - 1, b - 1, b - segments - 2, b - segments - 1) }
    }
  })
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals()
  // Keep the visible side outside for both choices of longitudinal axis.
  if (axis === 'y') { const index = g.index.array; for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]]; g.computeVertexNormals() }
  add(name, g, mat, weights)
}

// Tailored tunic: shoulders, ribcage and waist have separate elliptical sections.
loft('Tunic_Cloth', mats.cloth, [[.48,.225,.145],[.55,.24,.16],[.64,.235,.157],[.75,.245,.16],[.86,.265,.175],[.98,.285,.185],[1.075,.295,.178],[1.13,.26,.16],[1.18,.15,.12],[1.195,.105,.09]], torsoWeights, 40, .014)
loft('Inner_Trim', mats.trim, [[1.13,.105,.10],[1.21,.10,.085],[1.235,.09,.082],[1.24,.086,.078]], rigid('chest'), 32)
loft('Neck_Skin', mats.skin, [[1.16,.082,.074],[1.195,.080,.072],[1.23,.076,.069],[1.28,.075,.068],[1.32,.080,.074],[1.36,.085,.078]],
  p=>blend('chest','head',T.MathUtils.smoothstep(p.y,1.18,1.31)),32)
// A shaped jaw and cheeks replace the original featureless polygonal head.
const head = new T.SphereGeometry(1, 64, 40)
const hp = head.attributes.position
for (let row=0;row<=40;row++) for(let column=0;column<=64;column++) {
  // Spend the existing vertex budget around eyes, nose and mouth; the back
  // of the skull is covered by hair. Keep a shared, closed spherical topology.
  const y=row<=14 ? Math.cos(row/14*Math.acos(.12)) : row<=32 ? .12-(row-14)/18*.75 : -.63-(row-32)/8*.37
  const jaw=.86+.14*clamp((y+.8)/.9,0,1), radius=Math.sqrt(Math.max(0,1-y*y))
  const delta=(column/64*2-1)*Math.PI, phi=Math.PI/2+Math.sign(delta)*Math.PI*(Math.abs(delta)/Math.PI)**1.38
  const z=Math.sin(phi)*radius,x=-Math.cos(phi)*radius*.218*jaw,height=1.51+y*.245
  hp.setXYZ(row*65+column,x,height,z*(z>0?.19:.20)+.014+(z>0?sculptFace(x,height):0))
}
head.computeVertexNormals()
const headSurface=new T.Mesh(head,new T.MeshBasicMaterial()), faceRay=new T.Raycaster()
function sampledFaceDepth(x,y) {
  faceRay.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1))
  return faceRay.intersectObject(headSurface)[0]?.point.z ?? faceDepth(x,y)
}
add('Face_Skin', head, mats.skin)
// Facial parts follow the same curved surface as the skull, rather than floating
// ellipsoids. The eye opening is an almond lens and the nose is a continuous patch.
function sculptFace(x,y) {
  const gaussian=value=>Math.exp(-value*value)
  return .019*gaussian((y-1.480)/.058)*gaussian(x/.018)
    +.035*gaussian((y-1.438)/.030)*gaussian(x/.026)
    +.014*gaussian((y-1.426)/.013)*gaussian((Math.abs(x)-.026)/.012)
    +.007*gaussian((y-1.455)/.045)*gaussian((Math.abs(x)-.112)/.052)
    +.010*gaussian((y-1.374)/.025)*gaussian(x/.053)
    +.005*gaussian((y-1.318)/.03)*gaussian(x/.045)
}
function faceDepth(x, y) {
  const v = (y-1.51)/.245, jaw = .86 + .14 * clamp((v+.8)/.9,0,1)
  return .014 + .19 * Math.sqrt(Math.max(0,1-v*v-(x/(.218*jaw))**2)) + sculptFace(x,y)
}
function surface(name, mat, cols, rows, position) {
  const positions=[],uvs=[],indices=[]
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++) {
    positions.push(...position(x/cols,y/rows));uvs.push(x/cols,y/rows)
    if(x&&y){const i=y*(cols+1)+x;indices.push(i-cols-2,i-cols-1,i-1,i-cols-1,i,i-1)}
  }
  const geometry=new T.BufferGeometry()
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals()
  add(name,geometry,mat)
}
for (const side of [-1, 1]) {
  ellipsoid('Ears_Skin', mats.skin, [side*.213,1.48,.002], [.033,.059,.026], rigid('head'), 16, 12)
  ellipsoid('Ear_insets', mats.ear, [side*.231,1.483,.022], [.007,.033,.005], rigid('head'), 12, 8)
  const helix=[]
  for(let i=0;i<=12;i++){const a=i/12*Math.PI*2;helix.push([side*(.23+.008*Math.sin(a)),1.48+.047*Math.cos(a),.017+.01*Math.sin(a)])}
  tube('Ear_helix',mats.skin,helix,.0035,rigid('head'),16,4)
  const center = side*.073
  const eyeDepth=(x,y)=>{
    const u=clamp((x-center)/.078+.5,.001,.999),arch=Math.sin(u*Math.PI)**.78
    const v=clamp((y-1.507-side*(x-center)*.035)/(.025*arch)+.5,0,1)
    return faceDepth(x,y)+.0015+.006*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)
  }
  surface('Eyes',mats.white,24,6,(u,v)=>{
    const x=center+(u-.5)*.078, arch=Math.sin(u*Math.PI)**.78
    const y=1.507+(v-.5)*.025*arch + side*(x-center)*.035
    return [x,y,eyeDepth(x,y)]
  })
  for(const [name,mat,rx,ry,lift,cols,rows] of [['Irises',mats.iris,.012,.0105,.0006,24,4],['Pupils',mats.pupil,.0046,.0042,.0012,16,3]]) {
    surface(name,mat,cols,rows,(u,v)=>{
      const angle=-u*Math.PI*2,x=center+Math.cos(angle)*rx*v,y=1.507+Math.sin(angle)*ry*v
      return [x,y,eyeDepth(x,y)+lift]
    })
  }
  ellipsoid('Eye_glints', mats.white, [center-.003,1.510,eyeDepth(center-.003,1.510)+.0015], [.0016,.0016,.0006], rigid('head'), 8, 6)
  for(const upper of [true,false]) {
    const rim=[]
    for(let i=0;i<=12;i++){
      const u=i/12,x=center+(u-.5)*.078,y=1.507+(upper?1:-1)*.0125*Math.sin(u*Math.PI)**.78+side*(x-center)*.035
      rim.push([x,y,faceDepth(x,y)+.002])
    }
    tube('Eyelids',mats.skin,rim,upper?.0028:.002,rigid('head'),16,5)
    if(upper)tube('Lashes',mats.hair,rim.map(([x,y,z])=>[x,y+.0003,z+.001]),.0013,rigid('head'),16,4)
  }
  const brow=[[-.039,0],[-.013,.004],[.016,.004],[.039,-.001]].map(([dx,dy])=>{
    const x=center+side*dx,y=1.535+dy;return [x,y,faceDepth(x,y)+.002]
  })
  const curve=new T.CatmullRomCurve3(brow.map(p=>new T.Vector3(...p)))
  const geometry=new T.TubeGeometry(curve,16,.0031,5,false), positions=geometry.attributes.position
  for(let row=0;row<=16;row++) {
    const middle=curve.getPointAt(row/16), taper=.08+.92*Math.sin(row/16*Math.PI)**.35
    for(let col=0;col<=5;col++){
      const i=row*6+col,p=new T.Vector3().fromBufferAttribute(positions,i).sub(middle).multiplyScalar(taper).add(middle)
      positions.setXYZ(i,p.x,p.y,p.z)
    }
  }
  geometry.computeVertexNormals();add('Brows',geometry,mats.hair)
}
// Two tapered lip surfaces meet at a recessed mouth line. Their outer edges
// follow the actual tessellated face, avoiding a floating cylindrical smile.
const lipLine=x=>1.373+.0015*(Math.abs(x)/.043)**2
for(const upper of [true,false]) surface('Lips',mats.lip,24,4,(u,v)=>{
  if(!upper)u=1-u // both lip patches face outward despite opposite vertical directions
  const x=(u-.5)*.086,arch=Math.sin(Math.PI*u)**.7
  const height=upper ? .006+.003*Math.exp(-(((Math.abs(x)-.014)/.009)**2)) : .008
  const y=lipLine(x)+(upper?1:-1)*height*arch*v
  return [x,y,sampledFaceDepth(x,y)+.0005+arch*(.0012+.004*Math.sin(Math.PI*v))]
})
const mouthLine=Array.from({length:17},(_,i)=>{const x=(i/16-.5)*.084,y=lipLine(x);return [x,y,sampledFaceDepth(x,y)+.0018]})
tube('Mouth_line',mats.faceShadow,mouthLine,.00065,rigid('head'),20,4)
for(const side of [-1,1])ellipsoid('Nostrils',mats.faceShadow,[side*.023,1.421,sampledFaceDepth(side*.023,1.421)+.0001],[.0033,.0015,.0006],rigid('head'),10,6)
// Hair shell follows the skull; swept locks produce a readable silhouette.
const hair = new T.SphereGeometry(1, 36, 18, 0, Math.PI*2, 0, Math.PI*.999)
const hairPositions = hair.attributes.position
for (let row = 0; row <= 18; row++) for (let column = 0; column <= 36; column++) {
  const phi = column / 36 * Math.PI * 2
  const front = Math.sin(phi)
  const theta = row / 18 * Math.PI * (.58 - .22 * Math.max(0, front) + .1 * Math.max(0, -front))
  hairPositions.setXYZ(row * 37 + column, -Math.cos(phi) * Math.sin(theta) * .224, 1.50 + Math.cos(theta) * .278, Math.sin(phi) * Math.sin(theta) * .205 + .005)
}
hair.computeVertexNormals(); add('Hair_shell', hair, mats.hair)
for (const side of [-1, 1]) {
  for (let i = 0; i < 8; i++) {
    const points = []
    for (let j = 0; j <= 8; j++) {
      const t = j/8, phi = Math.PI/2 - side*(.13+i*.078+t*.63), front=Math.sin(phi)
      const limit=Math.PI*(.58-.22*Math.max(0,front)+.1*Math.max(0,-front))
      const theta = .2+t*(limit*.98-.2)
      points.push([Math.cos(phi)*Math.sin(theta)*.227,1.50+Math.cos(theta)*.281,Math.sin(phi)*Math.sin(theta)*.208+.005])
    }
    // Narrow tapered ribbons read as combed strands, with no open tube ends.
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)))
    surface('Hair_locks',mats.strand,1,16,(u,v)=>{
      const p=curve.getPoint(v),tangent=curve.getTangent(v)
      const normal=new T.Vector3(p.x/.227,(p.y-1.50)/.281,(p.z-.005)/.208).normalize()
      const across=new T.Vector3().crossVectors(tangent,normal).normalize()
      return p.addScaledVector(across,(u-.5)*.0018*Math.sin(Math.PI*v)**.45).toArray()
    })
  }
  ellipsoid('Sideburns',mats.hair,[side*.201,1.49,.043],[.012,.058,.018],rigid('head'),14,10)
}
ellipsoid('hw_hair-bun', mats.hair, [0,1.691,-.192], [.103,.104,.089], rigid('head'), 24, 16)
tube('hw_hair-bun', mats.gold, [[-.1,1.704,-.19],[0,1.72,-.268],[.12,1.724,-.19]], .012, rigid('head'), 16)
for (const hatName of ['skullcap','scholar-scarf','guard-cap','merchant-cap','festival-cap','merchant-crown']) {
  const peak = hatName === 'merchant-crown' ? 1.96 : hatName === 'scholar-scarf' ? 1.91 : 1.86
  loft('hw_'+hatName, mats.hat, [[1.69,.222,.204],[1.73,.223,.204],[peak-.045,.17,.151],[peak,.045,.044],[peak+.002,.001,.001]], rigid('head'), 28)
  loft('hw_'+hatName, mats.trim, [[1.695,.225,.208],[1.72,.226,.208]], rigid('head'), 28)
  if (hatName === 'guard-cap') loft('hw_'+hatName, mats.hat, [[1.697,.31,.27],[1.72,.225,.204]], rigid('head'), 28)
  if (hatName === 'scholar-scarf') for (const side of [-1,1]) tube('hw_'+hatName, mats.hat, [[side*.11,1.73,-.19],[side*.13,1.53,-.20],[side*.17,1.36,-.21]], .027, rigid('head'), 12)
}
// Continuous sleeve surfaces interpolate shoulder/elbow/wrist influences.
for (const side of [-1,1]) {
  const suffix = side > 0 ? 'l' : 'r'
  const armWeights = p => Math.abs(p.x)<.32 ? blend('chest','upperarm.'+suffix,(Math.abs(p.x)-.12)/.2) : Math.abs(p.x)<.54 ? blend('upperarm.'+suffix,'lowerarm.'+suffix,(Math.abs(p.x)-.35)/.19) : blend('lowerarm.'+suffix,'wrist.'+suffix,(Math.abs(p.x)-.63)/.1)
  ellipsoid('Shoulders_Cloth',mats.cloth,[side*.209,1.101,0],[.111,.094,.119],armWeights,24,16)
  const sleeve = [[.15,.087,.112],[.22,.111,.125],[.29,.119,.128],[.36,.12,.124],[.45,.122,.117],[.54,.127,.12],[.63,.126,.115],[.7,.115,.103]].map(([x,y,z])=>[x*side,y,z])
  if (side < 0) sleeve.reverse()
  loft('Sleeves_Cloth', mats.cloth, sleeve, armWeights, 24, .024, 'x')
  const cuff = [[.658*side,.14,.129],[.704*side,.129,.117],[.737*side,.117,.106]]
  if (side < 0) cuff.reverse()
  loft('Cuffs_Trim', mats.trim, cuff, armWeights, 24, 0, 'x')
  ellipsoid('Wrists_Skin',mats.skin,[side*.751,1.107,0],[.053,.044,.044],rigid('wrist.'+suffix),16,10)
  ellipsoid('Hands_Skin', mats.skin, [side*.777,1.107,0], [.08,.045,.061], rigid('hand.'+suffix), 18, 12)
  ellipsoid('Thumbs_Skin', mats.skin, [side*.773,1.059,.04], [.046,.026,.026], rigid('hand.'+suffix), 14, 8)
  for (let f=0;f<4;f++) ellipsoid('Fingers_Skin',mats.skin,[side*(.831+(f===1?.014:0)),1.104,-.039+f*.024],[.045,.021,.014],rigid('hand.'+suffix),12,8)
  const legWeights = p => p.y>.30 ? blend('lowerleg.'+suffix,'upperleg.'+suffix,(p.y-.28)/.11) : blend('foot.'+suffix,'lowerleg.'+suffix,(p.y-.17)/.12)
  const leg = new T.CylinderGeometry(.126,.086,.42,20,12)
  leg.translate(side*.171,.34,0); add('Trousers_Robe',leg,mats.robe,legWeights)
  // The leg retarget stretches Y by 1.7. Compensate footwear dimensions so
  // adult ankles keep a narrow cloth boot and thin layered sole.
  ellipsoid('Boots',mats.shoe,[side*.171,.070,.061],[.082,.066,.169],rigid('foot.'+suffix),24,14)
  ellipsoid('Soles',mats.sole,[side*.171,.012,.063],[.085,.010,.171],rigid('foot.'+suffix),24,10)
  tube('Shoe_stitch',mats.trim,[[side*.171-.063,.105,.125],[side*.171,.111,.202],[side*.171+.063,.105,.125]],.003,rigid('foot.'+suffix),16)
}
// Pleated cloth is skinned to the hips and both thighs, including the lower trim.
loft('Skirt_Robe',mats.robe,[[.185,.32,.238],[.24,.322,.23],[.32,.31,.219],[.42,.29,.208],[.51,.268,.187],[.61,.245,.172],[.67,.24,.168]],skirtWeights,48,.055)
loft('Hem_Trim',mats.trim,[[.185,.321,.24],[.211,.325,.239]],skirtWeights,48,.055)
loft('Belt_Leather',mats.leather,[[.62,.247,.173],[.65,.248,.174],[.69,.246,.172]],torsoWeights,40)
loft('Belt_edge',mats.trim,[[.62,.249,.175],[.629,.25,.176]],torsoWeights,40)
// Crossed collar lies on the tailored chest, with a separate folded edge.
for (const side of [-1,1]) {
  const points = [[side*.075,1.187,.09],[side*.137,1.10,.153],[side*.101,.985,.186],[-side*.07,.842,.174]]
  ribbon('Lapel_Trim',mats.trim,points,.064,torsoWeights)
  tube('Collar_seam',mats.cloth,points.map(p=>[p[0]+side*.03,p[1],p[2]+.009]),.003,torsoWeights,24)
}
ellipsoid('Belt_buckle',mats.gold,[0,.655,.183],[.037,.029,.008],torsoWeights,16,10)
tube('Belt_knot',mats.trim,[[-.018,.655,.194],[-.062,.682,.191],[-.073,.645,.19],[0,.644,.194],[.06,.68,.19],[.076,.646,.19],[.02,.65,.196]],.01,torsoWeights,26)
for (const side of [-1,1]) tube('Sash_tails',mats.trim,[[side*.015,.636,.192],[side*.056,.51,.212],[side*.045,.355,.242]],.015,skirtWeights,20)
// Occupational accessories are individual selectable meshes, with shaped closures.
ellipsoid('acc_satchel',mats.leather,[.285,.53,-.015],[.112,.136,.071],rigid('hips'),24,16)
ellipsoid('acc_satchel',mats.gold,[.286,.54,.057],[.017,.018,.009],rigid('hips'),12,8)
tube('acc_satchel',mats.leather,[[-.2,1.13,.124],[-.10,.99,.202],[.10,.76,.177],[.26,.54,.039]],.014,torsoWeights,28)
for (const name of ['scroll','ledger','scabbard']) {
  const length = name==='scabbard'?.58:.31
  const cylinder = new T.CylinderGeometry(.04,.042,length,16)
  cylinder.rotateZ(-.12); cylinder.translate(-.285,.51,-.018)
  add('acc_'+name,cylinder,name==='scroll'?mats.paper:mats.leather,rigid('hips'))
  ellipsoid('acc_'+name,mats.gold,[-.285,.51+length/2,-.018],[.052,.016,.05],rigid('hips'),14,8)
}
for (const name of ['jade','seal','tassel']) {
  tube('acc_'+name,mats.trim,[[.12,.65,.171],[.14,.49,.217],[.13,.43,.23]],.008,rigid('hips'),14)
  ellipsoid('acc_'+name,name==='jade'?mats.jade:mats.gold,[.13,.41,.23],[.032,.045,.012],rigid('hips'),16,12)
  if(name==='tassel') for(let i=0;i<5;i++) tube('acc_'+name,mats.trim,[[.12+i*.005,.39,.23],[.12+i*.006,.29,.235]],.003,rigid('hips'),5,4)
}

let triangles = 0
for (const part of groups.values()) {
  const attributes = { POSITION: accessor(new Float32Array(part.positions),'VEC3',3,34962), NORMAL: accessor(new Float32Array(part.normals),'VEC3',3,34962), TEXCOORD_0: accessor(new Float32Array(part.uvs),'VEC2',2,34962), JOINTS_0: accessor(new Uint16Array(part.joints),'VEC4',4,34962), WEIGHTS_0: accessor(new Float32Array(part.weights),'VEC4',4,34962) }
  if(part.colors.length)attributes.COLOR_0=accessor(new Float32Array(part.colors),'VEC3',3,34962)
  const indices = accessor(new Uint16Array(part.indices),'SCALAR',1,34963)
  const mesh = gltf.meshes.push({name:part.name,primitives:[{attributes,indices,material:part.mat}]})-1
  const node = gltf.nodes.push({name:part.name,mesh,skin:0,extras:{pingyaoDetailed:true}})-1
  gltf.nodes[53].children.push(node)
  triangles += part.indices.length/3
}
gltf.buffers.push({byteLength})
const rawJson=Buffer.from(JSON.stringify(gltf)), json=Buffer.alloc(Math.ceil(rawJson.length/4)*4,32);rawJson.copy(json)
const bin=Buffer.concat(chunks), result=Buffer.alloc(28+json.length+bin.length)
result.write('glTF');result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(json.length,12);result.writeUInt32LE(0x4e4f534a,16);json.copy(result,20);result.writeUInt32LE(bin.length,20+json.length);result.writeUInt32LE(0x004e4942,24+json.length);bin.copy(result,28+json.length)
const target=path.join(assets,'models/pingyao-hanfu-courtyard.glb')
fs.writeFileSync(target,result)
console.log(JSON.stringify({target,bytes:result.length,triangles,parts:groups.size,animations:gltf.animations.map(a=>a.name)},null,2))
