"""Hardware-browser workflow, rotation, phase and resource-lifetime checks."""
import importlib.util
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("audit", ROOT / "landscape-depth-audit.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
OUT = ROOT / "artifacts" / "landscape-depth" / "workflow"

COMMAND = """({action,data}) => {
  const state=window.__pygc.page.setupState;
  if (action === 'applyPhase') return state.selectScenePhase(data.phase.key);
  // street.vue forwards synchronously to streetRenderer.methods.onSceneCmd.
  if (typeof state.sendToRenderer !== "function") throw Error("Street command API unavailable");
  return state.sendToRenderer(action,data);
}"""
PLAYER = """() => {
  let player;
  window.__audit.scene.traverse(o => { if(o.userData.leftLeg) player=o });
  return player ? {x:player.position.x,z:player.position.z} : null;
}"""


def capture(page, name):
    page.wait_for_timeout(650)
    page.screenshot(path=OUT / f"{name}.png")


def assert_button(page, selector):
    loc = page.locator(selector).first
    box = loc.bounding_box()
    assert box and box["width"] >= 43 and box["height"] >= 43, (selector, box)
    viewport = page.viewport_size
    assert box["y"] >= -1 and box["y"] + box["height"] <= viewport["height"] + 1, (selector, box)
    assert loc.evaluate("el => {const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}")


def walk_to(page, axis, target):
    for _ in range(100):
        p = page.evaluate(PLAYER)
        delta = target - p[axis]
        if abs(delta) < 0.3:
            break
        key = ("d" if delta > 0 else "a") if axis == "x" else ("s" if delta > 0 else "w")
        page.keyboard.down(key)
        page.wait_for_timeout(100)
        page.keyboard.up(key)
    page.wait_for_timeout(200)
    assert abs(page.evaluate(PLAYER)[axis] - target) < 0.8


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        page = browser.new_page(viewport={"width":844,"height":390}, device_scale_factor=1)
        page.add_init_script(audit.PROBE)
        errors = []
        page.on("pageerror", lambda e: errors.append({"message":e.message,"stack":e.stack}))
        try:
            page.goto(audit.mobile.BASE_URL)
            page.locator('.splash-enter-frame').wait_for()
            page.locator('.splash-enter-frame').click()
            page.locator('.role-confirm-token').wait_for()
            page.wait_for_timeout(800)
            page.locator('.role-confirm-token').click()
            page.locator('#street-canvas canvas').wait_for(timeout=30000)
            page.wait_for_timeout(4500)
            report['roleSelected'] = page.evaluate("() => window.__pygc.readStorage('pygc_user_profile').roleId")
            assert report['roleSelected']
            capture(page, '01-role-entry')
            # Actual keyboard movement triggers proximity, quest events and persisted steps.
            walk_to(page, 'z', 7)
            walk_to(page, 'x', -3.5)
            page.locator('.street-stage__poi-paper').wait_for(timeout=5000)
            capture(page, '02-poi-before')
            page.locator('.street-stage__poi-tool').first.click()
            capture(page, '02-poi-favorite')
            page.locator('.street-stage__poi-action').first.click()
            page.locator('.street-stage__poi-investigate').click()
            page.locator('.reward-stage__claim').wait_for(timeout=5000)
            capture(page, '02-quest-reward')
            page.locator('.reward-stage__claim').click()
            page.wait_for_timeout(1000)
            progress = page.evaluate("() => window.__pygc.readStorage('pygc_user_progress')")
            report['questAndSteps'] = progress
            assert progress['steps'] > 0
            assert 'rishengchang' in progress['visitedPoiIds']
            # Existing contract pays on completion; the popup acknowledges the award.
            assert 'main-rishengchang' in progress['questData']['completedQuests']
            assert progress['silver'] >= 318
            assert not page.locator('.reward-stage__claim').count()

            # Phase changes travel through the same scene command path as the game clock.
            phases = page.evaluate("async () => (await import('/src/common/utils/phase.js')).PHASES")
            for key, phase in phases.items():
                page.evaluate(COMMAND, {"action":"applyPhase","data":{"phase":phase}})
                page.wait_for_timeout(800)
                canvas_file = OUT / f'phase-{key}.png'
                audit.capture_canvas(page, canvas_file)
                stat = ImageStat.Stat(Image.open(canvas_file).convert('RGB'))
                report['phase-' + key] = {'mean':stat.mean,'variance':stat.var}
                assert max(stat.var) > 80
            page.evaluate(COMMAND, {"action":"applyPhase","data":{"phase":phases['noon']}})

            # Pause/resume commands, visibility changes and viewport rotation in one session.
            page.evaluate(COMMAND, {"action":"pause","data":{}})
            page.wait_for_timeout(200)
            paused = page.evaluate('() => window.__audit.frames.at(-1).t')
            page.wait_for_timeout(400)
            assert page.evaluate('() => window.__audit.frames.at(-1).t') == paused
            page.evaluate(COMMAND, {"action":"resume","data":{}})
            page.wait_for_timeout(400)
            assert page.evaluate('() => window.__audit.frames.at(-1).t') > paused
            report['pauseResume'] = True
            for w,h in audit.VIEWS:
                page.set_viewport_size({'width':w,'height':h})
                capture(page, f'rotate-{w}x{h}')
                metrics = audit.mobile.page_metrics(page)
                audit.mobile.assert_fits_viewport(f'rotate-{w}x{h}', metrics)
                assert len(metrics['canvases']) == 1
                canvas = page.locator('#street-canvas canvas')
                a,b = OUT/f'canvas-{w}x{h}.png', OUT/f'canvas-{w}x{h}-moved.png'
                audit.capture_canvas(page,a)
                page.keyboard.down('w'); page.wait_for_timeout(250); page.keyboard.up('w')
                audit.capture_canvas(page,b)
                audit.mobile.assert_nonblank_and_changed(a,b)
            page.set_viewport_size({'width':844,'height':390})

            # Three complete cycles: texture cache may warm once, then must plateau.
            cycles = []
            for cycle in range(3):
                for _ in range(5):
                    page.locator('.street-stage__switch-arrow').last.click()
                    page.wait_for_timeout(800)
                cycles.append(page.evaluate('() => ({...window.__audit.renderer.info.memory, canvases:document.querySelectorAll("#street-canvas canvas").length, lights:window.__audit.scene.children.filter(o=>o.isLight).length})'))
            report['sceneCycles'] = cycles
            assert cycles[1] == cycles[2], cycles
            assert cycles[2]['canvases'] == 1
            assert cycles[2]['lights'] <= 5

            # Cached page navigation must pause the street and resume a single renderer.
            page.evaluate("() => window.__pygc.navigation.navigateTo({url:'/dialog'})")
            page.wait_for_timeout(800)
            paused = page.evaluate('() => window.__audit.frames.at(-1).t')
            page.wait_for_timeout(400)
            assert page.evaluate('() => window.__audit.frames.at(-1).t') == paused
            page.evaluate('() => window.__pygc.navigation.navigateBack()')
            page.wait_for_timeout(600)
            assert page.locator('#street-canvas canvas').count() == 1
            report['navigateBackResume'] = True

            page.evaluate("() => window.__pygc.navigation.switchTab({url:'/user'})")
            page.locator('.ledger').wait_for()
            for w,h in audit.VIEWS:
                page.set_viewport_size({'width':w,'height':h})
                page.locator('.ledger__tryon').click()
                capture(page, f'wardrobe-{w}x{h}')
                if w>h and h<=600:
                    assert_button(page,'.wardrobe__close')
                page.locator('.wardrobe__card').nth(1).click()
                page.locator('.wardrobe__close').click()
                page.locator('.achievement-wall__item').first.click()
                capture(page, f'achievement-{w}x{h}')
                if w>h and h<=600:
                    assert_button(page,'.achievement-wall__detail-close')
                    assert page.locator('.achievement-wall__detail-name').bounding_box()['y'] >= 0
                page.locator('.achievement-wall__detail-close').click()
            page.set_viewport_size({'width':844,'height':390})
            page.locator('.check-in-card__btn').click()
            assert page.evaluate("() => window.__pygc.readStorage('pygc_user_progress').checkIn.totalDays") == 1
            report['equippedCostume'] = page.evaluate("() => window.__pygc.readStorage('pygc_user_progress').equippedCostume")
            assert report['equippedCostume'] != 'commoner'
            page.evaluate("() => window.__pygc.navigation.switchTab({url:'/shop'})")
            page.locator('.shop-stage__product').first.click()
            assert_button(page,'.shop-stage__detail-buy')
            page.locator('.shop-stage__detail-buy').click()
            page.locator('.redeem-stage__voucher').wait_for(timeout=10000)
            for w,h in audit.VIEWS:
                page.set_viewport_size({'width':w,'height':h})
                capture(page, f'voucher-{w}x{h}')
                assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth+2')
            report['orders'] = page.evaluate("() => window.__pygc.readStorage('pygc_shop_redeem_orders')")
            assert len(report['orders']) == 1
            page.locator('.redeem-stage__back').click()
            page.locator('.shop-stage').wait_for()
            report['redeemReturn'] = True
            report['passed'] = True
        finally:
            report['errors'] = errors
            capture(page,'last-state')
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(f'Workflow passed: {OUT}')


if __name__ == '__main__':
    main()
