"""Desktop/mobile WebGL acceptance, using an isolated save and browser profile."""
import importlib.util
import base64
import io
import json
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'artifacts' / 'resume-web-game'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('depth', ROOT / 'landscape-depth-audit.py')
depth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(depth)
BASE = 'http://127.0.0.1:5219/#/'
PLAYER = "() => {const p=__audit.scene.children.find(o=>o.userData.isGltf);return {x:p.position.x,z:p.position.z,idle:p.userData.actions.idle.getEffectiveWeight(),run:p.userData.actions.run.getEffectiveWeight()}}"

def instrument_model_failure(route):
    response = route.fetch()
    source = response.text()
    marker = '} catch (_) { /* 程序化角色已经可玩，模型失败无需打断加载。 */ }'
    assert marker in source
    source = source.replace(marker, "} catch (error) { window.__audit.modelFailure = error.stack || String(error); console.warn('[audit character loading]', window.__audit.modelFailure); }")
    route.fulfill(response=response, body=source)

def hold(page, key, ms):
    page.keyboard.down(key)
    page.wait_for_timeout(ms)
    page.keyboard.up(key)
    page.wait_for_timeout(350)

def acceptance(page, report):
    page.locator('[aria-label="镜头归位"]').click()
    page.locator('.scene-controls__trigger').click()
    before=page.evaluate(PLAYER)
    hold(page,'w',1000)
    walked=before['z']-page.evaluate(PLAYER)['z']
    before=page.evaluate(PLAYER)
    page.keyboard.down('Shift')
    page.keyboard.down('w')
    page.wait_for_timeout(900)
    running=page.evaluate(PLAYER)
    depth.capture_canvas(page,OUT/'running.png')
    page.keyboard.up('w');page.keyboard.up('Shift');page.wait_for_timeout(800)
    assert walked>.7 and before['z']-running['z']>walked*1.4,(walked,before,running)
    assert running['run']>.9,running
    assert page.evaluate(PLAYER)['idle']>.98
    report['keyboardGaits']={'walkDistance':walked,'runDistance':before['z']-running['z'],'runWeight':running['run']}
    # Loss of window focus releases movement and sprint, without a phantom held key.
    page.keyboard.down('Shift');page.keyboard.down('w');page.wait_for_timeout(200)
    page.evaluate("() => window.dispatchEvent(new Event('blur'))")
    page.keyboard.up('w');page.keyboard.up('Shift');page.wait_for_timeout(800)
    stopped=page.evaluate(PLAYER);page.wait_for_timeout(300)
    assert abs(stopped['z']-page.evaluate(PLAYER)['z'])<.01
    page.keyboard.press('Escape');page.locator('.street-settings').wait_for()
    before=page.evaluate(PLAYER);hold(page,'w',400)
    assert abs(before['z']-page.evaluate(PLAYER)['z'])<.01
    page.keyboard.press('Escape');page.locator('.street-settings').wait_for(state='hidden')
    page.keyboard.press('i');page.locator('.wardrobe').wait_for()
    card=page.locator('.wardrobe__card').filter(has_text='账房青衫')
    card.click();page.wait_for_timeout(350)
    assert page.evaluate("() => window.__pygc.readStorage('pygc_user_progress').equippedCostume")=='ledger-clerk'
    page.screenshot(path=OUT/'wardrobe.png')
    page.keyboard.press('Escape');page.locator('.wardrobe').wait_for(state='hidden')
    page.keyboard.press('c');page.wait_for_timeout(1600)
    depth.capture_canvas(page,OUT/'hanfu-portrait.png')
    # Record a short real-time gesture sequence for review.
    page.keyboard.press('g');page.wait_for_timeout(600)
    depth.capture_canvas(page,OUT/'greeting.png')
    page.keyboard.press('r');page.wait_for_timeout(900)
    # Complete the first main quest with physical travel and UI actions.
    spec=importlib.util.spec_from_file_location('courtyard',ROOT/'enclosed-courtyard-audit.py')
    courtyard=importlib.util.module_from_spec(spec);spec.loader.exec_module(courtyard)
    courtyard.approach(page,'z',7);courtyard.approach(page,'x',-3.6)
    page.locator('.street-stage__poi-paper').wait_for(timeout=10000)
    page.keyboard.press('Escape');page.locator('.street-stage__poi-paper').wait_for(state='hidden')
    page.keyboard.press('e');page.locator('.street-stage__poi-paper').wait_for()
    page.locator('.street-stage__poi-action').first.click()
    page.locator('.street-stage__poi-investigate').click()
    page.locator('.reward-stage__claim').wait_for(timeout=10000)
    page.screenshot(path=OUT/'quest-reward.png')
    page.locator('.reward-stage__claim').click();page.wait_for_timeout(1800)
    progress=page.evaluate("() => window.__pygc.readStorage('pygc_user_progress')")
    assert 'main-rishengchang' in progress['questData']['completedQuests']
    assert progress['steps']>0
    report['quest']={'completed':progress['questData']['completedQuests'],'steps':progress['steps']}
    if page.locator('.street-stage__poi-close').is_visible():page.locator('.street-stage__poi-close').click()
    # Five distinct scenes, keeping one WebGL canvas on each transition.
    report['scenes']=[]
    for _ in range(5):
        page.locator('.street-stage__switch-arrow').last.click()
        page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
        page.wait_for_function("__audit.scene?.children.some(o=>o.userData.rigType==='human' && o.userData.isGltf)",timeout=30000)
        page.wait_for_timeout(900)
        scene=page.evaluate("() => window.__pygc.readStorage('pygc_runtime').currentStreetScene")
        report['scenes'].append(scene)
        assert page.locator('#street-canvas canvas').count()==1
        depth.capture_canvas(page,OUT/f'scene-{scene}.png')
    assert len(set(report['scenes']))==5
    report['viewports']=[]
    for w,h in [(1920,1080),(1366,768),(1024,768),(844,390),(390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(600)
        depth.mobile.assert_fits_viewport(f'{w}x{h}',depth.mobile.page_metrics(page))
        page.screenshot(path=OUT/f'viewport-{w}x{h}.png')
        report['viewports'].append([w,h])
    page.set_viewport_size({'width':1440,'height':900})
    report['performance']=depth.performance_sample(page)
    page.reload()
    page.wait_for_function("__audit.scene?.children.some(o=>o.userData.isGltf)",timeout=60000)
    progress=page.evaluate("() => window.__pygc.readStorage('pygc_user_progress')")
    assert 'main-rishengchang' in progress['questData']['completedQuests']
    assert progress['equippedCostume']=='ledger-clerk'
    # Normal tab navigation uses the same persistent save.
    report['tabs']={}
    for name,selector in [('index','.hub-stage'),('map','.map-stage'),('shop','.shop-stage'),('user','.ledger')]:
        page.evaluate("url=>window.__pygc.navigation.switchTab({url})",('/home' if name == 'index' else f'/{name}'))
        page.locator(selector).wait_for();page.wait_for_timeout(1000)
        report['tabs'][name]=depth.measure(page)
        assert report['tabs'][name]['width']<=1442
        page.screenshot(path=OUT/f'tab-{name}.png')
        if name=='shop':
            page.locator('.shop-stage__product').first.click()
            page.locator('.shop-stage__detail').wait_for()
            page.screenshot(path=OUT/'tab-shop-detail.png')
            page.locator('.shop-stage__detail-close').click()
    report['passed']=True

def motion_previews(page):
    page.locator('[aria-label="镜头归位"]').click()
    page.locator('.scene-controls__trigger').click()
    for mode in ['walk','run']:
        frames=[]
        if mode=='run':page.keyboard.down('Shift')
        page.keyboard.down('w')
        for _ in range(16):
            page.wait_for_timeout(65)
            page.evaluate('() => {__audit.capture=null;__audit.captureNext=true}')
            page.wait_for_function('() => __audit.capture')
            frame=Image.open(io.BytesIO(base64.b64decode(page.evaluate('() => __audit.capture').split(',')[1]))).convert('RGB')
            w,h=frame.size
            frame=frame.crop((int(w*.32),int(h*.32),int(w*.68),int(h*.88)))
            frame.thumbnail((480,500))
            frames.append(frame)
        page.keyboard.up('w');page.keyboard.up('Shift');page.wait_for_timeout(600)
        frames[0].save(OUT/f'{mode}.gif',save_all=True,append_images=frames[1:],duration=100,loop=0)

def main():
    errors = []
    warnings = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
        page.add_init_script(depth.PROBE)
        page.route(re.compile(r'/src/pages_game/street/street-renderer\.js(?:\?.*)?$'), instrument_model_failure)
        page.add_init_script("window.__readGameStorage = key => window.__pygc.readStorage(key)")
        page.on('pageerror', lambda error: errors.append(error.message))
        page.on('console', lambda message: warnings.append(message.text) if message.type in ('warning','error') else None)
        page.goto(BASE + 'splash')
        page.locator('.splash-enter-frame').wait_for()
        page.wait_for_timeout(2600)
        page.screenshot(path=OUT/'splash.png')
        page.locator('.splash-enter-frame').click()
        page.locator('.role-confirm-token').wait_for(timeout=20000)
        page.wait_for_timeout(900)
        page.screenshot(path=OUT/'roles.png')
        page.locator('.role-confirm-token').click()
        try:
            page.wait_for_function('window.__audit.scene?.children.some(o=>o.userData.isGltf) || window.__audit.modelFailure', timeout=60000)
            assert not page.evaluate('() => __audit.modelFailure'), page.evaluate('() => __audit.modelFailure')
        except Exception:
            page.screenshot(path=OUT/'initial-failure.png')
            print(json.dumps({'errors':errors,'warnings':warnings[-10:],'initial':page.evaluate("() => ({url:location.href,text:document.body.innerText,renderer:!!__audit.renderer,loader:!!THREE.GLTFLoader,scene:__audit.scene?.children.map(o=>({name:o.name,type:o.type,userData:o.userData?.isGltf})),loading:__pygc.page?.setupState?.isLoading})")},ensure_ascii=False),flush=True)
            browser.close()
            raise
        page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
        page.wait_for_timeout(2500)
        page.screenshot(path=OUT/'street.png')
        page.locator('.scene-controls__trigger').click()
        page.locator('.scene-controls__phases > *').nth(1).click()
        page.locator('.scene-controls__modes > *').nth(1).click()
        page.wait_for_timeout(2000)
        depth.capture_canvas(page, OUT/'portrait.png')
        state = page.evaluate('''() => {
          const p=__audit.scene.children.find(o=>o.userData.isGltf), d=p.userData;
          return {rig:d.rigType,groundSamples:d.groundSamples?.length||0,feet:d.footPlant?.feet.length||0,
            scale:p.scale.x,actions:Object.fromEntries(Object.entries(d.actions).map(([k,a])=>[k,a.getClip().name])),
            frames:__audit.frames.slice(-60)};
        }''')
        state.pop('frames')
        try:
            if '--motion' in sys.argv: motion_previews(page)
            if '--quick' not in sys.argv: acceptance(page,state)
            assert not errors,errors
        except Exception as error:
            state['failure']=repr(error)
            page.screenshot(path=OUT/'failure.png')
            raise
        finally:
            state['errors'] = errors
            report_name='motion-report.json' if '--motion' in sys.argv else 'preview-report.json' if '--quick' in sys.argv else 'report.json'
            (OUT/report_name).write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps({k:v for k,v in state.items() if k!='tabs'},ensure_ascii=False),flush=True)
            browser.close()

if __name__=='__main__': main()
