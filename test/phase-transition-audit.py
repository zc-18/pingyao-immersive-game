"""Production light/material continuity, interrupted transitions and night interaction."""
import importlib.util
import base64
import io
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('courtyard',ROOT/'enclosed-courtyard-audit.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
OUT=ROOT/'artifacts/phase-transition'
OUT.mkdir(parents=True,exist_ok=True)
os.environ.update(TEMP=str(OUT),TMP=str(OUT))
COMPOSER="""(() => {
  const descriptor=Object.getOwnPropertyDescriptor(window,'THREE');
  Object.defineProperty(window,'THREE',{...descriptor,set(value){
    descriptor.set(value);let Composer;
    Object.defineProperty(value,'EffectComposer',{configurable:true,get:()=>Composer,set(Target){
      Composer=new Proxy(Target,{construct(Type,args){
        const c=new Type(...args),render=c.render.bind(c);__audit.composer=c;
        c.render=(...args)=>{if(c.passes.some(p=>p.renderTargetBright&&p.enabled))__audit.lastCompose=performance.now();return render(...args)};return c;
      }});
    }});
  }});
})();"""
PROBE="""() => {
  window.__phaseFrames=[];window.__phaseState=()=>{
    const a=__audit,p=a.scene.children.find(o=>o.userData.isGltf),found={};
    a.scene.traverse(o=>{
      for(const [key,flag,property] of [['lamp','isBuildingLantern','emissiveIntensity'],['window','isWindowGlow','emissiveIntensity'],['shell','isLanternShell','emissiveIntensity'],['halo','isLanternHalo','opacity'],['pool','isLanternPool','opacity'],['cloud','isCloudLayer','opacity']])
        if(o.userData[flag]&&o.material&&found[key]===undefined)found[key]=o.material[property];
    });
    p?.traverse(o=>{if(o.material?.envMapIntensity!==undefined&&found.env===undefined)found.env=o.material.envMapIntensity});
    const grade=a.composer?.passes.find(p=>p.uniforms?.warmth),bloom=a.composer?.passes.find(p=>p.strength!==undefined);
    const particles=a.scene.children.filter(o=>o.isPoints);
    return {time:performance.now(),...found,warmth:grade?.uniforms.warmth.value,effectAmount:grade?.uniforms.effectAmount?.value,bloom:bloom?.strength,
      particleCount:particles.length,particle:particles[0]?.userData.kind,particleOpacity:particles[0]?.material.opacity,
      composed:performance.now()-(a.lastCompose||0)<40};
  };
  const r=__audit.renderer,draw=r.render.bind(r);
  r.render=(world,camera)=>{
    if(world===__audit.scene&&window.__phaseRecording)__phaseFrames.push(__phaseState());
    const result=draw(world,camera);
    const capture=window.__phaseCapture;
    if(world===__audit.scene&&capture&&__phaseState().effectAmount>=capture.next/5-0.000001){
      const index=capture.next++;
      queueMicrotask(()=>capture.images.push({index,png:r.domElement.toDataURL('image/png')}));
      if(capture.next===6)window.__phaseCapture=null;
    }
    return result;
  };
}"""


def analyze(frames):
    keys=['lamp','window','shell','halo','pool','cloud','env','warmth']
    jumps={k:0 for k in keys}
    for a,b in zip(frames,frames[1:]):
        for k in keys:
            if k in a and k in b:jumps[k]=max(jumps[k],abs(a[k]-b[k]))
    return {'frames':len(frames),'maxJumps':jumps,'first':frames[0],'last':frames[-1]}


def choose(page,index):
    page.locator('.scene-controls__phases > *').nth(index).tap()


def verify_release(page,report,prefix):
    choose(page,3)
    # Observe actual adaptive recovery after initial shader compilation, without forcing the composer.
    page.wait_for_function('() => performance.now()-(__audit.lastCompose||0)<300 && __phaseState().effectAmount>.999',timeout=60000)
    page.wait_for_timeout(600)
    report['nightPostprocess']=page.evaluate('__phaseState()')
    assert report['nightPostprocess']['composed']
    page.evaluate('() => {__phaseFrames=[__phaseState()];__phaseRecording=true}')
    choose(page,1);page.wait_for_timeout(2900);page.evaluate('() => __phaseRecording=false')
    frames=page.evaluate('__phaseFrames')
    assert sum(f['composed'] and .05<f.get('effectAmount',0)<.95 for f in frames)>15,frames
    assert frames[-1]['effectAmount']==0 and frames[-1]['bloom']==0,frames[-1]
    report['postprocessFade']={'composedTransitionFrames':sum(f['composed'] for f in frames),'endedAtZero':True}
    (OUT/f'{prefix}-postprocess-frames.json').write_text(json.dumps(frames),encoding='utf-8')
    cycles=[]
    for _ in range(3):
        for index in [3,1,2,0]:choose(page,index);page.wait_for_timeout(90)
        choose(page,1);page.wait_for_timeout(2600)
        cycles.append(page.evaluate('() => ({...__audit.renderer.info.memory,canvases:document.querySelectorAll("#street-canvas canvas").length,particles:__audit.scene.children.filter(o=>o.isPoints).length})'))
    assert cycles[1]==cycles[2] and cycles[2]['canvases']==1 and cycles[2]['particles']==1,cycles
    report['rapidSwitchResources']=cycles
    page.evaluate('() => {window.__phaseImages=[];window.__phaseCapture={images:__phaseImages,next:0}}')
    choose(page,3);page.wait_for_function('__phaseImages.length===6',timeout=15000)
    shots=page.evaluate('__phaseImages')
    sheet=Image.new('RGB',(1440,504),'#f2eadb')
    for shot in shots:
        index=shot['index'];x=index%3*480;y=index//3*252
        frame=Image.open(io.BytesIO(base64.b64decode(shot['png'].split(',')[1]))).convert('RGB')
        sheet.paste(frame.resize((480,222),Image.Resampling.LANCZOS),(x,y+30))
        ImageDraw.Draw(sheet).text((x+12,y+9),f'Night light blend / {index*20}%',fill='#4d3525')
    sheet.save(OUT/f'{prefix}-night-sequence.jpg',quality=94)
    page.wait_for_timeout(200)
    page.locator('.scene-controls__trigger').tap()
    for w,h in [(390,844),(667,375),(932,430),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500)
        audit.depth.mobile.assert_fits_viewport(f'{w}x{h}',audit.depth.mobile.page_metrics(page))
        page.screenshot(path=OUT/f'{prefix}-night-{w}x{h}.png')
    report['nightViewports']=[[390,844],[667,375],[932,430],[844,390]]
    # Reach and finish a quest using real movement under the final night lighting.
    audit.approach(page,'z',7);audit.approach(page,'x',-3.6)
    page.locator('.street-stage__poi-paper').wait_for(timeout=6000)
    page.locator('.street-stage__poi-action').first.tap();page.locator('.street-stage__poi-investigate').tap()
    page.locator('.reward-stage__claim').wait_for(timeout=6000)
    page.screenshot(path=OUT/f'{prefix}-night-reward.png');page.locator('.reward-stage__claim').tap()
    audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden')
    progress=page.evaluate("() => {const x=JSON.parse(localStorage.getItem('pygc_user_progress'));return x.data??x}")
    assert 'main-rishengchang' in progress['questData']['completedQuests'],progress
    report['nightQuest']={'completed':progress['questData']['completedQuests'],'steps':progress['steps'],'silver':progress['silver']}
    assert page.evaluate('() => __audit.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)')


def main():
    before='--before' in sys.argv;webgl1='--webgl1' in sys.argv
    prefix='before' if before else 'after-webgl1' if webgl1 else 'after'
    if before and (OUT/'before-report.json').exists():raise RuntimeError('Preserve the original phase baseline')
    report={};errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']+(['--disable-webgl2'] if webgl1 else []),env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},has_touch=True)
        page.add_init_script(audit.depth.PROBE+COMPOSER)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/splash')
            page.locator('.splash-enter-frame').wait_for();page.locator('.splash-enter-frame').tap(force=True)
            page.locator('.role-confirm-token').wait_for();page.wait_for_timeout(800);page.locator('.role-confirm-token').tap(force=True)
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden');page.wait_for_timeout(1800)
            page.locator('.scene-controls__trigger').tap();choose(page,1);page.wait_for_timeout(2600)
            page.evaluate(PROBE)
            report['webgl2']=page.evaluate('__audit.renderer.capabilities.isWebGL2')
            assert report['webgl2'] is not webgl1
            for label,target in [('to-night',3),('to-noon',1),('interrupted',3)]:
                page.evaluate('() => {__phaseFrames=[__phaseState()];__phaseRecording=true}')
                choose(page,target)
                if label=='interrupted':
                    page.wait_for_timeout(620);choose(page,2);page.wait_for_timeout(420);choose(page,1)
                page.wait_for_timeout(2700)
                if not before:
                    page.wait_for_function('night => {const s=__phaseState();return Math.abs(s.env-(night ? .16 : .36))<.000001&&Math.abs(s.lamp-(night ? .72 : .08))<.000001}',arg=label=='to-night',timeout=15000)
                page.evaluate('() => __phaseRecording=false')
                frames=page.evaluate('() => __phaseFrames')
                (OUT/f'{prefix}-{label}-frames.json').write_text(json.dumps(frames),encoding='utf-8')
                report[label]=analyze(frames)
                print(label,report[label]['maxJumps'],flush=True)
                audit.depth.capture_canvas(page,OUT/f'{prefix}-{label}.png')
            if before:assert report['to-night']['maxJumps']['env']>.15,report
            else:
                for key in ['to-night','to-noon','interrupted']:
                    for property in ['lamp','window','shell','halo','pool','cloud','env']:
                        assert report[key]['maxJumps'][property]<.055,(key,property,report[key])
                    last=report[key]['last'];night=key=='to-night'
                    assert abs(last['env']-(.16 if night else .36))<.001,last
                    assert abs(last['lamp']-(.72 if night else .08))<.001,last
                    assert last['particleCount']==1,last
                verify_release(page,report,prefix)
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error);page.screenshot(path=OUT/'failure.png');raise
        finally:
            report['errors']=errors
            (OUT/f'{prefix}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
