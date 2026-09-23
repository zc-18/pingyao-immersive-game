"""Supplemental overlay, same-page rotation and renderer recovery acceptance."""
import importlib.util
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('journey', ROOT / 'journey-depth-workflow.py')
journey = importlib.util.module_from_spec(spec)
spec.loader.exec_module(journey)
audit = journey.audit
OUT = ROOT / 'artifacts' / 'landscape-depth' / 'edges'

STATE = """({selector,key}) => {
  let c=document.querySelector(selector).__vueParentComponent;
  while(c) { if (key in (c.setupState||{})) return c.setupState[key]; c=c.parent }
  throw Error('missing state '+key);
}"""


def screenshot(page, name):
    page.wait_for_timeout(350)
    page.screenshot(path=OUT / (name + '.png'))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = json.loads((OUT/'report.json').read_text(encoding='utf-8')) if '--from-map' in sys.argv and (OUT/'report.json').exists() else {}
    report.pop('passed',None)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'])
        page = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=3)
        page.add_init_script(audit.PROBE)
        page.add_init_script("window.__rejections=[]; addEventListener('unhandledrejection', e => __rejections.push({name:e.reason?.name,message:e.reason?.message,detail:JSON.stringify(e.reason)}))")
        try:
            audit.mobile.seed_street_state(page)
            for name, selector in [('index','.hub-stage'),('user','.ledger'),('shop','.shop-stage'),('map','.map-stage')]:
                if '--from-map' in sys.argv and name != 'map':
                    continue
                page.evaluate('name => uni.switchTab({url:`/pages/${name}/${name}`})', name)
                page.locator(selector).wait_for()
                rotations = []
                for w,h in [*audit.VIEWS, (390,844)]:
                    page.set_viewport_size({'width':w,'height':h})
                    page.wait_for_timeout(700)
                    metrics = audit.measure(page)
                    assert metrics['width'] <= w+2, (name,w,h,metrics)
                    if w>h and h<=600:
                        assert metrics['height'] <= h+2
                    rotations.append(metrics)
                    if name == 'index' and w>h and h<=600:
                        journey.assert_button(page,'.hub-stage__npc-bar-cta')
                    if name == 'user':
                        page.locator('.ledger__settings-ring').click()
                        screenshot(page,f'settings-{w}x{h}')
                        if w>h and h<=600:
                            journey.assert_button(page,'.ledger__settings-toggle')
                        page.locator('.ledger__settings-toggle').first.click()
                        page.locator('.ledger__settings-toggle').first.click()
                        page.locator('.ledger__settings-ring').click()
                    if name == 'shop':
                        assert metrics['boxes']['.shop-stage__shelves-scroll']['height'] > 100
                        for category in range(page.locator('.shop-stage__category').count()):
                            page.locator('.shop-stage__category').nth(category).click()
                            page.wait_for_timeout(150)
                            for item in {0, page.locator('.shop-stage__product').count()-1}:
                                page.locator('.shop-stage__product').nth(item).click()
                                buy = page.locator('.shop-stage__detail-buy')
                                buy.scroll_into_view_if_needed()
                                if w>h and h<=600:
                                    journey.assert_button(page,'.shop-stage__detail-buy')
                                page.locator('.shop-stage__detail-mask').click(position={'x':2,'y':2},force=True)
                        screenshot(page,f'shop-last-category-{w}x{h}')
                    if name == 'map':
                        page.locator('.map-stage__scope-btn').click()
                        poi_ids = page.evaluate(STATE,{'selector':selector,'key':'mapPoiList'})
                        for i,poi in enumerate(poi_ids):
                            page.locator('.map-stage__poi').nth(i).click(timeout=2500)
                            assert page.evaluate(STATE,{'selector':selector,'key':'selectedPoiId'}) == poi['id']
                            close = page.locator('.map-stage__detail-close')
                            if close.is_visible():
                                close.click()
                            else:
                                page.locator('.map-stage__detail-mask').click(position={'x':2,'y':2},force=True)
                        page.locator('.map-stage__fan-btn').click()
                        for tab in range(2):
                            page.locator('.map-stage__side-tab').nth(tab).click()
                            screenshot(page,f'map-drawer-{tab}-{w}x{h}')
                        page.locator('.map-stage__side-mask').click(position={'x':2,'y':2},force=True)
                        page.locator('.map-stage__scope-btn').click()
                assert rotations[0]['boxes'][selector]['width'] == rotations[-1]['boxes'][selector]['width']
                report[name+'Rotations'] = rotations

            page.set_viewport_size({'width':844,'height':390})
            entries = []
            for entry in range(3):
                page.evaluate("() => uni.navigateTo({url:'/pages_game/street/street'})")
                page.locator('#street-canvas canvas').wait_for(timeout=30000)
                page.wait_for_timeout(4000)
                assert page.evaluate('() => __audit.renderer.getPixelRatio()') <= 1.25
                if entry == 0:
                    page.locator('.street-hud__coin').first.click()
                    for _ in range(3):
                        page.locator('.wardrobe__card').nth(1).click()
                        page.wait_for_timeout(250)
                        page.locator('.wardrobe__card').first.click()
                        page.wait_for_timeout(250)
                    page.locator('.wardrobe__close').click()
                    report['hotOutfitSwaps'] = 6
                    # Synthetic visibility event exercises the browser handler, not an OS background transition.
                    page.evaluate("() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')) }")
                    page.wait_for_timeout(200)
                    paused = page.evaluate('() => __audit.frames.at(-1).t')
                    page.wait_for_timeout(350)
                    assert page.evaluate('() => __audit.frames.at(-1).t') == paused
                    page.evaluate("() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) }")
                    page.wait_for_timeout(350)
                    assert page.evaluate('() => __audit.frames.at(-1).t') > paused
                    report['syntheticVisibilityResume'] = True
                    page.evaluate('() => __audit.renderer.forceContextLoss()')
                    page.wait_for_timeout(500)
                    assert page.evaluate('() => __audit.renderer.getContext().isContextLost()')
                    page.evaluate('() => __audit.renderer.forceContextRestore()')
                    page.wait_for_timeout(1600)
                    assert not page.evaluate('() => __audit.renderer.getContext().isContextLost()')
                    report['webglRestore'] = True
                    audit.capture_canvas(page,OUT/'restored-webgl.png')
                entries.append(page.evaluate('() => ({ratio:__audit.renderer.getPixelRatio(),...__audit.renderer.info.memory,canvases:document.querySelectorAll("#street-canvas canvas").length})'))
                assert entries[-1]['canvases'] == 1
                page.evaluate('() => uni.navigateBack()')
                page.wait_for_timeout(900)
                assert page.locator('#street-canvas canvas').count() == 0
                assert page.evaluate('() => __audit.renderers.every(r=>!r.domElement.isConnected && r.getContext().isContextLost())')
            report['entries'] = entries
            assert entries[-1]['geometries'] == entries[-2]['geometries']
            assert entries[-1]['textures'] == entries[-2]['textures']
            report['passed'] = True
        finally:
            report['unhandledRejections'] = page.evaluate('() => __rejections')
            screenshot(page,'last-state')
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print('Edge workflow passed:',OUT)


if __name__ == '__main__':
    main()
