"""High-DPI production frames and adaptive resolution/postprocessing agreement.

The CPU stall is fault injection to exercise the real frame-rate policy, not a
device performance measurement. Baselines cannot be overwritten.
"""
import importlib.util
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/street-resolution'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
PROBE = """(() => {
  const descriptor=Object.getOwnPropertyDescriptor(window,'THREE');
  Object.defineProperty(window,'THREE',{...descriptor,set(value){
    descriptor.set(value);
    let Composer;
    Object.defineProperty(value,'EffectComposer',{configurable:true,get:()=>Composer,set(Target){
      Composer=new Proxy(Target,{construct(Type,args){
        const result=new Type(...args),draw=result.render.bind(result);
        result.render=(...params)=>{if(result.passes.some(p=>p.renderTargetBright&&p.enabled))__audit.lastCompose=performance.now();return draw(...params)};
        __audit.composer=result;return result;
      }});
    }});
  }});
  const raf=window.requestAnimationFrame;
  window.__qualityStressUntil=0;
  window.requestAnimationFrame=fn=>raf.call(window,t=>{
    if(performance.now()<__qualityStressUntil){const stop=performance.now()+38;while(performance.now()<stop){}}
    fn(t);
  });
})();"""
STATE = """() => {
  const {renderer:r,composer:c}=__audit, fxaa=c?.passes.find(p=>p.material?.uniforms?.resolution);
  const maps=new Set();__audit.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.map?.userData?.linearSurfaceImage)maps.add(m.map)});
  const surfaceMipmaps=[...maps].map(t=>({mips:t.generateMipmaps,filter:t.minFilter,linear:t.encoding===THREE.LinearEncoding}));
  const frames=__audit.frames.slice(-120),fps=frames.length>1?1000*(frames.length-1)/(frames.at(-1).t-frames[0].t):0;
  return {ratio:r.getPixelRatio(),buffer:[r.domElement.width,r.domElement.height],
    viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,webgl2:r.capabilities.isWebGL2,
    fxaa:fxaa?[1/fxaa.material.uniforms.resolution.value.x,1/fxaa.material.uniforms.resolution.value.y]:null,
    target:c?[c.readBuffer.width,c.readBuffer.height]:null,samples:c?.readBuffer.samples??0,
    postprocessActive:performance.now()-(__audit.lastCompose||0)<500,
    surfaceMipmaps,recentFps:fps,failedPrograms:r.info.programs.filter(p=>p.diagnostics?.runnable===false).length,
    memory:{...r.info.memory},canvases:document.querySelectorAll('#street-canvas canvas').length};
}"""


def assert_resolution(state):
    assert state['canvases'] == 1, state
    assert state['failedPrograms']==0,state
    if not state['webgl2']:
        assert len(state['surfaceMipmaps'])>=10,state
        assert all(m['mips'] and m['linear'] and m['filter']==1008 for m in state['surfaceMipmaps']),state
    for size in ['fxaa', 'target']:
        assert state[size] and all(abs(a-b) <= 1.01 for a,b in zip(state['buffer'],state[size])), (size,state)


def make_comparison():
    if not all((OUT/f'{prefix}-{phase}.png').exists() for prefix in ['before','after'] for phase in ['day','night']):
        return
    sheet=Image.new('RGB',(1224,900),'#f2eadb')
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22)
    small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    draw.text((18,10),'同一 844×390 手机视口 / DPR 3 / 实际帧缓冲局部',font=font,fill='#4d3525')
    for column,prefix in enumerate(['before','after']):
        state=json.loads((OUT/f'{prefix}-report.json').read_text(encoding='utf-8'))
        x=12+column*606
        for row,(phase,label,key) in enumerate([('day','日间','day'),('night','夜景','recovered')]):
            y=48+row*420
            width,height=state[key]['buffer']
            draw.text((x,y),f'{"改进前" if prefix=="before" else "当前"} · {label} · {width}×{height}',font=small,fill='#60422c')
            frame=Image.open(OUT/f'{prefix}-{phase}.png').convert('RGB')
            # Same normalized crop; no sharpening or changes to the source images.
            crop=frame.crop((round(frame.width*.18),round(frame.height*.04),round(frame.width*.54),round(frame.height*.52)))
            sheet.paste(crop.resize((600,370),Image.Resampling.LANCZOS),(x,y+30))
    sheet.save(OUT/'clarity-comparison.jpg',quality=95)
    if (OUT/'before-webgl1-sampling.png').exists() and (OUT/'after-webgl1-night.png').exists():
        legacy=Image.new('RGB',(1224,350),'#f2eadb');labels=ImageDraw.Draw(legacy)
        labels.text((12,8),'WebGL1 材质采样 / 正式场景画面',font=font,fill='#4d3525')
        for column,(name,label) in enumerate([('before-webgl1-sampling.png','修复前：远景纹理闪点'),('after-webgl1-night.png','修复后：正常纹理采样与夜景抗锯齿')]):
            x=12+column*606
            labels.text((x,40),label,font=small,fill='#60422c')
            legacy.paste(Image.open(OUT/name).convert('RGB').resize((600,277),Image.Resampling.LANCZOS),(x,68))
        legacy.save(OUT/'webgl1-sampling-comparison.jpg',quality=95)


def main():
    before='--before' in sys.argv
    webgl1='--webgl1' in sys.argv
    prefix='before' if before else ('after-webgl1' if webgl1 else 'after')
    if before and (OUT/'before-report.json').exists():
        raise RuntimeError('Preserve the original high-DPI baseline.')
    report={};errors=[]
    with sync_playwright() as pw:
        args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']+(['--disable-webgl2'] if webgl1 else [])
        browser=pw.chromium.launch(headless=True,args=args,env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=3,has_touch=True)
        page.add_init_script(audit.depth.PROBE+PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/splash')
            page.locator('.splash-enter-frame').wait_for();page.locator('.splash-enter-frame').tap(force=True)
            page.locator('.role-confirm-token').wait_for();page.wait_for_timeout(800);page.locator('.role-confirm-token').tap(force=True)
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden');page.wait_for_timeout(2000)
            page.locator('.scene-controls__trigger').tap()
            page.locator('.scene-controls__phases > *').nth(1).tap()
            page.locator('.scene-controls__trigger').tap()
            # Allow normal recovery; no forced resolution or camera changes.
            page.wait_for_timeout(28000)
            report['day']=page.evaluate(STATE)
            assert report['day']['webgl2'] is not webgl1,report['day']
            audit.depth.capture_canvas(page,OUT/f'{prefix}-day.png')
            page.screenshot(path=OUT/f'{prefix}-phone.png')
            report['dayPerformance']=audit.depth.performance_sample(page)
            print('Day resolution',report['day'],flush=True)
            page.locator('.scene-controls__trigger').tap()
            page.locator('.scene-controls__phases > *').last.tap()
            page.locator('.scene-controls__trigger').tap();page.wait_for_timeout(6000)
            report['nightBeforeLoad']=page.evaluate(STATE)
            page.evaluate('() => __qualityStressUntil=performance.now()+9000')
            page.wait_for_timeout(9800)
            report['underLoad']=page.evaluate(STATE)
            assert report['underLoad']['ratio']<report['nightBeforeLoad']['ratio']-.1,report
            if before:
                assert report['underLoad']['fxaa'] is None and report['underLoad']['samples']==0,report
            else:
                assert_resolution(report['day']);assert_resolution(report['underLoad'])
            print('Load policy',report['underLoad'],flush=True)
            report['recoverySamples']=[]
            for attempt in range(12):
                page.wait_for_timeout(5000)
                sample=page.evaluate(STATE)
                report['recoverySamples'].append({k:sample[k] for k in ['ratio','recentFps','postprocessActive']})
                if sample['ratio']>=min(report['day']['ratio']-.08,1.65) and sample['postprocessActive'] and sample['recentFps']>50:
                    break
            report['recovered']=page.evaluate(STATE)
            if not before:
                assert_resolution(report['recovered'])
                assert report['recovered']['ratio']>report['underLoad']['ratio']+.15,report
                assert report['day']['ratio']>1.4,report['day']
                assert report['recovered']['postprocessActive'],report['recovered']
            audit.depth.capture_canvas(page,OUT/f'{prefix}-night.png')
            report['nightPerformance']=audit.depth.performance_sample(page)
            print('Recovered',report['recovered'],flush=True)
            if not before:
                report['rotations']=[]
                for width,height in [(390,844),(932,430),(1440,900),(844,390)]:
                    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(500)
                    state=page.evaluate(STATE);assert_resolution(state)
                    report['rotations'].append(state)
                position=page.evaluate(audit.PLAYER);audit.hold(page,'w',550)
                after=page.evaluate(audit.PLAYER)
                assert position['z']-after['z']>.5,(position,after)
                report['movementAfterRecovery']=True
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error)
            page.screenshot(path=OUT/'failure.png')
            raise
        finally:
            report['errors']=errors
            (OUT/f'{prefix}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)
    if not before and not webgl1:
        make_comparison()


if __name__=='__main__':
    main()
