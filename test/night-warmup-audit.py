"""Measure first night draw and shader blocking separately from startup work."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('courtyard',ROOT/'enclosed-courtyard-audit.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
OUT=ROOT/'artifacts/night-warmup';OUT.mkdir(parents=True,exist_ok=True)
os.environ.update(TEMP=str(OUT),TMP=str(OUT))
PROBE="""(() => {
  window.__warm={draws:[],links:[],composes:[],longTasks:[],stage:'startup'};
  new PerformanceObserver(list=>{for(const e of list.getEntries())__warm.longTasks.push({start:e.startTime,ms:e.duration})}).observe({entryTypes:['longtask']});
  for(const Type of [window.WebGLRenderingContext,window.WebGL2RenderingContext].filter(Boolean)){
    const names=new WeakMap(),programs=new WeakMap();
    const source=Type.prototype.shaderSource,attach=Type.prototype.attachShader,query=Type.prototype.getProgramParameter;
    Type.prototype.shaderSource=function(shader,text){names.set(shader,text.match(/#define SHADER_NAME (\\w+)/)?.[1]||'unnamed');return source.call(this,shader,text)};
    Type.prototype.attachShader=function(program,shader){programs.set(program,names.get(shader));return attach.call(this,program,shader)};
    Type.prototype.getProgramParameter=function(program,key){
      const start=performance.now(),result=query.call(this,program,key),ms=performance.now()-start;
      if(ms>1)__warm.links.push({stage:__warm.stage,name:programs.get(program),parameter:key,ms});return result;
    };
  }
  const descriptor=Object.getOwnPropertyDescriptor(window,'THREE');
  Object.defineProperty(window,'THREE',{...descriptor,set(value){
    descriptor.set(value);
    queueMicrotask(()=>{
      const Renderer=value.WebGLRenderer;
      value.WebGLRenderer=new Proxy(Renderer,{construct(Type,args){
        const r=new Type(...args),render=r.render.bind(r);
        r.render=(world,camera)=>{const start=performance.now(),before=r.info.programs.length;
          const result=render(world,camera),ms=performance.now()-start;
          if(ms>2)__warm.draws.push({stage:__warm.stage,scene:world.isScene===true,material:world.material?.type,target:!!r.getRenderTarget(),ms,addedPrograms:r.info.programs.length-before});
          return result;
        };return r;
      }});
    });
    let Composer;
    Object.defineProperty(value,'EffectComposer',{configurable:true,get:()=>Composer,set(Type){
      Composer=new Proxy(Type,{construct(Class,args){const c=new Class(...args),render=c.render.bind(c);__warm.composer=c;
        c.render=(...args)=>{const start=performance.now(),result=render(...args);__warm.composes.push({stage:__warm.stage,ms:performance.now()-start,glow:c.passes.some(p=>p.renderTargetBright&&p.enabled)});return result};return c;
      }});
    }});
  }});
})();"""


def main():
    before='--before' in sys.argv;webgl1='--webgl1' in sys.argv
    prefix='before' if before else 'after-webgl1' if webgl1 else 'after'
    if before and (OUT/'before-report.json').exists():raise RuntimeError('Preserve the original warmup baseline')
    report={};errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']+(['--disable-webgl2'] if webgl1 else []),env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},has_touch=True)
        page.add_init_script(audit.depth.PROBE+PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for();page.locator('.splash-enter-frame').tap(force=True)
            page.locator('.role-confirm-token').wait_for();page.wait_for_timeout(800);page.locator('.role-confirm-token').tap(force=True)
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden');page.wait_for_timeout(1200)
            page.locator('.scene-controls__trigger').tap();page.locator('.scene-controls__phases > *').nth(1).tap();page.wait_for_timeout(2600)
            for label in ['first-night','second-night']:
                if label=='second-night':
                    page.locator('.scene-controls__phases > *').nth(1).tap();page.wait_for_timeout(2800)
                page.evaluate('label=>__warm.stage=label',label)
                page.locator('.scene-controls__phases > *').last.tap();page.wait_for_timeout(3500)
                page.evaluate("() => __warm.stage='between'")
            data=page.evaluate('() => ({draws:__warm.draws,links:__warm.links,composes:__warm.composes,longTasks:__warm.longTasks,webgl2:__audit.renderer.capabilities.isWebGL2})')
            (OUT/f'{prefix}-events.json').write_text(json.dumps(data),encoding='utf-8')
            report['webgl2']=data['webgl2']
            for stage in ['startup','first-night','second-night']:
                draws=[x for x in data['draws'] if x['stage']==stage]
                links=[x for x in data['links'] if x['stage']==stage]
                composes=[x['ms'] for x in data['composes'] if x['stage']==stage]
                report[stage]={'worstDrawMs':max([x['ms'] for x in draws],default=0),'worstComposeMs':max(composes,default=0),
                    'glowFrames':sum(x.get('glow',False) for x in data['composes'] if x['stage']==stage),
                    'programsAdded':sum(x['addedPrograms'] for x in draws),'slowLinks':sorted(links,key=lambda x:x['ms'],reverse=True)[:8],
                    'slowDraws':sorted(draws,key=lambda x:x['ms'],reverse=True)[:8]}
                print(stage,report[stage],flush=True)
            assert report['webgl2'] is not webgl1
            if before:assert report['first-night']['worstComposeMs']>700,report
            else:
                assert report['first-night']['worstComposeMs']<250,report
                assert report['first-night']['glowFrames']>20,'Night glow must actually render; skipping it cannot count as a speedup'
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error);raise
        finally:
            report['errors']=errors
            (OUT/f'{prefix}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
