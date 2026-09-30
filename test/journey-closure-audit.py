"""Five-chapter journey played by keyboard and UI in an isolated Chromium save."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent
OUT = Path(os.environ.get('PYGC_AUDIT_OUT', ROOT / 'artifacts/journey-closure')).resolve()
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
spec = importlib.util.spec_from_file_location('depth', ROOT / 'landscape-depth-audit.py')
depth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(depth)
READ = 'key => __pygc.readStorage(key)'
PLAYER = '() => {const p=__audit.scene.children.find(o=>o.userData.isGltf);return {x:p.position.x,z:p.position.z}}'


def ready(page):
    page.locator('.brush-loader').wait_for(state='hidden', timeout=120000)
    page.wait_for_function('__audit.scene?.children.some(o=>o.userData.isGltf)', timeout=120000)
    page.wait_for_timeout(500)


def walk_to(page, poi):
    target = page.evaluate('id=>{const p=__audit.scene.children.find(o=>o.userData.poiId===id);return {x:p.position.x,z:p.position.z}}', poi)
    aligned = False
    for _ in range(240):
        if page.locator('.street-stage__poi-paper').is_visible():
            if page.evaluate(READ, 'pygc_runtime')['currentPoiId'] == poi:
                return
            page.locator('.street-stage__poi-close').click()
        pos = page.evaluate(PLAYER)
        dz = target['z'] - pos['z']
        if abs(dz) < .3:
            aligned = True
        dx = (target['x'] * .66 if aligned else 0) - pos['x']
        # Keep the approach stage once aligned. Camera-relative strafing can
        # shift z slightly; repeatedly returning to the center would oscillate.
        if aligned:
            key = ('s' if dz > 0 else 'w') if abs(dz) > .65 else ('d' if dx > 0 else 'a')
        else:
            key = ('d' if dx > 0 else 'a') if abs(dx) > .7 else ('s' if dz > 0 else 'w')
        # Reopening a dismissed beacon uses the actual E interaction.
        if abs(dx) < .25 and abs(dz) < .5:
            page.keyboard.press('e')
        else:
            page.keyboard.down(key)
            page.wait_for_timeout(160)
            page.keyboard.up(key)
            page.wait_for_timeout(90)
    raise AssertionError(f'Cannot reach {poi}: {page.evaluate(PLAYER)}')


def main():
    report = {'chapters': [], 'errors': [], 'consoleErrors': []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page.add_init_script(depth.PROBE)
        page.on('pageerror', lambda error: report['errors'].append(error.message))
        page.on('console', lambda msg: report['consoleErrors'].append(msg.text) if msg.type == 'error' else None)
        try:
            page.goto('http://127.0.0.1:5219/#/splash')
            page.locator('.splash-enter-frame').click()
            page.locator('.role-confirm-token').click()
            ready(page)
            page.keyboard.press('r')
            plan = [
                ('main-rishengchang', [('rishengchang', ['talk', 'clue'])]),
                ('main-county-office', [('county-office', ['talk'])]),
                ('main-market-crossing', [('mingqing-street', ['clue'])]),
                ('main-academy-lane', [('confucius-temple', ['talk', 'clue'])]),
                ('main-lantern-finale', [('lantern-square', ['clue']), ('city-wall', ['talk', 'clue'])]),
            ]
            for quest_id, stops in plan:
                ready(page)
                page.keyboard.press('r')
                scene_id = page.evaluate(READ, 'pygc_runtime')['currentStreetScene']
                page.screenshot(path=OUT / f'{scene_id}.png')
                for poi, actions in stops:
                    walk_to(page, poi)
                    for action in actions:
                        page.locator('.street-stage__poi-action' if action == 'talk' else '.street-stage__poi-investigate').first.click()
                        page.wait_for_timeout(180)
                    if not page.locator('.reward-stage__claim').is_visible():
                        page.locator('.street-stage__poi-close').click()
                page.locator('.reward-stage__claim').wait_for(timeout=8000)
                page.screenshot(path=OUT / f'{quest_id}-reward.png')
                progress = page.evaluate(READ, 'pygc_user_progress')
                assert quest_id in progress['questData']['completedQuests'], progress['questData']
                if quest_id == 'main-lantern-finale':
                    assert '五街行旅 · 圆满' in page.locator('.reward-stage').inner_text()
                page.locator('.reward-stage__claim').click()
                page.wait_for_timeout(1000)
                report['chapters'].append({'id': quest_id, 'steps': progress['steps']})
                print(f'Completed through movement/UI: {quest_id}', flush=True)

            assert page.evaluate(READ, 'pygc_runtime')['currentStreetScene'] == 'lantern-quarter'
            page.evaluate("() => __pygc.navigation.navigateTo('/user')")
            page.locator('.journey-chapters--complete').wait_for()
            assert page.locator('.journey-chapters__chapter--done').count() == 5
            for w, h in [(1440, 900), (844, 390), (667, 375), (390, 844)]:
                page.set_viewport_size({'width': w, 'height': h})
                page.locator('.journey-chapters').scroll_into_view_if_needed()
                page.wait_for_timeout(350)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
                page.screenshot(path=OUT / f'chapters-{w}x{h}.png')
            page.reload()
            page.locator('.journey-chapters--complete').wait_for()
            assert page.locator('.journey-chapters__chapter--done').count() == 5
            page.set_viewport_size({'width': 1440, 'height': 900})
            page.locator('.journey-chapters__chapter').nth(3).click()
            ready(page)
            assert page.evaluate(READ, 'pygc_runtime')['currentStreetScene'] == 'academy-lane'
            # The art is decoded, bound to the scene and included in the normal render.
            page.wait_for_function("() => {let found=false;__audit.scene.traverse(o=>{if(o.material?.map?.image?.src?.includes('/culture/academy-lane.webp'))found=true});return found}")
            page.screenshot(path=OUT / 'academy-revisit.png')
            report['performance'] = depth.performance_sample(page)
            report['persistentFinaleAndChapterRevisit'] = True
            assert not report['errors'], report['errors']
            assert not report['consoleErrors'], report['consoleErrors']
            report['passed'] = True
        except Exception as error:
            report['failure'] = repr(error)
            page.screenshot(path=OUT / 'failure.png')
            raise
        finally:
            (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps(report, ensure_ascii=False), flush=True)
            browser.close()


if __name__ == '__main__':
    main()
