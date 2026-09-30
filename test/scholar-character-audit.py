"""Inspect the current human GLB in the actual game, including input and resizing.

Run with the dev server on 5219. --portraits captures only the fixed close views.
Evidence and browser temporary files stay inside this project.
"""
import importlib.util
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'artifacts/scholar-character'
PLAYER = "window.__audit.scene.children.find(o=>o.userData.isGltf)"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ.update(TEMP=str(OUT.resolve()), TMP=str(OUT.resolve()))
    spec = importlib.util.spec_from_file_location('depth', ROOT / 'landscape-depth-audit.py')
    depth = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(depth)
    errors = []
    report = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=[
            '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page.add_init_script(depth.PROBE)
        page.on('pageerror', lambda error: errors.append(error.message))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        try:
            page.goto('http://127.0.0.1:5219/#/splash', wait_until='domcontentloaded', timeout=60000)
            page.locator('.splash-enter-frame').wait_for(timeout=60000)
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({
                pygc_user_profile:{roleId:'study',roleName:'研学者'},
                pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}
              })) {
                const raw=JSON.parse(localStorage.getItem(key));
                Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
              window.__pygc.navigation.navigateTo('/street');
            }""")
            page.wait_for_function(f"() => {PLAYER.replace('.scene.children', '.scene?.children')}?.userData.modelVersion === 5", timeout=120000)
            page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
            page.wait_for_timeout(1600)
            report['model'] = page.evaluate(f"""() => {{
              const p={PLAYER};window.__scholarPlayer=p;
              let triangles=0;const materials={{}};
              p.traverseVisible(o=>{{if(o.isMesh){{
                triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
                const m=o.material;materials[m.name]={{roughness:m.roughness,bump:!!m.bumpMap,normal:!!m.normalMap}};
              }}}});
              return {{rig:p.userData.rigType,triangles,materials}};
            }}""")
            assert report['model']['rig'] == 'human'
            page.keyboard.press('c')
            page.evaluate("""() => {
              const a=__audit,r=a.renderer,draw=r.render.bind(r);
              a.portraitView=[.14,1.72,1.0,0,1.67,.02];
              r.render=(s,c)=>{
                if(s===a.scene && a.portraitView){
                  const p=window.__scholarPlayer,v=a.portraitView;p.updateMatrixWorld(true);
                  c.fov=30;c.updateProjectionMatrix();
                  c.position.copy(p.localToWorld(new THREE.Vector3(...v.slice(0,3))));
                  c.lookAt(p.localToWorld(new THREE.Vector3(...v.slice(3))));
                }
                return draw(s,c);
              };
            }""")
            page.locator('.scene-controls__trigger').click()
            for i, phase in enumerate(['dawn', 'noon', 'dusk', 'night']):
                page.locator('.scene-controls__phases > *').nth(i).click()
                page.wait_for_timeout(2400)
                depth.capture_canvas(page, OUT / f'face-{phase}.png')
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.locator('.scene-controls__trigger').click()
            page.evaluate('() => { __audit.portraitView=[.78,1.72,.78,0,1.67,.02] }')
            page.wait_for_timeout(2400)
            depth.capture_canvas(page, OUT / 'face-three-quarter.png')
            page.evaluate('() => { __audit.portraitView=[.6,1.35,3.8,0,1.02,0] }')
            page.wait_for_timeout(900)
            depth.capture_canvas(page, OUT / 'full-body.png')
            if '--portraits' not in sys.argv:
                # Unlock only this isolated browser save, then use the actual
                # wardrobe UI to exercise the three exported sleeve variants.
                page.evaluate("""() => {
                  const key='pygc_user_progress', raw=JSON.parse(localStorage.getItem(key));
                  Object.assign(raw.data??raw,{exp:100000,ownedCostumes:['escort-garb']});
                  localStorage.setItem(key,JSON.stringify(raw));
                }""")
                report['costumes'] = []
                for name, sleeve in [('书生襕衫','sl_wide'),('镖师劲装','sl_narrow'),('布衣行客','sl_formal')]:
                    page.keyboard.press('i')
                    card = page.locator('.wardrobe__card').filter(has=page.locator('.wardrobe__name', has_text=name))
                    card.click()
                    page.locator('.wardrobe__close').click()
                    page.wait_for_timeout(500)
                    visible = page.evaluate("() => ['sl_wide','sl_narrow','sl_formal'].filter(n=>__scholarPlayer.getObjectByName(n).visible)")
                    assert visible == [sleeve], (name,visible)
                    report['costumes'].append({'name':name,'sleeve':sleeve})
                    depth.capture_canvas(page, OUT / f'costume-{sleeve}.png')
                page.keyboard.press('g')
                page.wait_for_timeout(850)
                report['greetingWeight'] = page.evaluate('() => __scholarPlayer.userData.actions.wave.getEffectiveWeight()')
                assert report['greetingWeight'] > .9
                depth.capture_canvas(page, OUT / 'greeting.png')
                page.wait_for_timeout(3500)
                assert page.evaluate('() => !__scholarPlayer.userData.actions.wave.isScheduled()')
                page.evaluate('() => { __audit.portraitView=null;__audit.camera.fov=50;__audit.camera.updateProjectionMatrix() }')
                page.keyboard.press('c')
                page.keyboard.press('r')
                page.wait_for_timeout(800)
                before = page.evaluate('() => __scholarPlayer.position.toArray()')
                page.keyboard.down('w')
                page.wait_for_timeout(800)
                page.keyboard.down('Shift')
                page.wait_for_timeout(700)
                depth.capture_canvas(page, OUT / 'running.png')
                page.keyboard.up('Shift')
                page.keyboard.up('w')
                page.wait_for_timeout(600)
                after = page.evaluate('() => __scholarPlayer.position.toArray()')
                report['travelDistance'] = sum((after[i]-before[i])**2 for i in [0,2])**.5
                assert report['travelDistance'] > 1
                report['views'] = []
                for width, height in [(1440,900),(844,390),(667,375),(390,844)]:
                    page.set_viewport_size({'width':width,'height':height})
                    page.wait_for_timeout(1300)
                    state = page.evaluate("""() => ({
                      width:innerWidth,height:innerHeight,
                      canvasCount:document.querySelectorAll('#street-canvas canvas').length,
                      aspect:__audit.camera.aspect,
                      overflow:document.documentElement.scrollWidth>innerWidth,
                      lost:__audit.renderer.getContext().isContextLost()
                    })""")
                    assert state['canvasCount'] == 1 and not state['overflow'] and not state['lost'], state
                    assert abs(state['aspect'] - width/height) < .02, state
                    report['views'].append(state)
                    page.screenshot(path=OUT / f'game-{width}x{height}.png')
                report['performance'] = depth.performance_sample(page)
                page.evaluate("() => window.__pygc.navigation.switchTab('/home')")
                page.wait_for_timeout(800)
                t0 = page.evaluate('() => __scholarPlayer.userData.mixer.time')
                page.wait_for_timeout(700)
                assert page.evaluate('() => __scholarPlayer.userData.mixer.time') == t0
                page.evaluate("() => window.__pygc.navigation.navigateTo('/street')")
                page.locator('#street-canvas canvas').wait_for(state='visible')
                page.wait_for_timeout(1000)
                assert page.evaluate(f'() => {PLAYER} === __scholarPlayer')
                assert page.evaluate('() => __scholarPlayer.userData.mixer.time') > t0
                report['cacheResume'] = True
            assert not errors, errors
            report['passed'] = True
        finally:
            report['errors'] = errors
            (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()
    print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
