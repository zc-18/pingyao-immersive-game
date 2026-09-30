"""Smoke-test a deployed Web release with an isolated browser save."""
import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('depth', ROOT / 'landscape-depth-audit.py')
depth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(depth)
parser = argparse.ArgumentParser()
parser.add_argument('url')
parser.add_argument('--release', required=True)
args = parser.parse_args()
if not all(c.isalnum() or c in '-_' for c in args.release):
    parser.error('release must contain only letters, digits, hyphens or underscores')
OUT = ROOT / 'artifacts' / 'deploy' / args.release
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
report = {'url': args.url, 'release': args.release, 'passed': False}
errors, failed = [], []
player = "() => {const p=__audit.scene.children.find(o=>o.userData.isGltf);return {x:p.position.x,z:p.position.z,rig:p.userData.rigType,run:p.userData.actions.run.getEffectiveWeight()}}"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
    page = browser.new_page(viewport={'width':1440, 'height':900}, device_scale_factor=1)
    page.set_default_timeout(60000)
    page.add_init_script(depth.PROBE)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failed.append({'status':response.status, 'url':response.url}) if response.status >= 400 else None)
    try:
        page.goto(args.url.rstrip('/') + '/#/splash', wait_until='domcontentloaded')
        page.locator('.splash-enter-frame').wait_for()
        page.screenshot(path=OUT/'splash.png')
        page.locator('.splash-enter-frame').click()
        page.locator('.role-confirm-token').click()
        page.wait_for_function('window.__audit.scene?.children.some(o=>o.userData.isGltf)', timeout=120000)
        page.locator('.brush-loader').wait_for(state='hidden')
        page.wait_for_timeout(1500)
        initial = page.evaluate(player)
        assert initial['rig'] == 'human', initial
        for key in ['w', 'Shift+w']:
            before = page.evaluate(player)
            if key.startswith('Shift'): page.keyboard.down('Shift')
            page.keyboard.down('w')
            page.wait_for_timeout(900)
            after = page.evaluate(player)
            page.keyboard.up('w')
            page.keyboard.up('Shift')
            distance = ((before['x']-after['x'])**2 + (before['z']-after['z'])**2)**.5
            assert distance > .5, (key, before, after)
            if key.startswith('Shift'): assert after['run'] > .9, after
            report[key] = {'distance':distance, 'runWeight':after['run']}
            page.wait_for_timeout(500)
        page.keyboard.press('i')
        page.locator('.wardrobe').wait_for()
        page.keyboard.press('Escape')
        page.locator('.wardrobe').wait_for(state='hidden')
        page.keyboard.press('c')
        page.wait_for_timeout(1200)
        page.screenshot(path=OUT/'character.png')
        page.keyboard.press('r')
        report['viewports'] = []
        for width, height in [(1440,900), (844,390), (390,844)]:
            page.set_viewport_size({'width':width, 'height':height})
            page.wait_for_timeout(900)
            metrics = page.evaluate('''() => ({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,canvases:document.querySelectorAll('#street-canvas canvas').length})''')
            assert metrics['width'] <= width+2 and metrics['height'] <= height+2, metrics
            assert metrics['canvases'] == 1, metrics
            page.screenshot(path=OUT/f'street-{width}x{height}.png')
            report['viewports'].append({'viewport':[width,height], **metrics})
        assert not errors, errors
        assert not failed, failed
        report['rig'] = initial['rig']
        report['passed'] = True
    except Exception as error:
        report['failure'] = repr(error)
        page.screenshot(path=OUT/'failure.png')
        raise
    finally:
        report.update(pageErrors=errors, httpErrors=failed)
        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False),flush=True)
        browser.close()
