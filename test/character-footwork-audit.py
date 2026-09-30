"""Measure rendered shoe vertices during real keyboard locomotion in the production page."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('motion', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/character-footwork'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))

PROBE = """() => {
  const a=__audit, render=a.renderer.render;
  window.__footwork={frames:[],enabled:false};
  let last=-1;
  a.renderer.render=function(...args) {
    const result=render.apply(this,args), p=a.scene?.children.find(o=>o.userData.isGltf);
    if(!__footwork.enabled || !p?.userData.footPlant || a.tick===last)return result;
    last=a.tick;
    const mesh=p.getObjectByName('Detail_Soles'), point=new THREE.Vector3();
    const feet={l:{x:0,y:Infinity,z:0,n:0},r:{x:0,y:Infinity,z:0,n:0}};
    mesh.skeleton.update();
    for(let i=0;i<mesh.geometry.attributes.position.count;i++) {
      const name=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getX(i)].name;
      const f=feet[name.endsWith('l')?'l':'r'];
      point.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,point).applyMatrix4(mesh.matrixWorld);
      f.x+=point.x;f.z+=point.z;f.y=Math.min(f.y,point.y);f.n++;
    }
    for(const leg of p.userData.footPlant.feet)Object.assign(feet[leg.side],{weight:leg.weight,contact:leg.wasContact,anchor:leg.anchor.toArray()});
    for(const f of Object.values(feet)){f.x/=f.n;f.z/=f.n;}
    __footwork.frames.push({t:a.tick,feet,x:p.position.x,z:p.position.z,drop:p.userData.footPlant.pelvisDrop,
      run:p.userData.actions.run.getEffectiveWeight(),flight:p.userData.airborneLift,
      npc:a.scene.children.filter(o=>o.userData.kind==='rigged-pedestrian').map(n=>({feet:n.userData.footPlant?.feet.length,locked:n.userData.footPlant?.feet.some(f=>f.weight>.95),blink:n.userData.blinkMeshes?.[0]?.morphTargetInfluences?.[0]||0}))});
    return result;
  };
}"""

def summarize(frames):
    import math
    planted_speeds = []
    contact_speeds = []
    for prev, now in zip(frames, frames[1:]):
        dt=(now['t']-prev['t'])/1000
        if dt<=0:continue
        for side in ['l','r']:
            before=prev['feet'][side]; after=now['feet'][side]
            speed=math.hypot(after['x']-before['x'],after['z']-before['z'])/dt
            if before['y']<.094 and after['y']<.094:contact_speeds.append(speed)
            if before['weight']>.999 and after['weight']>.999 and before['contact'] and after['contact'] and before['anchor']==after['anchor']:planted_speeds.append(speed)
    return {'frames':len(frames),'minimumSoleY':min(f['y'] for s in frames for f in s['feet'].values()),
        'plantedPairs':len(planted_speeds),'maxPlantedSpeed':max(planted_speeds,default=0),
        'meanContactSpeed':sum(contact_speeds)/max(1,len(contact_speeds)),
        'maximumPelvisDrop':max(s['drop'] for s in frames),'maximumFlight':max(s['flight'] for s in frames),
        'npcLockFrames':sum(any(n['locked'] for n in s['npc']) for s in frames),
        'npcBlinkPeak':max(n['blink'] for s in frames for n in s['npc'])}

def main():
    report={};errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=1)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto('http://localhost:5219/#/street')
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.locator('.scene-controls__trigger').click()
            page.wait_for_timeout(2000)
            page.evaluate(PROBE)
            page.keyboard.down('w');page.wait_for_timeout(700)
            for mode in ['walk','run']:
                if mode=='run':
                    page.locator('.scene-controls__trigger').click();page.locator('.scene-controls__modes > *').first.click();page.locator('.scene-controls__trigger').click()
                    page.wait_for_timeout(500)
                page.evaluate('() => {__footwork.frames=[];__footwork.enabled=true}')
                page.wait_for_timeout(2200)
                frames=page.evaluate('() => {__footwork.enabled=false;return __footwork.frames}')
                values=summarize(frames);report[mode]=values
                assert values['frames']>35,values
                assert values['minimumSoleY']>.0825,values
                assert values['plantedPairs']>5 and values['maxPlantedSpeed']<.01,values
                assert all(all(n['feet']==2 for n in s['npc']) for s in frames),frames[-1]
                assert values['maximumPelvisDrop']<=.0351,values
                assert values['maximumFlight']<.001 if mode=='walk' else values['maximumFlight']>.15,values
                audit.depth.capture_canvas(page,OUT/f'{mode}-planted.png')
            assert max(report[mode]['npcBlinkPeak'] for mode in ['walk','run'])>.8,report
            page.keyboard.up('w')
            page.wait_for_function("() => {const d=__audit.scene.children.find(o=>o.userData.isGltf).userData;return d.footPlant.feet.every(f=>f.weight<.001)&&d.actions.idle.getEffectiveWeight()>.99}",timeout=2500)
            stopped=page.evaluate("() => {const p=__audit.scene.children.find(o=>o.userData.isGltf);return {weights:p.userData.footPlant.feet.map(f=>f.weight),idle:p.userData.actions.idle.getEffectiveWeight()}}")
            assert max(stopped['weights'])<.001 and stopped['idle']>.99,stopped
            report['stopped']=stopped
            # Actual reversal and rear-boundary approach. A visible POI card must not
            # be mistaken for a collision stopping movement.
            page.locator('.scene-controls__trigger').click();page.locator('.scene-controls__modes > *').first.click();page.locator('.scene-controls__trigger').click()
            page.evaluate("() => __audit.scene.children.find(o=>o.userData.isGltf).position.set(0,.083,0)")
            page.keyboard.down('s');page.wait_for_timeout(500);page.keyboard.up('s')
            page.keyboard.down('w');page.wait_for_timeout(800);page.keyboard.up('w')
            page.evaluate("() => __audit.scene.children.find(o=>o.userData.isGltf).position.set(0,.083,16)")
            if page.locator('.street-stage__poi-close').is_visible():page.locator('.street-stage__poi-close').click()
            page.wait_for_timeout(500)
            assert not page.locator('.street-stage__poi-paper').is_visible()
            page.locator('.scene-controls__trigger').click()
            page.locator('[aria-label="镜头归位"]').click()
            page.locator('.scene-controls__trigger').click()
            page.keyboard.down('s');page.wait_for_timeout(2500)
            a=page.evaluate(audit.PLAYER);page.wait_for_timeout(600);b=page.evaluate(audit.PLAYER)
            page.keyboard.up('s');page.wait_for_timeout(700)
            assert 19.45<a['z']<19.51 and not page.locator('.street-stage__poi-paper').is_visible(),a
            # Camera-relative input may slide along the boundary; its normal must block.
            assert abs(a['z']-b['z'])<.001 and abs(b['x'])<5.65,(a,b)
            page.wait_for_function("() => __audit.scene.children.find(o=>o.userData.isGltf).userData.footPlant.feet.every(f=>f.weight<.001)",timeout=2500)
            audit.depth.capture_canvas(page,OUT/'rear-boundary-stop.png')
            report['rearBoundaryStop']={'before':a,'after':b}
            # Performance is sampled after the vertex probe is disabled.
            report['performance']=audit.depth.performance_sample(page)
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(700)
            audit.depth.mobile.assert_fits_viewport('footwork-portrait',audit.depth.mobile.page_metrics(page))
            framing=page.evaluate("""() => {
              const p=__audit.scene.children.find(o=>o.userData.isGltf),point=new THREE.Vector3();let x=0,y=0;
              p.updateMatrixWorld(true);__audit.camera.updateMatrixWorld(true);
              p.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();
                for(let i=0;i<mesh.geometry.attributes.position.count;i++){
                  point.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,point).applyMatrix4(mesh.matrixWorld).project(__audit.camera);
                  x=Math.max(x,Math.abs(point.x));y=Math.max(y,Math.abs(point.y));
                }});
              return {x,y,fov:__audit.camera.fov};
            }""")
            assert framing['x']<.95 and framing['y']<.95,framing
            report['portraitFraming']=framing
            page.screenshot(path=OUT/'portrait.png')
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error);raise
        finally:
            report['errors']=errors
            (OUT/'runtime.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
