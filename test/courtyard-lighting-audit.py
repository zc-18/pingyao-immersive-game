"""Verify courtyard art colors, day/night lamps, and the real postprocessing output.

The gate position is a visual fixture. Physical quest reachability is verified by
enclosed-courtyard-audit.py --release --full --journey.
"""
import base64
import importlib.util
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
courtyard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(courtyard)
depth = courtyard.depth
OUT = ROOT / 'artifacts' / 'courtyard-lighting'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ.update(TEMP=str(OUT), TMP=str(OUT))
    report = {'phases': {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=1)
        page.set_default_navigation_timeout(120000)
        page.add_init_script(depth.PROBE + '''
          (() => {
            const descriptor = Object.getOwnPropertyDescriptor(window, 'THREE');
            Object.defineProperty(window, 'THREE', { ...descriptor, set(value) {
              descriptor.set(value);
              let Composer;
              Object.defineProperty(value, 'EffectComposer', { configurable: true, get: () => Composer, set(Target) {
                Composer = new Proxy(Target, { construct(Class, args) {
                  const instance = new Class(...args), render = instance.render.bind(instance);
                  instance.render = (...params) => { if(instance.passes.some(p=>p.renderTargetBright&&p.enabled))window.__audit.lastCompose = performance.now(); return render(...params); };
                  window.__audit.composer = instance; return instance;
                }});
              }});
            }});
          })();
        ''')
        errors = []
        page.on('pageerror', lambda e: errors.append(e.message))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(depth.mobile.BASE_URL)
        page.locator('.splash-enter-frame').wait_for()
        page.locator('.splash-enter-frame').click(force=True)
        page.locator('.role-confirm-token').wait_for()
        page.wait_for_timeout(800)
        page.locator('.role-confirm-token').click(force=True)
        courtyard.wait_player(page)
        page.wait_for_timeout(2000)
        page.locator('.scene-controls__trigger').click()
        page.locator('.scene-controls__phases > *').nth(1).click()
        page.wait_for_timeout(2400)
        page.locator('.scene-controls__trigger').click()
        depth.capture_canvas(page, OUT / 'courtyard-noon.png')
        page.screenshot(path=OUT / 'phone-ui.png')
        # Evaluate the real gate materials at closer range without testing a teleport route.
        page.evaluate("() => window.__audit.scene.children.find(o => o.userData.isGltf).position.set(0, .08, -19)")
        page.wait_for_timeout(1200)
        page.locator('.scene-controls__trigger').click()
        for i, phase in enumerate(['dawn', 'noon', 'dusk', 'night']):
            page.locator('.scene-controls__phases > *').nth(i).click()
            page.wait_for_timeout(2600)
            depth.capture_canvas(page, OUT / f'gate-{phase}.png')
            state = page.evaluate('''() => {
              const a = window.__audit, lamps = [];
              a.scene.getObjectByName('closed-courtyard').traverse(o => {
                if (o.userData.isBuildingLantern && o.material) lamps.push(o.material.emissiveIntensity);
              });
              return { lamps, linearGray: new THREE.Color(0x808080).r,
                colorManaged: THREE.ColorManagement.legacyMode === false,
                graded: performance.now() - (a.lastCompose || 0) < 500, canvases: document.querySelectorAll('#street-canvas canvas').length };
            }''')
            assert state['colorManaged'] and abs(state['linearGray'] - .21586) < .00001, state
            expected = {'dawn': .08, 'noon': .08, 'dusk': .42, 'night': .72}[phase]
            assert state['lamps'] and all(abs(v - expected) < .001 for v in state['lamps']), state
            assert state['canvases'] == 1, state
            report['phases'][phase] = state
        # Compare the real final composer frame with direct rendering of the same scene.
        # This catches missing sRGB output encoding without asserting identical bloom pixels.
        if not report['phases']['night']['graded']:
            # Observe the real adaptive cooldown; no synthetic FPS or forced quality state.
            page.wait_for_timeout(24000)
        report['postprocessActiveAfterCooldown'] = page.evaluate('() => performance.now() - (window.__audit.lastCompose || 0) < 500')
        # Adaptive quality may suspend bloom after a slow asset/shader warm-up.
        # Render ONE frame with the real application composer to verify this code path,
        # without altering the game's quality policy or claiming sustained bloom FPS.
        composed = page.evaluate('''() => {
          const a = window.__audit;
          if (!a.composer?.passes.some(pass => pass.material?.uniforms?.warmth)) throw new Error('Application composer missing');
          a.composer.render();
          return a.renderer.domElement.toDataURL('image/png');
        }''')
        (OUT / 'gate-night-composed.png').write_bytes(base64.b64decode(composed.split(',', 1)[1]))
        direct = page.evaluate('''() => {
          const a = window.__audit, r = a.renderer, target = r.getRenderTarget();
          r.setRenderTarget(null); r.render(a.scene, a.camera);
          const image = r.domElement.toDataURL('image/png'); r.setRenderTarget(target); return image;
        }''')
        (OUT / 'gate-night-direct.png').write_bytes(base64.b64decode(direct.split(',', 1)[1]))
        graded = Image.open(OUT / 'gate-night-composed.png').convert('RGB')
        plain = Image.open(OUT / 'gate-night-direct.png').convert('RGB')
        crop = (int(graded.width * .15), int(graded.height * .4), int(graded.width * .85), int(graded.height * .92))
        difference = ImageStat.Stat(ImageChops.difference(graded.crop(crop), plain.crop(crop))).mean
        report['postprocessMeanAbsoluteDifference'] = difference
        assert max(difference) < 24, difference
        report['performance'] = depth.performance_sample(page)
        report['errors'] = errors
        (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        assert not errors, errors
        print(json.dumps(report, ensure_ascii=False), flush=True)
        browser.close()


if __name__ == '__main__':
    main()
