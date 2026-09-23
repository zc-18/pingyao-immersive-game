"""Exercise failed production loads, retry, scene arrival and WebGL recovery."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/loading-recovery'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://localhost:5219'
READ = "key=>{const v=JSON.parse(localStorage.getItem(key));return v?.data??v}"


def seed(page):
    page.goto(BASE+'/#/pages_game/splash/splash')
    page.locator('.splash-enter-frame').wait_for()
    page.evaluate("""() => {
      const patches={pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}};
      for(const [key,patch] of Object.entries(patches)) {
        const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
      }
    }""")


def main():
    report={};errors=[];baseline='--before' in sys.argv
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=1,has_touch=True)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            seed(page)
            page.route('**/static/libs/three.min.js',lambda route:route.abort())
            page.goto(BASE+'/#/pages_game/street/street')
            page.wait_for_timeout(16000)
            report['failedLoad']={'loader':page.locator('.brush-loader').is_visible(),'canvases':page.locator('#street-canvas canvas').count()}
            page.screenshot(path=OUT/('before-failure.png' if baseline else 'failure.png'))
            if baseline:
                assert report['failedLoad']=={'loader':False,'canvases':0},report
                return
            assert report['failedLoad']=={'loader':True,'canvases':0},report
            assert page.evaluate(READ,'pygc_user_progress')['visitedSceneIds']==[]
            assert page.get_by_role('button',name='重新加载').is_visible()
            assert page.get_by_role('button',name='返回古城').is_visible()
            assert 'http:' not in page.locator('.brush-loader').inner_text()
            for width,height in [(667,375),(390,844)]:
                page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
                for name in ['重新加载','返回古城']:
                    button=page.get_by_role('button',name=name)
                    bounds=button.bounding_box()
                    assert bounds['height']>=44 and bounds['y']>=0 and bounds['y']+bounds['height']<=height,(name,bounds)
                    assert button.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
                page.screenshot(path=OUT/f'failure-{width}x{height}.png')
            page.set_viewport_size({'width':844,'height':390})
            page.unroute('**/static/libs/three.min.js')
            page.get_by_role('button',name='重新加载').tap()
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
            assert page.locator('#street-canvas canvas').count()==1
            before=page.evaluate(audit.PLAYER);audit.hold(page,'w',700);after=page.evaluate(audit.PLAYER)
            assert before['z']-after['z']>.6,(before,after)
            report['retryPlayable']=True
            audit.depth.capture_canvas(page,OUT/'recovered.png')
            # Resume at the second main quest, then force the first draw of its
            # target courtyard to fail. Dispatch alone must not count as arrival.
            page.evaluate("""() => {
              const raw=JSON.parse(localStorage.getItem('pygc_user_progress')),p=raw.data??raw;
              p.questData.completedQuests=['main-rishengchang'];p.questData.claimedQuests=['main-rishengchang'];
              p.questData.activeQuests=[];p.questData.questProgress={};
              localStorage.setItem('pygc_user_progress',JSON.stringify(raw));
            }""")
            # Let the actual hub settle achievements earned by the seeded completed
            # quest before measuring the separate arrival/recovery transaction.
            page.goto(BASE+'/#/pages/index/index');page.locator('.hub-stage').wait_for()
            page.goto(BASE+'/#/pages_game/street/street')
            # This fixture changed storage outside the game. Hash navigation can
            # reuse the earlier street instance and its already tracked quest;
            # reload the document so onLoad reads the seeded second-quest save.
            page.reload()
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden')
            # Verify the fixture is active before injecting a first-draw failure.
            page.wait_for_function("""() => {
              const raw=JSON.parse(localStorage.getItem('pygc_user_progress')),p=raw?.data??raw;
              return p?.questData?.activeQuests?.includes('main-county-office');
            }""",timeout=10000)
            before=page.evaluate(READ,'pygc_user_progress')
            assert before['questData']['questProgress']['main-county-office']['objectives'][0]['current']==0,before
            page.evaluate("""() => {
              const render=__audit.renderer.render;
              __audit.renderer.render=function(...args){
                if(window.__failDraw && args[0]?.isScene && args[0].children.some(o=>o.userData.poiId==='county-office'))throw new Error('Injected first courtyard draw failure');
                return render.apply(this,args);
              };
              window.__failDraw=true;
            }""")
            page.locator('.street-stage__switch-arrow').last.click()
            page.get_by_role('button',name='重新加载').wait_for()
            failed=page.evaluate(READ,'pygc_user_progress')
            assert failed['questData']['questProgress']['main-county-office']['objectives'][0]['current']==0,failed
            assert failed['silverKey']==before['silverKey'],(before,failed)
            assert 'south-avenue' not in failed['visitedSceneIds'],failed
            page.screenshot(path=OUT/'failed-arrival.png')
            page.get_by_role('button',name='重新加载').tap()
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden')
            recovered=page.evaluate(READ,'pygc_user_progress')
            assert recovered['questData']['questProgress']['main-county-office']['objectives'][0]['current']==1,recovered
            assert recovered['silverKey']==before['silverKey']+5,(before,recovered)
            assert 'south-avenue' in recovered['visitedSceneIds'],recovered
            report['arrivalOnlyAfterFrame']=True
            # A restored context must resume drawing without granting arrival twice.
            page.evaluate('() => __audit.renderer.forceContextLoss()')
            page.get_by_role('button',name='重新加载').wait_for()
            page.evaluate('() => __audit.renderer.forceContextRestore()')
            page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
            returned=page.evaluate(READ,'pygc_user_progress')
            assert returned['silverKey']==recovered['silverKey'],(recovered,returned)
            assert page.locator('#street-canvas canvas').count()==1
            report['contextRestoreNoDuplicateReward']=True
            page.evaluate('() => __audit.renderer.forceContextLoss()')
            page.get_by_role('button',name='返回古城').tap()
            page.locator('.hub-stage').wait_for()
            assert page.evaluate(READ,'pygc_user_progress')['silverKey']==recovered['silverKey']
            report['returnPreservesSave']=True
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error)
            report['failureProgress']=page.evaluate(READ,'pygc_user_progress')
            report['failureRuntime']=page.evaluate(READ,'pygc_runtime')
            page.screenshot(path=OUT/'failure-recheck.png')
            raise
        finally:
            report['errors']=errors
            (OUT/('before-report.json' if baseline else 'report.json')).write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
