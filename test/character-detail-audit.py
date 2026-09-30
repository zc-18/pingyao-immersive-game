"""Repeatable studio views of the actual shipped GLB, alongside the in-game audits."""
import json
import hashlib
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'artifacts/character-detail'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))

HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#d4d2c9}canvas{display:block}
</style></head><body><script src="/static/libs/three.min.js"></script><script src="/static/libs/GLTFLoader.js"></script><script>
THREE.ColorManagement.legacyMode=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#d4d2c9');
const camera=new THREE.PerspectiveCamera(32,1,.01,100);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(720,720);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#faf5eb','#5b554d',.65));
const key=new THREE.DirectionalLight('#fff1dc',1.25);key.position.set(-3,4,5);scene.add(key);
const fill=new THREE.DirectionalLight('#dae5fa',.35);fill.position.set(3,2,1);scene.add(fill);
const rim=new THREE.DirectionalLight('#fff1db',.7);rim.position.set(1,3,-3);scene.add(rim);
new THREE.GLTFLoader().load('/static/models/pingyao-merchant-hero.glb',g=>{
  const root=g.scene;scene.add(root);
  root.traverse(m=>{
    if(m.name.startsWith('hw_'))m.visible=m.name.replace(/_\\d+$/,'')==='hw_hair-bun';
    if(m.name.startsWith('acc_'))m.visible=m.name.replace(/_\\d+$/,'')==='acc_satchel';
  });
  const mixer=new THREE.AnimationMixer(root);mixer.clipAction(g.animations.find(c=>c.name==='Idle')).play();mixer.setTime(.3);root.updateMatrixWorld(true);
  window.review={root,mixer,renderer,scene,camera,gltf:g};window.ready=true;
  window.captureView=(angle,full=false)=>{
    const radius=full?3.8:.68,focus=(full?.92:1.59)+root.position.y;
    camera.position.set(Math.sin(angle)*radius,focus+(full?.17:.035),Math.cos(angle)*radius);camera.lookAt(0,focus,0);
    renderer.render(scene,camera);
  };
  captureView(0);
},undefined,e=>{throw e});
</script></body></html>'''

def main():
    import sys
    prefix='before' if '--before' in sys.argv else 'after'
    errors=[];evidence={}
    model=ROOT.parent/'public/static/models/pingyao-merchant-hero.glb'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':720,'height':720},device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append(e.message))
        page.route('**/character-review',lambda route:route.fulfill(content_type='text/html',body=HTML))
        if '--release' not in sys.argv:
            page.route('**/static/models/pingyao-merchant-hero.glb',lambda route:route.fulfill(content_type='model/gltf-binary',body=model.read_bytes()))
        try:
            page.goto('http://localhost:5219/character-review')
            page.wait_for_function('window.ready',timeout=30000)
            metadata=page.evaluate("() => review.gltf.parser.json.nodes.find(n=>n.name==='Rig')?.extras")
            if prefix=='after':assert metadata.get('faceRevision')==2,metadata
            evidence['metadata']=metadata
            if prefix=='after':
                evidence['sha256']=page.evaluate("async () => {const b=await (await fetch('/static/models/pingyao-merchant-hero.glb')).arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('')}")
                assert evidence['sha256']==hashlib.sha256(model.read_bytes()).hexdigest()
                evidence['bytes']=model.stat().st_size
            for name,angle,full in [('front',0,False),('three-quarter',.65,False),('profile',1.5708,False),('back',3.14159,False),('body',0,True)]:
                page.evaluate('args=>captureView(...args)',[angle,full]);page.screenshot(path=OUT/f'{prefix}-{name}.png')
            if prefix=='after':
                source=(ROOT.parent/'src/pages_game/street/street-renderer.js').read_text(encoding='utf-8')
                # The renderer is now a plain module with default {mount, unmount, methods}.
                assert source.count("export default") == 1, "Renderer export contract changed"
                blink=page.evaluate("""source => {
                  const controller=new Function('engine',source.replace('export default','const component =')+';THREE=engine;return {api:component.methods,setPlayer:p=>player=p}') (THREE);
                  const {root,mixer,gltf}=review,api=controller.api;
                  const actions=Object.fromEntries(Object.entries({idle:'Idle',walk:'Walking_A',run:'Running_A',wave:'Interact'}).map(([key,name])=>[key,mixer.clipAction(gltf.animations.find(c=>c.name===name)).play().setEffectiveWeight(key==='idle'?1:0)]));
                  Object.assign(root.userData,{isGltf:true,mixer,actions});api.getTexture=()=>new THREE.Texture();api.prepareCharacterDeformation(root);root.userData.contactShadow.visible=false;
                  controller.setPlayer(root);api.updatePlayerMixer(0,false,4.1-mixer.time);captureView(0);
                  return root.userData.blinkMeshes.map(m=>({name:m.name,weight:m.morphTargetInfluences[0]}));
                }""",source)
                assert any(m['name'].startswith('Eyelids') for m in blink),blink
                assert any(m['name'].startswith('Lashes') for m in blink),blink
                assert all(m['weight']>.99 for m in blink),blink
                evidence['blink']=blink
                page.screenshot(path=OUT/'after-blink.png')
            assert not errors,errors
        finally:
            (OUT/f'{prefix}-report.json').write_text(json.dumps({**evidence,'errors':errors,'productionAsset':'--release' in sys.argv},indent=2),encoding='utf-8')
            browser.close()

if __name__=='__main__':main()
