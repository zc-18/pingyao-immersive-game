"""Exercise the detailed avatar, user controls and quest through a local H5 browser."""
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("depth", ROOT / "landscape-depth-audit.py")
depth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(depth)
OUT = ROOT / "artifacts" / "scene-refinement"
PLAYER = """() => {
  const p=window.__audit.scene?.children.find(o=>o.userData.isGltf);
  return p && p.userData.isGltf ? {x:p.position.x,z:p.position.z,model:p.userData.modelVersion,
    weights:Object.fromEntries(Object.entries(p.userData.actions).map(([k,a])=>[k,a.getEffectiveWeight()]))} : null;
}"""


def wait_character(page):
    page.wait_for_function(PLAYER, timeout=120000, polling=200)
    page.wait_for_timeout(1200)


def capture(page, name):
    depth.capture_canvas(page, OUT / f"{name}-canvas.png")
    page.screenshot(path=OUT / f"{name}.png")
    stat = ImageStat.Stat(Image.open(OUT / f"{name}-canvas.png").convert("RGB"))
    assert max(stat.var) > 80, (name, stat.var)
    return {"mean": stat.mean, "variance": stat.var}


def hold(page, key, ms):
    page.keyboard.down(key)
    page.wait_for_timeout(ms)
    page.keyboard.up(key)
    page.wait_for_timeout(180)


def approach(page, axis, target):
    for _ in range(90):
        if page.locator('.street-stage__poi-paper').is_visible():
            return
        delta = target - page.evaluate(PLAYER)[axis]
        if abs(delta) < .25:
            return
        key = ('d' if delta > 0 else 'a') if axis == 'x' else ('s' if delta > 0 else 'w')
        hold(page, key, 120)
    raise AssertionError(f"Could not approach {axis}={target}: {page.evaluate(PLAYER)}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'])
        page = browser.new_page(viewport={"width": 844, "height": 390}, device_scale_factor=1)
        page.add_init_script(depth.PROBE)
        errors = []
        page.on('pageerror', lambda e: errors.append(e.message))
        try:
            page.goto(depth.mobile.BASE_URL)
            page.locator('.splash-enter-frame').click()
            page.locator('.role-confirm-token').wait_for()
            page.wait_for_timeout(900)
            page.locator('.role-confirm-token').click()
            wait_character(page)
            page.wait_for_timeout(4000)
            report['entry'] = page.evaluate(PLAYER)
            assert report['entry']['model'] == 4
            report['performance'] = depth.performance_sample(page)
            print('Performance:', report['performance'], flush=True)

            approach(page, 'z', 7)
            approach(page, 'x', -3.5)
            page.locator('.street-stage__poi-paper').wait_for(timeout=6000)
            before = page.evaluate(PLAYER)
            hold(page, 'd', 500)
            after = page.evaluate(PLAYER)
            assert abs(after['x']-before['x']) < .08
            report['overlayBlocksMovement'] = True
            capture(page, 'poi')
            page.locator('.street-stage__poi-action').first.click()
            page.locator('.street-stage__poi-investigate').click()
            page.locator('.reward-stage__claim').wait_for(timeout=6000)
            capture(page, 'reward')
            page.locator('.reward-stage__claim').click()
            progress = page.evaluate("() => uni.getStorageSync('pygc_user_progress')")
            assert progress['steps'] > 0
            assert 'rishengchang' in progress['visitedPoiIds']
            assert 'main-rishengchang' in progress['questData']['completedQuests']
            report['quest'] = {'steps': progress['steps'], 'silver': progress['silver'], 'completed': progress['questData']['completedQuests']}
            if page.locator('.street-stage__poi-close').is_visible():
                page.locator('.street-stage__poi-close').click()
            page.wait_for_timeout(1200)
            if page.evaluate("() => uni.getStorageSync('pygc_runtime').currentStreetScene") != depth.SCENES[0]:
                page.locator('.street-stage__switch-arrow').first.click()
                wait_character(page)
            print('Quest and input isolation passed', flush=True)

            page.locator('.scene-controls__trigger').click()
            report['phases'] = {}
            for index, key in enumerate(['morning', 'noon', 'dusk', 'night']):
                page.locator('.scene-controls__phases > *').nth(index).click()
                page.wait_for_timeout(2400)
                report['phases'][key] = capture(page, key)
            diff = ImageStat.Stat(ImageChops.difference(Image.open(OUT/'noon-canvas.png'), Image.open(OUT/'night-canvas.png'))).mean
            assert sum(diff) > 20
            report['dayNightPixelDifference'] = diff
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.locator('.scene-controls__modes > *').nth(1).click()
            page.wait_for_timeout(1300)
            page.set_viewport_size({'width':1440,'height':900})
            page.wait_for_timeout(800)
            capture(page, 'desktop-character')
            page.locator('[aria-label="拱手致意"]').click()
            page.wait_for_timeout(240)
            gesture = page.evaluate(PLAYER)
            assert gesture['weights']['wave'] > .5, gesture
            report['gesture'] = gesture['weights']
            capture(page, 'character-gesture')
            page.locator('[aria-label="镜头归位"]').click()
            page.locator('.scene-controls__trigger').click()

            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_timeout(900)
            metrics = depth.mobile.page_metrics(page)
            depth.mobile.assert_fits_viewport('portrait-final', metrics)
            trigger = page.locator('.scene-controls__trigger')
            assert trigger.evaluate('el => {const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
            capture(page, 'portrait-final')
            trigger.click()
            capture(page, 'portrait-controls')
            trigger.click()

            page.set_viewport_size({'width':844,'height':390})
            report['streets'] = {}
            for scene in depth.SCENES[1:]:
                page.locator('.street-stage__switch-arrow').last.click()
                page.wait_for_function("s => uni.getStorageSync('pygc_runtime').currentStreetScene===s", arg=scene)
                wait_character(page)
                initial = page.evaluate(PLAYER)
                hold(page, 'w', 650)
                moved = page.evaluate(PLAYER)
                assert abs(initial['z']-moved['z']) > .15, (scene, initial, moved)
                report['streets'][scene] = capture(page, scene)
                print('Scene passed:', scene, flush=True)
            cycles = []
            for cycle in range(3):
                for _ in range(5):
                    page.locator('.street-stage__switch-arrow').last.click()
                    wait_character(page)
                cycles.append(page.evaluate('() => ({...window.__audit.renderer.info.memory,canvas:document.querySelectorAll("#street-canvas canvas").length})'))
            assert cycles[1] == cycles[2], cycles
            report['resourceCycles'] = cycles
            report['passed'] = True
        finally:
            report['errors'] = errors
            report['diagnostics'] = page.evaluate('''() => ({stats:document.querySelector('#street-canvas canvas')?.dataset.sceneStats,
              frames:window.__audit.frames.length,scene:window.__audit.scene?.name,
              children:window.__audit.scene?.children.map(o=>({name:o.name,type:o.type,keys:Object.keys(o.userData)}))})''')
            page.screenshot(path=OUT/'last-state.png')
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(f'PASS: {OUT}', flush=True)


if __name__ == '__main__':
    main()
