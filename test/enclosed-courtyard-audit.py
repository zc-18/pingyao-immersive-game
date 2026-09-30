"""Actual WebGL evidence for enclosure, adult rig, touch controls and quest flow."""
import sys
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('depth',ROOT/'landscape-depth-audit.py')
depth=importlib.util.module_from_spec(spec); spec.loader.exec_module(depth)
OUT=ROOT/'artifacts/enclosed-courtyard'
PLAYER="() => { const p=window.__audit.scene.children.find(o=>o.userData.isGltf); return {x:p.position.x,y:p.position.y,z:p.position.z,rotation:p.rotation.y} }"

def wait_player(page):
    page.wait_for_function('window.__audit.scene?.children.some(o=>o.userData.modelVersion===5)',timeout=120000)
    page.wait_for_timeout(800)

def hold(page,key,ms):
    page.keyboard.down(key);page.wait_for_timeout(ms);page.keyboard.up(key);page.wait_for_timeout(120)

def approach(page,axis,target):
    for _ in range(100):
        if page.locator('.street-stage__poi-paper').is_visible(): return
        delta=target-page.evaluate(PLAYER)[axis]
        if abs(delta)<.22: return
        key=('d' if delta>0 else 'a') if axis=='x' else ('s' if delta>0 else 'w')
        hold(page,key,130)
    raise AssertionError(f'Blocked approach {axis}={target}: {page.evaluate(PLAYER)}')

def finish_journey(page,report):
    for poi,quest,interaction in [('county-office','main-county-office','talk'),('mingqing-street','main-market-crossing','investigate')]:
        wait_player(page)
        page.locator('.brush-loader').wait_for(state='hidden',timeout=20000)
        target=page.evaluate("id=>{const o=window.__audit.scene.children.find(o=>o.userData.poiId===id);return {x:o.position.x,z:o.position.z}}",poi)
        for _ in range(250):
            if page.locator('.street-stage__poi-paper').is_visible():
                active=page.evaluate("() => window.__readGameStorage('pygc_runtime').currentPoiId")
                if active==poi:break
                page.locator('.street-stage__poi-close').click()
            pos=page.evaluate(PLAYER)
            dz=target['z']-pos['z']
            # Walk down the clear center, then approach the door. Do not insist
            # on walking through the NPC's yielding position in the side aisle.
            approach_x=0 if abs(dz)>.8 else target['x']*.6
            dx=approach_x-pos['x']
            if abs(dx)>(.8 if abs(dz)>.8 else .2):hold(page,'d' if dx>0 else 'a',140)
            elif abs(dz)>.4:hold(page,'s' if dz>0 else 'w',160)
            else:hold(page,'d' if dx>0 else 'a',100)
        else:raise AssertionError(f'Unreachable main quest: {poi}')
        if interaction=='talk':page.locator('.street-stage__poi-action').first.click()
        else:page.locator('.street-stage__poi-investigate').click()
        page.locator('.reward-stage__claim').wait_for(timeout=6000)
        page.screenshot(path=OUT/f'{quest}-reward.png');page.locator('.reward-stage__claim').click();page.wait_for_timeout(1200)
        if page.locator('.street-stage__poi-close').is_visible():page.locator('.street-stage__poi-close').click()
        progress=page.evaluate("() => window.__readGameStorage('pygc_user_progress')")
        assert quest in progress['questData']['completedQuests'],progress
    report['journey']={'completed':progress['questData']['completedQuests'],'steps':progress['steps'],'silver':progress['silver']}
    print('All three main quests completed with physical movement',flush=True)

def full_checks(page,report):
    # Physical movement from spawn to the first quest, using the same UI as a player.
    approach(page,'z',7);approach(page,'x',-3.6)
    page.locator('.street-stage__poi-paper').wait_for(timeout=6000)
    before=page.evaluate(PLAYER);hold(page,'d',500);after=page.evaluate(PLAYER)
    assert abs(after['x']-before['x'])<.08
    page.locator('.street-stage__poi-action').first.click();page.locator('.street-stage__poi-investigate').click()
    page.locator('.reward-stage__claim').wait_for(timeout=6000)
    page.screenshot(path=OUT/'quest-reward.png');page.locator('.reward-stage__claim').click();page.wait_for_timeout(1000)
    progress=page.evaluate("() => window.__readGameStorage('pygc_user_progress')")
    assert 'main-rishengchang' in progress['questData']['completedQuests'] and progress['steps']>0
    report['quest']={'steps':progress['steps'],'completed':progress['questData']['completedQuests'],'silver':progress['silver']}
    if page.locator('.street-stage__poi-close').is_visible():page.locator('.street-stage__poi-close').click()
    if '--journey' in sys.argv:
        finish_journey(page,report)
        return
    # Five scenes; central gallery route, actual shell, all POI approach bands.
    report['scenes']={}
    for _ in range(5):
        page.locator('.street-stage__switch-arrow').last.click();wait_player(page)
        name=page.evaluate("() => window.__readGameStorage('pygc_runtime').currentStreetScene")
        before=page.evaluate(PLAYER);hold(page,'w',600);after=page.evaluate(PLAYER)
        assert before['z']-after['z']>.6,(name,before,after)
        report['scenes'][name]=page.evaluate("() => ({shell:!!window.__audit.scene.getObjectByName('closed-courtyard'),canvases:document.querySelectorAll('#street-canvas canvas').length})")
        depth.capture_canvas(page,OUT/f'{name}.png')
    print('Quest and five enclosed scenes passed',flush=True)
    # CDP sends genuine simultaneous touchscreen contacts, followed by cancellation.
    cdp=page.context.new_cdp_session(page)
    before=page.evaluate(PLAYER)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':165,'y':260,'id':1},{'x':540,'y':240,'id':2}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':165,'y':211,'id':1},{'x':485,'y':240,'id':2}]})
    page.wait_for_timeout(700)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(650)
    after=page.evaluate(PLAYER);assert ((after['x']-before['x'])**2+(after['z']-before['z'])**2)**.5>.35
    page.wait_for_timeout(500);stopped=page.evaluate(PLAYER)
    assert abs(stopped['x']-after['x'])+abs(stopped['z']-after['z'])<.1
    report['dualTouchAndCancel']=True
    # Keep the camera near the sealed rear wall and rotate through a complete circle.
    page.evaluate("() => { const p=window.__audit.scene.children.find(o=>o.userData.isGltf); p.position.set(0,.08,19); }")
    for i in range(5):
        page.mouse.move(560,230);page.mouse.down();page.mouse.move(305,230,steps=15);page.mouse.up();page.wait_for_timeout(350)
        camera=page.evaluate('() => window.__audit.camera.position.toArray()')
        assert -25.5<camera[2]<20.8 and abs(camera[0])<6.7,camera
    depth.capture_canvas(page,OUT/'closed-rear-gate.png')
    report['wallCameraOrbit']=True
    # Rotate six phone/desktop sizes and verify tappable scene control targets.
    for w,h in depth.VIEWS:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500)
        depth.mobile.assert_fits_viewport(f'{w}x{h}',depth.mobile.page_metrics(page))
        button=page.locator('.scene-controls__trigger')
        assert button.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
        page.screenshot(path=OUT/f'viewport-{w}x{h}.png')
    report['viewports']=depth.VIEWS
    page.set_viewport_size({'width':844,'height':390})
    page.locator('.scene-controls__trigger').click()
    for i,name in enumerate(['dawn','noon','dusk','night']):
        page.locator('.scene-controls__phases > *').nth(i).click();page.wait_for_timeout(2200)
        depth.capture_canvas(page,OUT/f'phase-{name}.png')
    page.locator('.scene-controls__trigger').click()
    cycles=[]
    for cycle in range(3):
        for _ in range(5):page.locator('.street-stage__switch-arrow').last.click();wait_player(page)
        cycles.append(page.evaluate('() => ({...window.__audit.renderer.info.memory,canvas:document.querySelectorAll("#street-canvas canvas").length})'))
    assert cycles[1]==cycles[2],cycles
    report['resourceCycles']=cycles
    page.reload();wait_player(page)
    saved=page.evaluate("() => window.__readGameStorage('pygc_user_progress')")
    assert 'main-rishengchang' in saved['questData']['completedQuests']
    report['reloadPreservesQuest']=True
    print('Touch, orbit, rotation, phases, resource cycles and save reload passed',flush=True)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    __import__('os').environ.update({'TEMP':str(OUT),'TMP':str(OUT)})
    report={}
    with sync_playwright() as p:
        # Place the browser's temporary profile and trace files inside the project.
        browser=p.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env={**__import__('os').environ,'TEMP':str(OUT),'TMP':str(OUT)})
        page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        page.set_default_navigation_timeout(120000)
        page.add_init_script(depth.PROBE)
        page.add_init_script("window.__readGameStorage = key => window.__pygc.readStorage(key)")
        errors=[]; page.on('pageerror',lambda e:(errors.append(e.message),print(e.message,flush=True)))
        page.on('requestfailed',lambda r: print('REQUEST FAILED',r.url,r.failure,flush=True))
        if '--full' in sys.argv or '--release' in sys.argv:
            page.goto(depth.mobile.BASE_URL)
            page.locator('.splash-enter-frame').wait_for();page.locator('.splash-enter-frame').click(force=True)
            page.locator('.role-confirm-token').wait_for();page.wait_for_timeout(800)
            page.locator('.role-confirm-token').click(force=True);wait_player(page);page.wait_for_timeout(4000)
        else:
            depth.mobile.seed_street_state(page)
            page.goto(depth.mobile.BASE_URL+'/#/street');wait_player(page)
        page.locator('.scene-controls__trigger').click()
        page.locator('.scene-controls__phases > *').nth(1).click()
        page.wait_for_timeout(2400)
        depth.capture_canvas(page,OUT/'courtyard-noon.png'); page.screenshot(path=OUT/'desktop.png')
        page.locator('.scene-controls__modes > *').nth(1).click()
        page.wait_for_timeout(1500)
        depth.capture_canvas(page,OUT/'adult-character.png')
        page.locator('[aria-label="拱手致意"]').click();page.wait_for_timeout(650)
        depth.capture_canvas(page,OUT/'greeting.png')
        page.locator('[aria-label="镜头归位"]').click()
        page.locator('.scene-controls__trigger').click()
        page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(1000)
        report['performance']=depth.performance_sample(page)
        depth.capture_canvas(page,OUT/'phone-courtyard.png');page.screenshot(path=OUT/'phone-ui.png')
        if '--full' in sys.argv:
            try: full_checks(page,report)
            except Exception:
                page.screenshot(path=OUT/'failure.png')
                (OUT/'failure-state.txt').write_text(page.locator('body').inner_text(),encoding='utf-8')
                (OUT/'failure-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
                raise
        report['errors']=errors
        report['geometry']=page.evaluate('''() => {
          const a=window.__audit, player=a.scene.children.find(o=>o.userData.isGltf);
          const maps=[];a.scene.traverse(o=>{if(o.material?.map&&!maps.some(m=>m.id===o.material.map.id))maps.push({id:o.material.map.id,src:o.material.map.image?.src,w:o.material.map.image?.width,h:o.material.map.image?.height})});
          return {maps,model:player.userData.modelVersion,position:player.position.toArray(),shell:!!a.scene.getObjectByName('closed-courtyard'),render:a.renderer.info.render,memory:a.renderer.info.memory};
        }''')
        name='report-journey.json' if '--journey' in sys.argv else 'report-release.json' if '--release' in sys.argv else 'report-full.json' if '--full' in sys.argv else 'preview-report.json'
        (OUT/name).write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False),flush=True)
        browser.close()

if __name__=='__main__': main()
